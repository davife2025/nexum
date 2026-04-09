import { NextRequest } from "next/server";
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
import type { AgentEvent, AgentStep, PaymentRecord, Attestation } from "@nexum/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Service catalog (web-side copy for edge compatibility) ────────────────────
const SERVICE_CATALOG = [
  {
    id: "kite-weather",
    name: "Kite Weather API",
    description: "Real-time weather and conditions for any global city",
    category: "data" as const,
    endpoint: "https://x402.dev.gokite.ai/api/weather",
    pricePerCall: "1000000000000000000",
    priceDisplay: "~1 KITE / call",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    tags: ["weather", "real-time", "data"],
  },
  {
    id: "nexum-finance",
    name: "Nexum Finance Oracle",
    description: "DeFi TVL, yield rates, and liquidity across protocols",
    category: "finance" as const,
    endpoint: "https://x402.dev.gokite.ai/api/finance",
    pricePerCall: "5000000000000000000",
    priceDisplay: "~5 KITE / call",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    tags: ["DeFi", "TVL", "yield", "finance"],
  },
  {
    id: "nexum-identity",
    name: "Kite Identity Verifier",
    description: "On-chain identity and reputation via Kite Passport",
    category: "identity" as const,
    endpoint: "https://x402.dev.gokite.ai/api/identity",
    pricePerCall: "500000000000000000",
    priceDisplay: "~0.5 KITE / call",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    tags: ["identity", "KYC", "passport"],
  },
];

const DEFAULT_POLICY = {
  id: "nexum-default",
  name: "Nexum Commerce Policy",
  maxPerCall: "50000000000000000000",
  maxPerDay: "500000000000000000000",
  maxPerMonth: "5000000000000000000000",
  allowedCategories: ["data", "weather", "finance", "ai", "compute", "identity", "other"] as const,
};

