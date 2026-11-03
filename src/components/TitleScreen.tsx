import React, { useEffect } from 'react';

interface TitleScreenProps {
  onStart: () => void;
  highScore: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, highScore }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-none select-none">
      {/* Top bar info */}
      <div className="w-full max-w-5xl flex items-center justify-between text-xs sm:text-sm text-slate-400 font-mono tracking-wider">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse"></span>
          <span>MARKET TICKER // SIM_RUNNING</span>
        </div>
        <div className="text-right">
          <span className="text-slate-500">ALL-TIME HIGH: </span>
          <span className="text-[#00FFA3] font-bold tabular-nums font-cyber">
            ${highScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Centerpiece & Title Lockup */}
      <div className="flex flex-col items-center text-center max-w-3xl my-auto">
        {/* Bespoke Inline SVG Title Emblem */}
        <div className="w-72 sm:w-96 mb-2">
          <svg viewBox="0 0 400 110" className="w-full drop-shadow-[0_0_20px_rgba(0,255,163,0.35)]">
            {/* Cyber circuit borders */}
            <path
              d="M 10 30 L 30 10 L 370 10 L 390 30 L 390 80 L 370 100 L 30 100 L 10 80 Z"
              fill="rgba(10, 11, 16, 0.85)"
              stroke="#00FFA3"
              strokeWidth="2"
            />
            <path
              d="M 30 18 L 370 18"
              stroke="#00FFA3"
              strokeWidth="1"
              strokeDasharray="4 6"
              strokeOpacity="0.5"
            />
            {/* Bull vs Bear market candles mini icon in center */}
            <rect x="45" y="42" width="6" height="26" fill="#00FFA3" />
            <line x1="48" y1="36" x2="48" y2="74" stroke="#00FFA3" strokeWidth="1.5" />
            <rect x="57" y="52" width="6" height="18" fill="#FF3B56" />
            <line x1="60" y1="46" x2="60" y2="76" stroke="#FF3B56" strokeWidth="1.5" />
            <rect x="69" y="38" width="6" height="32" fill="#00FFA3" />
            <line x1="72" y1="30" x2="72" y2="78" stroke="#00FFA3" strokeWidth="1.5" />

            {/* Typography */}
            <text
              x="230"
              y="56"
              fill="#FFFFFF"
              fontFamily="var(--font-cyber, monospace)"
              fontWeight="900"
              fontSize="27"
              letterSpacing="3"
              textAnchor="middle"
            >
              ROGUEMARKET
            </text>
            <text
              x="230"
              y="84"
              fill="#00FFA3"
              fontFamily="var(--font-cyber, monospace)"
              fontWeight="700"
              fontSize="16"
              letterSpacing="6"
              textAnchor="middle"
            >
              // BULL RUN
            </text>
          </svg>
        </div>

        <p className="text-slate-300 font-mono text-xs sm:text-sm tracking-wide max-w-lg mb-6">
          A high-frequency arcade survival sprint. Ride the parabolic Bull Run, withstand missile liquidation cascades, and harvest pure market alpha.
        </p>

        {/* Market Mechanics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mb-7 text-left text-xs font-mono">
          <div className="p-3.5 border border-[#00FFA3]/40 bg-[#0a0b10]/90 rounded-sm box-glow-green">
            <div className="flex items-center gap-1.5 text-[#00FFA3] font-bold font-cyber mb-1">
              <span className="text-base">▲</span> BULL RUN (EVERY 15S)
            </div>
            <p className="text-slate-400 leading-relaxed">
              +50% Speed Boost, multi-angle spread fire, and leaves a fiery trail of green profit particles that incinerates pursuers.
            </p>
          </div>

          <div className="p-3.5 border border-[#FF3B56]/40 bg-[#0a0b10]/90 rounded-sm box-glow-red">
            <div className="flex items-center gap-1.5 text-[#FF3B56] font-bold font-cyber mb-1">
              <span className="text-base">▼</span> BEAR CRASH (EVERY 15S)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Red liquidation candles plunge from above like orbital missiles. Enemy spawn rates double and heavy Bear Golems charge.
            </p>
          </div>
        </div>

        {/* Primary Start CTA Button */}
        <div className="pointer-events-auto">
          <button
            data-start="true"
            onClick={onStart}
            className="group relative px-10 py-4 bg-[#00FFA3] hover:bg-[#1cfcac] active:scale-95 text-[#0a0b10] font-cyber font-black tracking-widest text-lg sm:text-xl rounded-sm transition-all duration-150 shadow-[0_0_30px_rgba(0,255,163,0.6)] cursor-pointer"
          >
            <span className="relative z-10 flex items-center gap-3">
              <span>START SPRINT</span>
              <span className="text-sm font-mono tracking-normal px-2 py-0.5 bg-black/20 rounded">
                ENTER ↵
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Flat control hint line (Phone & PC) */}
      <div className="w-full text-center text-[10px] sm:text-xs text-slate-400 font-mono tracking-wider border-t border-slate-800/80 pt-2.5 pb-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4">
        <span><strong className="text-[#00FFA3]">PC:</strong> WASD Move · Mouse Aim & Click · Space Dash · Esc Pause</span>
        <span className="hidden sm:inline text-slate-600">|</span>
        <span><strong className="text-[#FF3B56]">PHONE:</strong> Left Thumb Move · Right Thumb Aim & Shoot · Quick Dash</span>
      </div>
    </div>
  );
};
