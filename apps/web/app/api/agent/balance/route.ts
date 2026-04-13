import { NextResponse } from "next/server";
import { getProvider, getWallet } from "@nexum/kite";
import { ethers } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const provider = getProvider("testnet");
    const wallet = getWallet(provider, process.env.AGENT_PRIVATE_KEY);

    const [nativeBalance, chainId] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getNetwork().then((n) => n.chainId),
    ]);

    // Try to get USDT balance (testnet token)
    let usdtBalance = "0.00";
    try {
      const erc20 = new ethers.Contract(
        "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
        ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
        provider
      );
      const [raw, dec] = await Promise.all([
        erc20.balanceOf(wallet.address) as Promise<bigint>,
        erc20.decimals() as Promise<number>,
      ]);
      usdtBalance = parseFloat(ethers.formatUnits(raw, dec)).toFixed(4);
    } catch {
      // Token contract may not exist on testnet — safe to ignore
    }

    return NextResponse.json({
      address: wallet.address,
      kite: parseFloat(ethers.formatEther(nativeBalance)).toFixed(6),
      usdt: usdtBalance,
      chainId: chainId.toString(),
      network: "kite-testnet",
      explorerUrl: `https://testnet.kitescan.ai/address/${wallet.address}`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "RPC error", kite: "0.000000", usdt: "0.00" },
      { status: 500 }
    );
  }
}
