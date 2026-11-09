export interface GameResult {
    gameId: string;
    accuracy: number;
    avgRT: number;
    psiDelta: number;
    level: number;
    timestamp: number;
}

export interface DailySession {
    date: string; // YYYY-MM-DD
    games: GameResult[];
    overallPSI: number;
    durationMs?: number;
}

export interface GameLevelState {
    [gameId: string]: number; // gameId -> current level
}

export interface UserStats {
    streak: number;
    lastPlayedDate: string | null;
    history: DailySession[];
    estimatedPSI: number;
    gameLevels?: GameLevelState; // persisted per-game adaptive difficulty
    totalSessions?: number;
    totalTrials?: number;
}

const STORAGE_KEY = 'speedforge_psi_data';

export function loadUserStats(): UserStats {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            // Ensure new fields exist
            return {
                gameLevels: {},
                totalSessions: 0,
                totalTrials: 0,
                ...parsed,
            };
        }
    } catch (e) {
        console.error('Failed to parse stats', e);
    }
    return {
        streak: 0,
        lastPlayedDate: null,
        history: [],
        estimatedPSI: 100,
        gameLevels: {},
        totalSessions: 0,
        totalTrials: 0,
    };
}

export function saveUserStats(stats: UserStats) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error('Failed to save stats', e);
    }
}

export function getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function updateStreak(stats: UserStats): UserStats {
    const today = getTodayDateString();
    if (stats.lastPlayedDate === today) return stats;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yYear = yesterday.getFullYear();
    const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yDay = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

    const newStreak = stats.lastPlayedDate === yesterdayStr ? stats.streak + 1 : 1;
    return { ...stats, streak: newStreak, lastPlayedDate: today };
}

/** 
 * Per-game adaptive level helpers 
 * Saves/loads current difficulty level per game across sessions.
 */
export const GAME_IDS = ['double_decision', 'symbol_search', 'digit_symbol', 'rapid_search', 'choice_reaction', 'rsvp'] as const;
export type GameId = typeof GAME_IDS[number];

export function loadGameLevel(gameId: string, stats: UserStats): number {
    return stats.gameLevels?.[gameId] ?? 3;
}

export function buildGameLevelsFromResults(results: GameResult[], prevLevels: GameLevelState): GameLevelState {
    const updated = { ...prevLevels };
    for (const r of results) {
        // Take the level reached at end of this game as the new start for next session
        updated[r.gameId] = r.level;
    }
    return updated;
}

/**
 * Compute per-game aggregate stats from full history.
 */
export interface PerGameStat {
    gameId: string;
    totalGames: number;
    avgAccuracy: number;
    avgRT: number;
    avgPSI: number;
    bestPSI: number;
    currentLevel: number;
}

export function computePerGameStats(stats: UserStats): PerGameStat[] {
    const map: Record<string, GameResult[]> = {};
    for (const session of stats.history) {
        for (const r of session.games) {
            if (!map[r.gameId]) map[r.gameId] = [];
            map[r.gameId].push(r);
        }
    }
    return Object.entries(map).map(([gameId, results]) => {
        const avgAcc = results.reduce((s, r) => s + r.accuracy, 0) / results.length;
        const avgRt = results.reduce((s, r) => s + r.avgRT, 0) / results.length;
        const avgPsi = results.reduce((s, r) => s + r.psiDelta, 0) / results.length;
        const bestPsi = Math.max(...results.map(r => r.psiDelta));
        return {
            gameId,
            totalGames: results.length,
            avgAccuracy: avgAcc,
            avgRT: avgRt,
            avgPSI: Math.round(avgPsi),
            bestPSI: bestPsi,
            currentLevel: stats.gameLevels?.[gameId] ?? 3,
        };
    });
}
