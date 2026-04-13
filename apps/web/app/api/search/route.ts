import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], query: q, total: 0 });
  }

  const runs = store.recent(200);
  const results: Array<{
    type: "run" | "payment" | "attestation";
    id: string;
    title: string;
    subtitle: string;
    href: string;
    meta?: string;
  }> = [];

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

    // Match payments
    for (const p of run.payments) {
      if (
        p.serviceName.toLowerCase().includes(q) ||
        p.serviceId.toLowerCase().includes(q) ||
        (p.txHash && p.txHash.toLowerCase().includes(q))
      ) {
        results.push({
          type: "payment",
          id: p.id,
          title: `${p.serviceName} — ${p.amountDisplay}`,
          subtitle: `Run ${run.id.slice(-10)} · ${p.status}`,
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
