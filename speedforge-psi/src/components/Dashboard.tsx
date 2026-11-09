import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js';
import type { UserStats } from '../utils/storage';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

interface Props {
    stats: UserStats;
    onStartSession: () => void;
    onStartEndless: () => void;
    onDevMode: () => void;
    onStats: () => void;
    onToggleLang: () => void;
}

function psiColor(psi: number): string {
    if (psi >= 130) return '#00ffcc';
    if (psi >= 110) return '#facc15';
    if (psi >= 90) return '#ff6600';
    if (psi >= 70) return '#ef4444';
    return '#7f1d1d';
}

function psiRank(psi: number): string {
    if (psi >= 130) return 'CLASS-A: 最優秀';
    if (psi >= 110) return 'CLASS-B: 優秀';
    if (psi >= 90) return 'CLASS-C: 標準';
    if (psi >= 70) return 'CLASS-D: 要訓練';
    return 'CLASS-E: 初期化段階';
}

const GAME_INFO = [
    {
        id: 'double_decision',
        name: '瞬間二重判定装置',
        desc: '中枢神経系の対象認識と空間識別能力を同時計測。短時間閃光刺激に対する脳の判断処理速度を定量化する。速読・スポーツ・パイロット訓練に相当する認知プロセスを再現。',
        emoji: '🚗',
        color: '#ff6600',
    },
    {
        id: 'symbol_search',
        name: '記号高速探索システム',
        desc: '視覚的パターンマッチングと選択的注意力を評価。アルファベット・記号群からの標的抽出速度は、情報処理の並列化能力を直接反映する。',
        emoji: '🍎',
        color: '#00ffcc',
    },
    {
        id: 'digit_symbol',
        name: '数字符号変換エンジン',
        desc: 'ワーキングメモリと処理速度の複合指標を計測。数字→記号の変換速度は前頭葉の実行機能と海馬の短期記憶容量を同時に評価する純粋な処理速度指標。',
        emoji: '🔢',
        color: '#3b82f6',
    },
    {
        id: 'rapid_search',
        name: '高速視覚走査装置',
        desc: '混濁情報の中から標的信号を抽出する能力を測定。散布された類似字形群から正解を発見する速度は、視覚野の前注意処理効率を反映する。',
        emoji: '👁️',
        color: '#a855f7',
    },
    {
        id: 'choice_reaction',
        name: '選択反応速度測定器',
        desc: '多肢選択条件下での運動反応時間を精密計測。反応時間の対数変換値はヒックの法則に従い、処理速度指数（PSI）の最純粋な構成要素となる。',
        emoji: '🟢',
        color: '#22d3ee',
    },
    {
        id: 'rsvp',
        name: '高速継時視覚提示計',
        desc: '時間的解像度の高い注意の瞬き現象を利用。毎秒5〜8フレームで提示される文字列から標的を検出する能力は、大脳皮質の時間的情報処理帯域を示す。',
        emoji: '⚡',
        color: '#facc15',
    },
];

