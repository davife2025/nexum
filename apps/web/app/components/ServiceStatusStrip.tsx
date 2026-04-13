"use client";
import { useState, useEffect, useCallback } from "react";

interface ServiceStatus {
  id: string;
  name: string;
  status: "live" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  requires402: boolean;
}
interface Summary {
  total: number; live: number; degraded: number; down: number;
  avgLatencyMs: number; overallStatus: string;
}

const STATUS_COLOR: Record<string, string> = {
  live: "#00E5C9", degraded: "#FFB300", down: "#FF4D6A", unknown: "#4A7090",
};
const STATUS_LABEL: Record<string, string> = {
  operational: "All systems operational",
  degraded: "Degraded performance",
  partial: "Partial outage",
};

export default function ServiceStatusStrip() {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();
      setStatuses(data.services ?? []);
      setSummary(data.summary ?? null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [check]);

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };
  const overallColor = summary ? STATUS_COLOR[summary.overallStatus === "operational" ? "live" : summary.overallStatus === "degraded" ? "degraded" : "down"] : "#4A7090";

  return (
    <div style={{ border: "1px solid #1E3A5F", borderRadius: 10, overflow: "hidden", background: "#0A2540", marginTop: 16 }}>
      {/* Header bar */}
      <button onClick={() => setExpanded(e => !e)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: overallColor, boxShadow: `0 0 8px ${overallColor}`, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 12, ...mono, color: overallColor }}>
            {loading ? "Checking services…" : summary ? STATUS_LABEL[summary.overallStatus] ?? summary.overallStatus : "Unknown"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {summary && !loading && (
            <>
              <span style={{ fontSize: 11, ...mono, color: "#4A7090" }}>
                {summary.live}/{summary.total} live
              </span>
              {summary.avgLatencyMs > 0 && (
                <span style={{ fontSize: 11, ...mono, color: "#4A7090" }}>
                  avg {summary.avgLatencyMs}ms
                </span>
              )}
            </>
          )}
          <span style={{ fontSize: 11, color: "#4A7090" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded rows */}
      {expanded && (
        <div style={{ borderTop: "1px solid #1E3A5F" }}>
          {loading && (
            <div style={{ padding: "16px", textAlign: "center", fontSize: 12, ...mono, color: "#4A7090" }}>
              Pinging services…
            </div>
          )}
          {statuses.map((svc, i) => (
            <div key={svc.id} style={{ display: "grid", gridTemplateColumns: "10px 1fr 80px 80px", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < statuses.length - 1 ? "1px solid #1E3A5F" : "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[svc.status], display: "inline-block", boxShadow: svc.status === "live" ? `0 0 6px ${STATUS_COLOR.live}` : "none" }} />
              <div>
                <span style={{ fontSize: 13, color: "#F8FAFC" }}>{svc.name}</span>
                {svc.requires402 && (
                  <span style={{ marginLeft: 8, fontSize: 10, ...mono, color: "#00E5C9", border: "1px solid rgba(0,229,201,0.3)", borderRadius: 3, padding: "1px 5px" }}>x402</span>
                )}
              </div>
              <span style={{ fontSize: 11, ...mono, color: STATUS_COLOR[svc.status], textAlign: "right" }}>
                {svc.status}
              </span>
              <span style={{ fontSize: 11, ...mono, color: "#4A7090", textAlign: "right" }}>
                {svc.latencyMs !== null ? `${svc.latencyMs}ms` : "—"}
              </span>
            </div>
          ))}
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1E3A5F" }}>
            <span style={{ fontSize: 10, ...mono, color: "#2A4060" }}>Auto-refreshes every 30s</span>
            <button onClick={check} style={{ fontSize: 10, ...mono, color: "#4A7090", background: "transparent", border: "1px solid #1E3A5F", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>↻ Refresh</button>
          </div>
        </div>
      )}
    </div>
  );
}
