"use client";
import { useState, useEffect, useCallback } from "react";
import AppNav from "../components/AppNav";
import Link from "next/link";

const KITE_EXPLORER = "https://testnet.kitescan.ai";
const ALL_CATS = ["data", "finance", "ai", "identity", "compute", "storage"];
const CAT_COLORS: Record<string, string> = { data: "#00E5C9", finance: "#7B5EFF", ai: "#A78BFA", identity: "#FFB300", compute: "#FB923C", storage: "#34D399" };

interface Policy { perCall: string; perDay: string; perMonth: string; categories: string[]; updatedAt?: number; }
interface Balance { address: string; kite: string; usdt: string; chainId: string; explorerUrl: string; }

export default function AgentPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [policy, setPolicy] = useState<Policy>({ perCall: "50", perDay: "500", perMonth: "5000", categories: ALL_CATS });
  const [draft, setDraft] = useState<Policy>(policy);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [balLoading, setBalLoading] = useState(true);

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

  useEffect(() => {
    fetchBalance();
    fetchPolicy();
    const t = setInterval(fetchBalance, 30000);
    return () => clearInterval(t);
  }, [fetchBalance, fetchPolicy]);

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

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "'IBM Plex Mono',monospace" } as React.CSSProperties,
    input: { background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "9px 12px", color: "#F8FAFC", fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
    label: { fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: "#4A7090", letterSpacing: ".08em", display: "block", marginBottom: 6 } as React.CSSProperties,
  };

  const addr = balance?.address ?? "0x4f2a8C3d1E9B5F7A2C4E6D8B0F3A5C7E9B1D3F5A";

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 8 }}>// AGENT IDENTITY</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#F8FAFC" }}>Agent Wallet & Policy</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Wallet */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 16 }}>// KITE WALLET</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(0,229,201,0.4)", background: "rgba(0,229,201,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#00E5C9" }}>◈</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC", marginBottom: 1 }}>nexum-commerce-agent</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>Kite Testnet · Chain 2368</div>
              </div>
            </div>

            <div style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>WALLET ADDRESS</div>
              <div style={{ fontSize: 11, ...S.mono, color: "#00E5C9", wordBreak: "break-all" }}>{addr}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
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
          </div>

          {/* Passport */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 16 }}>// KITE PASSPORT</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "AGENT ID", value: `agent_${addr.slice(2, 10).toLowerCase()}` },
                { label: "NETWORK", value: "KiteAI Testnet (Chain 2368)" },
                { label: "PROTOCOL", value: "x402 / gokite-aa" },
                { label: "FACILITATOR", value: "facilitator.pieverse.io" },
                { label: "POLICY", value: policy.updatedAt ? `Updated ${new Date(policy.updatedAt).toLocaleDateString()}` : "Default" },
                { label: "CATEGORIES", value: `${policy.categories.length} allowed` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1E3A5F" }}>
                  <span style={{ fontSize: 10, ...S.mono, color: "#4A7090" }}>{label}</span>
                  <span style={{ fontSize: 12, ...S.mono, color: "#B8D4E8" }}>{value}</span>
                </div>
              ))}
            </div>
            <a href="https://x402-portal-eight.vercel.app" target="_blank" rel="noopener noreferrer"
              style={{ display: "block", marginTop: 16, fontSize: 12, ...S.mono, color: "#00E5C9", border: "1px solid rgba(0,229,201,0.35)", padding: "9px 0", borderRadius: 8, textDecoration: "none", textAlign: "center", background: "rgba(0,229,201,0.06)" }}>
              Manage Kite Passport ↗
            </a>
          </div>
        </div>

        {/* Spend policy */}
        <div style={{ ...S.card, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 4 }}>// SPEND POLICY</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#F8FAFC" }}>Programmable Constraints</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveMsg && <span style={{ fontSize: 12, ...S.mono, color: saveMsg.includes("saved") ? "#7B5EFF" : "#FF4D6A" }}>{saveMsg}</span>}
              {!editing ? (
                <button onClick={() => { setEditing(true); setDraft(policy); }}
                  style={{ fontSize: 12, ...S.mono, color: "#00E5C9", border: "1px solid rgba(0,229,201,0.35)", padding: "6px 16px", borderRadius: 6, background: "rgba(0,229,201,0.06)", cursor: "pointer" }}>
                  Edit Policy
                </button>
              ) : (
                <>
                  <button onClick={() => { setEditing(false); setDraft(policy); }}
                    style={{ fontSize: 12, ...S.mono, color: "#4A7090", border: "1px solid #1E3A5F", padding: "6px 14px", borderRadius: 6, background: "transparent", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={savePolicy} disabled={saving}
                    style={{ fontSize: 12, ...S.mono, color: "#0F172A", background: saving ? "#2A4060" : "#00E5C9", padding: "6px 18px", borderRadius: 6, border: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600 }}>
                    {saving ? "Saving…" : "Save Policy"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "MAX PER CALL", key: "perCall" },
              { label: "MAX PER DAY", key: "perDay" },
              { label: "MAX PER MONTH", key: "perMonth" },
            ].map(({ label, key }) => (
              <div key={key} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 8 }}>{label}</div>
                {editing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" value={(draft as Record<string, string>)[key]}
                      onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                      style={{ ...S.input, width: "calc(100% - 44px)" }} />
                    <span style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>KITE</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#00E5C9" }}>
                    {(policy as Record<string, string>)[key]} <span style={{ fontSize: 12, color: "#4A7090" }}>KITE</span>
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
            {editing && <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginTop: 8 }}>Click to toggle — agent skips services in disabled categories.</div>}
          </div>
        </div>

        {/* Setup guide */}
        <div style={{ ...S.card, padding: 24, border: "1px solid rgba(0,229,201,0.15)" }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 16 }}>// SETUP GUIDE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { step: "1", color: "#00E5C9", title: "Fund your wallet", desc: "Visit faucet.gokite.ai and send testnet KITE to your agent wallet address above.", href: "https://faucet.gokite.ai", cta: "Open Faucet ↗" },
              { step: "2", color: "#7B5EFF", title: "Set private key", desc: "Add AGENT_PRIVATE_KEY to your .env.local file to persist your wallet across restarts.", href: "https://docs.gokite.ai", cta: "Docs ↗" },
              { step: "3", color: "#00E5C9", title: "Register Passport", desc: "Register at the Kite Portal for full MCP integration and session management.", href: "https://x402-portal-eight.vercel.app", cta: "Open Portal ↗" },
            ].map(({ step, color, title, desc, href, cta }) => (
              <div key={step} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${color}50`, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color, marginBottom: 10, fontWeight: 700 }}>{step}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC", marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#4A7090", lineHeight: 1.6, marginBottom: 10 }}>{desc}</div>
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, ...S.mono, color, textDecoration: "none" }}>{cta}</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
