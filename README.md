# Nexum — Agentic Commerce on Kite Chain

> Autonomous AI agents that discover services, execute x402 USDC payments, manage subscriptions, and settle every action on Kite — the first AI payment blockchain.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/nexum&env=ANTHROPIC_API_KEY,AGENT_PRIVATE_KEY&root-directory=apps/web)

**Track:** Agentic Commerce · Supported by Kite AI

---

## What Is Nexum?

Nexum is a monorepo implementing a fully autonomous AI commerce agent on the Kite blockchain. The agent:

1. **Discovers services** from the Kite registry, scored by task relevance, price, and SLA
2. **Purchases data autonomously** via the x402 payment protocol — no human approval
3. **Enforces programmable spend policy** — per-call, daily, and monthly caps
4. **Settles every payment on Kite chain** — through the Pieverse facilitator
5. **Anchors cryptographic attestations** — task start, each payment, and completion — on Kite testnet
6. **Synthesises a commerce intelligence brief** via Claude
7. **Returns a KiteScan link** — immutable, verifiable proof of everything

---

## Monorepo Structure

```
nexum/
├── apps/
│   ├── web/                        Next.js 14 dashboard (Vercel-ready)
│   │   ├── app/
│   │   │   ├── api/agent/route.ts  Streaming SSE agent execution
│   │   │   ├── page.tsx            Full dashboard UI
│   │   │   └── globals.css
│   │   └── vercel.json
│   └── agent/                      Standalone CLI agent
│       └── src/
│           ├── agent.ts            Autonomous commerce executor
│           ├── commerce.ts         Service catalog, discovery, budget, subscriptions
│           └── index.ts            CLI entry point (terminal output)
├── packages/
│   ├── types/src/index.ts          All shared TypeScript types
│   ├── kite/src/index.ts           Kite chain SDK (ethers.js v6)
│   └── x402/src/index.ts          x402 payment protocol handler
├── turbo.json                      Turborepo pipeline
├── package.json                    npm workspaces root
└── .env.example
```

---

## Agent Flow

```
User submits task
       │
       ▼
[1] ◈  AGENT INIT        → wallet on Kite testnet · task_start attestation on-chain
       │
       ▼
[2] ◎  DISCOVERY         → scans Kite service registry · scores by relevance & price
       │
       ▼
[3] ⚡  x402 PAYMENTS     → for each relevant service:
       │                      GET service → 402 Payment Required
       │                      sign EVM authorization (gokite-aa scheme)
       │                      retry with X-Payment header
       │                      settle via Pieverse facilitator on Kite chain
       │                      write payment attestation on-chain
       │
       ▼
[4] ✦  CLAUDE TASK       → synthesises acquired data into intelligence brief
       │
       ▼
[5] ⛓  SETTLE ON KITE   → task_complete attestation (keccak256 result hash)
       │
       ▼
   KiteScan link — verifiable, immutable proof of the full commerce run
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### 1. Install

```bash
git clone https://github.com/yourusername/nexum
cd nexum
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
# Edit .env.local and add:
#   ANTHROPIC_API_KEY=sk-ant-...
#   AGENT_PRIVATE_KEY=0x...   (optional — fund at faucet.gokite.ai)
```

### 3. Run the web dashboard

```bash
npm run dev:web
# Open http://localhost:3000
```

### 4. Run the CLI agent

```bash
cd apps/agent
ANTHROPIC_API_KEY=sk-ant-... npx tsx src/index.ts "analyse DeFi yield opportunities"
```

---

## Deploy to Vercel

### Option A — Vercel CLI (from `apps/web`)

```bash
cd apps/web
vercel --prod
```

Set environment variables in the Vercel dashboard:
| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `AGENT_PRIVATE_KEY` | Kite testnet wallet private key (optional) |

### Option B — One-click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/nexum&env=ANTHROPIC_API_KEY,AGENT_PRIVATE_KEY&root-directory=apps/web)

---

## Kite Chain Integration

### Network Info

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 2368 | 2366 |
| RPC | `https://rpc-testnet.gokite.ai/` | `https://rpc.gokite.ai/` |
| Explorer | `https://testnet.kitescan.ai` | `https://kitescan.ai` |
| Faucet | `https://faucet.gokite.ai` | — |

