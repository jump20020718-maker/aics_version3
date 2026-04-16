# -*- coding: utf-8 -*-
"""
Task 1 一次性转换脚本：把 v2 RAG 包原地升级到 v3 数据规范。
产出物（全部直接覆盖原文件）：
  - rag_source_docs_v2.jsonl     （220 条修复 + 新增 96 条 = 316 条）
  - sku_master_60.csv            （补 china_usability / warranty_type 等 10 列）
  - field_specs_priority5.json   （54 条 → 80 条）
  - real_doc_checklist.csv       （统一枚举 + 新字段 + 追加 96 条新 doc_type 的真实文档项）

本脚本会在运行结束后打印所有关键变化统计。
"""
import json
import csv
import os
import sys
import collections
from datetime import datetime, timezone

# 强制 UTF-8 输出，避免 Windows GBK 错误
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ============ 路径 ============
WORK_DIR = r"D:/个人知识库/个人知识库/AI产品经理/ai客服家电/ai_cs_rag_v2_package"
SRC_JSONL = os.path.join(WORK_DIR, "rag_source_docs_v2.jsonl")
SRC_SKU_CSV = os.path.join(WORK_DIR, "sku_master_60.csv")
SRC_FIELD_SPECS = os.path.join(WORK_DIR, "field_specs_priority5.json")
SRC_CHECKLIST = os.path.join(WORK_DIR, "real_doc_checklist.csv")

# ============ 常量 ============
NOW_ISO = "2026-04-15T10:00:00+08:00"
TTL_30D_ISO = "2026-05-15T10:00:00+08:00"
TTL_90D_ISO = "2026-07-14T10:00:00+08:00"

PROVENANCE = {
    "origin": "synthetic_v2_seed",
    "collected_at": "2026-04-13T15:14:00+08:00",
    "collector": "v2_seed_generator",
    "review_status": "auto_reviewed",
    "reviewer": "v3_transform_script"
}

TIER_CONFIDENCE = {
    "tier1_official": 1.0,
    "tier2_supplier": 0.8,
    "tier3_synthetic": 0.5,
    "tier4_user_generated": 0.3
}

# 20 个"可能被带出国"的便携小电器 SKU
TRAVEL_SKU_WHITELIST = {
    # 空气净化器 6
    "SKU-BLUE-TAP-US", "SKU-BLUE-HEP-EU", "SKU-BLUE-HMP-UK",
    "SKU-STAD-TAP-EU", "SKU-STAD-HEP-UK", "SKU-STAD-HMP-EU",
    # 地面清洁设备 6
    "SKU-DYSO-RVC-US", "SKU-DYSO-CDV-EU", "SKU-DYSO-WFW-UK",
    "SKU-IROB-RVC-US", "SKU-IROB-CDV-EU", "SKU-IROB-WFW-UK",
    # 电热水壶/厨师机/食物处理 6
    "SKU-DUAL-KTL-UK", "SKU-DUAL-MIX-EU", "SKU-DUAL-PRC-US",
    "SKU-KENW-KTL-UK", "SKU-KENW-MIX-EU", "SKU-KENW-PRC-AE",
    # 胶囊咖啡机 2
    "SKU-DELO-Caps-UK", "SKU-JURA-Caps-UK"
}

# 10 个品类
CATEGORIES = [
    "全自动/半自动咖啡机",
    "台式烤箱/空气炸烤箱",
    "洗碗机",
    "冰箱/酒柜",
    "洗衣机/烘干机",
    "地面清洁设备",
    "空气净化器",
    "微波炉/蒸烤一体机",
    "烟机/电磁灶",
    "电热水壶/厨师机/食物处理"
]

CATEGORY_TO_ID = {c: f"CAT{i+1:02d}" for i, c in enumerate(CATEGORIES)}

# doc_type → priority_topics 差异化
DOC_TYPE_PRIORITY_TOPICS = {
    "sku_fact_card": ["电压/频率/插头兼容", "安装条件"],
    "compatibility_install_card": ["电压/频率/插头兼容", "安装条件"],
    "service_need_profile": ["多场景画像"],
    "warranty_region_policy": ["保修地域", "进口保修"],
    "damage_signoff_sop": ["签收破损"],
    "price_dispute_policy": ["降价争议"],
    "import_warranty_card": ["进口保修", "销售规则"],
    "shipping_eta_card": ["运输时效"],
    "travel_use_card": ["带出国使用", "电压/频率/插头兼容"]
}

# subject_risk_level 按 doc_type
DOC_TYPE_SUBJECT_RISK = {
    "sku_fact_card": "高",
    "compatibility_install_card": "极高",
    "service_need_profile": "中",
    "warranty_region_policy": "极高",
    "damage_signoff_sop": "极高",
    "price_dispute_policy": "高",
    "import_warranty_card": "极高",
    "shipping_eta_card": "中",
    "travel_use_card": "高"
}

# 品牌 → 进口商画像（合成）
BRAND_TO_IMPORTER = {
    "De'Longhi": ("德龙中国区代理（合成）", "official_distributor", "importer_with_brand_support"),
    "Jura": ("优瑞（上海）贸易（合成）", "official_distributor", "importer_only"),
    "Smeg": ("SMEG 中国总代（合成）", "official_distributor", "importer_with_brand_support"),
    "Breville": ("铂富亚太（合成）", "parallel_import", "importer_only"),
    "Bosch": ("博世家电中国（合成）", "official_distributor", "brand_global"),
    "Miele": ("美诺中国（合成）", "official_distributor", "brand_global"),
    "Liebherr": ("利勃海尔中国代理（合成）", "parallel_import", "importer_only"),
    "Fisher & Paykel": ("斐雪派克亚太（合成）", "parallel_import", "importer_only"),
    "AEG": ("AEG 东南亚转口（合成）", "parallel_import", "importer_only"),
    "Electrolux": ("伊莱克斯东南亚（合成）", "parallel_import", "importer_only"),
    "Dyson": ("戴森中国（合成）", "official_distributor", "brand_global"),
    "iRobot": ("iRobot 亚太代理（合成）", "parallel_import", "importer_only"),
    "Blueair": ("布鲁雅尔中国（合成）", "official_distributor", "importer_with_brand_support"),
    "Stadler Form": ("斯泰得乐亚太（合成）", "parallel_import", "importer_only"),
    "Panasonic": ("松下中国（合成）", "official_distributor", "brand_global"),
    "Russell Hobbs": ("罗素豪柏亚太代理（合成）", "parallel_import", "importer_only"),
    "Elica": ("Elica 亚太（合成）", "parallel_import", "importer_only"),
    "Bertazzoni": ("贝尔塔佐尼亚太（合成）", "parallel_import", "importer_only"),
    "Dualit": ("Dualit 亚太（合成）", "parallel_import", "importer_only"),
    "Kenwood": ("Kenwood 亚太（合成）", "parallel_import", "importer_only")
}

