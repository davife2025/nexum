// ─────────────────────────────────────────────────────────────────────────────
// Passport state store (server-side)
//
// Holds the connection + sessions for the current Nexum instance.
// In production: persist to Postgres or KV — this is in-process only,
// so a server restart wipes it.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  KitePassport,
  PassportSession,
  PaymentRecord,
} from "@nexum/types";
import { getPassportClient, PassportClient } from "@nexum/passport";

interface State {
  connection: KitePassport;
  sessions: Map<string, PassportSession>;
  /** Per-session running totals — display strings */
  spent: Map<string, number>;
  client: PassportClient;
}

const g = globalThis as unknown as { __nexumPassportState?: State };

function init(): State {
  const client = getPassportClient();
  // Bootstrap from env: if a Passport API key is configured at startup,
  // mark the connection as "connected" optimistically. The /status route
  // will refresh from `me()` on first read.
  const hasKey = !!process.env.KITE_PASSPORT_API_KEY;
  return {
    connection: {
      status: hasKey ? "connected" : "disconnected",
    },
    sessions: new Map(),
    spent: new Map(),
    client,
  };
}

if (!g.__nexumPassportState) {
  g.__nexumPassportState = init();
}

const state = g.__nexumPassportState;

// ── Connection ───────────────────────────────────────────────────────────────

export function getConnection(): KitePassport {
  return state.connection;
}

export function setConnection(c: Partial<KitePassport>): KitePassport {
  state.connection = {
    ...state.connection,
    ...c,
    lastSyncedAt: Date.now(),
  };
  return state.connection;
}

export function isConnected(): boolean {
  return state.connection.status === "connected" && !!state.connection.agentId;
}

export function getClient(): PassportClient {
  return state.client;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function upsertSession(s: PassportSession): PassportSession {
  state.sessions.set(s.id, s);
  return s;
}

export function getSession(id: string): PassportSession | undefined {
  return state.sessions.get(id);
}

export function listSessions(): PassportSession[] {
  return Array.from(state.sessions.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function activeSession(): PassportSession | undefined {
  // Most recently-approved active session within budget + TTL.
  const now = Date.now();
  return listSessions().find(
    (s) =>
      s.status === "active" &&
      s.expiresAt > now &&
      parseFloat(s.totalSpent) < parseFloat(s.maxTotalAmount)
  );
}

/**
 * Track local spend on a session. Passport itself is the source of truth,
 * but we mirror per-call so the UI updates without a round trip.
 */
export function recordSpend(sessionId: string, amountDisplay: string): void {
  const s = state.sessions.get(sessionId);
  if (!s) return;
  const num = parseFloat(amountDisplay.split(" ")[0] ?? "0");
  const prev = state.spent.get(sessionId) ?? 0;
  const total = prev + (isNaN(num) ? 0 : num);
  state.spent.set(sessionId, total);
  s.totalSpent = `${total.toFixed(2)} ${s.asset}`;
  s.callCount += 1;
  // Auto-mark exhausted if at/over total cap.
  const cap = parseFloat(s.maxTotalAmount);
  if (!isNaN(cap) && total >= cap) s.status = "exhausted";
  if (s.expiresAt < Date.now()) s.status = "expired";
  state.sessions.set(sessionId, s);
}

/** Promote a pending_approval session to active. Used by sim auto-approve. */
export function markApproved(sessionId: string): PassportSession | undefined {
  const s = state.sessions.get(sessionId);
  if (!s) return;
  s.status = "active";
  s.approvedAt = Date.now();
  state.sessions.set(sessionId, s);
  return s;
}

// ── Annotate a payment record with passport metadata ─────────────────────────

export function tagPayment(
  payment: PaymentRecord,
  sessionId: string
): PaymentRecord {
  return { ...payment, origin: "passport", sessionId };
}
