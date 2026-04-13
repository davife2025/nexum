"use client";
import { useState } from "react";
import AppNav from "../components/AppNav";
import Link from "next/link";

const STEPS = [
  { n: "01", icon: "⚙", color: "#00E5C9", title: "Implement x402",       desc: "Return HTTP 402 with payment requirements when a request has no X-Payment header. Copy our reference implementation." },
  { n: "02", icon: "⛓", color: "#7B5EFF", title: "Set your wallet",       desc: "Create a wallet on Kite testnet. Add your address to the payTo field in your 402 response. Funds arrive directly." },
  { n: "03", icon: "◎", color: "#00E5C9", title: "Register on Kite AIR",  desc: "List your service on the Kite AIR marketplace. Agents discover and purchase services from the registry automatically." },
  { n: "04", icon: "✦", color: "#7B5EFF", title: "Go live",               desc: "Agents start purchasing your API autonomously. Every payment settles on Kite chain — no invoicing, no delays." },
];

const SCHEMA_EXAMPLE = `{
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "gokite-aa",
    "network": "kite-testnet",
    "maxAmountRequired": "1000000000000000000",
    "resource": "https://your-api.com/endpoint",
    "description": "Your API description",
    "payTo": "0xYourWalletAddress",
    "asset": "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    "maxTimeoutSeconds": 300,
    "merchantName": "Your Service Name"
  }],
  "x402Version": 1
}`;

const CODE_EXAMPLE = `// Node.js / Express example
app.get('/api/your-endpoint', async (req, res) => {
  const xPayment = req.headers['x-payment'];

  // 1. No payment header — return 402
  if (!xPayment) {
    return res.status(402).json({
      error: 'X-PAYMENT header is required',
      accepts: [{
        scheme: 'gokite-aa',
        network: 'kite-testnet',
        maxAmountRequired: '1000000000000000000',
        resource: req.url,
        payTo: process.env.SERVICE_WALLET,
        asset: '0x0fF5393387...e63',
        maxTimeoutSeconds: 300,
        merchantName: 'My Service',
      }],
      x402Version: 1,
    });
  }

  // 2. Verify + settle via Kite facilitator
  const settle = await fetch('https://facilitator.pieverse.io/v2/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xPayment, network: 'kite-testnet' }),
  });
  if (!settle.ok) return res.status(402).json({ error: 'Payment invalid' });

  // 3. Deliver your service
  res.json({ data: await yourService() });
});`;

const EARNING_EXAMPLES = [
  { category: "Data APIs",      price: "0.001 – 0.01 KITE / call",  example: "Weather, price feeds, on-chain data" },
  { category: "AI Inference",   price: "0.002 KITE / 1k tokens",    example: "LLM APIs, embedding services" },
  { category: "Identity",       price: "0.0005 – 0.005 KITE / call",example: "KYC, reputation, verification" },
  { category: "Compute",        price: "0.01 KITE / GPU-minute",    example: "ML training, batch processing" },
  { category: "Storage",        price: "0.0001 KITE / MB",          example: "File storage, vector DBs" },
];

type Tab = "overview" | "schema" | "code" | "register";

