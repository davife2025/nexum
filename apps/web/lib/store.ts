// ─────────────────────────────────────────────────────────────────────────────
// Nexum — In-memory Run Store
// Persists runs, payments, attestations across API calls within a server session.
// In production: replace with Redis / Postgres.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentRun, PaymentRecord, Attestation } from "@nexum/types";

export interface StoredRun {
  id: string;
  task: string;
  location: string;
  agentAddress: string;
  status: "running" | "complete" | "error";
  result?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  payments: PaymentRecord[];
  attestations: Attestation[];
  totalSpend: string;
  servicesUsed: string[];
  stepsCount: number;
}

// Global singleton — survives hot-reload in dev
const g = globalThis as unknown as { __nexumStore?: RunStore };

class RunStore {
  private runs = new Map<string, StoredRun>();

  upsert(run: Partial<StoredRun> & { id: string }) {
    const existing = this.runs.get(run.id) ?? {
      id: run.id,
      task: "",
      location: "",
      agentAddress: "",
      status: "running" as const,
      startedAt: Date.now(),
      payments: [],
      attestations: [],
      totalSpend: "0",
      servicesUsed: [],
      stepsCount: 0,
    };
    this.runs.set(run.id, { ...existing, ...run });

    // Prune to 100 most recent runs to prevent unbounded growth
    if (this.runs.size > 100) {
      const sorted = Array.from(this.runs.entries())
        .sort(([, a], [, b]) => b.startedAt - a.startedAt);
      // Keep the 100 newest
      const toDelete = sorted.slice(100).map(([id]) => id);
      toDelete.forEach(id => this.runs.delete(id));
    }
  }

  get(id: string): StoredRun | undefined {
    return this.runs.get(id);
  }

  delete(id: string): boolean {
    return this.runs.delete(id);
  }

