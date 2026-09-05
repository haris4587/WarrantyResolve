import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import "./styles.css";

const CONTRACT_ADDRESS = import.meta.env.VITE_WARRANTY_RESOLVE_ADDRESS ||
  "0x8Cf44afcb38e342B11d18D2D2Bc91858BE0017CE";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CONTRACT_READY = CONTRACT_ADDRESS !== ZERO_ADDRESS;
const EXPLORER = "https://explorer-studio.genlayer.com";
const GITHUB = "https://github.com/haris4587/WarrantyResolve";
const NETWORK = {
  chainId: "0xf21f",
  chainName: "GenLayer Studio",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: [EXPLORER],
};

const EMPTY_TOTALS = {
  claims: 0,
  evidence_submissions: 0,
  seller_responses: 0,
  judgments: 0,
  appeals: 0,
  resolutions: 0,
  locked_wei: "0",
  customer_paid_wei: "0",
  seller_returned_wei: "0",
};

const SAMPLE_MANIFEST = [
  "PURCHASE_RECEIPT|https://example.com/receipt.txt|<64-char-sha256>",
  "PRODUCT_PHOTO|https://example.com/product-evidence.txt|<64-char-sha256>",
].join("\n");

function short(value = "") {
  return value ? `${value.slice(0, 7)}…${value.slice(-5)}` : "—";
}

