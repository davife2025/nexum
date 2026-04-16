"use client";

interface DayBar {
  label: string; // "Mon", "Tue" etc.
  date: string;  // ISO date string
  amount: number;
}

interface Props {
  payments: Array<{ timestamp: number; amountDisplay: string }>;
}

export default function SpendChart({ payments }: Props) {
  // Build last-7-days buckets
  const bars: DayBar[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    const amount = payments
      .filter(p => p.timestamp >= dayStart && p.timestamp < dayEnd)
      .reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);
    bars.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.toISOString().slice(0, 10),
      amount,
    });
  }

  const maxAmount = Math.max(...bars.map(b => b.amount), 0.001);
  const totalThisWeek = bars.reduce((s, b) => s + b.amount, 0);

  const W = 600, H = 140, PAD = { top: 16, right: 16, bottom: 36, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const barW = Math.floor(chartW / bars.length) - 8;
  const barGap = (chartW - barW * bars.length) / (bars.length + 1);

  const mono = "'IBM Plex Mono',monospace";

  return (
    <div style={{ background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontFamily: mono, color: "#4A7090", letterSpacing: ".1em" }}>// SPEND — LAST 7 DAYS</div>
        <div style={{ fontSize: 13, fontFamily: mono, color: "#00E5C9", fontWeight: 600 }}>
          {totalThisWeek.toFixed(2)} KITE
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = PAD.top + chartH * (1 - frac);
          const val = maxAmount * frac;
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1E3A5F" strokeWidth="1" strokeDasharray="3,3" />
              {frac > 0 && (
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fontFamily={mono} fill="#4A7090">
                  {val < 1 ? val.toFixed(2) : val.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Bars */}
        {bars.map((bar, i) => {
          const barH = Math.max((bar.amount / maxAmount) * chartH, bar.amount > 0 ? 2 : 0);
          const x = PAD.left + barGap + i * (barW + barGap);
          const y = PAD.top + chartH - barH;
          const isToday = i === bars.length - 1;
          const color = isToday ? "#00E5C9" : "#7B5EFF";
          const opacity = bar.amount === 0 ? 0.2 : 1;

          return (
            <g key={bar.date}>
              {bar.amount > 0 && (
                <rect x={x} y={y} width={barW} height={barH} rx="3"
                  fill={color} opacity={opacity}
                  style={{ filter: isToday ? `drop-shadow(0 0 6px ${color}88)` : "none" }} />
              )}
              {bar.amount === 0 && (
                <rect x={x} y={PAD.top + chartH - 2} width={barW} height={2} rx="1" fill="#1E3A5F" />
              )}
              {/* Day label */}
              <text x={x + barW / 2} y={H - PAD.bottom + 14} textAnchor="middle"
                fontSize="10" fontFamily={mono} fill={isToday ? "#B8D4E8" : "#4A7090"}>
                {bar.label}
              </text>
              {/* Amount label above bar for non-zero bars */}
              {bar.amount > 0 && barH > 8 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                  fontSize="9" fontFamily={mono} fill={color} opacity={0.85}>
                  {bar.amount >= 10 ? bar.amount.toFixed(0) : bar.amount.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis base line */}
        <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH} stroke="#1E3A5F" strokeWidth="1" />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10, fontFamily: mono, color: "#4A7090" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#00E5C9", display: "inline-block" }} />today
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#7B5EFF", display: "inline-block" }} />previous days
        </span>
      </div>
    </div>
  );
}
