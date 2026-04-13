"use client";
import { useState, useEffect, useCallback } from "react";
import AppNav from "../components/AppNav";
import Link from "next/link";
import ServiceStatusStrip from "../components/ServiceStatusStrip";

interface Service {
  id: string; name: string; description: string; category: string;
  billing: string; priceDisplay: string; endpoint: string;
  payTo: string; tags: string[]; uptime: number; latency: number; live: boolean;
}

const CATEGORIES = ["All", "data", "finance", "ai", "identity", "compute"];
const BILLING_COLORS: Record<string, string> = { "per-call": "#00E5C9", "usage-based": "#7B5EFF", "subscription": "#FFB300" };
const CAT_COLORS: Record<string, string> = { data: "#00E5C9", finance: "#7B5EFF", ai: "#A78BFA", identity: "#FFB300", compute: "#FB923C" };

function UptimeDots({ pct }: { pct: number }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i < Math.round(pct / 10) ? "#00E5C9" : "#1E3A5F" }} />
      ))}
    </div>
  );
}

export default function Marketplace() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (cat !== "All") params.set("category", cat);
      if (search.length >= 2) params.set("q", search);
      const res = await fetch(`/api/services?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setServices(data.services ?? []);
    } catch {} finally { setLoading(false); }
  }, [cat, search]);

  useEffect(() => { load(); }, [load]);

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "'IBM Plex Mono',monospace" } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 8 }}>// SERVICE MARKETPLACE</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#F8FAFC", marginBottom: 6 }}>Kite Service Registry</h1>
          <p style={{ fontSize: 13, color: "#4A7090" }}>Browse x402-compatible APIs. Dispatch an agent to purchase any service autonomously.</p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…"
            style={{ ...S.mono, fontSize: 12, padding: "8px 14px", background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 8, color: "#B8D4E8", outline: "none", width: 220 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ fontSize: 12, ...S.mono, padding: "6px 14px", borderRadius: 6, border: `1px solid ${cat === c ? "rgba(0,229,201,0.5)" : "#1E3A5F"}`, color: cat === c ? "#00E5C9" : "#4A7090", background: cat === c ? "rgba(0,229,201,0.08)" : "transparent", cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, ...S.mono, color: "#4A7090", marginLeft: "auto" }}>
            {loading ? "…" : `${services.length} service${services.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Status strip */}
        <ServiceStatusStrip />

        {/* Grid + detail panel */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${selected ? 2 : 3}, 1fr)`, gap: 16, alignContent: "start" }}>

            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ ...S.card, padding: 20, minHeight: 160, opacity: 0.4, background: "#0A2540" }} />
            ))}

            {!loading && services.map(svc => (
              <div key={svc.id} onClick={() => setSelected(svc === selected ? null : svc)}
                style={{ ...S.card, padding: 20, cursor: "pointer", transition: "border-color .2s", borderColor: selected?.id === svc.id ? "rgba(0,229,201,0.5)" : "#1E3A5F" }}
                onMouseEnter={e => { if (selected?.id !== svc.id) e.currentTarget.style.borderColor = "#2A4060"; }}
                onMouseLeave={e => { if (selected?.id !== svc.id) e.currentTarget.style.borderColor = "#1E3A5F"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, ...S.mono, color: CAT_COLORS[svc.category] ?? "#B8D4E8", background: `${CAT_COLORS[svc.category] ?? "#B8D4E8"}15`, border: `1px solid ${CAT_COLORS[svc.category] ?? "#B8D4E8"}30`, borderRadius: 4, padding: "2px 7px" }}>{svc.category}</span>
                  {svc.live && <span style={{ fontSize: 10, ...S.mono, color: "#00E5C9", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E5C9", boxShadow: "0 0 6px #00E5C9", display: "inline-block" }} />LIVE</span>}
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#F8FAFC", marginBottom: 6 }}>{svc.name}</div>
                <div style={{ fontSize: 12, color: "#4A7090", lineHeight: 1.5, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{svc.description}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: BILLING_COLORS[svc.billing] ?? "#B8D4E8", ...S.mono }}>{svc.priceDisplay}</span>
                  <span style={{ fontSize: 10, color: "#4A7090", ...S.mono }}>{svc.billing}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {svc.tags.map(t => <span key={t} style={{ fontSize: 10, ...S.mono, color: "#4A7090", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 3, padding: "1px 6px" }}>{t}</span>)}
                </div>
              </div>
            ))}

            {!loading && services.length === 0 && (
              <div style={{ gridColumn: "1/-1", ...S.card, padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: 24, color: "#4A7090", marginBottom: 10 }}>◎</div>
                <div style={{ fontSize: 13, color: "#4A7090" }}>No services found</div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ ...S.card, padding: 24, alignSelf: "start", position: "sticky" as const, top: 80 }}>
              <button onClick={() => setSelected(null)} style={{ fontSize: 11, ...S.mono, color: "#4A7090", background: "transparent", border: "none", cursor: "pointer", marginBottom: 16, padding: 0 }}>← Close</button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <span style={{ fontSize: 10, ...S.mono, color: CAT_COLORS[selected.category] ?? "#B8D4E8", background: `${CAT_COLORS[selected.category] ?? "#B8D4E8"}15`, border: `1px solid ${CAT_COLORS[selected.category] ?? "#B8D4E8"}30`, borderRadius: 4, padding: "2px 7px" }}>{selected.category}</span>
                {selected.live && <span style={{ fontSize: 10, ...S.mono, color: "#00E5C9" }}>● LIVE x402</span>}
              </div>

              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: "#F8FAFC", marginBottom: 8 }}>{selected.name}</div>
              <div style={{ fontSize: 13, color: "#4A7090", lineHeight: 1.65, marginBottom: 20 }}>{selected.description}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[["Price", selected.priceDisplay], ["Billing", selected.billing], ["Uptime", selected.uptime + "%"], ["Latency", selected.latency + "ms"]].map(([l, v]) => (
                  <div key={l} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 13, ...S.mono, color: "#B8D4E8", fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 6 }}>UPTIME (30d)</div>
                <UptimeDots pct={selected.uptime} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>ENDPOINT</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#00E5C9", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 6, padding: "8px 10px", wordBreak: "break-all" as const }}>{selected.endpoint}</div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>PAYEE WALLET</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", wordBreak: "break-all" as const }}>{selected.payTo}</div>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
                <Link href={`/app?service=${selected.id}`}
                  style={{ display: "block", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#0F172A", background: "#00E5C9", padding: "11px 0", borderRadius: 8, textDecoration: "none" }}>
                  Dispatch Agent →
                </Link>
                <a href={`https://testnet.kitescan.ai/address/${selected.payTo}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", fontSize: 12, ...S.mono, color: "#7B5EFF", border: "1px solid rgba(123,94,255,0.35)", padding: "8px 0", borderRadius: 8, textDecoration: "none", background: "rgba(123,94,255,0.06)" }}>
                  ⛓ View payee on KiteScan ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
