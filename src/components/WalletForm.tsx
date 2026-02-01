'use client';

import { useState } from 'react';
import { isValidAddress } from '@/lib/megaeth';

interface WalletFormProps {
    onSubmit: (address: string) => void;
    loading: boolean;
}

export default function WalletForm({ onSubmit, loading }: WalletFormProps) {
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmedAddress = address.trim();

        if (!trimmedAddress) {
            setError('Please enter a wallet address');
            return;
        }

        if (!isValidAddress(trimmedAddress)) {
            setError('Please enter a valid Ethereum address (0x...)');
            return;
        }

        onSubmit(trimmedAddress);
    };

    return (
        <form onSubmit={handleSubmit} className="wallet-form">
            <div className="input-wrapper">
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter MegaETH wallet address (0x...)"
                    className="wallet-input"
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                />
                <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="loading-spinner" />
                    ) : (
                        <>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <span>Analyze</span>
                        </>
                    )}
                </button>
            </div>
            {error && <p className="error-message">{error}</p>}
        </form>
    );
}
