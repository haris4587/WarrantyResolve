# Contract interface

## Writes

| Method | Purpose | Value |
| --- | --- | --- |
| `open_claim` | Commit claim facts and policy digest | `0` |
| `submit_customer_evidence` | Commit customer manifest and statement | `0` |
| `submit_seller_response` | Accept policy, submit seller evidence, fund escrow | `> 0` GEN |
| `judge_claim` | Run a consensus judgment | `0` |
| `retry_judgment` | Retry a safe evidence-review state | `0` |
| `appeal_claim` | Submit bounded counter-evidence appeal | `0` |
| `propose_mutual_resolution` | Propose a payout split | `0` |
| `accept_mutual_resolution` | Counterparty accepts and settles | `0` |
| `release_refund` | Settle after finalization or timeout | `0` |
| `cancel_claim` | Cancel before seller escrow | `0` |

## Reads

`get_claim`, `get_customer_evidence`, `get_seller_response`,
`get_judgment`, `get_latest_judgment`, `get_appeal`, `get_latest_appeal`,
`get_resolution`, `get_recent_claim_ids`, `get_recent_appeal_ids`,
`get_recent_resolution_ids`, and `get_totals` are the public read surface.

All JSON-returning methods return a string so the contract’s stored record is
stable and the frontend can render a schema-compatible view without guessing.