function parseJson(value, fallback = null) {
  if (value && typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function dateLabel(unix) {
  if (!unix || Number(unix) <= 0) return "—";
  return new Date(Number(unix) * 1000).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateInput(daysFromNow = 2) {
  const date = new Date(Date.now() + daysFromNow * 86400000);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUnix(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.floor(time / 1000) : 0;
}

function toWei(value) {
  const text = String(value || "0").trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("Enter a valid GEN amount.");
  const [whole, fraction = ""] = text.split(".");
  const padded = `${fraction}000000000000000000`.slice(0, 18);
  return BigInt(whole) * 1000000000000000000n + BigInt(padded || "0");
}

function fromWei(value) {
  try {
    const amount = BigInt(String(value || "0"));
    const whole = amount / 1000000000000000000n;
    const fraction = String(amount % 1000000000000000000n).padStart(18, "0").replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : String(whole);
  } catch {
    return "0";
  }
}

function errorText(error) {
  return error?.shortMessage || error?.details || error?.message || String(error || "Unknown error");
}

function explorerTx(hash) {
  return hash ? `${EXPLORER}/tx/${hash}` : "#";
}

function phaseLabel(phase) {
  return {
    AWAITING_WALLET: "Awaiting wallet signature",
    SUBMITTED: "Submitted",
    DECIDED: "Consensus decision received",
    FINALIZED: "Finalized",
    ERROR: "Error",
  }[phase] || phase || "—";
}

function App() {
  const [wallet, setWallet] = useState("");
  const [chainId, setChainId] = useState("");
  const [client, setClient] = useState(null);
  const [claimIds, setClaimIds] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [view, setView] = useState("overview");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");

  const [openForm, setOpenForm] = useState({
    claimId: "warranty-demo-001",
    productName: "Noise-cancelling headphones",
    seller: "",
    purchaseDate: "2026-01-15T10:00",
    warrantyExpiry: "2027-01-15T10:00",
    purchaseAmount: "0.01",
    policyUrl: "",
    policyHash: "",
    remedy: "FULL_REFUND",
    deadline: dateInput(2),
    grace: "3600",
    appealWindow: "600",
  });
  const [customerForm, setCustomerForm] = useState({
    claimId: "warranty-demo-001",
    manifest: SAMPLE_MANIFEST,
    statement: "The product stopped working during normal use within the warranty period. The receipt, serial evidence, and product condition records are attached.",
  });
  const [sellerForm, setSellerForm] = useState({
    claimId: "warranty-demo-001",
    policyUrl: "",
    policyHash: "",
    manifest: "MANUFACTURER_INFO|https://example.com/manufacturer.txt|<64-char-sha256>",
    response: "The seller confirms the committed warranty policy and provides the manufacturer and repair records for neutral review.",
    offeredRefund: "100",
    replacement: true,
    acceptsPolicy: true,
    deposit: "0.01",
  });
  const [appealForm, setAppealForm] = useState({
    claimId: "warranty-demo-001",
    appealId: "appeal-demo-001",
    reason: "The original decision did not account for the attached policy excerpt and the dated repair record.",
    manifest: "POLICY_EXCERPT|https://example.com/policy-excerpt.txt|<64-char-sha256>",
  });
  const [resolutionForm, setResolutionForm] = useState({
    claimId: "warranty-demo-001",
    resolutionId: "resolution-demo-001",
    payoutBps: "5000",
    terms: "Both parties agree to a 50% customer payment and return of the remaining escrow to the seller.",
  });

  const onStudio = chainId === NETWORK.chainId;
  const canWrite = Boolean(wallet && client && onStudio && CONTRACT_READY);

  const claimIdsNewestFirst = useMemo(() => [...claimIds].reverse(), [claimIds]);

  function createWalletClient(address) {
    if (!window.ethereum || !address) return null;
    return createClient({ chain: studionet, account: address, provider: window.ethereum });
  }

  async function connectWallet() {
    setBusy("connect");
    setError("");
    try {
      if (!window.ethereum) throw new Error("Install MetaMask to continue.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts?.[0]) throw new Error("No wallet account was selected.");
      const address = accounts[0];
      const nextClient = createWalletClient(address);
      setWallet(address);
      setClient(nextClient);
      await nextClient.connect("studionet");
      const connectedChain = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(connectedChain);
      if (connectedChain !== NETWORK.chainId) {
        setNotice({ type: "warning", title: "Switch network", text: "MetaMask is connected, but GenLayer Studio is required for contract actions." });
      } else {
        setNotice({ type: "success", title: "Wallet connected", text: "Your MetaMask account is ready for GenLayer Studio." });
      }
    } catch (connectError) {
      setError(errorText(connectError));
    } finally {
      setBusy("");
    }
  }

  async function switchNetwork() {
    setBusy("switch-network");
    setError("");
    try {
      if (!window.ethereum) throw new Error("Install MetaMask to continue.");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: NETWORK.chainId }],
        });
      } catch (switchError) {
        if (switchError?.code !== 4902) throw switchError;
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [NETWORK] });
      }
      const nextChain = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(nextChain);
      if (wallet) {
        const nextClient = createWalletClient(wallet);
        await nextClient.connect("studionet");
        setClient(nextClient);
      }
      setNotice({ type: "success", title: "GenLayer Studio selected", text: "The dApp is now connected to the correct network." });
    } catch (switchError) {
      setError(errorText(switchError));
    } finally {
      setBusy("");
    }
  }

  async function readContract(functionName, args = []) {
    if (!client || !CONTRACT_READY) throw new Error("Connect MetaMask after the contract address is configured.");
    const call = { address: CONTRACT_ADDRESS, functionName, args };
    try {
      return await client.readContract({ ...call, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
    } catch {
      return client.readContract(call);
    }
  }

  async function loadClaim(id) {
    if (!id || !client || !CONTRACT_READY || !onStudio) return;
    setBusy(`read:${id}`);
    setError("");
    try {
      const [claimRaw, customerRaw, sellerRaw, judgmentRaw, appealRaw] = await Promise.all([
        readContract("get_claim", [id]),
        readContract("get_customer_evidence", [id]),
        readContract("get_seller_response", [id]),
        readContract("get_latest_judgment", [id]),
        readContract("get_latest_appeal", [id]),
      ]);
      const claim = parseJson(claimRaw);
      if (!claim?.claim_id) throw new Error("This claim could not be read from the latest finalized state.");
      const detail = {
        claim,
        customer: parseJson(customerRaw),
        seller: parseJson(sellerRaw),
        judgment: parseJson(judgmentRaw),
        appeal: parseJson(appealRaw),
      };
      setSelectedId(id);
      setSelected(detail);
      setCustomerForm((current) => ({ ...current, claimId: id }));
      setSellerForm((current) => ({ ...current, claimId: id, policyUrl: claim.policy_url, policyHash: claim.policy_sha256 }));
      setAppealForm((current) => ({ ...current, claimId: id }));
      setResolutionForm((current) => ({ ...current, claimId: id }));
    } catch (readError) {
      setError(errorText(readError));
    } finally {
      setBusy("");
    }
  }

  async function refresh() {
    if (!client || !CONTRACT_READY || !onStudio) return;
    setBusy("refresh");
    setError("");
    try {
      const [idsRaw, totalsRaw] = await Promise.all([
        readContract("get_recent_claim_ids"),
        readContract("get_totals"),
      ]);
      const ids = Array.isArray(idsRaw) ? idsRaw.map(String) : [];
      setClaimIds(ids);
      setTotals({ ...EMPTY_TOTALS, ...(parseJson(totalsRaw, {}) || {}) });
      const nextId = selectedId && ids.includes(selectedId) ? selectedId : ids.at(-1);
      if (nextId) await loadClaim(nextId);
    } catch (refreshError) {
      setError(errorText(refreshError));
    } finally {
      setBusy("");
    }
  }

  async function waitForLifecycle(hash, method) {
    setActivity({ method, hash, phase: "SUBMITTED" });
    if (typeof client.waitForDecision === "function") {
      try {
        const decision = await client.waitForDecision({ hash });
        setActivity((current) => ({ ...current, phase: "DECIDED", decision }));
      } catch {
        // Finalization below remains the source of truth if the decision wait is interrupted.
      }
    }
    const finalTransaction = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      interval: 3000,
      retries: 80,
      fullTransaction: false,
    });
    const successful = finalTransaction?.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN;
    setActivity((current) => ({ ...current, phase: successful ? "FINALIZED" : "ERROR", result: finalTransaction }));
    if (!successful) {
      throw new Error(`${method} did not finish successfully: ${finalTransaction?.statusName || "unknown status"}`);
    }
    return finalTransaction;
  }

  async function writeContract(functionName, args = [], value = 0n) {
    if (!canWrite) throw new Error("Connect MetaMask to GenLayer Studio before sending a transaction.");
    setBusy(functionName);
    setError("");
    setNotice(null);
    setActivity({ method: functionName, phase: "AWAITING_WALLET" });
    let hash;
    try {
      const call = { address: CONTRACT_ADDRESS, functionName, args, value };
      hash = await client.writeContract(call);
      await waitForLifecycle(hash, functionName);
      setNotice({ type: "success", title: `${functionName} finalized`, text: "The contract state was finalized. The dashboard is refreshing from chain state." });
      await refresh();
      return hash;
    } catch (writeError) {
      setActivity((current) => ({ ...current, hash, phase: "ERROR", error: errorText(writeError) }));
      setError(errorText(writeError));
      throw writeError;
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const handleAccounts = (accounts) => {
      const next = accounts?.[0] || "";
      setWallet(next);
      setClient(next ? createWalletClient(next) : null);
      if (!next) {
        setChainId("");
        setSelected(null);
        setClaimIds([]);
      }
    };
    const handleChain = (nextChain) => {
      setChainId(nextChain);
      if (wallet) setClient(createWalletClient(wallet));
    };
    window.ethereum.on?.("accountsChanged", handleAccounts);
    window.ethereum.on?.("chainChanged", handleChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccounts);
      window.ethereum.removeListener?.("chainChanged", handleChain);
    };
  }, [wallet]);

  useEffect(() => {
    if (client && onStudio && CONTRACT_READY) refresh();
  }, [client, onStudio]);

  async function handleOpenClaim(event) {
    event.preventDefault();
    try {
      await writeContract("open_claim", [
        openForm.claimId,
        openForm.productName,
        openForm.seller,
        toUnix(openForm.purchaseDate),
        toUnix(openForm.warrantyExpiry),
        toWei(openForm.purchaseAmount),
        openForm.policyUrl,
        openForm.policyHash,
        openForm.remedy,
        toUnix(openForm.deadline),
        Number(openForm.grace),
        Number(openForm.appealWindow),
      ]);
      setView("overview");
    } catch {
      // The error panel is already updated by writeContract.
    }
  }

  async function handleCustomerEvidence(event) {
    event.preventDefault();
    try {
      await writeContract("submit_customer_evidence", [customerForm.claimId, customerForm.manifest, customerForm.statement]);
      await loadClaim(customerForm.claimId);
    } catch {
      // The error panel is already updated by writeContract.
    }
  }

  async function handleSellerResponse(event) {
    event.preventDefault();
    try {
      await writeContract("submit_seller_response", [
        sellerForm.claimId,
        sellerForm.policyUrl,
        sellerForm.policyHash,
        sellerForm.manifest,
        sellerForm.response,
        Number(sellerForm.offeredRefund) * 100,
        sellerForm.replacement,
        sellerForm.acceptsPolicy,
      ], toWei(sellerForm.deposit));
      await loadClaim(sellerForm.claimId);
    } catch {
      // The error panel is already updated by writeContract.
    }
  }

  async function handleAppeal(event) {
    event.preventDefault();
    try {
      await writeContract("appeal_claim", [appealForm.claimId, appealForm.appealId, appealForm.reason, appealForm.manifest]);
      await loadClaim(appealForm.claimId);
    } catch {
      // The error panel is already updated by writeContract.
    }
  }

  async function handleResolution(event) {
    event.preventDefault();
    try {
      await writeContract("propose_mutual_resolution", [resolutionForm.claimId, resolutionForm.resolutionId, Number(resolutionForm.payoutBps) * 100, resolutionForm.terms]);
      await loadClaim(resolutionForm.claimId);
    } catch {
      // The error panel is already updated by writeContract.
    }
  }

  async function action(method, args = []) {
    try {
      await writeContract(method, args);
      if (selectedId) await loadClaim(selectedId);
    } catch {
      // The error panel is already updated by writeContract.
    }
  }

  const status = selected?.claim?.status || "NO LIVE CLAIM";

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} connected={Boolean(wallet)} />
      <div className="app-main">
        <Header wallet={wallet} chainId={chainId} onConnect={connectWallet} busy={busy === "connect"} onSwitch={switchNetwork} />
        {!CONTRACT_READY && <div className="deployment-banner"><span className="banner-icon">!</span><div><strong>Contract address is not configured yet.</strong><span>Build and deploy the canonical contract, then add its address to the site environment before enabling live reads and writes.</span></div><a href={GITHUB} target="_blank" rel="noreferrer">Open repository ↗</a></div>}
        {wallet && !onStudio && <div className="network-banner"><span className="banner-icon">↗</span><div><strong>Wrong network</strong><span>Switch MetaMask to GenLayer Studio to use WarrantyResolve.</span></div><button className="button button-light" onClick={switchNetwork} disabled={busy === "switch-network"}>{busy === "switch-network" ? "Switching…" : "Switch network"}</button></div>}
        {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
        {error && <div className="error-banner"><span className="banner-icon">×</span><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}
        <main className="content">
          {view === "overview" && <Overview claimIds={claimIdsNewestFirst} selectedId={selectedId} selected={selected} totals={totals} busy={busy} onRefresh={refresh} onSelect={(id) => { setSelectedId(id); loadClaim(id); }} onView={setView} canWrite={canWrite} onAction={action} />}
          {view === "open" && <WriteGate canWrite={canWrite} onConnect={connectWallet}><OpenClaimForm form={openForm} setForm={setOpenForm} onSubmit={handleOpenClaim} busy={busy === "open_claim"} /></WriteGate>}
          {view === "customer" && <WriteGate canWrite={canWrite} onConnect={connectWallet}><CustomerEvidenceForm form={customerForm} setForm={setCustomerForm} onSubmit={handleCustomerEvidence} busy={busy === "submit_customer_evidence"} claims={claimIdsNewestFirst} /></WriteGate>}
          {view === "seller" && <WriteGate canWrite={canWrite} onConnect={connectWallet}><SellerResponseForm form={sellerForm} setForm={setSellerForm} onSubmit={handleSellerResponse} busy={busy === "submit_seller_response"} claims={claimIdsNewestFirst} /></WriteGate>}
          {view === "adjudicate" && <WriteGate canWrite={canWrite} onConnect={connectWallet}><AdjudicationView selected={selected} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); loadClaim(id); }} claims={claimIdsNewestFirst} busy={busy} onAction={action} /></WriteGate>}
          {view === "appeal" && <WriteGate canWrite={canWrite} onConnect={connectWallet}><AppealSettlementView selected={selected} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); loadClaim(id); }} claims={claimIdsNewestFirst} appealForm={appealForm} setAppealForm={setAppealForm} resolutionForm={resolutionForm} setResolutionForm={setResolutionForm} onAppeal={handleAppeal} onResolution={handleResolution} busy={busy} onAction={action} /></WriteGate>}
          {view === "how" && <HowItWorks />}
        </main>
        <footer className="footer"><span>WarrantyResolve · public-evidence prototype · not legal advice</span><span><a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a> · <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer docs</a></span></footer>
      </div>
      {activity && <ActivityRail activity={activity} onDismiss={() => setActivity(null)} />}
    </div>
  );
}

