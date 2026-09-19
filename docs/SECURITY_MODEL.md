# Security model

## Assets

- Seller GEN escrow.
- The immutable policy and evidence commitments that determine an adjudication.
- The integrity of the final judgment and appeal records.
- User control of MetaMask signatures and network selection.

## Invariants

1. Seller escrow must exactly equal the immutable purchase amount.
2. Escrow is decremented to zero in the same state transition that records
   settlement, so `release_refund` cannot be executed twice.
3. Seller response requires the exact policy URL and SHA-256 digest committed by
   the customer and a payable value equal to `purchase_amount_wei`.
4. Evidence fetch failure or digest mismatch produces an
   `INSUFFICIENT_EVIDENCE` record and never a positive payout.
5. A positive judgment must use one of the bounded decisions and basis-point
   values; all percentages bind `LOCKED_PURCHASE_AMOUNT_ESCROW` and the exact
   `payout_basis_wei`; citations are restricted to verified URLs.
6. Only the customer or seller can advance claim review, appeal, or propose a
   mutual resolution; the other party must accept a mutual resolution.
7. Finalization and timeout windows are evaluated from on-chain time, not from
   browser clocks.
8. Every validator performs its own full judgment and appeal assessment. An
   exact mismatch in decision, refund basis points, appeal result, revised
   decision, revised basis points, or monetary basis rejects consensus.
9. Settlement revalidates that the current outcome equals the latest chained
   judgment or appeal binding digest before calculating escrow transfers.
10. Evidence types are limited to evaluable UTF-8 text records. Binary image
    bytes, invalid UTF-8, and NUL-containing payloads fail closed.

## Prompt-injection defense

Policy pages, receipts, repair records, manufacturer pages, and counter-evidence
are explicitly labeled untrusted in every prompt. The adjudicator is instructed
to ignore commands and output-format requests inside evidence. The validator
re-runs the full assessment from independently fetched bytes. It accepts only
when the leader and validator agree on the outcome and exact payout fields and
when all cited URLs belong to the independently verified fetched set.

## Known limits

- Public evidence URLs reveal whatever the source publishes. Real deployments
  should use a privacy-preserving evidence layer or redacted public snapshots.
- Binary images and PDFs are deliberately rejected. Production visual-document
  support would require a separate deterministic multimodal evidence design.
- A smart contract cannot decide legal rights outside the policy and evidence
  committed to it. Jurisdiction, consumer law, identity, and chargeback rules
  require separate product and legal controls.
- The site is a client application. Contract invariants, not UI validation, are
  the security boundary.
