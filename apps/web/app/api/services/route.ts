import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SERVICES = [
  {
    id: "kite-weather",
    name: "Kite Weather API",
    description: "Real-time weather, temperature, humidity and conditions for any global city. Live x402 endpoint on Kite testnet.",
    category: "data",
    billing: "per-call",
    pricePerCall: "1000000000000000000",
    priceDisplay: "~1 KITE / call",
    endpoint: "https://x402.dev.gokite.ai/api/weather",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    network: "kite-testnet",
    tags: ["weather", "real-time", "IoT"],
    uptime: 99.9,
    latency: 200,
    live: true,
  },
  {
    id: "nexum-finance",
    name: "Nexum Finance Oracle",
    description: "DeFi protocol TVL, yield rates, and cross-chain liquidity data. Updated every 60 seconds from on-chain sources.",
    category: "finance",
    billing: "per-call",
    pricePerCall: "5000000000000000000",
    priceDisplay: "~5 KITE / call",
    endpoint: "https://x402.dev.gokite.ai/api/finance",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    network: "kite-testnet",
    tags: ["DeFi", "TVL", "yield"],
    uptime: 99.5,
    latency: 400,
    live: false,
  },
  {
    id: "nexum-ai",
    name: "Nexum AI Inference",
    description: "Pay-per-token LLM inference on Kite chain. Usage-based billing settled on-chain after each call.",
    category: "ai",
    billing: "usage-based",
    pricePerCall: "2000000000000000000",
    priceDisplay: "~2 KITE / 1k tokens",
    endpoint: "https://x402.dev.gokite.ai/api/inference",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    network: "kite-testnet",
    tags: ["LLM", "inference", "compute"],
    uptime: 99.0,
    latency: 800,
    live: false,
  },
  {
    id: "kite-identity",
    name: "Kite Identity Verifier",
    description: "On-chain identity and reputation lookup via Kite Passport. Returns KYC status and agent reputation score.",
    category: "identity",
    billing: "per-call",
    pricePerCall: "500000000000000000",
    priceDisplay: "~0.5 KITE / call",
    endpoint: "https://x402.dev.gokite.ai/api/identity",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    network: "kite-testnet",
    tags: ["KYC", "passport", "reputation"],
    uptime: 99.9,
    latency: 150,
    live: false,
  },
  {
    id: "nexum-compute",
    name: "Decentralised Compute",
    description: "GPU compute units for AI/ML workloads. Billed per minute, settled on Kite chain after each session.",
    category: "compute",
    billing: "usage-based",
    pricePerCall: "10000000000000000000",
    priceDisplay: "~10 KITE / min",
    endpoint: "https://x402.dev.gokite.ai/api/compute",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    network: "kite-testnet",
    tags: ["GPU", "ML", "training"],
    uptime: 98.0,
    latency: 2000,
    live: false,
  },
  {
    id: "nexum-storage",
    name: "Decentralised Storage",
    description: "Encrypted replicated file storage with on-chain access control. Agent can store and retrieve data autonomously.",
    category: "data",
    billing: "usage-based",
    pricePerCall: "100000000000000000",
    priceDisplay: "~0.1 KITE / MB",
    endpoint: "https://x402.dev.gokite.ai/api/storage",
    payTo: "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    network: "kite-testnet",
    tags: ["storage", "IPFS", "encrypted"],
    uptime: 99.7,
    latency: 300,
    live: false,
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.toLowerCase();
  const id = searchParams.get("id");

  let services = [...SERVICES];

  if (id) {
    const found = services.find((s) => s.id === id);
    if (!found) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    return NextResponse.json(found);
  }

  if (category && category !== "all") {
    services = services.filter((s) => s.category === category);
  }

  if (q) {
    services = services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.category.includes(q)
    );
  }

  return NextResponse.json({
    services,
    total: services.length,
    categories: [...new Set(SERVICES.map((s) => s.category))],
  });
}
