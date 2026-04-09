// ─────────────────────────────────────────────────────────────────────────────
// Nexum — Shared Types
// Agentic Commerce on Kite Chain
// ─────────────────────────────────────────────────────────────────────────────

// ── Agent Identity ────────────────────────────────────────────────────────────

export interface AgentIdentity {
  id: string;
  name: string;
  address: string; // EVM wallet address on Kite chain
  network: "kite-testnet" | "kite-mainnet";
  createdAt: number;
}

// ── Service Registry ──────────────────────────────────────────────────────────

export type ServiceCategory =
  | "data"
  | "weather"
  | "finance"
  | "ai"
  | "compute"
  | "storage"
  | "identity"
  | "other";

export type BillingModel = "per-call" | "subscription" | "usage-based";

export interface ServiceListing {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  endpoint: string;
  billingModel: BillingModel;
  pricePerCall: string;       // in token units (e.g., "1000000" = 1 USDT with 6 decimals)
  priceDisplay: string;       // human-readable (e.g., "$0.001")
  tokenAddress: string;       // USDT or other stablecoin
  payTo: string;              // service wallet address on Kite
  network: string;
  tags: string[];
  sla?: {
    uptime: number;           // 0-100
    latencyMs: number;
    maxRetries: number;
  };
  discovered?: boolean;
  lastCalled?: number;
  callCount?: number;
}

// ── x402 Payment Protocol ─────────────────────────────────────────────────────

export interface X402Requirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
  merchantName?: string;
  mimeType?: string;
  outputSchema?: unknown;
}

export interface X402Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
  asset: string;
  network: string;
}

export interface PaymentRecord {
  id: string;
  runId: string;
  serviceId: string;
  serviceName: string;
  amount: string;
  amountDisplay: string;
  token: string;
  payTo: string;
  txHash?: string;
  explorerUrl?: string;
  status: "pending" | "authorized" | "settled" | "failed";
  timestamp: number;
  settlementTxHash?: string;
}

// ── Subscription Management ───────────────────────────────────────────────────

export interface Subscription {
  id: string;
  serviceId: string;
  serviceName: string;
  status: "active" | "paused" | "cancelled" | "expired";
  startedAt: number;
  expiresAt?: number;
  callsUsed: number;
  callsLimit?: number;
  totalSpend: string;
  monthlyBudget?: string;
}

// ── Budget / Governance ───────────────────────────────────────────────────────

export interface SpendingPolicy {
  id: string;
  name: string;
  maxPerCall: string;          // max USDT per single call
  maxPerDay: string;           // daily cap
  maxPerMonth: string;         // monthly cap
  allowedCategories: ServiceCategory[];
  allowedServices?: string[];  // service IDs whitelist (if empty = all)
  requireApprovalAbove?: string; // threshold for human approval
}

export interface BudgetState {
  policy: SpendingPolicy;
  spentToday: string;
  spentThisMonth: string;
  remainingDay: string;
  remainingMonth: string;
  lastUpdated: number;
}

// ── On-Chain Attestation ──────────────────────────────────────────────────────

export type AttestationType =
  | "agent_init"
  | "task_start"
  | "service_call"
  | "payment"
  | "task_complete"
  | "subscription_start"
  | "subscription_end"
  | "policy_update";

export interface Attestation {
  id: string;
  runId: string;
  type: AttestationType;
  contentHash: string;
  metadata?: string;
  txHash?: string;
  explorerUrl?: string;
  blockNumber?: number;
  timestamp: number;
  status: "pending" | "confirmed" | "simulated";
}

// ── Agent Task & Run ──────────────────────────────────────────────────────────

export type StepStatus = "pending" | "running" | "success" | "error" | "skipped";

export interface AgentStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  txHash?: string;
  explorerUrl?: string;
  data?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  type: "research" | "purchase" | "subscribe" | "discover" | "analyse";
  input: string;
  context?: Record<string, unknown>;
}

export interface AgentRun {
  id: string;
  task: AgentTask;
  agent: AgentIdentity;
  steps: AgentStep[];
  payments: PaymentRecord[];
  attestations: Attestation[];
  result?: string;
  error?: string;
  status: "queued" | "running" | "complete" | "error";
  startedAt: number;
  completedAt?: number;
  totalSpend: string;
}

// ── SSE Event Stream ──────────────────────────────────────────────────────────

export type AgentEventType =
  | "run_start"
  | "step_start"
  | "step_update"
  | "step_complete"
  | "step_error"
  | "payment_start"
  | "payment_complete"
  | "attestation"
  | "service_discovered"
  | "result"
  | "run_complete"
  | "run_error";

export interface AgentEvent {
  type: AgentEventType;
  runId: string;
  step?: Partial<AgentStep>;
  payment?: Partial<PaymentRecord>;
  attestation?: Partial<Attestation>;
  service?: Partial<ServiceListing>;
  result?: string;
  error?: string;
  agent?: Partial<AgentIdentity>;
  timestamp: number;
  meta?: Record<string, unknown>;
}
