# Deployment runbook

This runbook is intentionally explicit so the published website, GitHub source,
and Studio contract all point to one canonical revision.

## 1. Validate locally

```bash
python3 -m py_compile contracts/warranty_resolve.py
genvm-lint check contracts/warranty_resolve.py
pytest -q tests/direct
npm run build
```

The contract must still begin with its `py-genlayer` dependency header. Do not
deploy a modified contract after the first successful Studio deployment.

## 2. Deploy in GenLayer Studio

1. Open <https://studio.genlayer.com> and connect MetaMask to GenLayer Studio.
2. Paste the exact contents of `contracts/warranty_resolve.py` into the
   Intelligent Contract editor.
3. Run Studio’s compile/validation step and resolve every error before deploy.
4. Deploy through Studio and confirm the MetaMask transaction.
5. Record the deployed contract address and deployment transaction hash in
   `docs/DEPLOYMENT_RECORD.md`.

The contract constructor has no arguments. Deployment itself does not create a
claim; it only creates the WarrantyResolve ledger.

## 3. Run a Full Consensus smoke test

Use two wallet accounts so the customer and seller permissions are tested
honestly. The second account must be the seller address used in `open_claim`.

1. Commit a claim with the raw GitHub policy URL and its exact SHA-256 digest.
2. As the customer, submit `demo/manifests/customer.txt` and the customer
   statement.
3. Switch MetaMask to the seller account. Submit the exact policy URL/digest,
   `demo/manifests/seller.txt`, a seller response, and a non-zero GEN value.
4. As either party, call `judge_claim` with the claim ID using Full Consensus.
5. Wait for the finalized transaction and verify `get_claim` is `JUDGED`, with a
   non-empty `get_latest_judgment` and verified evidence hashes.
6. Optionally submit `demo/manifests/appeal.txt` as an appeal, wait for its
   finalized consensus result, and confirm the bounded finalization window.

If a transaction hash is returned, track that hash. Do not blindly resubmit the
same write while it is pending.

## 4. Configure and build the site

Set the verified address in `.env`:

```bash
VITE_WARRANTY_RESOLVE_ADDRESS=0x<verified-40-hex-address>
```

Then run `npm run build`. The site shows a deployment handoff banner and blocks
live reads/writes whenever the address is missing or zero.

## 5. Publish and record

Publish the built site only after the address is set and the canonical source
revision is committed. Record:

- GitHub commit SHA;
- contract address;
- deployment transaction hash;
- first finalized Full Consensus transaction hash;
- verified website URL;
- whether the deployment is private or public;
- the exact evidence commit used by the demo manifests.

These values belong in `docs/DEPLOYMENT_RECORD.md`,
`website/WEBSITE_DATA.json`, and `website/VERIFIED_DEMO.md`.
