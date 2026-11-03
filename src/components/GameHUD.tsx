import React, { useEffect, useState } from 'react';
import { GameMetrics } from '../game/types.ts';

interface GameHUDProps {
  metrics: GameMetrics;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleAutoFire: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  metrics,
  onPause,
  onToggleMute,
  onToggleAutoFire,
}) => {
  // Ghost health bar for delayed damage feedback
  const [ghostHp, setGhostHp] = useState(metrics.hp);

  useEffect(() => {
    if (metrics.hp < ghostHp) {
      const timer = setTimeout(() => {
        setGhostHp((prev) => Math.max(metrics.hp, prev - 4));
      }, 120);
      return () => clearTimeout(timer);
    } else if (metrics.hp > ghostHp) {
      setGhostHp(metrics.hp);
    }
  }, [metrics.hp, ghostHp]);

  const isBull = metrics.sentiment === 'BULL_RUN';
  const sentimentColor = isBull ? '#00FFA3' : '#FF3B56';
  const hpPercent = Math.max(0, Math.min(100, (metrics.hp / metrics.maxHp) * 100));
  const ghostPercent = Math.max(0, Math.min(100, (ghostHp / metrics.maxHp) * 100));

  // Multiplier color class
  const getMultColor = (m: number) => {
    if (m >= 10) return 'text-[#00FFA3] border-[#00FFA3] glow-green';
    if (m >= 5) return 'text-amber-400 border-amber-400';
    if (m >= 2) return 'text-cyan-400 border-cyan-400';
    return 'text-slate-400 border-slate-600';
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
      {/* ================= TOP PERIMETER STRIP ================= */}
      <div className="flex items-start justify-between w-full gap-4">
        {/* Top-Left: Portfolio & Multiplier Cluster */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 tracking-wider">
              PORTFOLIO VALUE
            </span>
            <div
              className={`text-[10px] font-cyber font-bold px-1.5 py-0.5 border rounded-xs ${getMultColor(
                metrics.multiplier
              )}`}
            >
              {metrics.multiplier}X YIELD
            </div>
          </div>
          <div className="flex items-baseline gap-1 text-2xl sm:text-4xl font-cyber font-black tracking-tight text-white glow-green tabular-nums">
            <span className="text-[#00FFA3] text-xl sm:text-2xl">$</span>
            <span>{metrics.score.toLocaleString()}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
            PEAK ATH: ${metrics.highScore.toLocaleString()}
          </div>
        </div>

        {/* Top-Center: Market Sentiment & Cycle Index Meter */}
        <div className="flex flex-col items-center max-w-xs sm:max-w-md w-full px-2">
          {/* Sentiment Badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: sentimentColor }}
            />
            <span
              className="text-xs sm:text-sm font-cyber font-black tracking-widest px-2.5 py-0.5 rounded-xs border"
              style={{
                color: sentimentColor,
                borderColor: sentimentColor,
                backgroundColor: isBull ? 'rgba(0, 255, 163, 0.1)' : 'rgba(255, 59, 86, 0.12)',
              }}
            >
              {isBull ? '▲ BULL RUN CYCLE' : '▼ BEAR CRASH CASCADE'}
            </span>
            <span className="text-xs font-mono font-bold tabular-nums text-slate-300">
              {metrics.cycleTimeRemaining.toFixed(1)}s
            </span>
          </div>

          {/* Market Index Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>INDEX: {metrics.marketIndex}%</span>
              <span>
                NEXT MULTIPLIER:{' '}
                {metrics.marketIndex < 25 ? '2X (25%)' : metrics.marketIndex < 50 ? '5X (50%)' : metrics.marketIndex < 80 ? '10X (80%)' : 'MAX (10X)'}
              </span>
            </div>
            <div className="h-2 w-full bg-[#12141c] border border-slate-700 rounded-xs overflow-hidden relative">
              {/* Threshold markers */}
              <div className="absolute top-0 bottom-0 left-[25%] w-[1px] bg-slate-600 z-10" />
              <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-slate-600 z-10" />
              <div className="absolute top-0 bottom-0 left-[80%] w-[1px] bg-[#00FFA3]/70 z-10" />

              <div
                className="h-full transition-all duration-100 ease-out"
                style={{
                  width: `${metrics.marketIndex}%`,
                  backgroundColor: sentimentColor,
                  boxShadow: `0 0 10px ${sentimentColor}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right: Utility Controls Cluster */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Auto-fire toggle */}
          <button
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAutoFire();
            }}
            title="Toggle Auto-Fire [F]"
            className={`px-2.5 py-1 text-xs font-mono font-semibold border rounded-xs transition-colors cursor-pointer ${
              metrics.autoFire
                ? 'bg-[#00FFA3]/20 border-[#00FFA3] text-[#00FFA3]'
                : 'bg-[#12141c] border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            AUTO [F]: {metrics.autoFire ? 'ON' : 'OFF'}
          </button>

          {/* Mute button */}
          <button
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            title="Toggle Sound [M]"
            aria-label="Toggle Sound"
            className="w-8 h-8 flex items-center justify-center bg-[#12141c] border border-slate-700 hover:border-slate-500 rounded-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {metrics.isMuted ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          {/* Pause button */}
          <button
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            title="Pause Game [Esc / P]"
            aria-label="Pause Game"
            className="w-8 h-8 flex items-center justify-center bg-[#12141c] border border-slate-700 hover:border-slate-500 rounded-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* ================= BOTTOM PERIMETER STRIP ================= */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Vitality Cluster */}
        <div className="flex flex-col gap-1 w-56 sm:w-64">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold">SHIP INTEGRITY</span>
            <span
              className={`font-cyber font-bold tabular-nums ${
                metrics.hp <= 30 ? 'text-[#FF3B56] animate-pulse' : 'text-[#00FFA3]'
              }`}
            >
              {metrics.hp} / {metrics.maxHp} HP
            </span>
          </div>

          {/* Health Bar with Ghost Damage */}
          <div className="h-3 w-full bg-[#12141c] border border-slate-700 rounded-xs overflow-hidden relative">
            {/* Ghost bar */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-[#FF3B56]/50 transition-all duration-300"
              style={{ width: `${ghostPercent}%` }}
            />
            {/* Active HP bar */}
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${hpPercent}%`,
                backgroundColor: metrics.hp <= 30 ? '#FF3B56' : '#00FFA3',
                boxShadow: metrics.hp <= 30 ? '0 0 10px #FF3B56' : '0 0 10px #00FFA3',
              }}
            />
          </div>

          {/* Health Pips */}
          <div className="flex gap-1 mt-0.5">
            {[...Array(5)].map((_, i) => {
              const active = metrics.hp >= (i + 1) * 20;
              return (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-xs transition-colors ${
                    active ? (metrics.hp <= 30 ? 'bg-[#FF3B56]' : 'bg-[#00FFA3]') : 'bg-slate-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom-Right: Session Telemetry */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 tabular-nums">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500">SURVIVAL TIME</span>
            <span className="text-slate-200 font-bold font-cyber">
              {Math.floor(metrics.timeSurvived / 60)
                .toString()
                .padStart(2, '0')}
              :{(metrics.timeSurvived % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500">LIQUIDATIONS</span>
            <span className="text-slate-200 font-bold font-cyber">
              {metrics.enemiesKilled} BOTS
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500">YIELD TOKENS</span>
            <span className="text-[#00FFA3] font-bold font-cyber">
              {metrics.tokensCollected} $
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
