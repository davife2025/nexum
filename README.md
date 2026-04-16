# Nexum — Agentic Commerce on Kite Chain

> Autonomous AI agents that discover services, execute x402 USDC payments, enforce programmable spend policy, and settle every action on Kite — the first AI payment blockchain.

**Hackathon Track:** Agentic Commerce · Supported by Kite AI
---

## What Is Nexum?

Nexum is a fully autonomous AI commerce agent. Given a task, it:

1. **Discovers** relevant services from the Kite AIR service registry — scored by relevance, price, and SLA
2. **Purchases** data autonomously via the x402 payment protocol — HTTP 402 → sign EVM auth → X-Payment header
3. **Enforces** programmable spend policy — per-call, daily, and monthly caps checked before every payment
4. **Settles** every payment on Kite chain — via the Pieverse facilitator, with on-chain USDT transfer
5. **Synthesises** a commerce intelligence brief — Claude runs the AI task with zero human steps
6. **Anchors** cryptographic attestations — task start, each payment, and completion hash on Kite testnet
7. **Returns** a KiteScan link — immutable, verifiable proof of the full commerce run

---

## Monorepo Structure

```
nexum/
├── apps/
│   ├── web/                         Next.js 14 — full web app (Vercel-ready)
│   │   ├── app/
│   │   │   ├── page.tsx             Landing page (/)
│   │   │   ├── not-found.tsx        Custom 404
│   │   │   ├── layout.tsx           Root layout + OG meta
│   │   │   ├── app/
│   │   │   │   ├── page.tsx         Agent dashboard (/app)
│   │   │   │   └── runs/
│   │   │   │       ├── page.tsx     All runs list (/app/runs)
│   │   │   │       └── [id]/page.tsx  Run detail (/app/runs/:id)
│   │   │   ├── marketplace/page.tsx  Service registry (/marketplace)
│   │   │   ├── history/page.tsx      Spend dashboard (/history)
│   │   │   ├── agent/page.tsx        Wallet + policy (/agent)
│   │   │   ├── attestations/page.tsx On-chain proof explorer (/attestations)
│   │   │   ├── providers/page.tsx    Service provider onboarding (/providers)
│   │   │   ├── components/
│   │   │   │   ├── AppNav.tsx        Shared nav + search trigger
│   │   │   │   ├── SearchBar.tsx     ⌘K global search modal
│   │   │   │   ├── RunsMonitor.tsx   Live auto-refreshing runs feed
│   │   │   │   ├── Skeleton.tsx        Loading skeletons + ErrorBoundary
│   │   │   │   ├── ServiceStatusStrip.tsx  Live ping of all x402 services
│   │   │   │   ├── SpendChart.tsx      SVG spend-over-time bar chart
│   │   │   │   ├── QuickTasks.tsx        Suggested task launcher for idle state
│   │   │   │   └── Toast.tsx             Toast notification system (run complete, payments, errors)
│   │   │   ├── loading.tsx             Root loading state
│   │   │   ├── {route}/loading.tsx     Per-route loading states (×6)
│   │   │   └── {route}/error.tsx       Per-route error boundaries (×6)
│   │   │   └── api/
│   │   │       ├── agent/route.ts         POST — streaming agent execution (SSE)
│   │   │       ├── agent/balance/route.ts GET  — live wallet balance from Kite RPC
│   │   │       ├── runs/route.ts          GET  — all runs + aggregate stats
│   │   │       ├── runs/[id]/route.ts     GET  — single run detail
│   │   │       ├── history/route.ts       GET  — payment ledger with spend summary
│   │   │       ├── history/export/route.ts GET  — CSV download of all payments
│   │   │       ├── attestations/route.ts  GET  — on-chain attestation timeline
│   │   │       ├── services/route.ts      GET  — service registry with filtering
│   │   │       └── search/route.ts        GET  — full-text search across runs/payments/attestations
│   │   └── lib/
│   │       └── store.ts             In-memory run store (global singleton, seeds demo data, prunes to 100 runs)
│   └── agent/                       Standalone CLI agent (Node.js)
│       └── src/
│           ├── agent.ts             Autonomous commerce executor
│           ├── commerce.ts          Service catalog, discovery, budget, subscriptions
│           └── index.ts             CLI entry point (colorful terminal output)
└── packages/
    ├── types/src/index.ts           All shared TypeScript interfaces
    ├── kite/src/index.ts            Kite chain SDK (ethers.js v6)
    └── x402/src/index.ts           x402 payment protocol handler
```

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/yourusername/nexum
cd nexum
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — leave blank for ephemeral demo wallet
# Fund at https://faucet.gokite.ai for real on-chain attestations
AGENT_PRIVATE_KEY=0x...
```

### 3. Run the web dashboard

```bash
npm run dev:web
# http://localhost:3000
```

> **Tip:** The CLI agent auto-loads `.env.local` from the repo root via `tsx --env-file`:
> ```bash
> cd apps/agent && npm run run:task "analyse DeFi yields in Lagos"
> ```

### 4. Run the CLI agent

```bash
cd apps/agent
ANTHROPIC_API_KEY=sk-ant-... npx tsx src/index.ts "analyse DeFi yields in Lagos"
```

---

## Deploy to Vercel

```bash
cd apps/web
vercel --prod
```

Set two environment variables in the Vercel dashboard:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com) |
| `AGENT_PRIVATE_KEY` | No | Kite testnet wallet — fund at [faucet.gokite.ai](https://faucet.gokite.ai) |

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — animated terminal demo, features, how-it-works |
| `/app` | Agent dashboard — task input, live step trace, payments, report |
| `/app/runs` | All runs list — filterable, searchable, auto-refreshes |
| `/app/runs/:id` | Run detail — full payments, attestations, intelligence brief |
| `/marketplace` | Service registry — browse, filter, dispatch agent to any service |
| `/history` | Spend dashboard — budget bars, payment ledger, CSV export |
| `/agent` | Wallet + identity — live balance, Kite Passport, spend policy editor |
| `/attestations` | On-chain proof explorer — decoded tx data, KiteScan links |
| `/providers` | Service provider onboarding — x402 schema, code examples, registration |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/agent` | Execute agent — streams SSE events |
| `GET` | `/api/agent/balance` | Live wallet balance from Kite testnet RPC |
| `GET` | `/api/runs` | All runs + aggregate stats |
| `GET` | `/api/runs/:id` | Single run detail |
| `DELETE` | `/api/runs/:id` | Delete a run from the store |
| `DELETE` | `/api/runs` | Clear all runs from the store |
| `GET` | `/api/history` | Payment ledger with spend summary |
| `GET` | `/api/history/export` | CSV download of all payments |
| `GET` | `/api/attestations` | On-chain attestation timeline |
| `GET` | `/api/services` | Service registry with filtering |
| `GET` | `/api/search?q=` | Full-text search across runs, payments, attestations |
| `GET` | `/api/services` | Service registry with category + text filtering |
| `GET` | `/api/agent/balance` | Live KITE + USDT balance from Kite testnet RPC |
| `GET` | `/api/agent/policy` | Load current spend policy |
| `POST` | `/api/agent/policy` | Save spend policy (validated) |
| `GET` | `/api/history/export` | CSV download of all payments |
| `GET` | `/api/health` | Health check + live run stats |
| `GET` | `/api/runs/stats` | Dedicated stats: totalRuns, spentToday, uniqueServices, activeRuns |
| `POST` | `/api/providers` | Submit a service for marketplace review |
| `GET` | `/api/providers` | List pending service registrations |
| `GET` | `/api/status` | Live ping of all x402 service endpoints |

