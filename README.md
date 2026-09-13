# WarrantyResolve

WarrantyResolve is an evidence-bound warranty and refund adjudication dApp for
GenLayer. A customer locks the claim facts and policy commitment, the seller
accepts that exact policy and deposits GEN escrow, and GenLayer consensus
interprets the policy and evidence. The contract keeps the safety-critical
parts deterministic: party permissions, immutable terms, evidence digests,
appeal windows, escrow arithmetic, and timeout recovery.

## What is included

- `contracts/warranty_resolve.py` — the Intelligent Contract.
- `src/main.jsx` and `src/styles.css` — the React/Vite dApp with live MetaMask
  connection, Studio network switching, finalized reads, transaction lifecycle,
  customer/seller workflows, appeals, mutual resolution, and settlement.
- `demo/evidence/` — stable, hashable warranty evidence documents.
- `demo/manifests/` — manifests ready for the raw GitHub URLs after the first
  GitHub commit.
- `tests/direct/` — direct-VM tests for claim binding, verified judgments,
  fail-closed hash mismatches, and validator disagreement on both initial and
  appealed payout basis points.
- `docs/` and `website/` — architecture, security, deployment, interface, and
  submission records.

## Claim lifecycle

1. `open_claim` commits the customer, seller, product, dates, requested remedy,
   policy URL/digest, and bounded deadlines.
2. `submit_customer_evidence` commits a customer manifest. It must contain a
   purchase receipt and a product, serial, or repair record.
3. `submit_seller_response` requires the seller to repeat the exact policy
   commitment, submit seller evidence, and deposit non-zero GEN escrow.
4. `judge_claim` runs the policy/evidence analysis through GenLayer consensus.
   Every validator independently re-fetches the committed URLs, reassesses the
   complete evidence, and must reach the same decision and exact refund basis
   points. The result stores an evidence-set digest and decision-binding digest.
5. `appeal_claim` makes every validator re-fetch both the original evidence and
   counter-evidence and independently reassess the appeal. The appeal result,
   revised decision, and exact revised refund basis points are committed in a
   second binding digest. The parties can also propose and accept a mutual
   resolution.
6. `release_refund` pays the customer share and returns the remainder to the
   seller only after the appeal window, or returns the full escrow after a
   protected timeout.

The adjudicator may return `FULL_REFUND`, `PARTIAL_REFUND`, `REPLACEMENT`,
`REJECTED`, or `INSUFFICIENT_EVIDENCE`. Replacement, rejection, and insufficient
evidence never pay the customer automatically; the seller escrow is returned by
the deterministic settlement path.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

The verified Studionet address is already configured as the production fallback.
Set `VITE_WARRANTY_RESOLVE_ADDRESS` only when intentionally targeting another
verified deployment.

The production build is:

```bash
npm run build
```

## Wallet and network

The app requires MetaMask. It connects through the browser provider, requests
the `GenLayer Studio` network when needed, and refuses writes unless the wallet
is on chain `0xf22f` (decimal `61999`). The configured RPC is
`https://studio.genlayer.com/api` and the native token is GEN. Every write is
tracked through a finalized receipt and only a successful execution result
causes the dashboard to refresh as final state.

## Evidence manifest format

Each line is:

```text
TYPE|https://public.example/path.txt|lowercase-64-character-sha256
```

URLs must be public HTTPS paths without query strings or fragments. Evidence is
untrusted data, not instructions. The contract verifies the fetched bytes before
the leader prompt and again in the validator boundary. Missing, unavailable, or
changed evidence becomes a safe non-settlement result that can be retried while
the review window is open.

## Verification

```bash
python3 -m py_compile contracts/warranty_resolve.py
genvm-lint check contracts/warranty_resolve.py
pytest -q tests/direct
```

The direct tests mock the external web/LLM boundary and exercise the contract
state machine, including explicit rejection when a validator independently
chooses a different decision or payout. Studio validation remains the source of truth before deployment;
the final contract address, deployment transaction, and finalized consensus
transaction are recorded in `docs/DEPLOYMENT_RECORD.md`.

## Safety boundaries

- No positive payout can be derived from an unavailable or changed evidence page.
- Policy URL and policy digest are immutable and must be accepted by the seller.
- Only the designated parties can submit evidence, adjudicate, appeal, or agree.
- Seller funds are escrowed before adjudication and are settled exactly once.
- A bounded appeal window and a deterministic timeout prevent permanent locks.
- `release_refund` refuses settlement unless the current decision and basis
  points still match the latest judgment or appeal binding digest.
- The dApp never invents claim rows, judgment text, wallet addresses, or
  transaction hashes; all live records come from finalized chain reads.

WarrantyResolve is a technical demonstration, not legal advice. Production use
would require jurisdiction-specific policy review, identity/KYC decisions,
document privacy controls, and independent security review.

## Links

- Website: <https://warrantyresolve.ansaf1st33.chatgpt.site>
- Repository: <https://github.com/haris4587/WarrantyResolve>
- Hardened v3 contract: <https://explorer-studio.genlayer.com/address/0xa125e1e62b207BeD1bD17128634a152364680546>
- Full Consensus deployment: <https://explorer-studio.genlayer.com/tx/0xcd1101a704d2a9be8eebd8075c28d0e36fb551976b709437b48778ffa8505495>
- GenLayer docs: <https://docs.genlayer.com>
- GenLayer Studio: <https://studio.genlayer.com>
