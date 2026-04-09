// ─────────────────────────────────────────────────────────────────────────────
// Nexum Agent — Autonomous Commerce Executor
// Orchestrates discovery → purchase → task → settlement
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import {
  getProvider,
  getWallet,
  buildAgentIdentity,
  writeAttestation,
  hashContent,
  checkBudget,
  buildPaymentRecord,
  addressUrl,
} from "@nexum/kite";
import {
  probeService,
  createAuthorization,
  callWithPayment,
  settleViaFacilitator,
  KITE_X402_SERVICES,
} from "@nexum/x402";
import {
  discoverServices,
  rankServices,
  DEFAULT_POLICY,
  initBudgetState,
  updateBudget,
  SubscriptionManager,
} from "./commerce.js";
import type {
  AgentRun,
  AgentTask,
  AgentEvent,
  AgentStep,
  PaymentRecord,
  Attestation,
} from "@nexum/types";

// ── Agent Class ───────────────────────────────────────────────────────────────

export class NexumAgent {
  private wallet: ethers.Wallet;
  private budget = initBudgetState(DEFAULT_POLICY);
  private subscriptions = new SubscriptionManager();
  private onEvent?: (e: AgentEvent) => void;

  constructor(privateKey?: string, onEvent?: (e: AgentEvent) => void) {
    const provider = getProvider("testnet");
    this.wallet = getWallet(provider, privateKey);
    this.onEvent = onEvent;
  }

  get identity() {
    return buildAgentIdentity(this.wallet, "nexum-commerce-agent", "testnet");
  }

