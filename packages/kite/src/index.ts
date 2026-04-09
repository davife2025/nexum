// ─────────────────────────────────────────────────────────────────────────────
// @nexum/kite — Kite Chain SDK
// EVM-compatible L1 utilities for agentic commerce
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import type {
  Attestation,
  AttestationType,
  AgentIdentity,
  PaymentRecord,
  SpendingPolicy,
} from "@nexum/types";

// ── Network Constants ─────────────────────────────────────────────────────────

export const KITE_NETWORKS = {
  testnet: {
    chainId: 2368,
    name: "KiteAI Testnet",
    rpcUrl: "https://rpc-testnet.gokite.ai/",
    explorerUrl: "https://testnet.kitescan.ai",
    currency: "KITE",
    faucet: "https://faucet.gokite.ai",
  },
  mainnet: {
    chainId: 2366,
    name: "KiteAI Mainnet",
    rpcUrl: "https://rpc.gokite.ai/",
    explorerUrl: "https://kitescan.ai",
    currency: "KITE",
  },
} as const;

// Testnet USDT (Test stablecoin for payments)
export const TESTNET_USDT_ADDRESS = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";

// Kite facilitator
export const KITE_FACILITATOR_ADDRESS = "0x12343e649e6b2b2b77649DFAb88f103c02F3C78b";

// Pieverse facilitator endpoint
export const PIEVERSE_FACILITATOR_URL = "https://facilitator.pieverse.io";

// x402 demo service
export const KITE_X402_WEATHER_URL = "https://x402.dev.gokite.ai/api/weather";

// ── Provider & Wallet ─────────────────────────────────────────────────────────

export type KiteNetwork = "testnet" | "mainnet";

export function getProvider(network: KiteNetwork = "testnet"): ethers.JsonRpcProvider {
  const cfg = KITE_NETWORKS[network];
  return new ethers.JsonRpcProvider(cfg.rpcUrl, {
    chainId: cfg.chainId,
    name: cfg.name,
  });
}

export function getWallet(
  provider: ethers.Provider,
  privateKey?: string
): ethers.Wallet {
  if (privateKey) {
    return new ethers.Wallet(privateKey, provider);
  }
  return ethers.Wallet.createRandom().connect(provider);
}

export function buildAgentIdentity(
  wallet: ethers.Wallet,
  name = "nexum-agent",
  network: KiteNetwork = "testnet"
): AgentIdentity {
  return {
    id: `agent_${wallet.address.slice(2, 10).toLowerCase()}`,
    name,
    address: wallet.address,
    network: `kite-${network}` as AgentIdentity["network"],
    createdAt: Date.now(),
  };
}

// ── Explorer URLs ─────────────────────────────────────────────────────────────

export function txUrl(txHash: string, network: KiteNetwork = "testnet"): string {
  return `${KITE_NETWORKS[network].explorerUrl}/tx/${txHash}`;
}

export function addressUrl(address: string, network: KiteNetwork = "testnet"): string {
  return `${KITE_NETWORKS[network].explorerUrl}/address/${address}`;
}

// ── Content Hashing ───────────────────────────────────────────────────────────

export function hashContent(content: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(content));
}

export function buildAttestationPayload(params: {
  runId: string;
  type: AttestationType;
  contentHash: string;
  metadata?: string;
  agentAddress: string;
}): string {
  return JSON.stringify({
    v: 1,
    app: "nexum",
    chain: "kite-testnet",
    ...params,
    ts: Math.floor(Date.now() / 1000),
  });
}

// ── On-Chain Attestation ──────────────────────────────────────────────────────

