import hashlib
import json
from datetime import datetime, timezone


CONTRACT = "contracts/warranty_resolve.py"
WEI = 10**18

POLICY_URL = "https://demo.example/warranty-policy.txt"
RECEIPT_URL = "https://demo.example/purchase-receipt.txt"
CONDITION_URL = "https://demo.example/product-condition.txt"
MANUFACTURER_URL = "https://demo.example/manufacturer-info.txt"

POLICY = "The product has twelve months of coverage for manufacturing defects. Liquid, impact, misuse, and unauthorized modification are excluded. A covered defect may receive repair, replacement, or a full refund."
RECEIPT = "Order AA-ANC7-2026-0115. Product ANC-7. Serial ANC7-DEMO-4417. Purchase date 2026-01-15."
CONDITION = "The left channel failed during ordinary indoor use. No liquid indicator or impact fracture was found. The failure was reported inside the warranty period."
MANUFACTURER = "Aurora Audio confirms that an ANC-7 left-channel failure is a known manufacturing defect in a limited batch."


def timestamp(value):
    return int(datetime.fromisoformat(value).replace(tzinfo=timezone.utc).timestamp())


def address_hex(value):
    if hasattr(value, "as_hex"):
        return value.as_hex
    if isinstance(value, bytes):
        return "0x" + value.hex()
    return str(value)


def sha256(value):
    return hashlib.sha256(value.encode()).hexdigest()


def customer_manifest(receipt_hash=None):
    return "\n".join(
        [
            f"PURCHASE_RECEIPT|{RECEIPT_URL}|{receipt_hash or sha256(RECEIPT)}",
            f"PRODUCT_PHOTO|{CONDITION_URL}|{sha256(CONDITION)}",
        ]
    )


def seller_manifest():
    return f"MANUFACTURER_INFO|{MANUFACTURER_URL}|{sha256(MANUFACTURER)}"


def deploy_claim(direct_vm, direct_deploy, customer, seller):
    direct_vm.warp("2026-01-15T10:00:00Z")
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = customer
    direct_vm.value = 0
    contract.open_claim(
        "warranty-demo-001",
        "Aurora Audio ANC-7 headphones",
        address_hex(seller),
        timestamp("2026-01-15T09:00:00"),
        timestamp("2027-01-15T09:00:00"),
        10 * WEI,
        POLICY_URL,
        sha256(POLICY),
        "FULL_REFUND",
        timestamp("2026-01-17T10:00:00"),
        600,
        300,
    )
    return contract


def submit_evidence(direct_vm, contract, customer, seller, bad_receipt_hash=None):
    direct_vm.sender = customer
    direct_vm.value = 0
    contract.submit_customer_evidence(
        "warranty-demo-001",
        customer_manifest(bad_receipt_hash),
        "The left channel stopped working during normal use within the warranty period. The receipt and condition record identify the product and show no exclusion.",
    )
    direct_vm.sender = seller
    direct_vm.value = 2 * WEI
    contract.submit_seller_response(
        "warranty-demo-001",
        POLICY_URL,
        sha256(POLICY),
        seller_manifest(),
        "The seller accepts the locked warranty policy and supplies manufacturer context for the reported ANC-7 defect.",
        10000,
        True,
        True,
    )
    direct_vm.value = 0


def mock_evidence(direct_vm):
    direct_vm.mock_web(r"demo\.example/warranty-policy\.txt", {"method": "GET", "status": 200, "body": POLICY})
    direct_vm.mock_web(r"demo\.example/purchase-receipt\.txt", {"method": "GET", "status": 200, "body": RECEIPT})
    direct_vm.mock_web(r"demo\.example/product-condition\.txt", {"method": "GET", "status": 200, "body": CONDITION})
    direct_vm.mock_web(r"demo\.example/manufacturer-info\.txt", {"method": "GET", "status": 200, "body": MANUFACTURER})


def mock_judgment(direct_vm):
    direct_vm.mock_llm(
        r"neutral warranty adjudicator",
        json.dumps(
            {
                "decision": "FULL_REFUND",
                "refund_bps": 10000,
                "confidence": "HIGH",
                "score": 94,
                "summary": "The dated receipt, condition record, manufacturer note, and policy support a covered manufacturing defect within twelve months.",
                "policy_interpretation": "The policy covers manufacturing defects and permits a full refund when an authorized remedy cannot restore normal operation.",
                "customer_findings": ["Purchase and product identity are supported."],
                "seller_findings": ["Manufacturer context corroborates the defect."],
                "checks": {
                    "within_warranty": "PASS",
                    "purchase_evidence": "PASS",
                    "defect_coverage": "PASS",
                    "exclusions": "PASS",
                    "repair_shipping": "UNKNOWN",
                    "manufacturer_context": "PASS",
                },
                "required_action": "Release the full refund after the appeal window.",
                "citations": [POLICY_URL, RECEIPT_URL, CONDITION_URL, MANUFACTURER_URL],
            }
        ),
    )
    direct_vm.mock_llm(
        r"independent validator for a warranty adjudication result",
        json.dumps({"acceptable": True, "reason": "The proposed judgment is supported by the verified evidence."}),
    )


def test_open_claim_binds_parties_policy_and_deadlines(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_claim(direct_vm, direct_deploy, direct_alice, direct_bob)
    claim = json.loads(contract.get_claim("warranty-demo-001"))

    assert claim["status"] == "OPEN"
    assert claim["customer"].lower() == address_hex(direct_alice).lower()
    assert claim["seller"].lower() == address_hex(direct_bob).lower()
    assert claim["policy_sha256"] == sha256(POLICY)
    assert len(claim["terms_hash"]) == 64


def test_verified_full_refund_requires_consensus_and_is_recorded(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_claim(direct_vm, direct_deploy, direct_alice, direct_bob)
    submit_evidence(direct_vm, contract, direct_alice, direct_bob)
    mock_evidence(direct_vm)
    mock_judgment(direct_vm)

    direct_vm.sender = direct_alice
    contract.judge_claim("warranty-demo-001")
    claim = json.loads(contract.get_claim("warranty-demo-001"))
    judgment = json.loads(contract.get_latest_judgment("warranty-demo-001"))

    assert claim["status"] == "JUDGED"
    assert claim["current_decision"] == "FULL_REFUND"
    assert claim["current_refund_bps"] == 10000
    assert judgment["evidence_status"] == "VERIFIED"
    assert judgment["evidence_hashes"][-1]["sha256"] == sha256(MANUFACTURER)
    assert direct_vm.run_validator() is True


def test_changed_evidence_fails_closed_into_retry_state(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_claim(direct_vm, direct_deploy, direct_alice, direct_bob)
    submit_evidence(direct_vm, contract, direct_alice, direct_bob, bad_receipt_hash="0" * 64)
    mock_evidence(direct_vm)

    direct_vm.sender = direct_alice
    contract.judge_claim("warranty-demo-001")
    claim = json.loads(contract.get_claim("warranty-demo-001"))
    judgment = json.loads(contract.get_latest_judgment("warranty-demo-001"))

    assert claim["status"] == "EVIDENCE_REVIEW"
    assert claim["current_decision"] == "PENDING"
    assert judgment["decision"] == "INSUFFICIENT_EVIDENCE"
    assert judgment["evidence_status"] == "HASH_MISMATCH"