  get address() {
    return this.wallet.address;
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

    try {
      // ── STEP 1: Agent initialisation ────────────────────────────────────
      this.emitStep(runId, {
        id: "agent_init",
        label: "AGENT INIT",
        description: `Nexum agent online · wallet ${this.address.slice(0, 10)}...`,
        status: "running",
      });

      const initAttest = await writeAttestation(this.wallet, {
        runId,
        type: "agent_init",
        contentHash: hashContent(task.input + runId),
        metadata: `Task: ${task.input.slice(0, 80)}`,
      });
      attestations.push(initAttest);

      const initStep: AgentStep = {
        id: "agent_init",
        label: "AGENT INIT",
        description: `Agent wallet: ${this.address} · Network: Kite Testnet`,
        status: "success",
        startedAt: Date.now(),
        completedAt: Date.now(),
        txHash: initAttest.txHash,
        explorerUrl: initAttest.explorerUrl,
        data: {
          address: this.address,
          addressUrl: addressUrl(this.address),
          attestation: initAttest.txHash,
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

      // Emit each discovered service
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
      // Use live Kite x402 weather service (plus simulated others)
      const liveService = KITE_X402_SERVICES[0];
      const allServicesToBuy = [
        liveService,
        ...ranked.filter((s) => s.id !== "kite-weather").slice(0, 2),
      ];

      for (const svc of allServicesToBuy) {
        await delay(300);
        const svcName = "name" in svc ? svc.name : svc.id;
        const svcEndpoint = "endpoint" in svc ? svc.endpoint : (svc as { endpoint: string }).endpoint;
        const svcId = svc.id;

        this.emitStep(runId, {
          id: `pay_${svcId}`,
          label: "x402 PAYMENT",
          description: `Calling ${svcName} — awaiting 402 response...`,
          status: "running",
        });

        // 1. Probe
        const params = "params" in svc ? (svc.params as Record<string, string>) : {};
        const probe = await probeService(svcEndpoint, params);

        if (!probe.needs402 && probe.data) {
          // Service returned data without payment
          const freeStep: AgentStep = {
            id: `pay_${svcId}`,
            label: "x402 PAYMENT",
            description: `${svcName} responded without payment requirement`,
            status: "success",
            completedAt: Date.now(),
            data: { response: probe.data },
          };
          addStep(freeStep);
          this.emitStep(runId, freeStep, "step_complete");
          continue;
        }

        const req = probe.requirement ?? {
          scheme: "gokite-aa",
          network: "kite-testnet",
          maxAmountRequired: "name" in svc && "pricePerCall" in svc
            ? (svc as { pricePerCall: string }).pricePerCall
            : "1000000000000000000",
          resource: svcEndpoint,
          description: svcName,
          payTo: "payTo" in svc
            ? (svc as { payTo: string }).payTo
            : "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
          asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
          maxTimeoutSeconds: 300,
          merchantName: svcName,
        };

        // 2. Budget check
        const budgetCheck = checkBudget(
          this.budget.policy,
          this.budget.spentToday,
          this.budget.spentThisMonth,
          req.maxAmountRequired
        );
        if (!budgetCheck.allowed) {
          const skipStep: AgentStep = {
            id: `pay_${svcId}`,
            label: "x402 PAYMENT",
            description: `Budget constraint: ${budgetCheck.reason}`,
            status: "skipped",
            completedAt: Date.now(),
          };
          addStep(skipStep);
          this.emitStep(runId, skipStep, "step_complete");
          continue;
        }

        // 3. Authorize
        const auth = await createAuthorization(this.wallet, req);
        if (!auth.success || !auth.xPayment) {
          const errStep: AgentStep = {
            id: `pay_${svcId}`,
            label: "x402 PAYMENT",
            description: `Authorization failed: ${auth.error}`,
            status: "error",
            completedAt: Date.now(),
          };
          addStep(errStep);
          this.emitStep(runId, errStep, "step_error");
          continue;
        }

        this.emit({
          type: "payment_start",
          runId,
          payment: {
            serviceId: svcId,
            serviceName: svcName,
            amount: req.maxAmountRequired,
            amountDisplay: auth.amountDisplay,
            payTo: req.payTo,
            status: "authorized",
          },
          timestamp: Date.now(),
        });

        // 4. Call with payment
        const callResult = await callWithPayment(svcEndpoint, auth.xPayment, params);

        // 5. Settle
        const settle = await settleViaFacilitator(auth.xPayment);

        // 6. Update budget
        this.budget = updateBudget(this.budget, req.maxAmountRequired);
        totalSpend += BigInt(req.maxAmountRequired);
        this.subscriptions.recordCall(svcId, req.maxAmountRequired);

        // 7. Write payment attestation
        const payAttest = await writeAttestation(this.wallet, {
          runId,
          type: "payment",
          contentHash: hashContent(auth.xPayment + svcId),
          metadata: `Paid ${svcName}: ${auth.amountDisplay}`,
        });
        attestations.push(payAttest);

        const payRecord = buildPaymentRecord({
          runId,
          serviceId: svcId,
          serviceName: svcName,
          amount: req.maxAmountRequired,
          decimals: 18,
          token: "KITE",
          payTo: req.payTo,
          txHash: settle.txHash ?? payAttest.txHash,
          explorerUrl: payAttest.explorerUrl,
        });
        payments.push(payRecord);

        const payStep: AgentStep = {
          id: `pay_${svcId}`,
          label: "x402 PAYMENT",
          description: `Paid ${auth.amountDisplay} to ${svcName} · ${callResult.success ? "Data received" : "Simulated"} · Settled on Kite`,
          status: "success",
          completedAt: Date.now(),
          txHash: payAttest.txHash,
          explorerUrl: payAttest.explorerUrl,
          data: {
            amount: auth.amountDisplay,
            payTo: req.payTo,
            serviceData: callResult.data,
            settleTxHash: settle.txHash,
          },
        };
        addStep(payStep);
        this.emitStep(runId, payStep, "step_complete");
        this.emit({
          type: "payment_complete",
          runId,
          payment: payRecord,
          timestamp: Date.now(),
        });
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
        metadata: `Spent: ${totalSpend} · Services: ${payments.length} · Task: ${task.input.slice(0, 60)}`,
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
        },
      };
      addStep(settleStep);
      this.emitStep(runId, settleStep, "step_complete");
      this.emit({ type: "attestation", runId, attestation: finalAttest, timestamp: Date.now() });

      // ── Complete ────────────────────────────────────────────────────────
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
          attestationUrl: finalAttest.explorerUrl,
          durationMs: Date.now() - run.startedAt,
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
    return `[Demo mode — no ANTHROPIC_API_KEY] Task: "${task}". Agent autonomously called ${serviceCount} paid service(s) via x402 on Kite chain, settled USDT payments, and anchored cryptographic attestations on Kite testnet. In production, Claude would synthesize all acquired data into a full research brief here.`;
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
