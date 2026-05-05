"use client";

interface DayBar {
  label: string;          // "Mon", "Tue" etc.
  date: string;           // ISO date string
  passport: number;       // Spend via Kite Passport
  local: number;          // Spend via local x402 driver
  total: number;          // passport + local (cached)
}

interface Props {
  payments: Array<{
    timestamp: number;
    amountDisplay: string;
    origin?: "passport" | "local";
  }>;
}

export default function SpendChart({ payments }: Props) {
  // Build last-7-days buckets, split by origin.
  const bars: DayBar[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    const dayPayments = payments.filter((p) => p.timestamp >= dayStart && p.timestamp < dayEnd);
    const passport = dayPayments
      .filter((p) => p.origin === "passport")
      .reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);
    const local = dayPayments
      .filter((p) => p.origin !== "passport")
      .reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);
    bars.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.toISOString().slice(0, 10),
      passport,
      local,
      total: passport + local,
    });
  }

  const maxAmount = Math.max(...bars.map((b) => b.total), 0.001);
  const totalPassport = bars.reduce((s, b) => s + b.passport, 0);
  const totalLocal = bars.reduce((s, b) => s + b.local, 0);
  const totalAll = totalPassport + totalLocal;

  const W = 600,
    H = 140,
    PAD = { top: 16, right: 16, bottom: 36, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const barW = Math.floor(chartW / bars.length) - 8;
  const barGap = (chartW - barW * bars.length) / (bars.length + 1);

  const mono = "'IBM Plex Mono',monospace";
  const COLORS = {
    passport: "#00E5C9", // teal
    local: "#7B5EFF",    // purple
    todayLine: "#FFB300",
  };

  return (
    <div style={{ background: "#0A2540", border: "1px solid #1E3A5F", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontSize: 11, fontFamily: mono, color: "#4A7090", letterSpacing: ".1em" }}>// SPEND — LAST 7 DAYS</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontFamily: mono }}>
          {totalPassport > 0 && (
            <span style={{ fontSize: 12, color: COLORS.passport }}>
              {totalPassport.toFixed(2)} <span style={{ color: "#4A7090", fontSize: 10 }}>passport</span>
            </span>
          )}
          {totalLocal > 0 && (
            <span style={{ fontSize: 12, color: COLORS.local }}>
              {totalLocal.toFixed(2)} <span style={{ color: "#4A7090", fontSize: 10 }}>local</span>
            </span>
          )}
          <span style={{ fontSize: 13, color: "#F8FAFC", fontWeight: 600 }}>
            {totalAll.toFixed(2)}
          </span>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
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

        {/* Stacked bars: local on bottom, passport on top */}
        {bars.map((bar, i) => {
          const x = PAD.left + barGap + i * (barW + barGap);
          const isToday = i === bars.length - 1;
          const localH = (bar.local / maxAmount) * chartH;
          const passportH = (bar.passport / maxAmount) * chartH;
          const localY = PAD.top + chartH - localH;
          const passportY = localY - passportH;

          return (
            <g key={bar.date}>
              {/* Empty-day baseline */}
              {bar.total === 0 && (
                <rect x={x} y={PAD.top + chartH - 2} width={barW} height={2} rx="1" fill="#1E3A5F" />
              )}

              {/* Local stack (bottom) — drawn first so it sits behind */}
              {bar.local > 0 && (
                <rect
                  x={x}
                  y={localY}
                  width={barW}
                  height={Math.max(localH, 2)}
                  rx={bar.passport > 0 ? 0 : 3}
                  fill={COLORS.local}
                  opacity={isToday ? 1 : 0.85}
                  style={{ filter: isToday ? `drop-shadow(0 0 6px ${COLORS.local}66)` : "none" }}
                >
                  <title>
                    {bar.date} · local: {bar.local.toFixed(4)}
                  </title>
                </rect>
              )}

              {/* Passport stack (top) */}
              {bar.passport > 0 && (
                <rect
                  x={x}
                  y={passportY}
                  width={barW}
                  height={Math.max(passportH, 2)}
                  rx={3}
                  fill={COLORS.passport}
                  opacity={isToday ? 1 : 0.95}
                  style={{ filter: isToday ? `drop-shadow(0 0 6px ${COLORS.passport}88)` : "none" }}
                >
                  <title>
                    {bar.date} · passport: {bar.passport.toFixed(4)}
                  </title>
                </rect>
              )}

              {/* Day label */}
              <text x={x + barW / 2} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="10" fontFamily={mono} fill={isToday ? "#B8D4E8" : "#4A7090"}>
                {bar.label}
              </text>

              {/* Total label above bar */}
              {bar.total > 0 && (passportH + localH) > 8 && (
                <text x={x + barW / 2} y={passportY - 4 - (bar.passport === 0 ? -0 : 0)} textAnchor="middle" fontSize="9" fontFamily={mono} fill="#B8D4E8" opacity={0.9}>
                  {bar.total >= 10 ? bar.total.toFixed(0) : bar.total.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis base line */}
        <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH} stroke="#1E3A5F" strokeWidth="1" />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10, fontFamily: mono, color: "#4A7090", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.passport, display: "inline-block" }} />
          ⛨ Kite Passport
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.local, display: "inline-block" }} />
          local x402
        </span>
        <span style={{ marginLeft: "auto", color: "#4A7090", fontSize: 9 }}>
          {totalPassport > 0 && totalLocal > 0
            ? `${Math.round((totalPassport / totalAll) * 100)}% via Passport`
            : totalPassport > 0 ? "100% via Passport"
            : totalLocal > 0 ? "100% local"
            : ""}
        </span>
      </div>
    </div>
  );
}
