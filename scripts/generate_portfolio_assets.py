from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAG_DIR = ROOT / "ai_cs_rag_v2_package"
MOCK_UI_DIR = ROOT / "mock_ui"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def load_docs() -> list[dict[str, object]]:
    docs: list[dict[str, object]] = []
    with (RAG_DIR / "rag_source_docs_v2.jsonl").open("r", encoding="utf-8") as f:
        for line in f:
            docs.append(json.loads(line))
    return docs


@dataclass(frozen=True)
class ShippingTemplate:
    mode: str
    min_days: int
    max_days: int
    origin: str
    carrier: str


CITY_MATRIX = [
    ("上海", "华东", "黄浦区"),
    ("杭州", "华东", "西湖区"),
    ("苏州", "华东", "工业园区"),
    ("北京", "华北", "朝阳区"),
    ("天津", "华北", "河西区"),
    ("深圳", "华南", "南山区"),
    ("广州", "华南", "天河区"),
    ("厦门", "华南", "思明区"),
    ("成都", "西南", "高新区"),
    ("重庆", "西南", "渝北区"),
]

STATUS_CYCLE = [
    "delivered",
    "delivered",
    "delivered",
    "in_transit",
    "in_transit",
    "customs_clearance",
    "out_for_delivery",
    "label_created",
    "exception",
    "cancelled",
]

RISK_TYPES = [
    "empty_box_claim",
    "duplicate_refund",
    "timeline_manipulation",
    "address_cluster",
    "screenshot_pressure",
    "serial_number_mismatch",
    "high_value_repeat_damage",
    "coupon_abuse",
    "manual_override_request",
    "multi_account_claim",
]


def build_lookup_maps(
    docs: list[dict[str, object]]
) -> tuple[
    dict[str, dict[str, object]],
    dict[str, dict[str, object]],
    dict[str, dict[str, object]],
    dict[str, dict[str, object]],
]:
    compat_by_sku: dict[str, dict[str, object]] = {}
    warranty_by_sku: dict[str, dict[str, object]] = {}
    shipping_by_category: dict[str, dict[str, object]] = {}
    price_policy_by_category: dict[str, dict[str, object]] = {}

    for doc in docs:
        doc_type = str(doc.get("doc_type", ""))
        if doc_type == "compatibility_install_card":
            compat_by_sku[str(doc["sku_id"])] = doc
        elif doc_type == "import_warranty_card":
            warranty_by_sku[str(doc["sku_id"])] = doc
        elif doc_type == "shipping_eta_card":
            shipping_by_category[str(doc["category"])] = doc
        elif doc_type == "price_dispute_policy":
            price_policy_by_category[str(doc["category"])] = doc
    return compat_by_sku, warranty_by_sku, shipping_by_category, price_policy_by_category


def estimate_price(row: dict[str, str], idx: int) -> int:
    base_map = {
        "全自动/半自动咖啡机": 4200,
        "冰箱": 11800,
        "洗碗机": 8600,
        "洗衣机/烘干机": 9500,
        "烤箱/蒸烤一体机": 6800,
        "烟机/灶具": 7300,
        "空气净化器": 3200,
        "扫地机器人/吸尘器": 2900,
        "电水壶/料理机/破壁机": 1680,
    }
    category = row["类目"]
    base = base_map.get(category, 3600)
    region_offset = {"US": -120, "EU": 180, "UK": 120}.get(row["目标区域版"], 0)
    brand_offset = (int(row["brand_id"][2:]) - 1) * 75
    cycle_offset = (idx % 5) * 60
    return base + region_offset + brand_offset + cycle_offset


def build_shipping_template(doc: dict[str, object]) -> ShippingTemplate:
    info = doc["shipping_info"]
    return ShippingTemplate(
        mode=str(info["transport_mode"]),
        min_days=int(info["typical_eta_days_min"]),
        max_days=int(info["typical_eta_days_max"]),
        origin=str(info["origin_hub"]),
        carrier="OceanBridge" if str(info["transport_mode"]) == "sea" else "AeroLink",
    )


def logistics_status_payload(status: str) -> tuple[str, str, str]:
    mapping = {
        "delivered": ("末端签收完成", "签收成功，建议引导确认是否存在外观/功能问题", "none"),
        "in_transit": ("干线运输中", "跨境运输途中，暂无异常", "none"),
        "customs_clearance": ("清关处理中", "等待清关放行，属于正常耗时节点", "none"),
        "out_for_delivery": ("国内派送中", "末端快递已派件", "none"),
        "label_created": ("等待干线出库", "订单已建单，等待仓库出库", "none"),
        "exception": ("物流异常待复核", "出现箱体破损或转运延迟，需要人工排查", "delay"),
        "cancelled": ("订单已取消", "用户取消或支付失败后终止发运", "cancel"),
    }
    return mapping[status]


