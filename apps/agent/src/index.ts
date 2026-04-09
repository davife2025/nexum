#!/usr/bin/env tsx
// ─────────────────────────────────────────────────────────────────────────────
// Nexum Agent — CLI Entry Point
// Run: ANTHROPIC_API_KEY=... npx tsx src/index.ts "research DeFi yields"
// ─────────────────────────────────────────────────────────────────────────────

import { NexumAgent } from "./agent.js";
import type { AgentEvent } from "@nexum/types";

// ── ANSI colors for terminal output ──────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

function log(prefix: string, color: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`${c.dim}[${ts}]${c.reset} ${color}${prefix}${c.reset} ${msg}`);
}

function handleEvent(e: AgentEvent) {
  switch (e.type) {
    case "run_start":
      log("◈ NEXUM", c.cyan, `Agent ${e.agent?.address ?? ""}`);
      log("  TASK", c.dim, `${e.runId}`);
      break;

    case "step_start":
      log(`  ➤ ${e.step?.label ?? ""}`, c.yellow, e.step?.description ?? "");
      break;

    case "step_update":
      log(`  ↻ ${e.step?.label ?? ""}`, c.dim, e.step?.description ?? "");
      break;

    case "step_complete": {
      const icon = e.step?.status === "skipped" ? "⊘" : "✓";
      const color = e.step?.status === "skipped" ? c.dim : c.green;
      log(`  ${icon} ${e.step?.label ?? ""}`, color, e.step?.description ?? "");
      if (e.step?.txHash) {
        log("    ⛓ TX", c.cyan, e.step.explorerUrl ?? e.step.txHash);
      }
      break;
    }

    case "step_error":
      log(`  ✗ ${e.step?.label ?? ""}`, c.red, e.step?.description ?? "");
      break;

    case "payment_start":
      log(
        "  ⚡ PAYMENT",
        c.magenta,
        `${e.payment?.amountDisplay ?? e.payment?.amount} → ${e.payment?.serviceName}`
      );
      break;

    case "payment_complete":
      log(
        "  ✓ SETTLED",
        c.green,
        `${e.payment?.amountDisplay} · ${e.payment?.txHash?.slice(0, 16)}...`
      );
      break;

    case "service_discovered":
      log(
        "  ◎ FOUND",
        c.blue,
        `${e.service?.name} (${e.service?.priceDisplay})`
      );
      break;

    case "attestation":
      log("  ⛓ ATTEST", c.cyan, e.attestation?.explorerUrl ?? "");
      break;

    case "run_complete":
      console.log();
      log("✦ COMPLETE", c.green, `Run ${e.runId}`);
      if (e.meta) {
        log(
          "  SPEND",
          c.cyan,
          `${e.meta.totalSpend} · ${e.meta.paymentsCount} payments · ${e.meta.attestationsCount} attestations`
        );
        if (e.meta.attestationUrl) {
          log("  PROOF", c.cyan, String(e.meta.attestationUrl));
        }
      }
      console.log();
      if (e.result) {
        console.log(
          `${c.bold}${c.white}── INTELLIGENCE BRIEF ─────────────────────────────────${c.reset}`
        );
        console.log(`\n${e.result}\n`);
        console.log(
          `${c.dim}────────────────────────────────────────────────────────${c.reset}`
        );
      }
      break;

    case "run_error":
      log("✗ ERROR", c.red, e.error ?? "Unknown");
      break;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const task = process.argv[2] ?? "analyse weather patterns and their impact on DeFi liquidity pools";

  console.log(
    `\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════════╗`
  );
  console.log(`║           NEXUM — Agentic Commerce on Kite           ║`);
  console.log(`╚══════════════════════════════════════════════════════╝${c.reset}\n`);

  const agent = new NexumAgent(process.env.AGENT_PRIVATE_KEY, handleEvent);

  log("◈ IDENTITY", c.cyan, agent.address);
  log("  NETWORK", c.dim, "Kite Testnet (Chain ID: 2368)");
  log("  TASK", c.white, task);
  console.log();

  await agent.execute({
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "research",
    input: task,
  });
}

main().catch((err) => {
  console.error(`${c.red}Fatal:${c.reset}`, err);
  process.exit(1);
});
