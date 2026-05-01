// ─────────────────────────────────────────────────────────────────────────────
// Payment Driver
//
// Abstracts the way the agent pays for an x402 service.
//
//   "passport" — payment is signed by the user's Kite Passport AA wallet,
//                under an active spending Session. Authorization, settlement,
//                and budget enforcement all live inside Passport.
//
//   "local"    — legacy demo mode: the agent holds an ephemeral EVM key,
//                signs the x402 authorization itself, and settles via the
//                Pieverse facilitator directly. Useful for hackathon-style
//                bring-up before a real Passport account exists.
//
// The selection happens at construction time. The agent calls
// `driver.pay(service, params)` and gets back a single PaymentRecord +
// the service body, regardless of which path executed.
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import {
  buildPaymentRecord,
  checkBudget,
  hashContent,
  writeAttestation,
} from "@nexum/kite";
import {
  probeService,
  createAuthorization,
  callWithPayment,
  settleViaFacilitator,
} from "@nexum/x402";
import { PassportClient } from "@nexum/passport";
import type {
  Attestation,
  PaymentRecord,
  PassportSession,
  X402Requirement,
  BudgetState,
} from "@nexum/types";

export interface PayInput {
  runId: string;
  serviceId: string;
  serviceName: string;
  endpoint: string;
  params: Record<string, string>;
  /** Fallback x402 requirement if the service doesn't return 402. */
  fallbackRequirement?: X402Requirement;
}

export interface PayOutcome {
  /** Status of the attempted payment. */
  status: "paid" | "skipped" | "error" | "free";
  /** Payment record, present when status === "paid". */
  payment?: PaymentRecord;
  /** Attestation for the payment. */
  attestation?: Attestation;
  /** Service response body. */
  data?: unknown;
  /** Reason for skip / error. */
  reason?: string;
  /** Display amount. */
  amountDisplay?: string;
}

export interface PaymentDriver {
  readonly mode: "passport" | "local";
  pay(input: PayInput): Promise<PayOutcome>;
}

// ── Passport Driver ──────────────────────────────────────────────────────────

export class PassportPaymentDriver implements PaymentDriver {
  readonly mode = "passport" as const;

  constructor(
    private client: PassportClient,
    private session: PassportSession,
    private wallet: ethers.Wallet,
    private onSpend: (sessionId: string, amountDisplay: string) => void = () => {}
  ) {}

  async pay(input: PayInput): Promise<PayOutcome> {
    // Pre-flight: session must still be active.
    if (this.session.status !== "active") {
      return {
        status: "skipped",
        reason: `Passport session ${this.session.id} is ${this.session.status}`,
      };
    }
    if (Date.now() > this.session.expiresAt) {
      return { status: "skipped", reason: "Passport session expired" };
    }

    let result;
    try {
      result = await this.client.execute({
        sessionId: this.session.id,
        url: input.endpoint,
        method: "GET",
        query: input.params,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: "error", reason: msg };
    }

    // Mint a Nexum-side payment record from the Passport result.
    const payment: PaymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      runId: input.runId,
      serviceId: input.serviceId,
      serviceName: input.serviceName,
      amount: result.delegation?.amount ?? "0",
      amountDisplay: result.amountDisplay ?? "1.00 USDC",
      token: this.session.asset,
      payTo: result.payee ?? input.fallbackRequirement?.payTo ?? "",
      txHash: result.txHash,
      explorerUrl: result.txHash
        ? `https://testnet.kitescan.ai/tx/${result.txHash}`
        : undefined,
      status: result.txHash ? "settled" : "authorized",
      timestamp: Date.now(),
      origin: "passport",
      sessionId: this.session.id,
    };

    // Attestation still goes on Kite from the agent wallet (audit trail of
    // the *agent's* action, separate from Passport's payment proof).
    const attest = await writeAttestation(this.wallet, {
      runId: input.runId,
      type: "payment",
      contentHash: hashContent(
        `passport:${this.session.id}:${input.serviceId}:${result.txHash ?? ""}`
      ),
      metadata: `Passport ${payment.amountDisplay} → ${input.serviceName}`,
    });

    this.onSpend(this.session.id, payment.amountDisplay);

    return {
      status: "paid",
      payment,
      attestation: attest,
      data: result.data,
      amountDisplay: payment.amountDisplay,
    };
  }
}

