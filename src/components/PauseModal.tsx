import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onTitle,
  onToggleMute,
  isMuted,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 select-none">
      <div className="relative w-full max-w-sm bg-[#0e1017] border border-[#00FFA3]/50 p-6 rounded-sm shadow-[0_0_35px_rgba(0,255,163,0.3)] text-center">
        {/* Terminal Header */}
        <div className="flex items-center justify-center gap-2 mb-4 text-[#00FFA3]">
          <span className="w-2 h-2 rounded-full bg-[#00FFA3] animate-ping" />
          <h2 className="text-xl font-cyber font-black tracking-widest text-white glow-green">
            SIMULATION PAUSED
          </h2>
        </div>

        <p className="text-xs font-mono text-slate-400 mb-6">
          System state frozen. Market fluctuations halted.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 font-mono">
          <button
            onClick={onResume}
            className="w-full py-3 bg-[#00FFA3] hover:bg-[#1efcad] active:scale-95 text-[#0a0b10] font-cyber font-bold tracking-widest text-sm rounded-xs transition-all shadow-[0_0_15px_rgba(0,255,163,0.4)] cursor-pointer"
          >
            RESUME SPRINT [ESC / P]
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-[#181b26] hover:bg-[#202433] text-slate-200 border border-slate-700 text-xs font-bold tracking-wider rounded-xs transition-colors cursor-pointer"
          >
            RESTART SPRINT
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 bg-[#181b26] hover:bg-[#202433] text-slate-200 border border-slate-700 text-xs font-bold tracking-wider rounded-xs transition-colors cursor-pointer"
          >
            AUDIO: {isMuted ? 'UNMUTE [M]' : 'MUTE [M]'}
          </button>

          <button
            onClick={onTitle}
            className="w-full py-2.5 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-xs tracking-wider transition-colors cursor-pointer"
          >
            EXIT TO TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
};
