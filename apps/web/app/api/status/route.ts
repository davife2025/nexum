import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ServiceStatus {
  id: string;
  name: string;
  endpoint: string;
  status: "live" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  requires402: boolean;
  checkedAt: string;
}

const SERVICES_TO_CHECK = [
  { id: "kite-weather",   name: "Kite Weather API",     endpoint: "https://x402.dev.gokite.ai/api/weather?location=London" },
  { id: "nexum-finance",  name: "Nexum Finance Oracle",  endpoint: "https://x402.dev.gokite.ai/api/finance" },
  { id: "nexum-ai",       name: "Nexum AI Inference",   endpoint: "https://x402.dev.gokite.ai/api/inference" },
  { id: "kite-identity",  name: "Kite Identity Verifier",endpoint: "https://x402.dev.gokite.ai/api/identity" },
  { id: "nexum-compute",  name: "Decentralised Compute", endpoint: "https://x402.dev.gokite.ai/api/compute" },
];

async function checkService(svc: typeof SERVICES_TO_CHECK[0]): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch(svc.endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    // 402 means the service is live and correctly requiring payment
    if (res.status === 402) {
      return { id: svc.id, name: svc.name, endpoint: svc.endpoint, status: "live", latencyMs, requires402: true, checkedAt: new Date().toISOString() };
    }
    // 200 also acceptable (open endpoint)
    if (res.ok) {
      return { id: svc.id, name: svc.name, endpoint: svc.endpoint, status: "live", latencyMs, requires402: false, checkedAt: new Date().toISOString() };
    }
    // 5xx = degraded
    if (res.status >= 500) {
      return { id: svc.id, name: svc.name, endpoint: svc.endpoint, status: "degraded", latencyMs, requires402: false, checkedAt: new Date().toISOString() };
    }

    return { id: svc.id, name: svc.name, endpoint: svc.endpoint, status: "unknown", latencyMs, requires402: false, checkedAt: new Date().toISOString() };
  } catch {
    return { id: svc.id, name: svc.name, endpoint: svc.endpoint, status: "down", latencyMs: null, requires402: false, checkedAt: new Date().toISOString() };
  }
}

export async function GET() {
  const results = await Promise.allSettled(SERVICES_TO_CHECK.map(checkService));

  const statuses: ServiceStatus[] = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { id: SERVICES_TO_CHECK[i].id, name: SERVICES_TO_CHECK[i].name, endpoint: SERVICES_TO_CHECK[i].endpoint, status: "down" as const, latencyMs: null, requires402: false, checkedAt: new Date().toISOString() }
  );

  const live = statuses.filter(s => s.status === "live").length;
  const degraded = statuses.filter(s => s.status === "degraded").length;
  const avgLatency = statuses
    .filter(s => s.latencyMs !== null)
    .reduce((sum, s, _, arr) => sum + (s.latencyMs ?? 0) / arr.length, 0);

  return NextResponse.json({
    services: statuses,
    summary: {
      total: statuses.length,
      live,
      degraded,
      down: statuses.filter(s => s.status === "down").length,
      avgLatencyMs: Math.round(avgLatency),
      overallStatus: degraded > 0 ? "degraded" : live === statuses.length ? "operational" : "partial",
    },
    checkedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
  });
}
