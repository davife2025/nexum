import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProbeResult {
  live: boolean;
  status: number | null;
  latencyMs: number | null;
  requires402: boolean;
  requirement?: {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    payTo: string;
    asset: string;
    maxTimeoutSeconds: number;
    merchantName?: string;
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  let endpoint: string;
  try {
    const body = await req.json();
    endpoint = body.endpoint;
    if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    new URL(endpoint); // validate
  } catch {
    return NextResponse.json({ error: "invalid endpoint URL" }, { status: 400 });
  }

  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - start;

    if (res.status === 402) {
      let requirement;
      try {
        const body = await res.json();
        const accepts = body.accepts?.[0];
        if (accepts) {
          requirement = {
            scheme: accepts.scheme ?? "gokite-aa",
            network: accepts.network ?? "kite-testnet",
            maxAmountRequired: accepts.maxAmountRequired ?? "0",
            resource: accepts.resource ?? endpoint,
            payTo: accepts.payTo ?? "—",
            asset: accepts.asset ?? "—",
            maxTimeoutSeconds: accepts.maxTimeoutSeconds ?? 300,
            merchantName: accepts.merchantName,
          };
        }
      } catch { /* body unreadable */ }

      const result: ProbeResult = {
        live: true,
        status: 402,
        latencyMs,
        requires402: true,
        requirement,
      };
      return NextResponse.json(result);
    }

    return NextResponse.json({
      live: res.ok,
      status: res.status,
      latencyMs,
      requires402: false,
    } as ProbeResult);
  } catch (err: unknown) {
    return NextResponse.json({
      live: false,
      status: null,
      latencyMs: null,
      requires402: false,
      error: err instanceof Error ? err.message : "Probe failed",
    } as ProbeResult);
  }
}
