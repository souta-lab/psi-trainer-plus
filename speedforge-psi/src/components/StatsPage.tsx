import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Filler,
} from 'chart.js';
import type { UserStats } from '../utils/storage';
import { computePerGameStats } from '../utils/storage';
import { calculatePSI } from '../utils/engine';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const GAME_LABELS: Record<string, { label: string; color: string }> = {
    double_decision: { label: '🚗 瞬間二重判定装置', color: '#ff6600' },
    symbol_search: { label: '🍎 記号高速探索システム', color: '#00ffcc' },
    digit_symbol: { label: '🔢 数字符号変換エンジン', color: '#3b82f6' },
    rapid_search: { label: '👁 高速視覚走査装置', color: '#a855f7' },
    choice_reaction: { label: '🟢 選択反応速度測定器', color: '#22d3ee' },
    rsvp: { label: '⚡ 高速継時視覚提示計', color: '#facc15' },
};

const ALL_GAME_IDS = ['double_decision', 'symbol_search', 'digit_symbol', 'rapid_search', 'choice_reaction', 'rsvp'];

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

// Extract all plays for a specific gameId, ordered chronologically with timestamp
function getGamePlays(stats: UserStats, gameId: string): { psi: number; accuracy: number; rt: number; ts: number }[] {
    const plays: { psi: number; accuracy: number; rt: number; ts: number }[] = [];
    for (const session of stats.history) {
        for (const r of session.games) {
            if (r.gameId === gameId) {
                plays.push({
                    psi: calculatePSI(r.accuracy, r.avgRT, r.level ?? 5, r.gameId),
                    accuracy: r.accuracy,
                    rt: r.avgRT,
                    ts: r.timestamp ?? 0,
                });
            }
        }
    }
    plays.sort((a, b) => a.ts - b.ts);
    return plays;
}

