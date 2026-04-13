import { NextResponse } from "next/server";
import { store } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runs = store.recent(500);
  const payments = runs.flatMap((r) =>
    r.payments.map((p) => ({
      date: new Date(p.timestamp).toISOString(),
      runId: r.id,
      task: `"${r.task.replace(/"/g, "'")}"`,
      location: r.location,
      service: p.serviceName,
      serviceId: p.serviceId,
      amount: p.amountDisplay,
      token: p.token,
      payTo: p.payTo,
      status: p.status,
      txHash: p.txHash ?? "",
      explorerUrl: p.explorerUrl ?? "",
      agentAddress: r.agentAddress,
    }))
  );

  const headers = [
    "date", "runId", "task", "location", "service", "serviceId",
    "amount", "token", "payTo", "status", "txHash", "explorerUrl", "agentAddress",
  ];

  const rows = payments.map((p) =>
    headers.map((h) => (p as Record<string, string>)[h] ?? "").join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="nexum-payments-${Date.now()}.csv"`,
    },
  });
}
