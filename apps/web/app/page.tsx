"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

const STEPS = [
  { icon: "◈", color: "#00E5C9", label: "Discover", desc: "Scans Kite service registry for relevant APIs" },
  { icon: "⚡", color: "#FFB300", label: "Pay",      desc: "Executes x402 payments with signed EVM auth" },
  { icon: "✦", color: "#7B5EFF", label: "Execute",  desc: "Claude synthesises data into intelligence brief" },
  { icon: "⛓", color: "#7B5EFF", label: "Settle",   desc: "Completion proof anchored on Kite testnet" },
];
const STATS = [
  { value: "< $0.000001", label: "Gas per tx" },
  { value: "1s",          label: "Block time" },
  { value: "2368",        label: "Chain ID" },
  { value: "x402",        label: "Payment protocol" },
];
const FEATURES = [
  { icon: "◎", color: "#00E5C9", title: "Service Discovery",    desc: "Agent scores and ranks APIs from the Kite registry by task relevance, price, and SLA — zero human input." },
  { icon: "⚡", color: "#FFB300", title: "x402 Payments",        desc: "HTTP 402 → sign EVM auth → X-Payment header → Pieverse facilitator. Full on-chain audit trail every time." },
  { icon: "◈", color: "#00E5C9", title: "Spend Policy",         desc: "Programmable per-call, daily, and monthly caps enforced before every payment. Agent never exceeds its mandate." },
  { icon: "⛓", color: "#7B5EFF", title: "On-chain Attestations",desc: "Every task start, payment, and completion written as a keccak256-hashed transaction on Kite testnet." },
  { icon: "✦", color: "#7B5EFF", title: "AI Intelligence",      desc: "Claude synthesises all purchased data into a commerce intelligence brief — fully autonomous end to end." },
  { icon: "⊕", color: "#00E5C9", title: "Full Auditability",    desc: "Every run produces a KiteScan link. Immutable verifiable proof of what the agent bought and what it found." },
];
const LINES = [
  { d: 0,    c: "#4A7090", t: "$ nexum execute" },
  { d: 600,  c: "#00E5C9", t: "◈  agent init · 0x4f2a...c91b · kite-testnet" },
  { d: 1200, c: "#B8D4E8", t: "   attest: task_start → 0x7f3e...a2d1 ✓" },
  { d: 1800, c: "#00E5C9", t: "◎  discovered 3 services" },
  { d: 2400, c: "#FFB300", t: "⚡  GET x402.dev.gokite.ai/api/weather → 402" },
  { d: 3000, c: "#B8D4E8", t: "   signing payment auth (gokite-aa)..." },
  { d: 3500, c: "#B8D4E8", t: "   X-Payment: eyJhdXRob3JpemF0a... ✓" },
  { d: 3900, c: "#7B5EFF", t: "   settled via pieverse.io → 0x9c1f...3e7a" },
  { d: 4500, c: "#FFB300", t: "⚡  nexum-finance/api/defi → 402 → paid ✓" },
  { d: 5100, c: "#7B5EFF", t: "✦  claude synthesis complete (847 tokens)" },
  { d: 5700, c: "#00E5C9", t: "⛓  attest: task_complete → 0xb2c8...d4f9 ✓" },
  { d: 6200, c: "#4A7090", t: "   run complete · 2 payments · 8.4s" },
];