function Sidebar({ view, setView, connected }) {
  const items = [
    ["overview", "Overview", "01"],
    ["open", "Open claim", "02"],
    ["customer", "Customer evidence", "03"],
    ["seller", "Seller response", "04"],
    ["adjudicate", "Adjudicate", "05"],
    ["appeal", "Appeal & settle", "06"],
    ["how", "How it works", "07"],
  ];
  return <aside className="sidebar">
    <div className="brand-lockup"><div className="brand-symbol">WR</div><div><strong>Warranty<span>Resolve</span></strong><small>GENLAYER CLAIMS DESK</small></div></div>
    <div className="side-rule" />
    <p className="side-label">Workspace</p>
    <nav className="side-nav">{items.map(([key, label, index]) => <button key={key} className={view === key ? "side-item active" : "side-item"} onClick={() => setView(key)}><span className="side-index">{index}</span><span>{label}</span></button>)}</nav>
    <div className="side-bottom"><div className={connected ? "connection-state live" : "connection-state"}><span className="status-dot" /><div><strong>{connected ? "Wallet connected" : "Wallet required"}</strong><small>{connected ? "Signer detected" : "Connect before writing"}</small></div></div><p>Interpret messy policy language. Preserve evidence. Settle only after consensus.</p></div>
  </aside>;
}

