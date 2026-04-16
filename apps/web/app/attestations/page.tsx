"use client";
import { useState, useEffect, useCallback } from "react";
import AppNav from "../components/AppNav";
import Link from "next/link";

interface Attestation {
  id: string; runId: string; type: string; contentHash: string;
  metadata?: string; txHash?: string; explorerUrl?: string;
  blockNumber?: number; timestamp: number; status: string;
  runTask?: string; agentAddress?: string;
}
interface Summary { total: number; byType: Record<string,number>; }

const TYPE_META: Record<string,{icon:string;color:string;label:string}> = {
  agent_init:    { icon:"◈", color:"#00E5C9", label:"Agent Init" },
  task_start:    { icon:"▶", color:"#00E5C9", label:"Task Start" },
  payment:       { icon:"⚡", color:"#FFB300", label:"Payment" },
  task_complete: { icon:"✓", color:"#7B5EFF", label:"Complete" },
};

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}
function shortHash(h: string) { return `${h.slice(0,12)}…${h.slice(-8)}`; }

export default function AttestationsPage() {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState("all");
  const [runFilter, setRunFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Attestation | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyHash = (hash: string, key: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const exportCSV = () => {
    const headers = ["id","runId","type","contentHash","txHash","status","timestamp","metadata"];
    const rows = attestations.map(a => headers.map(h => {
      const v = (a as Record<string,unknown>)[h];
      return typeof v === "string" ? `"${v.replace(/"/g,"'")}"` : String(v ?? "");
    }).join(","));
    const blob = new Blob([headers.join(",") + "
" + rows.join("
")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `nexum-attestations-${Date.now()}.csv`;
    link.click(); URL.revokeObjectURL(url);
  };
  const [loading, setLoading] = useState(true);

  // Client-side run filter on top of server-side type filter
  const displayAttestations = runFilter
    ? attestations.filter(a => a.runId === runFilter)
    : attestations;

  const load = useCallback(async () => {
    try {
      const url = filter !== "all" ? `/api/attestations?type=${filter}` : "/api/attestations";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setAttestations(data.attestations ?? []);
      setSummary(data.summary ?? null);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => { const t = setInterval(() => load(), 8000); return () => clearInterval(t); }, [load]);

  const S = {
    page: { background:"#0F172A", minHeight:"100vh", fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", color:"#B8D4E8" } as React.CSSProperties,
    card: { background:"#0A2540", border:"1px solid #1E3A5F", borderRadius:12 } as React.CSSProperties,
    mono: { fontFamily:"'IBM Plex Mono',monospace" } as React.CSSProperties,
  };

  const types = ["all", ...Object.keys(TYPE_META)];

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, ...S.mono, color:"#4A7090", letterSpacing:".1em", marginBottom:8 }}>// ON-CHAIN PROOF</div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:28, color:"#F8FAFC", marginBottom:6 }}>Attestation Explorer</h1>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <p style={{ fontSize:13, color:"#4A7090", margin:0 }}>Every agent action anchored on Kite testnet — decoded, verifiable, immutable.</p>
          <button onClick={exportCSV}
            style={{ fontSize:12, fontFamily:"'IBM Plex Mono',monospace", color:"#00E5C9", border:"1px solid rgba(0,229,201,0.35)", padding:"7px 16px", borderRadius:8, background:"rgba(0,229,201,0.06)", cursor:"pointer", whiteSpace:"nowrap" }}>
            ↓ Export CSV
          </button>
        </div>
        </div>

        {/* Summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
          {[
            { label:"TOTAL",    value: summary?.total ?? "—",                           color:"#00E5C9" },
            { label:"PAYMENTS", value: summary?.byType?.payment ?? "—",                color:"#FFB300" },
            { label:"COMPLETE", value: summary?.byType?.task_complete ?? "—",          color:"#7B5EFF" },
            { label:"INIT",     value: summary?.byType?.agent_init ?? "—",             color:"#00E5C9" },
            { label:"NETWORK",  value: "Kite Testnet",                                  color:"#4A7090" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...S.card, padding:"14px 16px" }}>
              <div style={{ fontSize:9, ...S.mono, color:"#4A7090", marginBottom:5, letterSpacing:".1em" }}>{label}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:20, color }}>{loading?"…":String(value)}</div>
            </div>
          ))}
        </div>

        {/* Run filter banner */}
        {runFilter && (
          <div style={{ ...S.card, padding:"10px 16px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid rgba(0,229,201,0.3)" }}>
            <span style={{ fontSize:12, ...S.mono, color:"#00E5C9" }}>Filtered by run: {runFilter.slice(-16)}</span>
            <button onClick={() => setRunFilter(null)} style={{ fontSize:12, ...S.mono, color:"#4A7090", background:"transparent", border:"1px solid #1E3A5F", borderRadius:6, padding:"3px 12px", cursor:"pointer" }}>Clear ×</button>
          </div>
        )}

        {/* Filter pills */}
        <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
          {types.map(t => {
            const meta = TYPE_META[t];
            const active = filter === t;
            const color = meta?.color ?? "#4A7090";
            return (
              <button key={t} onClick={() => setFilter(t)}
                style={{ fontSize:11, ...S.mono, padding:"5px 14px", borderRadius:6, border:`1px solid ${active?`${color}60`:"#1E3A5F"}`, color:active?color:"#4A7090", background:active?`${color}10`:"transparent", cursor:"pointer" }}>
                {meta ? `${meta.icon} ${meta.label}` : "All"} {t !== "all" && summary?.byType?.[t] !== undefined && `(${summary.byType[t]})`}
              </button>
            );
          })}
        </div>

        {/* Layout */}
        <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap:16 }}>
          {/* Timeline */}
          <div style={{ ...S.card, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 200px 80px 80px", borderBottom:"1px solid #1E3A5F" }}>
              {["","ATTESTATION","TX HASH","TYPE","TIME"].map((h,i) => (
                <div key={i} style={{ padding:"10px 12px", fontSize:10, ...S.mono, color:"#4A7090", letterSpacing:".08em" }}>{h}</div>
              ))}
            </div>

            {loading && <div style={{ padding:"24px", textAlign:"center", fontSize:12, ...S.mono, color:"#4A7090" }}>Loading…</div>}
            {!loading && attestations.length === 0 && (
              <div style={{ padding:"40px", textAlign:"center", fontSize:13, color:"#4A7090" }}>
                No attestations yet — run an agent to generate on-chain proofs
              </div>
            )}

            {displayAttestations.map((a, idx) => {
              const meta = TYPE_META[a.type] ?? { icon:"·", color:"#4A7090", label:a.type };
              const isSelected = selected?.id === a.id;
              const prevRun = idx > 0 ? displayAttestations[idx-1].runId : null;
              const newRun = prevRun !== a.runId;

              return (
                <div key={a.id}>
                  {newRun && (
                    <div style={{ padding:"5px 14px", background:"#071018", borderBottom:"1px solid #1E3A5F", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <Link href={`/app/runs/${a.runId}`} style={{ fontSize:10, ...S.mono, color:"#4A7090", textDecoration:"none" }}>
                        RUN: {a.runId} →
                      </Link>
                      <button onClick={() => setRunFilter(r => r === a.runId ? null : a.runId)}
                        style={{ fontSize:9, ...S.mono, color:runFilter===a.runId?"#00E5C9":"#4A7090", background:runFilter===a.runId?"rgba(0,229,201,0.08)":"transparent", border:`1px solid ${runFilter===a.runId?"rgba(0,229,201,0.4)":"#1E3A5F"}`, borderRadius:3, padding:"2px 8px", cursor:"pointer" }}>
                        {runFilter===a.runId ? "✓ filtered" : "filter"}
                      </button>
                    </div>
                  )}
                  <div onClick={() => setSelected(isSelected ? null : a)}
                    style={{ display:"grid", gridTemplateColumns:"40px 1fr 200px 80px 80px", borderBottom:"1px solid #1E3A5F", cursor:"pointer", background:isSelected?`${meta.color}08`:"transparent", borderLeft:`2px solid ${isSelected?meta.color:"transparent"}`, transition:"all .15s" }}
                    onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background="rgba(0,229,201,0.03)"; }}
                    onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.background="transparent"; }}>
                    <div style={{ padding:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:meta.color }}>{meta.icon}</div>
                    <div style={{ padding:"10px 12px", minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:meta.color, marginBottom:2 }}>{meta.label}</div>
                      <div style={{ fontSize:11, ...S.mono, color:"#4A7090", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.metadata ?? a.runId}</div>
                    </div>
                    <div style={{ padding:"10px 12px", alignSelf:"center" }}>
                      {a.txHash ? (
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <a href={a.explorerUrl??`https://testnet.kitescan.ai/tx/${a.txHash}`} target="_blank" rel="noopener noreferrer"
                            onClick={e=>e.stopPropagation()}
                            style={{ fontSize:11, ...S.mono, color:"#7B5EFF", textDecoration:"none" }}>{shortHash(a.txHash)} ↗</a>
                          <button onClick={e => { e.stopPropagation(); copyHash(a.txHash!, a.id); }}
                            style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:copied===a.id?"#7B5EFF":"#4A7090", background:"transparent", border:"1px solid #1E3A5F", borderRadius:3, padding:"1px 5px", cursor:"pointer" }}>
                            {copied===a.id?"✓":"⎘"}
                          </button>
                        </div>
                      ) : <span style={{ fontSize:11, ...S.mono, color:"#2A4060" }}>simulated</span>}
                    </div>
                    <div style={{ padding:"10px 12px", fontSize:10, ...S.mono, color:"#4A7090", alignSelf:"center" }}>
                      <span style={{ color:a.status==="confirmed"?"#7B5EFF":a.status==="simulated"?"#FFB300":"#4A7090" }}>
                        {a.status==="confirmed"?"✓":"⏳"} {a.status}
                      </span>
                    </div>
                    <div style={{ padding:"10px 12px", fontSize:11, ...S.mono, color:"#4A7090", alignSelf:"center" }}>{timeAgo(a.timestamp)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (() => {
            const meta = TYPE_META[selected.type] ?? { icon:"·", color:"#4A7090", label:selected.type };
            const decoded = JSON.stringify({ v:1, app:"nexum", chain:"kite-testnet", runId:selected.runId, type:selected.type, contentHash:selected.contentHash, metadata:selected.metadata, ts:Math.floor(selected.timestamp/1000) }, null, 2);
            return (
              <div style={{ ...S.card, padding:22, alignSelf:"start", position:"sticky" as const, top:80 }}>
                <button onClick={() => setSelected(null)} style={{ fontSize:11, ...S.mono, color:"#4A7090", background:"transparent", border:"none", cursor:"pointer", marginBottom:16, padding:0 }}>← Close</button>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:22, color:meta.color }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:meta.color }}>{meta.label}</div>
                    <div style={{ fontSize:11, ...S.mono, color:"#4A7090" }}>{timeAgo(selected.timestamp)}</div>
                  </div>
                  <span style={{ marginLeft:"auto", fontSize:10, ...S.mono, color:selected.status==="confirmed"?"#7B5EFF":"#FFB300", border:`1px solid ${selected.status==="confirmed"?"rgba(123,94,255,0.3)":"rgba(255,179,0,0.3)"}`, borderRadius:4, padding:"2px 7px" }}>
                    {selected.status==="confirmed"?"✓ CONFIRMED":"⏳ SIMULATED"}
                  </span>
                </div>
                <div style={{ display:"grid", gap:8, marginBottom:16 }}>
                  {[["RUN ID", selected.runId],["ATTESTATION ID", selected.id],["CONTENT HASH", selected.contentHash]].map(([label,value]) => (
                    <div key={label} style={{ background:"#0F172A", border:"1px solid #1E3A5F", borderRadius:6, padding:"8px 12px" }}>
                      <div style={{ fontSize:10, ...S.mono, color:"#4A7090", marginBottom:2 }}>{label}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ fontSize:11, ...S.mono, color:"#B8D4E8", wordBreak:"break-all", flex:1 }}>
                          {value.length > 24 ? `${value.slice(0,12)}…${value.slice(-8)}` : value}
                        </div>
                        <button onClick={() => copyHash(value, label)}
                          style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:copied===label?"#7B5EFF":"#4A7090", background:"transparent", border:"1px solid #1E3A5F", borderRadius:3, padding:"1px 5px", cursor:"pointer", flexShrink:0 }}>
                          {copied===label?"✓":"⎘"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, ...S.mono, color:"#4A7090", marginBottom:6 }}>DECODED TX DATA</div>
                  <pre style={{ background:"#0F172A", border:"1px solid #1E3A5F", borderRadius:8, padding:"12px", fontSize:10, ...S.mono, color:"#B8D4E8", overflowX:"auto", margin:0, lineHeight:1.6 }}>{decoded}</pre>
                </div>
                <div style={{ display:"grid", gap:8 }}>
                  {selected.txHash && (
                    <a href={selected.explorerUrl??`https://testnet.kitescan.ai/tx/${selected.txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ display:"block", textAlign:"center", fontSize:12, ...S.mono, color:"#7B5EFF", border:"1px solid rgba(123,94,255,0.35)", padding:"9px 0", borderRadius:8, textDecoration:"none", background:"rgba(123,94,255,0.06)" }}>
                      ⛓ View on KiteScan ↗
                    </a>
                  )}
                  <Link href={`/app/runs/${selected.runId}`}
                    style={{ display:"block", textAlign:"center", fontSize:12, ...S.mono, color:"#4A7090", border:"1px solid #1E3A5F", padding:"8px 0", borderRadius:8, textDecoration:"none" }}>
                    View full run →
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
