import { NextResponse } from "next/server";
import { store } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = store.stats();
  const runs = store.recent(200);

  const payments = runs.flatMap((r) => r.payments);
  const attestations = runs.flatMap((r) => r.attestations);

  const spentToday = payments
    .filter((p) => Date.now() - p.timestamp < 86400000)
    .reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);

  const uniqueServices = new Set(payments.map((p) => p.serviceId)).size;

  // Payment origin breakdown (Passport vs local). Untagged payments are
  // counted as "local" for backwards compatibility with pre-Passport data.
  const passportPayments = payments.filter((p) => p.origin === "passport").length;
  const localPayments = payments.length - passportPayments;
  const uniqueSessions = new Set(
    payments.filter((p) => p.sessionId).map((p) => p.sessionId)
  ).size;

  return NextResponse.json({
    ...stats,
    spentToday: spentToday.toFixed(4),
    totalAttestations: attestations.length,
    uniqueServices,
    activeRuns: runs.filter((r) => r.status === "running").length,
    paymentOrigin: {
      passport: passportPayments,
      local: localPayments,
      uniqueSessions,
    },
    ts: new Date().toISOString(),
  });
}
