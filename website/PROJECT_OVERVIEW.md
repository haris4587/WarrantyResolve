# WarrantyResolve website overview

WarrantyResolve is presented as a calm operations console rather than a chat
demo. The sidebar separates Overview, Open claim, Customer evidence, Seller
response, Adjudicate, Appeal & settle, and protocol notes. The header exposes
MetaMask connection and GenLayer Studio network state on every screen.

The overview metrics are read from `get_totals`. Recent claims are populated
from `get_recent_claim_ids`, and the detail panel is populated only after the
selected ID is read from finalized contract state. A zero address shows an
explicit handoff banner instead of fabricated sample activity.

The forms explain the evidence line format, policy digest boundary, payable GEN
escrow, Full Consensus wait, appeal window, and deterministic timeout. Every
write displays wallet-signature, submitted, consensus, finalized, or error
state and links a real transaction hash to the Studio explorer when available.
