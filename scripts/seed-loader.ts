import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import XLSX from "xlsx";
import { parse } from "csv-parse/sync";

type Row = Record<string, string>;

const rootDir = path.resolve(__dirname, "..");
const ragDir = path.join(rootDir, "ai_cs_rag_v2_package");

const files = {
  skuMaster: path.join(ragDir, "sku_master_60.csv"),
  docs: path.join(ragDir, "rag_source_docs_v2.jsonl"),
  evalBase: path.join(ragDir, "eval_batch1_v2_expanded.csv"),
  evalMultiTurn: path.join(ragDir, "eval_multiturn_supplement_v1.csv"),
  orders: path.join(ragDir, "mock_orders_100.csv"),
  logistics: path.join(ragDir, "mock_logistics_100.csv"),
  refunds: path.join(ragDir, "mock_refunds_10.csv"),
  compensations: path.join(ragDir, "mock_compensations_10.csv"),
  riskSignals: path.join(ragDir, "mock_risk_signals_10.csv"),
  workbook: path.join(ragDir, "跨境进口家电AI客服_RAG底稿深化_v2.xlsx"),
};

function readCsv(filePath: string): Row[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
  }) as Row[];
}

function readJsonl<T>(filePath: string): T[] {
  return fs
    .readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function parseJsonField(value?: string) {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function workbookSummary() {
  const workbook = XLSX.readFile(files.workbook);
  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rowCount: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]).length,
  }));
}

async function exec(client: Client, sql: string, params: unknown[] = []) {
  await client.query(sql, params);
}

function compactDocText(doc: Record<string, unknown>) {
  const importantKeys = [
    "title",
    "doc_type",
    "brand",
    "category",
    "sku_id",
    "facts",
    "compatibility_rules",
    "import_info",
    "shipping_info",
    "rule",
    "policy_rows",
  ];
  return importantKeys
    .map((key) => {
      const value = doc[key];
      if (!value) return "";
      return `${key}: ${typeof value === "string" ? value : JSON.stringify(value, null, 0)}`;
    })
    .filter(Boolean)
    .join("\n");
}

async function loadBrandsAndCategories(client: Client, skuRows: Row[]) {
  const brandSeen = new Set<string>();
  const categorySeen = new Set<string>();

  for (const row of skuRows) {
    if (!brandSeen.has(row.brand_id)) {
      brandSeen.add(row.brand_id);
      await exec(
        client,
        `
        INSERT INTO brands (brand_id, name, origin_country, official_warranty_supported)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (brand_id) DO UPDATE
        SET name = EXCLUDED.name,
            origin_country = EXCLUDED.origin_country
        `,
        [row.brand_id, row["品牌"], row["品牌来源地"], row.warranty_type === "brand_global"]
      );
    }

    if (!categorySeen.has(row.category_id)) {
      categorySeen.add(row.category_id);
      await exec(
        client,
        `
        INSERT INTO categories (category_id, name, sub_category)
        VALUES ($1, $2, $3)
        ON CONFLICT (category_id) DO UPDATE
        SET name = EXCLUDED.name,
            sub_category = EXCLUDED.sub_category
        `,
        [row.category_id, row["类目"], row["子类"]]
      );
    }
  }
}

async function loadSkus(client: Client, skuRows: Row[]) {
  for (const row of skuRows) {
    await exec(
      client,
      `
      INSERT INTO skus (
        sku_id, brand_id, category_id, brand_name, category_name, model, product_name,
        version_country, rated_voltage, rated_frequency, plug_type, power_watt,
        certification_mark, china_usability, china_voltage_note, china_plug_adapter,
        warranty_type, warranty_duration_days, return_policy_type, import_channel,
        importer_name, sales_rule_return, sales_rule_return_window_days, metadata_json
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,$19,$20,
        $21,$22,$23,$24
      )
      ON CONFLICT (sku_id) DO UPDATE
      SET metadata_json = EXCLUDED.metadata_json
      `,
      [
        row.sku_id,
        row.brand_id,
        row.category_id,
        row["品牌"],
        row["类目"],
        row["型号"],
        row["商品名"],
        row["目标区域版"],
        row["额定电压"],
        row["额定频率"],
        row["插头类型"],
        Number(row["功率W"] || 0),
        row["认证标识"],
        row.china_usability,
        row.china_voltage_note,
        row.china_plug_adapter,
        row.warranty_type,
        Number(row.warranty_duration_days || 0),
        row.return_policy_type,
        row.import_channel,
        row.importer_name,
        row.sales_rule_return,
        Number(row.sales_rule_return_window_days || 0),
        {
          riskLevel: row["风险级别"],
          installRequirements: row["安装/使用要求"],
          supportNeeds: row["高频客服需求"],
          mandatoryRag: row["必须RAG"],
        },
      ]
    );
  }
}