def generate_orders_and_tools():
    sku_rows = read_csv(RAG_DIR / "sku_master_60.csv")
    docs = load_docs()
    compat_by_sku, warranty_by_sku, shipping_by_category, price_policy_by_category = build_lookup_maps(docs)
    base_start = datetime(2026, 3, 1, 9, 0, 0)

    orders: list[dict[str, object]] = []
    logistics: list[dict[str, object]] = []
    refunds: list[dict[str, object]] = []
    compensations: list[dict[str, object]] = []
    risk_signals: list[dict[str, object]] = []

    for idx in range(100):
        sku = sku_rows[idx % len(sku_rows)]
        city, region, district = CITY_MATRIX[idx % len(CITY_MATRIX)]
        status = STATUS_CYCLE[idx % len(STATUS_CYCLE)]
        customer_no = (idx % 42) + 1
        created_at = base_start + timedelta(hours=18 * idx)
        paid_at = created_at + timedelta(minutes=35)
        shipping_doc = shipping_by_category.get(sku["类目"])
        shipping_template = (
            build_shipping_template(shipping_doc)
            if shipping_doc
            else ShippingTemplate("sea", 12, 21, "新加坡港口集货仓", "OceanBridge")
        )
        unit_price = estimate_price(sku, idx)
        total_amount = unit_price
        eta_start = paid_at + timedelta(days=shipping_template.min_days)
        eta_end = paid_at + timedelta(days=shipping_template.max_days)
        label, status_note, abnormal_flag = logistics_status_payload(status)
        compat_doc = compat_by_sku.get(sku["sku_id"], {})
        warranty_doc = warranty_by_sku.get(sku["sku_id"], {})
        price_doc = price_policy_by_category.get(sku["类目"], {})
        order_id = f"ORD-2026-{idx + 1:04d}"
        session_id = f"SES-MOCK-{idx + 1:04d}"
        customer_id = f"CUS-{customer_no:04d}"
        tracking_no = f"TRK{2026030000 + idx + 1}"
        shipment_id = f"SHP-{idx + 1:04d}"
        order_status = "closed" if status in {"delivered", "cancelled"} else "processing"
        payment_status = "paid" if status != "cancelled" else "refunded"
        customer_tier = ["new", "standard", "vip", "vip"][idx % 4]
        created_channel = "web" if idx % 8 else "wechat"

        orders.append(
            {
                "order_id": order_id,
                "session_id": session_id,
                "customer_id": customer_id,
                "customer_tier": customer_tier,
                "channel": created_channel,
                "sku_id": sku["sku_id"],
                "brand_id": sku["brand_id"],
                "brand_name": sku["品牌"],
                "category_id": sku["category_id"],
                "category_name": sku["类目"],
                "product_model": sku["型号"],
                "version_country": sku["目标区域版"],
                "china_usability": sku["china_usability"],
                "warranty_type": sku["warranty_type"],
                "return_policy_type": sku["return_policy_type"],
                "import_channel": sku["import_channel"],
                "quantity": 1,
                "unit_price_cny": unit_price,
                "shipping_fee_cny": 0 if total_amount >= 3000 else 49,
                "total_amount_cny": total_amount,
                "order_status": order_status,
                "payment_status": payment_status,
                "shipment_status": status,
                "created_at": created_at.isoformat(),
                "paid_at": paid_at.isoformat(),
                "promised_eta_start": eta_start.date().isoformat(),
                "promised_eta_end": eta_end.date().isoformat(),
                "destination_region": region,
                "destination_city": city,
                "destination_district": district,
                "compat_doc_id": compat_doc.get("doc_id", ""),
                "warranty_doc_id": warranty_doc.get("doc_id", ""),
                "price_policy_doc_id": price_doc.get("doc_id", ""),
                "mock_note": "用于作品集演示的订单主数据",
            }
        )

        last_update = paid_at + timedelta(days=min(idx % 11 + 1, shipping_template.max_days - 1))
        delivered_at = eta_start + timedelta(days=1) if status == "delivered" else ""
        logistics.append(
            {
                "shipment_id": shipment_id,
                "order_id": order_id,
                "tracking_no": tracking_no,
                "carrier_name": shipping_template.carrier,
                "transport_mode": shipping_template.mode,
                "origin_hub": shipping_template.origin,
                "destination_city": city,
                "destination_region": region,
                "current_status": status,
                "current_node_label": label,
                "customs_status": "released" if status in {"delivered", "in_transit", "out_for_delivery"} else "pending",
                "current_node_detail": status_note,
                "last_update_at": last_update.isoformat(),
                "eta_start": eta_start.isoformat(),
                "eta_end": eta_end.isoformat(),
                "outbound_at": (paid_at + timedelta(days=1)).isoformat(),
                "customs_released_at": (paid_at + timedelta(days=shipping_template.min_days - 3)).isoformat(),
                "delivered_at": delivered_at,
                "abnormal_flag": abnormal_flag,
                "abnormal_reason": "箱体压痕待核查" if abnormal_flag == "delay" else "",
                "tracking_summary": f"{tracking_no} 当前处于 {label}，客服可引用运输说明卡稳定预期。",
            }
        )

    refund_indices = [3, 8, 13, 18, 27, 35, 44, 57, 72, 89]
    refund_scenes = [
        ("damage", "door_dent", "evidence_pending", "转人工"),
        ("return_policy", "seven_day_no_reason_request", "policy_rejected", "拒答"),
        ("price_dispute", "campaign_price_gap", "manager_review", "转人工"),
        ("warranty_import", "serial_not_found", "info_verified", "给结论"),
        ("damage", "glass_panel_crack", "evidence_complete", "转人工"),
        ("shipping", "delayed_delivery", "pending_logistics_check", "追问"),
        ("return_policy", "appearance_not_like", "policy_rejected", "拒答"),
        ("damage", "missing_accessory", "evidence_complete", "转人工"),
        ("price_dispute", "coupon_not_applied", "approved_small_credit", "给结论"),
        ("warranty_import", "cross_region_repair", "manual_review", "转人工"),
    ]
    for refund_no, order_idx in enumerate(refund_indices, start=1):
        order = orders[order_idx]
        scene_type, reason_type, evidence_status, suggested_action = refund_scenes[refund_no - 1]
        request_amount = round(float(order["total_amount_cny"]) * (0.12 if scene_type == "price_dispute" else 0.9), 2)
        refunds.append(
            {
                "refund_id": f"RFD-{refund_no:04d}",
                "order_id": order["order_id"],
                "session_id": order["session_id"],
                "customer_id": order["customer_id"],
                "scene_type": scene_type,
                "reason_type": reason_type,
                "requested_amount_cny": request_amount,
                "requested_at": (datetime.fromisoformat(str(order["created_at"])) + timedelta(days=8)).isoformat(),
                "evidence_status": evidence_status,
                "policy_route": "quality_only" if scene_type in {"damage", "warranty_import"} else "price_policy_review",
                "required_doc_refs": order["price_policy_doc_id"] if scene_type == "price_dispute" else order["warranty_doc_id"],
                "status": "open" if suggested_action in {"追问", "转人工"} else "closed",
                "approval_level_required": "L2" if suggested_action == "转人工" else "AI/L1",
                "suggested_action": suggested_action,
                "decision_summary": "供 mock 工具与接管台演示的退款申请数据",
            }
        )

    compensation_indices = [2, 6, 12, 19, 22, 31, 46, 58, 76, 91]
    comp_types = [
        ("coupon_credit", 50, "AI"),
        ("delay_credit", 120, "L1"),
        ("damage_partial_refund", 380, "L1"),
        ("price_match_credit", 260, "L1"),
        ("vip_retention", 480, "L2"),
        ("exception_shipping_upgrade", 680, "L2"),
        ("door_to_door_pickup", 980, "L2"),
        ("glass_panel_claim", 1800, "L2"),
        ("high_value_damage", 5200, "Finance+Legal"),
        ("media_risk_settlement", 9800, "Finance+Legal"),
    ]
    for comp_no, order_idx in enumerate(compensation_indices, start=1):
        order = orders[order_idx]
        comp_type, amount, approver_role = comp_types[comp_no - 1]
        approval_level = "AI" if approver_role == "AI" else "L1" if approver_role == "L1" else "L2" if approver_role == "L2" else "L3"
        compensations.append(
            {
                "ledger_id": f"LED-{comp_no:04d}",
                "order_id": order["order_id"],
                "session_id": order["session_id"],
                "customer_id": order["customer_id"],
                "compensation_type": comp_type,
                "amount_cny": amount,
                "approval_level": approval_level,
                "approver_role": approver_role,
                "rule_card_ref": "POL-PRICE-001" if "price" in comp_type else "POL-DMG-001",
                "evidence_ids": f"EVD-{comp_no:04d};EVD-{comp_no + 10:04d}" if "damage" in comp_type else "",
                "status": "approved",
                "issued_at": (datetime.fromisoformat(str(order["created_at"])) + timedelta(days=10)).isoformat(),
                "risk_guardrail": "超出 AI 权限时必须进入 handoff_case 和 compensation_ledger",
            }
        )

    risk_indices = [1, 7, 15, 20, 29, 38, 50, 63, 80, 95]
    for signal_no, order_idx in enumerate(risk_indices, start=1):
        order = orders[order_idx]
        risk_type = RISK_TYPES[signal_no - 1]
        severity = "high" if signal_no <= 6 else "medium"
        risk_signals.append(
            {
                "signal_id": f"RSK-{signal_no:04d}",
                "order_id": order["order_id"],
                "session_id": order["session_id"],
                "customer_id": order["customer_id"],
                "signal_type": risk_type,
                "severity": severity,
                "detected_at": (datetime.fromisoformat(str(order["created_at"])) + timedelta(days=7, hours=2)).isoformat(),
                "evidence_summary": f"{risk_type} 触发于 mock 订单 {order['order_id']}，用于展示风控联动。",
                "auto_action_taken": "block_compensation_below_l2" if severity == "high" else "mark_for_review",
                "review_required": "true",
                "review_status": "pending",
                "assigned_queue": "risk_control" if severity == "high" else "l2_supervisor",
                "notes": "用于 mock 风控台和 route_trace 演示",
            }
        )

    return orders, logistics, refunds, compensations, risk_signals


