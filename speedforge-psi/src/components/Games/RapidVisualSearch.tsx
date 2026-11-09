import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameProps } from './types';
import { playSound } from '../../utils/audio';
import { gameDifficulty } from '../../utils/engine';
import GameShell from './GameShell';

// Visually similar character sets for pop-out difficulty
const DISTRACTOR_SETS = [
    ['O', '0', 'Q', 'G', 'C'],
    ['I', 'l', '1', 'T', 'L'],
    ['B', '8', '6', 'S', '5'],
    ['V', 'W', 'U', 'N', 'M'],
    ['H', 'K', 'X', 'Y', 'Z'],
    ['D', 'O', 'P', 'R', 'F'],
];

const MAX_TRIALS = 10;

interface Item { id: number; symbol: string; isTarget: boolean; }

export default function RapidVisualSearch({ level, onFinish, onLevelChange }: GameProps) {
    const [target, setTarget] = useState('');
    const [grid, setGrid] = useState<Item[]>([]);
    const [locked, setLocked] = useState(false);
    const [flashItem, setFlashItem] = useState<number | null>(null);
    const [flashOk, setFlashOk] = useState(false);
    const [trialCount, setTrialCount] = useState(0);

    const trialsRef = useRef(0);
    const correctRef = useRef(0);
    const rtSumRef = useRef(0);
    const startTimeRef = useRef(0);
    const finishedRef = useRef(false);
    const targetRef = useRef('');

    // Item count: 15 (d=0) → 45 (d=1) continuously
    const numItems = Math.round(gameDifficulty(level, 15, 45));
    const cols = Math.min(8, Math.ceil(Math.sqrt(numItems * 1.3)));

    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onFinish({
            accuracy: trialsRef.current > 0 ? correctRef.current / trialsRef.current : 0,
            avgRT: correctRef.current > 0 ? rtSumRef.current / correctRef.current : 1000,
            totalTrials: trialsRef.current,
        });
    }, [onFinish]);

    const generateTrial = useCallback(() => {
        if (finishedRef.current) return;
        const setIdx = Math.floor(Math.random() * DISTRACTOR_SETS.length);
        const chosenSet = DISTRACTOR_SETS[setIdx];
        const tgtIdx = Math.floor(Math.random() * chosenSet.length);
        const newTarget = chosenSet[tgtIdx];
        const distractors = chosenSet.filter((_, i) => i !== tgtIdx);
        targetRef.current = newTarget;
        const targetPos = Math.floor(Math.random() * numItems);
        const items: Item[] = [];
        for (let i = 0; i < numItems; i++) {
            if (i === targetPos) {
                items.push({ id: i, symbol: newTarget, isTarget: true });
            } else {
                items.push({ id: i, symbol: distractors[Math.floor(Math.random() * distractors.length)], isTarget: false });
            }
        }
        setTarget(newTarget);
        setGrid(items);
        setLocked(false);
        setFlashItem(null);
        setTrialCount(trialsRef.current);
        startTimeRef.current = performance.now();
    }, [numItems]);

    useEffect(() => { generateTrial(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleTap = (item: Item) => {
        if (locked || finishedRef.current) return;
        setLocked(true);
        const rt = performance.now() - startTimeRef.current;
        setFlashItem(item.id);
        setFlashOk(item.isTarget);
        if (item.isTarget) { playSound('correct'); correctRef.current++; rtSumRef.current += rt; }
        else { playSound('incorrect'); }
        if (onLevelChange) onLevelChange(item.isTarget);
        trialsRef.current++;
        setTrialCount(trialsRef.current);
        if (trialsRef.current >= MAX_TRIALS) setTimeout(finish, 350);
        else setTimeout(generateTrial, 350);
    };

    // Cell size depends on cols and screen
    const cellPx = Math.min(48, Math.floor((Math.min(window.innerWidth, 600) - 24) / cols));

    return (
        <GameShell
            title="高速視覚走査装置" emoji="👁️"
            instruction={`標的「${target}」をグリッドから探してタップ`}
            trial={trialCount} maxTrials={MAX_TRIALS} accent="#a855f7"
        >
            {/* Grid */}
            <div className="flex-1 overflow-y-auto flex items-center justify-center w-full">
                <div
                    className="mx-auto py-2"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
                        gap: '4px',
                        width: `${cols * (cellPx + 4)}px`,
                        maxWidth: '100%',
                        paddingLeft: '8px', paddingRight: '8px',
                    }}
                >
                    {grid.map(item => {
                        const isFlashed = flashItem === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTap(item)}
                                disabled={locked}
                                style={{
                                    width: `${cellPx}px`, height: `${cellPx}px`,
                                    background: isFlashed ? (flashOk ? '#0a2010' : '#1a0808') : '#0d0d0d',
                                    border: `1px solid ${isFlashed ? (flashOk ? '#00ffcc' : '#ef4444') : '#1e1e1e'}`,
                                    borderRadius: '6px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: `${Math.max(14, cellPx * 0.52)}px`,
                                    fontFamily: 'monospace', fontWeight: 700,
                                    color: isFlashed ? (flashOk ? '#00ffcc' : '#ef4444') : '#bbb',
                                    transition: 'all 0.1s', flexShrink: 0,
                                }}
                                className="active:scale-90 touch-manipulation"
                            >
                                {item.symbol}
                            </button>
                        );
                    })}
                </div>
            </div>
        </GameShell>
    );
}
