"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";

const NAV_LINKS = [
  { label: "Dashboard",    href: "/app" },
  { label: "Runs",         href: "/app/runs" },
  { label: "Marketplace",  href: "/marketplace" },
  { label: "History",      href: "/history" },
  { label: "Agent",        href: "/agent" },
  { label: "Attestations", href: "/attestations" },
  { label: "Providers",    href: "/providers" },
];

export default function AppNav() {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  // Lock scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function isActive(href: string) {
    if (href === "/app") return path === "/app";
    return path === href || path.startsWith(href + "/");
  }

  const S = {
    nav: { position: "sticky" as const, top: 0, zIndex: 50, borderBottom: "1px solid #1E3A5F", background: "rgba(10,37,64,0.92)", backdropFilter: "blur(12px)", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" },
    inner: { maxWidth: 1200, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
    mono: { fontFamily: "'IBM Plex Mono',monospace" } as React.CSSProperties,
  };

  return (
    <>
      <header style={S.nav}>
        <div style={S.inner}>

          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, border: "1px solid rgba(0,229,201,0.5)", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,229,201,0.08)", flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, background: "#00E5C9", transform: "rotate(-45deg)", borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F8FAFC", fontSize: 15 }}>nexum</span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}
            className="hidden-mobile">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} style={{
                fontSize: 13, padding: "5px 10px", borderRadius: 6, textDecoration: "none",
                color: isActive(href) ? "#00E5C9" : "#4A7090",
                background: isActive(href) ? "rgba(0,229,201,0.08)" : "transparent",
                fontWeight: isActive(href) ? 500 : 400,
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}>
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {/* Search — desktop only */}
            <div className="hidden-mobile">
              <SearchBar />
            </div>
            {/* Chain status — desktop only */}
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, ...S.mono, color: "#4A7090", whiteSpace: "nowrap" }}
              className="hidden-mobile">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E5C9", boxShadow: "0 0 8px #00E5C9", display: "inline-block" }} />
              KITE
            </span>
            <a href="https://testnet.kitescan.ai" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, ...S.mono, color: "#4A7090", textDecoration: "none", whiteSpace: "nowrap" }}
              className="hidden-mobile">
              SCAN ↗
            </a>
            {/* Hamburger */}
            <button onClick={() => setMobileOpen(o => !o)}
              style={{ flexDirection: "column", gap: 4, padding: "6px", background: "transparent", border: "1px solid #1E3A5F", borderRadius: 6, cursor: "pointer" }}
              className="show-mobile" aria-label="Menu">
              {[0,1,2].map(i => (
                <span key={i} style={{
                  display: "block", width: 18, height: 1.5, background: "#B8D4E8", borderRadius: 1,
                  transition: "all .2s",
                  transform: mobileOpen ? (i === 0 ? "rotate(45deg) translate(4px, 4px)" : i === 2 ? "rotate(-45deg) translate(4px, -4px)" : "scaleX(0)") : "none",
                  opacity: mobileOpen && i === 1 ? 0 : 1,
                }} />
              ))}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(10,23,42,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div style={{
        position: "fixed", top: 56, right: 0, bottom: 0, zIndex: 50,
        width: 260,
        background: "#0A2540",
        borderLeft: "1px solid #1E3A5F",
        transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform .25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        padding: "16px 0",
        overflowY: "auto",
      }}>
        {/* Search in drawer */}
        <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #1E3A5F" }}>
          <SearchBar />
        </div>
        {/* Nav links */}
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={href} href={href} style={{
              display: "block", padding: "10px 12px", borderRadius: 8, textDecoration: "none",
              fontSize: 14, fontFamily: "'Plus Jakarta Sans',system-ui",
              color: isActive(href) ? "#00E5C9" : "#B8D4E8",
              background: isActive(href) ? "rgba(0,229,201,0.08)" : "transparent",
              fontWeight: isActive(href) ? 600 : 400,
              marginBottom: 2,
              borderLeft: isActive(href) ? "2px solid #00E5C9" : "2px solid transparent",
            }}>
              {label}
            </Link>
          ))}
        </nav>
        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1E3A5F" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E5C9", boxShadow: "0 0 8px #00E5C9", display: "inline-block" }} />
            <span style={{ fontSize: 11, ...S.mono, color: "#4A7090" }}>KITE TESTNET · 2368</span>
          </div>
          <a href="https://testnet.kitescan.ai" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, ...S.mono, color: "#4A7090", textDecoration: "none" }}>
            KITESCAN ↗
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hidden-mobile { display: flex; }
          .show-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
