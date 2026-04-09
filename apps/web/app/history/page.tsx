"use client";
import { useState } from "react";
import AppNav from "../components/AppNav";

// Demo data — in production this comes from a persistent store / API
const MOCK_RUNS = [
  { id: "run_1713200001_a4f2b1", task: "Analyse DeFi yield opportunities and cross-reference weather impact on Lagos markets", ts: Date.now() - 3600000 * 2, duration: 9400, payments: [{ service: "Kite Weather API", amount: "1.0000 KITE", status: "settled", txHash: "0x7f3e2a1d9b4c8e5f0a3d6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b" }, { service: "Nexum Finance Oracle", amount: "5.0000 KITE", status: "settled", txHash: "0x9c1f4e7b2a5d8e1f4a7b0c3e6f9a2b5d8e1f4a7b0c3e6f9a2b5d8e1f4a7b0c" }], attestation: "0xb2c8d4f91a3e5b7c0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a", status: "complete" },
  { id: "run_1713200002_c9d3e4", task: "Research AI inference costs across major chains and identify arbitrage opportunities", ts: Date.now() - 3600000 * 5, duration: 7200, payments: [{ service: "Kite Weather API", amount: "1.0000 KITE", status: "settled", txHash: "0x3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a" }], attestation: "0xd4f91a3e5b7c0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c", status: "complete" },
  { id: "run_1713200003_f1a8b2", task: "Scout high-yield DeFi protocols and cross-reference real-time market conditions", ts: Date.now() - 3600000 * 24, duration: 11200, payments: [{ service: "Nexum Finance Oracle", amount: "5.0000 KITE", status: "settled", txHash: "0x1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b" }, { service: "Kite Identity Verifier", amount: "0.5000 KITE", status: "settled", txHash: "0x5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f" }], attestation: "0xf91a3e5b7c0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e", status: "complete" },
  { id: "run_1713200004_b7c5d9", task: "Verify identity credentials for new protocol participants", ts: Date.now() - 3600000 * 30, duration: 5800, payments: [{ service: "Kite Identity Verifier", amount: "0.5000 KITE", status: "settled", txHash: "0x2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e" }], attestation: "0xa3e5b7c0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4", status: "complete" },
  { id: "run_1713200005_e2f6a0", task: "Commerce intelligence report on autonomous agent volumes on Kite chain", ts: Date.now() - 3600000 * 48, duration: 13100, payments: [{ service: "Kite Weather API", amount: "1.0000 KITE", status: "settled", txHash: "0x4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d" }, { service: "Nexum Finance Oracle", amount: "5.0000 KITE", status: "settled", txHash: "0x6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b" }, { service: "Nexum AI Inference", amount: "2.0000 KITE", status: "settled", txHash: "0x8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a" }], attestation: "0xc0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0", status: "complete" },
];

const ALL_PAYMENTS = MOCK_RUNS.flatMap(r => r.payments.map(p => ({ ...p, runId: r.id, ts: r.ts, task: r.task })));
const TOTAL_SPEND = ALL_PAYMENTS.reduce((s, p) => s + parseFloat(p.amount), 0);
const DAILY_BUDGET = 500;
const MONTHLY_BUDGET = 5000;

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function shortHash(h: string) { return `${h.slice(0, 10)}…${h.slice(-6)}`; }

