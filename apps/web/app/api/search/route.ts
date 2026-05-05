import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../lib/store";
import { listSessions } from "../../../lib/passport-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Static service definitions mirrored from /api/services for search
const SEARCHABLE_SERVICES = [
  { id: "kite-weather",   name: "Kite Weather API",       category: "data",     tags: ["weather","real-time","IoT"] },
  { id: "nexum-finance",  name: "Nexum Finance Oracle",   category: "finance",  tags: ["DeFi","TVL","yield"] },
  { id: "nexum-ai",       name: "Nexum AI Inference",     category: "ai",       tags: ["LLM","inference","compute"] },
  { id: "kite-identity",  name: "Kite Identity Verifier", category: "identity", tags: ["KYC","passport","reputation"] },
  { id: "nexum-compute",  name: "Decentralised Compute",  category: "compute",  tags: ["GPU","ML","training"] },
  { id: "nexum-storage",  name: "Decentralised Storage",  category: "data",     tags: ["storage","IPFS","encrypted"] },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], query: q, total: 0 });
  }

  const runs = store.recent(200);
  const results: Array<{
    type: "run" | "payment" | "attestation" | "session";
    id: string;
    title: string;
    subtitle: string;
    href: string;
    meta?: string;
  }> = [];

  // ── Passport sessions ─────────────────────────────────────────────────────
  // Searchable by id, agentId, task summary, or status keyword.
  // Also surfaces all sessions when q matches "passport" or "session".
  const isMetaQuery = q === "passport" || q === "session" || q === "sessions" || q === "kite passport";
  for (const s of listSessions()) {
    const matches =
      isMetaQuery ||
      s.id.toLowerCase().includes(q) ||
      s.agentId.toLowerCase().includes(q) ||
      s.taskSummary.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q);
    if (matches) {
      results.push({
        type: "session",
        id: s.id,
        title: `⛨ Passport session — ${s.taskSummary.slice(0, 60)}`,
        subtitle: `${s.status} · ${s.totalSpent} of ${s.maxTotalAmount} · ${s.callCount} call${s.callCount !== 1 ? "s" : ""}`,
        href: "/agent",
        meta: s.id.slice(-14),
      });
    }
  }

  for (const run of runs) {
    // Match run task, id, location, or result snippet
    if (
      run.task.toLowerCase().includes(q) ||
      run.id.toLowerCase().includes(q) ||
      run.location.toLowerCase().includes(q) ||
      (run.result && run.result.toLowerCase().includes(q))
    ) {
      results.push({
        type: "run",
        id: run.id,
        title: run.task.length > 72 ? run.task.slice(0, 72) + "…" : run.task,
        subtitle: `${run.location} · ${run.status} · ${run.payments.length} payment${run.payments.length !== 1 ? "s" : ""}`,
        href: `/app/runs/${run.id}`,
        meta: run.id.slice(-12),
      });
    }

    // Match payments — including origin and sessionId
    for (const p of run.payments) {
      if (
        p.serviceName.toLowerCase().includes(q) ||
        p.serviceId.toLowerCase().includes(q) ||
        (p.txHash && p.txHash.toLowerCase().includes(q)) ||
        (p.origin && p.origin.toLowerCase().includes(q)) ||
        (p.sessionId && p.sessionId.toLowerCase().includes(q))
      ) {
        const originBadge = p.origin === "passport" ? "⛨ " : "";
        results.push({
          type: "payment",
          id: p.id,
          title: `${originBadge}${p.serviceName} — ${p.amountDisplay}`,
          subtitle: `Run ${run.id.slice(-10)} · ${p.status}${p.sessionId ? ` · session ${p.sessionId.slice(-10)}` : ""}`,
          href: `/app/runs/${run.id}`,
          meta: p.txHash ? `${p.txHash.slice(0, 12)}…` : undefined,
        });
      }
    }

    // Match attestations
    for (const a of run.attestations) {
      if (
        (a.metadata && a.metadata.toLowerCase().includes(q)) ||
        (a.txHash && a.txHash.toLowerCase().includes(q)) ||
        a.type.includes(q)
      ) {
        results.push({
          type: "attestation",
          id: a.id,
          title: `${a.type} attestation`,
          subtitle: a.metadata ?? run.task.slice(0, 60),
          href: `/attestations`,
          meta: a.txHash ? `${a.txHash.slice(0, 12)}…` : undefined,
        });
      }
    }
  }

  // Deduplicate by id and limit
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, 20);

  return NextResponse.json({ results: deduped, query: q, total: deduped.length });
}
