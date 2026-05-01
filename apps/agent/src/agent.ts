// ─────────────────────────────────────────────────────────────────────────────
// Nexum Agent — Autonomous Commerce Executor
// Orchestrates discovery → purchase → task → settlement
//
// Payment routing:
//   1. If a Kite Passport client + active session is provided, the agent
//      delegates payment signing & settlement to Passport. The agent's
//      local Kite wallet is used only for on-chain attestations.
//   2. Otherwise, the agent falls back to the legacy local x402 flow:
//      it signs authorizations with its own ephemeral key and settles
//      via the Pieverse facilitator directly.
//
// The mode selection happens once per run, based on what's been provided
// at construction time. See payment-driver.ts for the abstraction.
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import {
  getProvider,
  getWallet,
  buildAgentIdentity,
  writeAttestation,
  hashContent,
  addressUrl,
} from "@nexum/kite";
import { KITE_X402_SERVICES } from "@nexum/x402";
import { PassportClient } from "@nexum/passport";
import {
  discoverServices,
  rankServices,
  DEFAULT_POLICY,
  initBudgetState,
  SubscriptionManager,
} from "./commerce.js";
import { makePaymentDriver } from "./payment-driver.js";
import type {
  AgentRun,
  AgentTask,
  AgentEvent,
  AgentStep,
  PaymentRecord,
  Attestation,
  PassportSession,
  X402Requirement,
} from "@nexum/types";

// ── Constructor options ──────────────────────────────────────────────────────

export interface NexumAgentOptions {
  /** Local agent wallet private key. Optional — ephemeral if absent. */
  privateKey?: string;
  /** Event sink — driver-style streaming. */
  onEvent?: (e: AgentEvent) => void;
  /** Kite Passport client. When provided alongside `passportSession`, all
   *  payments route through Passport instead of the local x402 driver. */
  passport?: PassportClient;
  /** Active Passport session. Must be in "active" status. */
  passportSession?: PassportSession;
  /** Hook called on each Passport-mediated spend. */
  onPassportSpend?: (sessionId: string, amountDisplay: string) => void;
}

// ── Agent Class ───────────────────────────────────────────────────────────────

export class NexumAgent {
  private wallet: ethers.Wallet;
  private budget = initBudgetState(DEFAULT_POLICY);
  private subscriptions = new SubscriptionManager();
  private onEvent?: (e: AgentEvent) => void;
  private passport?: PassportClient;
  private passportSession?: PassportSession;
  private onPassportSpend?: (sessionId: string, amountDisplay: string) => void;

  constructor(
    privateKeyOrOpts?: string | NexumAgentOptions,
    onEventLegacy?: (e: AgentEvent) => void
  ) {
    // Backwards-compat: old call style was `new NexumAgent(privateKey, onEvent)`.
    let opts: NexumAgentOptions;
    if (typeof privateKeyOrOpts === "string" || privateKeyOrOpts === undefined) {
      opts = { privateKey: privateKeyOrOpts, onEvent: onEventLegacy };
    } else {
      opts = privateKeyOrOpts;
    }

    const provider = getProvider("testnet");
    this.wallet = getWallet(provider, opts.privateKey);
    this.onEvent = opts.onEvent;
    this.passport = opts.passport;
    this.passportSession = opts.passportSession;
    this.onPassportSpend = opts.onPassportSpend;
  }

  get identity() {
    return buildAgentIdentity(this.wallet, "nexum-commerce-agent", "testnet");
  }

  get address() {
    return this.wallet.address;
  }

  /** Whether this run will execute payments through Kite Passport. */
  get usingPassport(): boolean {
    return (
      !!this.passport &&
      !!this.passportSession &&
      this.passportSession.status === "active"
    );
  }

  // ── Internal emitter ───────────────────────────────────────────────────────

  private emit(event: AgentEvent) {
    this.onEvent?.(event);
  }

  private emitStep(
    runId: string,
    step: Partial<AgentStep>,
    type: AgentEvent["type"] = "step_start"
  ) {
    this.emit({ type, runId, step, timestamp: Date.now() });
  }

  // ── Execute a full agent task ──────────────────────────────────────────────