---

## Kite Chain

### Network Configuration

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 2368 | 2366 |
| RPC | `https://rpc-testnet.gokite.ai/` | `https://rpc.gokite.ai/` |
| Explorer | `https://testnet.kitescan.ai` | `https://kitescan.ai` |
| Faucet | `https://faucet.gokite.ai` | — |

### On-chain Attestations

Every agent run writes 3+ transactions to Kite testnet:

```typescript
// 1. Task start
await writeAttestation(wallet, { runId, type: "agent_init", contentHash: keccak256(task) });

// 2. Per payment
await writeAttestation(wallet, { runId, type: "payment", contentHash: keccak256(xPayment) });

// 3. Task complete
await writeAttestation(wallet, { runId, type: "task_complete", contentHash: keccak256(result) });
```

Transaction data is encoded as UTF-8 JSON in the `data` field — readable in KiteScan → "Input Data (UTF-8)".

### x402 Payment Flow

```typescript
// 1. Probe — detect 402
const probe = await probeService("https://x402.dev.gokite.ai/api/weather", { location });
// → { needs402: true, requirement: { payTo, asset, maxAmountRequired, scheme: "gokite-aa" } }

// 2. Authorize — sign EVM payment auth
const auth = await createAuthorization(wallet, probe.requirement);
// → { xPayment: "<base64>", amountDisplay: "1.0000 KITE" }

// 3. Call — retry with X-Payment header
const result = await callWithPayment(endpoint, auth.xPayment, params);

// 4. Settle — execute on Kite chain via Pieverse
const settle = await settleViaFacilitator(auth.xPayment);
// → { success: true, txHash: "0x..." }
```

---

## Shared Packages

### `@nexum/types`
All TypeScript interfaces: `AgentIdentity`, `ServiceListing`, `PaymentRecord`, `Attestation`, `SpendingPolicy`, `BudgetState`, `AgentRun`, `AgentEvent`, and more.

### `@nexum/kite`
Kite chain SDK (ethers.js v6):
- `getProvider(network)` — JsonRpcProvider for testnet/mainnet
- `getWallet(provider, privateKey?)` — wallet from key or ephemeral
- `writeAttestation(wallet, params)` — write on-chain attestation tx
- `checkBudget(policy, spent, amount)` — enforce spending constraints
- `buildPaymentRecord(params)` — typed payment record
- `hashContent(string)` — keccak256 content hash

### `@nexum/x402`
x402 protocol handler:
- `probeService(url, params)` — detect 402, return requirements
- `createAuthorization(wallet, req)` — sign payment authorization
- `callWithPayment(url, xPayment, params)` — call with X-Payment header
- `settleViaFacilitator(xPayment)` — settle via Pieverse on Kite chain
- `executeX402Flow(wallet, url, params)` — full end-to-end helper



## Resources

- [Kite AI Docs](https://docs.gokite.ai)
- [Kite Agent Passport Developer Guide](https://docs.gokite.ai/kite-agent-passport/developer-guide)
- [Kite Service Provider Guide](https://docs.gokite.ai/kite-agent-passport/service-provider-guide)
- [Kite Testnet Explorer](https://testnet.kitescan.ai)
- [Testnet Faucet](https://faucet.gokite.ai)
- [x402 Protocol](https://docs.x402.org)
- [Pieverse Facilitator](https://facilitator.pieverse.io)
- [Kite x402 Reference Repo](https://github.com/gokite-ai/x402)

---

## License

MIT
