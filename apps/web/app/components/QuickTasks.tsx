"use client";

interface Task {
  icon: string;
  color: string;
  label: string;
  task: string;
  location: string;
  services: string[];
  tag: string;
}

const QUICK_TASKS: Task[] = [
  {
    icon: "⚡",
    color: "#FFB300",
    label: "DeFi yield scan",
    task: "Analyse high-yield DeFi opportunities across Kite-native protocols and cross-reference with real-time liquidity data",
    location: "Singapore",
    services: ["Finance Oracle", "Weather API"],
    tag: "finance",
  },
  {
    icon: "◎",
    color: "#00E5C9",
    label: "Weather intelligence",
    task: "Research how current weather patterns in Lagos are influencing on-chain transaction volumes and agent activity",
    location: "Lagos",
    services: ["Weather API"],
    tag: "data",
  },
  {
    icon: "✦",
    color: "#7B5EFF",
    label: "Agent market report",
    task: "Build a commerce intelligence report on autonomous agent transaction volumes and service adoption on Kite chain",
    location: "London",
    services: ["Finance Oracle", "AI Inference"],
    tag: "ai",
  },
  {
    icon: "◈",
    color: "#00E5C9",
    label: "Identity audit",
    task: "Verify identity credentials and reputation scores for a new set of Kite protocol participants",
    location: "Tokyo",
    services: ["Identity Verifier"],
    tag: "identity",
  },
  {
    icon: "⛓",
    color: "#7B5EFF",
    label: "Arbitrage scan",
    task: "Identify cross-chain arbitrage opportunities between Kite stablecoin pools and competing L1 DeFi protocols",
    location: "New York",
    services: ["Finance Oracle", "Weather API"],
    tag: "finance",
  },
  {
    icon: "◎",
    color: "#00E5C9",
    label: "Compute benchmark",
    task: "Benchmark AI inference costs across Kite compute nodes versus centralised alternatives and produce a cost analysis",
    location: "Dubai",
    services: ["AI Inference", "Compute"],
    tag: "compute",
  },
];

interface Props {
  onSelect: (task: string, location: string) => void;
}

export default function QuickTasks({ onSelect }: Props) {
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };
  const sans: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" };

  return (
    <div>
      <div style={{ fontSize: 11, ...mono, color: "#4A7090", letterSpacing: ".1em", marginBottom: 14 }}>
        // QUICK START
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {QUICK_TASKS.map((qt) => (
          <button key={qt.label} onClick={() => onSelect(qt.task, qt.location)}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#0F172A", border: "1px solid #1E3A5F", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all .15s", width: "100%" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${qt.color}40`; e.currentTarget.style.background = `${qt.color}06`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E3A5F"; e.currentTarget.style.background = "#0F172A"; }}>
            <span style={{ fontSize: 16, color: qt.color, flexShrink: 0, marginTop: 1 }}>{qt.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: qt.color, ...sans }}>{qt.label}</span>
                <span style={{ fontSize: 9, ...mono, color: "#4A7090", border: "1px solid #1E3A5F", borderRadius: 3, padding: "1px 5px" }}>{qt.tag}</span>
              </div>
              <p style={{ fontSize: 11, color: "#4A7090", lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                {qt.task}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {qt.services.map(s => (
                  <span key={s} style={{ fontSize: 9, ...mono, color: "#4A7090", background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 3, padding: "1px 5px" }}>{s}</span>
                ))}
                <span style={{ fontSize: 9, ...mono, color: "#4A7090" }}>📍 {qt.location}</span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "#4A7090", flexShrink: 0, marginTop: 2 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
