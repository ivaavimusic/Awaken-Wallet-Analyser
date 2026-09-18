'use client';

import Link from 'next/link';
import { Github, Globe, KeyRound, Lock, Zap } from 'lucide-react';

const REPO = 'https://github.com/ivaavimusic/openport';

const ASSURANCES = [
    { icon: Lock, text: 'Read-only — addresses only, never keys or seed phrases' },
    { icon: KeyRound, text: 'Your data stays in your browser' },
    { icon: Zap, text: 'Runs on public RPCs, no account required' },
];

export function Footer() {
    return (
        <footer className="mt-12 border-t border-border/10">
            <div className="py-8 grid gap-8 md:grid-cols-3">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold tracking-tight">OpenPort</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                            open source
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                        A personal multi-chain portfolio manager. Track what you own
                        across ten networks and export it for tax season.
                    </p>
                </div>

                <div>
                    <h3 className="text-xs font-semibold mb-3">Product</h3>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                        <li>
                            <Link href="/" className="hover:text-foreground transition-colors">
                                Portfolio
                            </Link>
                        </li>
                        <li>
                            <Link href="/tax" className="hover:text-foreground transition-colors">
                                Tax Export
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/settings"
                                className="hover:text-foreground transition-colors"
                            >
                                Settings
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-xs font-semibold mb-3">Your keys, your data</h3>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                        {ASSURANCES.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-start gap-2">
                                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />
                                <span className="leading-snug">{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="py-5 border-t border-border/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/avatar-ivaavimusic.png"
                        alt="ivaavimusic"
                        width={28}
                        height={28}
                        className="rounded-full shrink-0"
                    />
                    <div className="leading-tight">
                        <div>
                            Built by{' '}
                            <a
                                href="https://ehlabs.xyz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-foreground hover:underline"
                            >
                                EventHorizon Labs
                            </a>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                            <a
                                href="https://github.com/ivaavimusic"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                                <Github className="w-3 h-3" />
                                @ivaavimusic
                            </a>
                            <a
                                href="https://info.ivaavi.xyz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                                <Globe className="w-3 h-3" />
                                info.ivaavi.xyz
                            </a>
                            <a
                                href="https://x.com/ivaavimusic"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-3 h-3 fill-current"
                                    aria-hidden
                                >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                @ivaavimusic
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <a
                        href="https://openport.ehlabs.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                    >
                        openport.ehlabs.xyz
                    </a>
                    <span>MIT licensed</span>
                    <a
                        href={REPO}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                        <Github className="w-3.5 h-3.5" />
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
}