function Header({ wallet, chainId, onConnect, busy, onSwitch }) {
  const onStudio = chainId === NETWORK.chainId;
  return <header className="header"><div className="mobile-title"><span>WarrantyResolve</span><small>Claims desk</small></div><div className="header-spacer" /><div className={onStudio ? "network-pill online" : "network-pill"}><span className="status-dot" /><span>{onStudio ? "GenLayer Studio" : wallet ? "Network unverified" : "Disconnected"}</span>{wallet && !onStudio && <button onClick={onSwitch}>Switch</button>}</div><button className="wallet-button" onClick={onConnect} disabled={busy}>{busy ? "Connecting…" : wallet ? <><span className="wallet-dot" />{short(wallet)}</> : "Connect MetaMask"}</button></header>;
}

function Notice({ type = "success", title, text, onClose }) {
  return <div className={`notice-banner ${type}`}><span className="notice-mark">{type === "success" ? "✓" : "!"}</span><div><strong>{title}</strong><span>{text}</span></div>{onClose && <button onClick={onClose}>×</button>}</div>;
}

function WriteGate({ canWrite, onConnect, children }) {
  if (canWrite) return children;
  return <section className="gate panel"><div className="gate-orbit"><span>WR</span></div><p className="kicker">SIGNER REQUIRED</p><h1>Connect MetaMask to unlock this workflow.</h1><p>WarrantyResolve never accepts a typed wallet address as proof of identity. Connect the browser wallet, switch to GenLayer Studio, and sign each state-changing action yourself.</p><button className="button button-primary" onClick={onConnect}>Connect MetaMask</button></section>;
}

function Overview({ claimIds, selectedId, selected, totals, busy, onRefresh, onSelect, onView, canWrite, onAction }) {
  return <div className="page-stack"><section className="hero-block"><div><p className="kicker">EVIDENCE-LED WARRANTY ADJUDICATION</p><h1>Refund decisions that can show their work.</h1><p className="hero-copy">WarrantyResolve turns warranty policies, purchase records, repair history, shipping evidence, and manufacturer context into a challengeable GenLayer decision.</p><div className="hero-actions"><button className="button button-primary" onClick={() => onView("open")} disabled={!canWrite}>Open a claim</button><button className="button button-quiet" onClick={() => onView("how")}>Read the protocol</button></div></div><div className="hero-stamp"><span>LIVE LEDGER</span><strong>{canWrite ? "CONNECTED" : "WAITING"}</strong><small>Reads are finalized state only.</small></div></section>
    <section className="metrics-grid"><Metric label="Claims" value={totals.claims} detail="created on chain" icon="C" /><Metric label="Judgments" value={totals.judgments} detail="consensus attempts" icon="J" /><Metric label="Appeals" value={totals.appeals} detail="bounded rechecks" icon="A" /><Metric label="Locked GEN" value={fromWei(totals.locked_wei)} detail="seller escrow" icon="G" /></section>
    <div className="section-heading"><div><p className="kicker">CLAIM EXPLORER</p><h2>Recent claims</h2></div><div className="heading-actions"><span className="live-caption"><span className="status-dot" />{busy === "refresh" ? "Refreshing" : "Finalized state"}</span><button className="icon-button" onClick={onRefresh} disabled={!canWrite || busy === "refresh"} aria-label="Refresh claims">↻</button></div></div>
    <div className="explorer-grid"><section className="claim-list panel">{claimIds.length === 0 ? <EmptyState title={canWrite ? "No claims yet" : "Connect and deploy to explore"} copy={canWrite ? "Open the first claim from the sidebar. The list will be populated from the contract, not from placeholder data." : "Connect MetaMask and configure the deployed contract address to load live claims."} actionLabel={canWrite ? "Open a claim" : null} onAction={canWrite ? () => onView("open") : null} /> : claimIds.map((id) => <ClaimRow key={id} id={id} claim={selectedId === id ? selected?.claim : null} selected={selectedId === id} onClick={() => onSelect(id)} />)}</section><section className="detail-panel panel">{selected?.claim ? <ClaimDetail selected={selected} onAction={onAction} onView={onView} /> : <EmptyState title="Select a claim" copy="Open a live on-chain record to inspect its parties, policy commitment, evidence state, consensus verdict, and settlement readiness." />}</section></div>
  </div>;
}

