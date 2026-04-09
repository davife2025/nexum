"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
        <div style={{ background: "#0A2540", border: "1px solid rgba(255,77,106,0.35)", borderRadius: 12, padding: 40, maxWidth: 480, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16, color: "#FF4D6A" }}>✗</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: "#F8FAFC", marginBottom: 10 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "#4A7090", marginBottom: 24, fontFamily: "monospace", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px", textAlign: "left", wordBreak: "break-all" }}>
            {this.state.error.message}
          </div>
          <button onClick={() => this.setState({ error: null })}
            style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", background: "#00E5C9", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }
}

export function PageSkeleton() {
  return (
    <div style={{ background: "#0F172A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ borderBottom: "1px solid #1E3A5F", background: "rgba(10,37,64,0.9)", height: 56 }} />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <Bone w={120} h={12} mb={10} />
          <Bone w={280} h={28} mb={8} />
          <Bone w={200} h={14} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => <Bone key={i} w="100%" h={80} r={12} />)}
        </div>
        <Bone w="100%" h={400} r={12} />
      </div>
    </div>
  );
}

function Bone({ w, h, mb = 0, r = 6 }: { w: number | string; h: number; mb?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, marginBottom: mb,
      background: "linear-gradient(90deg, #0A2540 0%, #112847 50%, #0A2540 100%)",
      backgroundSize: "200% auto",
      animation: "shimmer 2s linear infinite",
    }} />
  );
}
