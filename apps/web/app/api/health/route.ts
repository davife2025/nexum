import { NextResponse } from "next/server";
import { store } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = store.stats();
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    app: "nexum",
    chain: "kite-testnet",
    chainId: 2368,
    rpc: "https://rpc-testnet.gokite.ai/",
    explorer: "https://testnet.kitescan.ai",
    uptime: process.uptime(),
    runs: stats,
    ts: new Date().toISOString(),
  });
}
