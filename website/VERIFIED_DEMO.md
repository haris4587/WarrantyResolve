# Verified demo record

This file is completed only after the canonical Studio deployment and a live
Full Consensus smoke test. It intentionally contains no guessed addresses or
transaction hashes.

| Field | Verified value |
| --- | --- |
| GitHub repository | `https://github.com/haris4587/WarrantyResolve` |
| Evidence-bound v4 implementation commit | `TBD_AFTER_GITHUB_PUSH` |
| GenLayer network | `GenLayer Studio` / chain `61999` (`0xf22f`) |
| Contract address | `0x9997c4E5478893b90a38EB28dEcE57e409012e2f` |
| Deployment transaction | `0xeda17e3a1927b6272658b7c2cdff1a23e563f2b2024cd9d641bd344a69e17967` |
| Full Consensus deployment status | `FINALIZED` |
| Public website URL | `https://warrantyresolve-app.usmanshazz1st.chatgpt.site` |
| Website access | `Public` |
| Policy digest | `1ed362c5202b74b369ff375ac63a9f386257d6987cfef04fabe8f0d324a0f021` |

The live demo claim should use the raw GitHub URLs in
`demo/manifests/customer.txt` and `demo/manifests/seller.txt`, with the seller
wallet explicitly different from the customer wallet.

The deployment finalized in Normal (Full Consensus) mode, and the deployed
`get_totals` read returned a valid zeroed ledger.
