# Verified demo record

This file is completed only after the canonical Studio deployment and a live
Full Consensus smoke test. It intentionally contains no guessed addresses or
transaction hashes.

| Field | Verified value |
| --- | --- |
| GitHub repository | `https://github.com/haris4587/WarrantyResolve` |
| GitHub commit with evidence pack | `9883daea523b98862dd683a9444eda22a524996f` |
| GenLayer network | `GenLayer Studio` / chain `61999` (`0xf21f`) |
| Contract address | `0x8Cf44afcb38e342B11d18D2D2Bc91858BE0017CE` |
| Deployment transaction | `0x1a6fb67d7aa34ace21f9821b5d8db2c599595d375c7e3f0e704bfdb76774e387` |
| First finalized Full Consensus transaction | `0x1a6fb67d7aa34ace21f9821b5d8db2c599595d375c7e3f0e704bfdb76774e387` |
| Website URL | `https://warrantyresolve.ansaf1st33.chatgpt.site` |
| Website access | `Public` |
| Policy digest | `1ed362c5202b74b369ff375ac63a9f386257d6987cfef04fabe8f0d324a0f021` |

The live demo claim should use the raw GitHub URLs in
`demo/manifests/customer.txt` and `demo/manifests/seller.txt`, with the seller
wallet explicitly different from the customer wallet.

The deployment finalized in Normal (Full Consensus) mode, and the deployed
`get_totals` read returned a valid zeroed ledger.
