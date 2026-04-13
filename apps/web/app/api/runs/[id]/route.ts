import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const run = store.get(params.id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json(run);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const run = store.get(params.id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  store.delete(params.id);
  return NextResponse.json({ ok: true, deleted: params.id });
}
