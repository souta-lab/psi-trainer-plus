import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import SessionManager from './components/SessionManager';
import GameDevMode from './components/GameDevMode';
import StatsPage from './components/StatsPage';
import {
  loadUserStats, saveUserStats, updateStreak,
  type UserStats, type GameResult, getTodayDateString,
  buildGameLevelsFromResults,
} from './utils/storage';
import { calculatePSI } from './utils/engine';
import { setLanguage, getLanguage, t } from './utils/i18n';

function fireConfetti() {
  import('canvas-confetti').then(m => {
    const fn = (m as unknown as { default: (o: object) => void }).default;
    fn({ particleCount: 200, spread: 80, origin: { y: 0.55 }, colors: ['#ff6600', '#ff0000', '#00ffcc', '#fff'] });
  });
}

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

type AppState = 'dashboard' | 'session' | 'endless' | 'summary' | 'devmode' | 'stats';

function App() {
  const [appState, setAppState] = useState<AppState>('dashboard');
  const [stats, setStats] = useState<UserStats>(loadUserStats());
  const [, setForceRender] = useState({});
  const [endlessMinutes, setEndlessMinutes] = useState(20);
  const [showEndlessConfig, setShowEndlessConfig] = useState(false);
  const [lastSessionResults, setLastSessionResults] = useState<GameResult[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // ESC closes endless modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowEndlessConfig(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSessionComplete = (results: GameResult[]) => {
    if (results.length === 0) { setAppState('dashboard'); return; }
    let totalScore = 0;
    results.forEach(r => { totalScore += calculatePSI(r.accuracy, r.avgRT, r.level ?? 5, r.gameId); });
    const sessionPSI = Math.round(totalScore / results.length);
    const record = sessionPSI > stats.estimatedPSI;
    setIsNewRecord(record);
    if (record) fireConfetti();

    const today = getTodayDateString();
    const newHistory = [...stats.history];
    const todayIndex = newHistory.findIndex(h => h.date === today);
    const entry = { date: today, games: results, overallPSI: sessionPSI };
    if (todayIndex >= 0) newHistory[todayIndex] = entry;
    else newHistory.push(entry);

    const newEstimatedPSI = Math.round(stats.estimatedPSI * 0.3 + sessionPSI * 0.7);
    // Save per-game levels so next session continues from where this one ended
    const updatedLevels = buildGameLevelsFromResults(results, stats.gameLevels ?? {});
    let nextStats: UserStats = {
      ...stats,
      history: newHistory,
      estimatedPSI: Math.max(1, newEstimatedPSI),
      gameLevels: updatedLevels,
      totalSessions: (stats.totalSessions ?? 0) + 1,
      totalTrials: (stats.totalTrials ?? 0) + results.length,
    };
    nextStats = updateStreak(nextStats);
    setStats(nextStats);
    saveUserStats(nextStats);
    setLastSessionResults(results);
    setAppState('summary');
  };

  const toggleLanguage = () => { setLanguage(getLanguage() === 'ja' ? 'en' : 'ja'); setForceRender({}); };
  const sessionPSI = lastSessionResults.length > 0
    ? Math.round(lastSessionResults.reduce((s, r) => s + calculatePSI(r.accuracy, r.avgRT, r.level ?? 5, r.gameId), 0) / lastSessionResults.length)
    : 0;

  return (
    <div className="w-full min-h-screen flex flex-col font-sans" style={{ background: '#000', color: '#f0f0f0' }}>

      {appState === 'dashboard' && (
        <Dashboard
          stats={stats}
          onStartSession={() => setAppState('session')}
          onStartEndless={() => setShowEndlessConfig(true)}
          onDevMode={() => setAppState('devmode')}
          onStats={() => setAppState('stats')}
          onToggleLang={toggleLanguage}
        />
      )}

      {/* Endless mode config modal */}
      {showEndlessConfig && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEndlessConfig(false); }}
        >
          <div
            className="flex flex-col items-center gap-5 p-8 rounded-3xl"
            style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', width: 'min(90vw, 360px)' }}
          >
            <div className="flex flex-col items-center gap-1">
              <span style={{ fontSize: '2rem' }}>∞</span>
              <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>エンドレスモード</h2>
              <p style={{ color: '#444', fontSize: '0.75rem' }}>自分のペースで練習</p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full">
              <span style={{ color: '#ff6600', fontSize: '3rem', fontWeight: 900, lineHeight: 1, fontFamily: 'monospace', textShadow: '0 0 20px rgba(255,102,0,0.5)' }}>
                {endlessMinutes}<span style={{ fontSize: '1rem', marginLeft: '4px' }}>分</span>
              </span>
              <input
                type="range" min={5} max={60} step={5} value={endlessMinutes}
                onChange={e => setEndlessMinutes(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#ff6600', cursor: 'pointer' }}
              />
              <span style={{ color: '#555', fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '0.1em' }}>時間ベース・無制限訓練モード</span>
            </div>
            <button
              onClick={() => { setShowEndlessConfig(false); setAppState('endless'); }}
              style={{ width: '100%', padding: '1rem', background: '#ff6600', color: '#000', fontWeight: 700, fontSize: '1.05rem', borderRadius: '1rem', border: 'none', cursor: 'pointer' }}
              className="active:scale-95 transition-transform"
            >
              スタート！
            </button>
            <button
              onClick={() => setShowEndlessConfig(false)}
              style={{ color: '#333', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              キャンセル（ESCキー）
            </button>
          </div>
        </div>
      )}

      {appState === 'session' && (
        <SessionManager
          sessionLength={6}
          initialLevels={stats.gameLevels}
          onSessionComplete={handleSessionComplete}
        />
      )}
      {appState === 'endless' && (
        <SessionManager
          durationMinutes={endlessMinutes}
          initialLevels={stats.gameLevels}
          onSessionComplete={handleSessionComplete}
          onMilestone={(last6) => {
            // Save snapshot every 6 games so stats charts update live during endless
            let totalScore = 0;
            last6.forEach(r => { totalScore += calculatePSI(r.accuracy, r.avgRT, r.level ?? 5, r.gameId); });
            const milPSI = Math.round(totalScore / last6.length);
            const today = getTodayDateString();
            const newHistory = [...stats.history];
            const todayIndex = newHistory.findIndex(h => h.date === today);
            const entry = { date: today, games: last6, overallPSI: milPSI };
            if (todayIndex >= 0) {
              // Append to existing day's games
              newHistory[todayIndex] = {
                ...newHistory[todayIndex],
                games: [...newHistory[todayIndex].games, ...last6],
                overallPSI: Math.round((newHistory[todayIndex].overallPSI + milPSI) / 2),
              };
            } else {
              newHistory.push(entry);
            }
            const updatedLevels = buildGameLevelsFromResults(last6, stats.gameLevels ?? {});
            const nextStats = { ...stats, history: newHistory, gameLevels: updatedLevels };
            setStats(nextStats);
            saveUserStats(nextStats);
          }}
        />
      )}
      {appState === 'devmode' && <GameDevMode onBack={() => setAppState('dashboard')} />}
      {appState === 'stats' && <StatsPage stats={stats} onBack={() => setAppState('dashboard')} />}

      {appState === 'summary' && (
        <div
          className="flex-1 flex flex-col items-center p-6 gap-5 overflow-y-auto no-scrollbar"
          style={{ background: '#000', minHeight: '100vh' }}
        >
          <div className="flex flex-col items-center gap-2 mt-8">
            {isNewRecord && (
              <div style={{ padding: '4px 16px', borderRadius: '0', background: 'rgba(255,102,0,0.1)', border: '1px solid #ff6600', color: '#ff6600', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                ⚠ 新記録更新検知
              </div>
            )}
            <div style={{ fontSize: '0.5rem', color: '#ff6600', letterSpacing: '0.2em', fontWeight: 700, fontFamily: 'monospace' }}>訓練完了</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>処理速度訓練結果</h2>
          </div>

          {/* Session PSI */}
          <div style={{
            padding: '1.25rem 3rem', borderRadius: '0',
            background: '#0a0a0a', border: `1px solid ${psiColor(sessionPSI)}`, borderLeft: `4px solid ${psiColor(sessionPSI)}`,
            boxShadow: `0 0 40px -10px ${psiColor(sessionPSI)}50`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            <span style={{ fontSize: '0.5rem', color: '#ff6600', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: 'monospace' }}>処理速度指数</span>
            <span style={{ fontSize: '4.5rem', fontWeight: 900, color: psiColor(sessionPSI), lineHeight: 1, textShadow: `0 0 40px ${psiColor(sessionPSI)}60` }}>{sessionPSI}</span>
            <span style={{ fontSize: '0.75rem', color: psiColor(sessionPSI), opacity: 0.9, fontWeight: 700, fontFamily: 'monospace' }}>
              {psiLabel(sessionPSI)}
            </span>
          </div>

          {/* Per-game breakdown */}
          {lastSessionResults.length > 0 && (
            <div style={{ width: '100%', maxWidth: '22rem' }}>
              <div style={{ fontSize: '0.55rem', color: '#ff6600', fontWeight: 700, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: '8px' }}>▸ ゲーム別成績</div>
              <div className="flex flex-col gap-2">
                {lastSessionResults.map((r, i) => {
                  const s = calculatePSI(r.accuracy, r.avgRT, r.level ?? 5, r.gameId);
                  const gameLabel: Record<string, string> = {
                    double_decision: '瞬間二重判定装置',
                    symbol_search: '記号高速探索システム',
                    digit_symbol: '数字符号変換エンジン',
                    rapid_search: '高速視覚走査装置',
                    choice_reaction: '選択反応速度測定器',
                    rsvp: '高速継時視覚提示計',
                  };
                  const gameName = gameLabel[r.gameId] ?? r.gameId;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
                      <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: psiColor(s), flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888' }}>{gameName}</div>
                        <div style={{ fontSize: '0.65rem', color: '#444' }}>{Math.round(r.accuracy * 100)}% • {Math.round(r.avgRT)}ms • Lv.{r.level}</div>
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: psiColor(s) }}>{s}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PSI history bars */}
          {stats.history.length > 1 && (
            <div style={{ width: '100%', maxWidth: '22rem', padding: '12px', borderRadius: '12px', background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '0.6rem', color: '#333', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.55rem', color: '#ff6600', fontWeight: 700, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: '8px' }}>▸ 直近セッション履歴</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px' }}>
                {stats.history.slice(-10).map((h, i, arr) => {
                  const maxPSI = Math.max(...arr.map(x => x.overallPSI));
                  const pct = maxPSI > 0 ? h.overallPSI / maxPSI : 0;
                  return (
                    <div key={i} style={{ flex: 1, height: `${Math.max(8, pct * 100)}%`, borderRadius: '2px', background: psiColor(h.overallPSI), opacity: i === arr.length - 1 ? 1 : 0.4, transition: 'height 0.5s ease' }} />
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '22rem' }}>
            <button
              onClick={() => setAppState('stats')}
              style={{ flex: 1, padding: '0.9rem', background: '#0a0a0a', color: '#ff6600', fontWeight: 700, borderRadius: '0', border: '1px solid #ff660040', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}
              className="active:scale-95 transition-transform"
            >
              📊 統計解析閲覧
            </button>
            <button
              onClick={() => setAppState('dashboard')}
              style={{ flex: 1, padding: '0.9rem', background: '#0a0a0a', color: '#ccc', fontWeight: 700, borderRadius: '0', border: '1px solid #222', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}
              className="active:scale-95 transition-transform"
            >
              {t('finish')} →
            </button>
          </div>
          <div style={{ height: '2rem' }} />
        </div>
      )}
    </div>
  );
}

export default App;
