import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mirror of the client-side detector in /attestations/page.tsx — kept in
// sync so the summary count matches what the UI filter renders.
function isPassportAttestation(metadata?: string): boolean {
  if (!metadata) return false;
  const m = metadata.toLowerCase();
  return m.startsWith("passport ") || m.includes("mode: passport");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const runId = searchParams.get("runId");
  const passportOnly = searchParams.get("passport") === "true";

  const runs = store.recent(200);
  let attestations = runs.flatMap((r) =>
    r.attestations.map((a) => ({
      ...a,
      runTask: r.task.slice(0, 80),
      agentAddress: r.agentAddress,
    }))
  );

  if (type) attestations = attestations.filter((a) => a.type === type);
  if (runId) attestations = attestations.filter((a) => a.runId === runId);
  if (passportOnly) attestations = attestations.filter((a) => isPassportAttestation(a.metadata));

  attestations = attestations.sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json({
    attestations,
    summary: {
      total: attestations.length,
      byType: Object.fromEntries(
        ["agent_init", "task_start", "payment", "task_complete"].map((t) => [
          t,
          attestations.filter((a) => a.type === t).length,
        ])
      ),
      passportCount: attestations.filter((a) => isPassportAttestation(a.metadata)).length,
    },
  });
}
