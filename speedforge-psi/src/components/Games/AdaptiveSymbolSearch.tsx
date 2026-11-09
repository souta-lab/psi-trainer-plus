import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameProps } from './types';
import { playSound } from '../../utils/audio';
import { gameDifficulty } from '../../utils/engine';
import GameShell from './GameShell';

const POOL = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍑', '🥭', '🍍', '🥝', '🍅', '🥑', '🍔', '🍟', '🍕', '🌭', '🍩', '🍪', '🎂', '🧁'];
const MAX_TRIALS = 15;

export default function AdaptiveSymbolSearch({ level, onFinish, onLevelChange }: GameProps) {
    const [target, setTarget] = useState('');
    const [grid, setGrid] = useState<string[]>([]);
    const [locked, setLocked] = useState(false);
    const [flash, setFlash] = useState<'none' | 'ok' | 'err'>('none');
    const [trialCount, setTrialCount] = useState(0);

    const trialsRef = useRef(0);
    const correctRef = useRef(0);
    const rtSumRef = useRef(0);
    const startTimeRef = useRef(0);
    const finishedRef = useRef(false);
    const targetRef = useRef('');

    // Grid size: 3 (d=0) → 6 (d=1)
    const gridSize = Math.round(gameDifficulty(level, 3, 6));
    const totalCells = gridSize * gridSize;

    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onFinish({
            accuracy: trialsRef.current > 0 ? correctRef.current / trialsRef.current : 0,
            avgRT: correctRef.current > 0 ? rtSumRef.current / correctRef.current : 500,
            totalTrials: trialsRef.current,
        });
    }, [onFinish]);

    const generateTrial = useCallback(() => {
        if (finishedRef.current) return;
        const shuffled = [...POOL].sort(() => Math.random() - 0.5);
        const newTarget = shuffled[0];
        targetRef.current = newTarget;
        const newGrid: string[] = [newTarget];
        for (let i = 1; i < totalCells; i++) {
            newGrid.push(shuffled[1 + Math.floor(Math.random() * (shuffled.length - 1))]);
        }
        newGrid.sort(() => Math.random() - 0.5);
        setTarget(newTarget);
        setGrid(newGrid);
        setLocked(false);
        setFlash('none');
        setTrialCount(trialsRef.current);
        startTimeRef.current = performance.now();
    }, [totalCells]);

    useEffect(() => { generateTrial(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleTap = (symbol: string) => {
        if (locked || finishedRef.current) return;
        setLocked(true);
        const rt = performance.now() - startTimeRef.current;
        const isCorrect = symbol === targetRef.current;
        if (isCorrect) { playSound('correct'); correctRef.current++; rtSumRef.current += rt; setFlash('ok'); }
        else { playSound('incorrect'); setFlash('err'); }
        if (onLevelChange) onLevelChange(isCorrect);
        trialsRef.current++;
        setTrialCount(trialsRef.current);
        if (trialsRef.current >= MAX_TRIALS) setTimeout(finish, 280);
        else setTimeout(generateTrial, 280);
    };

    return (
        <GameShell
            title="記号高速探索システム" emoji="🍎"
            instruction="標的絵文字をグリッドから探してタップ"
            trial={trialCount} maxTrials={MAX_TRIALS} accent="#00ffcc"
        >
            {/* Target display */}
            <div
                className="flex items-center gap-3 px-8 py-2 shrink-0 mb-3"
                style={{
                    background: flash === 'ok' ? '#0a2010' : flash === 'err' ? '#1a0808' : '#0d0d0d',
                    border: `1px solid ${flash === 'ok' ? '#00ffcc' : flash === 'err' ? '#ef4444' : '#1e1e1e'}`,
                    borderRadius: '0',
                    transition: 'all 0.15s',
                    boxShadow: flash === 'ok' ? '0 0 20px rgba(0,255,204,0.2)' : flash === 'err' ? '0 0 20px rgba(239,68,68,0.2)' : 'none',
                }}
            >
                <span style={{ fontSize: '0.55rem', color: '#555', fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'monospace' }}>標的</span>
                <span style={{ fontSize: 'min(12vw, 3.5rem)' }}>{target}</span>
            </div>

            {/* Grid */}
            <div
                className="grid shrink-0"
                style={{
                    gap: '6px',
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    width: `min(${gridSize * 68}px, calc(100vw - 2rem))`,
                }}
            >
                {grid.map((symbol, i) => (
                    <button
                        key={i}
                        onClick={() => handleTap(symbol)}
                        disabled={locked}
                        style={{
                            aspectRatio: '1', background: '#111', borderRadius: '0.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: `min(${Math.floor(56 / gridSize)}px, 2.5rem)`,
                            border: '1px solid #1e1e1e', transition: 'all 0.08s',
                            opacity: locked ? 0.5 : 1,
                        }}
                        className="active:scale-90 touch-manipulation hover:border-emerald-500/50"
                    >
                        {symbol}
                    </button>
                ))}
            </div>
        </GameShell>
    );
}
