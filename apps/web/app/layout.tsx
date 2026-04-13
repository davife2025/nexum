import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/Toast";

export const metadata: Metadata = {
  title: { default: "Nexum — Agentic Commerce on Kite Chain", template: "%s | Nexum" },
  description: "Autonomous AI agents that discover services, execute x402 USDC payments, manage subscriptions, and settle every action on Kite — the first AI payment blockchain.",
  keywords: ["AI agents", "Kite chain", "x402", "agentic commerce", "autonomous", "DeFi", "stablecoin", "web3"],
  authors: [{ name: "Nexum" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Nexum — Agentic Commerce on Kite Chain",
    description: "Autonomous agents that discover services, pay via x402, and settle on Kite chain.",
    siteName: "Nexum",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Nexum — Agentic Commerce" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexum — Agentic Commerce on Kite Chain",
    description: "Autonomous agents that discover services, pay via x402, and settle on Kite chain.",
    images: ["/og-image.png"],
  },
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-nx-text font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
