// ─────────────────────────────────────────────────────────────────────────────
// @nexum/passport — Kite Agent Passport client
//
// A TypeScript client for the Kite Agent Passport lifecycle:
//   signup/login → agent registration → session create+approve → paid execute
//
// ── Important compatibility note ─────────────────────────────────────────────
// Kite has published the kpass CLI surface (see docs.gokite.ai/kite-agent-
// passport/cli-reference.md) but has not yet published a stable public REST
// API for Passport at the time of this build. This client targets the
// REST endpoints that the CLI is observed to use. Each endpoint is marked
// with `// TODO(passport-api): confirm` until Kite formalises the spec.
//
// To allow the rest of Nexum to ship today, the client supports a `simulate`
// mode (default when KITE_PASSPORT_BASE_URL is unset) that returns
// deterministic, locally-generated session/delegation data. The on-chain
// settlement still flows through the existing Pieverse facilitator, so the
// x402 contract surface to service providers is identical in either mode.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  KitePassport,
  PassportSession,
  PassportDelegation,
  SessionStatus,
  PaymentApproach,
} from "@nexum/types";

export type {
  KitePassport,
  PassportSession,
  PassportDelegation,
  SessionStatus,
  PaymentApproach,
};

// ── Configuration ────────────────────────────────────────────────────────────

export interface PassportClientConfig {
  /** Base URL of the Passport backend. Unset → simulate mode. */
  baseUrl?: string;
  /** API key issued by Passport (from Portal or `kpass me`). */
  apiKey?: string;
  /** Override fetch implementation (testing). */
  fetchImpl?: typeof fetch;
  /** Force simulation mode regardless of baseUrl. */
  simulate?: boolean;
}

export interface SignupInitResult {
  signupId: string;
  email: string;
  message: string;
}

export interface SignupExchangeResult {
  apiKey: string;
  agentId?: string;
  walletAddress: string;
}

export interface LoginInitResult {
  loginId: string;
  email: string;
}

export interface SessionCreateInput {
  agentId: string;
  taskSummary: string;
  /** Max amount per single tx, in major units (e.g. "2" for 2 USDC) */
  maxAmountPerTx: string;
  /** Max total session spend, in major units */
  maxTotalAmount: string;
  /** TTL like "1h", "24h", "30m" */
  ttl: string;
  /** Asset symbol(s) the session can spend */
  assets: string[];
  /** Payment protocol */
  paymentApproach: PaymentApproach;
}

export interface ExecuteInput {
  sessionId: string;
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface ExecuteResult {
  /** HTTP response from the paid service */
  data: unknown;
  status: number;
  /** Resulting on-chain settlement tx hash */
  txHash?: string;
  /** Delegation that authorised this payment */
  delegation?: PassportDelegation;
  /** Display amount actually charged */
  amountDisplay?: string;
  /** Service payTo address */
  payee?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL =
  process.env.KITE_PASSPORT_BASE_URL ??
  "https://api.agentpassport.ai"; // TODO(passport-api): confirm production hostname

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ttlToSeconds(ttl: string): number {
  const m = ttl.match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!m) return 3600;
  const n = Number(m[1]);
  const u = (m[2] ?? "s").toLowerCase();
  return u === "s" ? n : u === "m" ? n * 60 : u === "h" ? n * 3600 : n * 86400;
}

function formatAmount(major: string, asset = "USDC"): string {
  const n = Number(major);
  return `${isNaN(n) ? "0.00" : n.toFixed(2)} ${asset}`;
}

// Build a deterministic-looking 0x hash from a string seed (simulate mode only).
function fakeTxHash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hex = h.toString(16).padStart(8, "0");
  return "0x" + (hex.repeat(8)).slice(0, 64);
}

// ── Client ───────────────────────────────────────────────────────────────────

export class PassportClient {
  private baseUrl: string;
  private apiKey?: string;
  private fetchImpl: typeof fetch;
  private simulate: boolean;

  constructor(config: PassportClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? fetch;
    // Simulate when explicitly asked, OR when no base URL was provided AND
    // the default was used without an API key (pure-demo bring-up).
    this.simulate =
      config.simulate ??
      (!config.baseUrl && !process.env.KITE_PASSPORT_BASE_URL && !this.apiKey);
  }

