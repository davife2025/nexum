"use client";
import { useState } from "react";
import AppNav from "../components/AppNav";
import Link from "next/link";

const CATEGORIES = ["All", "Data", "Finance", "AI", "Identity", "Compute"];

const SERVICES = [
  { id: "kite-weather", name: "Kite Weather API", category: "Data", billing: "per-call", price: "~1 KITE", desc: "Real-time weather, temperature, humidity and conditions for any global city. Live x402 endpoint on Kite testnet.", tags: ["weather","real-time","IoT"], uptime: 99.9, latency: 200, live: true, endpoint: "x402.dev.gokite.ai/api/weather", payTo: "0x4A50DCA6…F19" },
  { id: "nexum-finance", name: "Nexum Finance Oracle", category: "Finance", billing: "per-call", price: "~5 KITE", desc: "DeFi protocol TVL, yield rates, and cross-chain liquidity data. Updated every 60 seconds from on-chain sources.", tags: ["DeFi","TVL","yield"], uptime: 99.5, latency: 400, live: false, endpoint: "x402.dev.gokite.ai/api/finance", payTo: "0x4A50DCA6…F19" },
  { id: "nexum-ai", name: "Nexum AI Inference", category: "AI", billing: "usage-based", price: "~2 KITE/1k tokens", desc: "Pay-per-token LLM inference on Kite chain. Usage-based billing settled on-chain after each call.", tags: ["LLM","inference","compute"], uptime: 99.0, latency: 800, live: false, endpoint: "x402.dev.gokite.ai/api/inference", payTo: "0x4A50DCA6…F19" },
  { id: "kite-identity", name: "Kite Identity Verifier", category: "Identity", billing: "per-call", price: "~0.5 KITE", desc: "On-chain identity and reputation lookup via Kite Passport. Returns KYC status and agent reputation score.", tags: ["KYC","passport","reputation"], uptime: 99.9, latency: 150, live: false, endpoint: "x402.dev.gokite.ai/api/identity", payTo: "0x4A50DCA6…F19" },
  { id: "nexum-compute", name: "Decentralised Compute", category: "Compute", billing: "usage-based", price: "~10 KITE/min", desc: "GPU compute units for AI/ML workloads. Billed per minute, settled on Kite chain after each session.", tags: ["GPU","ML","training"], uptime: 98.0, latency: 2000, live: false, endpoint: "x402.dev.gokite.ai/api/compute", payTo: "0x4A50DCA6…F19" },
  { id: "nexum-storage", name: "Decentralised Storage", category: "Data", billing: "usage-based", price: "~0.1 KITE/MB", desc: "Encrypted, replicated file storage with on-chain access control. Agent can store and retrieve data autonomously.", tags: ["storage","IPFS","encrypted"], uptime: 99.7, latency: 300, live: false, endpoint: "x402.dev.gokite.ai/api/storage", payTo: "0x4A50DCA6…F19" },
];

const BILLING_COLORS: Record<string, string> = { "per-call": "#00E5C9", "usage-based": "#7B5EFF", "subscription": "#FFB300" };
const CAT_COLORS: Record<string, string> = { Data: "#00E5C9", Finance: "#7B5EFF", AI: "#A78BFA", Identity: "#FFB300", Compute: "#FB923C" };

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
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof SERVICES[0] | null>(null);

  const filtered = SERVICES.filter(s =>
    (cat === "All" || s.category === cat) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.includes(search.toLowerCase())))
  );

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "monospace" } as React.CSSProperties,
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
          <div style={{ display: "flex", gap: 6 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ fontSize: 12, ...S.mono, padding: "6px 14px", borderRadius: 6, border: `1px solid ${cat === c ? "rgba(0,229,201,0.5)" : "#1E3A5F"}`, color: cat === c ? "#00E5C9" : "#4A7090", background: cat === c ? "rgba(0,229,201,0.08)" : "transparent", cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, ...S.mono, color: "#4A7090", marginLeft: "auto" }}>{filtered.length} service{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "repeat(3,1fr)", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "repeat(3,1fr)", gap: 16, alignContent: "start" }}>
            {filtered.map(svc => (
              <div key={svc.id} onClick={() => setSelected(svc === selected ? null : svc)}
                style={{ ...S.card, padding: 20, cursor: "pointer", transition: "border-color .2s", borderColor: selected?.id === svc.id ? "rgba(0,229,201,0.5)" : "#1E3A5F" }}>
                {/* Live badge + category */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, ...S.mono, color: CAT_COLORS[svc.category] ?? "#B8D4E8", background: `${CAT_COLORS[svc.category]}15`, border: `1px solid ${CAT_COLORS[svc.category]}30`, borderRadius: 4, padding: "2px 7px" }}>{svc.category}</span>
                  {svc.live && <span style={{ fontSize: 10, ...S.mono, color: "#00E5C9", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E5C9", boxShadow: "0 0 6px #00E5C9", display: "inline-block" }} />LIVE x402</span>}
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#F8FAFC", marginBottom: 6 }}>{svc.name}</div>
                <div style={{ fontSize: 12, color: "#4A7090", lineHeight: 1.5, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{svc.desc}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: BILLING_COLORS[svc.billing] ?? "#B8D4E8", ...S.mono }}>{svc.price}</span>
                  <span style={{ fontSize: 10, color: "#4A7090", ...S.mono }}>{svc.billing}</span>
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {svc.tags.map(t => <span key={t} style={{ fontSize: 10, ...S.mono, color: "#4A7090", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 3, padding: "1px 6px" }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ ...S.card, padding: 24, alignSelf: "start", position: "sticky", top: 80 }}>
              <button onClick={() => setSelected(null)} style={{ fontSize: 11, ...S.mono, color: "#4A7090", background: "transparent", border: "none", cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <span style={{ fontSize: 10, ...S.mono, color: CAT_COLORS[selected.category] ?? "#B8D4E8", background: `${CAT_COLORS[selected.category]}15`, border: `1px solid ${CAT_COLORS[selected.category]}30`, borderRadius: 4, padding: "2px 7px" }}>{selected.category}</span>
                {selected.live && <span style={{ fontSize: 10, ...S.mono, color: "#00E5C9" }}>● LIVE</span>}
              </div>

              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: "#F8FAFC", marginBottom: 8 }}>{selected.name}</div>
              <div style={{ fontSize: 13, color: "#4A7090", lineHeight: 1.65, marginBottom: 20 }}>{selected.desc}</div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[["Price", selected.price], ["Billing", selected.billing], ["Uptime", selected.uptime + "%"], ["Latency", selected.latency + "ms"]].map(([l, v]) => (
                  <div key={l} style={{ background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 13, ...S.mono, color: "#B8D4E8", fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Uptime dots */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 6 }}>UPTIME (30d)</div>
                <UptimeDots pct={selected.uptime} />
              </div>

              {/* Endpoint */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, ...S.mono, color: "#4A7090", marginBottom: 4 }}>ENDPOINT</div>
                <div style={{ fontSize: 11, ...S.mono, color: "#00E5C9", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 6, padding: "8px 10px", wordBreak: "break-all" }}>{selected.endpoint}</div>
              </div>

              {/* Dispatch agent */}
              <Link href={`/app?service=${selected.id}`}
                style={{ display: "block", width: "100%", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#0F172A", background: "#00E5C9", padding: "11px 0", borderRadius: 8, textDecoration: "none", marginBottom: 8 }}>
                Dispatch Agent →
              </Link>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", textAlign: "center" }}>Agent will call this service via x402</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
