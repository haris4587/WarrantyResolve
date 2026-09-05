# WarrantyResolve architecture

## Trust boundary

The contract treats party-supplied text and fetched web pages as untrusted. It
stores a compact JSON record for each claim rather than attempting to store
large documents on chain. Each evidence entry contains a type, canonical HTTPS
URL, and SHA-256 digest. During consensus the leader and validator independently
fetch the bytes, recompute the digest, and carry the verified hash list into the
judgment record.

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
same manifests and checks decision bounds, citations, hashes, and an independent
validator response before `_store_judgment` can advance the claim.

Appeals use a separate consensus boundary over counter-evidence. The appeal
result is either `UPHELD` or `OVERTURNED`; it is still bounded to two appeals and
reopens only the finalization window, not the escrow arithmetic.

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