// ── Local x402 Driver (legacy / fallback) ────────────────────────────────────

export class LocalPaymentDriver implements PaymentDriver {
  readonly mode = "local" as const;

  constructor(
    private wallet: ethers.Wallet,
    private budget: BudgetState,
    private onBudgetUpdate: (next: BudgetState) => void = () => {}
  ) {}

  async pay(input: PayInput): Promise<PayOutcome> {
    const probe = await probeService(input.endpoint, input.params);

    if (!probe.needs402 && probe.data) {
      return { status: "free", data: probe.data };
    }

    const req = probe.requirement ?? input.fallbackRequirement;
    if (!req) {
      return { status: "error", reason: "No x402 requirement returned and no fallback supplied" };
    }

    // Budget check
    const ok = checkBudget(
      this.budget.policy,
      this.budget.spentToday,
      this.budget.spentThisMonth,
      req.maxAmountRequired
    );
    if (!ok.allowed) {
      return { status: "skipped", reason: ok.reason };
    }

    const auth = await createAuthorization(this.wallet, req);
    if (!auth.success || !auth.xPayment) {
      return { status: "error", reason: auth.error ?? "authorization failed" };
    }

    const callRes = await callWithPayment(input.endpoint, auth.xPayment, input.params);
    const settle = await settleViaFacilitator(auth.xPayment);

    // Update budget
    const nextSpentToday = (
      BigInt(this.budget.spentToday) + BigInt(req.maxAmountRequired)
    ).toString();
    const nextSpentMonth = (
      BigInt(this.budget.spentThisMonth) + BigInt(req.maxAmountRequired)
    ).toString();
    this.budget = {
      ...this.budget,
      spentToday: nextSpentToday,
      spentThisMonth: nextSpentMonth,
      lastUpdated: Date.now(),
    };
    this.onBudgetUpdate(this.budget);

    const attest = await writeAttestation(this.wallet, {
      runId: input.runId,
      type: "payment",
      contentHash: hashContent(auth.xPayment + input.serviceId),
      metadata: `Paid ${input.serviceName}: ${auth.amountDisplay}`,
    });

    const payment = buildPaymentRecord({
      runId: input.runId,
      serviceId: input.serviceId,
      serviceName: input.serviceName,
      amount: req.maxAmountRequired,
      decimals: 18,
      token: "KITE",
      payTo: req.payTo,
      txHash: settle.txHash ?? attest.txHash,
      explorerUrl: attest.explorerUrl,
    });
    payment.origin = "local";

    return {
      status: "paid",
      payment,
      attestation: attest,
      data: callRes.data,
      amountDisplay: auth.amountDisplay,
    };
  }
}

// ── Driver factory ───────────────────────────────────────────────────────────

export interface DriverFactoryOptions {
  wallet: ethers.Wallet;
  /** Active passport session, if any */
  session?: PassportSession;
  /** Passport client, required when session is provided */
  passport?: PassportClient;
  /** Local-mode budget */
  budget: BudgetState;
  /** Callback when local-mode budget updates */
  onBudgetUpdate?: (b: BudgetState) => void;
  /** Callback when passport spend is recorded */
  onPassportSpend?: (sessionId: string, amountDisplay: string) => void;
}

export function makePaymentDriver(opts: DriverFactoryOptions): PaymentDriver {
  if (opts.session && opts.passport && opts.session.status === "active") {
    return new PassportPaymentDriver(
      opts.passport,
      opts.session,
      opts.wallet,
      opts.onPassportSpend
    );
  }
  return new LocalPaymentDriver(opts.wallet, opts.budget, opts.onBudgetUpdate);
}
