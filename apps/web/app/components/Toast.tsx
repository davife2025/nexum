"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastKind = "success" | "error" | "info" | "payment";

interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  href?: string;
  duration?: number; // ms, default 5000
}

interface ToastCtx {
  add: (t: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const Ctx = createContext<ToastCtx>({ add: () => {}, remove: () => {} });

export function useToast() {
  return useContext(Ctx);
}

// ── Icon mapping ──────────────────────────────────────────────────────────────

const ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "✗",
  info: "◈",
  payment: "⚡",
};

const COLORS: Record<ToastKind, { border: string; icon: string; bg: string }> = {
  success: { border: "rgba(123,94,255,0.45)", icon: "#7B5EFF", bg: "rgba(123,94,255,0.06)" },
  error:   { border: "rgba(255,77,106,0.45)", icon: "#FF4D6A", bg: "rgba(255,77,106,0.06)" },
  info:    { border: "rgba(0,229,201,0.35)",  icon: "#00E5C9", bg: "rgba(0,229,201,0.05)" },
  payment: { border: "rgba(255,179,0,0.45)",  icon: "#FFB300", bg: "rgba(255,179,0,0.06)" },
};

// ── Individual toast ──────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { border, icon: iconColor, bg } = COLORS[toast.kind];
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };

  useEffect(() => {
    // Animate in
    const enter = setTimeout(() => setVisible(true), 20);
    // Auto-dismiss
    const exit = setTimeout(() => {
      setLeaving(true);
      setTimeout(onRemove, 300);
    }, toast.duration ?? 5000);
    return () => { clearTimeout(enter); clearTimeout(exit); };
  }, [toast.duration, onRemove]);

  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: `#0A2540`,
        border: `1px solid ${border}`,
        borderRadius: 10,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${border}`,
        backdropFilter: "blur(8px)",
        maxWidth: 340,
        width: "100%",
        cursor: toast.href ? "pointer" : "default",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(100%) scale(0.95)",
        opacity: visible && !leaving ? 1 : 0,
        position: "relative" as const,
      }}
      onClick={toast.href ? () => window.open(toast.href, "_blank") : undefined}
    >
      {/* Tinted background */}
      <div style={{ position: "absolute", inset: 0, background: bg, borderRadius: 10, pointerEvents: "none" }} />

      {/* Icon */}
      <span style={{ fontSize: 14, color: iconColor, flexShrink: 0, marginTop: 1, position: "relative" }}>
        {ICONS[toast.kind]}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC", marginBottom: toast.body ? 3 : 0, fontFamily: "'Plus Jakarta Sans',system-ui" }}>
          {toast.title}
        </div>
        {toast.body && (
          <div style={{ fontSize: 11, ...mono, color: "#4A7090", lineHeight: 1.5 }}>
            {toast.body}
          </div>
        )}
        {toast.href && (
          <div style={{ fontSize: 10, ...mono, color: iconColor, marginTop: 4 }}>
            tap to view ↗
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); setLeaving(true); setTimeout(onRemove, 300); }}
        style={{ fontSize: 12, color: "#4A7090", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, position: "relative", padding: "0 2px" }}
      >
        ×
      </button>
    </div>
  );

  return content;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const add = useCallback((t: Omit<Toast, "id">) => {
    const id = `toast_${Date.now()}_${counterRef.current++}`;
    setToasts(prev => [...prev.slice(-4), { ...t, id }]); // max 5 at once
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ add, remove }}>
      {children}
      {/* Portal-style fixed container */}
      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
        alignItems: "flex-end",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "all" }}>
            <ToastItem toast={t} onRemove={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
