"use client";
import { useState, useEffect } from "react";
import AppNav from "../components/AppNav";

const DEMO_ADDR = "0x4f2a8C3d1E9B5F7A2C4E6D8B0F3A5C7E9B1D3F5A";
const KITE_EXPLORER = "https://testnet.kitescan.ai";

const DEFAULT_POLICY = { perCall: "50", perDay: "500", perMonth: "5000", categories: ["data","finance","ai","identity","compute"] };
const ALL_CATS = ["data","finance","ai","identity","compute","storage"];

const CAT_COLORS: Record<string, string> = { data: "#00E5C9", finance: "#7B5EFF", ai: "#A78BFA", identity: "#FFB300", compute: "#FB923C", storage: "#34D399" };

export default function AgentPage() {
  const [balance, setBalance] = useState<string | null>(null);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(policy);

  useEffect(() => {
    // Simulate balance fetch
    const t = setTimeout(() => setBalance("0.0000"), 800);
    return () => clearTimeout(t);
  }, []);

  const savePolicy = () => {
    setPolicy(draft);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleCat = (cat: string) => {
    setDraft(d => ({
      ...d,
      categories: d.categories.includes(cat) ? d.categories.filter(c => c !== cat) : [...d.categories, cat]
    }));
  };

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "monospace" } as React.CSSProperties,
    input: { background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 6, padding: "8px 12px", color: "#F8FAFC", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%" } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 8 }}>// AGENT IDENTITY</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#F8FAFC" }}>Agent Wallet & Policy</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Wallet card */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 16 }}>// KITE WALLET</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(0,229,201,0.4)", background: "rgba(0,229,201,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#00E5C9" }}>◈</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC", marginBottom: 1 }}>nexum-commerce-agent</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>Kite Testnet</div>
              </div>
            </div>

            <div style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>WALLET ADDRESS</div>
              <div style={{ fontSize: 11, ...S.mono, color: "#00E5C9", wordBreak: "break-all" }}>{DEMO_ADDR}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "KITE Balance", value: balance ?? "…", color: "#00E5C9" },
                { label: "USDT Balance", value: "0.00", color: "#7B5EFF" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <a href={`${KITE_EXPLORER}/address/${DEMO_ADDR}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, ...S.mono, color: "#7B5EFF", border: "1px solid rgba(123,94,255,0.35)", padding: "8px 0", borderRadius: 8, textDecoration: "none", textAlign: "center", background: "rgba(123,94,255,0.06)" }}>
                ⛓ View on KiteScan
              </a>
              <a href="https://faucet.gokite.ai" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, ...S.mono, color: "#00E5C9", border: "1px solid rgba(0,229,201,0.35)", padding: "8px 0", borderRadius: 8, textDecoration: "none", textAlign: "center", background: "rgba(0,229,201,0.06)" }}>
                ⚡ Get Testnet KITE
              </a>
            </div>
          </div>

          {/* Identity card */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 16 }}>// KITE PASSPORT</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "AGENT ID", value: `agent_${DEMO_ADDR.slice(2, 10).toLowerCase()}` },
                { label: "NETWORK", value: "KiteAI Testnet (Chain 2368)" },
                { label: "PROTOCOL", value: "x402 / gokite-aa" },
                { label: "FACILITATOR", value: "facilitator.pieverse.io" },
                { label: "ATTESTATIONS", value: "12 on-chain records" },
                { label: "TOTAL RUNS", value: "5 complete" },
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
        <div style={{ ...S.card, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 4 }}>// SPEND POLICY</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#F8FAFC" }}>Programmable Constraints</div>
            </div>
            {!editing ? (
              <button onClick={() => { setEditing(true); setDraft(policy); }}
                style={{ fontSize: 12, ...S.mono, color: "#00E5C9", border: "1px solid rgba(0,229,201,0.35)", padding: "6px 16px", borderRadius: 6, background: "rgba(0,229,201,0.06)", cursor: "pointer" }}>
                Edit Policy
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditing(false)}
                  style={{ fontSize: 12, ...S.mono, color: "#4A7090", border: "1px solid #1E3A5F", padding: "6px 14px", borderRadius: 6, background: "transparent", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={savePolicy}
                  style={{ fontSize: 12, ...S.mono, color: "#0F172A", background: "#00E5C9", padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {saved ? "✓ Saved" : "Save Policy"}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "MAX PER CALL", key: "perCall", suffix: "KITE" },
              { label: "MAX PER DAY", key: "perDay", suffix: "KITE" },
              { label: "MAX PER MONTH", key: "perMonth", suffix: "KITE" },
            ].map(({ label, key, suffix }) => (
              <div key={key} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 8 }}>{label}</div>
                {editing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" value={(draft as Record<string, string>)[key]}
                      onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                      style={{ ...S.input, width: "calc(100% - 44px)" }} />
                    <span style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>{suffix}</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: "#00E5C9" }}>
                    {(policy as Record<string, string>)[key]} <span style={{ fontSize: 12, color: "#4A7090" }}>{suffix}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 10 }}>ALLOWED SERVICE CATEGORIES</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ALL_CATS.map(cat => {
                const active = editing ? draft.categories.includes(cat) : policy.categories.includes(cat);
                const col = CAT_COLORS[cat] ?? "#4A7090";
                return (
                  <button key={cat} onClick={() => editing && toggleCat(cat)} disabled={!editing}
                    style={{ fontSize: 11, ...S.mono, padding: "5px 14px", borderRadius: 6, border: `1px solid ${active ? col + "60" : "#1E3A5F"}`, color: active ? col : "#4A7090", background: active ? `${col}12` : "transparent", cursor: editing ? "pointer" : "default", transition: "all .15s" }}>
                    {cat}
                  </button>
                );
              })}
            </div>
            {editing && <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginTop: 8 }}>Click to toggle. Agent will skip services in unchecked categories.</div>}
          </div>
        </div>

        {/* Setup guide */}
        <div style={{ ...S.card, padding: 24, marginTop: 16, border: "1px solid rgba(0,229,201,0.2)" }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 14 }}>// SETUP GUIDE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { step: "1", color: "#00E5C9", title: "Get testnet KITE", desc: "Visit faucet.gokite.ai and fund your agent wallet to enable real on-chain attestations.", href: "https://faucet.gokite.ai", cta: "Open Faucet ↗" },
              { step: "2", color: "#7B5EFF", title: "Set AGENT_PRIVATE_KEY", desc: "Add your wallet private key to .env.local. Leave blank for ephemeral demo mode.", href: "https://docs.gokite.ai", cta: "Docs ↗" },
              { step: "3", color: "#00E5C9", title: "Register Kite Passport", desc: "Optional: register at the Kite Portal for full MCP integration and session management.", href: "https://x402-portal-eight.vercel.app", cta: "Open Portal ↗" },
            ].map(({ step, color, title, desc, href, cta }) => (
              <div key={step} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${color}50`, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color, marginBottom: 10, fontWeight: 700 }}>{step}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC", marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#4A7090", lineHeight: 1.6, marginBottom: 10 }}>{desc}</div>
                <a href={href} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, ...S.mono, color, textDecoration: "none" }}>{cta}</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