  all(): StoredRun[] {
    return Array.from(this.runs.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  recent(limit = 20): StoredRun[] {
    return this.all().slice(0, limit);
  }

  addPayment(runId: string, payment: PaymentRecord) {
    const run = this.runs.get(runId);
    if (!run) return;
    run.payments = [...run.payments.filter((p) => p.id !== payment.id), payment];
    run.totalSpend = run.payments
      .reduce((s, p) => {
        const n = parseFloat(p.amountDisplay?.split(" ")[0] ?? "0");
        return s + (isNaN(n) ? 0 : n);
      }, 0)
      .toFixed(4);
    this.runs.set(runId, run);
  }

  addAttestation(runId: string, attestation: Attestation) {
    const run = this.runs.get(runId);
    if (!run) return;
    run.attestations = [...run.attestations.filter((a) => a.id !== attestation.id), attestation];
    this.runs.set(runId, run);
  }

  stats() {
    const all = this.all();
    const complete = all.filter((r) => r.status === "complete");
    const totalPayments = all.flatMap((r) => r.payments).length;
    const totalSpend = all
      .flatMap((r) => r.payments)
      .reduce((s, p) => s + parseFloat(p.amountDisplay?.split(" ")[0] ?? "0"), 0);
    const avgDuration =
      complete.length > 0
        ? complete.reduce((s, r) => s + (r.durationMs ?? 0), 0) / complete.length
        : 0;

    return {
      totalRuns: all.length,
      completeRuns: complete.length,
      totalPayments,
      totalSpend: totalSpend.toFixed(4),
      avgDurationMs: Math.round(avgDuration),
    };
  }

  // Seed with demo data so the app looks alive on first load
  seed() {
    if (this.runs.size > 0) return;
    const demo: StoredRun[] = [
      {
        id: "run_demo_001",
        task: "Analyse DeFi yield opportunities cross-referenced with weather patterns in Lagos",
        location: "Lagos",
        agentAddress: "0x4f2a8C3d1E9B5F7A2C4E6D8B0F3A5C7E9B1D3F5A",
        status: "complete",
        startedAt: Date.now() - 3600000 * 3,
        completedAt: Date.now() - 3600000 * 3 + 9400,
        durationMs: 9400,
        result: "Analysis complete. Lagos weather patterns show a correlation with DeFi liquidity cycles during wet season months. Yield opportunities on Kite-native protocols averaged 14.2% APY versus 8.7% on competing chains during the observed period. Autonomous agent recommendation: allocate 60% to Kite stablecoin vaults during low-volatility windows correlated with stable weather conditions.",
        payments: [
          { id: "pay_d001a", runId: "run_demo_001", serviceId: "kite-weather", serviceName: "Kite Weather API", amount: "1000000000000000000", amountDisplay: "1.0000 KITE", token: "KITE", payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19", status: "settled", timestamp: Date.now() - 3600000 * 3 + 3000, txHash: "0x7f3e2a1d9b4c8e5f0a3d6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f3a6b", explorerUrl: "https://testnet.kitescan.ai/tx/0x7f3e2a1d9b4c8e5f0a3d" },
          { id: "pay_d001b", runId: "run_demo_001", serviceId: "nexum-finance", serviceName: "Nexum Finance Oracle", amount: "5000000000000000000", amountDisplay: "5.0000 KITE", token: "KITE", payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19", status: "settled", timestamp: Date.now() - 3600000 * 3 + 5000, txHash: "0x9c1f4e7b2a5d8e1f4a7b0c3e6f9a2b5d8e1f4a7b0c3e6f9a2b5d8e1f4a7b0c", explorerUrl: "https://testnet.kitescan.ai/tx/0x9c1f4e7b2a5d8e1f" },
        ],
        attestations: [
          { id: "att_d001a", runId: "run_demo_001", type: "agent_init", contentHash: "0x3a1d9b4c8e5f0a3d6b9c", metadata: "Task start", txHash: "0xa1b2c3d4e5f60001", explorerUrl: "https://testnet.kitescan.ai/tx/0xa1b2c3d4e5f60001", timestamp: Date.now() - 3600000 * 3, status: "confirmed" },
          { id: "att_d001b", runId: "run_demo_001", type: "task_complete", contentHash: "0x4b2e0c5d6f7a1b3c4d5e", metadata: "Task complete", txHash: "0xb2c8d4f91a3e5b7c0001", explorerUrl: "https://testnet.kitescan.ai/tx/0xb2c8d4f91a3e5b7c0001", timestamp: Date.now() - 3600000 * 3 + 9400, status: "confirmed" },
        ],
        totalSpend: "6.0000",
        servicesUsed: ["kite-weather", "nexum-finance"],
        stepsCount: 5,
      },
      {
        id: "run_demo_002",
        task: "Research AI inference pricing across Kite-compatible protocols",
        location: "Tokyo",
        agentAddress: "0x4f2a8C3d1E9B5F7A2C4E6D8B0F3A5C7E9B1D3F5A",
        status: "complete",
        startedAt: Date.now() - 3600000 * 8,
        completedAt: Date.now() - 3600000 * 8 + 7200,
        durationMs: 7200,
        result: "Nexum AI inference pricing benchmarked at 2 KITE per 1k tokens versus centralised alternatives at effective rates of 4–8 KITE-equivalent. On-chain settlement via x402 adds verifiability at negligible overhead (< 0.000001 KITE gas). Recommendation: Kite-native inference is cost-competitive and uniquely auditable.",
        payments: [
          { id: "pay_d002a", runId: "run_demo_002", serviceId: "kite-weather", serviceName: "Kite Weather API", amount: "1000000000000000000", amountDisplay: "1.0000 KITE", token: "KITE", payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19", status: "settled", timestamp: Date.now() - 3600000 * 8 + 2000, txHash: "0x3a6b9c2e5f8a1b4d7e0f3a6b9c2e5f8a1b4d7e0f", explorerUrl: "https://testnet.kitescan.ai/tx/0x3a6b9c2e5f8a1b4d" },
        ],
        attestations: [
          { id: "att_d002a", runId: "run_demo_002", type: "task_complete", contentHash: "0x5c3f1d2e4a6b8c0d2f4a", metadata: "Task complete", txHash: "0xd4f91a3e5b7c0d020002", explorerUrl: "https://testnet.kitescan.ai/tx/0xd4f91a3e5b7c0d020002", timestamp: Date.now() - 3600000 * 8 + 7200, status: "confirmed" },
        ],
        totalSpend: "1.0000",
        servicesUsed: ["kite-weather"],
        stepsCount: 4,
      },
    ];
    demo.forEach((r) => this.runs.set(r.id, r));
  }
}

if (!g.__nexumStore) {
  g.__nexumStore = new RunStore();
  g.__nexumStore.seed();
}

export const store = g.__nexumStore;