def generate_multiturn_eval_cases() -> list[dict[str, object]]:
    cases: list[dict[str, object]] = [
        {
            "case_id": "EVAL-MT-COMP-101",
            "category": "B7_多轮对话扩展",
            "boundary_type": "multi_turn",
            "locale": "zh-CN",
            "channel": "web",
            "优先主题": "电压/频率/插头兼容",
            "query": "那如果我家是上海普通 220V 三孔插座，是不是还要再买额外的转接头？",
            "context_turns": json.dumps([
                {"role": "user", "content": "我在看 De'Longhi 的 DELO-Bean-US-2027。"},
                {"role": "assistant", "content": "这款是美版 120V 机器，我先帮您确认在中国大陆的使用条件。"},
                {"role": "user", "content": "对，我就是准备在上海家里用。"}
            ], ensure_ascii=False),
            "sku_id": "SKU-DELO-Bean-US",
            "scene_type": "compatibility",
            "sub_intent": "china_home_use_follow_up",
            "预期动作": "给出变压器+转接头结论",
            "gold_action_category": "给结论",
            "必需槽位": json.dumps(["sku_id", "country_of_use", "household_voltage"], ensure_ascii=False),
            "必需文档": json.dumps(["compatibility_install_card", "sku_fact_card"], ensure_ascii=False),
            "是否调用工具": "否",
            "缺RAG是否必须拒答/追问": "是",
            "Gold rule": "必须延续上一轮的中国使用语境，不得跳回美国场景。",
            "gold_must_contain": json.dumps(["220V", "变压器", "转接头"], ensure_ascii=False),
            "gold_must_not_contain": json.dumps(["直接用吧", "不用额外"], ensure_ascii=False),
            "rubric_3pt": "延续上下文、配件结论明确、不能混淆转接头和变压器",
            "风险级别": "高",
            "notes": "多轮兼容场景：代词+上下文延续",
        },
        {
            "case_id": "EVAL-MT-COMP-102",
            "category": "B7_多轮对话扩展",
            "boundary_type": "multi_turn",
            "locale": "zh-CN",
            "channel": "wechat",
            "优先主题": "电压/频率/插头兼容",
            "query": "不是给我带去新加坡，是给我爸妈放在杭州用，你重新按国内场景说一下。",
            "context_turns": json.dumps([
                {"role": "user", "content": "这台 DELO-Caps-UK-2029 带去新加坡能用吗？"},
                {"role": "assistant", "content": "新加坡 230V / Type G，大方向上可以直接使用。"},
                {"role": "user", "content": "我刚才说错了。"}
            ], ensure_ascii=False),
            "sku_id": "SKU-DELO-Caps-UK",
            "scene_type": "compatibility",
            "sub_intent": "country_switch_follow_up",
            "预期动作": "基于中国大陆重新给结论",
            "gold_action_category": "给结论",
            "必需槽位": json.dumps(["sku_id", "country_of_use"], ensure_ascii=False),
            "必需文档": json.dumps(["compatibility_install_card"], ensure_ascii=False),
            "是否调用工具": "否",
            "缺RAG是否必须拒答/追问": "是",
            "Gold rule": "识别用户改口，不能沿用上一轮目的国。",
            "gold_must_contain": json.dumps(["中国大陆", "转接头"], ensure_ascii=False),
            "gold_must_not_contain": json.dumps(["新加坡", "直接沿用上一轮"], ensure_ascii=False),
            "rubric_3pt": "必须显式切换到中国场景",
            "风险级别": "高",
            "notes": "多轮兼容场景：改口纠偏",
        },
        {
            "case_id": "EVAL-MT-DMG-103",
            "category": "B7_多轮对话扩展",
            "boundary_type": "multi_turn",
            "locale": "zh-CN",
            "channel": "web",
            "优先主题": "签收破损",
            "query": "照片我刚刚传了 3 张，但没有完整开箱视频，这种情况你们会直接拒绝吗？",
            "context_turns": json.dumps([
                {"role": "user", "content": "ORD-2026-0019 的洗碗机门板有压痕。"},
                {"role": "assistant", "content": "我先帮您登记破损情况，需要外箱面单、破损部位照片和开箱视频。"},
                {"role": "user", "content": "外箱是完好的，压痕在右上角。"}
            ], ensure_ascii=False),
            "sku_id": "",
            "scene_type": "damage",
            "sub_intent": "damage_evidence_gap_follow_up",
            "预期动作": "说明视频强烈建议且需人工复核",
            "gold_action_category": "转人工",
            "必需槽位": json.dumps(["order_id", "signoff_time", "damage_photos"], ensure_ascii=False),
            "必需文档": json.dumps(["damage_signoff_sop"], ensure_ascii=False),
            "是否调用工具": "是",
            "缺RAG是否必须拒答/追问": "是",
            "Gold rule": "不能直接承诺赔付，也不能因为少视频就一句话拒绝。",
            "gold_must_contain": json.dumps(["开箱视频", "人工复核", "不直接承诺"], ensure_ascii=False),
            "gold_must_not_contain": json.dumps(["直接退款", "马上赔"], ensure_ascii=False),
            "rubric_3pt": "证据要求完整，结论审慎",
            "风险级别": "极高",
            "notes": "破损取证：证据不完整 follow-up",
        },
        {
            "case_id": "EVAL-MT-DMG-104",
            "category": "B7_多轮对话扩展",
            "boundary_type": "multi_turn",
            "locale": "zh-CN",
            "channel": "wechat",
            "优先主题": "签收破损",
            "query": "面单和外箱我都留着了，但我是昨天晚上才发现玻璃裂纹，现在还来得及报吗？",
            "context_turns": json.dumps([
                {"role": "user", "content": "我家新冰箱外观看着没事，今天清洁时发现里面有裂纹。"},
                {"role": "assistant", "content": "我先帮您确认一下签收时间和是否保留包装材料。"},
                {"role": "user", "content": "昨天中午签收的，包装都在。"}
            ], ensure_ascii=False),
            "sku_id": "",
            "scene_type": "damage",
            "sub_intent": "concealed_damage_deadline",
            "预期动作": "说明仍在隐蔽损伤申报窗口内并继续取证",
            "gold_action_category": "追问",
            "必需槽位": json.dumps(["order_id", "signoff_time"], ensure_ascii=False),
            "必需文档": json.dumps(["damage_signoff_sop"], ensure_ascii=False),
            "是否调用工具": "是",
            "缺RAG是否必须拒答/追问": "是",
            "Gold rule": "要体现 48 小时内可申报，不得直接判定过期。",
            "gold_must_contain": json.dumps(["48小时", "照片", "面单"], ensure_ascii=False),
            "gold_must_not_contain": json.dumps(["已经超时", "直接拒绝"], ensure_ascii=False),
            "rubric_3pt": "边界时效准确",
            "风险级别": "极高",
            "notes": "破损取证：隐蔽损伤时限",
        },
        {
            "case_id": "EVAL-MT-WTY-105",
            "category": "B7_多轮对话扩展",
            "boundary_type": "multi_turn",
            "locale": "zh-CN",
            "channel": "web",
            "优先主题": "进口保修",
            "query": "可我刚才打品牌官方电话，对方说查不到我的序列号，那是不是你们卖的就有问题？",
            "context_turns": json.dumps([
                {"role": "user", "content": "SKU-DELO-Bean-US 这台坏了之后能去品牌官方修吗？"},
                {"role": "assistant", "content": "这类进口版默认走进口商保修，不等于品牌全球联保。"},
                {"role": "user", "content": "你们说和品牌有协作通道。"}
            ], ensure_ascii=False),
            "sku_id": "SKU-DELO-Bean-US",
            "scene_type": "warranty_import",
            "sub_intent": "brand_serial_number_dispute",
            "预期动作": "澄清进口商保修边界，不暗示假货",
            "gold_action_category": "给结论",
            "必需槽位": json.dumps(["sku_id", "serial_number", "invoice"], ensure_ascii=False),
            "必需文档": json.dumps(["import_warranty_card", "warranty_region_policy"], ensure_ascii=False),
            "是否调用工具": "否",
            "缺RAG是否必须拒答/追问": "是",
            "Gold rule": "必须区分序列号查不到与假货不是一回事。",
            "gold_must_contain": json.dumps(["进口商保修", "不等于假货", "可继续登记工单"], ensure_ascii=False),
            "gold_must_not_contain": json.dumps(["全球联保", "可能是假货"], ensure_ascii=False),
            "rubric_3pt": "保修边界清楚且不制造恐慌",
            "风险级别": "高",
            "notes": "保修争议：品牌电话反驳",
        },
    ]
    cases.extend(
        [
            {
                "case_id": "EVAL-MT-WTY-106",
                "category": "B7_多轮对话扩展",
                "boundary_type": "multi_turn",
                "locale": "zh-CN",
                "channel": "web",
                "优先主题": "进口保修",
                "query": "那我现在人在北京，机器买的是美版，用的是中国大陆，故障后是不是只能寄回你们仓库？",
                "context_turns": json.dumps([
                    {"role": "user", "content": "这台 JURA-Bean-US-2027 的保修期多久？"},
                    {"role": "assistant", "content": "我查到它走进口商保修，默认保修 365 天。"},
                    {"role": "user", "content": "我已经用了 3 个月。"}
                ], ensure_ascii=False),
                "sku_id": "SKU-JURA-Bean-US",
                "scene_type": "warranty_import",
                "sub_intent": "repair_channel_follow_up",
                "预期动作": "说明维修流转路径",
                "gold_action_category": "给结论",
                "必需槽位": json.dumps(["sku_id", "purchase_region", "usage_region"], ensure_ascii=False),
                "必需文档": json.dumps(["import_warranty_card"], ensure_ascii=False),
                "是否调用工具": "否",
                "缺RAG是否必须拒答/追问": "是",
                "Gold rule": "说明进口商服务路径，不要让用户误会必须海外返修。",
                "gold_must_contain": json.dumps(["进口商", "寄回仓或上门取件", "不用直接寄回海外"], ensure_ascii=False),
                "gold_must_not_contain": json.dumps(["寄回美国", "全球联保"], ensure_ascii=False),
                "rubric_3pt": "维修路径清晰",
                "风险级别": "高",
                "notes": "保修争议：维修路径 follow-up",
            },
            {
                "case_id": "EVAL-MT-CPL-107",
                "category": "B7_多轮对话扩展",
                "boundary_type": "multi_turn",
                "locale": "zh-CN",
                "channel": "web",
                "优先主题": "投诉升级",
                "query": "我已经第三次来问了，你们今天到底能不能给我一个负责人电话？",
                "context_turns": json.dumps([
                    {"role": "user", "content": "ORD-2026-0036 的冰箱 16 天了还没更新物流。"},
                    {"role": "assistant", "content": "我理解您比较着急，我先同步下目前仍在清关处理中。"},
                    {"role": "user", "content": "上次你们也是这么说的。"}
                ], ensure_ascii=False),
                "sku_id": "",
                "scene_type": "complaint",
                "sub_intent": "repeat_complaint_escalation",
                "预期动作": "升级 L2 并给投诉路径",
                "gold_action_category": "转人工",
                "必需槽位": json.dumps(["order_id"], ensure_ascii=False),
                "必需文档": json.dumps(["shipping_eta_card"], ensure_ascii=False),
                "是否调用工具": "是",
                "缺RAG是否必须拒答/追问": "否",
                "Gold rule": "先处理情绪，再处理动作，不能继续机械复述物流。",
                "gold_must_contain": json.dumps(["理解您的着急", "升级", "主管"], ensure_ascii=False),
                "gold_must_not_contain": json.dumps(["再等等", "我们也没办法"], ensure_ascii=False),
                "rubric_3pt": "情绪承接与升级动作必须同时到位",
                "风险级别": "高",
                "notes": "情绪升级：重复咨询",
            },
            {
                "case_id": "EVAL-MT-CPL-108",
                "category": "B7_多轮对话扩展",
                "boundary_type": "multi_turn",
                "locale": "zh-CN",
                "channel": "wechat",
                "优先主题": "投诉升级",
                "query": "你别再跟我说模板话了，我今晚就发小红书曝光。",
                "context_turns": json.dumps([
                    {"role": "user", "content": "我那台烤箱收到时外箱破了。"},
                    {"role": "assistant", "content": "抱歉影响了您的体验，我先帮您登记并核对下取证材料。"},
                    {"role": "user", "content": "我昨天已经传过一次照片了。"}
                ], ensure_ascii=False),
                "sku_id": "",
                "scene_type": "complaint",
                "sub_intent": "media_threat_escalation",
                "预期动作": "L3 升级",
                "gold_action_category": "转人工",
                "必需槽位": json.dumps(["order_id"], ensure_ascii=False),
                "必需文档": json.dumps(["damage_signoff_sop"], ensure_ascii=False),
                "是否调用工具": "是",
                "缺RAG是否必须拒答/追问": "否",
                "Gold rule": "出现曝光威胁必须升级，不能争辩。",
                "gold_must_contain": json.dumps(["马上升级", "主管", "优先处理"], ensure_ascii=False),
                "gold_must_not_contain": json.dumps(["随便曝光", "你发吧"], ensure_ascii=False),
                "rubric_3pt": "媒体威胁场景必须升级",
                "风险级别": "极高",
                "notes": "情绪升级：媒体威胁",
            },
            {
                "case_id": "EVAL-MT-FRD-109",
                "category": "B7_多轮对话扩展",
                "boundary_type": "multi_turn",
                "locale": "zh-CN",
                "channel": "web",
                "优先主题": "欺诈风险",
                "query": "我不想再传视频了，你就按上次承诺的先给我退款链接。",
                "context_turns": json.dumps([
                    {"role": "user", "content": "箱子里面是空的。"},
                    {"role": "assistant", "content": "我理解这很影响体验，这类情况需要开箱视频和面单信息，我先帮您登记。"},
                    {"role": "user", "content": "我没有视频，但我截图了上个客服说可以处理。"}
                ], ensure_ascii=False),
                "sku_id": "",
                "scene_type": "fraud",
                "sub_intent": "empty_box_and_screenshot_pressure",
                "预期动作": "坚持政策并升级风控",
                "gold_action_category": "转人工",
                "必需槽位": json.dumps(["order_id", "damage_photos"], ensure_ascii=False),
                "必需文档": json.dumps(["damage_signoff_sop"], ensure_ascii=False),
                "是否调用工具": "是",
                "缺RAG是否必须拒答/追问": "是",
                "Gold rule": "不能因为截图施压就跳过风控与取证。",
                "gold_must_contain": json.dumps(["取证", "人工复核", "不能直接退款"], ensure_ascii=False),
                "gold_must_not_contain": json.dumps(["退款链接", "直接给您退"], ensure_ascii=False),
                "rubric_3pt": "风控立场坚定",
                "风险级别": "极高",
                "notes": "欺诈拦截：空箱+截图要挟",
            },
            {
                "case_id": "EVAL-MT-FRD-110",
                "category": "B7_多轮对话扩展",
                "boundary_type": "multi_turn",
                "locale": "zh-CN",
                "channel": "web",
                "优先主题": "欺诈风险",
                "query": "为什么又要我补材料？我上个月同地址不是已经退过一次了吗？",
                "context_turns": json.dumps([
                    {"role": "user", "content": "ORD-2026-0096 这单我也要申请退。"},
                    {"role": "assistant", "content": "我先帮您确认具体问题类型和签收时间。"},
                    {"role": "user", "content": "还是老问题，反正你们系统里都能看到。"}
                ], ensure_ascii=False),
                "sku_id": "",
                "scene_type": "fraud",
                "sub_intent": "repeat_refund_signal",
                "预期动作": "说明进入风控复核",
                "gold_action_category": "转人工",
                "必需槽位": json.dumps(["order_id"], ensure_ascii=False),
                "必需文档": json.dumps(["damage_signoff_sop", "price_dispute_policy"], ensure_ascii=False),
                "是否调用工具": "是",
                "缺RAG是否必须拒答/追问": "否",
                "Gold rule": "要体现重复退款信号，不能直接沿用上次处理。",
                "gold_must_contain": json.dumps(["人工复核", "补充材料", "无法直接沿用上次"], ensure_ascii=False),
                "gold_must_not_contain": json.dumps(["按上次处理", "直接退"], ensure_ascii=False),
                "rubric_3pt": "重复退款信号要拦截",
                "风险级别": "极高",
                "notes": "欺诈拦截：重复退款",
            },
        ]
    )
    return cases


