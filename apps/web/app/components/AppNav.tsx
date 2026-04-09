"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Dashboard",    href: "/app" },
  { label: "Marketplace",  href: "/marketplace" },
  { label: "History",      href: "/history" },
  { label: "Agent",        href: "/agent" },
  { label: "Attestations", href: "/attestations" },
];

export default function AppNav() {
  const path = usePathname();

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #1E3A5F", background: "rgba(10,37,64,0.92)", backdropFilter: "blur(12px)", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, border: "1px solid rgba(0,229,201,0.5)", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,229,201,0.08)" }}>
            <div style={{ width: 7, height: 7, background: "#00E5C9", transform: "rotate(-45deg)", borderRadius: 2 }} />
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F8FAFC", fontSize: 15 }}>nexum</span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {NAV_LINKS.map(({ label, href }) => {
            const active = path === href || (href !== "/app" && path.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                fontSize: 13, padding: "5px 12px", borderRadius: 6, textDecoration: "none", transition: "all .15s",
                color: active ? "#00E5C9" : "#4A7090",
                background: active ? "rgba(0,229,201,0.08)" : "transparent",
                fontWeight: active ? 500 : 400,
              }}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Chain status */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "monospace", color: "#4A7090" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E5C9", boxShadow: "0 0 8px #00E5C9", display: "inline-block" }} />
            KITE TESTNET
          </span>
          <a href="https://testnet.kitescan.ai" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, fontFamily: "monospace", color: "#4A7090", textDecoration: "none" }}>
            KITESCAN ↗
          </a>
        </div>
      </div>
    </header>
  );
}
