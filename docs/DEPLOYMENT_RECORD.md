# WarrantyResolve deployment record

This record is the handoff source of truth. Values marked `TBD` are not claims
about a live deployment and must be replaced only with values copied from Studio,
the finalized transaction receipt, the GitHub API, and the hosting deployment.

| Field | Value |
| --- | --- |
| Repository | `https://github.com/haris4587/WarrantyResolve` |
| Canonical GitHub commit | `9883daea523b98862dd683a9444eda22a524996f` |
| GenLayer network | `GenLayer Studio` / `61999` / `0xf22f` |
| Contract address | `0xa125e1e62b207BeD1bD17128634a152364680546` |
| Deployment transaction hash | `0xcd1101a704d2a9be8eebd8075c28d0e36fb551976b709437b48778ffa8505495` |
| Full Consensus deployment status | `FINALIZED` |
| First demo claim ID | `Not created during the deployment smoke test` |
| Website URL | `https://warrantyresolve.ansaf1st33.chatgpt.site` |
| Website access mode | `Public` |
| Published source commit | `ec6ae4fedbcce61e569a218c43d14720963291a2` |

## Evidence commit

The demo evidence files are intended to be served from the exact GitHub commit
used by the claim. The main-branch URLs in `demo/manifests/` are convenient for a
demo after the repository commit is final; for an immutable production claim,
replace `main` with the recorded commit SHA before hashing and opening the claim.

## Studio verification

The canonical contract was deployed with `Normal (Full Consensus)` selected.
The deployment progressed through proposing, committing, revealing, accepted,
and finalized states. A `get_totals` read against `Finalized` state returned a valid empty
ledger with zero claims, evidence submissions, judgments, appeals, resolutions,
and escrowed wei.

- Contract explorer: <https://explorer-studio.genlayer.com/address/0xa125e1e62b207BeD1bD17128634a152364680546>
- Deployment transaction: <https://explorer-studio.genlayer.com/tx/0xcd1101a704d2a9be8eebd8075c28d0e36fb551976b709437b48778ffa8505495>
