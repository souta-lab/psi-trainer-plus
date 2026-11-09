import { useState } from 'react';
import DoubleDecision from './Games/DoubleDecision';
import AdaptiveSymbolSearch from './Games/AdaptiveSymbolSearch';
import DigitSymbolCoding from './Games/DigitSymbolCoding';
import RapidVisualSearch from './Games/RapidVisualSearch';
import ChoiceReaction from './Games/ChoiceReaction';
import RSVP from './Games/RSVP';
import { AdaptiveEngine } from '../utils/engine';
import type { GameProps } from './Games/types';

// Component type alias
type GameComponent = React.ComponentType<GameProps>;

const GAME_LIST: { id: string; name: string; Component: GameComponent }[] = [
    { id: 'double_decision', name: '🚗 Double Decision', Component: DoubleDecision },
    { id: 'symbol_search', name: '🔍 Symbol Search', Component: AdaptiveSymbolSearch },
    { id: 'digit_symbol', name: '🔢 Digit-Symbol', Component: DigitSymbolCoding },
    { id: 'rapid_search', name: '👁️ Visual Search', Component: RapidVisualSearch },
    { id: 'choice_reaction', name: '🟢 Reaction', Component: ChoiceReaction },
    { id: 'rsvp', name: '⚡ RSVP', Component: RSVP },
];

interface Props {
    onBack: () => void;
}

export default function GameDevMode({ onBack }: Props) {
    const [selectedGame, setSelectedGame] = useState<number | null>(null);
    const [level, setLevel] = useState(3);
    const [key, setKey] = useState(0); // force remount game
    const [lastResult, setLastResult] = useState<{ accuracy: number; avgRT: number; totalTrials: number } | null>(null);
    const [engine] = useState(() => new AdaptiveEngine(3, 1, 15));

    const handleFinish = (result: { accuracy: number; avgRT: number; totalTrials: number }) => {
        setLastResult(result);
        setLevel(engine.getLevel());
    };

    const handleRestart = () => {
        setLastResult(null);
        setKey(k => k + 1);
    };

    if (selectedGame === null) {
        return (
            <div className="flex-1 w-full flex flex-col p-4 gap-4" style={{ background: '#000' }}>
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={onBack}
                        style={{ fontSize: '1.5rem', color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        ←
                    </button>
                    <h1 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>ゲームテスト</h1>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                    <span style={{ color: '#555', fontSize: '0.8rem', fontWeight: 700 }}>START LEVEL: {level}</span>
                    <input
                        type="range" min={1} max={15} value={level}
                        onChange={e => setLevel(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#10b981' }}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    {GAME_LIST.map((g, i) => (
                        <button
                            key={g.id}
                            onClick={() => { setSelectedGame(i); setLastResult(null); setKey(k => k + 1); }}
                            style={{
                                width: '100%', padding: '1.2rem 1.4rem',
                                background: '#0d0d0d', border: '1px solid #1e1e1e',
                                borderRadius: '1rem', textAlign: 'left', cursor: 'pointer',
                                color: '#ccc', fontSize: '1.05rem', fontWeight: 700,
                            }}
                            className="active:scale-98 transition-all hover:border-emerald-500/40"
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const { Component, name } = GAME_LIST[selectedGame];

    if (lastResult) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6" style={{ background: '#000' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{name} 完了</h2>
                <div className="flex gap-3">
                    <div className="flex flex-col items-center p-5 rounded-2xl" style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
                        <span style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Accuracy</span>
                        <span style={{ color: '#3b82f6', fontSize: '2rem', fontWeight: 900 }}>{Math.round(lastResult.accuracy * 100)}%</span>
                    </div>
                    <div className="flex flex-col items-center p-5 rounded-2xl" style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
                        <span style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Avg RT</span>
                        <span style={{ color: '#f59e0b', fontSize: '2rem', fontWeight: 900 }}>{Math.round(lastResult.avgRT)}ms</span>
                    </div>
                    <div className="flex flex-col items-center p-5 rounded-2xl" style={{ background: '#0a1a12', border: '1px solid #10b981' }}>
                        <span style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Level</span>
                        <span style={{ color: '#10b981', fontSize: '2rem', fontWeight: 900 }}>{level}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleRestart} style={{ padding: '0.9rem 2rem', background: '#10b981', color: '#000', fontWeight: 700, borderRadius: '1rem', border: 'none', cursor: 'pointer' }}>
                        もう一回
                    </button>
                    <button onClick={() => setSelectedGame(null)} style={{ padding: '0.9rem 2rem', background: '#111', color: '#aaa', fontWeight: 700, borderRadius: '1rem', border: '1px solid #222', cursor: 'pointer' }}>
                        ゲーム選択
                    </button>
                </div>
                <button onClick={onBack} style={{ color: '#333', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    ← ホームへ
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full flex flex-col" style={{ background: '#000' }}>
            {/* Dev header */}
            <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3" style={{ borderBottom: '1px solid #111' }}>
                <button onClick={() => setSelectedGame(null)} style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                    ←
                </button>
                <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 700 }}>{name}</span>
                <span style={{ marginLeft: 'auto', color: '#333', fontSize: '0.75rem', background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '2px 8px', fontWeight: 700 }}>
                    Lv. {level}
                </span>
            </div>

            {/* The game */}
            <Component
                key={key}
                level={level}
                onFinish={handleFinish}
                onLevelChange={isCorrect => setLevel(engine.recordTrial(isCorrect))}
            />
        </div>
    );
}