function Metric({ label, value, detail, icon }) { return <div className="metric-card"><span className="metric-icon">{icon}</span><div><span className="metric-label">{label}</span><strong>{value ?? "0"}</strong><small>{detail}</small></div></div>; }

function ClaimRow({ id, claim, selected, onClick }) {
  return <button className={selected ? "claim-row selected" : "claim-row"} onClick={onClick}><span className="claim-row-index">{String(id).slice(-3)}</span><span className="claim-row-copy"><strong>{claim?.product_name || id}</strong><small>{claim ? `${claim.customer ? short(claim.customer) : "Customer"} · ${claim.status}` : "Load finalized record"}</small></span><StatusBadge value={claim?.status || "ON CHAIN"} /><span className="claim-chevron">→</span></button>;
}

function ClaimDetail({ selected, onAction, onView }) {
  const { claim, customer, seller, judgment, appeal } = selected;
  const evidenceReady = Boolean(customer && seller);
  return <div className="claim-detail"><div className="detail-top"><div><p className="kicker">CLAIM RECORD</p><h3>{claim.product_name}</h3><code>{claim.claim_id}</code></div><StatusBadge value={claim.status} /></div><div className="detail-grid"><DetailCell label="Customer" value={short(claim.customer)} mono /><DetailCell label="Seller" value={short(claim.seller)} mono /><DetailCell label="Requested remedy" value={claim.requested_remedy} /><DetailCell label="Current decision" value={claim.current_decision || "PENDING"} accent /></div><div className="commitment"><div><span className="detail-label">Locked policy</span><a href={claim.policy_url} target="_blank" rel="noreferrer">{claim.policy_url}</a></div><code>{short(claim.policy_sha256)}</code></div><div className="protocol-timeline"><TimelineItem done label="Claim opened" detail={`Terms ${short(claim.terms_hash)}`} /><TimelineItem done={Boolean(customer)} label="Customer evidence" detail={customer ? `${customer.evidence_version} submission · ${short(customer.evidence_digest)}` : "Waiting for receipt and product evidence"} /><TimelineItem done={Boolean(seller)} label="Seller response + escrow" detail={seller ? `${fromWei(claim.escrow_deposited_wei)} GEN committed` : "Waiting for policy acceptance and escrow"} /><TimelineItem done={Boolean(judgment)} label="GenLayer judgment" detail={judgment ? `${judgment.decision} · score ${judgment.score}` : "Consensus not requested"} /><TimelineItem done={Boolean(appeal)} label="Appeal window" detail={appeal ? `${appeal.appeal_result} · window reopened` : claim.finalize_after_unix ? `Closes ${dateLabel(claim.finalize_after_unix)}` : "Not open"} /></div><div className="detail-actions">{!customer && <button className="button button-light" onClick={() => onView("customer")}>Add customer evidence</button>}{!seller && <button className="button button-light" onClick={() => onView("seller")}>Add seller response</button>}{evidenceReady && !judgment && <button className="button button-primary" onClick={() => onAction("judge_claim", [claim.claim_id])}>Request judgment</button>}{claim.status === "EVIDENCE_REVIEW" && <button className="button button-light" onClick={() => onAction("retry_judgment", [claim.claim_id])}>Retry evidence</button>}{(claim.status === "JUDGED" || claim.status === "APPEALED") && <button className="button button-primary" onClick={() => onView("appeal")}>Appeal or settle</button>}{claim.status === "OPEN" && <button className="button button-quiet" onClick={() => onAction("cancel_claim", [claim.claim_id])}>Cancel claim</button>}</div><p className="detail-footnote">All verdict text, evidence hashes, deadlines, and payout arithmetic are read from the contract. A connected interface cannot override the escrow rules.</p></div>;
}

function DetailCell({ label, value, mono, accent }) { return <div className="detail-cell"><span>{label}</span><strong className={`${mono ? "mono" : ""} ${accent ? "accent" : ""}`}>{value || "—"}</strong></div>; }
function TimelineItem({ done, label, detail }) { return <div className={done ? "timeline-item done" : "timeline-item"}><span className="timeline-line" /><span className="timeline-marker">{done ? "✓" : "·"}</span><div><strong>{label}</strong><small>{detail}</small></div></div>; }
function StatusBadge({ value }) { const tone = String(value || "").toLowerCase().replaceAll("_", "-"); return <span className={`status-badge ${tone}`}>{value || "—"}</span>; }