export async function writeAttestation(
  wallet: ethers.Wallet,
  params: {
    runId: string;
    type: AttestationType;
    contentHash: string;
    metadata?: string;
  },
  network: KiteNetwork = "testnet"
): Promise<Attestation> {
  const id = `attest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = Date.now();

  const payload = buildAttestationPayload({
    ...params,
    agentAddress: wallet.address,
  });

  try {
    // Check balance
    const provider = wallet.provider!;
    const balance = await provider.getBalance(wallet.address);

    if (balance === 0n) {
      // Simulate — deterministic hash for reproducible demo
      const simHash =
        "0x" +
        Buffer.from(payload)
          .toString("hex")
          .slice(0, 62)
          .padStart(62, "0") + "00";

      return {
        id,
        runId: params.runId,
        type: params.type,
        contentHash: params.contentHash,
        metadata: params.metadata,
        txHash: simHash,
        explorerUrl: txUrl(simHash, network),
        timestamp,
        status: "simulated",
      };
    }

    // Real transaction
    const data = ethers.hexlify(ethers.toUtf8Bytes(payload));
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data,
      gasLimit: 150_000n,
    });

    await tx.wait();

    return {
      id,
      runId: params.runId,
      type: params.type,
      contentHash: params.contentHash,
      metadata: params.metadata,
      txHash: tx.hash,
      explorerUrl: txUrl(tx.hash, network),
      timestamp,
      status: "confirmed",
    };
  } catch (err) {
    console.error("[kite] attestation error:", err);
    const errHash = "0x" + hashContent(payload + "error").slice(2, 66);
    return {
      id,
      runId: params.runId,
      type: params.type,
      contentHash: params.contentHash,
      metadata: params.metadata,
      txHash: errHash,
      explorerUrl: txUrl(errHash, network),
      timestamp,
      status: "simulated",
    };
  }
}

// ── Budget Enforcement ────────────────────────────────────────────────────────

export function checkBudget(
  policy: SpendingPolicy,
  spentToday: string,
  spentThisMonth: string,
  requestAmount: string
): { allowed: boolean; reason?: string } {
  const req = BigInt(requestAmount);
  const perCallMax = BigInt(policy.maxPerCall);
  const dayMax = BigInt(policy.maxPerDay);
  const monthMax = BigInt(policy.maxPerMonth);
  const daySpent = BigInt(spentToday);
  const monthSpent = BigInt(spentThisMonth);

  if (req > perCallMax) {
    return {
      allowed: false,
      reason: `Amount ${requestAmount} exceeds per-call limit ${policy.maxPerCall}`,
    };
  }
  if (daySpent + req > dayMax) {
    return {
      allowed: false,
      reason: `Would exceed daily budget (${spentToday} + ${requestAmount} > ${policy.maxPerDay})`,
    };
  }
  if (monthSpent + req > monthMax) {
    return {
      allowed: false,
      reason: `Would exceed monthly budget`,
    };
  }
  return { allowed: true };
}

// ── USDT Token ABI (minimal ERC-20 for balance checks) ────────────────────────

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
] as const;

export async function getTokenBalance(
  provider: ethers.Provider,
  tokenAddress: string,
  walletAddress: string
): Promise<{ raw: bigint; formatted: string; symbol: string }> {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [raw, decimals, symbol] = await Promise.all([
      contract.balanceOf(walletAddress) as Promise<bigint>,
      contract.decimals() as Promise<number>,
      contract.symbol() as Promise<string>,
    ]);
    return {
      raw,
      formatted: ethers.formatUnits(raw, decimals),
      symbol,
    };
  } catch {
    return { raw: 0n, formatted: "0.00", symbol: "USDT" };
  }
}

// ── Payment Settlement Tracking ───────────────────────────────────────────────

export function buildPaymentRecord(params: {
  runId: string;
  serviceId: string;
  serviceName: string;
  amount: string;
  decimals?: number;
  token?: string;
  payTo: string;
  txHash?: string;
  explorerUrl?: string;
}): PaymentRecord {
  const decimals = params.decimals ?? 18;
  return {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    runId: params.runId,
    serviceId: params.serviceId,
    serviceName: params.serviceName,
    amount: params.amount,
    amountDisplay: `${Number(ethers.formatUnits(params.amount, decimals)).toFixed(4)} ${params.token ?? "KITE"}`,
    token: params.token ?? "KITE",
    payTo: params.payTo,
    txHash: params.txHash,
    explorerUrl: params.explorerUrl,
    status: params.txHash ? "settled" : "authorized",
    timestamp: Date.now(),
  };
}
