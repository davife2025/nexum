// ─────────────────────────────────────────────────────────────────────────────
// GET /api/passport/status
//
// Returns the current Passport connection state + a summary of sessions.
// The browser polls this to drive the /agent UI.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  getConnection,
  setConnection,
  listSessions,
  activeSession,
  getClient,
} from "@/lib/passport-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = getClient();
  let connection = getConnection();

  // If we believe we're connected, refresh from the Passport backend.
  // In simulate mode this returns cached fixtures.
  if (connection.status === "connected" || process.env.KITE_PASSPORT_API_KEY) {
    try {
      const me = await client.me();
      connection = setConnection(me);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      connection = setConnection({ status: "error", error: msg });
    }
  }

  const sessions = listSessions();
  const active = activeSession();

  return NextResponse.json({
    connection,
    simulate: client.isSimulated,
    activeSessionId: active?.id ?? null,
    sessions: sessions.slice(0, 20),
    sessionCount: sessions.length,
  });
}
