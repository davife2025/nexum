"use client";
import { useEffect } from "react";
import AppNav from "../../components/AppNav";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{ background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <AppNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ background: "#0A2540", border: "1px solid rgba(255,77,106,0.3)", borderRadius: 12, padding: "48px 32px" }}>
          <div style={{ fontSize: 32, color: "#FF4D6A", marginBottom: 14 }}>✗</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: "#F8FAFC", marginBottom: 10 }}>Failed to load runs</div>
          <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: "#4A7090", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 16px", marginBottom: 24, textAlign: "left", wordBreak: "break-all" }}>{error.message}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={reset} style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", background: "#00E5C9", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer" }}>Try Again</button>
            <Link href="/app" style={{ fontSize: 13, color: "#4A7090", border: "1px solid #1E3A5F", padding: "10px 20px", borderRadius: 8, textDecoration: "none" }}>← Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