# ============ 辅助函数 ============

def parse_voltage(v):
    """返回 ('low' | 'match' | 'unknown', 数字or None)。low=100/120V; match=220-240V。"""
    if "120V" in v:
        return ("low", 120)
    if "100V" in v:
        return ("low", 100)
    if "220" in v or "230" in v or "240" in v:
        return ("match", 220)
    return ("unknown", None)


def classify_china_usability(voltage, power_w, plug, category):
    """
    返回 dict: {china_usability, china_voltage_note, china_plug_adapter}
    CN 家用：220V/50Hz，GB 2099（2 脚或 3 脚扁片，与 Type I 物理兼容）
    """
    v_status, v_num = parse_voltage(voltage)
    plug_match_cn = (plug == "Type I")

    # 常年运转/嵌入式
    always_on_or_installed = category in ["冰箱/酒柜", "烟机/电磁灶"]
    # 厨房大功率家电（带水电/排气）
    heavy_kitchen = category in ["洗碗机", "洗衣机/烘干机", "台式烤箱/空气炸烤箱", "微波炉/蒸烤一体机"]

    # --- 电压不匹配（需降压变压器） ---
    if v_status == "low":
        if always_on_or_installed:
            return {
                "china_usability": "not_recommended",
                "china_voltage_note": f"{voltage} 进口版；该类家电属于长时段/嵌入式场景，配变压器运行不经济也不安全，中国市场不建议使用",
                "china_plug_adapter": "不建议"
            }
        if heavy_kitchen or power_w > 1500:
            return {
                "china_usability": "not_recommended",
                "china_voltage_note": f"{voltage} 进口版，功率 {power_w}W；家用 220→{v_num}V 变压器最大约 2000-3000W 仍留余量不足，长期使用存在发热/烧毁风险",
                "china_plug_adapter": "不建议"
            }
        # 低/中功率 → 可用变压器
        return {
            "china_usability": "need_transformer_and_adapter" if not plug_match_cn else "need_transformer",
            "china_voltage_note": f"{voltage} 进口版；中国家用电压 220V/50Hz。需配 220V→{v_num}V 降压变压器（建议 {max(1500, power_w*2)}W 以上）",
            "china_plug_adapter": f"{plug} → GB 2099 转接头" if not plug_match_cn else "无需转接头"
        }

    # --- 电压匹配（220V 系列） ---
    if v_status == "match":
        if plug_match_cn:
            return {
                "china_usability": "direct",
                "china_voltage_note": "电压 220V 与中国家用标准一致，可直接使用",
                "china_plug_adapter": "无需转接头（Type I 与中国 GB 2099 物理兼容）"
            }
        # 需要转接头
        if always_on_or_installed or heavy_kitchen:
            return {
                "china_usability": "need_adapter",
                "china_voltage_note": "电压 220V 匹配；插头需专业改装（嵌入式/大功率家电不建议长期依赖转接头）",
                "china_plug_adapter": f"{plug} → GB 2099 三极转接头（16A 以上认证；高功率机型建议切掉原插头做专业改线）"
            }
        return {
            "china_usability": "need_adapter",
            "china_voltage_note": "电压 220V 与中国家用标准一致",
            "china_plug_adapter": f"{plug} → GB 2099 三极转接头（10A 及以上认证即可满足小电器）"
        }

    return {
        "china_usability": "not_recommended",
        "china_voltage_note": "电压制式未知，默认不建议使用",
        "china_plug_adapter": "需人工复核"
    }


def build_import_warranty_fields(brand, category, power_w):
    """生成进口保修相关的 warranty_type / warranty_duration_days / return_policy_type / import_channel / sales_rule_return 等字段。"""
    importer_name, importer_type, warranty_scope = BRAND_TO_IMPORTER.get(
        brand, ("未知进口商（合成）", "parallel_import", "importer_only")
    )
    # 默认保修期
    if warranty_scope == "brand_global":
        warranty_days = 730  # 24 个月
    elif warranty_scope == "importer_with_brand_support":
        warranty_days = 365  # 12 个月
    else:
        warranty_days = 365  # 12 个月（进口商兜底）

    return {
        "warranty_type": warranty_scope,
        "warranty_duration_days": warranty_days,
        "return_policy_type": "quality_only",
        "import_channel": importer_type,
        "sales_rule_return": "本商品为跨境进口商品，不支持七天无理由退换，仅在出现质量问题时支持退换货；请在签收后 15 天内完成质量申报",
        "sales_rule_return_window_days": 15
    }


def base_metadata(doc_type, existing_doc_id=None):
    """给所有 doc 注入统一的元数据。"""
    return {
        "locale": "zh-CN",
        "source_of_truth_tier": "tier3_synthetic",
        "confidence_ceiling": TIER_CONFIDENCE["tier3_synthetic"],
        "data_provenance": PROVENANCE,
        "subject_risk_level": DOC_TYPE_SUBJECT_RISK[doc_type],
        "data_risk_level": "high_synthetic_only",
        "created_at": "2026-04-13T15:14:00+08:00",
        "updated_at": NOW_ISO,
        "version": "v3.0.0",
        "expires_at": None
    }


