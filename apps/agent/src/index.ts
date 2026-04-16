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

    case "run_complete": {
      const meta = e.meta as Record<string, string | number> | undefined;
      const durationSec = meta?.durationMs ? (Number(meta.durationMs) / 1000).toFixed(1) : "—";
      console.log();

      // ── Summary box ──────────────────────────────────────────────────
      const W = 54;
      const line = (label: string, value: string, color = c.white) => {
        const pad = W - 4 - label.length - value.length;
        console.log(`${c.dim}│${c.reset} ${c.dim}${label}${c.reset}${" ".repeat(Math.max(0, pad))}${color}${value}${c.reset} ${c.dim}│${c.reset}`);
      };
      console.log(`${c.dim}╔${"═".repeat(W - 2)}╗${c.reset}`);
      console.log(`${c.dim}│${c.reset} ${c.bold}${c.green}✦ NEXUM RUN COMPLETE${c.reset}${" ".repeat(W - 24)}${c.dim}│${c.reset}`);
      console.log(`${c.dim}├${"─".repeat(W - 2)}┤${c.reset}`);
      line("Run ID",       String(e.runId ?? "—").slice(-20),         c.cyan);
      line("Duration",     `${durationSec}s`,                         c.white);
      line("Payments",     `${meta?.paymentsCount ?? 0}`,             c.yellow);
      line("Total Spend",  `${meta?.totalSpend ?? 0} KITE`,           c.cyan);
      line("Attestations", `${meta?.attestationsCount ?? 0} on-chain`, c.magenta);
      if (meta?.attestationUrl) {
        console.log(`${c.dim}├${"─".repeat(W - 2)}┤${c.reset}`);
        const url = String(meta.attestationUrl).replace("https://", "");
        line("Proof",      url.slice(0, W - 10),                      c.magenta);
      }
      console.log(`${c.dim}╚${"═".repeat(W - 2)}╝${c.reset}`);
      console.log();

      // ── Intelligence brief ────────────────────────────────────────────
      if (e.result) {
        console.log(`${c.bold}${c.white}── INTELLIGENCE BRIEF ──────────────────────────────────${c.reset}`);
        // Word-wrap at 70 chars
        const words = e.result.split(" ");
        let currentLine = "";
        for (const word of words) {
          if ((currentLine + " " + word).trim().length > 70) {
            console.log(`  ${currentLine}`);
            currentLine = word;
          } else {
            currentLine = currentLine ? currentLine + " " + word : word;
          }
        }
        if (currentLine) console.log(`  ${currentLine}`);
        console.log(`${c.dim}────────────────────────────────────────────────────────${c.reset}`);
      }
      break;
    }

    case "run_error":
      log("✗ ERROR", c.red, e.error ?? "Unknown");
      break;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];

  // --help flag
  if (arg === "--help" || arg === "-h") {
    console.log(`
${c.bold}${c.white}nexum${c.reset} — Agentic Commerce on Kite Chain
${c.dim}${"─".repeat(52)}${c.reset}

${c.bold}USAGE${c.reset}
  ${c.cyan}npx tsx src/index.ts${c.reset} [task] [options]

${c.bold}ARGUMENTS${c.reset}
  ${c.yellow}task${c.reset}    Natural language commerce task (quoted string)
          Default: "analyse weather patterns and their
                   impact on DeFi liquidity pools"

${c.bold}OPTIONS${c.reset}
  ${c.yellow}--help, -h${c.reset}    Show this help message

${c.bold}ENVIRONMENT${c.reset}
  ${c.yellow}ANTHROPIC_API_KEY${c.reset}   Required. From console.anthropic.com
  ${c.yellow}AGENT_PRIVATE_KEY${c.reset}   Optional. Kite testnet wallet (0x-prefixed)
                       Leave blank for ephemeral wallet.
                       Fund at: ${c.cyan}faucet.gokite.ai${c.reset}

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Basic usage${c.reset}
  npx tsx src/index.ts "analyse DeFi yields in Lagos"

  ${c.dim}# With funded wallet for on-chain attestations${c.reset}
  AGENT_PRIVATE_KEY=0x... npx tsx src/index.ts "research x402 adoption"

  ${c.dim}# Using npm script (loads .env.local automatically)${c.reset}
  npm run run:task "compare Kite chain TVL with competitors"

${c.bold}OUTPUT${c.reset}
  Each run produces:
  · Live step-by-step trace with payment details
  · Summary table: run ID, duration, payments, spend
  · Commerce intelligence brief
  · KiteScan attestation link (if wallet funded)

${c.bold}CHAIN${c.reset}
  Network: Kite Testnet · Chain ID: 2368
  RPC:     rpc-testnet.gokite.ai
  Scan:    testnet.kitescan.ai
`);
    process.exit(0);
  }

  const task = arg ?? "analyse weather patterns and their impact on DeFi liquidity pools";

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
