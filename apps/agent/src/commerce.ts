// ─────────────────────────────────────────────────────────────────────────────
// Nexum Agent — Commerce Engine
// Service discovery, evaluation, purchasing, subscription tracking
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceListing, SpendingPolicy, BudgetState, ServiceCategory } from "@nexum/types";

// ── Built-in Service Catalog ──────────────────────────────────────────────────
// In production: fetched from an on-chain service registry or Kite AIR platform

export const SERVICE_CATALOG: ServiceListing[] = [
  {
    id: "kite-weather",
    name: "Kite Weather API",
    description: "Real-time weather, temperature, and conditions for any global city",
    category: "data",
    endpoint: "https://x402.dev.gokite.ai/api/weather",
    billingModel: "per-call",
    pricePerCall: "1000000000000000000",
    priceDisplay: "$0.001",
    tokenAddress: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    network: "kite-testnet",
    tags: ["weather", "real-time", "IoT", "data"],
    sla: { uptime: 99.9, latencyMs: 200, maxRetries: 3 },
    callCount: 0,
  },
  {
    id: "nexum-finance",
    name: "Nexum Finance Oracle",
    description: "DeFi protocol TVL, yield rates, and liquidity data across chains",
    category: "finance",
    endpoint: "https://x402.dev.gokite.ai/api/finance",
    billingModel: "per-call",
    pricePerCall: "5000000000000000000",
    priceDisplay: "$0.005",
    tokenAddress: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    network: "kite-testnet",
    tags: ["DeFi", "TVL", "yield", "finance"],
    sla: { uptime: 99.5, latencyMs: 400, maxRetries: 2 },
    callCount: 0,
  },
  {
    id: "nexum-ai-inference",
    name: "Nexum AI Inference API",
    description: "Pay-per-token LLM inference with usage-based billing on Kite",
    category: "ai",
    endpoint: "https://x402.dev.gokite.ai/api/inference",
    billingModel: "usage-based",
    pricePerCall: "2000000000000000000",
    priceDisplay: "$0.002/1k tokens",
    tokenAddress: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    network: "kite-testnet",
    tags: ["AI", "inference", "LLM", "compute"],
    sla: { uptime: 99.0, latencyMs: 800, maxRetries: 3 },
    callCount: 0,
  },
  {
    id: "nexum-identity",
    name: "Kite Identity Verifier",
    description: "On-chain identity and reputation lookup via Kite Passport",
    category: "identity",
    endpoint: "https://x402.dev.gokite.ai/api/identity",
    billingModel: "per-call",
    pricePerCall: "500000000000000000",
    priceDisplay: "$0.0005",
    tokenAddress: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    network: "kite-testnet",
    tags: ["identity", "KYC", "passport", "reputation"],
    sla: { uptime: 99.9, latencyMs: 150, maxRetries: 2 },
    callCount: 0,
  },
  {
    id: "nexum-compute",
    name: "Decentralized Compute Node",
    description: "Rent compute units for AI/ML workloads, billed per GPU-minute",
    category: "compute",
    endpoint: "https://x402.dev.gokite.ai/api/compute",
    billingModel: "usage-based",
    pricePerCall: "10000000000000000000",
    priceDisplay: "$0.01/min",
    tokenAddress: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    network: "kite-testnet",
    tags: ["compute", "GPU", "ML", "training"],
    sla: { uptime: 98.0, latencyMs: 2000, maxRetries: 1 },
    callCount: 0,
  },
];

// ── Service Discovery ─────────────────────────────────────────────────────────

/**
 * Discover services relevant to a task description.
 * In production: query Kite AIR marketplace or on-chain service registry.
 */
