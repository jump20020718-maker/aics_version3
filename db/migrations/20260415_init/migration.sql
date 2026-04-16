CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE customer_channel AS ENUM ('web', 'wechat');
CREATE TYPE order_lifecycle AS ENUM ('processing', 'closed');
CREATE TYPE shipment_status AS ENUM (
  'label_created',
  'customs_clearance',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
  'cancelled'
);
CREATE TYPE refund_status AS ENUM ('open', 'closed', 'rejected', 'approved');
CREATE TYPE approval_level AS ENUM ('AI', 'L1', 'L2', 'L3');
CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE session_resolution AS ENUM ('open', 'resolved', 'handoff', 'closed');

CREATE TABLE brands (
  brand_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin_country TEXT,
  official_warranty_supported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categories (
  category_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sub_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skus (
  sku_id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(brand_id),
  category_id TEXT NOT NULL REFERENCES categories(category_id),
  brand_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  model TEXT NOT NULL,
  product_name TEXT NOT NULL,
  version_country TEXT NOT NULL,
  rated_voltage TEXT,
  rated_frequency TEXT,
  plug_type TEXT,
  power_watt INTEGER,
  certification_mark TEXT,
  china_usability TEXT,
  china_voltage_note TEXT,
  china_plug_adapter TEXT,
  warranty_type TEXT,
  warranty_duration_days INTEGER,
  return_policy_type TEXT,
  import_channel TEXT,
  importer_name TEXT,
  sales_rule_return TEXT,
  sales_rule_return_window_days INTEGER,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE knowledge_docs (
  doc_id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL,
  sku_id TEXT,
  brand TEXT,
  category TEXT,
  title TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  source_type TEXT NOT NULL,
  source_of_truth_tier TEXT NOT NULL,
  confidence_ceiling NUMERIC(4,2),
  replace_with_real_doc BOOLEAN DEFAULT FALSE,
  priority_topics JSONB DEFAULT '[]'::jsonb,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  raw_content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE doc_chunks (
  chunk_id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES knowledge_docs(doc_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_need_profiles (
  sku_id TEXT PRIMARY KEY REFERENCES skus(sku_id) ON DELETE CASCADE,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE warranty_rules (
  rule_id TEXT PRIMARY KEY,
  brand_id TEXT REFERENCES brands(brand_id),
  sku_id TEXT,
  scope_type TEXT,
  valid_regions JSONB DEFAULT '[]'::jsonb,
  rule_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE install_templates (
  template_id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(category_id),
  conditions_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE damage_rules (
  rule_id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(category_id),
  evidence_required JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE price_rules (
  rule_id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(category_id),
  gap_threshold TEXT,
  expires_at TIMESTAMPTZ,
  rule_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  customer_tier TEXT,
  channel customer_channel NOT NULL,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  total_amount_cny NUMERIC(10,2) NOT NULL,
  shipping_fee_cny NUMERIC(10,2) DEFAULT 0,
  order_status order_lifecycle NOT NULL,
  payment_status TEXT NOT NULL,
  shipment_status shipment_status NOT NULL,
  destination_region TEXT,
  destination_city TEXT,
  destination_district TEXT,
  promised_eta_start DATE,
  promised_eta_end DATE,
  created_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  tool_payload JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE order_shipments (
  shipment_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  tracking_no TEXT NOT NULL UNIQUE,
  carrier_name TEXT,
  transport_mode TEXT,
  origin_hub TEXT,
  current_status shipment_status NOT NULL,
  current_node_label TEXT,
  current_node_detail TEXT,
  customs_status TEXT,
  last_update_at TIMESTAMPTZ,
  eta_start TIMESTAMPTZ,
  eta_end TIMESTAMPTZ,
  outbound_at TIMESTAMPTZ,
  customs_released_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  abnormal_flag TEXT,
  abnormal_reason TEXT,
  tracking_summary TEXT
);

CREATE TABLE refund_requests (
  refund_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES orders(session_id),
  customer_id TEXT NOT NULL,
  scene_type TEXT NOT NULL,
  reason_type TEXT NOT NULL,
  requested_amount_cny NUMERIC(10,2) NOT NULL,
  evidence_status TEXT,
  policy_route TEXT,
  required_doc_refs TEXT,
  status refund_status NOT NULL,
  approval_level_required TEXT,
  suggested_action TEXT,
  requested_at TIMESTAMPTZ NOT NULL,
  decision_summary TEXT
);

CREATE TABLE compensation_ledger (
  ledger_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES orders(session_id),
  customer_id TEXT NOT NULL,
  compensation_type TEXT NOT NULL,
  amount_cny NUMERIC(10,2) NOT NULL,
  approval_level approval_level NOT NULL,
  approver_role TEXT NOT NULL,
  rule_card_ref TEXT,
  evidence_ids TEXT,
  status TEXT NOT NULL,
  issued_at TIMESTAMPTZ,
  risk_guardrail TEXT
);

CREATE TABLE risk_signals (
  signal_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES orders(session_id),
  customer_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  severity risk_severity NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  evidence_summary TEXT NOT NULL,
  auto_action_taken TEXT,
  review_required BOOLEAN DEFAULT TRUE,
  review_status TEXT DEFAULT 'pending',
  assigned_queue TEXT,
  notes TEXT
);

CREATE TABLE chat_sessions (
  session_id TEXT PRIMARY KEY REFERENCES orders(session_id),
  channel customer_channel NOT NULL,
  customer_id TEXT NOT NULL,
  current_scene TEXT,
  current_sku_id TEXT,
  emotion_state TEXT,
  slot_json JSONB DEFAULT '{}'::jsonb,
  risk_level TEXT,
  resolution_status session_resolution DEFAULT 'open',
  summary_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  message_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  route_trace JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tool_calls (
  call_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  params JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE evidence_assets (
  evidence_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(order_id),
  asset_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE handoff_cases (
  handoff_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  level approval_level NOT NULL,
  summary JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE memory_cases (
  case_id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES chat_sessions(session_id),
  summary TEXT NOT NULL,
  approved_by TEXT,
  expires_at TIMESTAMPTZ,
  payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE eval_cases (
  case_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  scene_type TEXT NOT NULL,
  channel customer_channel,
  query TEXT NOT NULL,
  context_turns JSONB DEFAULT '[]'::jsonb,
  gold_action_category TEXT NOT NULL,
  gold_must_contain JSONB DEFAULT '[]'::jsonb,
  gold_must_not_contain JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);

CREATE TABLE eval_runs (
  run_id TEXT PRIMARY KEY,
  eval_set TEXT NOT NULL,
  version TEXT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ab_test_experiments (
  experiment_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  experiment_type TEXT NOT NULL,
  control_variant_id TEXT,
  status TEXT NOT NULL,
  metric_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ab_test_variants (
  variant_id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_test_experiments(experiment_id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  config_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ab_test_runs (
  run_id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_test_experiments(experiment_id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_test_variants(variant_id) ON DELETE CASCADE,
  traffic_percent NUMERIC(5,2),
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_docs_sku_type ON knowledge_docs (sku_id, doc_type);
CREATE INDEX idx_docs_brand_category ON knowledge_docs (brand, category);
CREATE INDEX idx_orders_customer ON orders (customer_id, created_at DESC);
CREATE INDEX idx_shipments_order_status ON order_shipments (order_id, current_status);
CREATE INDEX idx_refunds_order_status ON refund_requests (order_id, status);
CREATE INDEX idx_risk_order_severity ON risk_signals (order_id, severity);
CREATE INDEX idx_messages_session_created ON chat_messages (session_id, created_at);
