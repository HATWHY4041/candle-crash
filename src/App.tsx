import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine.ts';
import { GameMetrics, GamePhase } from './game/types.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { MobileControls } from './components/MobileControls.tsx';

const DEFAULT_METRICS: GameMetrics = {
  score: 0,
  highScore: 0,
  multiplier: 1,
  marketIndex: 20,
  sentiment: 'BULL_RUN',
  cycleTimeRemaining: 15,
  cycleDuration: 15,
  hp: 100,
  maxHp: 100,
  timeSurvived: 0,
  enemiesKilled: 0,
  tokensCollected: 0,
  autoFire: false,
  isMuted: false,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [metrics, setMetrics] = useState<GameMetrics>(DEFAULT_METRICS);

  // Active by default for phone and touch readiness, with manual toggle persistence
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('roguemarket_touch_controls');
    if (stored !== null) return stored === 'true';
    return true; // Always default to true so mobile users immediately see touch controls!
  });

  const handleToggleTouchControls = () => {
    setShowTouchControls((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('roguemarket_touch_controls', String(next));
      } catch {}
      return next;
    });
  };

  // Initialize Canvas & Engine once
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.setCallbacks(
      (newMetrics) => {
        setMetrics(newMetrics);
      },
      (finalMetrics) => {
        setPhase('gameover');
        setMetrics(finalMetrics);
      },
      (newPhase) => {
        setPhase(newPhase);
      }
    );

    // Initial state
    document.body.dataset.state = 'title';
    setMetrics(engine.getMetrics());
    engine.startLoop();

    // Check ?autostart=1 support
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      engine.startSprint();
    }

    return () => {
      engine.unbindEvents();
      engine.stopLoop();
    };
  }, []);

  const handleStartSprint = () => {
    engineRef.current?.startSprint();
  };

  const handlePause = () => {
    engineRef.current?.pause();
  };

  const handleResume = () => {
    engineRef.current?.resume();
  };

  const handleRetry = () => {
    engineRef.current?.retry();
  };

  const handleGoToTitle = () => {
    engineRef.current?.goToTitle();
  };

  const handleToggleMute = () => {
    if (engineRef.current) {
      const isMuted = engineRef.current.toggleMute();
      setMetrics((prev) => ({ ...prev, isMuted }));
    }
  };

  const handleToggleAutoFire = () => {
    if (engineRef.current) {
      const autoFire = engineRef.current.toggleAutoFire();
      setMetrics((prev) => ({ ...prev, autoFire }));
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0b10] select-none scanlines">
      {/* 60 FPS HTML5 Canvas Viewport */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="block absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* Title Screen Overlay */}
      {phase === 'title' && (
        <TitleScreen onStart={handleStartSprint} highScore={metrics.highScore} />
      )}

      {/* Playing HUD (Active during Playing and Paused) */}
      {(phase === 'playing' || phase === 'paused') && (
        <GameHUD
          metrics={metrics}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onToggleAutoFire={handleToggleAutoFire}
          showTouchControls={showTouchControls}
          onToggleTouchControls={handleToggleTouchControls}
        />
      )}

      {/* Mobile On-Screen Virtual Controls */}
      {showTouchControls && (phase === 'playing' || phase === 'paused') && (
        <MobileControls
          onMove={(x, y) => engineRef.current?.setVirtualMove(x, y)}
          onAim={(angle, active, isFiring) =>
            engineRef.current?.setVirtualAim(angle, active, isFiring)
          }
          onFireHeld={(isFiring) => engineRef.current?.setVirtualFire(isFiring)}
          onDash={() => engineRef.current?.triggerDash()}
          onToggleAutoFire={handleToggleAutoFire}
          autoFire={metrics.autoFire}
        />
      )}

      {/* Paused Modal */}
      {phase === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRetry}
          onTitle={handleGoToTitle}
          onToggleMute={handleToggleMute}
          isMuted={metrics.isMuted}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <GameOverModal
          metrics={metrics}
          onRetry={handleRetry}
          onTitle={handleGoToTitle}
        />
      )}
    </div>
  );
}