function OpenClaimForm({ form, setForm, onSubmit, busy }) {
  return <FormShell kicker="CUSTOMER FLOW" title="Open a warranty claim" copy="Commit the immutable claim facts before either party supplies evidence. The seller must later accept the exact policy commitment and fund the refund escrow."><form onSubmit={onSubmit}><div className="form-grid"><Field label="Claim ID" hint="8–80 letters, numbers, hyphens"><input required value={form.claimId} onChange={(e) => setForm({ ...form, claimId: e.target.value })} /></Field><Field label="Product or order name"><input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></Field><Field label="Seller wallet" hint="The response signer must match"><input required className="mono-input" placeholder="0x…" value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} /></Field><Field label="Requested remedy"><select value={form.remedy} onChange={(e) => setForm({ ...form, remedy: e.target.value })}><option value="FULL_REFUND">Full refund</option><option value="PARTIAL_REFUND">Partial refund</option><option value="REPLACEMENT">Replacement</option></select></Field><Field label="Purchase date"><input required type="datetime-local" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field><Field label="Warranty expiry"><input required type="datetime-local" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} /></Field><Field label="Purchase amount (GEN reference)"><input required inputMode="decimal" value={form.purchaseAmount} onChange={(e) => setForm({ ...form, purchaseAmount: e.target.value })} /><small>Used by the adjudicator as a locked fact; the seller escrows the actual GEN refund amount separately.</small></Field><Field label="Claim deadline"><input required type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field><Field wide label="Warranty policy URL" hint="Must be HTTPS, public, stable, and without query parameters"><input required type="url" placeholder="https://…" value={form.policyUrl} onChange={(e) => setForm({ ...form, policyUrl: e.target.value })} /></Field><Field wide label="Warranty policy SHA-256" hint="Hash the exact bytes at the policy URL before submission"><input required className="mono-input" placeholder="64 lowercase hexadecimal characters" value={form.policyHash} onChange={(e) => setForm({ ...form, policyHash: e.target.value })} /></Field><Field label="Review grace (seconds)"><input required type="number" min="600" value={form.grace} onChange={(e) => setForm({ ...form, grace: e.target.value })} /></Field><Field label="Appeal window (seconds)"><input required type="number" min="300" value={form.appealWindow} onChange={(e) => setForm({ ...form, appealWindow: e.target.value })} /></Field></div><FormNote>Once opened, the policy URL, policy digest, parties, dates, and deadlines are immutable. A seller response cannot silently change the governing policy.</FormNote><SubmitButton busy={busy} label="Open claim on chain" /></form></FormShell>;
}

function CustomerEvidenceForm({ form, setForm, onSubmit, busy, claims }) {
  return <FormShell kicker="CUSTOMER EVIDENCE" title="Submit proof of purchase and condition" copy="Every evidence line binds a URL to the exact SHA-256 bytes you expect validators to inspect. Use one line per artifact: TYPE|HTTPS_URL|SHA256."><form onSubmit={onSubmit}><ClaimPicker claims={claims} value={form.claimId} onChange={(value) => setForm({ ...form, claimId: value })} /><Field wide label="Evidence manifest" hint="Required types: PURCHASE_RECEIPT plus PRODUCT_PHOTO, SERIAL_PROOF, or REPAIR_RECORD"><textarea required className="manifest-input" value={form.manifest} onChange={(e) => setForm({ ...form, manifest: e.target.value })} /></Field><Field wide label="Customer statement" hint="Describe the failure, use, timing, and requested remedy without embedding instructions for the adjudicator"><textarea required value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} /></Field><FormNote>Evidence pages are treated as untrusted data. The contract re-fetches them inside consensus and refuses a positive payout if a committed digest changes.</FormNote><SubmitButton busy={busy} label="Commit customer evidence" /></form></FormShell>;
}

function SellerResponseForm({ form, setForm, onSubmit, busy, claims }) {
  return <FormShell kicker="SELLER RESPONSE" title="Accept the policy and fund the remedy" copy="The seller must repeat the exact policy URL and digest, provide supporting records, and deposit GEN escrow before the claim can be adjudicated."><form onSubmit={onSubmit}><ClaimPicker claims={claims} value={form.claimId} onChange={(value) => setForm({ ...form, claimId: value })} /><div className="form-grid"><Field label="Policy URL"><input required type="url" placeholder="https://…" value={form.policyUrl} onChange={(e) => setForm({ ...form, policyUrl: e.target.value })} /></Field><Field label="Policy SHA-256"><input required className="mono-input" placeholder="64 lowercase hexadecimal characters" value={form.policyHash} onChange={(e) => setForm({ ...form, policyHash: e.target.value })} /></Field><Field wide label="Seller evidence manifest" hint="Use MANUFACTURER_INFO, POLICY_REFERENCE, REPAIR_RECORD, SHIPPING_RECORD, SERIAL_RECORD, or OTHER"><textarea required className="manifest-input" value={form.manifest} onChange={(e) => setForm({ ...form, manifest: e.target.value })} /></Field><Field wide label="Seller response"><textarea required value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} /></Field><Field label="Offered refund (%)"><input required type="number" min="0" max="100" value={form.offeredRefund} onChange={(e) => setForm({ ...form, offeredRefund: e.target.value })} /></Field><Field label="GEN escrow deposit"><input required inputMode="decimal" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /><small>Payable value is separate from the GenLayer transaction fee.</small></Field></div><div className="toggle-row"><label><input type="checkbox" checked={form.acceptsPolicy} onChange={(e) => setForm({ ...form, acceptsPolicy: e.target.checked })} /><span>Seller accepts the exact locked policy</span></label><label><input type="checkbox" checked={form.replacement} onChange={(e) => setForm({ ...form, replacement: e.target.checked })} /><span>Replacement is available</span></label></div><FormNote>The deposited GEN stays locked until consensus finality, an appeal window, a mutual resolution, or the deterministic timeout path.</FormNote><SubmitButton busy={busy} label="Commit response and escrow" /></form></FormShell>;
}

function AdjudicationView({ selected, selectedId, onSelect, claims, busy, onAction }) {
  const judgment = selected?.judgment;
  return <div className="page-stack"><PageIntro kicker="GENLAYER CONSENSUS" title="Adjudicate a claim" copy="The leader gathers the committed policy and evidence. Validators independently re-fetch the same bytes, compare the evidence digest, and review the proposed decision before state is written." /><div className="split-layout"><section className="panel form-panel"><ClaimPicker claims={claims} value={selectedId} onChange={onSelect} /><div className="adjudication-checks"><CheckRow done={Boolean(selected?.customer)} label="Customer evidence committed" /><CheckRow done={Boolean(selected?.seller)} label="Seller response and escrow committed" /><CheckRow done={Boolean(selected?.claim?.status === "READY_FOR_JUDGMENT" || selected?.claim?.status === "EVIDENCE_REVIEW")} label="Claim ready for consensus" /></div><button className="button button-primary full-width" disabled={!selectedId || !selected?.customer || !selected?.seller || ["JUDGED", "APPEALED", "SETTLED"].includes(selected?.claim?.status) || Boolean(busy)} onClick={() => onAction("judge_claim", [selectedId])}>{busy === "judge_claim" ? "Consensus in progress…" : "Request GenLayer judgment"}</button>{selected?.claim?.status === "EVIDENCE_REVIEW" && <button className="button button-light full-width" disabled={Boolean(busy)} onClick={() => onAction("retry_judgment", [selectedId])}>Retry unavailable evidence</button>}<p className="small-note">Full Consensus may take time. Once a transaction hash exists, track that transaction instead of sending a duplicate request.</p></section><section className="panel judgment-panel">{judgment ? <JudgmentCard judgment={judgment} claim={selected.claim} /> : <EmptyState title="No finalized judgment" copy="Select a claim with both parties’ evidence, then request a live consensus transaction." />}</section></div></div>;
}

