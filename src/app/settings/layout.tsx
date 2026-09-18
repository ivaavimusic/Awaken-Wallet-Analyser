import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Settings | OpenPort',
    description:
        'Manage your saved wallets, RPC endpoints and optional Alchemy key. Everything is stored in your own browser.',
    // Personal configuration screen — nothing here is useful in search results.
    robots: { index: false, follow: true },
};

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