export default function History() {
  const [view, setView] = useState<"runs" | "payments">("runs");
  const [expanded, setExpanded] = useState<string | null>(null);

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "monospace" } as React.CSSProperties,
  };

  const spentToday = MOCK_RUNS.filter(r => Date.now() - r.ts < 86400000).flatMap(r => r.payments).reduce((s, p) => s + parseFloat(p.amount), 0);
  const spentMonth = TOTAL_SPEND;

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 8 }}>// TRANSACTION HISTORY</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#F8FAFC" }}>Spend Dashboard</h1>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total spent", value: `${TOTAL_SPEND.toFixed(2)} KITE`, sub: `${ALL_PAYMENTS.length} payments`, color: "#00E5C9" },
            { label: "Today", value: `${spentToday.toFixed(2)} KITE`, sub: `${Math.round(spentToday / DAILY_BUDGET * 100)}% of daily limit`, color: spentToday > DAILY_BUDGET * 0.8 ? "#FF4D6A" : "#00E5C9" },
            { label: "This month", value: `${spentMonth.toFixed(2)} KITE`, sub: `${Math.round(spentMonth / MONTHLY_BUDGET * 100)}% of monthly limit`, color: spentMonth > MONTHLY_BUDGET * 0.8 ? "#FF4D6A" : "#7B5EFF" },
            { label: "Agent runs", value: String(MOCK_RUNS.length), sub: `${MOCK_RUNS.filter(r => r.status === "complete").length} complete`, color: "#7B5EFF" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ ...S.card, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginBottom: 6 }}>{label.toUpperCase()}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Budget bars */}
        <div style={{ ...S.card, padding: "20px 24px", marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {[
            { label: "DAILY BUDGET", spent: spentToday, max: DAILY_BUDGET },
            { label: "MONTHLY BUDGET", spent: spentMonth, max: MONTHLY_BUDGET },
          ].map(({ label, spent, max }) => {
            const pct = Math.min(100, Math.round(spent / max * 100));
            const color = pct > 80 ? "#FF4D6A" : pct > 60 ? "#FFB300" : "#00E5C9";
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>{label}</span>
                  <span style={{ fontSize: 11, ...S.mono, color }}>{spent.toFixed(1)} / {max} KITE</span>
                </div>
                <div style={{ background: "#0F172A", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width .5s" }} />
                </div>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginTop: 4 }}>{pct}% used</div>
              </div>
            );
          })}
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {(["runs", "payments"] as const).map(t => (
            <button key={t} onClick={() => setView(t)}
              style={{ fontSize: 12, ...S.mono, padding: "6px 16px", borderRadius: 6, border: `1px solid ${view === t ? "rgba(0,229,201,0.5)" : "#1E3A5F"}`, color: view === t ? "#00E5C9" : "#4A7090", background: view === t ? "rgba(0,229,201,0.07)" : "transparent", cursor: "pointer" }}>
              {t === "runs" ? `Agent Runs (${MOCK_RUNS.length})` : `Payments (${ALL_PAYMENTS.length})`}
            </button>
          ))}
        </div>

        {/* Runs table */}
        {view === "runs" && (
          <div style={{ ...S.card, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 90px 36px", gap: 0 }}>
              {["TASK", "TIME", "SPEND", "PAYMENTS", ""].map((h, i) => (
                <div key={i} style={{ padding: "10px 16px", fontSize: 10, ...S.mono, color: "#4A7090", borderBottom: "1px solid #1E3A5F", letterSpacing: ".08em" }}>{h}</div>
              ))}
            </div>
            {MOCK_RUNS.map(run => (
              <div key={run.id}>
                <div onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 90px 36px", cursor: "pointer", borderBottom: "1px solid #1E3A5F", transition: "background .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,229,201,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, color: "#F8FAFC", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{run.task}</div>
                    <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>{run.id}</div>
                  </div>
                  <div style={{ padding: "12px 16px", fontSize: 12, ...S.mono, color: "#4A7090", alignSelf: "center" }}>{timeAgo(run.ts)}</div>
                  <div style={{ padding: "12px 16px", fontSize: 12, ...S.mono, color: "#00E5C9", alignSelf: "center" }}>{run.payments.reduce((s, p) => s + parseFloat(p.amount), 0).toFixed(1)} KITE</div>
                  <div style={{ padding: "12px 16px", fontSize: 12, ...S.mono, color: "#7B5EFF", alignSelf: "center" }}>{run.payments.length} tx{run.payments.length !== 1 ? "s" : ""}</div>
                  <div style={{ padding: "12px 8px", fontSize: 14, color: "#4A7090", alignSelf: "center", textAlign: "center" }}>{expanded === run.id ? "▲" : "▼"}</div>
                </div>
                {expanded === run.id && (
                  <div style={{ background: "#071018", borderBottom: "1px solid #1E3A5F", padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginBottom: 10 }}>PAYMENTS IN THIS RUN</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {run.payments.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px" }}>
                          <div>
                            <div style={{ fontSize: 13, color: "#F8FAFC", marginBottom: 2 }}>{p.service}</div>
                            <a href={`https://testnet.kitescan.ai/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11, ...S.mono, color: "#7B5EFF", textDecoration: "none" }}>⛓ {shortHash(p.txHash)} ↗</a>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, ...S.mono, color: "#00E5C9", marginBottom: 2 }}>{p.amount}</div>
                            <div style={{ fontSize: 11, ...S.mono, color: "#7B5EFF" }}>✓ {p.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                      <a href={`https://testnet.kitescan.ai/tx/${run.attestation}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, ...S.mono, color: "#7B5EFF", border: "1px solid rgba(123,94,255,0.3)", padding: "5px 12px", borderRadius: 6, textDecoration: "none", background: "rgba(123,94,255,0.06)" }}>
                        ⛓ View attestation ↗
                      </a>
                      <span style={{ fontSize: 11, ...S.mono, color: "#4A7090", alignSelf: "center" }}>{(run.duration / 1000).toFixed(1)}s duration</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Payments table */}
        {view === "payments" && (
          <div style={{ ...S.card, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 160px", gap: 0 }}>
              {["SERVICE", "AMOUNT", "RUN ID", "STATUS", "TX HASH"].map((h, i) => (
                <div key={i} style={{ padding: "10px 16px", fontSize: 10, ...S.mono, color: "#4A7090", borderBottom: "1px solid #1E3A5F", letterSpacing: ".08em" }}>{h}</div>
              ))}
            </div>
            {ALL_PAYMENTS.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 160px", borderBottom: i < ALL_PAYMENTS.length - 1 ? "1px solid #1E3A5F" : "none", transition: "background .15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,229,201,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, color: "#F8FAFC", marginBottom: 2 }}>{p.service}</div>
                  <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>{timeAgo(p.ts)}</div>
                </div>
                <div style={{ padding: "12px 16px", fontSize: 13, ...S.mono, color: "#00E5C9", alignSelf: "center" }}>{p.amount}</div>
                <div style={{ padding: "12px 16px", fontSize: 11, ...S.mono, color: "#4A7090", alignSelf: "center" }}>{p.runId.slice(-8)}</div>
                <div style={{ padding: "12px 16px", fontSize: 11, ...S.mono, color: "#7B5EFF", alignSelf: "center" }}>✓ {p.status}</div>
                <div style={{ padding: "12px 16px", alignSelf: "center" }}>
                  <a href={`https://testnet.kitescan.ai/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, ...S.mono, color: "#7B5EFF", textDecoration: "none" }}>{shortHash(p.txHash)} ↗</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