def render_html_pages(orders, logistics, refunds, compensations, risk_signals):
    MOCK_UI_DIR.mkdir(parents=True, exist_ok=True)
    order = orders[18]
    shipment = logistics[18]
    refund = refunds[0]
    compensation = compensations[3]
    risk = risk_signals[0]

    merged_page = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8" /><title>会话与取证一体页 Mock</title>
<style>
body {{ font-family: 'Segoe UI', 'PingFang SC', sans-serif; margin: 0; background: #f5f4ef; color: #1f2937; }}
.shell {{ display: grid; grid-template-columns: 320px 1fr 340px; min-height: 100vh; }}
.pane {{ padding: 24px; box-sizing: border-box; }} .sidebar {{ background: #183153; color: #f8fafc; }}
.main {{ background: #fbfaf6; }} .aside {{ background: #f0ece1; }}
.card {{ background: white; border-radius: 16px; padding: 16px; margin-bottom: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }}
.badge {{ display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e5f0ff; color: #1d4ed8; font-size: 12px; }}
.danger {{ background: #fee2e2; color: #b91c1c; }} .chat {{ display: flex; flex-direction: column; gap: 12px; }}
.bubble {{ padding: 14px 16px; border-radius: 16px; max-width: 85%; }} .bubble.user {{ align-self: flex-end; background: #183153; color: white; }}
.bubble.ai {{ align-self: flex-start; background: #fff7e6; }} .steps li {{ margin-bottom: 8px; }} .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
</style></head><body><div class="shell">
<aside class="pane sidebar"><h2>会话与取证一体页</h2><p>把聊天、证据上传、订单核验放在一个工作区里。</p>
<div class="card" style="background:#24456d;color:white;"><div class="badge">当前订单</div><h3>{order['order_id']}</h3><p>{order['brand_name']} / {order['product_model']}</p><p>用户：{order['customer_id']} · 城市：{order['destination_city']}</p></div>
<div class="card"><div class="badge {'danger' if shipment['abnormal_flag'] != 'none' else ''}">物流状态</div><h3>{shipment['current_node_label']}</h3><p>{shipment['tracking_summary']}</p></div></aside>
<main class="pane main"><div class="card"><div class="badge">多轮会话</div><div class="chat">
<div class="bubble user">门板右上角有压痕，外箱看起来没破，这种能处理吗？</div>
<div class="bubble ai">可以先帮您登记，但我这边不会直接承诺赔付。请您上传开箱视频、外箱面单照片和压痕部位多角度照片。</div>
<div class="bubble user">视频没有拍全，只有 3 张照片。</div>
<div class="bubble ai">我先帮您保留工单，并把现有证据推给人工复核。视频缺失会影响判责速度，但不会直接把您拒掉。</div>
</div></div>
<div class="grid"><div class="card"><div class="badge">订单摘要</div><p>金额：¥{order['total_amount_cny']}</p><p>保修：{order['warranty_type']}</p><p>在华使用：{order['china_usability']}</p><p>关联文档：{order['compat_doc_id']}</p></div>
<div class="card"><div class="badge danger">风控提醒</div><p>{risk['signal_type']}</p><p>{risk['evidence_summary']}</p></div></div>
<div class="card"><div class="badge">取证清单</div><ol class="steps"><li>上传外箱面单照片</li><li>上传破损部位至少 3 张近景</li><li>如有视频，优先补开箱视频</li><li>确认签收时间和收货人姓名</li></ol></div></main>
<aside class="pane aside"><div class="card"><div class="badge">退款申请</div><p>编号：{refund['refund_id']}</p><p>场景：{refund['scene_type']}</p><p>建议动作：{refund['suggested_action']}</p></div>
<div class="card"><div class="badge">建议赔付</div><p>流水：{compensation['ledger_id']}</p><p>金额：¥{compensation['amount_cny']}</p><p>审批级别：{compensation['approval_level']}</p></div>
<div class="card"><div class="badge">下一步</div><p>1. 继续补证据</p><p>2. 若用户情绪升级，直接转 L2</p><p>3. 风控信号命中时冻结低级别赔付</p></div></aside>
</div></body></html>"""

    handoff_page = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8" /><title>人工接管台 Mock</title>
<style>body {{ font-family: 'Segoe UI', 'PingFang SC', sans-serif; margin: 0; background: #f7f7fb; color: #0f172a; }}
.wrap {{ display: grid; grid-template-columns: 360px 1fr 320px; gap: 16px; padding: 20px; }}
.card {{ background: white; border-radius: 18px; padding: 18px; box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08); }}
.tag {{ display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e0ecff; color: #1d4ed8; font-size: 12px; }}
.warn {{ background: #fee2e2; color: #b91c1c; }}</style></head><body><div class="wrap">
<section class="card"><div class="tag warn">L2 接管</div><h2>{order['order_id']}</h2><p>用户诉求：破损取证 + 赔付咨询 + 投诉风险</p><p>触发原因：多次咨询未解决 + 高价值商品 + 风控信号</p><p>推荐动作：优先回电，确认证据链，冻结低级别赔付。</p></section>
<section class="card"><div class="tag">AI 摘要</div><h3>handoff_summary</h3><p>用户购买 {order['brand_name']} {order['product_model']}，签收后发现门板压痕。已收集 3 张照片，缺完整开箱视频。系统命中 {risk['signal_type']} 风险信号，建议 L2 主管核实证据后决定赔付范围。</p><h3>命中文档</h3><ul><li>{order['compat_doc_id']}</li><li>{order['warranty_doc_id']}</li><li>{order['price_policy_doc_id']}</li></ul></section>
<aside class="card"><div class="tag">接管工具</div><p>证据面板：3 张照片 / 1 个订单摘要</p><p>赔付建议：¥{compensation['amount_cny']}，当前审批级别 {compensation['approval_level']}</p><p>风控动作：{risk['auto_action_taken']}</p><p>人工操作：确认判责 / 升级法务 / 回写 memory_case</p></aside>
</div></body></html>"""

    ops_page = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8" /><title>运营控制台 + A/B Test Mock</title>
<style>body { font-family: 'Segoe UI', 'PingFang SC', sans-serif; margin: 0; background: #eef2f6; color: #111827; }
.wrap { padding: 24px; } .hero { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.card { background: white; border-radius: 16px; padding: 16px; box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08); }
.ab { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; } .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; }
table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }</style></head><body>
<div class="wrap"><div class="hero">
<div class="card"><div class="pill">解决率</div><h2>58%</h2><p>mock 周期内自动解决率</p></div>
<div class="card"><div class="pill">转人工率</div><h2>34%</h2><p>L2/L3 升级仍可控</p></div>
<div class="card"><div class="pill">高风险达标</div><h2>3 / 3</h2><p>B3 / B6 / B10 全部过线</p></div>
<div class="card"><div class="pill">文档覆盖</div><h2>310</h2><p>当前使用 synthetic RAG 资产</p></div></div>
<div class="card"><h2>运营总览</h2><table>
<tr><th>模块</th><th>当前状态</th><th>作品集展示价值</th></tr>
<tr><td>会话与取证一体页</td><td>已合并</td><td>更像真实客服工作台</td></tr>
<tr><td>人工接管台</td><td>保留</td><td>体现人机协同</td></tr>
<tr><td>A/B Test 实验台</td><td>控制台内嵌</td><td>体现版本验证能力</td></tr>
</table></div>
<div class="ab">
<div class="card"><div class="pill">实验版本 A</div><h3>Prompt A + 检索策略 A</h3><p>手法：保守追问，情绪安抚更强</p><p>自动解决率：55%</p><p>高风险误承诺：0</p><p>平均补槽轮次：1.9</p></div>
<div class="card"><div class="pill">实验版本 B</div><h3>Prompt B + 检索策略 B</h3><p>手法：优先给下一步，检索更激进</p><p>自动解决率：61%</p><p>高风险误承诺：1</p><p>平均补槽轮次：1.4</p></div></div>
<div class="card" style="margin-top:16px;"><h2>A/B Test 对比维度</h2><table>
<tr><th>实验项</th><th>A 版本</th><th>B 版本</th><th>观察指标</th></tr>
<tr><td>Prompt</td><td>事实先行 + 强追问</td><td>行动先行 + 短回复</td><td>解决率 / 风险分</td></tr>
<tr><td>检索策略</td><td>必需文档严格命中</td><td>扩召回 + rerank</td><td>RAG_MISS / 引用率</td></tr>
<tr><td>handoff 阈值</td><td>情绪 angry 立即转</td><td>连续两轮 angry 再转</td><td>转人工率 / 投诉率</td></tr>
<tr><td>情绪话术模板</td><td>安抚优先</td><td>结论优先</td><td>重复表述次数 / 满意度</td></tr>
</table></div></div></body></html>"""

    flow_md = """# Mock 流程图

## 1. 会话与取证一体页主流程

```mermaid
flowchart LR
  A["用户发起咨询"] --> B["场景路由"]
  B --> C["槽位提取/情绪识别"]
  C --> D{"槽位是否完整"}
  D -->|"否"| E["追问并展示取证清单"]
  D -->|"是"| F["RAG 检索 + mock tools"]
  F --> G["Policy Engine"]
  G --> H{"高风险/欺诈命中?"}
  H -->|"是"| I["生成 handoff_summary"]
  I --> J["人工接管台"]
  H -->|"否"| K["生成回复 + citations"]
```

## 2. mock 订单与物流联动

```mermaid
flowchart LR
  O["mock_orders_100.csv"] --> T["order_query tool"]
  L["mock_logistics_100.csv"] --> U["logistics_query tool"]
  R["mock_refunds_10.csv"] --> V["refund_query tool"]
  C["mock_compensations_10.csv"] --> W["compensation_lookup tool"]
  S["mock_risk_signals_10.csv"] --> X["risk_signal tool"]
  T --> Y["Conversation Orchestrator"]
  U --> Y
  V --> Y
  W --> Y
  X --> Y
```

## 3. A/B Test 版本验证闭环

```mermaid
flowchart LR
  P["Prompt A/B"] --> M["离线评测 runner"]
  Q["检索策略 A/B"] --> M
  R["handoff 阈值 A/B"] --> M
  S["情绪话术模板 A/B"] --> M
  M --> N["控制台实验台"]
  N --> Z["版本结论/是否切换默认版本"]
```
"""

    (MOCK_UI_DIR / "merged_chat_evidence_mock.html").write_text(merged_page, encoding="utf-8")
    (MOCK_UI_DIR / "handoff_workbench_mock.html").write_text(handoff_page, encoding="utf-8")
    (MOCK_UI_DIR / "ops_console_abtest_mock.html").write_text(ops_page, encoding="utf-8")
    (MOCK_UI_DIR / "mock_flows.md").write_text(flow_md, encoding="utf-8")


def main():
    orders, logistics, refunds, compensations, risk_signals = generate_orders_and_tools()
    eval_cases = generate_multiturn_eval_cases()

    write_csv(
        RAG_DIR / "mock_orders_100.csv",
        orders,
        ["order_id", "session_id", "customer_id", "customer_tier", "channel", "sku_id", "brand_id", "brand_name", "category_id", "category_name", "product_model", "version_country", "china_usability", "warranty_type", "return_policy_type", "import_channel", "quantity", "unit_price_cny", "shipping_fee_cny", "total_amount_cny", "order_status", "payment_status", "shipment_status", "created_at", "paid_at", "promised_eta_start", "promised_eta_end", "destination_region", "destination_city", "destination_district", "compat_doc_id", "warranty_doc_id", "price_policy_doc_id", "mock_note"],
    )
    write_csv(
        RAG_DIR / "mock_logistics_100.csv",
        logistics,
        ["shipment_id", "order_id", "tracking_no", "carrier_name", "transport_mode", "origin_hub", "destination_city", "destination_region", "current_status", "current_node_label", "customs_status", "current_node_detail", "last_update_at", "eta_start", "eta_end", "outbound_at", "customs_released_at", "delivered_at", "abnormal_flag", "abnormal_reason", "tracking_summary"],
    )
    write_csv(
        RAG_DIR / "mock_refunds_10.csv",
        refunds,
        ["refund_id", "order_id", "session_id", "customer_id", "scene_type", "reason_type", "requested_amount_cny", "requested_at", "evidence_status", "policy_route", "required_doc_refs", "status", "approval_level_required", "suggested_action", "decision_summary"],
    )
    write_csv(
        RAG_DIR / "mock_compensations_10.csv",
        compensations,
        ["ledger_id", "order_id", "session_id", "customer_id", "compensation_type", "amount_cny", "approval_level", "approver_role", "rule_card_ref", "evidence_ids", "status", "issued_at", "risk_guardrail"],
    )
    write_csv(
        RAG_DIR / "mock_risk_signals_10.csv",
        risk_signals,
        ["signal_id", "order_id", "session_id", "customer_id", "signal_type", "severity", "detected_at", "evidence_summary", "auto_action_taken", "review_required", "review_status", "assigned_queue", "notes"],
    )
    write_csv(
        RAG_DIR / "eval_multiturn_supplement_v1.csv",
        eval_cases,
        ["case_id", "category", "boundary_type", "locale", "channel", "优先主题", "query", "context_turns", "sku_id", "scene_type", "sub_intent", "预期动作", "gold_action_category", "必需槽位", "必需文档", "是否调用工具", "缺RAG是否必须拒答/追问", "Gold rule", "gold_must_contain", "gold_must_not_contain", "rubric_3pt", "风险级别", "notes"],
    )

    render_html_pages(orders, logistics, refunds, compensations, risk_signals)
    summary = {
        "generated_at": datetime.now().isoformat(),
        "orders": len(orders),
        "logistics": len(logistics),
        "refunds": len(refunds),
        "compensations": len(compensations),
        "risk_signals": len(risk_signals),
        "eval_multiturn_cases": len(eval_cases),
    }
    (RAG_DIR / "mock_portfolio_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