function AppealSettlementView({ selected, selectedId, onSelect, claims, appealForm, setAppealForm, resolutionForm, setResolutionForm, onAppeal, onResolution, busy, onAction }) {
  const claim = selected?.claim;
  return <div className="page-stack"><PageIntro kicker="CHALLENGEABLE SETTLEMENT" title="Appeal, resolve, or release" copy="A judgment is never an instant payout. The bounded appeal window gives both parties a final chance to submit counter-evidence, while mutual resolution and deadline refunds prevent permanent locks." /><ClaimPicker claims={claims} value={selectedId} onChange={onSelect} /><div className="split-layout"><section className="panel form-panel"><div className="subsection-heading"><p className="kicker">APPEAL</p><h3>Submit counter-evidence</h3></div><form onSubmit={onAppeal}><Field wide label="Appeal ID"><input required value={appealForm.appealId} onChange={(e) => setAppealForm({ ...appealForm, appealId: e.target.value })} /></Field><Field wide label="Reason"><textarea required value={appealForm.reason} onChange={(e) => setAppealForm({ ...appealForm, reason: e.target.value })} /></Field><Field wide label="Counter-evidence manifest"><textarea required className="manifest-input" value={appealForm.manifest} onChange={(e) => setAppealForm({ ...appealForm, manifest: e.target.value })} /></Field><SubmitButton busy={busy === "appeal_claim"} label="Submit appeal" disabled={!claim || !["JUDGED", "APPEALED"].includes(claim.status)} /></form><div className="subsection-divider" /><div className="subsection-heading"><p className="kicker">MUTUAL RESOLUTION</p><h3>Agree before the window closes</h3></div><form onSubmit={onResolution}><Field wide label="Resolution ID"><input required value={resolutionForm.resolutionId} onChange={(e) => setResolutionForm({ ...resolutionForm, resolutionId: e.target.value })} /></Field><Field label="Customer payout (%)"><input required type="number" min="0" max="100" value={resolutionForm.payoutBps} onChange={(e) => setResolutionForm({ ...resolutionForm, payoutBps: e.target.value })} /></Field><Field wide label="Resolution terms"><textarea required value={resolutionForm.terms} onChange={(e) => setResolutionForm({ ...resolutionForm, terms: e.target.value })} /></Field><SubmitButton busy={busy === "propose_mutual_resolution"} label="Propose mutual resolution" disabled={!claim || claim.status === "SETTLED"} /></form></section><section className="panel settlement-panel"><SettlementCard selected={selected} busy={busy === "release_refund"} onAction={onAction} /></section></div></div>;
}

function JudgmentCard({ judgment, claim }) {
  const checks = judgment.checks || {};
  return <div><div className="judgment-head"><div><p className="kicker">FINALIZED JUDGMENT RECORD</p><h3>{judgment.decision?.replaceAll("_", " ")}</h3><span>{judgment.confidence} confidence · score {judgment.score}/100</span></div><StatusBadge value={judgment.decision} /></div><p className="judgment-summary">{judgment.summary || "No summary recorded."}</p><div className="decision-meter"><span style={{ width: `${Math.min(100, Math.max(0, Number(judgment.score || 0)))}%` }} /></div><div className="checks-grid">{Object.entries(checks).map(([key, value]) => <div key={key} className={`check-cell ${String(value).toLowerCase()}`}><span>{key.replaceAll("_", " ")}</span><strong>{value}</strong></div>)}</div><div className="evidence-record"><div><span className="detail-label">Verified evidence</span><strong>{judgment.evidence_hashes?.length || 0} byte-bound artifacts</strong></div><code>{judgment.evidence_status}</code></div><div className="judgment-meta"><span>Refund basis: <strong>{Number(judgment.refund_bps || 0) / 100}%</strong></span><span>Claim finalizes: <strong>{dateLabel(claim.finalize_after_unix)}</strong></span></div>{judgment.required_action && <div className="required-action"><span>Required next action</span><p>{judgment.required_action}</p></div>}{judgment.citations?.length > 0 && <div className="citation-list"><span className="detail-label">Citations from committed evidence</span>{judgment.citations.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{url}</a>)}</div>}</div>;
}

