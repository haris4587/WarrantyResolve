# WarrantyResolve deployment record

This record is the handoff source of truth. Values marked `TBD` are not claims
about a live deployment and must be replaced only with values copied from Studio,
the finalized transaction receipt, the GitHub API, and the hosting deployment.

| Field | Value |
| --- | --- |
| Repository | `https://github.com/haris4587/WarrantyResolve` |
| Canonical GitHub commit | `9883daea523b98862dd683a9444eda22a524996f` |
| GenLayer network | `GenLayer Studio` / `61999` / `0xf21f` |
| Contract address | `0x8Cf44afcb38e342B11d18D2D2Bc91858BE0017CE` |
| Deployment transaction hash | `0x1a6fb67d7aa34ace21f9821b5d8db2c599595d375c7e3f0e704bfdb76774e387` |
| First finalized Full Consensus hash | `0x1a6fb67d7aa34ace21f9821b5d8db2c599595d375c7e3f0e704bfdb76774e387` |
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
and finalized states. A finalized `get_totals` read returned a valid empty
ledger with zero claims, evidence submissions, judgments, appeals, resolutions,
and escrowed wei.

- Contract explorer: <https://explorer-studio.genlayer.com/address/0x8Cf44afcb38e342B11d18D2D2Bc91858BE0017CE>
- Deployment transaction: <https://explorer-studio.genlayer.com/tx/0x1a6fb67d7aa34ace21f9821b5d8db2c599595d375c7e3f0e704bfdb76774e387>
