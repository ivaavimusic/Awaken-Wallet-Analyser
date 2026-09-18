import type { Metadata } from 'next';

// The page itself is a client component and cannot export metadata, so it
// lives here in the segment layout.
export const metadata: Metadata = {
    title: 'Crypto Tax Export — Download Wallet History as CSV | OpenPort',
    description:
        'Export any wallet\'s transaction history to CSV for tax filing. Supports Ethereum, Base, Arbitrum, Solana, Hyperliquid, Abstract and more. Free and open source.',
    keywords: [
        'crypto tax export',
        'wallet transaction history CSV',
        'ethereum tax csv',
        'solana tax export',
        'crypto tax report',
        'export wallet transactions',
    ],
    alternates: { canonical: 'https://openport.ehlabs.xyz/tax' },
    openGraph: {
        title: 'Crypto Tax Export — Download Wallet History as CSV',
        description:
            'Export any wallet\'s transaction history to CSV for tax filing, across every supported blockchain.',
        url: 'https://openport.ehlabs.xyz/tax',
        siteName: 'OpenPort',
        type: 'website',
        images: [{ url: '/og.png', width: 1200, height: 630 }],
    },
};

export default function TaxLayout({ children }: { children: React.ReactNode }) {
    return children;
}