function SettlementCard({ selected, busy, onAction }) {
  const claim = selected?.claim;
  const appeal = selected?.appeal;
  if (!claim) return <EmptyState title="Select a claim" copy="Settlement controls appear only for a live on-chain claim." />;
  const closable = ["JUDGED", "APPEALED"].includes(claim.status) && claim.finalize_after_unix;
  return <div><div className="subsection-heading"><p className="kicker">ESCROW STATE</p><h3>{fromWei(claim.escrow_remaining_wei)} GEN held</h3></div><div className="settlement-state"><div className="settlement-row"><span>Current decision</span><strong>{claim.current_decision}</strong></div><div className="settlement-row"><span>Customer share</span><strong>{Number(claim.current_refund_bps || 0) / 100}%</strong></div><div className="settlement-row"><span>Window</span><strong>{claim.finalize_after_unix ? dateLabel(claim.finalize_after_unix) : "Timeout protected"}</strong></div><div className="settlement-row"><span>Action</span><strong>{claim.settlement_action}</strong></div></div>{appeal && <div className="appeal-record"><span>Latest appeal: {appeal.appeal_result}</span><small>{appeal.summary}</small></div>}<button className="button button-primary full-width" disabled={!closable || busy} onClick={() => onAction("release_refund", [claim.claim_id])}>{busy ? "Waiting for finality…" : "Release finalized outcome"}</button><p className="small-note">The contract calculates and transfers the customer share and seller remainder. The site never marks a claim paid before this write finalizes and escrow reads zero.</p></div>;
}

function HowItWorks() {
  const steps = [["01", "Open immutable claim", "Customer commits parties, purchase dates, warranty expiry, policy URL, policy digest, and bounded deadlines."], ["02", "Bind both evidence sets", "Customer submits receipt and condition records. Seller accepts the exact policy and funds GEN escrow with its response."], ["03", "Run GenLayer judgment", "Validators independently fetch the same bytes, verify hashes, and interpret human-written warranty language."], ["04", "Challenge or agree", "Either party can appeal with counter-evidence, or both can accept a mutual resolution before final settlement."], ["05", "Release or timeout", "Full, partial, replacement, rejection, and insufficient-evidence outcomes have deterministic payout and timeout paths."]];
  return <div className="page-stack"><PageIntro kicker="PROTOCOL NOTES" title="Designed for messy warranty reality" copy="WarrantyResolve uses GenLayer where normal escrow contracts are weakest: interpreting policy language and web evidence without losing deterministic custody of deadlines, hashes, or funds." /><div className="how-grid">{steps.map(([number, title, copy]) => <article className="how-card" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><section className="principles panel"><div><p className="kicker">SAFETY PRINCIPLES</p><h2>Evidence first. Settlement last.</h2></div><div className="principle-list"><Principle title="No mutable URLs" copy="Policy and evidence are bound to SHA-256 digests before consensus." /><Principle title="No hidden signer" copy="Every state change requires the connected MetaMask wallet and a real transaction." /><Principle title="No silent lock" copy="Appeals, mutual resolution, and timeout refund paths keep escrow recoverable." /><Principle title="No invented verdict" copy="Unavailable or changed evidence becomes a safe non-settlement state." /></div></section></div>;
}

function Principle({ title, copy }) { return <div className="principle"><span>✓</span><div><strong>{title}</strong><p>{copy}</p></div></div>; }
function PageIntro({ kicker, title, copy }) { return <section className="page-intro"><p className="kicker">{kicker}</p><h1>{title}</h1><p>{copy}</p></section>; }
function FormShell({ kicker, title, copy, children }) { return <div className="page-stack"><PageIntro kicker={kicker} title={title} copy={copy} /><section className="panel form-panel">{children}</section></div>; }
function Field({ label, hint, wide, children }) { return <label className={wide ? "field wide" : "field"}><span>{label}</span>{hint && <small>{hint}</small>}{children}</label>; }
function FormNote({ children }) { return <div className="form-note"><span>i</span><p>{children}</p></div>; }
function SubmitButton({ busy, label, disabled }) { return <button className="button button-primary" type="submit" disabled={busy || disabled}>{busy ? "Waiting for finality…" : label}</button>; }
function ClaimPicker({ claims, value, onChange }) { return <label className="field picker-field"><span>Live claim</span>{claims.length ? <select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select a finalized claim record</option>{claims.map((id) => <option value={id} key={id}>{id}</option>)}</select> : <input required value={value} onChange={(e) => onChange(e.target.value)} placeholder="Enter claim ID" />}</label>; }
function CheckRow({ done, label }) { return <div className={done ? "check-row done" : "check-row"}><span>{done ? "✓" : "·"}</span><strong>{label}</strong></div>; }
function EmptyState({ title, copy, actionLabel, onAction }) { return <div className="empty-state"><span className="empty-glyph">◎</span><h3>{title}</h3><p>{copy}</p>{actionLabel && <button className="button button-light" onClick={onAction}>{actionLabel}</button>}</div>; }
function ActivityRail({ activity, onDismiss }) { return <div className="activity-rail"><div className="activity-top"><div><p className="kicker">TRANSACTION LIFECYCLE</p><strong>{activity.method}</strong></div><button onClick={onDismiss}>×</button></div><div className="activity-phase"><span className={activity.phase === "ERROR" ? "phase-icon error" : activity.phase === "FINALIZED" ? "phase-icon done" : "phase-icon"}>{activity.phase === "FINALIZED" ? "✓" : activity.phase === "ERROR" ? "×" : "…"}</span><div><strong>{phaseLabel(activity.phase)}</strong><small>{activity.phase === "AWAITING_WALLET" ? "Approve the transaction in MetaMask." : activity.phase === "SUBMITTED" ? "Consensus is processing the submitted hash." : activity.phase === "DECIDED" ? "A materialized decision was received; waiting for durable finality." : activity.phase === "FINALIZED" ? "The chain accepted the execution result." : activity.error || "Inspect the transaction before retrying."}</small></div></div>{activity.hash && <a className="hash-link" href={explorerTx(activity.hash)} target="_blank" rel="noreferrer"><span>Transaction hash</span><code>{short(activity.hash)}</code><span>↗</span></a>}{activity.phase === "ERROR" && <p className="activity-warning">A hash already exists. Track it before sending another state-changing action.</p>}</div>; }

createRoot(document.getElementById("root")).render(<App />);
