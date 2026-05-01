"use client";
import { useState, useEffect, useCallback } from "react";
import AppNav from "../components/AppNav";

const KITE_EXPLORER = "https://testnet.kitescan.ai";
const ALL_CATS = ["data", "finance", "ai", "identity", "compute", "storage"];
const CAT_COLORS: Record<string, string> = {
  data: "#00E5C9", finance: "#7B5EFF", ai: "#A78BFA",
  identity: "#FFB300", compute: "#FB923C", storage: "#34D399",
};

interface Policy { perCall: string; perDay: string; perMonth: string; categories: string[]; updatedAt?: number; }
interface Balance { address: string; kite: string; usdt: string; chainId: string; explorerUrl: string; }

interface PassportConnection {
  email?: string;
  agentId?: string;
  walletAddress?: string;
  usdcBalance?: string;
  status: "disconnected" | "pending_signup" | "pending_login" | "connected" | "error";
  lastSyncedAt?: number;
  error?: string;
}

interface PassportSession {
  id: string;
  requestId?: string;
  agentId: string;
  taskSummary: string;
  maxAmountPerTx: string;
  maxTotalAmount: string;
  totalSpent: string;
  asset: string;
  paymentApproach: string;
  ttlSeconds: number;
  expiresAt: number;
  status: "pending_approval" | "active" | "exhausted" | "expired" | "revoked" | "rejected";
  callCount: number;
  createdAt: number;
  approvedAt?: number;
}

interface PassportStatus {
  connection: PassportConnection;
  simulate: boolean;
  activeSessionId: string | null;
  sessions: PassportSession[];
  sessionCount: number;
}

