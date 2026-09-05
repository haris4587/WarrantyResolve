# Security model

## Assets

- Seller GEN escrow.
- The immutable policy and evidence commitments that determine an adjudication.
- The integrity of the final judgment and appeal records.
- User control of MetaMask signatures and network selection.

## Invariants

1. A claim cannot pay from zero escrow.
2. Escrow is decremented to zero in the same state transition that records
   settlement, so `release_refund` cannot be executed twice.
3. Seller response requires the exact policy URL and SHA-256 digest committed by
   the customer and requires a non-zero payable value.
4. Evidence fetch failure or digest mismatch produces an
   `INSUFFICIENT_EVIDENCE` record and never a positive payout.
5. A positive judgment must use one of the bounded decisions and basis-point
   values; citations are restricted to URLs that were verified in that run.
6. Only the customer or seller can advance claim review, appeal, or propose a
   mutual resolution; the other party must accept a mutual resolution.
7. Finalization and timeout windows are evaluated from on-chain time, not from
   browser clocks.

## Prompt-injection defense

Policy pages, receipts, repair records, manufacturer pages, and counter-evidence
are explicitly labeled untrusted in every prompt. The adjudicator is instructed
to ignore commands and output-format requests inside evidence. The validator
compares the result to the locked facts and evidence hash list instead of
trusting the leader’s text alone.

## Known limits

- Public evidence URLs reveal whatever the source publishes. Real deployments
  should use a privacy-preserving evidence layer or redacted public snapshots.
- The demo uses plain-text evidence for deterministic hashing; production image,
  PDF, shipping, and repair integrations need stable byte snapshots.
- A smart contract cannot decide legal rights outside the policy and evidence
  committed to it. Jurisdiction, consumer law, identity, and chargeback rules
  require separate product and legal controls.
- The site is a client application. Contract invariants, not UI validation, are
  the security boundary.
