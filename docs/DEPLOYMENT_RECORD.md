# WarrantyResolve deployment record

This record is the handoff source of truth. Values marked `TBD` are not claims
about a live deployment and must be replaced only with values copied from Studio,
the finalized transaction receipt, the GitHub API, and the hosting deployment.

| Field | Value |
| --- | --- |
| Repository | `https://github.com/haris4587/WarrantyResolve` |
| Evidence-bound v4 implementation commit | `7cbe168441ad798b8c64eeba3f0d6d157678f154` |
| GenLayer network | `GenLayer Studio` / `61999` / `0xf22f` |
| Contract address | `0x9997c4E5478893b90a38EB28dEcE57e409012e2f` |
| Deployment transaction hash | `0xeda17e3a1927b6272658b7c2cdff1a23e563f2b2024cd9d641bd344a69e17967` |
| Full Consensus deployment status | `FINALIZED` |
| First demo claim ID | `Not created during the deployment smoke test` |
| Public website URL | `https://warrantyresolve-app.usmanshazz1st.chatgpt.site` |
| Website access mode | `Public` |

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

- Contract explorer: <https://explorer-studio.genlayer.com/address/0x9997c4E5478893b90a38EB28dEcE57e409012e2f>
- Deployment transaction: <https://explorer-studio.genlayer.com/tx/0xeda17e3a1927b6272658b7c2cdff1a23e563f2b2024cd9d641bd344a69e17967>
