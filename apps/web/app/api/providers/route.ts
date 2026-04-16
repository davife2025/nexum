import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory pending registrations — in production: DB + email notification
const g = globalThis as unknown as { __nexumRegistrations?: Registration[] };

interface Registration {
  id: string;
  name: string;
  endpoint: string;
  wallet: string;
  category: string;
  price: string;
  desc: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

function getRegistrations(): Registration[] {
  if (!g.__nexumRegistrations) g.__nexumRegistrations = [];
  return g.__nexumRegistrations;
}

export async function GET() {
  return NextResponse.json({ registrations: getRegistrations() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, endpoint, wallet, category, price, desc } = body;

    // Validate required fields
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!endpoint?.trim()) return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    if (!wallet?.trim()) return NextResponse.json({ error: "wallet is required" }, { status: 400 });

    // Basic endpoint format check
    try { new URL(endpoint); } catch {
      return NextResponse.json({ error: "endpoint must be a valid URL" }, { status: 400 });
    }

    // Basic wallet check
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet.trim())) {
      return NextResponse.json({ error: "wallet must be a valid EVM address (0x...)" }, { status: 400 });
    }

    const reg: Registration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      endpoint: endpoint.trim(),
      wallet: wallet.trim(),
      category: category ?? "data",
      price: price ?? "1",
      desc: desc?.trim() ?? "",
      submittedAt: new Date().toISOString(),
      status: "pending",
    };

    getRegistrations().push(reg);

    return NextResponse.json({
      ok: true,
      id: reg.id,
      message: "Service submitted for review. You will be notified within 48 hours.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
