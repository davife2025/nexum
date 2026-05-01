"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppNav from "../components/AppNav";
import RunsMonitor from "../components/RunsMonitor";
import QuickTasks from "../components/QuickTasks";
import ServiceStatusStrip from "../components/ServiceStatusStrip";
import { useToast } from "../components/Toast";
import type { AgentEvent, AgentStep, PaymentRecord, ServiceListing, Attestation } from "@nexum/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunState {
  runId: string;
  agentAddress: string;
  steps: AgentStep[];
  payments: PaymentRecord[];
  services: Partial<ServiceListing>[];
  attestations: Partial<Attestation>[];
  result: string | null;
  error: string | null;
  attestationUrl: string | null;
  totalSpend: string;
  status: "idle" | "running" | "complete" | "error";
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function upsertStep(steps: AgentStep[], update: Partial<AgentStep> & { id: string }): AgentStep[] {
  const idx = steps.findIndex((s) => s.id === update.id);
  const merged = { ...steps[idx], ...update } as AgentStep;
  return idx === -1 ? [...steps, merged] : steps.map((s, i) => (i === idx ? merged : s));
}

function formatElapsed(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// ── Step styling ──────────────────────────────────────────────────────────────

function stepClasses(status?: string) {
  switch (status) {
    case "running": return "border-[rgba(0,229,201,0.45)] bg-[rgba(0,229,201,0.04)]";
    case "success": return "border-[rgba(123,94,255,0.40)] bg-[rgba(123,94,255,0.05)]";
    case "error":   return "border-[rgba(255,77,106,0.35)] bg-[rgba(255,77,106,0.05)]";
    case "skipped": return "border-[#1E3A5F] opacity-60";
    default:        return "border-[#1E3A5F]";
  }
}

function stepAccent(status?: string) {
  switch (status) {
    case "running": return "text-[#00E5C9]";
    case "success": return "text-[#7B5EFF]";
    case "error":   return "text-[#FF4D6A]";
    default:        return "text-[#4A7090]";
  }
}

function stepDot(status?: string) {
  switch (status) {
    case "running": return "dot dot-amber";
    case "success": return "dot dot-violet";
    case "error":   return "dot dot-error";
    default:        return "dot dot-muted";
  }
}

function stepSymbol(id: string, status?: string) {
  if (status === "success") return "✓";
  if (status === "error")   return "✗";
  if (status === "skipped") return "⊘";
  const icons: Record<string, string> = {
    agent_init: "◈", discover: "◎", ai_task: "✦", settle: "⛓",
  };
  if (id.startsWith("pay_")) return "⚡";
  return icons[id] ?? "◌";
}

const CATEGORY_COLOR: Record<string, string> = {
  data:     "text-[#00E5C9]",
  finance:  "text-[#7B5EFF]",
  ai:       "text-purple-300",
  identity: "text-[#FFB300]",
  compute:  "text-orange-400",
  other:    "text-[#4A7090]",
};


const LOCATIONS = ["San Francisco", "Lagos", "Tokyo", "London", "Singapore", "Dubai"];

// ── Component ─────────────────────────────────────────────────────────────────

function NexumDashboardInner() {
  const searchParams = useSearchParams();
  const [task, setTask] = useState("");
  const [location, setLocation] = useState("San Francisco");
  const [run, setRun] = useState<RunState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"trace" | "payments" | "services" | "report">("trace");
  const abortRef = useRef<AbortController | null>(null);
  const executeRef = useRef<HTMLButtonElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const { add: toast } = useToast();

  // Pre-fill from Marketplace "Dispatch Agent →" link or Run Detail "↺ Re-run"
  useEffect(() => {
    const serviceId = searchParams?.get("service");
    const taskParam = searchParams?.get("task");
    const locationParam = searchParams?.get("location");

    if (taskParam) {
      setTask(decodeURIComponent(taskParam));
      if (locationParam) setLocation(decodeURIComponent(locationParam));
      return;
    }

    if (serviceId && !task) {
      fetch(`/api/services?id=${serviceId}`)
        .then(r => r.ok ? r.json() : null)
        .then(svc => {
          if (svc?.name) {
            setTask(`Analyse and summarise data from the ${svc.name} service on Kite chain`);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isRunning) {
      setNow(Date.now()); // update once on stop so final elapsed is accurate
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  const elapsed = run
    ? ((run.completedAt ?? (isRunning ? now : run.startedAt + (run.durationMs ?? 0))) - run.startedAt)
    : 0;

  useEffect(() => {
    if (run?.result && run.status === "complete") setActiveTab("report");
  }, [run?.result, run?.status]);

  useEffect(() => {
    if (isRunning) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [run?.steps.length, isRunning]);

  // Use a ref for toast so handleEvent doesn't need it as a dependency
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const handleEvent = useCallback((event: AgentEvent) => {
    // Side-effects (toasts) — run outside setRun to avoid stale closure issues
    if (event.type === "run_complete") {
      const meta = event.meta as Record<string, string | number | undefined> | undefined;
      const spendStr = meta?.totalSpend ? ` · ${meta.totalSpend}` : "";
      const paymentsCount = Number(meta?.paymentsCount ?? 0);
      const attestationsCount = Number(meta?.attestationsCount ?? 0);
      toastRef.current({
        kind: "success",
        title: "Run complete",
        body: `${paymentsCount} payment${paymentsCount !== 1 ? "s" : ""}${spendStr} · ${attestationsCount} attestations`,
        href: typeof meta?.attestationUrl === "string" ? meta.attestationUrl : undefined,
        duration: 7000,
      });
    }
    if (event.type === "run_error") {
      toastRef.current({ kind: "error", title: "Agent error", body: (event.error ?? "Unknown error").slice(0, 80), duration: 6000 });
    }
    if (event.type === "payment_complete" && event.payment) {
      toastRef.current({ kind: "payment", title: `Paid ${event.payment.amountDisplay}`, body: event.payment.serviceName, duration: 4000 });
    }

    setRun((prev) => {
      if (!prev) return prev;
      switch (event.type) {
        case "run_start":
          return { ...prev, runId: event.runId, agentAddress: event.agent?.address ?? "" };
        case "step_start":
        case "step_update":
          if (!event.step?.id) return prev;
          return { ...prev, steps: upsertStep(prev.steps, { ...event.step, id: event.step.id, status: "running" } as AgentStep) };
        case "step_complete":
        case "step_error": {
          if (!event.step?.id) return prev;
          const next = { ...prev, steps: upsertStep(prev.steps, { ...event.step, id: event.step.id } as AgentStep), attestationUrl: event.attestation?.explorerUrl ?? prev.attestationUrl };
          if (event.payment) next.payments = [...prev.payments.filter((p) => p.id !== event.payment?.id), event.payment as PaymentRecord];
          return next;
        }
        case "service_discovered":
          if (!event.service) return prev;
          return { ...prev, services: [...prev.services.filter((s) => s.id !== event.service!.id), event.service] };
        case "payment_complete":
          if (!event.payment) return prev;
          return { ...prev, payments: [...prev.payments.filter((p) => p.id !== event.payment?.id), event.payment as PaymentRecord] };
        case "run_complete":
          return { ...prev, status: "complete", result: event.result ?? null, attestationUrl: (event.meta as Record<string, string>)?.attestationUrl ?? prev.attestationUrl, completedAt: event.timestamp };
        case "run_error":
          return { ...prev, status: "error", error: event.error ?? "Unknown error", completedAt: event.timestamp };
        default:
          return prev;
      }
    });
  }, []);

  const execute = useCallback(async () => {
    if (!task.trim() || isRunning) return;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setIsRunning(true);
    setActiveTab("trace");
    setRun({ runId: "", agentAddress: "", steps: [], payments: [], services: [], attestations: [], result: null, error: null, attestationUrl: null, totalSpend: "0", status: "running", startedAt: Date.now() });

    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: task.trim(), location }), signal: abort.signal });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { handleEvent(JSON.parse(line.slice(6))); } catch { }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setRun((p) => p ? { ...p, status: "error", error: (err as Error).message, completedAt: Date.now() } : null);
    } finally {
      setIsRunning(false);
    }
  }, [task, location, isRunning, handleEvent]);

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) execute(); };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen grid-bg" style={{ background: "#0F172A" }}>


      {/* ── Header ── */}
      <AppNav />


      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* ── Hero ── */}
        {!run && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-mono tag-teal mb-5">
              <span className="dot dot-teal" />AGENTIC COMMERCE · KITE CHAIN
            </div>
            <h1 className="font-display font-bold text-4xl md:text-6xl text-[#F8FAFC] mb-4 leading-tight">
              Autonomous Agents<br />
              <span className="text-glow-teal" style={{ color: "#00E5C9" }}>That Buy What They Need</span>
            </h1>
            <p className="text-[#4A7090] text-base max-w-xl mx-auto leading-relaxed">
              Nexum discovers services, executes x402 payments autonomously,
              enforces spend policy, and settles every action on Kite chain.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Task input */}
            <div className="nx-panel nx-corners p-5">
              <div className="text-xs font-mono text-[#4A7090] tracking-widest mb-4">// TASK</div>

              <label className="text-xs font-mono text-[#00E5C9] tracking-wider block mb-2">DESCRIBE YOUR OBJECTIVE</label>
              <textarea value={task} onChange={(e) => setTask(e.target.value)} onKeyDown={onKey} disabled={isRunning}
                placeholder="e.g. Analyse DeFi yield opportunities and cross-reference with real-time market data..."
                rows={4}
                className="w-full rounded-lg px-3.5 py-3 text-xs font-mono text-[#B8D4E8] placeholder-[#2A4060] focus:outline-none resize-none transition-all mb-1"
                style={{ background: "#0F172A", border: "1px solid #1E3A5F" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,201,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "#1E3A5F")}
              />
              <div className="text-xs font-mono text-[#2A4060] mb-4">⌘+Enter to execute</div>

              <label className="text-xs font-mono text-[#00E5C9] tracking-wider block mb-2">LOCATION CONTEXT</label>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {LOCATIONS.map((loc) => (
                  <button key={loc} onClick={() => setLocation(loc)}
                    className="px-2.5 py-1 text-xs font-mono rounded transition-all"
                    style={{
                      border: location === loc ? "1px solid rgba(0,229,201,0.6)" : "1px solid #1E3A5F",
                      color: location === loc ? "#00E5C9" : "#4A7090",
                      background: location === loc ? "rgba(0,229,201,0.08)" : "transparent",
                    }}>
                    {loc}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button ref={executeRef} onClick={execute} disabled={!task.trim() || isRunning}
                  className="btn-teal py-3 text-sm font-display font-semibold tracking-wide rounded-lg"
                  style={{ flex: 1 }}>
                  {isRunning
                    ? <span className="flex items-center justify-center gap-2"><span className="dot dot-amber" />AGENT RUNNING…</span>
                    : "▶ EXECUTE AGENT"}
                </button>
                {isRunning && (
                  <button
                    onClick={() => { abortRef.current?.abort(); setIsRunning(false); }}
                    style={{ fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.4)", background: "rgba(255,77,106,0.06)", padding: "0 16px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
                    ■ Stop
                  </button>
                )}
              </div>
            </div>

            {/* Quick tasks */}
            {!run && (
              <div className="nx-panel p-4">
                <QuickTasks onSelect={(t, loc) => { setTask(t); setLocation(loc); setTimeout(() => executeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }} />
              </div>
            )}

            {/* Run stats */}
            {run && (
              <div className="nx-panel p-4 space-y-3">
                <div className="text-xs font-mono text-[#4A7090] tracking-widest">// RUN STATS</div>
                {[
                  { label: "STATUS", value: run.status.toUpperCase(), color: run.status === "complete" ? "#7B5EFF" : run.status === "error" ? "#FF4D6A" : "#00E5C9" },
                  { label: "ELAPSED", value: formatElapsed(elapsed), color: "#B8D4E8" },
                  { label: "STEPS", value: `${run.steps.filter((s) => s.status === "success").length} / ${run.steps.length}`, color: "#B8D4E8" },
                  { label: "PAYMENTS", value: String(run.payments.length), color: "#B8D4E8" },
                  { label: "SERVICES", value: String(run.services.length), color: "#B8D4E8" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#4A7090]">{label}</span>
                    <span className="text-xs font-mono font-semibold" style={{ color }}>{value}</span>
                  </div>
                ))}

                {/* Progress bar */}
                {run.steps.length > 0 && (
                  <div>
                    <div style={{ background: "#0F172A", borderRadius: 4, height: 4, overflow: "hidden", marginTop: 4 }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        background: run.status === "complete" ? "#7B5EFF" : run.status === "error" ? "#FF4D6A" : "#00E5C9",
                        width: `${Math.round((run.steps.filter(s => s.status === "success").length / Math.max(run.steps.length, 5)) * 100)}%`,
                        transition: "width 0.5s ease",
                        boxShadow: run.status === "running" ? "0 0 8px #00E5C9" : "none",
                      }} />
                    </div>
                    <div className="text-xs font-mono mt-1" style={{ color: "#4A7090" }}>
                      {run.status === "complete" ? "100% complete" :
                       run.status === "error" ? "failed" :
                       `${Math.round((run.steps.filter(s => s.status === "success").length / Math.max(run.steps.length, 5)) * 100)}%`}
                    </div>
                  </div>
                )}

                {run.attestationUrl && (
                  <a href={run.attestationUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-1 w-full flex items-center justify-center gap-2 py-2 text-xs font-mono rounded-lg transition-colors"
                    style={{ border: "1px solid rgba(123,94,255,0.40)", color: "#7B5EFF", background: "rgba(123,94,255,0.06)" }}>
                    ⛓ VIEW ON KITESCAN ↗
                  </a>
                )}
              </div>
            )}

            {/* Discovered services */}
            {run && run.services.length > 0 && (
              <div className="nx-panel p-4">
                <div className="text-xs font-mono text-[#4A7090] tracking-widest mb-3">// SERVICES DISCOVERED</div>
                <div className="space-y-2.5">
                  {run.services.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between">
                      <div>
                        <div className={`text-xs font-sans font-medium ${CATEGORY_COLOR[svc.category ?? "other"] ?? "text-[#B8D4E8]"}`}>{svc.name}</div>
                        <div className="text-xs font-mono text-[#2A4060] mt-0.5">{svc.category}</div>
                      </div>
                      <span className="tag-teal">{svc.priceDisplay}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spend policy */}
            <div className="nx-panel p-4">
              <div className="text-xs font-mono text-[#4A7090] tracking-widest mb-3">// SPEND POLICY</div>
              <div className="space-y-2">
                {[
                  ["Max / call", "50 KITE"],
                  ["Max / day", "500 KITE"],
                  ["Max / month", "5,000 KITE"],
                  ["Settlement", "x402 / gokite-aa"],
                  ["Network", "Kite Testnet"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#4A7090]">{label}</span>
                    <span className="text-xs font-mono text-[#B8D4E8]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Service status */}
            <ServiceStatusStrip />
          </div>

          {/* ── Main panel ── */}
          <div className="lg:col-span-2">
            {!run ? (
              /* Idle — architecture flow */
              <div className="nx-panel nx-corners p-6 h-full">
                <div className="text-xs font-mono text-[#4A7090] tracking-widest mb-7">// HOW NEXUM WORKS</div>
                <div className="space-y-0">
                  {[
                    { icon: "◈", color: "#00E5C9", title: "AGENT INIT", desc: "Agent wallet initialises on Kite L1. Task hash written as an on-chain attestation — immutable start-of-run proof.", connector: true },
                    { icon: "◎", color: "#00E5C9", title: "SERVICE DISCOVERY", desc: "Scans the Kite AIR service registry. Scores and ranks APIs by task relevance, price, and SLA before purchasing.", connector: true },
                    { icon: "⚡", color: "#FFB300", title: "x402 PAYMENTS", desc: "For each service: GET → 402 Payment Required → sign EVM authorization → X-Payment header → retry → settle via Pieverse on Kite chain.", connector: true },
                    { icon: "✦", color: "#7B5EFF", title: "AI TASK", desc: "Claude synthesises all acquired data into a commerce intelligence brief. Zero human steps from input to output.", connector: true },
                    { icon: "⛓", color: "#7B5EFF", title: "SETTLE ON KITE", desc: "Completion proof (keccak256 result hash) anchored on Kite testnet. Every run is verifiable forever on KiteScan.", connector: false },
                  ].map((step) => (
                    <div key={step.title} className="relative flex gap-4">
                      {step.connector && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px opacity-30"
                          style={{ background: `linear-gradient(to bottom, ${step.color}, transparent)` }} />
                      )}
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-xl mt-0.5"
                        style={{ color: step.color, textShadow: `0 0 12px ${step.color}55` }}>
                        {step.icon}
                      </div>
                      <div className="pb-6">
                        <div className="text-xs font-display font-semibold tracking-widest mb-1.5"
                          style={{ color: step.color }}>{step.title}</div>
                        <p className="text-[#4A7090] text-xs leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chain stats */}
                <div className="mt-2 border-t border-[#1E3A5F] pt-5 grid grid-cols-3 gap-3 text-center">
                  {[["CHAIN", "KiteAI L1"], ["CHAIN ID", "2368"], ["GAS", "< $0.000001"]].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs font-mono text-[#4A7090] mb-1">{label}</div>
                      <div className="text-sm font-display font-semibold text-glow-teal" style={{ color: "#00E5C9" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Active run */
              <div className="nx-panel overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-[#1E3A5F]">
                  {(["trace", "payments", "services", "report"] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="flex-1 py-3.5 text-xs font-mono tracking-widest transition-all"
                      style={{
                        color: activeTab === tab ? "#00E5C9" : "#4A7090",
                        borderBottom: activeTab === tab ? "2px solid #00E5C9" : "2px solid transparent",
                        background: activeTab === tab ? "rgba(0,229,201,0.04)" : "transparent",
                      }}>
                      {tab.toUpperCase()}
                      {tab === "payments" && run.payments.length > 0 && <span className="ml-1" style={{ color: "#FFB300" }}>({run.payments.length})</span>}
                      {tab === "report" && run.result && <span className="ml-1" style={{ color: "#7B5EFF" }}>●</span>}
                    </button>
                  ))}
                </div>

                <div className="p-5 min-h-[480px] max-h-[70vh] overflow-y-auto">

                  {/* TRACE */}
                  {activeTab === "trace" && (
                    <div className="space-y-2">
                      {run.runId && <div className="text-xs font-mono text-[#2A4060] mb-4">run: {run.runId}</div>}
                      {run.steps.length === 0 && (
                        <div className="text-center py-16 text-[#4A7090] text-xs">
                          <div className="text-2xl mb-2 animate-pulse" style={{ color: "#00E5C9" }}>◈</div>
                          Initialising agent…
                        </div>
                      )}
                      {run.steps.map((step, i) => (
                        <div key={step.id}
                          className={`border rounded-lg p-4 transition-all animate-slide-up ${stepClasses(step.status)}`}
                          style={{ animationDelay: `${i * 40}ms` }}>
                          <div className="flex items-start gap-3">
                            <div className={`text-base w-6 text-center flex-shrink-0 mt-0.5 ${stepAccent(step.status)}`}
                              style={step.status === "running" ? { animation: "pulseGlow 1.2s ease-in-out infinite" } : {}}>
                              {stepSymbol(step.id, step.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-mono tracking-widest mb-1 ${stepAccent(step.status)}`}>{step.label}</div>
                              <p className="text-xs font-sans text-[#B8D4E8] leading-relaxed opacity-80">{step.description}</p>
                              {step.txHash && (
                                <a href={step.explorerUrl ?? `https://testnet.kitescan.ai/tx/${step.txHash}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-mono hover:opacity-80"
                                  style={{ color: "#7B5EFF" }}>
                                  ⛓ {step.txHash.slice(0, 14)}…{step.txHash.slice(-6)} ↗
                                </a>
                              )}
                            </div>
                            {step.completedAt && step.startedAt && step.status !== "running" && (
                              <span className="text-xs font-mono text-[#2A4060] flex-shrink-0">
                                {formatElapsed(step.completedAt - step.startedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {run.status === "complete" && (
                        <div className="text-center pt-4 text-xs font-mono animate-fade-in" style={{ color: "#4A7090" }}>
                          <span style={{ color: "#7B5EFF" }}>✓</span> Run complete · {run.steps.filter((s) => s.status === "success").length} steps · {formatElapsed(elapsed)}
                          {run.attestationUrl && <> · <a href={run.attestationUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80" style={{ color: "#00E5C9" }}>KiteScan ↗</a></>}
                        </div>
                      )}
                      {run.error && (
                        <div className="rounded-lg p-3 text-xs font-mono animate-fade-in" style={{ border: "1px solid rgba(255,77,106,0.3)", background: "rgba(255,77,106,0.05)", color: "#FF4D6A" }}>
                          ✗ {run.error}
                        </div>
                      )}
                      <div ref={bottomRef} />
                    </div>
                  )}

                  {/* PAYMENTS */}
                  {activeTab === "payments" && (
                    <div>
                      {run.payments.length === 0 ? (
                        <div className="text-center py-16 text-xs font-mono text-[#4A7090]">
                          <div className="text-2xl mb-2" style={{ color: "#FFB300" }}>⚡</div>
                          {isRunning ? "Awaiting payment execution…" : "No payments recorded"}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {run.payments.map((p) => (
                            <div key={p.id} className="rounded-lg p-4 animate-fade-in"
                              style={{ border: "1px solid rgba(0,229,201,0.25)", background: "rgba(0,229,201,0.04)" }}>
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                  <div className="text-sm font-display font-semibold" style={{ color: "#00E5C9" }}>{p.serviceName}</div>
                                  <div className="text-xs font-mono text-[#4A7090] mt-0.5">{p.serviceId}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-base font-display font-bold text-[#F8FAFC]">{p.amountDisplay}</div>
                                  <div className="text-xs font-mono mt-0.5" style={{ color: p.status === "settled" ? "#7B5EFF" : "#FFB300" }}>{p.status.toUpperCase()}</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                                <div>
                                  <div className="text-[#4A7090] mb-0.5">PAYEE</div>
                                  <div className="text-[#B8D4E8]">{p.payTo.slice(0, 14)}…</div>
                                </div>
                                <div>
                                  <div className="text-[#4A7090] mb-0.5">PROTOCOL</div>
                                  <div className="text-[#B8D4E8]">x402 / gokite-aa</div>
                                </div>
                              </div>
                              {p.txHash && (
                                <a href={p.explorerUrl ?? `https://testnet.kitescan.ai/tx/${p.txHash}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-mono hover:opacity-80"
                                  style={{ color: "#7B5EFF" }}>
                                  ⛓ {p.txHash.slice(0, 16)}…{p.txHash.slice(-6)} ↗
                                </a>
                              )}
                            </div>
                          ))}
                          <div className="rounded-lg p-3 flex items-center justify-between"
                            style={{ border: "1px solid #1E3A5F" }}>
                            <span className="text-xs font-mono text-[#4A7090]">TOTAL SPENT</span>
                            <span className="text-sm font-display font-bold" style={{ color: "#00E5C9" }}>
                              {run.payments.reduce((acc, p) => acc + Number(p.amountDisplay?.split(" ")[0] ?? 0), 0).toFixed(4)} KITE
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SERVICES */}
                  {activeTab === "services" && (
                    <div>
                      {run.services.length === 0 ? (
                        <div className="text-center py-16 text-xs font-mono text-[#4A7090]">
                          <div className="text-2xl mb-2" style={{ color: "#00E5C9" }}>◎</div>
                          {isRunning ? "Scanning registry…" : "No services discovered"}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {run.services.map((svc) => {
                            const paid = run.payments.find((p) => p.serviceId === svc.id);
                            return (
                              <div key={svc.id} className="rounded-lg p-4 animate-fade-in transition-all"
                                style={{ border: paid ? "1px solid rgba(123,94,255,0.35)" : "1px solid #1E3A5F", background: paid ? "rgba(123,94,255,0.05)" : "transparent" }}>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div>
                                    <div className={`text-sm font-display font-semibold ${CATEGORY_COLOR[svc.category ?? "other"] ?? "text-[#B8D4E8]"}`}>{svc.name}</div>
                                    <div className="text-xs font-sans text-[#4A7090] mt-0.5">{svc.description}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <span className="tag-teal">{svc.category}</span>
                                    {paid && <span className="text-xs font-mono" style={{ color: "#7B5EFF" }}>✓ PURCHASED</span>}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs font-mono text-[#4A7090]">
                                  <span>price: <span className="text-[#B8D4E8]">{svc.priceDisplay}</span></span>
                                  <span>billing: <span className="text-[#B8D4E8]">per-call</span></span>
                                  {svc.tags && <span>{svc.tags.slice(0, 3).join(" · ")}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* REPORT */}
                  {activeTab === "report" && (
                    <div>
                      {!run.result ? (
                        <div className="text-center py-16 text-xs font-mono text-[#4A7090]">
                          <div className="text-2xl mb-2 animate-pulse" style={{ color: "#7B5EFF" }}>✦</div>
                          {isRunning ? "Synthesising commerce intelligence…" : "No report yet"}
                        </div>
                      ) : (
                        <div className="animate-slide-up">
                          <div className="text-xs font-mono text-[#4A7090] tracking-widest mb-5">
                            // COMMERCE INTELLIGENCE BRIEF
                          </div>
                          <div className="space-y-4">
                            {run.result.split("\n\n").filter(Boolean).map((para, i) => (
                              <p key={i} className="text-sm font-sans leading-relaxed" style={{ color: "#B8D4E8" }}>
                                {para}
                              </p>
                            ))}
                          </div>

                          {/* Metadata footer */}
                          <div className="mt-8 pt-5 border-t border-[#1E3A5F]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono mb-4">
                              {[
                                { label: "AGENT", value: run.agentAddress ? shortAddr(run.agentAddress) : "—" },
                                { label: "PAYMENTS", value: String(run.payments.length) },
                                { label: "ELAPSED", value: formatElapsed(elapsed) },
                                { label: "NETWORK", value: "Kite Testnet" },
                              ].map(({ label, value }) => (
                                <div key={label}>
                                  <div className="text-[#4A7090] mb-1">{label}</div>
                                  <div className="text-[#B8D4E8]">{value}</div>
                                </div>
                              ))}
                            </div>
                            {run.attestationUrl && (
                              <div className="flex flex-wrap gap-3">
                                <a href={run.attestationUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg transition-colors"
                                  style={{ border: "1px solid rgba(123,94,255,0.40)", color: "#7B5EFF", background: "rgba(123,94,255,0.06)" }}>
                                  ⛓ VERIFY ON KITESCAN ↗
                                </a>
                                {run.runId && (
                                  <Link href={`/app/runs/${run.runId}`}
                                    className="inline-flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg transition-colors"
                                    style={{ border: "1px solid #1E3A5F", color: "#4A7090", background: "transparent" }}>
                                    VIEW FULL RUN DETAIL →
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Runs Monitor ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        <RunsMonitor />
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1E3A5F] mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-[#2A4060]">
            nexum · agentic commerce · kite ai · hackathon
          </span>
          <div className="flex items-center gap-5 text-xs font-mono text-[#4A7090]">
            {[["gokite.ai", "https://gokite.ai"], ["docs", "https://docs.gokite.ai"], ["explorer", "https://testnet.kitescan.ai"], ["faucet", "https://faucet.gokite.ai"]].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#00E5C9] transition-colors">{label} ↗</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function NexumDashboard() {
  return (
    <Suspense fallback={null}>
      <NexumDashboardInner />
    </Suspense>
  );
}
