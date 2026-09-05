# WarrantyResolve deployment record

This record is the handoff source of truth. Values marked `TBD` are not claims
about a live deployment and must be replaced only with values copied from Studio,
the finalized transaction receipt, the GitHub API, and the hosting deployment.

| Field | Value |
| --- | --- |
| Repository | `https://github.com/haris4587/WarrantyResolve` |
| Canonical GitHub commit | `TBD` |
| GenLayer network | `GenLayer Studio` / `61999` / `0xf21f` |
| Contract address | `TBD` |
| Deployment transaction hash | `TBD` |
| First finalized Full Consensus hash | `TBD` |
| First demo claim ID | `TBD` |
| Website URL | `TBD` |
| Website access mode | `TBD` |
| Published source commit | `TBD` |

## Evidence commit

The demo evidence files are intended to be served from the exact GitHub commit
used by the claim. The main-branch URLs in `demo/manifests/` are convenient for a
demo after the repository commit is final; for an immutable production claim,
replace `main` with the recorded commit SHA before hashing and opening the claim.

## Smoke-test notes

Pending the live Studio run. Record the MetaMask account roles, method names,
finalized status, execution result, and explorer links here without recording
private keys or seed phrases.
