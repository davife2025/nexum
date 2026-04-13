import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ background: "#0F172A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", padding: "0 24px" }}>

        {/* Animated logo */}
        <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 28px" }}>
          <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(0,229,201,0.3)", transform: "rotate(45deg)", borderRadius: 4 }} />
          <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(0,229,201,0.15)", transform: "rotate(45deg)", borderRadius: 2 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, color: "#00E5C9", opacity: .6 }}>404</div>
        </div>

        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#4A7090", letterSpacing: ".12em", marginBottom: 14 }}>// PAGE NOT FOUND</div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#F8FAFC", marginBottom: 12 }}>
          This route doesn&apos;t exist
        </h1>
        <p style={{ fontSize: 14, color: "#4A7090", marginBottom: 32, maxWidth: 360, margin: "0 auto 32px", lineHeight: 1.7 }}>
          The agent couldn&apos;t find this page. It may have moved or never existed on Kite chain.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/"
            style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", background: "#00E5C9", padding: "11px 24px", borderRadius: 8, textDecoration: "none" }}>
            ← Home
          </Link>
          <Link href="/app"
            style={{ fontSize: 14, color: "#B8D4E8", border: "1px solid #1E3A5F", padding: "11px 20px", borderRadius: 8, textDecoration: "none", background: "rgba(10,37,64,0.6)" }}>
            Open Dashboard
          </Link>
          <Link href="/marketplace"
            style={{ fontSize: 14, color: "#4A7090", border: "1px solid #1E3A5F", padding: "11px 20px", borderRadius: 8, textDecoration: "none" }}>
            Marketplace
          </Link>
        </div>

        {/* Mini nav */}
        <div style={{ marginTop: 48, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {[["History","/history"],["Agent","/agent"],["Attestations","/attestations"],["Providers","/providers"]].map(([l,h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: "#4A7090", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