### On-Chain Attestations (`@nexum/kite`)

The agent writes 3+ transactions per run:

```typescript
// Task start
await writeAttestation(wallet, { runId, type: "agent_init", contentHash, metadata });

// Per payment
await writeAttestation(wallet, { runId, type: "payment", contentHash, metadata });

// Task complete
await writeAttestation(wallet, { runId, type: "task_complete", contentHash, metadata });
```

Encoded as UTF-8 JSON in the transaction `data` field. Readable in KiteScan → "Input Data (UTF-8)".

### x402 Payment Flow (`@nexum/x402`)

```typescript
// 1. Probe service → get 402 Payment Required
const probe = await probeService("https://x402.dev.gokite.ai/api/weather", { location });

// 2. Sign authorization with agent wallet
const auth = await createAuthorization(wallet, probe.requirement);
// → { xPayment: "<base64 JWT>", amountDisplay: "1.000 KITE" }

// 3. Retry with X-Payment header
const result = await callWithPayment(endpoint, auth.xPayment, params);

// 4. Settle on Kite chain via Pieverse facilitator
const settle = await settleViaFacilitator(auth.xPayment);
// → { txHash: "0x..." }
```

### Spend Policy

```typescript
const DEFAULT_POLICY = {
  maxPerCall:   "50000000000000000000",  // 50 KITE
  maxPerDay:    "500000000000000000000", // 500 KITE
  maxPerMonth:  "5000000000000000000000" // 5,000 KITE
};
```

Budget is enforced before every payment. Calls that would exceed limits are skipped automatically.

---

## Packages

### `@nexum/types`
All shared TypeScript interfaces: `AgentIdentity`, `ServiceListing`, `PaymentRecord`, `Attestation`, `SpendingPolicy`, `BudgetState`, `AgentRun`, `AgentEvent`, and more.

### `@nexum/kite`
Kite chain SDK built on ethers.js v6:
- `getProvider(network)` — JsonRpcProvider for testnet/mainnet
- `getWallet(provider, privateKey?)` — wallet from key or ephemeral
- `writeAttestation(wallet, params)` — on-chain attestation transaction
- `checkBudget(policy, spent, amount)` — budget enforcement
- `buildPaymentRecord(params)` — typed payment record builder
- `hashContent(string)` — keccak256 content hash

### `@nexum/x402`
x402 protocol implementation:
- `probeService(url, params)` — detect 402, return requirements
- `createAuthorization(wallet, req)` — sign payment authorization
- `callWithPayment(url, xPayment, params)` — call with X-Payment header
- `settleViaFacilitator(xPayment)` — settle via Pieverse on Kite chain
- `executeX402Flow(wallet, url, params)` — full end-to-end helper

---

## Judging Criteria

| Criterion | How Nexum addresses it |
|---|---|
| **Agent Autonomy** | Zero human steps from task to settlement. Wallet management, 402 handling, payment signing, and chain settlement all happen autonomously. |
| **Developer Experience** | 3-command setup. Turborepo monorepo. Shared typed packages. Clear README. CLI + web interfaces. |
| **Real-World Applicability** | Service discovery + x402 payments is the core primitive for any agentic marketplace: data APIs, AI inference, compute, identity verification. Runs in production on Vercel. |
| **Novel / Creative** | Combines x402 payment protocol, programmable spend policy enforcement, multi-service discovery, and immutable on-chain attestation in a single agent run. Full monorepo with shared SDK. |

---

## Resources

- [Kite AI Docs](https://docs.gokite.ai)
- [Kite Testnet Explorer](https://testnet.kitescan.ai)
- [Testnet Faucet](https://faucet.gokite.ai)
- [x402 Protocol](https://docs.x402.org)
- [Kite Agent Passport](https://docs.gokite.ai/kite-agent-passport/developer-guide)
- [Pieverse Facilitator](https://facilitator.pieverse.io)
- [Kite x402 Demo](https://github.com/gokite-ai/x402)

---

## License

MIT