function formatTs(ts: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface CompoundChartProps {
    gameId: string;
    plays: { psi: number; accuracy: number; rt: number; ts: number }[];
}

function CompoundChart({ gameId, plays }: CompoundChartProps) {
    const meta = GAME_LABELS[gameId];
    if (!meta || plays.length === 0) return null;

    const windowSize = 5;
    const psiValues = plays.map(p => p.psi);
    const accValues = plays.map(p => Math.round(p.accuracy * 100));

    // Moving average for smoother trend
    const psiMA = psiValues.map((_, i) => {
        const window = psiValues.slice(Math.max(0, i - windowSize + 1), i + 1);
        return Math.round(window.reduce((s, v) => s + v, 0) / window.length);
    });
    const accMA = accValues.map((_, i) => {
        const window = accValues.slice(Math.max(0, i - windowSize + 1), i + 1);
        return Math.round(window.reduce((s, v) => s + v, 0) / window.length);
    });

    const labels = plays.map((_, i) => String(i + 1));
    const avgPSI = Math.round(psiValues.reduce((s, v) => s + v, 0) / psiValues.length);
    const latestPSI = psiValues[psiValues.length - 1];
    const trend = psiValues.length >= 3
        ? psiValues[psiValues.length - 1] - psiValues[Math.max(0, psiValues.length - 6)]
        : 0;

    const chartData = {
        labels,
        datasets: [
            {
                label: 'PSI',
                data: psiMA,
                borderColor: meta.color,
                backgroundColor: `${meta.color}18`,
                fill: true,
                tension: 0.4,
                pointRadius: plays.length <= 20 ? 3 : 1,
                pointBackgroundColor: meta.color,
                borderWidth: 2,
                yAxisID: 'y',
            },
            {
                label: '正答率%',
                data: accMA,
                borderColor: '#444',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 1.5,
                borderDash: [3, 3],
                yAxisID: 'y2',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#111',
                borderColor: '#222',
                borderWidth: 1,
                titleColor: '#888',
                bodyColor: '#ccc',
                callbacks: {
                    title: (items: { dataIndex: number }[]) => {
                        const idx = items[0]?.dataIndex ?? 0;
                        const ts = plays[idx]?.ts;
                        return ts ? `#${idx + 1}  ${formatTs(ts)}` : `#${idx + 1}`;
                    },
                    label: (item: TooltipItem<'line'>) =>
                        `${item.dataset.label ?? ''}: ${item.raw}${item.dataset.label === 'PSI' ? '' : '%'}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#333', font: { size: 9 }, maxTicksLimit: 8 },
            },
            y: {
                position: 'left' as const,
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: meta.color, font: { size: 9 }, maxTicksLimit: 5 },
                min: Math.max(0, Math.min(...psiMA) - 10),
            },
            y2: {
                position: 'right' as const,
                grid: { display: false },
                ticks: { color: '#333', font: { size: 9 }, maxTicksLimit: 4 },
                min: 0, max: 100,
            },
        },
    };

    return (
        <div style={{ padding: '14px 16px', borderRadius: '16px', background: '#0d0d0d', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#bbb' }}>{meta.label}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: psiColor(latestPSI), lineHeight: 1 }}>{latestPSI}</span>
                    <span style={{ fontSize: '0.55rem', color: psiColor(latestPSI), fontWeight: 700, textTransform: 'uppercase' }}>{psiLabel(latestPSI)}</span>
                </div>
            </div>
            {/* Sub-stats row */}
            <div style={{ display: 'flex', gap: '8px' }}>
                {[
                    { l: '平均', v: String(avgPSI), c: psiColor(avgPSI) },
                    { l: '回数', v: String(plays.length), c: '#555' },
                    { l: '推移', v: trend >= 0 ? `+${trend}` : String(trend), c: trend > 0 ? '#00ffcc' : trend < 0 ? '#ef4444' : '#555' },
                ].map((s, i) => (
                    <div key={i} style={{ flex: 1, padding: '4px', borderRadius: '8px', background: '#111', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize: '0.5rem', color: '#333', textTransform: 'uppercase' }}>{s.l}</div>
                    </div>
                ))}
            </div>
            {/* Chart */}
            <div style={{ height: '8rem', position: 'relative' }}>
                <Line options={chartOptions} data={chartData} />
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.6rem', color: '#444' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '2px', background: meta.color, display: 'inline-block', borderRadius: '1px' }} />
                    PSI
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '2px', background: '#444', display: 'inline-block', borderRadius: '1px' }} />
                    正答率 (右軸) %
                </span>
                <span style={{ marginLeft: 'auto', color: '#333' }}>ホバーで日時</span>
            </div>
        </div>
    );
}

function GlobalPSIChart({ stats }: { stats: UserStats }) {
    if (stats.history.length === 0) return null;

    const windowSize = 5;
    const psiValues = stats.history.map(h => h.overallPSI);

    // Moving average for smoother trend
    const psiMA = psiValues.map((_, i) => {
        const window = psiValues.slice(Math.max(0, i - windowSize + 1), i + 1);
        return Math.round(window.reduce((s, v) => s + v, 0) / window.length);
    });

    const labels = stats.history.map((_, i) => String(i + 1));
    const latestPSI = psiValues[psiValues.length - 1];

    const chartData = {
        labels,
        datasets: [
            {
                label: '総合 PSI',
                data: psiMA,
                borderColor: '#ff6600',
                backgroundColor: '#ff660018',
                fill: true,
                tension: 0.4,
                pointRadius: stats.history.length <= 20 ? 3 : 1,
                pointBackgroundColor: '#ff6600',
                borderWidth: 2,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#111',
                borderColor: '#ff6600',
                borderWidth: 1,
                titleColor: '#888',
                bodyColor: '#ccc',
                callbacks: {
                    title: (items: { dataIndex: number }[]) => {
                        const idx = items[0]?.dataIndex ?? 0;
                        return `#${idx + 1}  ${stats.history[idx]?.date || ''}`;
                    },
                    label: (item: TooltipItem<'line'>) => `${item.dataset.label}: ${item.raw}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#333', font: { size: 9 }, maxTicksLimit: 8 },
            },
            y: {
                grid: { color: 'rgba(255,102,0,0.1)' },
                ticks: { color: '#ff6600', font: { size: 9 }, maxTicksLimit: 5 },
                min: Math.max(0, Math.min(...psiMA) - 10),
            },
        },
    };

    return (
        <div style={{ padding: '20px', borderRadius: '16px', background: '#0a0a0a', border: '1px solid #ff660040', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff6600', letterSpacing: '0.05em' }}>総合PSI推移記録</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: psiColor(latestPSI), lineHeight: 1 }}>{latestPSI}</span>
                    <span style={{ fontSize: '0.65rem', color: psiColor(latestPSI), fontWeight: 700, textTransform: 'uppercase' }}>{psiLabel(latestPSI)}</span>
                </div>
            </div>
            {/* Chart */}
            <div style={{ height: '10rem', position: 'relative', marginTop: '10px' }}>
                <Line options={chartOptions} data={chartData} />
            </div>
        </div>
    );
}

interface Props {
    stats: UserStats;
    onBack: () => void;
}

export default function StatsPage({ stats, onBack }: Props) {
    const perGame = computePerGameStats(stats);
    const [activeTab, setActiveTab] = useState<'charts' | 'summary'>('charts');

    const totalGames = stats.history.reduce((s, h) => s + h.games.length, 0);
    const bestPSI = Math.max(0, ...stats.history.map(h => h.overallPSI));
    const recentHistory = stats.history.slice(-30);
    const avgPSI = recentHistory.length
        ? Math.round(recentHistory.reduce((s, h) => s + h.overallPSI, 0) / recentHistory.length)
        : stats.estimatedPSI;

    // Per-game play data for charts
    const gamePlayData = ALL_GAME_IDS.map(id => ({
        id,
        plays: getGamePlays(stats, id),
    })).filter(g => g.plays.length > 0);

    const hasData = stats.history.length > 0;

    return (
        <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col overflow-y-auto no-scrollbar" style={{ background: '#000', minHeight: '100vh' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid #ff660030' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#ff6600', cursor: 'pointer', fontSize: '1.4rem', padding: '4px', fontFamily: 'monospace' }}>←</button>
                <div>
                    <div style={{ fontSize: '0.45rem', color: '#ff6600', fontWeight: 700, letterSpacing: '0.2em', fontFamily: 'monospace' }}>NERV // データ解析端末</div>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>認知能力統計解析システム</h1>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '12px 16px 0' }}>
                {[
                    { label: 'Streak', value: `${stats.streak}d`, color: '#f97316' },
                    { label: 'Sessions', value: String(stats.history.length), color: '#3b82f6' },
                    { label: 'Best PSI', value: String(bestPSI), color: psiColor(bestPSI) },
                    { label: 'Est. PSI', value: String(Math.round(stats.estimatedPSI)), color: psiColor(stats.estimatedPSI) },
                    { label: 'Avg PSI', value: String(avgPSI), color: psiColor(avgPSI) },
                    { label: 'Games', value: String(totalGames), color: '#888' },
                ].map((kpi, i) => (
                    <div key={i} style={{ padding: '10px', borderRadius: '12px', background: '#0d0d0d', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</span>
                        <span style={{ fontSize: '0.55rem', color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{kpi.label}</span>
                    </div>
                ))}
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '4px', padding: '12px 16px 0' }}>
                <button
                    onClick={() => setActiveTab('charts')}
                    style={{ flex: 1, padding: '8px', borderRadius: '0', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: activeTab === 'charts' ? '#1a0d00' : 'transparent', color: activeTab === 'charts' ? '#ff6600' : '#333', borderBottom: activeTab === 'charts' ? '2px solid #ff6600' : '2px solid transparent', fontFamily: 'inherit' }}
                >
                    📈 ゲーム別記録推移
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    style={{ flex: 1, padding: '8px', borderRadius: '0', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: activeTab === 'summary' ? '#1a0d00' : 'transparent', color: activeTab === 'summary' ? '#ff6600' : '#333', borderBottom: activeTab === 'summary' ? '2px solid #ff6600' : '2px solid transparent', fontFamily: 'inherit' }}
                >
                    📋 統合能力解析
                </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
                {!hasData && (
                    <div style={{ textAlign: 'center', color: '#2a2a2a', padding: '4rem', fontSize: '0.85rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                        セッションを完了すると統計が表示されます
                    </div>
                )}

                {hasData && activeTab === 'charts' && (
                    <>
                        {gamePlayData.length === 0 && (
                            <div style={{ color: '#333', textAlign: 'center', padding: '2rem', fontSize: '0.8rem' }}>もっとプレイするとグラフが表示されます</div>
                        )}
                        {gamePlayData.map(g => (
                            <CompoundChart key={g.id} gameId={g.id} plays={g.plays} />
                        ))}
                    </>
                )}

                {hasData && activeTab === 'summary' && (
                    <>
                        <GlobalPSIChart stats={stats} />
                        {/* Per-game detail cards */}
                        {perGame.map(g => {
                            const meta = GAME_LABELS[g.gameId];
                            if (!meta) return null;
                            const plays = getGamePlays(stats, g.gameId);
                            const latestPSI = plays.length > 0 ? plays[plays.length - 1].psi : g.avgPSI;
                            const c = psiColor(g.avgPSI);
                            return (
                                <div key={g.gameId} style={{ padding: '14px 16px', borderRadius: '14px', background: '#0d0d0d', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#bbb' }}>{meta.label}</span>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.6rem', color: c, fontWeight: 700 }}>{psiLabel(g.avgPSI)}</span>
                                            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: psiColor(latestPSI) }}>{latestPSI}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                                        {[
                                            { l: 'プレイ数', v: String(g.totalGames) },
                                            { l: '正答率', v: `${Math.round(g.avgAccuracy * 100)}%` },
                                            { l: '反応時間', v: `${Math.round(g.avgRT)}ms` },
                                            { l: '難易度', v: `${Math.round((g.currentLevel > 1 ? g.currentLevel / 10 : g.currentLevel) * 100)}%` },
                                        ].map((item, i) => (
                                            <div key={i} style={{ padding: '6px', borderRadius: '8px', background: '#111', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#aaa' }}>{item.v}</div>
                                                <div style={{ fontSize: '0.5rem', color: '#333', fontWeight: 700, textTransform: 'uppercase', marginTop: '1px' }}>{item.l}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${g.avgAccuracy * 100}%`, background: g.avgAccuracy >= 0.8 ? '#10b981' : g.avgAccuracy >= 0.6 ? '#f59e0b' : '#ef4444', transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Session history */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.6rem', color: '#333', fontWeight: 700, textTransform: 'uppercase' }}>セッション履歴</div>
                            {[...recentHistory].reverse().map((s, i) => {
                                const psiFromGames = s.games.length > 0
                                    ? Math.round(s.games.reduce((x, r) => x + calculatePSI(r.accuracy, r.avgRT, r.level ?? 5, r.gameId), 0) / s.games.length)
                                    : s.overallPSI;
                                const avgAcc = s.games.length > 0
                                    ? Math.round(s.games.reduce((x, r) => x + r.accuracy, 0) / s.games.length * 100)
                                    : 0;
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
                                        <div style={{ width: '4px', height: '36px', borderRadius: '2px', background: psiColor(psiFromGames), flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777' }}>{s.date}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#3a3a3a' }}>{s.games.length} games · {avgAcc}% acc</div>
                                        </div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: psiColor(psiFromGames) }}>{psiFromGames}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <div style={{ height: '2rem' }} />
            </div>
        </div>
    );
}