async function loadKnowledge(client: Client, docs: Record<string, unknown>[]) {
  for (let index = 0; index < docs.length; index += 1) {
    const doc = docs[index];
    await exec(
      client,
      `
      INSERT INTO knowledge_docs (
        doc_id, doc_type, sku_id, brand, category, title, locale, source_type,
        source_of_truth_tier, confidence_ceiling, replace_with_real_doc,
        priority_topics, metadata_json, raw_content
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (doc_id) DO UPDATE
      SET raw_content = EXCLUDED.raw_content,
          metadata_json = EXCLUDED.metadata_json
      `,
      [
        doc.doc_id,
        doc.doc_type,
        doc.sku_id ?? null,
        doc.brand ?? null,
        doc.category ?? null,
        doc.title,
        doc.locale ?? "zh-CN",
        doc.source_type,
        doc.source_of_truth_tier,
        doc.confidence_ceiling ?? 0.5,
        Boolean(doc.replace_with_real_doc),
        doc.priority_topics ?? [],
        {
          subjectRiskLevel: doc.subject_risk_level,
          dataRiskLevel: doc.data_risk_level,
          expiresAt: doc.expires_at,
        },
        doc,
      ]
    );

    await exec(
      client,
      `
      INSERT INTO doc_chunks (chunk_id, doc_id, chunk_index, chunk_text, metadata_json)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (chunk_id) DO UPDATE
      SET chunk_text = EXCLUDED.chunk_text,
          metadata_json = EXCLUDED.metadata_json
      `,
      [
        `CHK-${String(doc.doc_id)}`,
        doc.doc_id,
        0,
        compactDocText(doc),
        { chunkStrategy: "one_doc_one_chunk" },
      ]
    );

    if (doc.doc_type === "service_need_profile" && doc.sku_id) {
      await exec(
        client,
        `
        INSERT INTO service_need_profiles (sku_id, profile_json)
        VALUES ($1, $2)
        ON CONFLICT (sku_id) DO UPDATE
        SET profile_json = EXCLUDED.profile_json
        `,
        [doc.sku_id, doc]
      );
    }
  }
}

async function loadMockBusiness(client: Client) {
  const orderRows = readCsv(files.orders);
  const logisticsRows = readCsv(files.logistics);
  const refundRows = readCsv(files.refunds);
  const compensationRows = readCsv(files.compensations);
  const riskRows = readCsv(files.riskSignals);

  for (const row of orderRows) {
    await exec(
      client,
      `
      INSERT INTO orders (
        order_id, session_id, customer_id, customer_tier, channel, sku_id,
        total_amount_cny, shipping_fee_cny, order_status, payment_status,
        shipment_status, destination_region, destination_city, destination_district,
        promised_eta_start, promised_eta_end, created_at, paid_at, tool_payload
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19
      )
      ON CONFLICT (order_id) DO UPDATE
      SET tool_payload = EXCLUDED.tool_payload
      `,
      [
        row.order_id,
        row.session_id,
        row.customer_id,
        row.customer_tier,
        row.channel,
        row.sku_id,
        Number(row.total_amount_cny),
        Number(row.shipping_fee_cny),
        row.order_status,
        row.payment_status,
        row.shipment_status,
        row.destination_region,
        row.destination_city,
        row.destination_district,
        row.promised_eta_start,
        row.promised_eta_end,
        row.created_at,
        row.paid_at,
        row,
      ]
    );

    await exec(
      client,
      `
      INSERT INTO chat_sessions (
        session_id, channel, customer_id, current_scene, current_sku_id,
        emotion_state, slot_json, risk_level, resolution_status, summary_text
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (session_id) DO NOTHING
      `,
      [
        row.session_id,
        row.channel,
        row.customer_id,
        "compatibility",
        row.sku_id,
        "neutral",
        { orderId: row.order_id, shipmentStatus: row.shipment_status },
        "medium",
        "open",
        `mock session for ${row.order_id}`,
      ]
    );
  }

  for (const row of logisticsRows) {
    await exec(
      client,
      `
      INSERT INTO order_shipments (
        shipment_id, order_id, tracking_no, carrier_name, transport_mode,
        origin_hub, current_status, current_node_label, current_node_detail,
        customs_status, last_update_at, eta_start, eta_end, outbound_at,
        customs_released_at, delivered_at, abnormal_flag, abnormal_reason, tracking_summary
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (shipment_id) DO UPDATE
      SET tracking_summary = EXCLUDED.tracking_summary
      `,
      [
        row.shipment_id,
        row.order_id,
        row.tracking_no,
        row.carrier_name,
        row.transport_mode,
        row.origin_hub,
        row.current_status,
        row.current_node_label,
        row.current_node_detail,
        row.customs_status,
        row.last_update_at,
        row.eta_start,
        row.eta_end,
        row.outbound_at,
        row.customs_released_at || null,
        row.delivered_at || null,
        row.abnormal_flag || null,
        row.abnormal_reason || null,
        row.tracking_summary,
      ]
    );
  }

  for (const row of refundRows) {
    await exec(
      client,
      `
      INSERT INTO refund_requests (
        refund_id, order_id, session_id, customer_id, scene_type, reason_type,
        requested_amount_cny, evidence_status, policy_route, required_doc_refs,
        status, approval_level_required, suggested_action, requested_at, decision_summary
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (refund_id) DO NOTHING
      `,
      [
        row.refund_id,
        row.order_id,
        row.session_id,
        row.customer_id,
        row.scene_type,
        row.reason_type,
        Number(row.requested_amount_cny),
        row.evidence_status,
        row.policy_route,
        row.required_doc_refs,
        row.status,
        row.approval_level_required,
        row.suggested_action,
        row.requested_at,
        row.decision_summary,
      ]
    );
  }

  for (const row of compensationRows) {
    await exec(
      client,
      `
      INSERT INTO compensation_ledger (
        ledger_id, order_id, session_id, customer_id, compensation_type,
        amount_cny, approval_level, approver_role, rule_card_ref, evidence_ids,
        status, issued_at, risk_guardrail
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (ledger_id) DO NOTHING
      `,
      [
        row.ledger_id,
        row.order_id,
        row.session_id,
        row.customer_id,
        row.compensation_type,
        Number(row.amount_cny),
        row.approval_level,
        row.approver_role,
        row.rule_card_ref,
        row.evidence_ids || null,
        row.status,
        row.issued_at,
        row.risk_guardrail,
      ]
    );
  }

  for (const row of riskRows) {
    await exec(
      client,
      `
      INSERT INTO risk_signals (
        signal_id, order_id, session_id, customer_id, signal_type, severity,
        detected_at, evidence_summary, auto_action_taken, review_required,
        review_status, assigned_queue, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (signal_id) DO NOTHING
      `,
      [
        row.signal_id,
        row.order_id,
        row.session_id,
        row.customer_id,
        row.signal_type,
        row.severity,
        row.detected_at,
        row.evidence_summary,
        row.auto_action_taken,
        row.review_required === "true",
        row.review_status,
        row.assigned_queue,
        row.notes,
      ]
    );
  }
}