const S: Record<string, React.CSSProperties> = {
  page:  { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" },
  nav:   { borderBottom: "1px solid #1E3A5F", background: "rgba(10,37,64,0.9)", backdropFilter: "blur(12px)", position: "sticky" as const, top: 0, zIndex: 50 },
  navIn: { maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo:  { width: 28, height: 28, border: "1px solid rgba(0,229,201,0.5)", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,229,201,0.08)" },
  wrap:  { maxWidth: 1100, margin: "0 auto", padding: "0 24px" },
  card:  { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 },
  mono:  { fontFamily: "monospace" },
  btn:   { fontSize: 14, fontWeight: 600, color: "#0F172A", background: "#00E5C9", padding: "12px 28px", borderRadius: 8, textDecoration: "none", letterSpacing: ".02em", display: "inline-block" },
  ghost: { fontSize: 14, fontWeight: 500, color: "#B8D4E8", border: "1px solid #1E3A5F", padding: "12px 24px", borderRadius: 8, textDecoration: "none", background: "rgba(10,37,64,0.6)", display: "inline-block" },
};

export default function Landing() {
  const [vis, setVis] = useState<number[]>([]);
  const [key, setKey] = useState(0);

  const startAnimation = useCallback(() => {
    setVis([]);
    setKey(k => k + 1);
  }, []);

  useEffect(() => {
    const timers = LINES.map((l, i) => setTimeout(() => setVis(p => [...p, i]), l.d + 500));
    return () => timers.forEach(clearTimeout);
  }, [key]);

  return (
    <div style={S.page}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} a:hover{opacity:.8}`}</style>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.navIn}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.logo}><div style={{ width: 8, height: 8, background: "#00E5C9", transform: "rotate(-45deg)", borderRadius: 2 }} /></div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F8FAFC", fontSize: 16 }}>nexum</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {([["Marketplace","/marketplace"],["History","/history"],["Agent","/agent"],["Providers","/providers"]] as [string,string][]).map(([l,h]) => (
              <Link key={h} href={h} style={{ fontSize: 13, color: "#4A7090", textDecoration: "none" }}>{l}</Link>
            ))}
            <Link href="/app" style={{ ...S.btn, padding: "7px 18px", fontSize: 13 }}>Launch App →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ ...S.wrap, padding: "80px 24px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, ...S.mono, color: "#00E5C9", background: "rgba(0,229,201,0.08)", border: "1px solid rgba(0,229,201,0.25)", borderRadius: 4, padding: "3px 10px", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E5C9", boxShadow: "0 0 8px #00E5C9", display: "inline-block" }} />
            AGENTIC COMMERCE · KITE CHAIN
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 50, lineHeight: 1.1, color: "#F8FAFC", marginBottom: 20 }}>
            Agents That Buy<br /><span style={{ color: "#00E5C9" }}>What They Need</span>
          </h1>
          <p style={{ fontSize: 16, color: "#4A7090", lineHeight: 1.7, marginBottom: 36, maxWidth: 420 }}>
            Nexum autonomously discovers services, executes x402 stablecoin payments, enforces programmable spend policy, and settles every action on Kite chain.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/app" style={S.btn}>Try the Agent →</Link>
            <a href="https://docs.gokite.ai" target="_blank" rel="noopener noreferrer" style={S.ghost}>Kite Docs ↗</a>
          </div>
        </div>
        {/* Terminal */}
        <div style={{ ...S.card, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", cursor: "pointer" }}
          onClick={startAnimation} title="Click to replay">
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #1E3A5F", display: "flex", alignItems: "center", gap: 6 }}>
            {["#FF4D6A","#FFB300","#00E5C9"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: .7 }} />)}
            <span style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginLeft: 8 }}>nexum agent</span>
            <span style={{ fontSize: 10, ...S.mono, color: "#2A4060", marginLeft: "auto" }}>click to replay ↺</span>
          </div>
          <div style={{ padding: "16px 16px 24px", minHeight: 280, ...S.mono, fontSize: 12, lineHeight: 1.9 }}>
            {LINES.map((l, i) => (
              <div key={i} style={{ color: l.c, opacity: vis.includes(i) ? 1 : 0, transition: "opacity .35s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.t}</div>
            ))}
            {vis.length < LINES.length && <span style={{ color: "#00E5C9", animation: "blink 1s step-end infinite" }}>█</span>}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: "1px solid #1E3A5F", borderBottom: "1px solid #1E3A5F", background: "rgba(10,37,64,0.4)" }}>
        <div style={{ ...S.wrap, display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {STATS.map(({ value, label }, i) => (
            <div key={label} style={{ padding: "24px 20px", borderRight: i < 3 ? "1px solid #1E3A5F" : "none", textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: "#00E5C9", marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, ...S.mono, color: "#4A7090", letterSpacing: ".06em" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...S.wrap, padding: "72px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".12em", marginBottom: 12 }}>// HOW IT WORKS</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 34, color: "#F8FAFC" }}>Four steps, zero humans</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, position: "relative" }}>
          <div style={{ position: "absolute", top: 32, left: "12.5%", right: "12.5%", height: 1, background: "linear-gradient(to right, transparent, #1E3A5F 20%, #1E3A5F 80%, transparent)" }} />
          {STEPS.map((step, i) => (
            <div key={step.label} style={{ ...S.card, padding: "24px 20px", textAlign: "center", position: "relative" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: `1px solid ${step.color}40`, background: `${step.color}10`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: step.color }}>{step.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: step.color, marginBottom: 6 }}>{i+1}. {step.label}</div>
              <div style={{ fontSize: 12, color: "#4A7090", lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: "rgba(10,37,64,0.25)", borderTop: "1px solid #1E3A5F", borderBottom: "1px solid #1E3A5F" }}>
        <div style={{ ...S.wrap, padding: "72px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".12em", marginBottom: 12 }}>// CAPABILITIES</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 34, color: "#F8FAFC" }}>Built for the agentic economy</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ ...S.card, padding: 24 }}>
                <div style={{ fontSize: 22, color: f.color, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15, color: "#F8FAFC", marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#4A7090", lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ ...S.wrap, padding: "80px 24px", textAlign: "center" }}>
        <div style={{ ...S.card, border: "1px solid rgba(0,229,201,0.3)", padding: "56px 40px", boxShadow: "0 0 60px rgba(0,229,201,0.06)" }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 36, color: "#F8FAFC", marginBottom: 14 }}>Run your first agent now</h2>
          <p style={{ fontSize: 15, color: "#4A7090", marginBottom: 32, maxWidth: 440, margin: "0 auto 32px" }}>No wallet required to demo. Fund an agent at the Kite faucet for real on-chain attestations.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/app" style={{ ...S.btn, padding: "14px 32px", fontSize: 15 }}>Open Dashboard →</Link>
            <a href="https://faucet.gokite.ai" target="_blank" rel="noopener noreferrer" style={{ ...S.ghost, padding: "14px 24px", fontSize: 15 }}>Get Testnet Funds ↗</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1E3A5F", padding: "24px", background: "rgba(10,37,64,0.4)" }}>
        <div style={{ ...S.wrap, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12, ...S.mono, color: "#2A4060" }}>nexum · agentic commerce · kite ai · hackathon</span>
          <div style={{ display: "flex", gap: 20 }}>
            {([["gokite.ai","https://gokite.ai"],["docs","https://docs.gokite.ai"],["explorer","https://testnet.kitescan.ai"],["faucet","https://faucet.gokite.ai"]] as [string,string][]).map(([l,h]) => (
              <a key={l} href={h} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, ...S.mono, color: "#4A7090", textDecoration: "none" }}>{l} ↗</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
