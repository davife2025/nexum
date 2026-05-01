// ─────────────────────────────────────────────────────────────────────────────
// POST /api/passport/sessions  — create a new spending session
// GET  /api/passport/sessions  — list sessions
//
// Create body:
//   { taskSummary, maxAmountPerTx, maxTotalAmount, ttl,
//     assets?, paymentApproach? }
//
// On success the session is returned in `pending_approval` status.
// In simulate mode a follow-up `markApproved` call promotes it to active
// after a short delay so the demo is hands-free.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  getClient,
  getConnection,
  upsertSession,
  listSessions,
  markApproved,
} from "@/lib/passport-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sessions: listSessions() });
}

export async function POST(req: Request) {
  const conn = getConnection();
  if (conn.status !== "connected" || !conn.agentId) {
    return NextResponse.json(
      { error: "Connect Kite Passport first." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const taskSummary = String(body.taskSummary ?? "Nexum agent commerce session");
  const maxAmountPerTx = String(body.maxAmountPerTx ?? "2");
  const maxTotalAmount = String(body.maxTotalAmount ?? "10");
  const ttl = String(body.ttl ?? "24h");
  const assets = Array.isArray(body.assets) && body.assets.length > 0
    ? (body.assets as string[])
    : ["USDC"];
  const paymentApproach =
    body.paymentApproach === "mpp" ? "mpp" : "x402_http";

  const client = getClient();
  let session;
  try {
    session = await client.createSession({
      agentId: conn.agentId,
      taskSummary,
      maxAmountPerTx,
      maxTotalAmount,
      ttl,
      assets,
      paymentApproach,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  upsertSession(session);

  // Simulate mode: auto-approve so the demo is single-click. In production,
  // the user approves with their passkey on the Passport dashboard and the
  // backend webhook (or polling) flips status to "active".
  if (client.isSimulated && session.status === "pending_approval") {
    setTimeout(() => markApproved(session.id), 1200);
  }

  return NextResponse.json({ session });
}
