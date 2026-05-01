// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/passport/sessions/[id] — fetch session detail
// DELETE /api/passport/sessions/[id] — revoke an active session
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  getClient,
  getSession,
  upsertSession,
} from "@/lib/passport-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const id = ctx.params.id;
  let session = getSession(id);

  // Refresh from Passport backend if real (not sim).
  const client = getClient();
  if (!client.isSimulated) {
    try {
      session = await client.getSession(id);
      if (session) upsertSession(session);
    } catch {
      // fall through to whatever we had cached
    }
  }

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const id = ctx.params.id;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  try {
    await getClient().revokeSession(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  session.status = "revoked";
  upsertSession(session);
  return NextResponse.json({ session });
}
