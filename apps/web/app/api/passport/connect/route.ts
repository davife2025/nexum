// ─────────────────────────────────────────────────────────────────────────────
// POST /api/passport/connect
//
// Drives the signup / login flow.
//
// Body shape — discriminated by `step`:
//
//   { step: "signup_init",  email }
//     → { signupId, message }
//   { step: "signup_verify", signupId, exchangeToken }
//     → { connection } (now connected)
//
//   { step: "login_init",   email }
//     → { loginId }
//   { step: "login_verify", loginId, code }
//     → { connection }
//
//   { step: "register_agent", type?, name? }
//     → { connection }
//
//   { step: "disconnect" }
//     → { connection: { status: "disconnected" } }
//
// In simulate mode (no KITE_PASSPORT_BASE_URL / KITE_PASSPORT_API_KEY),
// the signup and login flows skip the email round trip — `signup_init`
// returns a signupId that `signup_verify` accepts with any token, so the
// demo experience is one click.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  getClient,
  setConnection,
  getConnection,
} from "@/lib/passport-store";

export const dynamic = "force-dynamic";

interface Body {
  step?: string;
  email?: string;
  signupId?: string;
  exchangeToken?: string;
  loginId?: string;
  code?: string;
  type?: string;
  name?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const client = getClient();

  try {
    switch (body.step) {
      case "signup_init": {
        if (!body.email) {
          return NextResponse.json({ error: "email required" }, { status: 400 });
        }
        const r = await client.signupInit(body.email);
        setConnection({ status: "pending_signup", email: body.email });
        return NextResponse.json({
          signupId: r.signupId,
          message: r.message,
          simulate: client.isSimulated,
        });
      }

      case "signup_verify": {
        if (!body.signupId) {
          return NextResponse.json({ error: "signupId required" }, { status: 400 });
        }
        const r = await client.signupExchange(
          body.signupId,
          body.exchangeToken ?? "sim-token"
        );
        // Auto-register an agent on successful signup so the UI is usable
        // immediately.
        const agent = await client.registerAgent(
          body.type ?? "research-agent",
          body.name ?? "nexum-commerce-agent"
        );
        const connection = setConnection({
          status: "connected",
          agentId: r.agentId ?? agent.agentId,
          walletAddress: r.walletAddress,
          error: undefined,
        });
        return NextResponse.json({ connection });
      }

      case "login_init": {
        if (!body.email) {
          return NextResponse.json({ error: "email required" }, { status: 400 });
        }
        const r = await client.loginInit(body.email);
        setConnection({ status: "pending_login", email: body.email });
        return NextResponse.json({ loginId: r.loginId, simulate: client.isSimulated });
      }

      case "login_verify": {
        if (!body.loginId) {
          return NextResponse.json({ error: "loginId required" }, { status: 400 });
        }
        const r = await client.loginVerify(body.loginId, body.code ?? "000000");
        const me = await client.me();
        const connection = setConnection({
          ...me,
          status: "connected",
          agentId: me.agentId ?? r.agentId,
          walletAddress: me.walletAddress ?? r.walletAddress,
          error: undefined,
        });
        return NextResponse.json({ connection });
      }

      case "register_agent": {
        if (getConnection().status !== "connected") {
          return NextResponse.json(
            { error: "not connected — sign up or log in first" },
            { status: 400 }
          );
        }
        const a = await client.registerAgent(
          body.type ?? "research-agent",
          body.name ?? "nexum-commerce-agent"
        );
        const connection = setConnection({ agentId: a.agentId });
        return NextResponse.json({ connection });
      }

      case "disconnect": {
        const connection = setConnection({
          status: "disconnected",
          email: undefined,
          agentId: undefined,
          walletAddress: undefined,
          usdcBalance: undefined,
          error: undefined,
        });
        return NextResponse.json({ connection });
      }

      default:
        return NextResponse.json(
          { error: `unknown step: ${body.step}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setConnection({ status: "error", error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
