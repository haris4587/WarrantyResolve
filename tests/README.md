# WarrantyResolve tests

The direct tests use the GenLayer testing suite’s `direct_vm`, `direct_deploy`,
`direct_alice`, and `direct_bob` fixtures. They mock only external web and LLM
responses; the claim storage, permission checks, escrow accounting, evidence
hash comparison, and consensus validator still execute in the contract test VM.

Run from the repository root after installing the project’s pinned GenLayer
development dependencies:

```bash
genvm-lint check contracts/warranty_resolve.py
pytest -q tests/direct
```

The nine tests cover changed evidence, independent validator disagreement,
appeal revisions, exact purchase-amount escrow, rejection of `PRODUCT_PHOTO`,
and counterparty acceptance of a mutual resolution. A digest or format failure
must never create a positive payout.
