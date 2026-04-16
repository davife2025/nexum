"use client";
import { useState, useEffect, useCallback } from "react";
import AppNav from "../../components/AppNav";
import Link from "next/link";
import type { StoredRun } from "../../../lib/store";


interface Stats {
  totalRuns: number; completeRuns: number;
  totalPayments: number; totalSpend: string; avgDurationMs: number;
}

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

const STATUS_COLOR: Record<string,string> = {
  complete: "#7B5EFF", running: "#00E5C9", error: "#FF4D6A"
};

export default function RunsList() {
  const [runs, setRuns] = useState<StoredRun[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all"|"complete"|"running"|"error">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/runs");
      if (!res.ok) return;
      const data = await res.json();
      setRuns(data.runs ?? []);
      setStats(data.stats ?? null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]);

  const filtered = runs.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.task.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase()) && !r.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const S = {
    page: { background:"#0F172A", minHeight:"100vh", fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", color:"#B8D4E8" } as React.CSSProperties,
    card: { background:"#0A2540", border:"1px solid #1E3A5F", borderRadius:12 } as React.CSSProperties,
    mono: { fontFamily:"'IBM Plex Mono',monospace" } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:11, ...S.mono, color:"#4A7090", letterSpacing:".1em", marginBottom:8 }}>// AGENT RUNS</div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:28, color:"#F8FAFC" }}>All Runs</h1>
          </div>
          <Link href="/app" style={{ fontSize:13, color:"#00E5C9", border:"1px solid rgba(0,229,201,0.35)", padding:"8px 20px", borderRadius:8, textDecoration:"none", background:"rgba(0,229,201,0.06)", ...S.mono }}>
            + New Run
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
            {[
              { label:"TOTAL", value:stats.totalRuns, color:"#00E5C9" },
              { label:"COMPLETE", value:stats.completeRuns, color:"#7B5EFF" },
              { label:"PAYMENTS", value:stats.totalPayments, color:"#FFB300" },
              { label:"SPENT", value:`${stats.totalSpend} KITE`, color:"#00E5C9" },
              { label:"AVG TIME", value:stats.avgDurationMs ? `${(stats.avgDurationMs/1000).toFixed(1)}s` : "—", color:"#4A7090" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...S.card, padding:"14px 18px" }}>
                <div style={{ fontSize:9, ...S.mono, color:"#4A7090", marginBottom:5, letterSpacing:".1em" }}>{label}</div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:20, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display:"flex", gap:12, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search runs…"
            style={{ ...S.mono, fontSize:12, padding:"7px 14px", background:"#0A2540", border:"1px solid #1E3A5F", borderRadius:8, color:"#B8D4E8", outline:"none", width:200 }} />
          <div style={{ display:"flex", gap:6 }}>
            {(["all","complete","running","error"] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                style={{ fontSize:11, ...S.mono, padding:"5px 14px", borderRadius:6, border:`1px solid ${filter===s?(STATUS_COLOR[s]??"rgba(0,229,201,0.5)"):"#1E3A5F"}`, color:filter===s?(STATUS_COLOR[s]??"#00E5C9"):"#4A7090", background:filter===s?`${STATUS_COLOR[s]??""  }18`:"transparent", cursor:"pointer" }}>
                {s}
              </button>
            ))}
          </div>
          <span style={{ fontSize:12, ...S.mono, color:"#4A7090", marginLeft:"auto" }}>{filtered.length} run{filtered.length!==1?"s":""}</span>
        </div>

        {/* Table */}
        <div style={{ ...S.card, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 120px 80px 80px 70px 100px", borderBottom:"1px solid #1E3A5F" }}>
            {["","TASK","LOCATION","DURATION","PAYMENTS","SPEND","TIME"].map((h,i) => (
              <div key={i} style={{ padding:"10px 12px", fontSize:10, ...S.mono, color:"#4A7090", letterSpacing:".08em" }}>{h}</div>
            ))}
          </div>

          {loading && <div style={{ padding:"24px", textAlign:"center", fontSize:12, ...S.mono, color:"#4A7090" }}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding:"48px", textAlign:"center" }}>
              <div style={{ fontSize:24, color:"#4A7090", marginBottom:12 }}>◈</div>
              <div style={{ fontSize:13, color:"#4A7090", marginBottom:16 }}>{search ? `No runs matching "${search}"` : "No runs yet"}</div>
              <Link href="/app" style={{ fontSize:13, ...S.mono, color:"#00E5C9", textDecoration:"none" }}>Run your first agent →</Link>
            </div>
          )}

          {filtered.map((run, i) => {
            const paid = run.payments.reduce((s,p) => s + parseFloat(p.amountDisplay?.split(" ")[0]??"0"), 0);
            const statusColor = STATUS_COLOR[run.status] ?? "#4A7090";
            return (
              <Link key={run.id} href={`/app/runs/${run.id}`}
                style={{ display:"grid", gridTemplateColumns:"28px 1fr 120px 80px 80px 70px 100px", borderBottom:i<filtered.length-1?"1px solid #1E3A5F":"none", textDecoration:"none", transition:"background .15s", alignItems:"center" }}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(0,229,201,0.03)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                <div style={{ padding:"14px 12px", display:"flex", justifyContent:"center" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:statusColor, boxShadow:`0 0 6px ${statusColor}`, display:"inline-block", opacity: run.status==="running" ? 1 : 0.7 }} />
                </div>
                <div style={{ padding:"12px 12px", minWidth:0 }}>
                  <div style={{ fontSize:13, color:"#F8FAFC", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3 }}>{run.task}</div>
                  <div style={{ fontSize:10, ...S.mono, color:"#4A7090" }}>{run.id.slice(-16)}</div>
                </div>
                <div style={{ padding:"12px", fontSize:12, ...S.mono, color:"#4A7090" }}>{run.location || "—"}</div>
                <div style={{ padding:"12px", fontSize:12, ...S.mono, color:"#4A7090" }}>
                  {run.durationMs ? `${(run.durationMs/1000).toFixed(1)}s` : run.status==="running" ? <span style={{color:"#00E5C9"}}>live</span> : "—"}
                </div>
                <div style={{ padding:"12px", fontSize:12, ...S.mono, color:"#7B5EFF" }}>{run.payments.length}</div>
                <div style={{ padding:"12px", fontSize:12, ...S.mono, color:"#00E5C9" }}>{paid > 0 ? `${paid.toFixed(2)}` : "—"}</div>
                <div style={{ padding:"12px", fontSize:11, ...S.mono, color:"#4A7090" }}>{timeAgo(run.startedAt)}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
