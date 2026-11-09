import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameProps } from './types';
import { playSound } from '../../utils/audio';
import { gameDifficulty } from '../../utils/engine';
import GameShell from './GameShell';

const EASY_SYMBOLS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
const MAX_TRIALS = 6;

type TrialPhase = 'show-target' | 'playing' | 'result';

export default function RSVP({ level, onFinish, onLevelChange }: GameProps) {
    const [target, setTarget] = useState('');
    const [displayLetter, setDisplayLetter] = useState('');
    const [trialPhase, setTrialPhase] = useState<TrialPhase>('show-target');
    const [resultOk, setResultOk] = useState(false);

    const trialsRef = useRef(0);
    const correctRef = useRef(0);
    const rtSumRef = useRef(0);
    const finishedRef = useRef(false);
    const respondedRef = useRef(false);
    const targetRef = useRef('');
    const trialPhaseRef = useRef<TrialPhase>('show-target');
    const targetHitWindowRef = useRef(false);
    const hitTimeRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // frameDuration: 290ms (d=0) → 130ms (d=1) — mapped continuously
    const frameDuration = Math.round(gameDifficulty(level, 290, 130));

    // Use a per-trial randomly-generated SEQ_LENGTH (12–22) AND random target position
    // This completely eliminates temporal predictability from trial structure
    const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        clearTimer();
        onFinish({
            accuracy: trialsRef.current > 0 ? correctRef.current / trialsRef.current : 0,
            avgRT: correctRef.current > 0 ? rtSumRef.current / correctRef.current : 400,
            totalTrials: trialsRef.current,
        });
    }, [onFinish]);

    const showResult = useCallback((isCorrect: boolean, rt: number) => {
        if (respondedRef.current) return;
        respondedRef.current = true;
        clearTimer();
        targetHitWindowRef.current = false;

        if (isCorrect) { playSound('correct'); correctRef.current++; rtSumRef.current += rt; }
        else { playSound('incorrect'); }

        if (onLevelChange) onLevelChange(isCorrect);
        setResultOk(isCorrect);
        trialPhaseRef.current = 'result';
        setTrialPhase('result');
        trialsRef.current++;

        timerRef.current = setTimeout(() => {
            if (trialsRef.current >= MAX_TRIALS) finish();
            else startTrial();
        }, 800);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onLevelChange, finish]);

    const startTrial = useCallback(() => {
        if (finishedRef.current) return;
        clearTimer();
        respondedRef.current = false;
        targetHitWindowRef.current = false;

        const shuffled = [...EASY_SYMBOLS].sort(() => Math.random() - 0.5);
        const newTarget = shuffled[0];
        targetRef.current = newTarget;
        setTarget(newTarget);

        // Randomize both the sequence length AND the target position
        // to completely prevent any rhythm-based anticipation
        const seqLength = 14 + Math.floor(Math.random() * 12); // 14–25 frames total
        const guardStart = 5;
        const guardEnd = seqLength - 5;
        const targetPos = guardStart + Math.floor(Math.random() * Math.max(1, guardEnd - guardStart));

        const seq: string[] = [];
        for (let i = 0; i < seqLength; i++) {
            seq.push(i === targetPos ? newTarget : shuffled[1 + Math.floor(Math.random() * (shuffled.length - 1))]);
        }

        // 5 grace frames for the hit window after target appears
        const GRACE_FRAMES = Math.max(3, Math.round(5 - level * 0.2));

        trialPhaseRef.current = 'show-target';
        setTrialPhase('show-target');
        setDisplayLetter('');

        // Show target for a randomised duration too (800–1600ms)
        const showDuration = 800 + Math.floor(Math.random() * 800);
        timerRef.current = setTimeout(() => {
            // Start RSVP stream immediately, no countdown
            trialPhaseRef.current = 'playing';
            setTrialPhase('playing');
            let frame = 0;

            const tick = () => {
                if (respondedRef.current || finishedRef.current) return;
                if (frame >= seq.length) {
                    showResult(false, frameDuration * 8);
                    return;
                }
                setDisplayLetter(seq[frame]);
                if (frame === targetPos) {
                    targetHitWindowRef.current = true;
                    hitTimeRef.current = performance.now();
                }
                if (frame === targetPos + GRACE_FRAMES + 1) {
                    if (!respondedRef.current) {
                        showResult(false, frameDuration * 8);
                        return;
                    }
                }
                frame++;
                // Heavy jitter: ±35% of frameDuration per frame
                const jitter = (Math.random() - 0.5) * 0.7 * frameDuration;
                timerRef.current = setTimeout(tick, Math.max(80, frameDuration + jitter));
            };
            tick();
        }, showDuration);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frameDuration, showResult, level]);

    useEffect(() => {
        startTrial();
        return () => clearTimer();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); handleTap(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const handleTap = () => {
        if (finishedRef.current || respondedRef.current) return;
        if (trialPhaseRef.current !== 'playing') return;
        const rt = performance.now() - hitTimeRef.current;
        const isHit = targetHitWindowRef.current;
        showResult(isHit, isHit ? Math.max(50, rt) : frameDuration * 6);
    };

    return (
        <GameShell
            title="高速継時視覦提示計" emoji="⚡"
            instruction={trialPhase === 'show-target' ? `標的文字「${target}」 — 流れたら即座にタップ！` : '画面辺りをタップ（SpaceキーもOK）'}
            trial={trialsRef.current} maxTrials={MAX_TRIALS} accent="#ff6600"
        >
            <div
                className="flex-1 w-full flex flex-col items-center justify-center select-none touch-manipulation cursor-pointer"
                onClick={handleTap}
            >
                {trialPhase === 'show-target' && (
                    <div className="flex flex-col items-center gap-3 pointer-events-none">
                        <span style={{
                            fontSize: 'min(30vw, 10rem)', fontWeight: 900, color: '#ff6600',
                            fontFamily: 'monospace', lineHeight: 1,
                            textShadow: '0 0 40px rgba(255,102,0,0.5)',
                        }}>
                            {target}
                        </span>
                    </div>
                )}

                {trialPhase === 'playing' && (
                    <div style={{
                        fontSize: 'min(38vw, 14rem)', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1,
                        color: '#eaeaea', textShadow: '0 0 20px rgba(255,255,255,0.1)',
                    }}>
                        {displayLetter}
                    </div>
                )}

                {trialPhase === 'result' && (
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <div style={{ fontSize: 'min(24vw, 9rem)', color: resultOk ? '#00ffcc' : '#ef4444', fontWeight: 900, lineHeight: 1, textShadow: `0 0 30px ${resultOk ? '#00ffcc' : '#ef4444'}60` }}>
                            {resultOk ? '✓' : '✗'}
                        </div>
                        <span style={{ color: resultOk ? '#00ffcc' : '#ef4444', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                            {resultOk ? '検出成功' : '見逃し'}
                        </span>
                    </div>
                )}
            </div>
        </GameShell>
    );
}