  async execute(task: AgentTask): Promise<AgentRun> {
    const runId = task.id;
    const payments: PaymentRecord[] = [];
    const attestations: Attestation[] = [];
    const steps: AgentStep[] = [];
    let totalSpend = 0n;

    const addStep = (step: AgentStep) => steps.push(step);

    const run: AgentRun = {
      id: runId,
      task,
      agent: this.identity,
      steps,
      payments,
      attestations,
      status: "running",
      startedAt: Date.now(),
      totalSpend: "0",
    };

    this.emit({
      type: "run_start",
      runId,
      agent: this.identity,
      timestamp: Date.now(),
    });

    // Build the payment driver once per run.
    const driver = makePaymentDriver({
      wallet: this.wallet,
      budget: this.budget,
      session: this.passportSession,
      passport: this.passport,
      onBudgetUpdate: (b) => {
        this.budget = b;
      },
      onPassportSpend: this.onPassportSpend,
    });

    try {
      // ── STEP 1: Agent initialisation ────────────────────────────────────
      this.emitStep(runId, {
        id: "agent_init",
        label: "AGENT INIT",
        description: this.usingPassport
          ? `Nexum agent online · Kite Passport session ${this.passportSession?.id.slice(0, 12)}…`
          : `Nexum agent online · wallet ${this.address.slice(0, 10)}...`,
        status: "running",
      });

      const initAttest = await writeAttestation(this.wallet, {
        runId,
        type: "agent_init",
        contentHash: hashContent(task.input + runId),
        metadata: this.usingPassport
          ? `Passport ${this.passportSession?.id} · Task: ${task.input.slice(0, 60)}`
          : `Task: ${task.input.slice(0, 80)}`,
      });
      attestations.push(initAttest);

      const initStep: AgentStep = {
        id: "agent_init",
        label: "AGENT INIT",
        description: this.usingPassport
          ? `Passport mode · Agent wallet: ${this.address}`
          : `Agent wallet: ${this.address} · Network: Kite Testnet`,
        status: "success",
        startedAt: Date.now(),
        completedAt: Date.now(),
        txHash: initAttest.txHash,
        explorerUrl: initAttest.explorerUrl,
        data: {
          address: this.address,
          addressUrl: addressUrl(this.address),
          attestation: initAttest.txHash,
          paymentMode: driver.mode,
          sessionId: this.passportSession?.id,
        },
      };
      addStep(initStep);
      this.emitStep(runId, initStep, "step_complete");

      // ── STEP 2: Service Discovery ────────────────────────────────────────
      await delay(300);
      this.emitStep(runId, {
        id: "discover",
        label: "SERVICE DISCOVERY",
        description: "Scanning Kite service registry for relevant APIs...",
        status: "running",
      });

      const discovered = discoverServices(task.input, this.budget.policy);
      const ranked = rankServices(discovered);

      ranked.forEach((svc) => {
        this.emit({
          type: "service_discovered",
          runId,
          service: svc,
          timestamp: Date.now(),
        });
      });

      const discoverStep: AgentStep = {
        id: "discover",
        label: "SERVICE DISCOVERY",
        description: `Found ${ranked.length} relevant service${ranked.length !== 1 ? "s" : ""}: ${ranked.map((s) => s.name).join(", ")}`,
        status: "success",
        startedAt: Date.now(),
        completedAt: Date.now(),
        data: { services: ranked.map((s) => ({ id: s.id, name: s.name, price: s.priceDisplay })) },
      };
      addStep(discoverStep);
      this.emitStep(runId, discoverStep, "step_complete");

      // ── STEP 3: x402 Paid Service Calls ─────────────────────────────────
      const liveService = KITE_X402_SERVICES[0];
      const allServicesToBuy = [
        liveService,
        ...ranked.filter((s) => s.id !== "kite-weather").slice(0, 2),
      ];

      for (const svc of allServicesToBuy) {
        await delay(300);
        const svcName: string = svc.name;
        const svcEndpoint: string = svc.endpoint;
        const svcId: string = svc.id;
        const params: Record<string, string> =
          "params" in svc ? (svc.params as Record<string, string>) : {};

        const stepLabel = driver.mode === "passport" ? "PASSPORT PAYMENT" : "x402 PAYMENT";

        this.emitStep(runId, {
          id: `pay_${svcId}`,
          label: stepLabel,
          description: `Calling ${svcName}${driver.mode === "passport" ? " via Kite Passport" : " — awaiting 402 response"}...`,
          status: "running",
        });

        // Build a fallback x402 requirement for cataloged services that
        // don't return a real 402 (so the local driver can still pay them).
        const fallbackReq: X402Requirement = {
          scheme: "gokite-aa",
          network: "kite-testnet",
          maxAmountRequired:
            "pricePerCall" in svc
              ? (svc as { pricePerCall: string }).pricePerCall
              : "1000000000000000000",
          resource: svcEndpoint,
          description: svcName,
          payTo:
            "payTo" in svc
              ? (svc as { payTo: string }).payTo
              : "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
          asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
          maxTimeoutSeconds: 300,
          merchantName: svcName,
        };

        this.emit({
          type: "payment_start",
          runId,
          payment: {
            serviceId: svcId,
            serviceName: svcName,
            amount: fallbackReq.maxAmountRequired,
            payTo: fallbackReq.payTo,
            status: "authorized",
          },
          timestamp: Date.now(),
        });

        const outcome = await driver.pay({
          runId,
          serviceId: svcId,
          serviceName: svcName,
          endpoint: svcEndpoint,
          params,
          fallbackRequirement: fallbackReq,
        });

        if (outcome.status === "free") {
          const freeStep: AgentStep = {
            id: `pay_${svcId}`,
            label: stepLabel,
            description: `${svcName} responded without payment requirement`,
            status: "success",
            completedAt: Date.now(),
            data: { response: outcome.data },
          };
          addStep(freeStep);
          this.emitStep(runId, freeStep, "step_complete");
          continue;
        }

        if (outcome.status === "skipped") {
          const skipStep: AgentStep = {
            id: `pay_${svcId}`,
            label: stepLabel,
            description: outcome.reason ?? "Skipped",
            status: "skipped",
            completedAt: Date.now(),
          };
          addStep(skipStep);
          this.emitStep(runId, skipStep, "step_complete");
          continue;
        }

        if (outcome.status === "error") {
          const errStep: AgentStep = {
            id: `pay_${svcId}`,
            label: stepLabel,
            description: outcome.reason ?? "Payment error",
            status: "error",
            completedAt: Date.now(),
          };
          addStep(errStep);
          this.emitStep(runId, errStep, "step_error");
          continue;
        }

        // Paid successfully.
        if (outcome.payment) payments.push(outcome.payment);
        if (outcome.attestation) attestations.push(outcome.attestation);
        if (outcome.payment) {
          const amt = outcome.payment.amount;
          if (amt && /^\d+$/.test(amt)) totalSpend += BigInt(amt);
          this.subscriptions.recordCall(svcId, amt ?? "0");
        }

        const summary =
          driver.mode === "passport"
            ? `Paid ${outcome.amountDisplay ?? ""} to ${svcName} via Kite Passport · settled on Kite`
            : `Paid ${outcome.amountDisplay ?? ""} to ${svcName} · ${outcome.data ? "Data received" : "Simulated"} · settled on Kite`;

        const payStep: AgentStep = {
          id: `pay_${svcId}`,
          label: stepLabel,
          description: summary,
          status: "success",
          completedAt: Date.now(),
          txHash: outcome.payment?.txHash ?? outcome.attestation?.txHash,
          explorerUrl: outcome.payment?.explorerUrl ?? outcome.attestation?.explorerUrl,
          data: {
            amount: outcome.amountDisplay,
            payTo: outcome.payment?.payTo,
            serviceData: outcome.data,
            origin: outcome.payment?.origin,
            sessionId: outcome.payment?.sessionId,
          },
        };
        addStep(payStep);
        this.emitStep(runId, payStep, "step_complete");
        if (outcome.payment) {
          this.emit({
            type: "payment_complete",
            runId,
            payment: outcome.payment,
            timestamp: Date.now(),
          });
        }
      }

      // ── STEP 4: AI Research with Claude ─────────────────────────────────
      await delay(400);
      this.emitStep(runId, {
        id: "ai_task",
        label: "AI COMMERCE TASK",
        description: "Running autonomous analysis via Claude...",
        status: "running",
      });

      const collectedData = payments.map((p) => `${p.serviceName}: ${p.amountDisplay}`);
      const researchResult = await runClaudeTask(
        task.input,
        collectedData,
        payments.length
      );

      const aiStep: AgentStep = {
        id: "ai_task",
        label: "AI COMMERCE TASK",
        description: `Analysis complete — ${researchResult.slice(0, 70)}...`,
        status: "success",
        completedAt: Date.now(),
        data: { preview: researchResult.slice(0, 150) },
      };
      addStep(aiStep);
      this.emitStep(runId, aiStep, "step_complete");

      // ── STEP 5: Final settlement attestation ─────────────────────────────
      await delay(300);
      this.emitStep(runId, {
        id: "settle",
        label: "SETTLE ON KITE",
        description: "Writing completion proof to Kite chain...",
        status: "running",
      });

      const resultHash = hashContent(researchResult + runId + totalSpend.toString());
      const finalAttest = await writeAttestation(this.wallet, {
        runId,
        type: "task_complete",
        contentHash: resultHash,
        metadata: `Mode: ${driver.mode} · Services: ${payments.length} · Task: ${task.input.slice(0, 60)}`,
      });
      attestations.push(finalAttest);

      const settleStep: AgentStep = {
        id: "settle",
        label: "SETTLE ON KITE",
        description: "Commerce run verified and anchored on Kite testnet",
        status: "success",
        completedAt: Date.now(),
        txHash: finalAttest.txHash,
        explorerUrl: finalAttest.explorerUrl,
        data: {
          resultHash,
          totalSpend: totalSpend.toString(),
          servicesUsed: payments.length,
          attestations: attestations.length,
          paymentMode: driver.mode,
        },
      };
      addStep(settleStep);
      this.emitStep(runId, settleStep, "step_complete");
      this.emit({ type: "attestation", runId, attestation: finalAttest, timestamp: Date.now() });

      run.result = researchResult;
      run.status = "complete";
      run.completedAt = Date.now();
      run.totalSpend = totalSpend.toString();

      this.emit({
        type: "run_complete",
        runId,
        result: researchResult,
        meta: {
          totalSpend: totalSpend.toString(),
          paymentsCount: payments.length,
          attestationsCount: attestations.length,
          attestationUrl: finalAttest.explorerUrl ?? "",
          durationMs: Date.now() - run.startedAt,
          paymentMode: driver.mode,
        },
        timestamp: Date.now(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      run.status = "error";
      run.error = msg;
      run.completedAt = Date.now();
      this.emit({ type: "run_error", runId, error: msg, timestamp: Date.now() });
    }

    return run;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runClaudeTask(
  task: string,
  dataAcquired: string[],
  serviceCount: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `[Demo mode — no ANTHROPIC_API_KEY] Task: "${task}". Agent autonomously called ${serviceCount} paid service(s) via x402 on Kite chain, settled USDC payments, and anchored cryptographic attestations on Kite testnet. In production, Claude would synthesize all acquired data into a full research brief here.`;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are Nexum, an autonomous AI commerce agent operating on the Kite blockchain — the first AI payment blockchain. You have just completed autonomous service discovery, purchased ${serviceCount} data service(s) via the x402 payment protocol (settling stablecoin payments on Kite chain), and acquired real-time data. Now deliver a structured intelligence brief: lead with the key actionable insight, provide 2-3 supporting analysis points using the acquired data context, and close with implications for autonomous agents. Be specific, authoritative, and commercially relevant. Format as flowing paragraphs without headers.`,
        messages: [
          {
            role: "user",
            content: `Commerce task: ${task}\n\nData acquired from ${serviceCount} paid service(s) via Kite x402:\n${dataAcquired.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\nDeliver your autonomous commerce intelligence brief.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const json = await res.json();
    return json.content?.[0]?.text ?? "Research complete.";
  } catch (err) {
    return `Agent task complete. ${serviceCount} service(s) purchased via x402 on Kite chain: ${dataAcquired.join("; ")}. Full AI synthesis requires ANTHROPIC_API_KEY. Error: ${err}`;
  }
}
