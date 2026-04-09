import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexum — Agentic Commerce on Kite Chain",
  description:
    "Autonomous AI agents that discover services, execute USDC payments via x402, manage subscriptions, and settle on Kite — the first AI payment blockchain.",
  openGraph: {
    title: "Nexum",
    description: "Agentic Commerce on Kite Chain",
    siteName: "Nexum",
  },
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
        {children}
      </body>
    </html>
  );
}
