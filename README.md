<div align="center">

# Nexum

**Autonomous AI Commerce on Kite Chain**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Kite Chain](https://img.shields.io/badge/Kite-Testnet-00E5C9?style=flat-square)](https://testnet.kitescan.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

*Give an agent a task. It buys what it needs. Every payment settles on-chain. No humans required.*

[Live Demo](https://nexum-web-nine.vercel.app) · [KiteScan Explorer](https://testnet.kitescan.ai) · [Kite Faucet](https://faucet.gokite.ai)

</div>

---

## Overview

Nexum is a fully autonomous AI commerce agent built on [Kite](https://gokite.ai) — the first blockchain designed for AI payments. Given a natural-language task, Nexum:

1. **Discovers** relevant APIs from the Kite service registry, scored by relevance and price
2. **Purchases** them autonomously via the [x402 payment protocol](https://docs.x402.org) — HTTP 402 → EVM authorization → `X-Payment` header
3. **Enforces** programmable spend policy — per-call, daily, and monthly caps before every payment
4. **Settles** every payment on Kite chain through the Pieverse facilitator
5. **Synthesises** an intelligence brief using Claude, with the purchased data as context
6. **Anchors** cryptographic attestations on-chain — task start, every payment, and completion hash

Every run produces a KiteScan link: immutable, verifiable proof that the agent purchased real services and settled real payments.

---

## Quick Start

### Prerequisites

- Node.js 18+
- An Anthropic API key — [console.anthropic.com](https://console.anthropic.com)

### Install

```bash
git clone https://github.com/davife2025/nexum
cd nexum
npm install
```

### Configure

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `.env.local` — only one variable is required to run:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — leave blank for an ephemeral demo wallet
# Fund at https://faucet.gokite.ai for real on-chain attestations
AGENT_PRIVATE_KEY=0x...

# Optional — Kite Passport (leave blank to run in simulate mode)
KITE_PASSPORT_BASE_URL=https://api.agentpassport.ai
KITE_PASSPORT_API_KEY=kpass_live_...
```

### Run

```bash
# Web dashboard
npm run dev:web
# → http://localhost:3000

# CLI agent
cd apps/agent
npx tsx src/index.ts "analyse DeFi yields in Lagos"
```

---

## How It Works

### The x402 Payment Protocol

Nexum extends the standard HTTP protocol with machine-native payments. When an agent calls a paid service without a valid `X-Payment` header, the service returns `HTTP 402 Payment Required` with its payment requirements. The agent signs an EVM authorization and retries — the service verifies and settles on-chain.

```
Agent → GET /api/weather         → 402 + requirements
Agent →     create EVM auth      → X-Payment: <base64>
Agent → GET /api/weather         → 200 + data
        (Pieverse settles tx on Kite chain)
```

### Kite Agent Passport

For production deployments, Nexum supports **Kite Agent Passport** — a user-bound Account Abstraction wallet that constrains every payment to a session the user signs with a passkey. Instead of the agent holding a hot wallet, payments are delegated under a user-approved spending envelope.

```
User creates session → { max $2/tx, max $10 total, 24h TTL }
Agent runs           → each payment signs a delegation under the session
Session exhausted    → agent must request a new one from the user
```

Nexum automatically falls back to a local x402 wallet when no Passport session is active — the same codebase works for both modes.

### On-Chain Attestations

Every run writes 3+ transactions to Kite chain regardless of payment mode:

```typescript
// Task initialised
writeAttestation(wallet, { type: "agent_init",    contentHash: keccak256(task)     });
// Each payment
writeAttestation(wallet, { type: "payment",       contentHash: keccak256(xPayment) });
// Task complete
writeAttestation(wallet, { type: "task_complete", contentHash: keccak256(result)   });
```

Transaction data is encoded as UTF-8 JSON in the `data` field — readable in KiteScan → "Input Data (UTF-8)".

---

## Architecture

```
nexum/
├── apps/
│   ├── web/                    Next.js 14 — dashboard + all API routes
│   │   ├── app/                Pages and API handlers
│   │   └── lib/
│   │       ├── store.ts        File-backed run store (survives restarts)
│   │       └── passport-store.ts  File-backed Passport session state
│   └── agent/                  Standalone CLI agent
│       └── src/
│           ├── agent.ts        Commerce executor (driver-based)
│           ├── payment-driver.ts  Passport ↔ local x402 routing
│           ├── commerce.ts     Service catalog, discovery, budget
│           └── index.ts        CLI entry point
└── packages/
    ├── types/                  All shared TypeScript interfaces
    ├── kite/                   Kite chain SDK (ethers.js v6)
    ├── x402/                   x402 payment protocol handler
    └── passport/               Kite Agent Passport HTTP client
```

### Payment Driver

The agent uses a driver abstraction so the rest of the runtime doesn't care which payment path is active:

```typescript
const driver = makePaymentDriver({
  wallet,              // local key — used for attestations always
  budget,              // per-call / daily / monthly caps (local mode)
  session,             // active Passport session (if any)
  passport,            // Passport client (if any)
});

// Same call regardless of mode:
const outcome = await driver.pay({ runId, serviceId, endpoint, params });
// → { status, payment, attestation, data, amountDisplay }
```

`PaymentRecord.origin` is `"passport" | "local"` so the UI can show which payment path was used for every transaction.

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — animated terminal, features, how-it-works |
| `/app` | Agent dashboard — task input, live step trace, payments, intelligence brief |
| `/app/runs` | All runs — filterable, searchable, live-refreshing |
| `/app/runs/:id` | Run detail — full payments, attestations, AI brief |
| `/marketplace` | Service registry — browse by category, dispatch agent |
| `/history` | Spend dashboard — Passport vs local breakdown, CSV export |
| `/agent` | Wallet + Kite Passport — connect, create sessions, spend policy |
| `/attestations` | On-chain proof explorer — filter by type, Passport-only toggle |
| `/providers` | Service onboarding — x402 schema, code examples, live verification |

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/agent` | Execute agent task — streams SSE events |
| `GET` | `/api/agent/balance` | Live KITE + USDT balance from Kite testnet |
| `GET/DELETE` | `/api/runs` | All runs + stats / clear all |
| `GET/DELETE` | `/api/runs/:id` | Single run / delete |
| `GET` | `/api/runs/stats` | Aggregate stats including Passport breakdown |
| `GET` | `/api/history` | Payment ledger with Passport vs local summary |
| `GET` | `/api/history/export` | CSV download — includes `origin` and `sessionId` columns |
| `GET` | `/api/attestations` | Attestation timeline — supports `?type=` and `?passport=true` |
| `GET` | `/api/services` | Service registry with category + text filtering |
| `GET` | `/api/search?q=` | Full-text search across runs, payments, attestations, and sessions |
| `GET` | `/api/health` | Health check — persistence mode, uptime, run stats |
| `GET/POST/PATCH` | `/api/providers` | Service registration with live x402 probe |
| `GET` | `/api/passport/status` | Passport connection + sessions snapshot |
| `POST` | `/api/passport/connect` | Signup / login / disconnect |
| `GET/POST` | `/api/passport/sessions` | List / create spending sessions |
| `GET/DELETE` | `/api/passport/sessions/:id` | Session detail / revoke |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| `AGENT_PRIVATE_KEY` | No | Kite testnet wallet private key. Ephemeral if absent. Fund at [faucet.gokite.ai](https://faucet.gokite.ai) |
| `KITE_PASSPORT_BASE_URL` | No | Passport API base URL. Unset → simulate mode |
| `KITE_PASSPORT_API_KEY` | No | Passport API key from [agentpassport.ai](https://agentpassport.ai) |
| `KITE_PASSPORT_SESSION_ID` | No | CLI only — pin agent runs to a specific session |
| `NEXUM_DATA_DIR` | No | Path for file-based JSON store. Default: `apps/web/.nexum-data` |
| `NEXUM_PERSIST` | No | Set to `false` to disable file persistence (use on Vercel) |

---

## Kite Agent Passport — Simulate vs Live

### Simulate mode (default, no signup needed)

When `KITE_PASSPORT_BASE_URL` and `KITE_PASSPORT_API_KEY` are unset, Nexum runs in **simulate mode**. Sessions auto-approve after 1.2 seconds, payments generate synthetic tx hashes, and the full UI — Passport banner, session list, ⛨ badges, stacked spend chart — is populated from demo data. This is the right starting point for development and demos.

### Live mode

Set both Passport env vars and restart. The signup flow sends a real verification email; session creation triggers a passkey prompt on `agentpassport.ai`; payments settle against a real AA wallet on Kite chain.

> **Note on Passport REST endpoints:** The `packages/passport` client targets inferred endpoints from the `kpass` CLI surface. Kite's public REST spec was not published at time of writing. Each endpoint is marked `// TODO(passport-api): confirm` — update the path strings in `packages/passport/src/index.ts` once the spec is available.

---

## Persistence

Nexum uses a **file-based JSON store** by default. All runs, payments, attestations, and Passport sessions persist to `.nexum-data/` in the web app directory and survive server restarts.

```
apps/web/.nexum-data/
├── runs.json          # All agent runs (capped at 100)
├── passport.json      # Kite Passport connection + sessions
└── registrations.json # Provider registrations
```

Writes are **debounced and atomic** (write-temp → rename) — a crash mid-write cannot corrupt the store.

**On Vercel / serverless:** The filesystem is ephemeral per-invocation. Set `NEXUM_PERSIST=false` (or just leave the Vercel env without `NEXUM_DATA_DIR`) and the store falls back to in-memory. For production Vercel deployments, replace the store interface with Vercel KV or Upstash Redis — the interface (`get`, `upsert`, `addPayment`, `stats`) is a clean abstraction boundary.

The `.nexum-data/` directory is gitignored.

### Abandoned-run reaper

Any run left in `"running"` status — by a crash, server restart, or client disconnect — is marked `"error"` on the next read of `/api/runs`. The reaper threshold is 5 minutes. If the client disconnects mid-stream, the SSE `cancel()` handler marks the run immediately.

---

## Deploy

### Vercel (recommended for demos)

```bash
cd apps/web
vercel --prod
```

Add `ANTHROPIC_API_KEY` in the Vercel project settings. The app runs in simulate mode with in-memory persistence — demo data reappears on each cold start.

### Self-hosted server (recommended for persistent data)

```bash
npm run build
npm run start     # or: cd apps/web && npm start
```

File-based persistence is active by default. Data survives restarts in `.nexum-data/`.

---

## Kite Chain Reference

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 2368 | 2366 |
| RPC | `https://rpc-testnet.gokite.ai/` | `https://rpc.gokite.ai/` |
| Explorer | `https://testnet.kitescan.ai` | `https://kitescan.ai` |
| Faucet | `https://faucet.gokite.ai` | — |
| USDT | `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63` | — |
| x402 service | `https://x402.dev.gokite.ai/api/weather` | — |

---

## Shared Packages

### `@nexum/types`
All shared TypeScript interfaces: `AgentIdentity` (including optional `passport` block), `ServiceListing`, `PaymentRecord` (with `origin`, `sessionId`), `Attestation`, `SpendingPolicy`, `BudgetState`, `AgentRun`, `AgentEvent`, `KitePassport`, `PassportSession`, and more.

### `@nexum/kite`
Kite chain SDK wrapping ethers.js v6: `getProvider`, `getWallet`, `writeAttestation`, `checkBudget`, `buildPaymentRecord`, `hashContent`, `addressUrl`.

### `@nexum/x402`
x402 protocol handler: `probeService`, `createAuthorization`, `callWithPayment`, `settleViaFacilitator`, `executeX402Flow`.

### `@nexum/passport`
Kite Agent Passport HTTP client with full simulate mode. Auth, agent registration, session lifecycle, and paid execution — all behind a single `PassportClient` class.

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Install: `npm install`
4. Make changes — run `npx tsc --noEmit` in `apps/web` and `apps/agent` to typecheck
5. Open a pull request

---

## Resources

- [Kite AI Docs](https://docs.gokite.ai)
- [Kite Agent Passport](https://docs.gokite.ai/kite-agent-passport/developer-guide)
- [Kite Testnet Explorer](https://testnet.kitescan.ai)
- [Testnet Faucet](https://faucet.gokite.ai)
- [x402 Protocol](https://docs.x402.org)
- [Pieverse Facilitator](https://facilitator.pieverse.io)

---

## License

MIT © 2025 Nexum
