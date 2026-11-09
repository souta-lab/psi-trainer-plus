import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from './types';
import { playSound } from '../../utils/audio';
import { gameDifficulty } from '../../utils/engine';
import GameShell from './GameShell';

type Phase = 'ready' | 'flash' | 'mask' | 'response1' | 'response2';

const VEHICLES = ['🚗', '🚚'];
const TARGET_SIGN = '🛣️';
const DISTRACTOR_SIGNS = ['🅿️', '⛽', '🔧', '🏪', '🏨', '🏦', '🏬', '⚠️'];
const NOISE = ['#', '@', '%', '&', '*', '/', '+', '=', '?', '!'];

// 8 directions — use large clear directional arrows, especially for diagonals

// Big, unambiguous diagonal glyphs using SVG-style arrows (text may be small on some fonts)
// We'll render these in the flash with clear rotations via CSS
const DIR_ARROWS_FLASH = [
    { symbol: '↑', rotation: 0 },
    { symbol: '↑', rotation: 45 },   // NE — rotated
    { symbol: '→', rotation: 0 },
    { symbol: '↓', rotation: -45 },  // SE
    { symbol: '↓', rotation: 0 },
    { symbol: '↓', rotation: 45 },   // SW
    { symbol: '←', rotation: 0 },
    { symbol: '↑', rotation: -45 },  // NW
];

// Mapping: [row][col] → direction index (null = center)
const GRID_DIRS: (number | null)[] = [7, 0, 1, 6, null, 2, 5, 4, 3];

const MAX_TRIALS = 10;

// Build unique distractor positions around the periphery (excluding target direction)
function getDistractorDirs(targetDir: number, count: number, difficulty: number): number[] {
    const all = [0, 1, 2, 3, 4, 5, 6, 7].filter(d => d !== targetDir);
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    // Distractor count: 1 (d=0) → 4 (d=1) continuously
    const n = Math.round(gameDifficulty(difficulty, 1, 4));
    return all.slice(0, Math.min(count, n));
}

