/**
 * PSI (Processing Speed Index) Engine — Continuous Difficulty v4
 *
 * KEY DESIGN CHANGE: The discrete integer "Level" concept is abolished.
 *
 * Difficulty is now a continuous float in [0.0, 1.0]:
 *   0.0 = easiest  (beginner)
 *   0.5 = moderate (intermediate, roughly average adult)
 *   1.0 = hardest  (elite)
 *
 * Each game maps this float to its own internal parameters (duration, grid size, etc.)
 * via the helper `gameDifficulty(d, min, max)` utility below.
 *
 * The ContinuousAdaptiveEngine uses a rolling accuracy EMA to smoothly adjust difficulty:
 *   - Target accuracy: 75%
 *   - After each trial, difficulty drifts toward keeping accuracy near target
 *   - Change is proportional and smooth — no discrete steps or integer rounding
 *
 * PSI FORMULA:
 *   Because difficulty auto-calibrates to keep accuracy ≈ 75%, difficulty itself
 *   is the primary measure of "how hard the player can go while staying accurate."
 *   PSI = basePSI(accuracy, avgRT, gameId) × (1 + difficultyBonus)
 *
 *   basePSI = (accuracy / 0.80) × √(baselineRT / avgRT) × 100
 *   difficultyBonus = difficulty × 0.3    → ≤ +30% for elite players
 *
 *   Average adult (80% acc, baselineRT, difficulty 0.5) → ≈ 115. Normalized to 100 via K.
 */

/** Map a continuous difficulty float to a concrete parameter range */
export function gameDifficulty(d: number, easy: number, hard: number): number {
    return easy + (hard - easy) * Math.max(0, Math.min(1, d));
}

const ACC_BASE = 0.80;

// Realistic correct-trial RT for average untrained adult (used for normalization only)
const GAME_BASELINES: Record<string, number> = {
    choice_reaction: 600,
    double_decision: 900,
    rsvp: 480,
    digit_symbol: 2800,
    symbol_search: 3200,
    rapid_search: 4500,
};

const K = 1 / 1.15; // normalization: average player at d=0.5 → PSI ~100

export function calculatePSI(
    accuracy: number,
    avgRT: number,
    difficulty: number = 0.5,
    gameId: string = '',
): number {
    if (avgRT <= 0 || accuracy <= 0) return 0;

    // Normalize legacy data: old integer levels (1–15) are converted to float [0,1]
    // New data is already in [0,1]; if value > 1, treat as legacy integer scale
    const d = difficulty > 1
        ? Math.max(0, Math.min(1, difficulty / 15))
        : Math.max(0, Math.min(1, difficulty));

    const baselineRT = GAME_BASELINES[gameId] ?? 1200;
    const rtScore = Math.sqrt(baselineRT / avgRT);
    const diffBonus = d * 0.3; // max +30% at d=1
    const raw = (accuracy / ACC_BASE) * rtScore * 100 * (1 + diffBonus) * K;

    return Math.round(Math.min(200, Math.max(1, raw)));
}

/**
 * ContinuousAdaptiveEngine
 *
 * Tracks difficulty as a float [0, 1] using exponential moving average of accuracy.
 * After each trial the difficulty adjusts by a small step proportional to error from target.
 * Feels natural and never "snaps" between discrete steps.
 */
export class ContinuousAdaptiveEngine {
    private difficulty: number;
    private readonly target = 0.75;       // aim for 75% accuracy
    private readonly stepUp = 0.04;       // how much harder per correct trial
    private readonly stepDown = 0.08;     // how much easier per incorrect trial (asymmetric: errors hurt more)
    private readonly min = 0.0;
    private readonly max = 1.0;

    constructor(initialDifficulty = 0.3) {
        this.difficulty = Math.max(0, Math.min(1, initialDifficulty));
    }

    recordTrial(isCorrect: boolean) {
        if (isCorrect) {
            this.difficulty = Math.min(this.max, this.difficulty + this.stepUp);
        } else {
            this.difficulty = Math.max(this.min, this.difficulty - this.stepDown);
        }
        return this.difficulty;
    }

    getDifficulty() { return this.difficulty; }

    /** For backwards-compat with storage (stored as a float, displayed as %) */
    getLevel() { return this.difficulty; }
}

// Backwards-compat alias so existing call sites don't break
export const AdaptiveEngine = ContinuousAdaptiveEngine;
