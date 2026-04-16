"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppNav from "../../../components/AppNav";
import Link from "next/link";
import type { StoredRun } from "../../../../lib/store";

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  agent_init:    { icon: "◈", color: "#00E5C9", label: "Agent Init" },
  task_start:    { icon: "▶", color: "#00E5C9", label: "Task Start" },
  payment:       { icon: "⚡", color: "#FFB300", label: "Payment" },
  task_complete: { icon: "✓", color: "#7B5EFF", label: "Complete" },
};

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function shortHash(h: string) { return `${h.slice(0, 12)}…${h.slice(-6)}`; }

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<StoredRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "payments" | "attestations" | "brief">("overview");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/runs/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("Run not found"))
      .then(setRun)
      .catch(() => setError("Run not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this run? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/runs/${id}`, { method: "DELETE" });
      router.push("/app/runs");
    } catch {
      setDeleting(false);
    }
  }, [id, router]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/app/runs/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [id]);

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "monospace" } as React.CSSProperties,
  };

  if (loading) return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 28, color: "#00E5C9", marginBottom: 12, animation: "spin 2s linear infinite", display: "inline-block" }}>◈</div>
        <div style={{ fontSize: 13, ...S.mono, color: "#4A7090" }}>Loading run…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !run) return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, color: "#FF4D6A", marginBottom: 12 }}>✗</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#F8FAFC", marginBottom: 8 }}>Run not found</div>
        <Link href="/app" style={{ fontSize: 13, ...S.mono, color: "#00E5C9", textDecoration: "none" }}>← Back to dashboard</Link>
      </div>
    </div>
  );

  const statusColor = run.status === "complete" ? "#7B5EFF" : run.status === "error" ? "#FF4D6A" : "#FFB300";
  const totalPaid = run.payments.reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/app" style={{ fontSize: 12, ...S.mono, color: "#4A7090", textDecoration: "none" }}>Dashboard</Link>
          <span style={{ fontSize: 12, ...S.mono, color: "#2A4060", margin: "0 8px" }}>›</span>
          <span style={{ fontSize: 12, ...S.mono, color: "#B8D4E8" }}>Run detail</span>
        </div>

        {/* Header */}
        <div style={{ ...S.card, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginBottom: 6 }}>{run.id}</div>
              <div style={{ fontSize: 18, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F8FAFC", lineHeight: 1.4 }}>{run.task}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
              <div style={{ fontSize: 12, ...S.mono, color: statusColor, border: `1px solid ${statusColor}40`, background: `${statusColor}10`, borderRadius: 6, padding: "5px 12px" }}>
                {run.status === "complete" ? "✓" : run.status === "error" ? "✗" : "●"} {run.status.toUpperCase()}
              </div>
<Link href={`/app?task=${encodeURIComponent(run.task)}&location=${encodeURIComponent(run.location)}`}
                style={{ fontSize: 11, ...S.mono, color: "#00E5C9", border: "1px solid rgba(0,229,201,0.35)", background: "rgba(0,229,201,0.06)", borderRadius: 6, padding: "5px 12px", textDecoration: "none" }}>
                ↺ Re-run
              </Link>
              <button onClick={handleShare}
                style={{ fontSize: 11, ...S.mono, color: copied ? "#7B5EFF" : "#4A7090", border: `1px solid ${copied ? "rgba(123,94,255,0.4)" : "#1E3A5F"}`, background: copied ? "rgba(123,94,255,0.08)" : "transparent", borderRadius: 6, padding: "5px 12px", cursor: "pointer", transition: "all .2s" }}>
                {copied ? "✓ Copied!" : "⎘ Share"}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ fontSize: 11, ...S.mono, color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.3)", background: "rgba(255,77,106,0.06)", borderRadius: 6, padding: "5px 12px", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.5 : 1 }}>
                {deleting ? "…" : "✗ Delete"}
              </button>
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {[
              { label: "AGENT", value: run.agentAddress ? `${run.agentAddress.slice(0, 8)}…${run.agentAddress.slice(-6)}` : "—" },
              { label: "LOCATION", value: run.location },
              { label: "DURATION", value: run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—" },
              { label: "PAYMENTS", value: `${run.payments.length}` },
              { label: "SPEND", value: `${totalPaid.toFixed(4)} KITE` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, ...S.mono, color: "#B8D4E8", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Payments */}
          <div style={{ ...S.card, padding: 20 }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 14 }}>// PAYMENTS ({run.payments.length})</div>
            {run.payments.length === 0 ? (
              <div style={{ fontSize: 12, color: "#4A7090", textAlign: "center", padding: "20px 0" }}>No payments recorded</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {run.payments.map((p, i) => {
                  const runningTotal = run.payments
                    .slice(0, i + 1)
                    .reduce((s, x) => s + parseFloat(x.amountDisplay?.split(" ")[0] ?? "0"), 0);
                  return (
                    <div key={p.id} style={{ background: "#0F172A", border: "1px solid rgba(0,229,201,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#F8FAFC", fontWeight: 500, marginBottom: 2 }}>{p.serviceName}</div>
                          <div style={{ fontSize: 10, ...S.mono, color: "#4A7090" }}>Payment {i + 1} of {run.payments.length} · cumulative: {runningTotal.toFixed(4)} KITE</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, ...S.mono, color: "#00E5C9", marginBottom: 2 }}>{p.amountDisplay}</div>
                          <div style={{ fontSize: 10, ...S.mono, color: "#7B5EFF" }}>✓ {p.status}</div>
                        </div>
                      </div>
                      {p.txHash && (
                        <div style={{ paddingTop: 6, borderTop: "1px solid #1E3A5F", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, ...S.mono, color: "#4A7090" }}>Kite chain settlement</span>
                          <a href={p.explorerUrl ?? `https://testnet.kitescan.ai/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, ...S.mono, color: "#7B5EFF", textDecoration: "none" }}>{shortHash(p.txHash)} ↗</a>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #1E3A5F" }}>
                  <span style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>Total</span>
                  <span style={{ fontSize: 13, ...S.mono, color: "#00E5C9", fontWeight: 600 }}>{totalPaid.toFixed(4)} KITE</span>
                </div>
              </div>
            )}
          </div>

          {/* Attestations */}
          <div style={{ ...S.card, padding: 20 }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 14 }}>// ATTESTATIONS ({run.attestations.length})</div>
            {run.attestations.length === 0 ? (
              <div style={{ fontSize: 12, color: "#4A7090", textAlign: "center", padding: "20px 0" }}>No attestations yet</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {run.attestations.map((a) => {
                  const meta = TYPE_META[a.type] ?? { icon: "·", color: "#4A7090", label: a.type };
                  return (
                    <div key={a.id} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: meta.color, fontSize: 12 }}>{meta.icon}</span>
                          <span style={{ fontSize: 12, color: meta.color, fontWeight: 500 }}>{meta.label}</span>
                        </div>
                        <span style={{ fontSize: 10, ...S.mono, color: "#7B5EFF" }}>{a.status === "confirmed" ? "✓ confirmed" : "⏳ pending"}</span>
                      </div>
                      {a.txHash && (
                        <a href={a.explorerUrl ?? `https://testnet.kitescan.ai/tx/${a.txHash}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 10, ...S.mono, color: "#7B5EFF", textDecoration: "none" }}>⛓ {shortHash(a.txHash)} ↗</a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Intelligence brief */}
        {run.result && (
          <div style={{ ...S.card, padding: 24, border: "1px solid rgba(123,94,255,0.25)" }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#7B5EFF", letterSpacing: ".1em", marginBottom: 16 }}>// INTELLIGENCE BRIEF</div>
            <div style={{ display: "grid", gap: 14 }}>
              {run.result.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "#B8D4E8", margin: 0 }}>{para}</p>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1E3A5F", display: "flex", gap: 10, flexWrap: "wrap" }}>
              {run.attestations.filter(a => a.type === "task_complete").map(a => (
                a.txHash && (
                  <a key={a.id} href={a.explorerUrl ?? `https://testnet.kitescan.ai/tx/${a.txHash}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, ...S.mono, color: "#7B5EFF", border: "1px solid rgba(123,94,255,0.35)", padding: "7px 16px", borderRadius: 8, textDecoration: "none", background: "rgba(123,94,255,0.06)" }}>
                    ⛓ Verify on KiteScan ↗
                  </a>
                )
              ))}
              <Link href="/app" style={{ fontSize: 12, ...S.mono, color: "#4A7090", border: "1px solid #1E3A5F", padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>
                ← New run
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