export default function Dashboard({ stats, onStartSession, onStartEndless, onDevMode, onStats, onToggleLang }: Props) {
    const [showScience, setShowScience] = useState(false);

    const historyData = stats.history.slice(-14);
    const labels = historyData.map(h => h.date.slice(5));
    const dataPoints = historyData.map(h => h.overallPSI);
    const psi = Math.round(stats.estimatedPSI);
    const c = psiColor(psi);

    const data = {
        labels: labels.length ? labels : ['初回'],
        datasets: [
            {
                fill: true,
                label: 'PSI',
                data: dataPoints.length ? dataPoints : [psi],
                borderColor: '#ff6600',
                backgroundColor: 'rgba(255,102,0,0.08)',
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#ff6600',
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                grid: { color: 'rgba(255,102,0,0.08)' },
                ticks: { color: '#ff6600', fontSize: 9 },
            },
            x: {
                grid: { display: false },
                ticks: { color: '#555', fontSize: 9 },
            },
        },
    };

    return (
        <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col overflow-y-auto no-scrollbar" style={{ background: '#000' }}>

            {/* NERV Header */}
            <header style={{ padding: '16px 16px 0', borderBottom: '1px solid #ff660030', marginBottom: '0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.55rem', color: '#ff6600', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2px' }}>
                            NERV研究機構 // システム稼働中
                        </div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
                            特殊処理速度<br />
                            <span style={{ color: '#ff6600' }}>向上装置</span>
                            <span style={{ fontSize: '0.7rem', color: '#555', marginLeft: '8px', fontWeight: 400 }}>V2.0</span>
                        </h1>
                        <div style={{ fontSize: '0.6rem', color: '#333', marginTop: '4px', fontFamily: 'monospace' }}>
                            処理速度指数向上システム
                        </div>
                    </div>
                    <button
                        onClick={onToggleLang}
                        style={{ fontSize: '0.7rem', padding: '5px 12px', background: '#0a0a0a', border: '1px solid #ff660040', borderRadius: '4px', color: '#ff6600', cursor: 'pointer', fontFamily: 'monospace', marginTop: '4px' }}
                    >
                        JA/EN
                    </button>
                </div>

                {/* Warning tape decorative bar */}
                <div style={{ display: 'flex', gap: '2px', marginTop: '12px', marginLeft: '-16px', marginRight: '-16px', height: '3px', overflow: 'hidden' }}>
                    {Array.from({ length: 40 }, (_, i) => (
                        <div key={i} style={{ flex: 1, background: i % 2 === 0 ? '#ff6600' : '#000' }} />
                    ))}
                </div>
            </header>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* PSI + Streak panel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Streak */}
                    <div style={{ padding: '16px', borderRadius: '0', background: '#0a0a0a', border: '1px solid #222', borderLeft: '3px solid #f97316', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.5rem', color: '#f97316', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>継続記録指数</div>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{stats.streak}</div>
                        <div style={{ fontSize: '0.55rem', color: '#555', marginTop: '2px' }}>連続稼動日数 // STREAK</div>
                    </div>
                    {/* Estimated PSI */}
                    <div style={{ padding: '16px', borderRadius: '0', background: '#0a0a0a', border: `1px solid ${c}40`, borderLeft: `3px solid ${c}`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.5rem', color: c, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>推定処理速度指数</div>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: c, lineHeight: 1 }}>{psi}</div>
                        <div style={{ fontSize: '0.5rem', color: c, opacity: 0.7, marginTop: '2px', fontWeight: 700 }}>{psiRank(psi)}</div>
                    </div>
                </div>

                {/* PSI trend chart */}
                <div style={{ padding: '14px', background: '#0a0a0a', border: '1px solid #ff660020', position: 'relative' }}>
                    <div style={{ fontSize: '0.5rem', color: '#ff6600', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '10px' }}>
                        ▸ PSI推移グラフ // 直近の記録
                    </div>
                    <div style={{ width: '100%', height: '8rem' }}>
                        <Line options={options} data={data} />
                    </div>
                </div>

                {/* Primary CTA */}
                <button
                    onClick={onStartSession}
                    style={{
                        width: '100%', padding: '1.4rem',
                        background: 'linear-gradient(135deg, #ff6600, #ff3300)',
                        color: '#000', fontSize: '1.2rem', fontWeight: 900,
                        borderRadius: '0', border: '1px solid #ff6600',
                        cursor: 'pointer',
                        boxShadow: '0 0 40px -8px rgba(255,102,0,0.6)',
                        letterSpacing: '0.05em',
                    }}
                    className="active:scale-95 transition-transform"
                >
                    ▲ 処理速度訓練開始
                    <div style={{ fontSize: '0.5rem', color: '#000', fontWeight: 400, marginTop: '2px', letterSpacing: '0.1em' }}>認知訓練セッション開始</div>
                </button>

                {/* Secondary CTAs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                        onClick={onStartEndless}
                        style={{ padding: '1rem', background: '#0a0a0a', color: '#ff6600', fontSize: '0.9rem', fontWeight: 700, border: '1px solid #ff660060', borderRadius: '0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                        className="active:scale-95 transition-transform"
                    >
                        <span style={{ fontSize: '1.4rem' }}>∞</span>
                        <span style={{ fontSize: '0.85rem' }}>無限訓練モード</span>
                        <span style={{ fontSize: '0.5rem', color: '#555', letterSpacing: '0.1em' }}>無限訓練モード</span>
                    </button>
                    <button
                        onClick={onStats}
                        style={{ padding: '1rem', background: '#0a0a0a', color: '#555', fontSize: '0.9rem', fontWeight: 700, border: '1px solid #222', borderRadius: '0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                        className="active:scale-95 transition-transform"
                    >
                        <span style={{ fontSize: '1.4rem' }}>📊</span>
                        <span style={{ fontSize: '0.85rem' }}>統計解析閲覧</span>
                        <span style={{ fontSize: '0.5rem', color: '#333', letterSpacing: '0.1em' }}>統計閲覧</span>
                    </button>
                </div>

                {/* Science accordion */}
                <div style={{ border: '1px solid #ff660030', background: '#0a0a0a' }}>
                    <button
                        onClick={() => setShowScience(v => !v)}
                        style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}
                    >
                        <span style={{ fontSize: '0.7rem', color: '#ff6600', fontWeight: 700, letterSpacing: '0.15em' }}>
                            ★ 科学的根拠 // 各モジュールの理論的背景
                        </span>
                        <span style={{ color: '#ff6600', fontSize: '0.8rem' }}>{showScience ? '▲' : '▼'}</span>
                    </button>

                    {showScience && (
                        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <p style={{ fontSize: '0.7rem', color: '#888', lineHeight: 1.7, borderLeft: '2px solid #ff660060', paddingLeft: '10px' }}>
                                <strong style={{ color: '#ff6600' }}>処理速度指数（PSI）</strong>とは、ウェクスラー知能検査（WAIS-IV）の下位指標であり、<strong style={{ color: '#aaa' }}>視覚的刺激への時間内反応能力</strong>を定量化したものである。従来の知能評価では測定しがたい「速さ」という次元を科学的に数値化する。
                            </p>
                            <p style={{ fontSize: '0.7rem', color: '#888', lineHeight: 1.7, borderLeft: '2px solid #ff660060', paddingLeft: '10px' }}>
                                本システムはヒックの法則（反応時間は選択肢数の対数に比例する）、フィッツの法則、およびRSVP（Rapid Serial Visual Presentation）技術を応用し、<strong style={{ color: '#aaa' }}>大脳皮質の情報処理効率を多次元的に評価</strong>する訓練装置である。
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                {GAME_INFO.map(g => (
                                    <div key={g.id} style={{ padding: '10px 12px', borderLeft: `3px solid ${g.color}`, background: '#0d0d0d' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '1rem' }}>{g.emoji}</span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: g.color }}>{g.name}</span>
                                        </div>
                                        <p style={{ fontSize: '0.65rem', color: '#666', lineHeight: 1.6, margin: 0 }}>{g.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.55rem', color: '#222', fontFamily: 'monospace', lineHeight: 1.5 }}>
                        システムバージョン v2.0.0<br />
                        認知エンジン稼働中
                    </div>
                    <button
                        onClick={onDevMode}
                        style={{ color: '#1a1a1a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'monospace' }}
                    >
                        [開発モード]
                    </button>
                </div>

            </div>
        </div>
    );
}
