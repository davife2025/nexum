"use client";
import { useState } from "react";
import AppNav from "../components/AppNav";

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  agent_init:    { icon: "◈", color: "#00E5C9", label: "Agent Init" },
  task_start:    { icon: "▶", color: "#00E5C9", label: "Task Start" },
  payment:       { icon: "⚡", color: "#FFB300", label: "Payment" },
  task_complete: { icon: "✓", color: "#7B5EFF", label: "Task Complete" },
  service_call:  { icon: "↗", color: "#00E5C9", label: "Service Call" },
};

const MOCK_ATTESTATIONS = [
  { id: "attest_001", runId: "run_1713200001_a4f2b1", type: "agent_init",    ts: Date.now() - 3600000 * 2 - 9000, txHash: "0x7f3e2a1d9b4c8e5f0a3d6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b", contentHash: "0x3a1d9b4c8e5f0a3d6b9c2e5f8a1b4d7e0f3a6b9c", block: 1824501, status: "confirmed", metadata: "Task: Analyse DeFi yield opportunities and cross-r" },
  { id: "attest_002", runId: "run_1713200001_a4f2b1", type: "payment",       ts: Date.now() - 3600000 * 2 - 6000, txHash: "0x9c1f4e7b2a5d8e1f4a7b0c3e6f9a2b5d8e1f4a7b0c3e6f9a2b5d8e1f4a7b0c", contentHash: "0x4c8e5f0a3d6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a", block: 1824508, status: "confirmed", metadata: "Paid Kite Weather API: 1.0000 KITE" },
  { id: "attest_003", runId: "run_1713200001_a4f2b1", type: "payment",       ts: Date.now() - 3600000 * 2 - 4000, txHash: "0x3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a", contentHash: "0x5f0a3d6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d", block: 1824514, status: "confirmed", metadata: "Paid Nexum Finance Oracle: 5.0000 KITE" },
  { id: "attest_004", runId: "run_1713200001_a4f2b1", type: "task_complete", ts: Date.now() - 3600000 * 2 - 200, txHash: "0xb2c8d4f91a3e5b7c0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a", contentHash: "0xa3d6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0", block: 1824521, status: "confirmed", metadata: "Completed: Analyse DeFi yield opportunities and c" },
  { id: "attest_005", runId: "run_1713200002_c9d3e4", type: "agent_init",    ts: Date.now() - 3600000 * 5 - 7000, txHash: "0xd4f91a3e5b7c0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c", contentHash: "0xb9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6", block: 1824102, status: "confirmed", metadata: "Task: Research AI inference costs across major cha" },
  { id: "attest_006", runId: "run_1713200002_c9d3e4", type: "payment",       ts: Date.now() - 3600000 * 5 - 4000, txHash: "0x1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b", contentHash: "0xc2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9", block: 1824109, status: "confirmed", metadata: "Paid Kite Weather API: 1.0000 KITE" },
  { id: "attest_007", runId: "run_1713200002_c9d3e4", type: "task_complete", ts: Date.now() - 3600000 * 5 - 500, txHash: "0x5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f", contentHash: "0xd7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4", block: 1824116, status: "confirmed", metadata: "Completed: Research AI inference costs across majo" },
  { id: "attest_008", runId: "run_1713200005_e2f6a0", type: "agent_init",    ts: Date.now() - 3600000 * 48 - 13000, txHash: "0x4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d", contentHash: "0xe0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7", block: 1823001, status: "confirmed", metadata: "Task: Commerce intelligence report on autonomous a" },
  { id: "attest_009", runId: "run_1713200005_e2f6a0", type: "payment",       ts: Date.now() - 3600000 * 48 - 9000, txHash: "0x6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b", contentHash: "0xf3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0", block: 1823008, status: "confirmed", metadata: "Paid Kite Weather API: 1.0000 KITE" },
  { id: "attest_010", runId: "run_1713200005_e2f6a0", type: "payment",       ts: Date.now() - 3600000 * 48 - 7000, txHash: "0x8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a", contentHash: "0xa6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3", block: 1823014, status: "confirmed", metadata: "Paid Nexum Finance Oracle: 5.0000 KITE" },
  { id: "attest_011", runId: "run_1713200005_e2f6a0", type: "payment",       ts: Date.now() - 3600000 * 48 - 5000, txHash: "0xc0d2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0", contentHash: "0xb9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6", block: 1823021, status: "confirmed", metadata: "Paid Nexum AI Inference: 2.0000 KITE" },
  { id: "attest_012", runId: "run_1713200005_e2f6a0", type: "task_complete", ts: Date.now() - 3600000 * 48 - 200, txHash: "0xe2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2f4a6b8c0e2", contentHash: "0xc2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b9", block: 1823028, status: "confirmed", metadata: "Completed: Commerce intelligence report on autonom" },
];

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function shortHash(h: string) { return `${h.slice(0, 12)}…${h.slice(-8)}`; }