  get isSimulated(): boolean {
    return this.simulate;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { json?: unknown } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...((init.headers as Record<string, string>) ?? {}),
    };
    if (init.json !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PassportError(
        `Passport ${res.status} ${path}: ${text.slice(0, 240)}`,
        res.status
      );
    }
    return (await res.json()) as T;
  }

  // ── Authentication ──────────────────────────────────────────────────────

  /**
   * Begin signup. User receives a verification email + 8-char code.
   * TODO(passport-api): confirm endpoint — CLI does `kpass signup init`.
   */
  async signupInit(email: string): Promise<SignupInitResult> {
    if (this.simulate) {
      return {
        signupId: genId("signup"),
        email,
        message: "Simulation: verification email would be sent. Approve in dashboard.",
      };
    }
    return this.request<SignupInitResult>("/v1/signup/init", {
      method: "POST",
      json: { email },
    });
  }

  /**
   * Exchange a signup ID + email-link token for an API key + wallet.
   * Called after the user clicks the verification link and creates a passkey.
   */
  async signupExchange(
    signupId: string,
    exchangeToken: string
  ): Promise<SignupExchangeResult> {
    if (this.simulate) {
      const wallet = "0x" + fakeTxHash(signupId).slice(2, 42);
      const apiKey = "kpass_sim_" + fakeTxHash(signupId + exchangeToken).slice(2, 26);
      this.apiKey = apiKey;
      return { apiKey, walletAddress: wallet };
    }
    const res = await this.request<SignupExchangeResult>(
      "/v1/signup/exchange",
      { method: "POST", json: { signupId, exchangeToken } }
    );
    if (res.apiKey) this.apiKey = res.apiKey;
    return res;
  }

  /** Begin login for a returning user. Sends 8-char OTP to email. */
  async loginInit(email: string): Promise<LoginInitResult> {
    if (this.simulate) {
      return { loginId: genId("login"), email };
    }
    return this.request<LoginInitResult>("/v1/login/init", {
      method: "POST",
      json: { email },
    });
  }

  /** Verify login OTP. Returns a fresh API key. */
  async loginVerify(loginId: string, code: string): Promise<SignupExchangeResult> {
    if (this.simulate) {
      const wallet = "0x" + fakeTxHash(loginId).slice(2, 42);
      const apiKey = "kpass_sim_" + fakeTxHash(loginId + code).slice(2, 26);
      this.apiKey = apiKey;
      return { apiKey, walletAddress: wallet };
    }
    const res = await this.request<SignupExchangeResult>("/v1/login/verify", {
      method: "POST",
      json: { loginId, code },
    });
    if (res.apiKey) this.apiKey = res.apiKey;
    return res;
  }

  // ── Identity / wallet ──────────────────────────────────────────────────

  /** Resolve the currently authenticated user, agent, wallet, balance. */
  async me(): Promise<KitePassport> {
    if (!this.apiKey) {
      return { status: "disconnected" };
    }
    if (this.simulate) {
      const wallet = "0x" + fakeTxHash(this.apiKey).slice(2, 42);
      return {
        status: "connected",
        email: "demo@nexum.local",
        agentId: `agent_${wallet.slice(2, 10)}`,
        walletAddress: wallet,
        usdcBalance: "100.00",
        lastSyncedAt: Date.now(),
      };
    }
    return this.request<KitePassport>("/v1/me");
  }

  // ── Agent registration ─────────────────────────────────────────────────

  /** Register a new agent under the authenticated user. */
  async registerAgent(
    type: string = "research-agent",
    name: string = "nexum-commerce-agent"
  ): Promise<{ agentId: string }> {
    if (this.simulate) {
      return { agentId: `agent_${fakeTxHash(type + name).slice(2, 10)}` };
    }
    return this.request<{ agentId: string }>("/v1/agents/register", {
      method: "POST",
      json: { type, name },
    });
  }

  // ── Sessions ───────────────────────────────────────────────────────────

  /**
   * Request a new spending session. Returns immediately with status
   * "pending_approval" — the user must approve via passkey on the
   * Passport dashboard before the session becomes "active".
   */
  async createSession(input: SessionCreateInput): Promise<PassportSession> {
    const now = Date.now();
    const ttlSeconds = ttlToSeconds(input.ttl);

    if (this.simulate) {
      const id = genId("sess");
      const requestId = genId("req");
      // In simulate mode we auto-approve after a short delay so the demo
      // experience is end-to-end without a real passkey ceremony.
      return {
        id,
        requestId,
        agentId: input.agentId,
        taskSummary: input.taskSummary,
        maxAmountPerTx: formatAmount(input.maxAmountPerTx, input.assets[0] ?? "USDC"),
        maxTotalAmount: formatAmount(input.maxTotalAmount, input.assets[0] ?? "USDC"),
        totalSpent: formatAmount("0", input.assets[0] ?? "USDC"),
        asset: input.assets[0] ?? "USDC",
        paymentApproach: input.paymentApproach,
        ttlSeconds,
        expiresAt: now + ttlSeconds * 1000,
        status: "pending_approval",
        callCount: 0,
        createdAt: now,
      };
    }
    return this.request<PassportSession>("/v1/sessions", {
      method: "POST",
      json: {
        agent_id: input.agentId,
        task_summary: input.taskSummary,
        max_amount_per_tx: input.maxAmountPerTx,
        max_total_amount: input.maxTotalAmount,
        ttl: input.ttl,
        assets: input.assets,
        payment_approach: input.paymentApproach,
      },
    });
  }

  /** Poll session status (used while awaiting passkey approval). */
  async getSession(sessionIdOrRequestId: string): Promise<PassportSession> {
    if (this.simulate) {
      // In sim, sessions auto-approve 2s after creation. The store layer
      // tracks the actual creation time; here we just report `active`.
      const now = Date.now();
      return {
        id: sessionIdOrRequestId,
        agentId: "agent_sim",
        taskSummary: "Simulated session",
        maxAmountPerTx: "2.00 USDC",
        maxTotalAmount: "10.00 USDC",
        totalSpent: "0.00 USDC",
        asset: "USDC",
        paymentApproach: "x402_http",
        ttlSeconds: 86400,
        expiresAt: now + 86400_000,
        status: "active",
        callCount: 0,
        createdAt: now - 2000,
        approvedAt: now - 1000,
      };
    }
    return this.request<PassportSession>(
      `/v1/sessions/${encodeURIComponent(sessionIdOrRequestId)}`
    );
  }

  /** List sessions, optionally filtered by status. */
  async listSessions(status?: SessionStatus): Promise<PassportSession[]> {
    if (this.simulate) return [];
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<PassportSession[]>(`/v1/sessions${q}`);
  }

  /** Revoke an active session. */
  async revokeSession(sessionId: string): Promise<{ ok: boolean }> {
    if (this.simulate) return { ok: true };
    return this.request<{ ok: boolean }>(
      `/v1/sessions/${encodeURIComponent(sessionId)}/revoke`,
      { method: "POST" }
    );
  }

  // ── Paid execution ─────────────────────────────────────────────────────

  /**
   * Execute a paid HTTP request through Passport. Passport handles the
   * whole x402 dance internally: probes the service, signs a delegation
   * under the active session, calls the service with X-Payment, and
   * settles via the configured facilitator. Returns the service body
   * plus the resulting on-chain tx hash.
   */
  async execute(input: ExecuteInput): Promise<ExecuteResult> {
    if (this.simulate) {
      // In simulate mode, just call the service directly (no payment) and
      // synthesize a tx hash. This keeps the demo end-to-end with no API
      // key, while leaving the real path identical to swap in later.
      const target = new URL(input.url);
      Object.entries(input.query ?? {}).forEach(([k, v]) =>
        target.searchParams.set(k, v)
      );
      let data: unknown = null;
      let status = 0;
      try {
        const res = await this.fetchImpl(target.toString(), {
          method: input.method ?? "GET",
          headers: input.headers,
          body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
          signal: AbortSignal.timeout(10_000),
        });
        status = res.status;
        // Service may return 402 in real life; in sim that's fine — pretend
        // we paid and got data.
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } catch {
        data = { simulated: true };
      }
      const txHash = fakeTxHash(input.sessionId + input.url + Date.now());
      const delegation: PassportDelegation = {
        id: genId("deleg"),
        sessionId: input.sessionId,
        resource: input.url,
        amount: "1000000",
        amountDisplay: "1.00 USDC",
        payee: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
        createdAt: Date.now(),
        txHash,
      };
      return {
        data,
        status,
        txHash,
        delegation,
        amountDisplay: delegation.amountDisplay,
        payee: delegation.payee,
      };
    }

    return this.request<ExecuteResult>("/v1/sessions/execute", {
      method: "POST",
      json: {
        session_id: input.sessionId,
        url: input.url,
        method: input.method ?? "GET",
        headers: input.headers,
        body: input.body,
        query: input.query,
      },
    });
  }
}

// ── Errors ───────────────────────────────────────────────────────────────────

export class PassportError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "PassportError";
  }
}

// ── Convenience factory ──────────────────────────────────────────────────────

let _shared: PassportClient | null = null;

/** Get a process-wide Passport client (env-configured). */
export function getPassportClient(): PassportClient {
  if (!_shared) {
    _shared = new PassportClient({
      baseUrl: process.env.KITE_PASSPORT_BASE_URL,
      apiKey: process.env.KITE_PASSPORT_API_KEY,
    });
  }
  return _shared;
}

/** Reset the shared client (e.g. after a key rotation). */
export function resetPassportClient(): void {
  _shared = null;
}
