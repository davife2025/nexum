import { NextResponse } from "next/server";
import { store } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runs = store.recent(50);
  const stats = store.stats();
  return NextResponse.json({ runs, stats });
}
