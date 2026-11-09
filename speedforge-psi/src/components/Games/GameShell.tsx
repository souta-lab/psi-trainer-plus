import type { ReactNode } from 'react';

interface GameShellProps {
    /** Name shown at top of game (Japanese compound vocab) */
    title: string;
    emoji: string;
    /** One-line instruction shown below the title */
    instruction: string;
    /** Current trial index (0-based) */
    trial: number;
    /** Maximum number of trials */
    maxTrials: number;
    /** Accent color for this game (optional, defaults to NERV orange) */
    accent?: string;
    children: ReactNode;
}

/**
 * Shared shell for all 6 games.
 * Provides consistent:
 *   — Top bar: game name + trial counter
 *   — Instruction strip
 *   — Main content area (children)
 *   — Bottom progress bar
 */
export default function GameShell({
    title,
    emoji,
    instruction,
    trial,
    maxTrials,
    accent = '#ff6600',
    children,
}: GameShellProps) {
    const progress = maxTrials > 0 ? trial / maxTrials : 0;

    return (
        <div className="flex-1 w-full flex flex-col min-h-0" style={{ background: '#000' }}>

            {/* ── Top bar ───────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 14px 6px',
                borderBottom: '1px solid #0d0d0d',
                flexShrink: 0,
            }}>
                {/* Game title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>{emoji}</span>
                    <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: '#555',
                        fontFamily: 'monospace', letterSpacing: '0.1em',
                    }}>
                        {title}
                    </span>
                </div>
                {/* Trial counter */}
                <span style={{
                    fontSize: '0.55rem', color: '#333', fontFamily: 'monospace',
                    fontWeight: 700, letterSpacing: '0.1em',
                }}>
                    問 {trial} / {maxTrials}
                </span>
            </div>

            {/* ── Instruction strip ─────────────────────────────────── */}
            <div style={{
                padding: '5px 14px 4px',
                borderBottom: '1px solid #080808',
                flexShrink: 0,
                textAlign: 'center',
            }}>
                <span style={{
                    fontSize: '0.65rem', color: '#444',
                    fontWeight: 600, letterSpacing: '0.05em',
                }}>
                    {instruction}
                </span>
            </div>

            {/* ── Main content ──────────────────────────────────────── */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                {children}
            </div>

            {/* ── Bottom progress bar ───────────────────────────────── */}
            <div style={{
                height: '3px', background: '#0d0d0d', flexShrink: 0,
            }}>
                <div style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    background: accent,
                    transition: 'width 0.3s ease',
                    boxShadow: `0 0 8px ${accent}80`,
                }} />
            </div>
        </div>
    );
}
