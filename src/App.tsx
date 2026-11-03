import React, { useEffect, useRef, useState, useTransition } from 'react';
import { GameEngine } from './game/engine.ts';
import { GameMetrics, GamePhase, PlayerProfile } from './game/types.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { MobileControls } from './components/MobileControls.tsx';
import { PlayerDashboard } from './components/PlayerDashboard.tsx';
import {
  loadProfiles,
  saveProfiles,
  recordRunToProfile,
  createDefaultProfile,
} from './game/account.ts';
import { audio } from './game/audio.ts';

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

  // Player Profiles & Account State
  const [profilesData, setProfilesData] = useState<{ profiles: PlayerProfile[]; activeId: string }>(
    () => loadProfiles()
  );
  const [showDashboard, setShowDashboard] = useState<boolean>(false);

  const activeProfile =
    profilesData.profiles.find((p) => p.id === profilesData.activeId) ||
    profilesData.profiles[0] ||
    createDefaultProfile();

  // Touch controls state
  const [showTouchControls, setShowTouchControls] = useState<boolean>(
    () => activeProfile.settings.showTouchControls
  );

  // Apply profile settings into the game engine and audio
  const applySettingsToEngine = (profile: PlayerProfile) => {
    if (engineRef.current) {
      engineRef.current.setScreenShakeMultiplier(profile.settings.screenShakeIntensity);
    }
    audio.setMasterVolume(profile.settings.masterVolume);
    setShowTouchControls(profile.settings.showTouchControls);
  };

  const handleUpdateProfile = (updated: PlayerProfile) => {
    const updatedProfiles = profilesData.profiles.map((p) =>
      p.id === updated.id ? updated : p
    );
    setProfilesData((prev) => ({ ...prev, profiles: updatedProfiles }));
    saveProfiles(updatedProfiles, profilesData.activeId);
    applySettingsToEngine(updated);
  };

  const handleSwitchProfile = (profileId: string) => {
    setProfilesData((prev) => ({ ...prev, activeId: profileId }));
    saveProfiles(profilesData.profiles, profileId);
    const target = profilesData.profiles.find((p) => p.id === profileId);
    if (target) {
      applySettingsToEngine(target);
    }
  };

  const handleCreateProfile = (callsign: string, avatar: string) => {
    const newProfile = createDefaultProfile(callsign, avatar);
    const updatedProfiles = [...profilesData.profiles, newProfile];
    setProfilesData({ profiles: updatedProfiles, activeId: newProfile.id });
    saveProfiles(updatedProfiles, newProfile.id);
    applySettingsToEngine(newProfile);
  };

  const handleToggleTouchControls = () => {
    const next = !showTouchControls;
    setShowTouchControls(next);
    handleUpdateProfile({
      ...activeProfile,
      settings: {
        ...activeProfile.settings,
        showTouchControls: next,
      },
    });
  };

  // Initialize Canvas & Engine once
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    // Apply active profile settings
    engine.setScreenShakeMultiplier(activeProfile.settings.screenShakeIntensity);
    audio.setMasterVolume(activeProfile.settings.masterVolume);

    engine.setCallbacks(
      (newMetrics) => {
        setMetrics(newMetrics);
      },
      (finalMetrics) => {
        setPhase('gameover');
        setMetrics(finalMetrics);

        // Record run to current player account!
        setProfilesData((current) => {
          const currentActive =
            current.profiles.find((p) => p.id === current.activeId) || current.profiles[0];
          if (!currentActive) return current;

          const { profile: updatedProfile } = recordRunToProfile(currentActive, finalMetrics);
          const updatedList = current.profiles.map((p) =>
            p.id === updatedProfile.id ? updatedProfile : p
          );
          saveProfiles(updatedList, current.activeId);
          return {
            ...current,
            profiles: updatedList,
          };
        });
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
    if (activeProfile.settings.autoFireDefault && engineRef.current) {
      engineRef.current.toggleAutoFire();
    }
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
      handleUpdateProfile({
        ...activeProfile,
        settings: {
          ...activeProfile.settings,
          isMuted,
        },
      });
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
        <TitleScreen
          onStart={handleStartSprint}
          highScore={Math.max(metrics.highScore, activeProfile.stats.highScore)}
          profile={activeProfile}
          onOpenDashboard={() => setShowDashboard(true)}
        />
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
          onOpenDashboard={() => setShowDashboard(true)}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <GameOverModal
          metrics={metrics}
          onRetry={handleRetry}
          onTitle={handleGoToTitle}
          onOpenDashboard={() => setShowDashboard(true)}
        />
      )}

      {/* Player Account Dashboard Modal */}
      {showDashboard && (
        <PlayerDashboard
          profile={activeProfile}
          profiles={profilesData.profiles}
          onUpdateProfile={handleUpdateProfile}
          onSwitchProfile={handleSwitchProfile}
          onCreateProfile={handleCreateProfile}
          onClose={() => setShowDashboard(false)}
        />
      )}
    </div>
  );
}