export default function DoubleDecision({ level, onFinish, onLevelChange }: GameProps) {
    const [phase, setPhase] = useState<Phase>('ready');
    const [centerVehicle, setCenterVehicle] = useState(0);
    const [targetDir, setTargetDir] = useState(0);
    const [distractorDirs, setDistractorDirs] = useState<number[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);

    const trialsRef = useRef(0);
    const correctRef = useRef(0);
    const rtSumRef = useRef(0);
    const startTimeRef = useRef(0);
    const timerRef = useRef<number | null>(null);
    const finishedRef = useRef(false);
    const centerVehicleRef = useRef(0);
    const targetDirRef = useRef(0);

    // Flash duration: 380ms (d=0) → 100ms (d=1)
    const flashDuration = Math.round(gameDifficulty(level, 380, 100));

    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onFinish({
            accuracy: trialsRef.current > 0 ? correctRef.current / trialsRef.current : 0,
            avgRT: correctRef.current > 0 ? rtSumRef.current / correctRef.current : 500,
            totalTrials: trialsRef.current,
        });
    }, [onFinish]);

    const startTrial = useCallback(() => {
        if (finishedRef.current) return;
        if (trialsRef.current >= MAX_TRIALS) { finish(); return; }

        const newVehicle = Math.random() > 0.5 ? 0 : 1;
        const newDir = Math.floor(Math.random() * 8);
        const distractors = getDistractorDirs(newDir, 4, level);

        centerVehicleRef.current = newVehicle;
        targetDirRef.current = newDir;
        setCenterVehicle(newVehicle);
        setTargetDir(newDir);
        setDistractorDirs(distractors);
        setSelectedVehicle(null);
        setPhase('ready');

        timerRef.current = window.setTimeout(() => {
            setPhase('flash');
            timerRef.current = window.setTimeout(() => {
                setPhase('mask');
                timerRef.current = window.setTimeout(() => {
                    setPhase('response1');
                    startTimeRef.current = performance.now();
                }, 250);
            }, flashDuration);
        }, 700);
    }, [flashDuration, finish, level]);

    useEffect(() => {
        startTrial();
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVehicleSelect = (idx: number) => {
        if (phase !== 'response1') return;
        playSound('tick');
        setSelectedVehicle(idx);
        setPhase('response2');
        startTimeRef.current = performance.now();
    };

    const handleDirSelect = (dirIdx: number) => {
        if (phase !== 'response2' || selectedVehicle === null) return;
        if (timerRef.current) clearTimeout(timerRef.current);

        const rt = performance.now() - startTimeRef.current;
        const isCorrect = selectedVehicle === centerVehicleRef.current && dirIdx === targetDirRef.current;

        if (isCorrect) { playSound('correct'); correctRef.current++; rtSumRef.current += rt; }
        else { playSound('incorrect'); }

        if (onLevelChange) onLevelChange(isCorrect);
        trialsRef.current++;

        if (trialsRef.current >= MAX_TRIALS) finish();
        else timerRef.current = window.setTimeout(startTrial, 350);
    };

    // Peripheral position (absolute % in fixed container)
    const getFlashPos = (dir: number): React.CSSProperties => {
        const positions: React.CSSProperties[] = [
            { top: '2%', left: '50%', transform: 'translate(-50%, 0)' },            // N 0
            { top: '4%', right: '2%' },                                              // NE 1
            { top: '50%', right: '2%', transform: 'translateY(-50%)' },              // E 2
            { bottom: '4%', right: '2%' },                                           // SE 3
            { bottom: '2%', left: '50%', transform: 'translate(-50%, 0)' },          // S 4
            { bottom: '4%', left: '2%' },                                            // SW 5
            { top: '50%', left: '2%', transform: 'translateY(-50%)' },               // W 6
            { top: '4%', left: '2%' },                                               // NW 7
        ];
        return positions[dir];
    };

    // Render a directional arrow using rotation for unambiguous diagonals
    const renderArrow = (dir: number, size: string) => {
        const arrow = DIR_ARROWS_FLASH[dir];
        return (
            <span style={{
                fontSize: size,
                display: 'inline-block',
                transform: `rotate(${arrow.rotation}deg)`,
                lineHeight: 1,
                fontWeight: 900,
            }}>
                {arrow.symbol}
            </span>
        );
    };

    const trialCount = trialsRef.current;

    return (
        <GameShell
            title="瞬間二重判定装置" emoji="🚗"
            instruction="車の種類→道路標識の方向を順番に判定"
            trial={trialCount} maxTrials={MAX_TRIALS} accent="#f59e0b"
        >
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden min-h-0">
                {phase === 'ready' && (
                    <div className="text-5xl" style={{ color: '#333' }}>＋</div>
                )}

                {phase === 'flash' && (
                    <div className="relative w-full" style={{ height: 'min(80vw, 400px)' }}>
                        {/* Center vehicle — large */}
                        <div className="absolute top-1/2 left-1/2" style={{ transform: 'translate(-50%, -50%)', fontSize: 'min(18vw, 100px)' }}>
                            {VEHICLES[centerVehicle]}
                        </div>
                        {/* TARGET sign with clear directional arrow below it */}
                        <div className="absolute flex flex-col items-center gap-0" style={{ fontSize: 'min(9vw, 46px)', ...getFlashPos(targetDir) }}>
                            {TARGET_SIGN}
                            <span style={{ fontSize: 'min(7vw, 34px)', color: '#fff', lineHeight: 1, display: 'inline-block', transform: `rotate(${DIR_ARROWS_FLASH[targetDir].rotation}deg)` }}>
                                {DIR_ARROWS_FLASH[targetDir].symbol}
                            </span>
                        </div>
                        {/* DISTRACTOR signs (different emoji, no directional arrow) */}
                        {distractorDirs.map((dir, i) => (
                            <div key={i} className="absolute" style={{ fontSize: 'min(8vw, 40px)', opacity: 0.75, ...getFlashPos(dir) }}>
                                {DISTRACTOR_SIGNS[i % DISTRACTOR_SIGNS.length]}
                            </div>
                        ))}
                    </div>
                )}

                {phase === 'mask' && (
                    <div className="grid grid-cols-5 gap-6 px-8 opacity-30" style={{ fontSize: '1.4rem', color: '#555' }}>
                        {NOISE.concat(NOISE).map((n, i) => <span key={i}>{n}</span>)}
                    </div>
                )}

                {phase === 'response1' && (
                    <div className="flex flex-col items-center gap-8 p-4 w-full">
                        <h2 className="text-xl font-bold" style={{ color: '#aaa' }}>中央に表示されたのは？</h2>
                        <div className="flex gap-6">
                            {VEHICLES.map((v, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleVehicleSelect(i)}
                                    style={{ fontSize: 'min(18vw, 90px)', padding: '1rem', background: '#111', border: '2px solid #333', borderRadius: '1rem' }}
                                    className="active:scale-90 transition-transform touch-manipulation hover:border-emerald-500"
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {phase === 'response2' && selectedVehicle !== null && (
                    <div className="flex flex-col items-center gap-4 p-4 w-full">
                        <h2 className="text-xl font-bold" style={{ color: '#aaa' }}>🛣️ が出た方向は？</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: 'min(65vw, 260px)', height: 'min(65vw, 260px)' }}>
                            {GRID_DIRS.map((dir, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {dir !== null ? (
                                        <button
                                            onClick={() => handleDirSelect(dir)}
                                            style={{
                                                width: '100%', height: '100%', minWidth: 0,
                                                background: '#111', border: '2px solid #333',
                                                borderRadius: '0.75rem', color: '#ccc',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                            className="active:scale-90 transition-transform touch-manipulation hover:border-emerald-500 hover:text-emerald-400"
                                        >
                                            {renderArrow(dir, 'min(8vw, 2.2rem)')}
                                        </button>
                                    ) : (
                                        <div style={{ fontSize: 'min(8vw, 36px)', pointerEvents: 'none' }}>
                                            {VEHICLES[selectedVehicle]}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </GameShell>
    );
}