async function loadEvals(client: Client) {
  const evalRows = [...readCsv(files.evalBase), ...readCsv(files.evalMultiTurn)];
  for (const row of evalRows) {
    await exec(
      client,
      `
      INSERT INTO eval_cases (
        case_id, category, scene_type, channel, query, context_turns,
        gold_action_category, gold_must_contain, gold_must_not_contain, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (case_id) DO UPDATE
      SET notes = EXCLUDED.notes
      `,
      [
        row.case_id,
        row.category,
        row.scene_type,
        row.channel || "web",
        row.query,
        parseJsonField(row.context_turns),
        row.gold_action_category,
        parseJsonField(row.gold_must_contain),
        parseJsonField(row.gold_must_not_contain),
        row.notes,
      ]
    );
  }
}

async function loadExperiments(client: Client) {
  const experimentId = "EXP-AB-001";
  await exec(
    client,
    `
    INSERT INTO ab_test_experiments (experiment_id, name, experiment_type, control_variant_id, status, metric_json)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (experiment_id) DO NOTHING
    `,
    [experimentId, "Prompt / Retrieval / Handoff / Emotion", "portfolio_mock", "VAR-A", "draft", ["resolve_rate", "handoff_rate", "risk_pass_rate"]]
  );

  const variants = [
    ["VAR-A", "版本 A", { prompt: "A", retrieval: "strict", handoff: "angry_immediate", emotion: "comfort_first" }],
    ["VAR-B", "版本 B", { prompt: "B", retrieval: "wide_recall", handoff: "two_turn_angry", emotion: "answer_first" }],
  ];

  for (const [variantId, variantName, configJson] of variants) {
    await exec(
      client,
      `
      INSERT INTO ab_test_variants (variant_id, experiment_id, variant_name, config_json)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (variant_id) DO NOTHING
      `,
      [variantId, experimentId, variantName, configJson]
    );
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const skuRows = readCsv(files.skuMaster);
    const docs = readJsonl<Record<string, unknown>>(files.docs);

    console.log("Workbook summary:", workbookSummary());

    await loadBrandsAndCategories(client, skuRows);
    await loadSkus(client, skuRows);
    await loadKnowledge(client, docs);
    await loadMockBusiness(client);
    await loadEvals(client);
    await loadExperiments(client);

    console.log("Seed load completed.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("seed-loader failed", error);
  process.exit(1);
});