export default function AgentPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [liveStats, setLiveStats] = useState<{ totalRuns?: number; totalAttestations?: number; totalPayments?: number } | null>(null);
  const [policy, setPolicy] = useState<Policy>({ perCall: "50", perDay: "500", perMonth: "5000", categories: ALL_CATS });
  const [draft, setDraft] = useState<Policy>(policy);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [balLoading, setBalLoading] = useState(true);

  // Passport state
  const [passport, setPassport] = useState<PassportStatus | null>(null);
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupId, setSignupId] = useState<string | null>(null);
  const [exchangeToken, setExchangeToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    taskSummary: "Nexum agent — discover and pay for x402 services on Kite",
    maxAmountPerTx: "2",
    maxTotalAmount: "10",
    ttl: "24h",
  });
  const [creatingSession, setCreatingSession] = useState(false);

  // ── data fetching ────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/balance");
      if (res.ok) setBalance(await res.json());
    } catch {} finally { setBalLoading(false); }
  }, []);

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/policy");
      if (res.ok) {
        const p = await res.json();
        setPolicy(p);
        setDraft(p);
      }
    } catch {}
  }, []);

  const fetchPassport = useCallback(async () => {
    try {
      const res = await fetch("/api/passport/status");
      if (res.ok) {
        const p: PassportStatus = await res.json();
        setPassport(p);
      }
    } catch (err) {
      setPassportError(err instanceof Error ? err.message : String(err));
    } finally {
      setPassportLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchPolicy();
    fetchPassport();
    const loadStats = () =>
      fetch("/api/runs/stats").then(r => r.ok ? r.json() : null).then(d => d && setLiveStats(d)).catch(() => {});
    loadStats();
    const t = setInterval(fetchBalance, 30000);
    const ts = setInterval(loadStats, 15000);
    const tp = setInterval(fetchPassport, 5000); // refresh sessions live
    return () => { clearInterval(t); clearInterval(ts); clearInterval(tp); };
  }, [fetchBalance, fetchPolicy, fetchPassport]);

  // ── policy ───────────────────────────────────────────────────────────────

  const savePolicy = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/agent/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (res.ok) {
        setPolicy(data.policy);
        setDraft(data.policy);
        setEditing(false);
        setSaveMsg("Policy saved");
        setTimeout(() => setSaveMsg(null), 2000);
      } else {
        setSaveMsg(data.error ?? "Save failed");
        setTimeout(() => setSaveMsg(null), 3000);
      }
    } catch {
      setSaveMsg("Network error");
      setTimeout(() => setSaveMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleCat = (cat: string) => {
    setDraft(d => ({
      ...d,
      categories: d.categories.includes(cat)
        ? d.categories.filter(c => c !== cat)
        : [...d.categories, cat],
    }));
  };

  // ── passport flows ───────────────────────────────────────────────────────

  const startSignup = async () => {
    if (!signupEmail) return;
    setConnecting(true);
    setPassportError(null);
    try {
      const res = await fetch("/api/passport/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "signup_init", email: signupEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "signup failed");
      setSignupId(data.signupId);
      // In simulate mode, auto-verify since there's no real email loop.
      if (data.simulate) {
        await fetch("/api/passport/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "signup_verify", signupId: data.signupId, exchangeToken: "sim" }),
        });
        setSignupId(null);
        await fetchPassport();
      }
    } catch (err) {
      setPassportError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  };

  const verifySignup = async () => {
    if (!signupId || !exchangeToken) return;
    setConnecting(true);
    setPassportError(null);
    try {
      const res = await fetch("/api/passport/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "signup_verify", signupId, exchangeToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "verification failed");
      setSignupId(null);
      setExchangeToken("");
      setSignupEmail("");
      await fetchPassport();
    } catch (err) {
      setPassportError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setConnecting(true);
    try {
      await fetch("/api/passport/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "disconnect" }),
      });
      await fetchPassport();
    } finally {
      setConnecting(false);
    }
  };

  const createSession = async () => {
    setCreatingSession(true);
    setPassportError(null);
    try {
      const res = await fetch("/api/passport/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskSummary: sessionForm.taskSummary,
          maxAmountPerTx: sessionForm.maxAmountPerTx,
          maxTotalAmount: sessionForm.maxTotalAmount,
          ttl: sessionForm.ttl,
          assets: ["USDC"],
          paymentApproach: "x402_http",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "session create failed");
      setShowCreateSession(false);
      await fetchPassport();
    } catch (err) {
      setPassportError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingSession(false);
    }
  };

  const revokeSession = async (id: string) => {
    if (!confirm("Revoke this session? Active payments will be blocked immediately.")) return;
    try {
      await fetch(`/api/passport/sessions/${id}`, { method: "DELETE" });
      await fetchPassport();
    } catch {}
  };

  // ── styles ───────────────────────────────────────────────────────────────

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "'IBM Plex Mono',monospace" } as React.CSSProperties,
    input: { background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "9px 12px", color: "#F8FAFC", fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
    label: { fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: "#4A7090", letterSpacing: ".08em", display: "block", marginBottom: 6 } as React.CSSProperties,
    btnPrimary: { fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: "#0F172A", background: "#00E5C9", padding: "9px 18px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 } as React.CSSProperties,
    btnSecondary: { fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: "#00E5C9", border: "1px solid rgba(0,229,201,0.35)", padding: "8px 16px", borderRadius: 6, background: "rgba(0,229,201,0.06)", cursor: "pointer" } as React.CSSProperties,
    btnGhost: { fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: "#4A7090", border: "1px solid #1E3A5F", padding: "8px 14px", borderRadius: 6, background: "transparent", cursor: "pointer" } as React.CSSProperties,
  };

  const addr = balance?.address ?? "0x4f2a8C3d1E9B5F7A2C4E6D8B0F3A5C7E9B1D3F5A";
  const conn = passport?.connection;
  const isPassportConnected = conn?.status === "connected";
  const activeSession = passport?.sessions.find(s => s.id === passport.activeSessionId);

  const sessionStatusColor = (s: PassportSession["status"]): string => {
    switch (s) {
      case "active": return "#00E5C9";
      case "pending_approval": return "#FFB300";
      case "exhausted": return "#FB923C";
      case "expired": case "revoked": case "rejected": return "#FF4D6A";
      default: return "#4A7090";
    }
  };

  const fmtAmount = (s: string) => s.replace(/\s+/, " ");

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 8 }}>// AGENT IDENTITY</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#F8FAFC" }}>Agent Wallet & Passport</h1>
          <div style={{ fontSize: 12, color: "#4A7090", marginTop: 6 }}>
            Local Kite wallet for attestations · Kite Passport for user-bound payment sessions.
          </div>
        </div>

        {/* ── KITE PASSPORT — primary new section ─────────────────────────── */}

        <div style={{ ...S.card, padding: 24, marginBottom: 16, border: "1px solid rgba(0,229,201,0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 4 }}>// KITE PASSPORT</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#F8FAFC" }}>
                {isPassportConnected ? "Connected" : "Not connected"}
                {passport?.simulate && (
                  <span style={{ marginLeft: 10, fontSize: 10, ...S.mono, color: "#FFB300", border: "1px solid rgba(255,179,0,0.35)", padding: "2px 8px", borderRadius: 4, background: "rgba(255,179,0,0.08)", letterSpacing: ".05em" }}>SIMULATE</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {!passportLoading && (
                <span style={{ fontSize: 11, ...S.mono, color: isPassportConnected ? "#00E5C9" : "#4A7090" }}>
                  ● {conn?.status ?? "disconnected"}
                </span>
              )}
            </div>
          </div>

          {passportError && (
            <div style={{ fontSize: 11, ...S.mono, color: "#FF4D6A", marginBottom: 12, padding: "8px 10px", background: "rgba(255,77,106,0.08)", borderRadius: 6, border: "1px solid rgba(255,77,106,0.25)" }}>
              {passportError}
            </div>
          )}

          {passport?.simulate && !isPassportConnected && (
            <div style={{ fontSize: 11, color: "#4A7090", marginBottom: 12, lineHeight: 1.6 }}>
              Running in <span style={{ color: "#FFB300" }}>simulate mode</span> — no real Passport backend configured. Set <code style={{ ...S.mono, color: "#00E5C9" }}>KITE_PASSPORT_BASE_URL</code> and <code style={{ ...S.mono, color: "#00E5C9" }}>KITE_PASSPORT_API_KEY</code> in your environment to wire up production.
            </div>
          )}

          {/* Disconnected state */}
          {!isPassportConnected && conn?.status !== "pending_signup" && !signupId && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#B8D4E8", lineHeight: 1.6 }}>
                Connect a Kite Passport account to let the agent pay for services under a user-approved spending session — instead of using a local hot wallet. Your passkey signs the session; per-call delegations are signed automatically inside the budget you set.
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  style={{ ...S.input, flex: 1 }}
                  disabled={connecting}
                />
                <button
                  onClick={startSignup}
                  disabled={!signupEmail || connecting}
                  style={{ ...S.btnPrimary, opacity: !signupEmail || connecting ? 0.5 : 1 }}
                >
                  {connecting ? "…" : "Connect Passport"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#4A7090" }}>
                You&apos;ll receive a verification email with a link (creates passkey on dashboard) and an 8-character code to paste back.
              </div>
            </div>
          )}

          {/* Pending signup verification */}
          {!isPassportConnected && signupId && !passport?.simulate && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#B8D4E8" }}>
                Check <span style={{ color: "#00E5C9" }}>{signupEmail || "your inbox"}</span> for a verification link + 8-character code. Click the link, set up your passkey, then paste the code below.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="8-character code"
                  value={exchangeToken}
                  onChange={(e) => setExchangeToken(e.target.value)}
                  style={{ ...S.input, flex: 1, letterSpacing: ".15em", textAlign: "center" }}
                  disabled={connecting}
                />
                <button onClick={verifySignup} disabled={!exchangeToken || connecting} style={S.btnPrimary}>
                  {connecting ? "Verifying…" : "Verify"}
                </button>
                <button onClick={() => setSignupId(null)} disabled={connecting} style={S.btnGhost}>Cancel</button>
              </div>
            </div>
          )}

          {/* Connected state */}
          {isPassportConnected && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "EMAIL", value: conn?.email ?? "—" },
                  { label: "AGENT ID", value: conn?.agentId ?? "—" },
                  { label: "AA WALLET", value: conn?.walletAddress ? `${conn.walletAddress.slice(0, 10)}…${conn.walletAddress.slice(-6)}` : "—" },
                  { label: "USDC BALANCE", value: conn?.usdcBalance ? `${conn.usdcBalance} USDC` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 12, ...S.mono, color: "#F8FAFC", wordBreak: "break-all" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <a href="https://agentpassport.ai/dashboard" target="_blank" rel="noopener noreferrer" style={{ ...S.btnSecondary, textDecoration: "none", display: "inline-block" }}>
                  Open Passport Dashboard ↗
                </a>
                <button onClick={disconnect} disabled={connecting} style={S.btnGhost}>Disconnect</button>
              </div>
            </div>
          )}
        </div>

        {/* ── SESSIONS ─────────────────────────────────────────────────────── */}

        {isPassportConnected && (
          <div style={{ ...S.card, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 4 }}>// SPENDING SESSIONS</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#F8FAFC" }}>
                  {passport?.sessionCount ?? 0} session{(passport?.sessionCount ?? 0) === 1 ? "" : "s"}
                  {activeSession && (
                    <span style={{ marginLeft: 10, fontSize: 11, ...S.mono, color: "#00E5C9" }}>
                      ● 1 active
                    </span>
                  )}
                </div>
              </div>
              {!showCreateSession && (
                <button onClick={() => setShowCreateSession(true)} style={S.btnPrimary}>
                  + Create Session
                </button>
              )}
            </div>

            {showCreateSession && (
              <div style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginBottom: 12 }}>NEW SESSION REQUEST</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <label style={S.label}>TASK SUMMARY</label>
                    <input value={sessionForm.taskSummary} onChange={(e) => setSessionForm(f => ({ ...f, taskSummary: e.target.value }))} style={S.input} disabled={creatingSession} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={S.label}>MAX / TX (USDC)</label>
                      <input type="number" min="0" step="0.01" value={sessionForm.maxAmountPerTx} onChange={(e) => setSessionForm(f => ({ ...f, maxAmountPerTx: e.target.value }))} style={S.input} disabled={creatingSession} />
                    </div>
                    <div>
                      <label style={S.label}>MAX TOTAL (USDC)</label>
                      <input type="number" min="0" step="0.01" value={sessionForm.maxTotalAmount} onChange={(e) => setSessionForm(f => ({ ...f, maxTotalAmount: e.target.value }))} style={S.input} disabled={creatingSession} />
                    </div>
                    <div>
                      <label style={S.label}>TTL</label>
                      <input value={sessionForm.ttl} onChange={(e) => setSessionForm(f => ({ ...f, ttl: e.target.value }))} placeholder="24h, 1h, 30m" style={S.input} disabled={creatingSession} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                    <button onClick={() => setShowCreateSession(false)} disabled={creatingSession} style={S.btnGhost}>Cancel</button>
                    <button onClick={createSession} disabled={creatingSession} style={S.btnPrimary}>
                      {creatingSession ? "Requesting…" : "Request Session"}
                    </button>
                  </div>
                  {!passport?.simulate && (
                    <div style={{ fontSize: 11, color: "#4A7090", marginTop: 4 }}>
                      You&apos;ll be prompted to approve the session with your passkey on agentpassport.ai. The agent can&apos;t spend until you do.
                    </div>
                  )}
                </div>
              </div>
            )}

            {(passport?.sessions ?? []).length === 0 && !showCreateSession && (
              <div style={{ fontSize: 12, color: "#4A7090", textAlign: "center", padding: "24px 0" }}>
                No sessions yet. Create one to authorise the agent to pay for services.
              </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              {(passport?.sessions ?? []).map(s => {
                const ttlRemain = Math.max(0, s.expiresAt - Date.now());
                const remainHrs = Math.floor(ttlRemain / 3600000);
                const remainMin = Math.floor((ttlRemain % 3600000) / 60000);
                const ttlStr = ttlRemain === 0 ? "expired" : remainHrs > 0 ? `${remainHrs}h ${remainMin}m` : `${remainMin}m`;
                return (
                  <div key={s.id} style={{
                    background: "#0F172A",
                    border: `1px solid ${s.status === "active" ? "rgba(0,229,201,0.25)" : "#1E3A5F"}`,
                    borderRadius: 8, padding: "12px 14px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#F8FAFC", marginBottom: 4, fontWeight: 500 }}>{s.taskSummary}</div>
                        <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>{s.id}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 10, ...S.mono, color: sessionStatusColor(s.status), padding: "2px 8px", border: `1px solid ${sessionStatusColor(s.status)}55`, borderRadius: 4, background: `${sessionStatusColor(s.status)}10`, letterSpacing: ".05em", whiteSpace: "nowrap" }}>
                          ● {s.status.replace("_", " ")}
                        </span>
                        {(s.status === "active" || s.status === "pending_approval") && (
                          <button onClick={() => revokeSession(s.id)} style={{ fontSize: 10, ...S.mono, color: "#FF4D6A", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                            revoke
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 11, ...S.mono }}>
                      <div>
                        <div style={{ color: "#4A7090", marginBottom: 2 }}>SPENT</div>
                        <div style={{ color: "#F8FAFC" }}>{fmtAmount(s.totalSpent)}</div>
                      </div>
                      <div>
                        <div style={{ color: "#4A7090", marginBottom: 2 }}>BUDGET</div>
                        <div style={{ color: "#F8FAFC" }}>{fmtAmount(s.maxTotalAmount)}</div>
                      </div>
                      <div>
                        <div style={{ color: "#4A7090", marginBottom: 2 }}>CALLS</div>
                        <div style={{ color: "#F8FAFC" }}>{s.callCount}</div>
                      </div>
                      <div>
                        <div style={{ color: "#4A7090", marginBottom: 2 }}>EXPIRES</div>
                        <div style={{ color: ttlRemain === 0 ? "#FF4D6A" : "#F8FAFC" }}>{ttlStr}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LOCAL KITE WALLET (legacy fallback) ──────────────────────────── */}

        <div style={{ ...S.card, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 4 }}>// LOCAL KITE WALLET</div>
              <div style={{ fontSize: 13, color: "#B8D4E8" }}>
                Used for on-chain attestations{isPassportConnected ? " only" : " and (when no Passport session) x402 payments"}.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(0,229,201,0.4)", background: "rgba(0,229,201,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#00E5C9" }}>◈</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC", marginBottom: 1 }}>nexum-commerce-agent</div>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>Kite Testnet · Chain 2368</div>
            </div>
          </div>

          <div style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>WALLET ADDRESS</div>
            <div style={{ fontSize: 11, ...S.mono, color: "#00E5C9", wordBreak: "break-all" }}>{addr}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "KITE Balance", value: balLoading ? "…" : (balance?.kite ?? "0.000000"), color: "#00E5C9" },
              { label: "USDT Balance", value: balLoading ? "…" : (balance?.usdt ?? "0.00"), color: "#7B5EFF" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <a href={`${KITE_EXPLORER}/address/${addr}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, ...S.mono, color: "#7B5EFF", border: "1px solid rgba(123,94,255,0.35)", padding: "8px 0", borderRadius: 8, textDecoration: "none", textAlign: "center", background: "rgba(123,94,255,0.06)" }}>
              ⛓ KiteScan ↗
            </a>
            <a href="https://faucet.gokite.ai" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, ...S.mono, color: "#00E5C9", border: "1px solid rgba(0,229,201,0.35)", padding: "8px 0", borderRadius: 8, textDecoration: "none", textAlign: "center", background: "rgba(0,229,201,0.06)" }}>
              ⚡ Get Testnet KITE
            </a>
          </div>

          {liveStats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #1E3A5F" }}>
              {[
                { label: "RUNS", value: liveStats.totalRuns ?? 0 },
                { label: "PAYMENTS", value: liveStats.totalPayments ?? 0 },
                { label: "ATTESTATIONS", value: liveStats.totalAttestations ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F8FAFC" }}>{value}</div>
                  <div style={{ fontSize: 10, ...S.mono, color: "#4A7090" }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── LOCAL SPEND POLICY (used when not in Passport mode) ─────────── */}

        <div style={{ ...S.card, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 4 }}>// LOCAL SPEND POLICY</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#F8FAFC" }}>
                Programmable Constraints
                {isPassportConnected && (
                  <span style={{ marginLeft: 10, fontSize: 10, ...S.mono, color: "#4A7090", fontWeight: 400 }}>
                    (overridden when a Passport session is active)
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveMsg && <span style={{ fontSize: 12, ...S.mono, color: saveMsg.includes("saved") ? "#7B5EFF" : "#FF4D6A" }}>{saveMsg}</span>}
              {!editing ? (
                <button onClick={() => { setEditing(true); setDraft(policy); }} style={S.btnSecondary}>
                  Edit Policy
                </button>
              ) : (
                <>
                  <button onClick={() => { setEditing(false); setDraft(policy); }} style={S.btnGhost}>Cancel</button>
                  <button onClick={savePolicy} disabled={saving} style={{ ...S.btnPrimary, background: saving ? "#2A4060" : "#00E5C9", cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving…" : "Save Policy"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
            {[
              { label: "MAX PER CALL", key: "perCall" },
              { label: "MAX PER DAY", key: "perDay" },
              { label: "MAX PER MONTH", key: "perMonth" },
            ].map(({ label, key }) => (
              <div key={key} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 8 }}>{label}</div>
                {editing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" value={(draft as unknown as Record<string, string>)[key]}
                      onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                      style={{ ...S.input, width: "calc(100% - 44px)" }} />
                    <span style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>KITE</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#00E5C9" }}>
                    {(policy as unknown as Record<string, string>)[key]} <span style={{ fontSize: 12, color: "#4A7090" }}>KITE</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 10, letterSpacing: ".08em" }}>ALLOWED CATEGORIES</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ALL_CATS.map(cat => {
                const active = editing ? draft.categories.includes(cat) : policy.categories.includes(cat);
                const col = CAT_COLORS[cat] ?? "#4A7090";
                return (
                  <button key={cat} onClick={() => editing && toggleCat(cat)} disabled={!editing}
                    style={{ fontSize: 11, ...S.mono, padding: "5px 14px", borderRadius: 6, border: `1px solid ${active ? col + "55" : "#1E3A5F"}`, color: active ? col : "#4A7090", background: active ? `${col}12` : "transparent", cursor: editing ? "pointer" : "default", transition: "all .15s" }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