export default function ProvidersPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [form, setForm] = useState({ name: "", endpoint: "", category: "data", price: "", wallet: "", desc: "" });
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const S = {
    page: { background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#B8D4E8" } as React.CSSProperties,
    card: { background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 12 } as React.CSSProperties,
    mono: { fontFamily: "'IBM Plex Mono',monospace" } as React.CSSProperties,
    input: { background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px", color: "#F8FAFC", fontSize: 13, fontFamily: "'Plus Jakarta Sans',system-ui", outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
    label: { fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: "#4A7090", letterSpacing: ".08em", display: "block", marginBottom: 6 } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <AppNav />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 36, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 10 }}>// SERVICE PROVIDERS</div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 32, color: "#F8FAFC", marginBottom: 10, lineHeight: 1.2 }}>
              List Your API on<br /><span style={{ color: "#00E5C9" }}>the Agentic Marketplace</span>
            </h1>
            <p style={{ fontSize: 14, color: "#4A7090", lineHeight: 1.7, maxWidth: 520 }}>
              Add x402 support to any HTTP endpoint and autonomous agents start purchasing your service automatically — payments settle on Kite chain with zero invoicing overhead.
            </p>
          </div>
          <div style={{ ...S.card, padding: "16px 20px", minWidth: 200, textAlign: "center" }}>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginBottom: 8 }}>SERVICES LISTED</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 36, color: "#00E5C9", marginBottom: 4 }}>6</div>
            <div style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>on Kite testnet</div>
          </div>
        </div>

        {/* How it works — 4 steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 }}>
          {STEPS.map((step) => (
            <div key={step.n} style={{ ...S.card, padding: 20, position: "relative" }}>
              <div style={{ fontSize: 10, ...S.mono, color: step.color, opacity: .5, marginBottom: 8, letterSpacing: ".1em" }}>{step.n}</div>
              <div style={{ fontSize: 20, color: step.color, marginBottom: 10 }}>{step.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#F8FAFC", marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: "#4A7090", lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1E3A5F", paddingBottom: 0 }}>
          {([["overview","Overview"],["schema","402 Schema"],["code","Code Example"],["register","Register Service"]] as [Tab,string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ fontSize: 13, padding: "10px 18px", background: "transparent", border: "none", cursor: "pointer", borderBottom: `2px solid ${tab === t ? "#00E5C9" : "transparent"}`, color: tab === t ? "#00E5C9" : "#4A7090", fontFamily: "'Plus Jakarta Sans',system-ui", fontWeight: tab === t ? 600 : 400, marginBottom: -1, transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Earning potential */}
            <div style={{ ...S.card, padding: 24 }}>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 16 }}>// EARNING POTENTIAL BY CATEGORY</div>
              <div style={{ display: "grid", gap: 0, overflow: "hidden", borderRadius: 8, border: "1px solid #1E3A5F" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 1fr", background: "#0F172A", padding: "8px 16px" }}>
                  {["CATEGORY","PRICE RANGE","EXAMPLES"].map(h => <span key={h} style={{ fontSize: 10, ...S.mono, color: "#4A7090", letterSpacing: ".08em" }}>{h}</span>)}
                </div>
                {EARNING_EXAMPLES.map((row, i) => (
                  <div key={row.category} style={{ display: "grid", gridTemplateColumns: "1fr 200px 1fr", padding: "12px 16px", borderTop: "1px solid #1E3A5F", background: i % 2 === 0 ? "transparent" : "rgba(0,229,201,0.02)" }}>
                    <span style={{ fontSize: 13, color: "#F8FAFC", fontWeight: 500 }}>{row.category}</span>
                    <span style={{ fontSize: 12, ...S.mono, color: "#00E5C9" }}>{row.price}</span>
                    <span style={{ fontSize: 12, color: "#4A7090" }}>{row.example}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { icon: "⚡", color: "#FFB300", title: "Instant settlement", desc: "Payments hit your wallet the moment an agent calls your API. No invoices, no Net 30." },
                { icon: "◈", color: "#00E5C9", title: "Zero custodians",    desc: "You control your wallet. The Kite facilitator executes on-chain — there is no intermediary holding funds." },
                { icon: "⛓", color: "#7B5EFF", title: "Full auditability", desc: "Every payment is an on-chain transaction. KiteScan gives you a permanent, verifiable payment history." },
              ].map(f => (
                <div key={f.title} style={{ ...S.card, padding: 20 }}>
                  <div style={{ fontSize: 20, color: f.color, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#F8FAFC", marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#4A7090", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setTab("register")}
                style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", background: "#00E5C9", border: "none", padding: "11px 28px", borderRadius: 8, cursor: "pointer" }}>
                Register your service →
              </button>
              <a href="https://docs.gokite.ai/kite-agent-passport/service-provider-guide" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#B8D4E8", border: "1px solid #1E3A5F", padding: "11px 20px", borderRadius: 8, textDecoration: "none", background: "rgba(10,37,64,0.6)" }}>
                Full provider docs ↗
              </a>
            </div>
          </div>
        )}

        {/* 402 Schema tab */}
        {tab === "schema" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ ...S.card, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #1E3A5F" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#FF4D6A","#FFB300","#00E5C9"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: .7 }} />)}
                  <span style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginLeft: 8 }}>HTTP 402 Response Schema</span>
                </div>
                <button onClick={() => copy(SCHEMA_EXAMPLE, "schema")}
                  style={{ fontSize: 11, ...S.mono, color: copied === "schema" ? "#7B5EFF" : "#4A7090", background: "transparent", border: "1px solid #1E3A5F", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>
                  {copied === "schema" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre style={{ margin: 0, padding: "20px 24px", ...S.mono, fontSize: 12, color: "#B8D4E8", lineHeight: 1.8, overflowX: "auto" }}>{SCHEMA_EXAMPLE}</pre>
            </div>

            <div style={{ ...S.card, padding: 24 }}>
              <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 16 }}>// KEY FIELDS</div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { field: "payTo",              desc: "Your Kite testnet wallet address — payments go here directly" },
                  { field: "maxAmountRequired",  desc: "Price in wei (1 KITE = 10^18). Use 1000000 for USDT with 6 decimals" },
                  { field: "asset",              desc: "Token contract address. Testnet USDT: 0x0fF539...e63" },
                  { field: "scheme",             desc: "Always 'gokite-aa' for Kite chain payments" },
                  { field: "maxTimeoutSeconds",  desc: "How long the payment authorization stays valid (recommend 300)" },
                  { field: "merchantName",       desc: "Your service name — shown in agent payment UIs" },
                ].map(({ field, desc }) => (
                  <div key={field} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, padding: "10px 14px", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8 }}>
                    <code style={{ fontSize: 12, ...S.mono, color: "#00E5C9" }}>{field}</code>
                    <span style={{ fontSize: 12, color: "#4A7090" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Code example tab */}
        {tab === "code" && (
          <div style={{ ...S.card, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #1E3A5F" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#FF4D6A","#FFB300","#00E5C9"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: .7 }} />)}
                <span style={{ fontSize: 11, ...S.mono, color: "#4A7090", marginLeft: 8 }}>Express.js — complete x402 integration</span>
              </div>
              <button onClick={() => copy(CODE_EXAMPLE, "code")}
                style={{ fontSize: 11, ...S.mono, color: copied === "code" ? "#7B5EFF" : "#4A7090", background: "transparent", border: "1px solid #1E3A5F", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>
                {copied === "code" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <pre style={{ margin: 0, padding: "20px 24px", ...S.mono, fontSize: 12, color: "#B8D4E8", lineHeight: 1.85, overflowX: "auto" }}>{CODE_EXAMPLE}</pre>
          </div>
        )}

        {/* Register tab */}
        {tab === "register" && (
          <div style={{ maxWidth: 580 }}>
            {submitted ? (
              <div style={{ ...S.card, padding: 40, textAlign: "center", border: "1px solid rgba(123,94,255,0.35)" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#F8FAFC", marginBottom: 10 }}>Service submitted</div>
                <div style={{ fontSize: 14, color: "#4A7090", marginBottom: 24, lineHeight: 1.7 }}>
                  Your service has been submitted for review. Once approved it will appear in the Kite AIR marketplace and agents will begin discovering it automatically.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => setSubmitted(false)}
                    style={{ fontSize: 13, color: "#4A7090", border: "1px solid #1E3A5F", padding: "9px 20px", borderRadius: 8, background: "transparent", cursor: "pointer" }}>
                    Submit another
                  </button>
                  <Link href="/marketplace"
                    style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", background: "#00E5C9", padding: "9px 20px", borderRadius: 8, textDecoration: "none" }}>
                    View Marketplace →
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ ...S.card, padding: 28 }}>
                <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 20 }}>// REGISTER YOUR SERVICE</div>
                <div style={{ display: "grid", gap: 16 }}>
                  {[
                    { key: "name",     label: "SERVICE NAME",     placeholder: "e.g. My Data API",             type: "text" },
                    { key: "endpoint", label: "ENDPOINT URL",     placeholder: "https://your-api.com/endpoint",type: "text" },
                    { key: "wallet",   label: "KITE WALLET (payTo)", placeholder: "0x...",                    type: "text" },
                    { key: "price",    label: "PRICE PER CALL (KITE)", placeholder: "e.g. 0.001",             type: "text" },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label style={S.label}>{label}</label>
                      <input type={type} placeholder={placeholder} value={(form as Record<string,string>)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        style={S.input}
                        onFocus={e => (e.target.style.borderColor = "rgba(0,229,201,0.5)")}
                        onBlur={e => (e.target.style.borderColor = "#1E3A5F")} />
                    </div>
                  ))}

                  <div>
                    <label style={S.label}>CATEGORY</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      style={{ ...S.input, appearance: "none" }}>
                      {["data","finance","ai","identity","compute","storage"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={S.label}>DESCRIPTION</label>
                    <textarea placeholder="What does your service do? What data does it return?" value={form.desc}
                      onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} rows={3}
                      style={{ ...S.input, resize: "none" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(0,229,201,0.5)")}
                      onBlur={e => (e.target.style.borderColor = "#1E3A5F")} />
                  </div>

                  <button onClick={async () => {
                    const res = await fetch("/api/providers", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    });
                    if (res.ok) setSubmitted(true);
                    else {
                      const d = await res.json();
                      alert(d.error ?? "Submission failed");
                    }
                  }} disabled={!form.name || !form.endpoint || !form.wallet}
                    style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", background: form.name && form.endpoint && form.wallet ? "#00E5C9" : "#1E3A5F", border: "none", padding: "12px 0", borderRadius: 8, cursor: form.name && form.endpoint && form.wallet ? "pointer" : "not-allowed", transition: "all .2s" }}>
                    Submit for Review →
                  </button>
                  <div style={{ fontSize: 11, ...S.mono, color: "#4A7090", textAlign: "center" }}>
                    Services are reviewed within 48h. Implement x402 before submitting.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
