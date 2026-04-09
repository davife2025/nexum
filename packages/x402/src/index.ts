// ─────────────────────────────────────────────────────────────────────────────
// @nexum/x402 — x402 Payment Protocol
// HTTP 402 Payment Required handling for autonomous agent commerce
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import type { X402Requirement, X402Authorization } from "@nexum/types";

export type { X402Requirement, X402Authorization };

// ── Constants ─────────────────────────────────────────────────────────────────

export const PIEVERSE_FACILITATOR = "https://facilitator.pieverse.io";
export const KITE_TESTNET_USDT = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";

// ── Service Discovery & 402 Detection ────────────────────────────────────────

export interface ProbeResult {
  needs402: boolean;
  requirement?: X402Requirement;
  data?: unknown;
  httpStatus?: number;
  error?: string;
}

/**
 * Probe a service endpoint — detect if it requires x402 payment.
 * Returns payment requirements on 402, or data on success.
 */
export async function probeService(
  url: string,
  params: Record<string, string> = {},
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<ProbeResult> {
  try {
    const target = new URL(url);
    if (method === "GET") {
      Object.entries(params).forEach(([k, v]) => target.searchParams.set(k, v));
    }

    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    };
    if (method === "POST" && body) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(target.toString(), init);

    if (res.status === 402) {
      const json = await res.json();
      const req = Array.isArray(json.accepts)
        ? (json.accepts[0] as X402Requirement)
        : undefined;
      return { needs402: true, requirement: req, httpStatus: 402 };
    }

    if (!res.ok) {
      const text = await res.text();
      return {
        needs402: false,
        httpStatus: res.status,
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    return { needs402: false, data: await res.json(), httpStatus: res.status };
  } catch (err: unknown) {
    return {
      needs402: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Payment Authorization ─────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  xPayment?: string;       // base64-encoded payment token for X-Payment header
  authorization?: X402Authorization;
  signature?: string;
  amountDisplay?: string;
  error?: string;
}

/**
 * Create a signed x402 payment authorization.
 * In production: called via Kite MCP `approve_payment` tool.
 * Here: direct EVM wallet signing for demo autonomy.
 */
export async function createAuthorization(
  wallet: ethers.Wallet,
  req: X402Requirement
): Promise<AuthResult> {
  try {
    const now = Math.floor(Date.now() / 1000);

    const authorization: X402Authorization = {
      from: wallet.address,
      to: req.payTo,
      value: req.maxAmountRequired,
      validAfter: String(now - 30),
      validBefore: String(now + req.maxTimeoutSeconds),
      nonce: ethers.hexlify(ethers.randomBytes(32)),
      asset: req.asset,
      network: req.network,
    };

    // Sign a structured hash of the authorization
    const messageHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(authorization))
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    const payload = {
      scheme: req.scheme,
      network: req.network,
      authorization,
      signature,
      x402Version: 1,
    };

    const xPayment = Buffer.from(JSON.stringify(payload)).toString("base64");
    const decimals = req.asset === KITE_TESTNET_USDT ? 6 : 18;

    return {
      success: true,
      xPayment,
      authorization,
      signature,
      amountDisplay: `${Number(ethers.formatUnits(req.maxAmountRequired, decimals)).toFixed(6)} ${decimals === 6 ? "USDT" : "KITE"}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Paid Service Call ─────────────────────────────────────────────────────────

export interface PaidCallResult {
  success: boolean;
  data?: unknown;
  httpStatus?: number;
  error?: string;
}

/**
 * Call a service with the X-Payment header attached.
 */
export async function callWithPayment(
  url: string,
  xPayment: string,
  params: Record<string, string> = {},
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<PaidCallResult> {
  try {
    const target = new URL(url);
    if (method === "GET") {
      Object.entries(params).forEach(([k, v]) => target.searchParams.set(k, v));
    }

    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Payment": xPayment,
      },
      signal: AbortSignal.timeout(15_000),
    };
    if (method === "POST" && body) init.body = JSON.stringify(body);

    const res = await fetch(target.toString(), init);

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        httpStatus: res.status,
        error: `HTTP ${res.status}: ${text.slice(0, 300)}`,
      };
    }

    return { success: true, data: await res.json(), httpStatus: res.status };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Facilitator Settlement ────────────────────────────────────────────────────

export interface SettleResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Submit to Pieverse facilitator to execute on-chain transfer on Kite.
 */
export async function settleViaFacilitator(
  xPayment: string,
  network = "kite-testnet"
): Promise<SettleResult> {
  try {
    const res = await fetch(`${PIEVERSE_FACILITATOR}/v2/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xPayment, network }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Facilitator ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = await res.json();
    return { success: true, txHash: json.txHash };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Full x402 flow: probe → authorize → call → settle.
 * Returns settled result or error at each stage.
 */
export async function executeX402Flow(
  wallet: ethers.Wallet,
  url: string,
  params: Record<string, string> = {}
): Promise<{
  probe: ProbeResult;
  auth?: AuthResult;
  call?: PaidCallResult;
  settle?: SettleResult;
  error?: string;
}> {
  // 1. Probe
  const probe = await probeService(url, params);
  if (!probe.needs402) {
    if (probe.data) return { probe }; // already accessible
    return { probe, error: probe.error ?? "Service unavailable" };
  }
  if (!probe.requirement) {
    return { probe, error: "402 received but no payment requirement found" };
  }

  // 2. Authorize
  const auth = await createAuthorization(wallet, probe.requirement);
  if (!auth.success || !auth.xPayment) {
    return { probe, auth, error: auth.error ?? "Authorization failed" };
  }

  // 3. Call with payment
  const call = await callWithPayment(url, auth.xPayment, params);

  // 4. Settle (best-effort)
  const settle = await settleViaFacilitator(auth.xPayment);

  return { probe, auth, call, settle };
}

// ── Service Registry (built-in Kite x402 services) ───────────────────────────

export const KITE_X402_SERVICES = [
  {
    id: "kite-weather",
    name: "Kite Weather API",
    description: "Real-time weather data for any city, paid per query",
    endpoint: "https://x402.dev.gokite.ai/api/weather",
    category: "data" as const,
    billingModel: "per-call" as const,
    priceDisplay: "~1 KITE / call",
    params: { location: "San Francisco" },
    tags: ["weather", "real-time", "live"],
  },
] as const;
