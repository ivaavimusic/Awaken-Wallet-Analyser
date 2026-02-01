import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MegaETH Wallet Analyzer | Awaken Tax Export",
  description: "Analyze your MegaETH wallet transactions and export to Awaken Tax CSV format. Open source, free to use.",
  keywords: ["MegaETH", "wallet", "analyzer", "transactions", "Awaken", "tax", "CSV", "export", "blockchain"],
  authors: [{ name: "Event Horizon Labs" }],
  openGraph: {
    title: "MegaETH Wallet Analyzer",
    description: "Analyze your MegaETH wallet transactions and export to Awaken Tax CSV format.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
