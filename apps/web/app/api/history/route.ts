import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("service");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const runs = store.recent(200);
  let payments = runs.flatMap((r) =>
    r.payments.map((p) => ({
      ...p,
      runTask: r.task,
      location: r.location,
      agentAddress: r.agentAddress,
    }))
  );

  if (serviceId) payments = payments.filter((p) => p.serviceId === serviceId);
  payments = payments.slice(0, limit);

  const totalSpend = payments.reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);
  const spentToday = payments
    .filter((p) => Date.now() - p.timestamp < 86400000)
    .reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);
  const spentMonth = payments
    .filter((p) => Date.now() - p.timestamp < 86400000 * 30)
    .reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);

  return NextResponse.json({
    payments,
    summary: {
      totalSpend: totalSpend.toFixed(4),
      spentToday: spentToday.toFixed(4),
      spentMonth: spentMonth.toFixed(4),
      count: payments.length,
    },
  });
}