export function discoverServices(
  taskDescription: string,
  policy: SpendingPolicy
): ServiceListing[] {
  const task = taskDescription.toLowerCase();

  // Score each service by relevance
  const scored = SERVICE_CATALOG.map((svc) => {
    let score = 0;

    // Category matching
    if (
      (task.includes("weather") || task.includes("climate") || task.includes("temperature")) &&
      svc.category === "data"
    ) score += 10;
    if (
      (task.includes("finance") || task.includes("defi") || task.includes("yield") ||
       task.includes("market") || task.includes("trade") || task.includes("invest")) &&
      svc.category === "finance"
    ) score += 10;
    if (
      (task.includes("ai") || task.includes("model") || task.includes("inference") ||
       task.includes("generate") || task.includes("analyze")) &&
      svc.category === "ai"
    ) score += 10;
    if (
      (task.includes("identity") || task.includes("kyc") || task.includes("verify") ||
       task.includes("reputation")) &&
      svc.category === "identity"
    ) score += 10;
    if (
      (task.includes("compute") || task.includes("train") || task.includes("gpu") ||
       task.includes("process")) &&
      svc.category === "compute"
    ) score += 10;

    // Tag matching
    svc.tags.forEach((tag) => {
      if (task.includes(tag.toLowerCase())) score += 3;
    });

    // Budget check — only include affordable services
    const priceOk =
      BigInt(svc.pricePerCall) <= BigInt(policy.maxPerCall);
    if (!priceOk) score = -1;

    return { svc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s.svc, discovered: true }));
}

/**
 * Evaluate and rank services for a purchase decision.
 */
export function rankServices(services: ServiceListing[]): ServiceListing[] {
  return [...services].sort((a, b) => {
    // Prefer lower price
    const priceDiff = Number(
      BigInt(a.pricePerCall) - BigInt(b.pricePerCall)
    );
    // Prefer higher uptime
    const uptimeDiff = (b.sla?.uptime ?? 0) - (a.sla?.uptime ?? 0);
    // Prefer lower latency
    const latencyDiff = (a.sla?.latencyMs ?? 9999) - (b.sla?.latencyMs ?? 9999);

    return priceDiff * 0.5 + uptimeDiff * 0.3 + latencyDiff * 0.2;
  });
}

// ── Default Spending Policy ───────────────────────────────────────────────────

export const DEFAULT_POLICY: SpendingPolicy = {
  id: "nexum-default",
  name: "Nexum Commerce Agent Policy",
  maxPerCall: "50000000000000000000",    // 50 KITE max per call
  maxPerDay: "500000000000000000000",    // 500 KITE/day
  maxPerMonth: "5000000000000000000000", // 5000 KITE/month
  allowedCategories: ["data", "weather", "finance", "ai", "compute", "identity", "other"],
};

export function initBudgetState(policy: SpendingPolicy): BudgetState {
  return {
    policy,
    spentToday: "0",
    spentThisMonth: "0",
    remainingDay: policy.maxPerDay,
    remainingMonth: policy.maxPerMonth,
    lastUpdated: Date.now(),
  };
}

export function updateBudget(state: BudgetState, spent: string): BudgetState {
  const newToday = (BigInt(state.spentToday) + BigInt(spent)).toString();
  const newMonth = (BigInt(state.spentThisMonth) + BigInt(spent)).toString();
  return {
    ...state,
    spentToday: newToday,
    spentThisMonth: newMonth,
    remainingDay: (
      BigInt(state.policy.maxPerDay) - BigInt(newToday)
    ).toString(),
    remainingMonth: (
      BigInt(state.policy.maxPerMonth) - BigInt(newMonth)
    ).toString(),
    lastUpdated: Date.now(),
  };
}

// ── Subscription Registry ─────────────────────────────────────────────────────

export class SubscriptionManager {
  private subs = new Map<string, import("@nexum/types").Subscription>();

  subscribe(serviceId: string, serviceName: string, monthlyBudget?: string) {
    const id = `sub_${serviceId}_${Date.now()}`;
    this.subs.set(serviceId, {
      id,
      serviceId,
      serviceName,
      status: "active",
      startedAt: Date.now(),
      callsUsed: 0,
      totalSpend: "0",
      monthlyBudget,
    });
    return this.subs.get(serviceId)!;
  }

  recordCall(serviceId: string, amount: string) {
    const sub = this.subs.get(serviceId);
    if (!sub) return;
    sub.callsUsed += 1;
    sub.totalSpend = (BigInt(sub.totalSpend) + BigInt(amount)).toString();
  }

  getAll() {
    return Array.from(this.subs.values());
  }

  get(serviceId: string) {
    return this.subs.get(serviceId);
  }
}
