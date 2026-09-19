# WarrantyResolve architecture

## Trust boundary

The contract treats party-supplied text and fetched web pages as untrusted. It
stores a compact JSON record for each claim rather than attempting to store
large documents on chain. Each evidence entry contains a type, canonical HTTPS
URL, and SHA-256 digest. During consensus every validator independently fetches
the bytes, recomputes the digest, performs its own evidence assessment, and
compares its decision, exact refund basis points, and locked monetary basis with
the leader output. Accepted evidence must decode as strict UTF-8 and contain no
NUL bytes; genuine binary `PRODUCT_PHOTO` input is intentionally unsupported.

```text
MetaMask wallet
      |
      v
React/Vite dApp -- finalized reads --> WarrantyResolve storage
      |                                      |
      | write + GEN escrow                  | deterministic settlement
      v                                      v
GenLayer consensus <-- verified policy/evidence --> public HTTPS sources
```

## Storage model

`claims`, `customer_evidence`, `seller_responses`, `judgments`, `appeals`, and
`resolutions` are JSON strings keyed by stable IDs. `escrows` stores the current
GEN balance per claim. Append-only ID arrays support recent-activity reads, and
aggregate counters expose a lightweight dashboard without scanning storage.

## Consensus boundary

`_analyze_claim` is the only place where the natural-language policy decision is
made. It receives locked claim facts, the seller’s exact policy commitment,
statements, and the verified evidence body. The prompt explicitly treats all
evidence as data, rejects embedded instructions, and constrains the response to
a small decision schema. `_validate_leader_judgment` independently fetches the
same manifests and calls `_analyze_claim` again. Consensus accepts only an exact
match on evidence status, evidence-set digest, decision, refund basis points,
`LOCKED_PURCHASE_AMOUNT_ESCROW`, `payout_basis_wei`, and the decision-binding
digest before `_store_judgment` can advance the claim.

Appeals use a separate consensus boundary that re-fetches the original evidence
as well as the counter-evidence. Each validator independently reassesses the
appeal and must exactly match the appeal result, revised decision, and revised
refund basis points. The appeal binding chains the prior outcome digest,
original judgment digest, appeal reason, counter-evidence manifest, complete
fetched evidence set, appeal outcome, and revised payout. Appeals remain bounded
to two and reopen only the finalization window, not the escrow arithmetic.

`submit_seller_response` accepts only a payable value exactly equal to the
claim's immutable `purchase_amount_wei`. Judgment, appeal, and mutual-resolution
basis points therefore always refer to one economically consistent base.

## Settlement state machine

| State | Meaning | Next safe action |
| --- | --- | --- |
| `OPEN` | Claim facts committed | Customer evidence, seller response, or customer cancellation |
| `CUSTOMER_EVIDENCE` / `SELLER_RESPONDED` | One evidence side is committed | Complete the other side |
| `READY_FOR_JUDGMENT` | Both sides and escrow are present | `judge_claim` |
| `EVIDENCE_REVIEW` | A fetch failed or digest changed | `retry_judgment` after cooldown, or timeout |
| `JUDGED` | A finalized consensus result exists | Appeal, mutual resolution, or final settlement |
| `APPEALED` | Appeal result recorded and window reopened | Appeal again within limit or settle |
| `SETTLED` | Escrow paid/returned exactly once | Terminal |
| `CANCELLED` | Customer canceled before seller escrow | Terminal |

The timeout path is available after `claim_deadline + review_grace_seconds` for
any pre-settlement review state. It returns seller escrow and prevents a claim
from remaining locked because an evidence host is unavailable.

## Frontend reads and writes

The dApp reads `LATEST_FINAL` state where supported and falls back to the SDK’s
normal read for compatibility. Writes use `genlayer-js` with the browser wallet,
wait for `FINALIZED`, check `txExecutionResultName === FINISHED_WITH_RETURN`, and
then read the finalized claim again. No optimistic payout or fake activity row
is displayed.

The app reads `open_resolution_id`, loads `get_resolution`, and exposes
`accept_mutual_resolution` to the non-proposing connected party. Acceptance is
a distinct signed transaction, not an implied UI state.
