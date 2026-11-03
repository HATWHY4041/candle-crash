import React, { useEffect } from 'react';
import { GameMetrics } from '../game/types.ts';

interface GameOverModalProps {
  metrics: GameMetrics;
  onRetry: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  metrics,
  onRetry,
  onTitle,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onRetry();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onRetry]);

  const isNewHighScore = metrics.score >= metrics.highScore && metrics.score > 0;
  const minutes = Math.floor(metrics.timeSurvived / 60);
  const seconds = metrics.timeSurvived % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 select-none animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e1017] border-2 border-[#FF3B56] p-6 sm:p-8 rounded-sm shadow-[0_0_50px_rgba(255,59,86,0.4)]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#FF3B56]/30 pb-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B56] animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-[#FF3B56] tracking-wider">
              MARGIN CALL // ACCOUNT FORCED LIQUIDATION
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">SESSION TERMINATED</span>
        </div>

        {/* Title Lockup */}
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl font-cyber font-black tracking-wider text-white glow-red">
            PORTFOLIO WIPED
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Excessive volatility detected. Your position was liquidated by the market.
          </p>
        </div>

        {/* Highlight Score Hero */}
        <div className="bg-[#151822] border border-slate-700 p-4 rounded-xs text-center mb-6">
          <span className="text-[10px] font-mono text-slate-400 tracking-wider">
            FINAL REALIZED PORTFOLIO
          </span>
          <div className="text-3xl sm:text-4xl font-cyber font-black text-[#00FFA3] glow-green tabular-nums mt-1">
            ${metrics.score.toLocaleString()}
          </div>
          {isNewHighScore && (
            <div className="inline-block mt-1 px-2 py-0.5 bg-[#00FFA3]/20 border border-[#00FFA3] text-[#00FFA3] text-[10px] font-cyber font-bold tracking-wider rounded-xs animate-bounce">
              ★ NEW ALL-TIME HIGH RECORD ★
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-7 text-center font-mono">
          <div className="bg-[#12141c] border border-slate-800 p-2.5 rounded-xs">
            <span className="text-[10px] text-slate-500 block">TIME SURVIVED</span>
            <span className="text-base sm:text-lg font-cyber font-bold text-white tabular-nums">
              {timeFormatted}
            </span>
          </div>
          <div className="bg-[#12141c] border-slate-800 border p-2.5 rounded-xs">
            <span className="text-[10px] text-slate-500 block">BOTS DESTROYED</span>
            <span className="text-base sm:text-lg font-cyber font-bold text-[#FF3B56] tabular-nums">
              {metrics.enemiesKilled}
            </span>
          </div>
          <div className="bg-[#12141c] border-slate-800 border p-2.5 rounded-xs">
            <span className="text-[10px] text-slate-500 block">TOKENS MINED</span>
            <span className="text-base sm:text-lg font-cyber font-bold text-[#00FFA3] tabular-nums">
              {metrics.tokensCollected}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            data-start="true"
            onClick={onRetry}
            className="flex-1 py-3.5 bg-[#00FFA3] hover:bg-[#20fdb0] active:scale-95 text-[#0a0b10] font-cyber font-black tracking-widest text-base rounded-xs transition-all shadow-[0_0_20px_rgba(0,255,163,0.5)] cursor-pointer"
          >
            RETRY SPRINT (SPACE ↵)
          </button>
          <button
            onClick={onTitle}
            className="py-3.5 px-6 bg-[#1a1d28] hover:bg-[#222634] text-slate-300 hover:text-white font-mono font-bold text-xs tracking-wider border border-slate-700 rounded-xs transition-colors cursor-pointer"
          >
            TERMINAL MENU
          </button>
        </div>
      </div>
    </div>
  );
};
