"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { StoredRun } from "../../lib/store";

interface Stats {
  totalRuns: number;
  completeRuns: number;
  totalPayments: number;
  totalSpend: string;
  avgDurationMs: number;
}

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function StatusDot({ status }: { status: string }) {
  const color = status === "complete" ? "#7B5EFF" : status === "error" ? "#FF4D6A" : "#FFB300";
  const pulse = status === "running";
  return (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: pulse ? `0 0 8px ${color}` : "none", display: "inline-block", animation: pulse ? "pulseGlow 1.2s ease-in-out infinite" : "none" }} />
  );
}

export default function RunsMonitor() {
  const [runs, setRuns] = useState<StoredRun[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/runs");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRuns(data.runs ?? []);
      setStats(data.stats ?? null);
      setError(false);
      setLastRefresh(Date.now());
    } catch { setError(true); } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000); // auto-refresh every 5s
    return () => clearInterval(t);
  }, [refresh]);

  const S = {
    mono: { fontFamily: "monospace" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 10 } as React.CSSProperties,
  };

  if (loading) return (
    <div style={{ padding: "32px 0", textAlign: "center", fontSize: 12, ...S.mono, color: "#4A7090" }}>Loading runs…</div>
  );

  if (error) return (
    <div style={{ padding: "24px", textAlign: "center" }}>
      <div style={{ fontSize: 13, color: "#FF4D6A", marginBottom: 12 }}>Failed to load runs</div>
      <button onClick={refresh} style={{ fontSize: 12, ...S.mono, color: "#00E5C9", background: "transparent", border: "1px solid rgba(0,229,201,0.35)", borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Retry</button>
    </div>
  );

  return (
    <div>
      {/* Stats row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "TOTAL RUNS", value: stats.totalRuns, color: "#00E5C9" },
            { label: "COMPLETE", value: stats.completeRuns, color: "#7B5EFF" },
            { label: "PAYMENTS", value: stats.totalPayments, color: "#FFB300" },
            { label: "TOTAL SPEND", value: `${stats.totalSpend} KITE`, color: "#00E5C9" },
            { label: "AVG DURATION", value: stats.avgDurationMs ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : "—", color: "#4A7090" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...S.card, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, ...S.mono, color: "#4A7090", marginBottom: 5, letterSpacing: ".1em" }}>{label}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em" }}>// RECENT RUNS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, ...S.mono, color: "#2A4060" }}>auto-refresh · updated {timeAgo(lastRefresh)}</span>
          <button onClick={refresh} style={{ fontSize: 10, ...S.mono, color: "#4A7090", background: "transparent", border: "1px solid #1E3A5F", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>↻</button>
        </div>
      </div>

      {/* Runs list */}
      {runs.length === 0 ? (
        <div style={{ ...S.card, padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: 24, color: "#00E5C9", marginBottom: 10 }}>◈</div>
          <div style={{ fontSize: 13, color: "#4A7090" }}>No runs yet — execute your first task above</div>
        </div>
      ) : (
        <div style={{ ...S.card, overflow: "hidden" }}>
          {runs.slice(0, 10).map((run, i) => {
            const paid = run.payments.reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);
            return (
              <Link key={run.id} href={`/app/runs/${run.id}`}
                style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 90px 70px 60px", alignItems: "center", gap: 0, padding: "12px 16px", borderBottom: i < runs.length - 1 ? "1px solid #1E3A5F" : "none", textDecoration: "none", transition: "background .15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,229,201,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <StatusDot status={run.status} />
                <div style={{ paddingLeft: 10, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#F8FAFC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>{run.task}</div>
                  <div style={{ fontSize: 10, ...S.mono, color: "#4A7090" }}>{run.id.slice(-16)} · {run.location}</div>
                </div>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", textAlign: "right" }}>{timeAgo(run.startedAt)}</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#00E5C9", textAlign: "right" }}>{paid > 0 ? `${paid.toFixed(2)} KITE` : "—"}</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#7B5EFF", textAlign: "right" }}>{run.payments.length} tx</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", textAlign: "right" }}>→</div>
              </Link>
            );
          })}
        </div>
      )}

      {runs.length > 10 && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <Link href="/app/runs" style={{ fontSize: 12, ...S.mono, color: "#4A7090", textDecoration: "none" }}>View all {runs.length} runs →</Link>
        </div>
      )}
      <style>{`@keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