export default function AttestationsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<typeof MOCK_ATTESTATIONS[0] | null>(null);

  const types = ["all", ...Array.from(new Set(MOCK_ATTESTATIONS.map(a => a.type)))];
  const filtered = filter === "all" ? MOCK_ATTESTATIONS : MOCK_ATTESTATIONS.filter(a => a.type === filter);

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "monospace" } as React.CSSProperties,
  };

  const paymentCount = MOCK_ATTESTATIONS.filter(a => a.type === "payment").length;
  const completeCount = MOCK_ATTESTATIONS.filter(a => a.type === "task_complete").length;

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 8 }}>// ON-CHAIN PROOF</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#F8FAFC", marginBottom: 6 }}>Attestation Explorer</h1>
          <p style={{ fontSize: 13, color: "#4A7090" }}>Every agent action is anchored on Kite testnet. Decoded, verifiable, immutable.</p>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total attestations", value: MOCK_ATTESTATIONS.length, color: "#00E5C9" },
            { label: "Payment proofs", value: paymentCount, color: "#FFB300" },
            { label: "Completed runs", value: completeCount, color: "#7B5EFF" },
            { label: "Network", value: "Kite Testnet", color: "#00E5C9" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...S.card, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 6 }}>{label.toUpperCase()}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {types.map(t => {
            const meta = TYPE_META[t];
            const active = filter === t;
            const color = meta?.color ?? "#4A7090";
            return (
              <button key={t} onClick={() => setFilter(t)}
                style={{ fontSize: 11, ...S.mono, padding: "5px 14px", borderRadius: 6, border: `1px solid ${active ? `${color}60` : "#1E3A5F"}`, color: active ? color : "#4A7090", background: active ? `${color}10` : "transparent", cursor: "pointer" }}>
                {meta ? `${meta.icon} ${meta.label}` : "All"} {t !== "all" && `(${MOCK_ATTESTATIONS.filter(a => a.type === t).length})`}
              </button>
            );
          })}
        </div>

        {/* Main layout */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 16 }}>

          {/* Timeline */}
          <div style={{ ...S.card, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 180px 100px 80px", borderBottom: "1px solid #1E3A5F" }}>
              {["", "ATTESTATION", "TX HASH", "BLOCK", "TIME"].map((h, i) => (
                <div key={i} style={{ padding: "10px 12px", fontSize: 10, ...S.mono, color: "#4A7090", letterSpacing: ".08em" }}>{h}</div>
              ))}
            </div>

            {filtered.map((attest, idx) => {
              const meta = TYPE_META[attest.type] ?? { icon: "·", color: "#4A7090", label: attest.type };
              const isSelected = selected?.id === attest.id;
              const isNewRun = idx === 0 || filtered[idx - 1].runId !== attest.runId;

              return (
                <div key={attest.id}>
                  {isNewRun && (
                    <div style={{ padding: "6px 14px", background: "#071018", borderBottom: "1px solid #1E3A5F" }}>
                      <span style={{ fontSize: 10, ...S.mono, color: "#4A7090" }}>RUN: {attest.runId}</span>
                    </div>
                  )}
                  <div onClick={() => setSelected(isSelected ? null : attest)}
                    style={{ display: "grid", gridTemplateColumns: "40px 1fr 180px 100px 80px", borderBottom: "1px solid #1E3A5F", cursor: "pointer", background: isSelected ? `${meta.color}08` : "transparent", borderLeft: isSelected ? `2px solid ${meta.color}` : "2px solid transparent", transition: "all .15s" }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(0,229,201,0.03)"; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: meta.color }}>{meta.icon}</div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: meta.color, marginBottom: 2 }}>{meta.label}</div>
                      <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{attest.metadata}</div>
                    </div>
                    <div style={{ padding: "10px 12px", alignSelf: "center" }}>
                      <a href={`https://testnet.kitescan.ai/tx/${attest.txHash}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, ...S.mono, color: "#7B5EFF", textDecoration: "none" }}>{shortHash(attest.txHash)} ↗</a>
                    </div>
                    <div style={{ padding: "10px 12px", fontSize: 11, ...S.mono, color: "#4A7090", alignSelf: "center" }}>#{attest.block}</div>
                    <div style={{ padding: "10px 12px", fontSize: 11, ...S.mono, color: "#4A7090", alignSelf: "center" }}>{timeAgo(attest.ts)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (() => {
            const meta = TYPE_META[selected.type] ?? { icon: "·", color: "#4A7090", label: selected.type };
            const decodedPayload = JSON.stringify({ v: 1, app: "nexum", chain: "kite-testnet", runId: selected.runId, type: selected.type, contentHash: selected.contentHash, metadata: selected.metadata, ts: Math.floor(selected.ts / 1000) }, null, 2);
            return (
              <div style={{ ...S.card, padding: 22, alignSelf: "start", position: "sticky", top: 80 }}>
                <button onClick={() => setSelected(null)} style={{ fontSize: 11, ...S.mono, color: "#4A7090", background: "transparent", border: "none", cursor: "pointer", marginBottom: 16, padding: 0 }}>← Close</button>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 22, color: meta.color }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: meta.color }}>{meta.label}</div>
                    <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>{timeAgo(selected.ts)} · Block #{selected.block}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 10, ...S.mono, color: "#7B5EFF", border: "1px solid rgba(123,94,255,0.3)", borderRadius: 4, padding: "2px 7px" }}>✓ CONFIRMED</span>
                </div>

                <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                  {[
                    { label: "RUN ID", value: selected.runId },
                    { label: "ATTESTATION ID", value: selected.id },
                    { label: "CONTENT HASH", value: shortHash(selected.contentHash) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 6, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 11, ...S.mono, color: "#B8D4E8" }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 6 }}>DECODED TX DATA (UTF-8)</div>
                  <pre style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "12px", fontSize: 10, ...S.mono, color: "#B8D4E8", overflowX: "auto", margin: 0, lineHeight: 1.6 }}>{decodedPayload}</pre>
                </div>

                <a href={`https://testnet.kitescan.ai/tx/${selected.txHash}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", fontSize: 12, ...S.mono, color: "#7B5EFF", border: "1px solid rgba(123,94,255,0.35)", padding: "9px 0", borderRadius: 8, textDecoration: "none", background: "rgba(123,94,255,0.06)" }}>
                  ⛓ View Full Transaction on KiteScan ↗
                </a>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