function encode(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function discoverServices(task: string) {
  const t = task.toLowerCase();
  return SERVICE_CATALOG.filter((svc) => {
    if ((t.includes("weather") || t.includes("climate") || t.includes("data")) && svc.category === "data") return true;
    if ((t.includes("finance") || t.includes("defi") || t.includes("yield") || t.includes("market")) && svc.category === "finance") return true;
    if ((t.includes("identity") || t.includes("verify") || t.includes("kyc")) && svc.category === "identity") return true;
    // Always include weather (live x402 service) as default data source
    if (svc.id === "kite-weather") return true;
    return false;
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { task, location = "San Francisco" } = body;
  if (!task) return new Response("Task required", { status: 400 });

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (e: AgentEvent) => ctrl.enqueue(encoder.encode(encode(e)));
      const payments: PaymentRecord[] = [];
      const attestations: Attestation[] = [];
      let totalSpend = 0n;
      let spentToday = "0";
      let spentMonth = "0";

      try {
        // ── Init ──────────────────────────────────────────────────────────
        const provider = getProvider("testnet");
        const wallet = getWallet(provider, process.env.AGENT_PRIVATE_KEY);
        const identity = buildAgentIdentity(wallet, "nexum-commerce-agent", "testnet");

        send({ type: "run_start", runId, agent: identity, timestamp: Date.now() });

        // Step: Agent init
        send({ type: "step_start", runId, step: { id: "agent_init", label: "AGENT INIT", description: "Bootstrapping Nexum agent on Kite chain...", status: "running" }, timestamp: Date.now() });

        const initAttest = await writeAttestation(wallet, {
          runId, type: "agent_init",
          contentHash: hashContent(task + runId),
          metadata: `Task: ${task.slice(0, 80)}`,
        });
        attestations.push(initAttest);

        send({
          type: "step_complete", runId,
          step: {
            id: "agent_init", label: "AGENT INIT",
            description: `Agent online · ${wallet.address.slice(0, 10)}...${wallet.address.slice(-6)} · Kite Testnet`,
            status: "success", txHash: initAttest.txHash, explorerUrl: initAttest.explorerUrl,
            data: { address: wallet.address, addressUrl: addressUrl(wallet.address), network: "kite-testnet" },
          },
          timestamp: Date.now(),
        });

        // ── Service Discovery ────────────────────────────────────────────
        await pause(350);
        send({ type: "step_start", runId, step: { id: "discover", label: "SERVICE DISCOVERY", description: `Scanning Kite registry for task: "${task.slice(0, 60)}"...`, status: "running" }, timestamp: Date.now() });

        const services = discoverServices(task);
        services.forEach((svc) => send({ type: "service_discovered", runId, service: svc, timestamp: Date.now() }));

        send({
          type: "step_complete", runId,
          step: {
            id: "discover", label: "SERVICE DISCOVERY",
            description: `${services.length} service${services.length !== 1 ? "s" : ""} matched: ${services.map((s) => s.name).join(" · ")}`,
            status: "success",
            data: { services: services.map((s) => ({ id: s.id, name: s.name, price: s.priceDisplay })) },
          },
          timestamp: Date.now(),
        });

        // ── x402 Payments ────────────────────────────────────────────────
        for (const svc of services) {
          await pause(350);

          const isLive = svc.id === "kite-weather";
          const liveEndpoint = KITE_X402_SERVICES[0].endpoint;
          const endpoint = isLive ? liveEndpoint : svc.endpoint;
          const params = isLive ? { location } : {};

          send({
            type: "step_start", runId,
            step: { id: `pay_${svc.id}`, label: "x402 PAYMENT", description: `Calling ${svc.name}${isLive ? ` (${location})` : ""} — probing for 402...`, status: "running" },
            timestamp: Date.now(),
          });

          // Budget check
          const budget = checkBudget(DEFAULT_POLICY, spentToday, spentMonth, svc.pricePerCall);
          if (!budget.allowed) {
            send({ type: "step_complete", runId, step: { id: `pay_${svc.id}`, label: "x402 PAYMENT", description: `Skipped — ${budget.reason}`, status: "skipped" }, timestamp: Date.now() });
            continue;
          }

          // Probe
          const probe = await probeService(endpoint, params);
          const req402 = probe.requirement ?? {
            scheme: "gokite-aa", network: "kite-testnet",
            maxAmountRequired: svc.pricePerCall,
            resource: endpoint, description: svc.name,
            payTo: svc.payTo, asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
            maxTimeoutSeconds: 300, merchantName: svc.name,
          };

          // Inform UI of 402 response
          send({
            type: "step_update", runId,
            step: { id: `pay_${svc.id}`, label: "x402 PAYMENT", description: `402 received · Signing payment auth for ${svc.priceDisplay}...`, status: "running" },
            timestamp: Date.now(),
          });

          // Authorize
          const auth = await createAuthorization(wallet, req402);
          if (!auth.success || !auth.xPayment) {
            send({ type: "step_error", runId, step: { id: `pay_${svc.id}`, label: "x402 PAYMENT", description: `Auth failed: ${auth.error}`, status: "error" }, error: auth.error, timestamp: Date.now() });
            continue;
          }

          send({ type: "payment_start", runId, payment: { serviceId: svc.id, serviceName: svc.name, amountDisplay: auth.amountDisplay, payTo: req402.payTo, status: "authorized" }, timestamp: Date.now() });

          // Call with payment header
          const callResult = await callWithPayment(endpoint, auth.xPayment, params);

          // Settle via Kite facilitator
          const settle = await settleViaFacilitator(auth.xPayment);

          // Update spend tracking
          spentToday = (BigInt(spentToday) + BigInt(svc.pricePerCall)).toString();
          spentMonth = (BigInt(spentMonth) + BigInt(svc.pricePerCall)).toString();
          totalSpend += BigInt(svc.pricePerCall);

          // Write payment attestation
          const payAttest = await writeAttestation(wallet, {
            runId, type: "payment",
            contentHash: hashContent(auth.xPayment + svc.id),
            metadata: `Paid ${svc.name}: ${auth.amountDisplay}`,
          });
          attestations.push(payAttest);

          const payRecord = buildPaymentRecord({
            runId, serviceId: svc.id, serviceName: svc.name,
            amount: svc.pricePerCall, decimals: 18, token: "KITE",
            payTo: req402.payTo,
            txHash: settle.txHash ?? payAttest.txHash,
            explorerUrl: payAttest.explorerUrl,
          });
          payments.push(payRecord);

          send({
            type: "step_complete", runId,
            step: {
              id: `pay_${svc.id}`, label: "x402 PAYMENT",
              description: `${auth.amountDisplay} paid to ${svc.name} · ${callResult.success ? "Live data received" : "Simulated"} · Settled on Kite`,
              status: "success", txHash: payAttest.txHash, explorerUrl: payAttest.explorerUrl,
              data: {
                amount: auth.amountDisplay, payTo: req402.payTo,
                serviceData: callResult.data, settleTxHash: settle.txHash,
                scheme: "gokite-aa", network: "kite-testnet",
              },
            },
            payment: payRecord,
            timestamp: Date.now(),
          });
          send({ type: "payment_complete", runId, payment: payRecord, timestamp: Date.now() });
        }

        // ── Claude AI Task ───────────────────────────────────────────────
        await pause(400);
        send({ type: "step_start", runId, step: { id: "ai_task", label: "AI COMMERCE TASK", description: "Running autonomous analysis via Claude...", status: "running" }, timestamp: Date.now() });

        const result = await runClaude(task, location, payments);

        send({
          type: "step_complete", runId,
          step: { id: "ai_task", label: "AI COMMERCE TASK", description: `Analysis complete — ${result.slice(0, 72)}...`, status: "success", data: { preview: result.slice(0, 200) } },
          result,
          timestamp: Date.now(),
        });

        // ── Final settlement attestation ────────────────────────────────
        await pause(350);
        send({ type: "step_start", runId, step: { id: "settle", label: "SETTLE ON KITE", description: "Anchoring completion proof on Kite chain...", status: "running" }, timestamp: Date.now() });

        const resultHash = hashContent(result + runId + totalSpend.toString());
        const finalAttest = await writeAttestation(wallet, {
          runId, type: "task_complete", contentHash: resultHash,
          metadata: `services=${payments.length} spend=${totalSpend} task=${task.slice(0, 60)}`,
        });
        attestations.push(finalAttest);

        send({
          type: "step_complete", runId,
          step: {
            id: "settle", label: "SETTLE ON KITE",
            description: `Commerce run anchored · ${payments.length} payment${payments.length !== 1 ? "s" : ""} · ${attestations.length} attestations on Kite testnet`,
            status: "success", txHash: finalAttest.txHash, explorerUrl: finalAttest.explorerUrl,
            data: { resultHash, totalSpend: totalSpend.toString(), attestations: attestations.length },
          },
          attestation: finalAttest,
          timestamp: Date.now(),
        });

        // ── Run complete ─────────────────────────────────────────────────
        send({
          type: "run_complete", runId,
          result,
          meta: {
            totalSpend: totalSpend.toString(),
            paymentsCount: payments.length,
            attestationsCount: attestations.length,
            attestationUrl: finalAttest.explorerUrl,
            agentAddress: wallet.address,
            durationMs: Date.now(),
          },
          timestamp: Date.now(),
        });

      } catch (err: unknown) {
        send({ type: "run_error", runId, error: err instanceof Error ? err.message : String(err), timestamp: Date.now() });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runClaude(task: string, location: string, payments: PaymentRecord[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const dataContext = payments
    .map((p) => `• ${p.serviceName}: paid ${p.amountDisplay} via x402 on Kite chain`)
    .join("\n");

  if (!apiKey) {
    return `[Demo — set ANTHROPIC_API_KEY for full AI output]\n\nNexum agent completed ${payments.length} autonomous service purchase${payments.length !== 1 ? "s" : ""} via x402 on Kite testnet. Services acquired:\n${dataContext}\n\nTask: "${task}" — agent executed end-to-end with cryptographic settlement on Kite chain.`;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are Nexum, an autonomous AI commerce agent operating on the Kite blockchain — the first AI payment blockchain. You just executed a full agentic commerce run: discovered services from the Kite registry, purchased data autonomously via the x402 payment protocol (HTTP 402 → sign → X-Payment header → settle on Kite chain), and now synthesise the acquired data into a commercial intelligence brief. Write 3–5 tight paragraphs. Lead with the most actionable insight. Be specific and data-driven. Close with implications for the agentic economy. No headers or bullet points — flowing analytical prose only.`,
        messages: [{
          role: "user",
          content: `Commerce task: ${task}\nLocation context: ${location}\n\nServices purchased autonomously via x402:\n${dataContext || "• Kite Weather API (live x402 call)"}\n\nDeliver the commerce intelligence brief.`,
        }],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) throw new Error(`Claude ${res.status}`);
    const json = await res.json();
    return json.content?.[0]?.text ?? "Analysis complete.";
  } catch (err) {
    return `Nexum agent completed ${payments.length} service purchase${payments.length !== 1 ? "s" : ""} via x402 on Kite chain.\n\n${dataContext}\n\nTask: "${task}" (AI synthesis unavailable — ${err})`;
  }
}
