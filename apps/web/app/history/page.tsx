"use client";
import { useState, useEffect, useCallback } from "react";
import AppNav from "../components/AppNav";
import Link from "next/link";
import SpendChart from "../components/SpendChart";
import ServiceStatusStrip from "../components/ServiceStatusStrip";

interface Payment {
  id: string; runId: string; serviceId: string; serviceName: string;
  amount: string; amountDisplay: string; token: string; payTo: string;
  txHash?: string; explorerUrl?: string; status: string; timestamp: number;
  runTask?: string; location?: string;
  origin?: "passport" | "local";
  sessionId?: string;
}
interface Summary { totalSpend: string; spentToday: string; spentMonth: string; count: number; }

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}
function shortHash(h: string) { return `${h.slice(0,10)}…${h.slice(-6)}`; }

const DAILY_BUDGET = 500, MONTHLY_BUDGET = 5000;

export default function History() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"payments"|"overview">("overview");
  const [dateRange, setDateRange] = useState<"7d"|"30d"|"all">("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) return;
      const data = await res.json();
      setPayments(data.payments ?? []);
      setSummary(data.summary ?? null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const S = {
    page: { background:"#0F172A", minHeight:"100vh", fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", color:"#B8D4E8" } as React.CSSProperties,
    card: { background:"#0A2540", border:"1px solid #1E3A5F", borderRadius:12 } as React.CSSProperties,
    mono: { fontFamily:"'IBM Plex Mono',monospace" } as React.CSSProperties,
  };

  const rangeMs = dateRange === "7d" ? 7*86400000 : dateRange === "30d" ? 30*86400000 : Infinity;
  const filteredPayments = payments.filter(p => Date.now() - p.timestamp <= rangeMs);
  const spentToday = parseFloat(summary?.spentToday ?? "0");
  const spentMonth = parseFloat(summary?.spentMonth ?? "0");
  const totalSpend = parseFloat(summary?.totalSpend ?? "0");

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, ...S.mono, color:"#4A7090", letterSpacing:".1em", marginBottom:8 }}>// TRANSACTION HISTORY</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:12 }}>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:28, color:"#F8FAFC" }}>Spend Dashboard</h1>
            <a href="/api/history/export" download
              style={{ fontSize:12, fontFamily:"'IBM Plex Mono',monospace", color:"#00E5C9", border:"1px solid rgba(0,229,201,0.35)", padding:"7px 16px", borderRadius:8, textDecoration:"none", background:"rgba(0,229,201,0.06)", whiteSpace:"nowrap" }}>
              ↓ Export CSV
            </a>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
          {[
            { label:"Total spent", value:loading?"…":`${totalSpend.toFixed(2)} KITE`, sub:`${summary?.count ?? 0} payments`, color:"#00E5C9" },
            { label:"Today", value:loading?"…":`${spentToday.toFixed(2)} KITE`, sub:`${DAILY_BUDGET>0?Math.round(spentToday/DAILY_BUDGET*100):0}% of daily limit`, color: spentToday > DAILY_BUDGET*.8 ? "#FF4D6A" : "#00E5C9" },
            { label:"This month", value:loading?"…":`${spentMonth.toFixed(2)} KITE`, sub:`${MONTHLY_BUDGET>0?Math.round(spentMonth/MONTHLY_BUDGET*100):0}% of monthly limit`, color: spentMonth > MONTHLY_BUDGET*.8 ? "#FF4D6A" : "#7B5EFF" },
            { label:"Payments", value:loading?"…":String(payments.length), sub:"all time", color:"#7B5EFF" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ ...S.card, padding:"18px 20px" }}>
              <div style={{ fontSize:11, ...S.mono, color:"#4A7090", marginBottom:6 }}>{label.toUpperCase()}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:22, color, marginBottom:4 }}>{value}</div>
              <div style={{ fontSize:11, ...S.mono, color:"#4A7090" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Budget bars */}
        <div style={{ ...S.card, padding:"20px 24px", marginBottom:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
          {[{ label:"DAILY BUDGET", spent:spentToday, max:DAILY_BUDGET },{ label:"MONTHLY BUDGET", spent:spentMonth, max:MONTHLY_BUDGET }].map(({ label, spent, max }) => {
            const pct = Math.min(100, Math.round(spent/max*100));
            const color = pct>80?"#FF4D6A":pct>60?"#FFB300":"#00E5C9";
            return (
              <div key={label}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:11, ...S.mono, color:"#4A7090" }}>{label}</span>
                  <span style={{ fontSize:11, ...S.mono, color }}>{spent.toFixed(1)} / {max} KITE</span>
                </div>
                <div style={{ background:"#0F172A", borderRadius:4, height:6, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:4, transition:"width .6s" }} />
                </div>
                <div style={{ fontSize:11, ...S.mono, color:"#4A7090", marginTop:4 }}>{pct}% used</div>
              </div>
            );
          })}
        </div>

        {/* Spend chart */}
        {payments.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SpendChart payments={filteredPayments} />
          </div>
        )}

        {/* Service status */}
        <ServiceStatusStrip />

        {/* Date range pills */}
        <div style={{ display:"flex", gap:6, marginBottom:16, alignItems:"center" }}>
          <span style={{ fontSize:11, ...S.mono, color:"#4A7090" }}>Show:</span>
          {(["7d","30d","all"] as const).map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              style={{ fontSize:11, ...S.mono, padding:"4px 14px", borderRadius:6, border:`1px solid ${dateRange===r?"rgba(0,229,201,0.5)":"#1E3A5F"}`, color:dateRange===r?"#00E5C9":"#4A7090", background:dateRange===r?"rgba(0,229,201,0.07)":"transparent", cursor:"pointer" }}>
              {r === "all" ? "All time" : `Last ${r}`}
            </button>
          ))}
          <span style={{ fontSize:11, ...S.mono, color:"#4A7090", marginLeft:8 }}>
            {filteredPayments.length} payment{filteredPayments.length!==1?"s":""}
          </span>
        </div>

        {/* Tab toggle */}
        <div style={{ display:"flex", gap:4, marginBottom:16 }}>
          {(["overview","payments"] as const).map(t => (
            <button key={t} onClick={() => setView(t)}
              style={{ fontSize:12, ...S.mono, padding:"6px 16px", borderRadius:6, border:`1px solid ${view===t?"rgba(0,229,201,0.5)":"#1E3A5F"}`, color:view===t?"#00E5C9":"#4A7090", background:view===t?"rgba(0,229,201,0.07)":"transparent", cursor:"pointer" }}>
              {t === "overview" ? "Overview" : `All Payments (${payments.length})`}
            </button>
          ))}
        </div>

        {/* Overview — group by service */}
        {view === "overview" && (
          <div style={{ display:"grid", gap:12 }}>
            {(() => {
              const byService = filteredPayments.reduce((acc, p) => {
                const key = p.serviceName;
                if (!acc[key]) acc[key] = { name:key, id:p.serviceId, count:0, total:0, latest:0 };
                acc[key].count++;
                acc[key].total += parseFloat(p.amountDisplay?.split(" ")[0]??"0");
                if (p.timestamp > acc[key].latest) acc[key].latest = p.timestamp;
                return acc;
              }, {} as Record<string,{name:string;id:string;count:number;total:number;latest:number}>);
              return Object.values(byService).sort((a,b) => b.total-a.total).map(svc => (
                <div key={svc.id} style={{ ...S.card, padding:"16px 20px", display:"grid", gridTemplateColumns:"1fr 120px 100px 100px", alignItems:"center", gap:16 }}>
                  <div>
                    <div style={{ fontSize:14, color:"#F8FAFC", fontWeight:500, marginBottom:2 }}>{svc.name}</div>
                    <div style={{ fontSize:11, ...S.mono, color:"#4A7090" }}>last: {timeAgo(svc.latest)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, ...S.mono, color:"#4A7090", marginBottom:2 }}>CALLS</div>
                    <div style={{ fontSize:15, ...S.mono, color:"#B8D4E8", fontWeight:600 }}>{svc.count}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, ...S.mono, color:"#4A7090", marginBottom:2 }}>TOTAL SPEND</div>
                    <div style={{ fontSize:15, ...S.mono, color:"#00E5C9", fontWeight:600 }}>{svc.total.toFixed(2)} KITE</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <Link href={`/marketplace`} style={{ fontSize:12, ...S.mono, color:"#4A7090", textDecoration:"none" }}>View service →</Link>
                  </div>
                </div>
              ));
            })()}
            {payments.length === 0 && !loading && (
              <div style={{ ...S.card, padding:"40px", textAlign:"center" }}>
                <div style={{ fontSize:24, color:"#4A7090", marginBottom:10 }}>⚡</div>
                <div style={{ fontSize:13, color:"#4A7090" }}>No payments yet — run an agent to see history</div>
              </div>
            )}
          </div>
        )}

        {/* Full payments list */}
        {view === "payments" && (
          <div style={{ ...S.card, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 160px 120px 80px 160px", borderBottom:"1px solid #1E3A5F" }}>
              {["SERVICE","AMOUNT","RUN","STATUS","TX HASH"].map((h,i) => (
                <div key={i} style={{ padding:"10px 16px", fontSize:10, ...S.mono, color:"#4A7090", letterSpacing:".08em" }}>{h}</div>
              ))}
            </div>
            {loading && (
              <div style={{ padding:"24px", textAlign:"center", fontSize:12, ...S.mono, color:"#4A7090" }}>Loading…</div>
            )}
            {!loading && payments.length === 0 && (
              <div style={{ padding:"40px", textAlign:"center", fontSize:13, color:"#4A7090" }}>No payments recorded yet</div>
            )}
            {filteredPayments.map((p,i) => (
              <div key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr 160px 120px 80px 160px", borderBottom:i<payments.length-1?"1px solid #1E3A5F":"none", transition:"background .15s" }}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(0,229,201,0.03)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                <div style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, color:"#F8FAFC" }}>{p.serviceName}</span>
                    {p.origin === "passport" && (
                      <span title={p.sessionId ? `Passport session ${p.sessionId}` : "Paid via Kite Passport"}
                        style={{ fontSize:9, ...S.mono, color:"#00E5C9", letterSpacing:".06em",
                          padding:"1px 6px", border:"1px solid rgba(0,229,201,0.35)", borderRadius:3,
                          background:"rgba(0,229,201,0.06)" }}>
                        ⛨ PASSPORT
                      </span>
                    )}
                    {p.origin === "local" && (
                      <span title="Paid by local agent wallet (legacy x402)"
                        style={{ fontSize:9, ...S.mono, color:"#7B5EFF", letterSpacing:".06em",
                          padding:"1px 6px", border:"1px solid rgba(123,94,255,0.35)", borderRadius:3,
                          background:"rgba(123,94,255,0.06)" }}>
                        ◈ LOCAL
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:11, ...S.mono, color:"#4A7090" }}>{timeAgo(p.timestamp)}</div>
                </div>
                <div style={{ padding:"12px 16px", fontSize:13, ...S.mono, color:"#00E5C9", alignSelf:"center" }}>{p.amountDisplay}</div>
                <div style={{ padding:"12px 16px", alignSelf:"center" }}>
                  <Link href={`/app/runs/${p.runId}`} style={{ fontSize:11, ...S.mono, color:"#4A7090", textDecoration:"none" }}>
                    {p.runId.slice(-10)} →
                  </Link>
                </div>
                <div style={{ padding:"12px 16px", fontSize:11, ...S.mono, color:"#7B5EFF", alignSelf:"center" }}>✓ {p.status}</div>
                <div style={{ padding:"12px 16px", alignSelf:"center" }}>
                  {p.txHash ? (
                    <a href={p.explorerUrl??`https://testnet.kitescan.ai/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:11, ...S.mono, color:"#7B5EFF", textDecoration:"none" }}>{shortHash(p.txHash)} ↗</a>
                  ) : <span style={{ fontSize:11, ...S.mono, color:"#2A4060" }}>—</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
