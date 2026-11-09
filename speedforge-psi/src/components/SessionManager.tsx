import { useState, useEffect, useRef } from 'react';
import DoubleDecision from './Games/DoubleDecision';
import AdaptiveSymbolSearch from './Games/AdaptiveSymbolSearch';
import DigitSymbolCoding from './Games/DigitSymbolCoding';
import RapidVisualSearch from './Games/RapidVisualSearch';
import ChoiceReaction from './Games/ChoiceReaction';
import RSVP from './Games/RSVP';
import { AdaptiveEngine, ContinuousAdaptiveEngine, calculatePSI } from '../utils/engine';
import type { GameResult, GameLevelState } from '../utils/storage';
import { t } from '../utils/i18n';
import { playSound } from '../utils/audio';

const GAMES = [
    { id: 'double_decision', Component: DoubleDecision, name: '瞬間二重判定装置', emoji: '🚗' },
    { id: 'symbol_search', Component: AdaptiveSymbolSearch, name: '記号高速探索システム', emoji: '🍎' },
    { id: 'digit_symbol', Component: DigitSymbolCoding, name: '数字符号変換エンジン', emoji: '🔢' },
    { id: 'rapid_search', Component: RapidVisualSearch, name: '高速視覚走査装置', emoji: '👁️' },
    { id: 'choice_reaction', Component: ChoiceReaction, name: '選択反応速度測定器', emoji: '🟢' },
    { id: 'rsvp', Component: RSVP, name: '高速継時視覚提示計', emoji: '⚡' },
];

interface Props {
    onSessionComplete: (results: GameResult[]) => void;
    sessionLength?: number;
    initialLevels?: GameLevelState; // per-game saved difficulty
    onMilestone?: (last6: GameResult[]) => void; // fires every 6 games (for endless mode live stats)
    durationMinutes?: number;
}

// PSI color based on score
function psiColor(psi: number): string {
    if (psi >= 130) return '#00ffcc';
    if (psi >= 110) return '#facc15';
    if (psi >= 90) return '#ff6600';
    if (psi >= 70) return '#ef4444';
    return '#7f1d1d';
}

function psiLabel(psi: number): string {
    if (psi >= 130) return 'RANK-A // 最優秀';
    if (psi >= 110) return 'RANK-B // 優秀';
    if (psi >= 90) return 'RANK-C // 標準';
    if (psi >= 70) return 'RANK-D // 要訓練';
    return 'RANK-E // 初期段階';
}

function AccuracyBar({ value }: { value: number }) {
    return (
        <div style={{ width: '100%', height: '4px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
                height: '100%', borderRadius: '2px',
                width: `${value * 100}%`,
                background: value >= 0.85 ? '#00ffcc' : value >= 0.65 ? '#ff6600' : '#ef4444',
                transition: 'width 0.6s ease',
            }} />
        </div>
    );
}

