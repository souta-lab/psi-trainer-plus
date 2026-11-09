import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameProps } from './types';
import { playSound } from '../../utils/audio';
import { gameDifficulty } from '../../utils/engine';
import GameShell from './GameShell';

const GO = '🟢';
const NO_GO = ['🔴', '🟡', '🟣', '🟠', '🔵'];
const MAX_TRIALS = 12;

type Phase = 'ready' | 'wait' | 'stimulus' | 'feedback';

export default function ChoiceReaction({ level, onFinish, onLevelChange }: GameProps) {
    const [phase, setPhase] = useState<Phase>('ready');
    const [stimulus, setStimulus] = useState('');
    const [feedbackOk, setFeedbackOk] = useState(false);
    const [trialCount, setTrialCount] = useState(0);

    const trialsRef = useRef(0);
    const correctRef = useRef(0);
    const rtSumRef = useRef(0);
    const startTimeRef = useRef(0);
    const finishedRef = useRef(false);
    const respondedRef = useRef(false);
    const isGoRef = useRef(false);
    const phaseRef = useRef<Phase>('ready');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stimulus visible duration: 700ms (d=0) → 350ms (d=1)
    const stimDuration = Math.round(gameDifficulty(level, 700, 350));

    const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        clearTimer();
        onFinish({
            accuracy: trialsRef.current > 0 ? correctRef.current / trialsRef.current : 0,
            avgRT: correctRef.current > 0 ? rtSumRef.current / correctRef.current : 500,
            totalTrials: trialsRef.current,
        });
    }, [onFinish]);

    const showFeedback = useCallback((ok: boolean) => {
        clearTimer();
        setFeedbackOk(ok);
        phaseRef.current = 'feedback';
        setPhase('feedback');
        timerRef.current = setTimeout(() => {
            trialsRef.current++;
            setTrialCount(trialsRef.current);
            if (trialsRef.current >= MAX_TRIALS) finish();
            else startNextTrial();
        }, 500);
    }, [finish]); // eslint-disable-line react-hooks/exhaustive-deps

    const showStimulus = useCallback(() => {
        if (finishedRef.current) return;
        clearTimer();
        respondedRef.current = false;
        const isGo = Math.random() < 0.65;
        isGoRef.current = isGo;
        const stim = isGo ? GO : NO_GO[Math.floor(Math.random() * NO_GO.length)];
        setStimulus(stim);
        phaseRef.current = 'stimulus';
        setPhase('stimulus');
        startTimeRef.current = performance.now();
        // Auto-timeout: if no tap within stimDuration → record result
        timerRef.current = setTimeout(() => {
            if (respondedRef.current || finishedRef.current || phaseRef.current !== 'stimulus') return;
            // Timed out: correct if NO-GO (correct inhibition), wrong if GO (missed)
            const ok = !isGoRef.current;
            if (ok) playSound('correct'); else playSound('incorrect');
            showFeedback(ok);
        }, stimDuration);
    }, [stimDuration, showFeedback]);

    const startNextTrial = useCallback(() => {
        if (finishedRef.current) return;
        clearTimer();
        phaseRef.current = 'wait';
        setPhase('wait');
        // Random ISI: 600–1400ms
        timerRef.current = setTimeout(showStimulus, 600 + Math.random() * 800);
    }, [showStimulus]);

    useEffect(() => {
        // Initial delay before first trial
        timerRef.current = setTimeout(startNextTrial, 400);
        return () => clearTimer();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keyboard support: spacebar = tap
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); handleTap(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }); // runs every render so handleTap closure is always fresh

    const handleTap = () => {
        if (phaseRef.current !== 'stimulus') return;
        if (respondedRef.current || finishedRef.current) return;
        clearTimer();
        respondedRef.current = true;
        const rt = performance.now() - startTimeRef.current;
        const isCorrect = isGoRef.current; // tapping correct only for GO
        if (isCorrect) { playSound('correct'); correctRef.current++; rtSumRef.current += rt; }
        else { playSound('incorrect'); }
        if (onLevelChange) onLevelChange(isCorrect);
        showFeedback(isCorrect);
    };

    return (
        <GameShell
            title="選択反応速度測定器" emoji="🟢"
            instruction="🟢 のみタップ — 他の色は無視（SpaceキーもOK）"
            trial={trialCount} maxTrials={MAX_TRIALS} accent="#22d3ee"
        >
            <div
                className="flex-1 w-full flex flex-col items-center justify-center select-none touch-manipulation cursor-pointer relative"
                onClick={handleTap}
            >
                {/* Central stimulus area */}
                <div style={{ height: '14rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(phase === 'ready' || phase === 'wait') && (
                        <span style={{ fontSize: '3rem', color: '#1a1a1a' }}>＋</span>
                    )}
                    {phase === 'stimulus' && (
                        <span style={{ fontSize: 'min(30vw, 9rem)', lineHeight: 1 }}>
                            {stimulus}
                        </span>
                    )}
                    {phase === 'feedback' && (
                        <span style={{
                            fontSize: 'min(20vw, 6rem)', fontWeight: 900,
                            color: feedbackOk ? '#00ffcc' : '#ef4444', lineHeight: 1,
                        }}>
                            {feedbackOk ? '✓' : '✗'}
                        </span>
                    )}
                </div>

                {/* Status hint */}
                {phase === 'stimulus' && (
                    <div style={{
                        padding: '6px 20px', borderRadius: '4px',
                        background: isGoRef.current ? 'rgba(0,255,204,0.08)' : 'transparent',
                        border: isGoRef.current ? '1px solid rgba(0,255,204,0.25)' : '1px solid transparent',
                        color: isGoRef.current ? '#00ffcc' : '#333',
                        fontSize: '0.9rem', fontWeight: 700,
                    }}>
                        {isGoRef.current ? '← タップ！→' : '…待て…'}
                    </div>
                )}
                {(phase === 'ready' || phase === 'wait') && (
                    <span style={{ color: '#222', fontSize: '0.75rem' }}>準備中...</span>
                )}
            </div>
        </GameShell>
    );
}