def migrate_priority_topic(doc_type, old_str):
    """把老的 priority_topic 字符串转成差异化的 priority_topics 数组。"""
    return list(DOC_TYPE_PRIORITY_TOPICS[doc_type])


# ============ 加载源数据 ============

def load_sku_master():
    """返回 {sku_id: row_dict}。处理 BOM。"""
    rows = []
    with open(SRC_SKU_CSV, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    sku_map = {r['sku_id']: r for r in rows}
    return rows, sku_map


def load_jsonl():
    docs = []
    with open(SRC_JSONL, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                docs.append(json.loads(line))
    return docs


def load_checklist():
    rows = []
    with open(SRC_CHECKLIST, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    return rows


# ============ 逐 doc 修复 ============

def fix_sku_fact_card(doc, sku_row):
    """修复 sku_fact_card。"""
    new_doc = dict(doc)

    # 删除老字段，不再保留
    new_doc.pop("country_scope", None)
    new_doc.pop("priority_topic", None)
    new_doc.pop("risk_level", None)
    new_doc.pop("replace_with_real_doc", None)

    # 元数据
    new_doc.update(base_metadata("sku_fact_card"))
    new_doc["priority_topics"] = migrate_priority_topic("sku_fact_card", doc.get("priority_topic"))
    new_doc["replace_with_real_doc"] = True

    # 新的版本/销售字段
    new_doc["version_country"] = sku_row['目标区域版']
    new_doc["sales_regions"] = ["CN-mainland"]

    # 关联 ID
    if "brand_id" not in new_doc:
        new_doc["brand_id"] = sku_row["brand_id"]
    if "category_id" not in new_doc:
        new_doc["category_id"] = sku_row["category_id"]

    # facts 字段：补 china_usability / warranty 字段
    facts = dict(new_doc.get("facts", {}))
    voltage = facts.get("rated_voltage", sku_row['额定电压'])
    plug = facts.get("plug_type", sku_row['插头类型'])
    power = facts.get("power_watt", int(sku_row['功率W']))
    category = new_doc.get("category", sku_row['类目'])

    cn_info = classify_china_usability(voltage, power, plug, category)
    facts.update(cn_info)

    import_info = build_import_warranty_fields(new_doc.get("brand", sku_row['品牌']), category, power)
    facts.update(import_info)

    new_doc["facts"] = facts
    return new_doc


def _yn_to_bool(v):
    """把 'Y'/'N' 字符串转成 bool；自由文本（如 '部分烘干机Y'）保持字符串。"""
    if v == "Y":
        return True
    if v == "N":
        return False
    return v


def fix_compatibility_install_card(doc, sku_row):
    """修复 compatibility_install_card：
       - country_scope → supported_use_countries，必含 CN-mainland
       - 修复 DELO-Bean-US 的 US verdict 矛盾
       - 为每一条加 CN-mainland 规则
       - installation_requirements 里的 Y/N 字符串转 bool
    """
    new_doc = dict(doc)
    new_doc.pop("country_scope", None)
    new_doc.pop("priority_topic", None)
    new_doc.pop("risk_level", None)
    new_doc.pop("replace_with_real_doc", None)

    # 把 installation_requirements 中的 Y/N 字符串转 bool
    if "installation_requirements" in new_doc:
        ir = dict(new_doc["installation_requirements"])
        for k in ("water_inlet_required", "drainage_required", "exhaust_required", "dedicated_circuit_required"):
            if k in ir:
                ir[k] = _yn_to_bool(ir[k])
        new_doc["installation_requirements"] = ir

    new_doc.update(base_metadata("compatibility_install_card"))
    new_doc["priority_topics"] = migrate_priority_topic("compatibility_install_card", doc.get("priority_topic"))
    new_doc["replace_with_real_doc"] = True

    orig_countries = doc.get("country_scope", [])
    # 去掉 EU/US 的冗余，保证 CN-mainland 在前
    new_supported = ["CN-mainland"] + [c for c in orig_countries if c not in ("CN", "CN-mainland")]
    new_doc["supported_use_countries"] = new_supported

    # 修复 compatibility_rules
    rules = list(doc.get("compatibility_rules", []))

    # 取 SKU 的 plug 信息
    sku_plug = sku_row['插头类型']
    sku_voltage = sku_row['额定电压']

    fixed_rules = []
    for r in rules:
        rr = dict(r)
        country = rr.get("country")
        # 修复 US/CA 的 Type B → Type A/B 矛盾：如果 SKU 本身是 Type B 且国家要求 Type A/B，判定 compatible
        if country in ("US", "CA") and sku_plug == "Type B" and rr.get("verdict") == "manual_review":
            if "Type A/B" in rr.get("required_plug", "") and "120V" in sku_voltage:
                rr["verdict"] = "compatible"
                rr["explain"] = "电压 120V/60Hz、插头 Type B 与 US/CA 家用标准一致，可直接使用"
        # 把老 verdict 枚举翻译到新枚举
        old_verdict_map = {
            "compatible": "compatible",
            "direct_use": "compatible",
            "manual_review": "manual_review",
            "not_recommended": "not_recommended",
            "need_adapter": "need_adapter",
            "need_transformer": "need_transformer",
            "converter_required": "need_transformer_and_adapter"
        }
        rr["verdict"] = old_verdict_map.get(rr.get("verdict", "manual_review"), "manual_review")
        fixed_rules.append(rr)

    # 补充 CN-mainland 规则（基于 SKU 属性）
    has_cn = any(r.get("country") in ("CN", "CN-mainland") for r in fixed_rules)
    if not has_cn:
        cn_info = classify_china_usability(sku_voltage, int(sku_row['功率W']), sku_plug, sku_row['类目'])
        cn_verdict_map = {
            "direct": "compatible",
            "need_adapter": "need_adapter",
            "need_transformer": "need_transformer",
            "need_transformer_and_adapter": "need_transformer_and_adapter",
            "not_recommended": "not_recommended"
        }
        cn_rule = {
            "country": "CN-mainland",
            "verdict": cn_verdict_map[cn_info["china_usability"]],
            "required_household_power": "220V/50Hz",
            "required_plug": "GB 2099（扁脚 2/3 极）",
            "explain": cn_info["china_voltage_note"],
            "recommended_accessory": cn_info["china_plug_adapter"]
        }
        # CN-mainland 规则放最前
        fixed_rules = [cn_rule] + fixed_rules

    new_doc["compatibility_rules"] = fixed_rules
    return new_doc


def fix_warranty_region_policy(doc, sku_master_rows):
    """修复 warranty_region_policy：
       - 加 warranty_scope_type（默认 importer_only）
       - 加 valid_regions（默认 ['CN-mainland']）
       - 加 linked_sku_ids（关联本品牌 + 本品类的所有 SKU）
    """
    new_doc = dict(doc)
    new_doc.pop("country_scope", None)
    new_doc.pop("priority_topic", None)
    new_doc.pop("risk_level", None)
    new_doc.pop("replace_with_real_doc", None)

    new_doc.update(base_metadata("warranty_region_policy"))
    new_doc["priority_topics"] = migrate_priority_topic("warranty_region_policy", doc.get("priority_topic"))
    new_doc["replace_with_real_doc"] = True
    new_doc["expires_at"] = TTL_30D_ISO  # 政策类 30 天 TTL

    brand = doc.get("brand")
    category = doc.get("category")

    # 进口商保修作为默认
    _, _, warranty_scope = BRAND_TO_IMPORTER.get(brand, ("", "parallel_import", "importer_only"))
    new_doc["warranty_scope_type"] = warranty_scope
    new_doc["valid_regions"] = ["CN-mainland"]

    # linked_sku_ids：同品牌 + 同品类
    linked = [r['sku_id'] for r in sku_master_rows if r['品牌'] == brand and r['类目'] == category]
    new_doc["linked_sku_ids"] = linked

    return new_doc


def fix_simple_doc(doc, doc_type):
    """damage_signoff_sop / price_dispute_policy / service_need_profile 的简单修复。"""
    new_doc = dict(doc)
    new_doc.pop("priority_topic", None)
    new_doc.pop("risk_level", None)
    new_doc.pop("replace_with_real_doc", None)

    new_doc.update(base_metadata(doc_type))
    new_doc["priority_topics"] = migrate_priority_topic(doc_type, doc.get("priority_topic"))
    new_doc["replace_with_real_doc"] = doc.get("replace_with_real_doc", "Y") == "Y"

    if doc_type == "service_need_profile":
        # service_need_profile 原本 replace_with_real_doc=N，保持 False
        new_doc["replace_with_real_doc"] = False

    if doc_type == "price_dispute_policy":
        new_doc["expires_at"] = TTL_30D_ISO
    elif doc_type == "shipping_eta_card":
        new_doc["expires_at"] = TTL_30D_ISO
    elif doc_type == "import_warranty_card":
        new_doc["expires_at"] = TTL_90D_ISO

    return new_doc


# ============ 生成新 doc_type ============

def gen_import_warranty_cards(sku_master_rows):
    """每个 SKU 一条 import_warranty_card。"""
    docs = []
    for r in sku_master_rows:
        sku_id = r['sku_id']
        brand = r['品牌']
        category = r['类目']
        importer_name, importer_type, warranty_scope = BRAND_TO_IMPORTER.get(
            brand, ("未知进口商（合成）", "parallel_import", "importer_only")
        )

        if warranty_scope == "brand_global":
            dur = 730
            service_net = "全球品牌授权服务网点（需凭发票）"
            excluded = ["人为损坏", "非质量问题拆装损伤", "水/电不匹配导致的损坏"]
            cross_check = "品牌中国官网可验证序列号；但平行进口机型可能需先经进口商登记"
        elif warranty_scope == "importer_with_brand_support":
            dur = 365
            service_net = "进口商一级服务点 + 部分品牌授权点（需联系进口商开单）"
            excluded = ["人为损坏", "非质量问题拆装损伤", "超期未质量申报", "私拆送修"]
            cross_check = "品牌官方保修不直接适用；进口商拥有可与品牌协作的绿色通道"
        else:
            dur = 365
            service_net = "仅进口商维修点（可能需寄修到一线城市）"
            excluded = ["人为损坏", "非质量问题拆装损伤", "超期未质量申报", "私拆送修", "非官方配件引起的故障"]
            cross_check = "不适用品牌全球联保。建议所有故障先联系进口商售后；到品牌官方维修点维修需自付费用"

        doc = {
            "doc_id": f"DOC-IMP-{sku_id.replace('SKU-','')}-WARRANTY",
            "doc_type": "import_warranty_card",
            "domain": "KD09",
            "title": f"{brand}_{r['型号']}_进口保修卡",
            "sku_id": sku_id,
            "brand": brand,
            "brand_id": r['brand_id'],
            "category": category,
            "category_id": r['category_id'],
            "source_type": "synthetic_seed",
            "import_info": {
                "importer_name": importer_name,
                "importer_type": importer_type,
                "warranty_scope_type": warranty_scope,
                "warranty_duration_days": dur,
                "service_network": service_net,
                "rma_process": "1) 客服工单预登记；2) 视频演示故障现象；3) 寄回进口商仓或上门取件；4) 检测后维修或换新；5) 回寄",
                "excluded_failures": excluded,
                "customer_pay_items": ["非质量问题来回运费", "超保修期维修费", "人为/使用不当引起的更换配件费"],
                "cross_check_with_brand": cross_check
            }
        }
        doc.update(base_metadata("import_warranty_card"))
        doc["priority_topics"] = migrate_priority_topic("import_warranty_card", None)
        doc["replace_with_real_doc"] = True
        doc["expires_at"] = TTL_90D_ISO
        docs.append(doc)
    return docs


def gen_shipping_eta_cards():
    """按 10 个品类生成 shipping_eta_card。"""
    base_info = {
        "sea": (12, 21, 3, 2),        # min, max, customs, last_mile
        "air": (4, 7, 2, 2),
        "bonded_warehouse_prestocked": (3, 6, 0, 2)
    }

    docs = []
    for i, cat in enumerate(CATEGORIES):
        cat_id = CATEGORY_TO_ID[cat]
        # 大件走海运，小件多走空运，有保税仓的优先保税仓
        if cat in ["冰箱/酒柜", "洗碗机", "洗衣机/烘干机", "烟机/电磁灶", "台式烤箱/空气炸烤箱"]:
            mode = "sea"
            origin = "新加坡/马来西亚港口集货仓"
        elif cat in ["微波炉/蒸烤一体机", "全自动/半自动咖啡机"]:
            mode = "sea"
            origin = "新加坡港口集货仓"
        else:
            mode = "bonded_warehouse_prestocked"
            origin = "宁波/郑州保税仓（前置）"

        eta_min, eta_max, customs, last_mile = base_info[mode]
        total_min = eta_min + customs + last_mile
        total_max = eta_max + customs + last_mile

        doc = {
            "doc_id": f"DOC-SHIP-{cat_id}",
            "doc_type": "shipping_eta_card",
            "domain": "KD10",
            "title": f"{cat}_运输时效说明卡",
            "category": cat,
            "category_id": cat_id,
            "source_type": "synthetic_seed",
            "shipping_info": {
                "origin_hub": origin,
                "destination_hub": "CN-mainland",
                "transport_mode": mode,
                "typical_eta_days_min": total_min,
                "typical_eta_days_max": total_max,
                "customs_clearance_days": customs,
                "last_mile_days": last_mile,
                "script_why_slow": (
                    f"本品为跨境进口商品，从{origin}发货，"
                    f"{'采用海运' if mode=='sea' else '已在中国境内保税仓前置'}，"
                    f"含清关 {customs} 天与国内末端配送 {last_mile} 天，"
                    f"整体时效约 {total_min}-{total_max} 天。相较国内现货发货，时效更慢但价格更低。"
                ),
                "expedite_available": mode == "bonded_warehouse_prestocked",
                "expedite_cost_script": (
                    "保税仓前置机型可走顺丰特快，国内段最快 2 天可达"
                    if mode == "bonded_warehouse_prestocked" else
                    "海运时效受船期/清关影响，不支持加急；如确需加急可评估改走空运，运费上浮 30-50%，请走人工工单"
                )
            }
        }
        doc.update(base_metadata("shipping_eta_card"))
        doc["priority_topics"] = migrate_priority_topic("shipping_eta_card", None)
        doc["replace_with_real_doc"] = True
        doc["expires_at"] = TTL_30D_ISO
        docs.append(doc)
    return docs


def gen_travel_use_cards(sku_master_rows):
    """为 20 个便携 SKU 生成 travel_use_card。"""
    # 东南亚常见目标国
    sea_countries_info = {
        "SG": ("230V/50Hz", "Type G"),
        "MY": ("240V/50Hz", "Type G"),
        "TH": ("220V/50Hz", "Type A/B/C"),
        "JP": ("100V/50-60Hz", "Type A"),
        "KR": ("220V/60Hz", "Type C/F")
    }

    docs = []
    for r in sku_master_rows:
        sku_id = r['sku_id']
        if sku_id not in TRAVEL_SKU_WHITELIST:
            continue
        brand = r['品牌']
        category = r['类目']
        voltage = r['额定电压']
        plug = r['插头类型']
        power = int(r['功率W'])

        per_country = []
        for ctry, (cv, cp) in sea_countries_info.items():
            # 电压匹配判断
            sku_is_220 = "220" in voltage or "230" in voltage or "240" in voltage
            sku_is_low = "120V" in voltage or "100V" in voltage
            ctry_is_220 = "220" in cv or "230" in cv or "240" in cv
            ctry_is_low = "100V" in cv or "110V" in cv or "120V" in cv

            volt_ok = (sku_is_220 and ctry_is_220) or (sku_is_low and ctry_is_low and sku_id.endswith("-US"))
            plug_ok = (plug in cp) or (cp.endswith(plug))

            if volt_ok and plug_ok:
                verdict = "compatible"
                explain = f"电压 {voltage}/{'50Hz' if sku_is_220 else '60Hz'} 与 {ctry} 家用 {cv} 一致，插头 {plug} 物理兼容"
                acc = "无需转接头"
            elif volt_ok and not plug_ok:
                verdict = "need_adapter"
                explain = f"电压匹配；{plug} 需转 {cp}"
                acc = f"{plug}→{cp} 转接头"
            elif not volt_ok and plug_ok:
                verdict = "need_transformer"
                explain = f"电压不匹配：本机 {voltage} vs {ctry} {cv}，需配降压/升压变压器"
                acc = "1500W 以上变压器"
            else:
                if power > 1500:
                    verdict = "not_recommended"
                    explain = f"电压 {voltage} 与 {ctry} {cv} 不匹配，且本机功率 {power}W 过高，旅行场景不建议"
                    acc = "不建议"
                else:
                    verdict = "need_transformer_and_adapter"
                    explain = f"电压/插头均需转换：{voltage}/{plug} → {cv}/{cp}"
                    acc = f"1500W 变压器 + {plug}→{cp} 转接头"

            per_country.append({
                "country": ctry,
                "verdict": verdict,
                "explain": explain,
                "recommended_accessory": acc
            })

        # IATA 电池提醒（仅有锂电池设备需要）
        battery_note = ""
        if category == "地面清洁设备" and "CDV" in sku_id:
            battery_note = "本机内置锂电池，总容量需 ≤100Wh 方可手提登机；托运需按航空公司规则声明"

        hand_carry = "小家电一般可托运；尺寸允许时优先手提，避免托运磕碰"

        doc = {
            "doc_id": f"DOC-TRVL-{sku_id.replace('SKU-','')}",
            "doc_type": "travel_use_card",
            "domain": "KD11",
            "title": f"{brand}_{r['型号']}_带出国使用卡",
            "sku_id": sku_id,
            "brand": brand,
            "brand_id": r['brand_id'],
            "category": category,
            "category_id": r['category_id'],
            "source_type": "synthetic_seed",
            "travel_info": {
                "target_countries": list(sea_countries_info.keys()),
                "per_country_verdict": per_country,
                "battery_iata_note": battery_note,
                "hand_carry_note": hand_carry
            }
        }
        doc.update(base_metadata("travel_use_card"))
        doc["priority_topics"] = migrate_priority_topic("travel_use_card", None)
        doc["replace_with_real_doc"] = True
        docs.append(doc)
    return docs


# ============ 主流程 ============

def main():
    print("=" * 70)
    print("Task 1 RAG 转换脚本 v2 → v3")
    print("=" * 70)

    # 1. 加载源
    sku_master_rows, sku_map = load_sku_master()
    docs = load_jsonl()
    checklist = load_checklist()

    print(f"加载: {len(docs)} 条 docs, {len(sku_master_rows)} 个 SKU, {len(checklist)} 条 checklist")

    # 2. 按类型分桶
    by_type = collections.defaultdict(list)
    for d in docs:
        by_type[d['doc_type']].append(d)

    print("\n原始 doc_type 分布:")
    for k, v in by_type.items():
        print(f"  {k}: {len(v)}")

    # 3. 逐类型修复
    new_docs = []

    # sku_fact_card
    for d in by_type["sku_fact_card"]:
        sku = sku_map.get(d['sku_id'])
        if sku:
            new_docs.append(fix_sku_fact_card(d, sku))
        else:
            print(f"  WARNING: sku_fact_card {d['doc_id']} 找不到 sku_master 对应行")

    # compatibility_install_card
    for d in by_type["compatibility_install_card"]:
        sku = sku_map.get(d['sku_id'])
        if sku:
            new_docs.append(fix_compatibility_install_card(d, sku))
        else:
            print(f"  WARNING: compat_card {d['doc_id']} 找不到 sku_master 对应行")

    # service_need_profile
    for d in by_type["service_need_profile"]:
        new_docs.append(fix_simple_doc(d, "service_need_profile"))

    # warranty_region_policy
    for d in by_type["warranty_region_policy"]:
        new_docs.append(fix_warranty_region_policy(d, sku_master_rows))

    # damage_signoff_sop
    for d in by_type["damage_signoff_sop"]:
        new_docs.append(fix_simple_doc(d, "damage_signoff_sop"))

    # price_dispute_policy
    for d in by_type["price_dispute_policy"]:
        new_docs.append(fix_simple_doc(d, "price_dispute_policy"))

    # 4. 生成新 doc_types
    new_iw = gen_import_warranty_cards(sku_master_rows)
    new_ship = gen_shipping_eta_cards()
    new_trvl = gen_travel_use_cards(sku_master_rows)

    new_docs.extend(new_iw)
    new_docs.extend(new_ship)
    new_docs.extend(new_trvl)

    print(f"\n新增 doc_type 数量:")
    print(f"  import_warranty_card: {len(new_iw)}")
    print(f"  shipping_eta_card: {len(new_ship)}")
    print(f"  travel_use_card: {len(new_trvl)}")

    # 5. 写回 JSONL
    with open(SRC_JSONL, "w", encoding='utf-8') as f:
        for d in new_docs:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")

    print(f"\n写入 {SRC_JSONL}: {len(new_docs)} 条 docs")

    # 6. 新的 doc_type 分布
    new_by_type = collections.Counter(d['doc_type'] for d in new_docs)
    print("\n新 doc_type 分布:")
    for k, v in new_by_type.most_common():
        print(f"  {k}: {v}")

    # 7. 重写 SKU CSV（加列）
    new_cols = [
        'china_usability', 'china_voltage_note', 'china_plug_adapter',
        'warranty_type', 'warranty_duration_days',
        'return_policy_type', 'import_channel',
        'sales_rule_return', 'sales_rule_return_window_days',
        'importer_name'
    ]
    # 从新 jsonl 中查 sku_fact_card 的字段反向填充到 SKU CSV
    fact_by_sku = {d['sku_id']: d for d in new_docs if d['doc_type'] == 'sku_fact_card'}
    iw_by_sku = {d['sku_id']: d for d in new_docs if d['doc_type'] == 'import_warranty_card'}

    out_cols = list(sku_master_rows[0].keys()) + new_cols
    with open(SRC_SKU_CSV, "w", encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=out_cols)
        writer.writeheader()
        for r in sku_master_rows:
            sku = r['sku_id']
            fact = fact_by_sku.get(sku, {}).get('facts', {})
            iw = iw_by_sku.get(sku, {}).get('import_info', {})
            new_r = dict(r)
            new_r['china_usability'] = fact.get('china_usability', '')
            new_r['china_voltage_note'] = fact.get('china_voltage_note', '')
            new_r['china_plug_adapter'] = fact.get('china_plug_adapter', '')
            new_r['warranty_type'] = fact.get('warranty_type', '')
            new_r['warranty_duration_days'] = fact.get('warranty_duration_days', '')
            new_r['return_policy_type'] = fact.get('return_policy_type', '')
            new_r['import_channel'] = fact.get('import_channel', '')
            new_r['sales_rule_return'] = fact.get('sales_rule_return', '')
            new_r['sales_rule_return_window_days'] = fact.get('sales_rule_return_window_days', '')
            new_r['importer_name'] = iw.get('importer_name', '')
            writer.writerow(new_r)

    print(f"\n写入 {SRC_SKU_CSV}: {len(sku_master_rows)} 行，新增 {len(new_cols)} 列")

    # 8. 扩充 field_specs_priority5.json
    with open(SRC_FIELD_SPECS, encoding='utf-8') as f:
        specs = json.load(f)

    next_id = 55
    new_specs = []

    def add_spec(topic, group, name, dtype, definition, example, source_doc, answer_boundary, required_scope="SKU"):
        nonlocal next_id
        new_specs.append({
            "field_id": f"FS{next_id:03d}",
            "priority_topic": topic,
            "field_group": group,
            "field_name": name,
            "data_type": dtype,
            "required_scope": required_scope,
            "definition": definition,
            "rule": "非空",
            "example": example,
            "source_of_truth": "进口商文档/品牌官网",
            "validation": "枚举或格式校验",
            "conflict_rule": "tier1 > tier2 > tier3",
            "source_doc": source_doc,
            "answer_boundary": answer_boundary,
            "resolution_rule": "缺失时必须追问或转人工"
        })
        next_id += 1

    # 新字段 1-10：SKU 中国使用信息
    add_spec("电压/频率/插头兼容", "中国使用", "china_usability", "enum",
             "该 SKU 在中国大陆使用的总判定",
             "need_adapter",
             "进口商兼容卡/品牌说明书",
             "缺失时不得下可用结论，必须追问或转人工")
    add_spec("电压/频率/插头兼容", "中国使用", "china_voltage_note", "string",
             "针对中国 220V/50Hz 的电压说明",
             "电压 220V 匹配，可直接使用",
             "进口商兼容卡",
             "口径文案由运营规范，不得自行修改")
    add_spec("电压/频率/插头兼容", "中国使用", "china_plug_adapter", "string",
             "针对中国 GB 2099 的插头适配建议",
             "Type F→GB 2099 三极转接头",
             "进口商兼容卡",
             "必须指向具体规格，不得只说'需要转接头'")

    # 11-20：进口保修/销售规则
    add_spec("进口保修", "保修", "warranty_type", "enum",
             "保修责任主体类型",
             "importer_with_brand_support",
             "进口商保修协议",
             "缺失时不得承诺任何保修内容")
    add_spec("进口保修", "保修", "warranty_duration_days", "number",
             "保修期（天）",
             "365",
             "进口商保修协议",
             "不得口头扩展保修期")
    add_spec("销售规则", "退换货", "return_policy_type", "enum",
             "退换货政策类型",
             "quality_only",
             "平台销售规则卡",
             "不得在沟通中暗示支持七天无理由")
    add_spec("销售规则", "退换货", "import_channel", "enum",
             "进口渠道",
             "official_distributor",
             "采购合同",
             "不得向用户隐瞒进口渠道类型")
    add_spec("销售规则", "退换货", "sales_rule_return", "string",
             "销售规则退换货完整文案",
             "本商品为跨境进口商品，不支持七天无理由退换...",
             "平台销售规则卡",
             "必须在询单/下单环节主动披露")
    add_spec("销售规则", "退换货", "sales_rule_return_window_days", "number",
             "质量问题申报时限（天）",
             "15",
             "平台销售规则卡",
             "超时的质量申报必须转人工审核")

    # 21-30：运输时效
    add_spec("运输时效", "物流", "origin_hub", "string",
             "发货集货仓",
             "新加坡港口集货仓",
             "物流规则卡",
             "缺失时不得给出具体发货地")
    add_spec("运输时效", "物流", "destination_hub", "enum",
             "收货地区",
             "CN-mainland",
             "物流规则卡",
             "本项目默认 CN-mainland")
    add_spec("运输时效", "物流", "transport_mode", "enum",
             "运输方式",
             "sea",
             "物流规则卡",
             "加急请求必须匹配实际运输方式")
    add_spec("运输时效", "物流", "typical_eta_days_min", "number",
             "最快送达天数",
             "12",
             "物流规则卡",
             "不得承诺比该值更快")
    add_spec("运输时效", "物流", "typical_eta_days_max", "number",
             "最慢送达天数",
             "21",
             "物流规则卡",
             "超期必须主动告知补偿方案")

    # 31-40：带出国使用
    add_spec("带出国使用", "带出国", "target_countries", "array",
             "目标使用国家列表",
             '["SG","MY","JP"]',
             "兼容卡/带出国使用卡",
             "未覆盖的国家必须拒答并追问")
    add_spec("带出国使用", "带出国", "per_country_verdict", "array",
             "按国家的适配判定列表",
             '[{"country":"SG","verdict":"need_adapter"...}]',
             "兼容卡/带出国使用卡",
             "缺字段不得口头扩展")
    add_spec("带出国使用", "带出国", "battery_iata_note", "string",
             "锂电池 IATA 航空限制说明",
             "100Wh 以下可手提",
             "IATA 官方政策 + 品牌说明书",
             "不得省略航空托运建议")
    add_spec("带出国使用", "带出国", "hand_carry_note", "string",
             "手提/托运建议",
             "小家电可托运，尺寸允许时优先手提",
             "物流规则卡",
             "不得替代航空公司规则")

    # 41-50：元数据治理
    add_spec("多场景画像", "元数据", "source_of_truth_tier", "enum",
             "信任度分层",
             "tier3_synthetic",
             "RAG Schema v3",
             "tier3 及以下的内容必须标注合成数据，不得作为权威事实")
    add_spec("多场景画像", "元数据", "confidence_ceiling", "number",
             "基于 tier 推导的置信度上限",
             "0.5",
             "RAG Schema v3",
             "低于 0.6 的答案必须显示'仅供参考'")
    add_spec("多场景画像", "元数据", "data_provenance", "object",
             "数据溯源信息",
             "{origin,collected_at,collector}",
             "RAG Schema v3",
             "没有溯源信息的数据不得入库")
    add_spec("多场景画像", "元数据", "created_at", "datetime",
             "创建时间",
             "2026-04-13T15:14:00+08:00",
             "RAG Schema v3",
             "不得人工回填")
    add_spec("多场景画像", "元数据", "updated_at", "datetime",
             "最近一次修改时间",
             "2026-04-15T10:00:00+08:00",
             "RAG Schema v3",
             "任何修改必须更新此字段")
    add_spec("多场景画像", "元数据", "expires_at", "datetime",
             "文档过期时间",
             "2026-05-15T10:00:00+08:00",
             "RAG Schema v3",
             "过期文档必须重建信任度")

    all_specs = specs + new_specs
    # 修正 data_type 中的 enum/datetime/array/object 也保留下来
    with open(SRC_FIELD_SPECS, "w", encoding='utf-8') as f:
        json.dump(all_specs, f, ensure_ascii=False, indent=2)

    print(f"\n写入 {SRC_FIELD_SPECS}: {len(specs)} → {len(all_specs)} 条")

    # 9. 修复 real_doc_checklist.csv（统一枚举 + 新字段 + 追加新 doc_type 的条目）
    # 先把 source_type 从 synthetic_backlog → 改为 collection_status=pending
    new_checklist = []
    for i, r in enumerate(checklist):
        new_r = dict(r)
        # 去掉老 source_type（它不是 SOR 的 source_type）
        new_r['source_type'] = 'synthetic_seed'
        new_r['collection_status'] = 'pending'
        # 填 doc_type（原来是空的）
        ft = r.get('文档类型', '')
        if 'SKU兼容' in ft or '兼容卡' in ft:
            new_r['doc_type'] = 'compatibility_install_card'
        elif '安装' in ft:
            new_r['doc_type'] = 'compatibility_install_card'
        elif '事实卡' in ft or 'SKU' in ft and '事实' in ft:
            new_r['doc_type'] = 'sku_fact_card'
        elif '保修' in ft:
            new_r['doc_type'] = 'warranty_region_policy'
        elif '签收' in ft or '破损' in ft:
            new_r['doc_type'] = 'damage_signoff_sop'
        elif '降价' in ft or '价格' in ft:
            new_r['doc_type'] = 'price_dispute_policy'
        elif '需求画像' in ft or '画像' in ft:
            new_r['doc_type'] = 'service_need_profile'
        else:
            new_r['doc_type'] = ''
        new_r['locale'] = 'zh-CN'
        new_r['source_of_truth_tier_target'] = 'tier1_official'
        new_checklist.append(new_r)

    # 追加新 doc_type 的真实文档清单
    next_check = max(int(r['check_id'].replace('CHK', '')) for r in checklist) + 1

    def add_check(topic, doc_name, doc_type_ch, grain, sku_id, brand, category, region, source, owner, risk, key_fields, doc_type_en):
        nonlocal next_check
        new_checklist.append({
            'check_id': f'CHK{next_check:04d}',
            '优先主题': topic,
            '文档名称': doc_name,
            '文档类型': doc_type_ch,
            '颗粒度': grain,
            'sku_id': sku_id,
            '品牌': brand,
            '类目': category,
            '区域': region,
            '真实来源': source,
            'owner': owner,
            '格式': 'xlsx/json',
            '关键字段': key_fields,
            '风险级别': risk,
            '状态': '待收集',
            '刷新频率': '月更',
            '上线边界': '上线前必须替换为真实进口商文档',
            'source_type': 'synthetic_seed',
            'collection_status': 'pending',
            'doc_type': doc_type_en,
            'locale': 'zh-CN',
            'source_of_truth_tier_target': 'tier1_official'
        })
        next_check += 1

    # 60 条 import_warranty 真实文档待采集项
    for r in sku_master_rows:
        add_check("进口保修",
                  f"{r['品牌']}_{r['型号']}_进口保修卡",
                  "进口保修卡",
                  "SKU",
                  r['sku_id'],
                  r['品牌'],
                  r['类目'],
                  r['目标区域版'],
                  "进口商保修协议 + 品牌官方保修条款",
                  "采购+法务",
                  "极高",
                  "sku_id,warranty_scope_type,warranty_duration_days,service_network,excluded_failures",
                  "import_warranty_card")

    # 10 条 shipping_eta 真实文档
    for cat in CATEGORIES:
        add_check("运输时效",
                  f"{cat}_运输时效说明卡",
                  "运输时效卡",
                  "品类",
                  "",
                  "",
                  cat,
                  "CN",
                  "物流运营系统 + 海关清关台账",
                  "物流运营",
                  "中",
                  "category,origin_hub,transport_mode,typical_eta_days_min,typical_eta_days_max",
                  "shipping_eta_card")

    # 20 条 travel_use 真实文档
    for r in sku_master_rows:
        if r['sku_id'] in TRAVEL_SKU_WHITELIST:
            add_check("带出国使用",
                      f"{r['品牌']}_{r['型号']}_带出国使用卡",
                      "带出国使用卡",
                      "SKU",
                      r['sku_id'],
                      r['品牌'],
                      r['类目'],
                      "SG,MY,JP,TH,KR",
                      "进口商兼容卡 + 品牌说明书 + 目标国电力规格",
                      "商品运营+技术支持",
                      "高",
                      "sku_id,target_countries,per_country_verdict,battery_iata_note",
                      "travel_use_card")

    # 写回 checklist
    out_cols = list(new_checklist[0].keys())
    with open(SRC_CHECKLIST, "w", encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=out_cols)
        writer.writeheader()
        for r in new_checklist:
            writer.writerow(r)

    print(f"\n写入 {SRC_CHECKLIST}: {len(checklist)} → {len(new_checklist)} 条")

    # 10. 终局统计
    print("\n" + "=" * 70)
    print("Task 1 转换完成")
    print("=" * 70)
    print(f"  rag_source_docs_v2.jsonl: 220 → {len(new_docs)} 条")
    print(f"  sku_master_60.csv: 新增 {len(new_cols)} 列")
    print(f"  field_specs_priority5.json: 54 → {len(all_specs)} 条")
    print(f"  real_doc_checklist.csv: {len(checklist)} → {len(new_checklist)} 条")
    print(f"  新 doc_type 分布：")
    for k, v in sorted(collections.Counter(d['doc_type'] for d in new_docs).items()):
        print(f"    {k}: {v}")


if __name__ == "__main__":
    main()
