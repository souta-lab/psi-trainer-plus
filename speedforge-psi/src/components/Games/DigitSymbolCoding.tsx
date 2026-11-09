import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameProps } from './types';
import { playSound } from '../../utils/audio';
import { gameDifficulty } from '../../utils/engine';
import GameShell from './GameShell';

// All symbols pool
const ALL_SYMBOLS = ['★', '◆', '♥', '♣', '♠', '♦', '▲', '▼', '●', '■', '✦', '❋', '⬟', '⬠', '⬡'];
const MAX_TRIALS = 15;

type Pair = { digit: number; symbol: string };
type Flash = 'none' | 'ok' | 'err';

function buildRandomMapping(numPairs: number): Pair[] {
    const allDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffledDigits = [...allDigits].sort(() => Math.random() - 0.5).slice(0, numPairs);
    const shuffledSymbols = [...ALL_SYMBOLS].sort(() => Math.random() - 0.5).slice(0, numPairs);
    // Pair them, then shuffle display order
    const pairs: Pair[] = shuffledDigits.map((d, i) => ({ digit: d, symbol: shuffledSymbols[i] }));
    return pairs.sort(() => Math.random() - 0.5);
}

export default function DigitSymbolCoding({ level, onFinish, onLevelChange }: GameProps) {
    // numPairs: 3 (d=0) → 9 (d=1) continuously
    const numPairs = Math.round(gameDifficulty(level, 3, 9));

    const [mapping, setMapping] = useState<Pair[]>(() => buildRandomMapping(numPairs));
    const [currentPair, setCurrentPair] = useState<Pair>(() => {
        const m = buildRandomMapping(numPairs);
        return m[Math.floor(Math.random() * m.length)];
    });
    const [options, setOptions] = useState<string[]>([]);
    const [locked, setLocked] = useState(false);
    const [flash, setFlash] = useState<Flash>('none');
    const [trialCount, setTrialCount] = useState(0);

    const trialsRef = useRef(0);
    const correctRef = useRef(0);
    const rtSumRef = useRef(0);
    const startTimeRef = useRef(performance.now());
    const finishedRef = useRef(false);
    const currentPairRef = useRef(currentPair);

    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onFinish({
            accuracy: trialsRef.current > 0 ? correctRef.current / trialsRef.current : 0,
            avgRT: correctRef.current > 0 ? rtSumRef.current / correctRef.current : 500,
            totalTrials: trialsRef.current,
        });
    }, [onFinish]);

    const buildTrial = useCallback(() => {
        if (finishedRef.current) return;
        // Completely new mapping each trial — randomize everything
        const newMapping = buildRandomMapping(numPairs);
        // Target is always one of the new mapping pairs
        const target = newMapping[Math.floor(Math.random() * newMapping.length)];
        currentPairRef.current = target;
        // Options: all symbols from mapping, shuffled
        const optionSymbols = [...newMapping.map(m => m.symbol)].sort(() => Math.random() - 0.5);
        setMapping(newMapping);
        setCurrentPair(target);
        setOptions(optionSymbols);
        setLocked(false);
        setFlash('none');
        startTimeRef.current = performance.now();
    }, [numPairs]);

    useEffect(() => {
        // Init options on mount
        const m = mapping;
        const init = [...m.map(x => x.symbol)].sort(() => Math.random() - 0.5);
        setOptions(init);
        // Make sure currentPair is from this initial mapping 
        const target = m[Math.floor(Math.random() * m.length)];
        currentPairRef.current = target;
        setCurrentPair(target);
        startTimeRef.current = performance.now();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTap = (symbol: string) => {
        if (locked || finishedRef.current) return;
        setLocked(true);

        const rt = performance.now() - startTimeRef.current;
        const isCorrect = symbol === currentPairRef.current.symbol;

        if (isCorrect) {
            playSound('correct');
            correctRef.current++;
            rtSumRef.current += rt;
            setFlash('ok');
        } else {
            playSound('incorrect');
            setFlash('err');
        }

        if (onLevelChange) onLevelChange(isCorrect);
        trialsRef.current++;
        setTrialCount(trialsRef.current);

        if (trialsRef.current >= MAX_TRIALS) {
            setTimeout(finish, 350);
        } else {
            setTimeout(buildTrial, 350);
        }
    };

    const flashColor = flash === 'ok' ? '#3b82f6' : flash === 'err' ? '#ef4444' : '#fff';

    return (
        <GameShell
            title="数字符号変換エンジン" emoji="🔢"
            instruction="上の対応表を見て、表示数字の記号をタップ"
            trial={trialCount} maxTrials={MAX_TRIALS} accent="#3b82f6"
        >
            <div className="w-full flex flex-col items-center p-4 gap-4 justify-center min-h-0 overflow-y-auto no-scrollbar">
                {/* Reference key table */}
                <div
                    className="w-full p-3 flex flex-wrap justify-center gap-2 shrink-0"
                    style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}
                >
                    {mapping.map((m, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center px-3 py-2"
                            style={{ background: '#111', border: '1px solid #222', minWidth: '2.6rem' }}
                        >
                            <span className="font-black" style={{ fontSize: '1rem', color: '#666' }}>{m.digit}</span>
                            <span style={{ fontSize: '1.4rem', color: '#999', lineHeight: 1.2, marginTop: '2px' }}>{m.symbol}</span>
                        </div>
                    ))}
                </div>

                {/* Target digit */}
                <div className="flex flex-col items-center shrink-0">
                    <span style={{ fontSize: '0.55rem', color: '#555', fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'monospace', marginBottom: '4px' }}>
                        ― この数字の記号は? ―
                    </span>
                    <div style={{ fontSize: 'min(22vw, 110px)', fontWeight: 900, color: flashColor, transition: 'color 0.15s', lineHeight: 1 }}>
                        {currentPair.digit}
                    </div>
                </div>

                {/* Response buttons */}
                <div className="w-full flex flex-wrap justify-center gap-2 shrink-0">
                    {options.map((sym, i) => (
                        <button
                            key={i}
                            onClick={() => handleTap(sym)}
                            disabled={locked}
                            style={{
                                flex: '1 1 3.5rem', maxWidth: '4.5rem', aspectRatio: '1',
                                background: '#111', border: '2px solid #222', borderRadius: '0.75rem',
                                fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: locked ? 0.5 : 1, transition: 'all 0.1s',
                            }}
                            className="active:scale-90 touch-manipulation hover:border-blue-500"
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            </div>
        </GameShell>
    );
}
