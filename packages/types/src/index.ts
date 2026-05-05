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
  /** Present when the run is paying via a Kite Passport session.
   *  When absent, payments go through the local x402 driver. */
  passport?: {
    sessionId: string;
    /** Display string, e.g. "10.00 USDC" */
    budget: string;
    /** Display string, e.g. "2.50 USDC" */
    spent: string;
    asset: string;
    /** Unix ms timestamp when the session expires */
    expiresAt: number;
  };
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
  /** "passport" if signed by Kite Passport session, "local" if by ephemeral wallet */
  origin?: "passport" | "local";
  /** Passport session ID if origin === "passport" */
  sessionId?: string;
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

// ── Kite Agent Passport ───────────────────────────────────────────────────────
//
// Passport replaces the locally-held EVM key with a user-bound Account
// Abstraction wallet. Every payment is constrained by a Session (master
// budget) which the user signs with a passkey on agentpassport.ai.
//
// Lifecycle:
//   user signs up → agent registered → session created → user approves
//   passkey → agent executes paid requests inside session envelope.

export type PassportConnectionStatus =
  | "disconnected"      // no passport credentials present
  | "pending_signup"    // signup initiated, awaiting verification email
  | "pending_login"     // login initiated, awaiting OTP code
  | "connected"         // authenticated, agent registered
  | "error";

export interface KitePassport {
  /** Passport account email (unique per user) */
  email?: string;
  /** Registered agent ID (from kpass agent:register) */
  agentId?: string;
  /** AA wallet address — the payer for x402 calls */
  walletAddress?: string;
  /** USDC balance on Kite chain (display string) */
  usdcBalance?: string;
  /** Current connection state */
  status: PassportConnectionStatus;
  /** ISO timestamp of last sync */
  lastSyncedAt?: number;
  /** Error message if status === "error" */
  error?: string;
}

export type SessionStatus =
  | "pending_approval"  // request sent, awaiting passkey
  | "active"            // approved and within budget/TTL
  | "exhausted"         // total budget consumed
  | "expired"           // TTL elapsed
  | "revoked"           // user revoked manually
  | "rejected";         // user denied passkey

export type PaymentApproach = "x402_http" | "mpp";

export interface PassportSession {
  /** Session ID assigned by Passport backend */
  id: string;
  /** Request ID returned at create time, used while pending */
  requestId?: string;
  /** Owning agent ID */
  agentId: string;
  /** Human-readable description shown in passkey prompt */
  taskSummary: string;
  /** Max spend per single tx (display, e.g. "2.00 USDC") */
  maxAmountPerTx: string;
  /** Max total spend across the session (display) */
  maxTotalAmount: string;
  /** Total spent so far against this session (display) */
  totalSpent: string;
  /** Asset symbol — currently always USDC on Kite */
  asset: string;
  /** Payment protocol */
  paymentApproach: PaymentApproach;
  /** Session lifetime in seconds */
  ttlSeconds: number;
  /** Unix ms timestamp when session expires */
  expiresAt: number;
  /** Current state */
  status: SessionStatus;
  /** Number of paid calls made under this session */
  callCount: number;
  /** When the session was created */
  createdAt: number;
  /** When the user approved (if applicable) */
  approvedAt?: number;
}

export interface PassportDelegation {
  /** Delegation ID */
  id: string;
  /** Parent session */
  sessionId: string;
  /** Service URL the delegation authorizes payment to */
  resource: string;
  /** Exact amount this delegation permits */
  amount: string;
  /** Display amount (e.g. "1.00 USDC") */
  amountDisplay: string;
  /** Recipient wallet (service payTo) */
  payee: string;
  /** When created */
  createdAt: number;
  /** Resulting on-chain tx hash if executed */
  txHash?: string;
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