export default function SessionManager({ onSessionComplete, sessionLength = 6, initialLevels = {}, onMilestone, durationMinutes }: Props) {
    const [gamesQueue, setGamesQueue] = useState<number[]>([]);
    const [currentGameIndex, setCurrentGameIndex] = useState(0);
    const [engines, setEngines] = useState<ContinuousAdaptiveEngine[]>([]);
    const [phase, setPhase] = useState<'loading' | 'playing' | 'post_game_feedback'>('loading');
    const [lastResult, setLastResult] = useState<GameResult | null>(null);
    const allResultsRef = useRef<GameResult[]>([]);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

    useEffect(() => {
        if (durationMinutes) {
            setEndTime(Date.now() + durationMinutes * 60 * 1000);
            setTimeLeftMs(durationMinutes * 60 * 1000);
        }

        // Each game type starts at its persisted level (or 3 if new)
        const newEngines = GAMES.map(g => {
            const saved = Math.min(initialLevels[g.id] ?? 0.3, 1.0); // cap any legacy integer levels
            return new AdaptiveEngine(saved);
        });
        setEngines(newEngines);
        // Build shuffled queue
        const queue: number[] = [];
        const targetLen = durationMinutes ? 1000 : sessionLength;
        while (queue.length < targetLen) {
            const shuffled = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
            queue.push(...shuffled);
        }
        setGamesQueue(queue.slice(0, targetLen));
        setPhase('playing');
    }, [sessionLength, durationMinutes]);

    useEffect(() => {
        if (!endTime) return;
        const interval = setInterval(() => {
            setTimeLeftMs(Math.max(0, endTime - Date.now()));
        }, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    const handleLevelChange = (isCorrect: boolean) => {
        const currentId = gamesQueue[currentGameIndex];
        if (engines[currentId]) engines[currentId].recordTrial(isCorrect);
    };

    const handleGameFinish = (result: { accuracy: number; avgRT: number; totalTrials: number }) => {
        playSound('finish');
        const currentId = gamesQueue[currentGameIndex];
        const difficulty = engines[currentId]?.getDifficulty() ?? 0.5;
        const psi = calculatePSI(result.accuracy, result.avgRT, difficulty, GAMES[currentId].id);
        const gameResult: GameResult = {
            gameId: GAMES[currentId].id,
            accuracy: result.accuracy,
            avgRT: result.avgRT,
            psiDelta: psi,
            level: engines[currentId]?.getDifficulty() ?? 0.3,
            timestamp: Date.now(),
        };
        setLastResult(gameResult);
        setPhase('post_game_feedback');
    };

    const handleNextGame = () => {
        const newResults = [...allResultsRef.current, lastResult!];
        allResultsRef.current = newResults;
        // Fire milestone every 6 games (endless mode live stats update)
        if (onMilestone && newResults.length % 6 === 0) {
            onMilestone(newResults.slice(-6));
        }

        const isTimeUp = endTime ? Date.now() >= endTime : false;

        if (!isTimeUp && currentGameIndex + 1 < (durationMinutes ? 1000 : sessionLength)) {
            setCurrentGameIndex(i => i + 1);
            setPhase('playing');
        } else {
            playSound('finish');
            onSessionComplete(newResults);
        }
    };

    if (phase === 'loading' || gamesQueue.length === 0 || engines.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: '#000' }}>
                <div style={{ width: '2rem', height: '2rem', border: '2px solid #111', borderTop: '2px solid #ff6600', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: '#ff6600', fontSize: '0.75rem', fontFamily: 'monospace', letterSpacing: '0.15em' }}>システム起動中...</span>
                <span style={{ color: '#333', fontSize: '0.6rem', fontFamily: 'monospace' }}>認知訓練準備中</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
            </div>
        );
    }

    const currentId = gamesQueue[currentGameIndex];
    const CurrentGame = GAMES[currentId].Component;
    const currentEngine = engines[currentId];

    const difficulty = lastResult ? (lastResult.level ?? 0.3) : 0;
    const psi = lastResult ? calculatePSI(lastResult.accuracy, lastResult.avgRT, difficulty, lastResult.gameId) : 0;

    return (
        <div className="flex-1 w-full flex flex-col" style={{ background: '#000' }}>
            {/* Session Header — always visible */}
            <div className="shrink-0 px-4 pt-3 pb-2" style={{ borderBottom: '1px solid #0d0d0d' }}>
                <div className="flex justify-between items-center mb-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ fontSize: '0.5rem', color: '#ff6600', fontWeight: 700, letterSpacing: '0.18em', fontFamily: 'monospace' }}>認知訓練モジュール</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#bbb' }}>
                            {GAMES[currentId].emoji} {GAMES[currentId].name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {endTime ? (
                            <span style={{ fontSize: '0.7rem', color: '#ff6600', fontFamily: 'monospace' }}>
                                {Math.floor(timeLeftMs / 60000)}:{(Math.floor(timeLeftMs / 1000) % 60).toString().padStart(2, '0')}
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.7rem', color: '#333' }}>{currentGameIndex + 1}/{sessionLength}</span>
                        )}
                        <span style={{
                            fontSize: '0.75rem', fontWeight: 700, color: '#ff6600',
                            background: '#1a0d00', padding: '2px 10px', borderRadius: '6px', border: '1px solid #ff6600',
                        }}>
                            Lv. {currentEngine?.getLevel() ?? 1}
                        </span>
                    </div>
                </div>
                {/* Segmented progress bar */}
                {endTime && durationMinutes ? (
                    <div style={{ display: 'flex', gap: '3px', height: '5px' }}>
                        <div style={{ flex: 1, height: '100%', borderRadius: '2px', background: '#1a1a1a', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(0, 1 - timeLeftMs / (durationMinutes * 60000)) * 100}%`, height: '100%', background: '#ff6600', transition: 'width 1s linear' }} />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '3px', height: '5px' }}>
                        {Array.from({ length: sessionLength }, (_, i) => (
                            <div
                                key={i}
                                style={{
                                    flex: 1, height: '100%', borderRadius: '2px',
                                    background: i < currentGameIndex
                                        ? '#ff6600'
                                        : i === currentGameIndex
                                            ? phase === 'post_game_feedback' ? '#ff6600' : 'rgba(255,102,0,0.4)'
                                            : '#1a1a1a',
                                    transition: 'background 0.3s ease',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Game Area */}
            {phase === 'playing' && (
                <CurrentGame
                    level={currentEngine?.getLevel() ?? 1}
                    onFinish={handleGameFinish}
                    onLevelChange={handleLevelChange}
                />
            )}

            {/* Post Game Feedback — rich breakdown */}
            {phase === 'post_game_feedback' && lastResult && (
                <div className="flex-1 flex flex-col items-center p-5 gap-5 overflow-y-auto no-scrollbar" style={{ justifyContent: 'center' }}>
                    {/* Game name */}
                    <div className="flex items-center gap-3">
                        <span style={{ fontSize: '2rem' }}>{GAMES[currentId].emoji}</span>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{GAMES[currentId].name}</h2>
                    </div>

                    {/* PSI Score pill */}
                    <div
                        style={{
                            padding: '0.75rem 2.5rem', borderRadius: '0',
                            background: '#0a0a0a',
                            border: `1px solid ${psiColor(psi)}`,
                            borderLeft: `4px solid ${psiColor(psi)}`,
                            boxShadow: `0 0 30px -5px ${psiColor(psi)}40`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                        }}
                    >
                        <span style={{ fontSize: '0.55rem', color: psiColor(psi), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                            処理速度指数 // PSI
                        </span>
                        <span style={{ fontSize: '3.5rem', fontWeight: 900, color: psiColor(psi), lineHeight: 1, textShadow: `0 0 30px ${psiColor(psi)}80` }}>{psi}</span>
                        <span style={{ fontSize: '0.7rem', color: psiColor(psi), fontWeight: 700, opacity: 0.9, fontFamily: 'monospace' }}>{psiLabel(psi)}</span>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '22rem' }}>
                        <div style={{
                            flex: 1, padding: '1rem', borderRadius: '1rem',
                            background: '#0d0d0d', border: '1px solid #1a1a1a',
                            display: 'flex', flexDirection: 'column', gap: '4px',
                        }}>
                            <span style={{ fontSize: '0.55rem', color: '#555', fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
                                正答率
                            </span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00ffcc', lineHeight: 1 }}>
                                {Math.round(lastResult.accuracy * 100)}%
                            </span>
                            <AccuracyBar value={lastResult.accuracy} />
                        </div>

                        <div style={{
                            flex: 1, padding: '1rem', borderRadius: '1rem',
                            background: '#0d0d0d', border: '1px solid #1a1a1a',
                            display: 'flex', flexDirection: 'column', gap: '4px',
                        }}>
                            <span style={{ fontSize: '0.55rem', color: '#555', fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
                                平均反応時間
                            </span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                                {Math.round(lastResult.avgRT)}
                                <span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>ms</span>
                            </span>
                            <div style={{ fontSize: '0.6rem', color: '#444', marginTop: '2px' }}>
                                {lastResult.avgRT < 250 ? '⚡ 超高速' : lastResult.avgRT < 400 ? '△ 良好' : '∇ 遅下がり'}
                            </div>
                        </div>
                    </div>

                    {/* Session progress mini recap */}
                    <div style={{ width: '100%', maxWidth: '22rem' }}>
                        <div style={{ fontSize: '0.5rem', color: '#ff6600', marginBottom: '4px', letterSpacing: '0.18em', fontWeight: 700, fontFamily: 'monospace' }}>
                            ▸ セッション進捗
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {allResultsRef.current.map((r, i) => {
                                const s = calculatePSI(r.accuracy, r.avgRT, r.level ?? 0.3, r.gameId);
                                return (
                                    <div key={i} style={{
                                        flex: 1, height: '28px', borderRadius: '4px',
                                        background: psiColor(s),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <span style={{ fontSize: '0.55rem', color: '#000', fontWeight: 900 }}>{s}</span>
                                    </div>
                                );
                            })}
                            {/* Current game */}
                            <div style={{
                                flex: 1, height: '28px', borderRadius: '4px',
                                background: psiColor(psi), border: '2px solid #fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span style={{ fontSize: '0.55rem', color: '#000', fontWeight: 900 }}>{psi}</span>
                            </div>
                            {/* Remaining slots (only if not endless) */}
                            {!endTime && Array.from({ length: sessionLength - currentGameIndex - 1 }, (_, i) => (
                                <div key={`r${i}`} style={{ flex: 1, height: '28px', borderRadius: '4px', background: '#111', border: '1px solid #1a1a1a' }} />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleNextGame}
                        style={{
                            width: '100%', maxWidth: '22rem', padding: '1.1rem',
                            background: (!endTime && currentGameIndex + 1 >= sessionLength) || (endTime && Date.now() >= endTime) ? '#f0f0f0' : '#ff6600',
                            color: '#000', fontWeight: 700, fontSize: '1.05rem',
                            borderRadius: '1rem', border: 'none', cursor: 'pointer',
                        }}
                        className="active:scale-95 transition-transform"
                    >
                        {(!endTime && currentGameIndex + 1 >= sessionLength) || (endTime && Date.now() >= endTime) ? t('finish') : `次へ: ${GAMES[gamesQueue[currentGameIndex + 1]]?.emoji ?? ''}`}
                    </button>
                </div>
            )}
        </div>
    );
}
