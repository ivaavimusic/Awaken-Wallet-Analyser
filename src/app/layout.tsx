import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openport.ehlabs.xyz"),
  title: {
    default:
      "OpenPort — Multi-Chain Crypto Portfolio Tracker (Ethereum, Solana, Base)",
    template: "%s",
  },
  description: "Open-source crypto portfolio viewer for Ethereum, Solana, Base, Arbitrum, Hyperliquid, Abstract and more. Runs on public RPCs, stores everything in your browser, and never touches your funds.",
  keywords: [
    "crypto portfolio tracker",
    "multi-chain portfolio",
    "ethereum portfolio tracker",
    "solana portfolio tracker",
    "base portfolio tracker",
    "arbitrum",
    "hyperliquid",
    "robinhood chain",
    "megaeth",
    "blast",
    "keeta",
    "open source portfolio tracker",
    "self-hosted crypto tracker",
    "crypto tax csv export",
    "wallet tracker no signup",
  ],
  applicationName: "OpenPort",
  creator: "EventHorizon Labs",
  publisher: "EventHorizon Labs",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "finance",
  authors: [{ name: "Event Horizon Labs" }],
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico", sizes: "any" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicon_io/site.webmanifest",
  openGraph: {
    title:
      "OpenPort — Multi-Chain Crypto Portfolio Tracker (Ethereum, Solana, Base)",
    description:
      "Track every asset you hold, across every wallet and blockchain you use. No account, no backend, no API key required.",
    url: "https://openport.ehlabs.xyz",
    siteName: "OpenPort",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "OpenPort — every asset, every wallet, every chain, in one place",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "OpenPort — Multi-Chain Crypto Portfolio Tracker (Ethereum, Solana, Base)",
    description:
      "Track every asset you hold, across every wallet and blockchain you use. No account, no backend, no API key required.",
    images: ["/og.png"],
  },
  alternates: { canonical: "https://openport.ehlabs.xyz" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
