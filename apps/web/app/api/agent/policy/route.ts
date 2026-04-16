import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory policy store — in production use a DB or KV
const g = globalThis as unknown as { __nexumPolicy?: SpendPolicy };

interface SpendPolicy {
  perCall: string;
  perDay: string;
  perMonth: string;
  categories: string[];
  updatedAt: number;
}

const DEFAULT_POLICY: SpendPolicy = {
  perCall: "50",
  perDay: "500",
  perMonth: "5000",
  categories: ["data", "finance", "ai", "identity", "compute"],
  updatedAt: Date.now(),
};

function getPolicy(): SpendPolicy {
  return g.__nexumPolicy ?? DEFAULT_POLICY;
}

export async function GET() {
  return NextResponse.json(getPolicy());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getPolicy();

    const updated: SpendPolicy = {
      perCall: String(parseFloat(body.perCall ?? current.perCall)),
      perDay: String(parseFloat(body.perDay ?? current.perDay)),
      perMonth: String(parseFloat(body.perMonth ?? current.perMonth)),
      categories: Array.isArray(body.categories) ? body.categories : current.categories,
      updatedAt: Date.now(),
    };

    // Validate
    if (parseFloat(updated.perCall) <= 0) {
      return NextResponse.json({ error: "perCall must be > 0" }, { status: 400 });
    }
    if (parseFloat(updated.perDay) < parseFloat(updated.perCall)) {
      return NextResponse.json({ error: "perDay must be >= perCall" }, { status: 400 });
    }
    if (parseFloat(updated.perMonth) < parseFloat(updated.perDay)) {
      return NextResponse.json({ error: "perMonth must be >= perDay" }, { status: 400 });
    }
    if (updated.categories.length === 0) {
      return NextResponse.json({ error: "At least one category must be allowed" }, { status: 400 });
    }

    g.__nexumPolicy = updated;
    return NextResponse.json({ ok: true, policy: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
