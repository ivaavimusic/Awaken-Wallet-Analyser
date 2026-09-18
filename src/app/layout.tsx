import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openport.ehlabs.xyz"),
  title: "OpenPort | Multi-chain portfolio manager",
  description: "Open-source personal portfolio manager for Ethereum, Base, Robinhood Chain, Solana, MegaETH and Keeta. Runs on public RPCs, stores everything in your browser.",
  keywords: ["portfolio", "Ethereum", "Base", "Robinhood Chain", "Solana", "MegaETH", "Keeta", "wallet", "crypto", "tax export", "tax", "CSV"],
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
    title: "OpenPort | Multi-chain portfolio manager",
    description:
      "Track what you own across ten networks. No account, no backend, no API key required.",
    url: "https://openport.ehlabs.xyz",
    siteName: "OpenPort",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "OpenPort — track what you own across ten networks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenPort | Multi-chain portfolio manager",
    description:
      "Track what you own across ten networks. No account, no backend, no API key required.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
