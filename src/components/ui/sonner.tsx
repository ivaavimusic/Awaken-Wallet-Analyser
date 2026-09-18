'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
    // `theme` is the literal string "system" until the user picks one, so the
    // resolved value is what tells us whether to render a light or dark toast.
    const { resolvedTheme } = useTheme();

    return (
        <Sonner
            theme={(resolvedTheme as ToasterProps['theme']) ?? 'light'}
            position="bottom-right"
            closeButton
            richColors={false}
            toastOptions={{
                classNames: {
                    toast: 'bg-card text-card-foreground border border-border/50 shadow-lg',
                    description: 'text-muted-foreground',
                    actionButton: 'bg-primary text-primary-foreground',
                    cancelButton: 'bg-muted text-muted-foreground',
                },
            }}
            {...props}
        />
    );
}
