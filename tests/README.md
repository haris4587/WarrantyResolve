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

The tests intentionally include a changed-evidence case. A digest mismatch must
produce `EVIDENCE_REVIEW` and `INSUFFICIENT_EVIDENCE`, never a positive payout.
