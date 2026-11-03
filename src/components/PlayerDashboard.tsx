import React, { useState, useEffect } from 'react';
import { PlayerProfile, MilestoneIncentive } from '../game/types.ts';
import {
  calculateTraderRank,
  getMilestones,
  AVATARS,
  createDefaultProfile,
} from '../game/account.ts';

interface PlayerDashboardProps {
  profile: PlayerProfile;
  profiles: PlayerProfile[];
  onUpdateProfile: (updated: PlayerProfile) => void;
  onSwitchProfile: (profileId: string) => void;
  onCreateProfile: (callsign: string, avatar: string) => void;
  onClose: () => void;
}

type TabType = 'overview' | 'history' | 'incentives' | 'settings';

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  profile,
  profiles,
  onUpdateProfile,
  onSwitchProfile,
  onCreateProfile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editingCallsign, setEditingCallsign] = useState(profile.callsign);
  const [newProfileCallsign, setNewProfileCallsign] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState('bull');
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const rank = calculateTraderRank(profile.stats.lifetimeScore);
  const milestones = getMilestones(profile);
  const currentAvatar = AVATARS.find((a) => a.id === profile.avatarIcon) || AVATARS[0];

  const handleSaveCallsign = () => {
    const trimmed = editingCallsign.trim();
    if (!trimmed) return;
    onUpdateProfile({
      ...profile,
      callsign: trimmed,
    });
    showToast('Callsign updated successfully');
  };

  const handleAvatarSelect = (avatarId: string) => {
    onUpdateProfile({
      ...profile,
      avatarIcon: avatarId,
    });
    showToast('Avatar updated');
  };

  const handleSettingChange = (key: keyof PlayerProfile['settings'], value: any) => {
    onUpdateProfile({
      ...profile,
      settings: {
        ...profile.settings,
        [key]: value,
      },
    });
    showToast('Settings saved');
  };

  const handleCreateNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileCallsign.trim()) return;
    onCreateProfile(newProfileCallsign.trim(), newProfileAvatar);
    setNewProfileCallsign('');
    setShowNewProfileModal(false);
    showToast('New player profile created');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 select-none animate-fadeIn">
      {/* Dashboard Main Window */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0c0e15] border-2 border-[#00FFA3]/60 rounded-sm shadow-[0_0_50px_rgba(0,255,163,0.25)] overflow-hidden">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-[#08090e]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FFA3] animate-pulse" />
            <span className="font-cyber font-black tracking-wider text-sm sm:text-base text-white">
              ROGUE TERMINAL // PLAYER ACCOUNT DASHBOARD
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Dashboard"
            className="px-3 py-1 bg-slate-800/80 hover:bg-[#FF3B56]/20 hover:text-[#FF3B56] border border-slate-700 hover:border-[#FF3B56] text-xs font-mono font-bold text-slate-300 rounded-xs transition-colors cursor-pointer"
          >
            ESC ✕
          </button>
        </div>

        {/* Player Profile Quick Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-[#11141e] border-b border-slate-800/80 font-mono text-xs">
          <div className="flex items-center gap-3">
            {/* Avatar Pill */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shadow-md bg-black/40"
              style={{ borderColor: currentAvatar.color }}
            >
              {currentAvatar.icon}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-cyber font-black text-sm text-white">
                  {profile.callsign}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-[#00FFA3]/40 bg-[#00FFA3]/10 text-[#00FFA3]">
                  {rank.rank}: {rank.title}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                LIFETIME YIELD: <strong className="text-[#00FFA3]">${profile.stats.lifetimeScore.toLocaleString()}</strong> · ATH: <strong className="text-white">${profile.stats.highScore.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Profile Switcher Quick Select */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline">ACTIVE ACCOUNT:</span>
            <select
              value={profile.id}
              onChange={(e) => onSwitchProfile(e.target.value)}
              className="bg-[#181b26] border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded cursor-pointer focus:outline-none focus:border-[#00FFA3]"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.callsign} (${p.stats.lifetimeScore.toLocaleString()})
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewProfileModal(true)}
              className="px-2 py-1 bg-[#00FFA3]/20 hover:bg-[#00FFA3]/30 border border-[#00FFA3] text-[#00FFA3] text-[10px] font-bold rounded cursor-pointer transition-colors"
            >
              + NEW PLAYER
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-b border-slate-800 bg-[#0e1017] px-4 sm:px-6 gap-2 overflow-x-auto">
          {(
            [
              { id: 'overview', label: '📊 CAREER OVERVIEW' },
              { id: 'history', label: '⏱ SPRINT HISTORY' },
              { id: 'incentives', label: '🎁 INCENTIVES & BADGES' },
              { id: 'settings', label: '⚙ SETTINGS' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 px-3 sm:px-4 text-xs font-cyber font-bold tracking-wider transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-[#00FFA3] text-[#00FFA3] bg-[#00FFA3]/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Toast Alert */}
        {saveToast && (
          <div className="absolute top-14 right-6 z-20 px-3 py-1.5 bg-[#00FFA3] text-[#0a0b10] text-xs font-mono font-bold rounded shadow-lg animate-bounce">
            ✓ {saveToast}
          </div>
        )}

        {/* Dashboard Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-200">
          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Trader Rank Progress Card */}
              <div className="p-4 sm:p-5 bg-[#121520] border border-slate-800 rounded-sm box-glow-green">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">TRADER SENIORITY RANK</div>
                      <div className="font-cyber font-black text-lg text-white">
                        {rank.rank} // {rank.title}
                      </div>
                    </div>
                  </div>
                  {rank.nextTitle && (
                    <div className="text-right text-[11px] font-mono text-slate-400">
                      NEXT: <span className="text-[#00FFA3] font-bold">{rank.nextTitle}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full">
                  <div className="h-3 w-full bg-slate-900 border border-slate-700 rounded-xs overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-[#00FFA3]/70 to-[#00FFA3] shadow-[0_0_10px_#00FFA3] transition-all duration-300"
                      style={{ width: `${Math.round(rank.progress * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>${rank.min.toLocaleString()}</span>
                    <span>{Math.round(rank.progress * 100)}% COMPLETE</span>
                    <span>{rank.max === Infinity ? 'MAX TIER' : `$${rank.max.toLocaleString()}`}</span>
                  </div>
                </div>
              </div>

              {/* Career Performance Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">TOTAL SPRINTS RUN</span>
                  <span className="text-xl font-cyber font-black text-white tabular-nums">
                    {profile.stats.totalRuns}
                  </span>
                </div>
                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">BOTS LIQUIDATED</span>
                  <span className="text-xl font-cyber font-black text-[#FF3B56] tabular-nums">
                    {profile.stats.totalLiquidations}
                  </span>
                </div>
                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">YIELD TOKENS MINED</span>
                  <span className="text-xl font-cyber font-black text-[#00FFA3] tabular-nums">
                    {profile.stats.totalTokensMined}
                  </span>
                </div>
                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">LONGEST SURVIVAL</span>
                  <span className="text-xl font-cyber font-black text-amber-400 tabular-nums">
                    {Math.floor(profile.stats.longestSurvivalTime / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(profile.stats.longestSurvivalTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">PEAK ATH SCORE</span>
                  <span className="text-lg font-cyber font-black text-[#00FFA3] tabular-nums">
                    ${profile.stats.highScore.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">HIGHEST MULTIPLIER</span>
                  <span className="text-lg font-cyber font-black text-cyan-400 tabular-nums">
                    {profile.stats.highestMultiplier}X
                  </span>
                </div>
                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">BULL RUNS SURVIVED</span>
                  <span className="text-lg font-cyber font-black text-[#00FFA3] tabular-nums">
                    {profile.stats.bullRunsSurvived}
                  </span>
                </div>
                <div className="p-3 bg-[#11141e] border border-slate-800 rounded-xs">
                  <span className="text-[10px] text-slate-500 block">BEAR CRASHES WITHSTOOD</span>
                  <span className="text-lg font-cyber font-black text-[#FF3B56] tabular-nums">
                    {profile.stats.bearCrashesSurvived}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: SPRINT HISTORY ================= */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>RECENT SPRINT SESSIONS (LAST 20 RUNS)</span>
                <span>{profile.history.length} RECORDED</span>
              </div>

              {profile.history.length === 0 ? (
                <div className="p-8 text-center bg-[#11141e] border border-dashed border-slate-800 rounded font-mono text-slate-500">
                  No sprint records yet. Complete your first run to populate your performance ledger!
                </div>
              ) : (
                <div className="space-y-2 font-mono">
                  {profile.history.map((h, idx) => {
                    const dateStr = new Date(h.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const minutes = Math.floor(h.timeSurvived / 60);
                    const seconds = h.timeSurvived % 60;
                    const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                    return (
                      <div
                        key={h.id || idx}
                        className="flex flex-wrap items-center justify-between p-3 bg-[#121520] border border-slate-800 hover:border-slate-700 rounded-xs text-xs gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                            #{profile.history.length - idx}
                          </span>
                          <div>
                            <div className="font-cyber font-black text-white text-sm">
                              ${h.score.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500">{dateStr}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-slate-300">
                          <div>
                            <span className="text-[10px] text-slate-500 block">TIME</span>
                            <span className="font-bold">{durationStr}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">KILLS</span>
                            <span className="text-[#FF3B56] font-bold">{h.enemiesKilled}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">TOKENS</span>
                            <span className="text-[#00FFA3] font-bold">{h.tokensCollected}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">LEVERAGE</span>
                            <span className="text-cyan-400 font-bold">{h.maxMultiplier}X</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: INCENTIVES & BADGES ================= */}
          {activeTab === 'incentives' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-gradient-to-r from-[#00FFA3]/10 to-transparent border border-[#00FFA3]/30 rounded-xs text-xs font-mono">
                <span className="text-[#00FFA3] font-bold font-cyber text-sm block mb-1">
                  🎁 FUTURE INCENTIVES & COMMUNITY AIRDROPS
                </span>
                <p className="text-slate-300">
                  Achieving milestones records your proof-of-survival in your terminal account. In upcoming releases, unlocked milestones qualify players for cosmetic ship hulls, weapon trails, and yield bonus incentives!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {milestones.map((m) => {
                  const percent = Math.min(100, Math.round((m.currentValue / m.targetValue) * 100));
                  return (
                    <div
                      key={m.id}
                      className={`p-4 border rounded-sm transition-all font-mono text-xs ${
                        m.completed
                          ? 'bg-[#101b1a] border-[#00FFA3]/60 box-glow-green'
                          : 'bg-[#11141e] border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{m.completed ? '🎖️' : '🔒'}</span>
                            <span className="font-cyber font-black text-sm text-white">
                              {m.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            m.completed
                              ? 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/40'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {m.completed ? 'CLAIMED' : 'LOCKED'}
                        </span>
                      </div>

                      {/* Milestone Progress */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>PROGRESS</span>
                          <span className="tabular-nums">
                            {m.currentValue} / {m.targetValue} ({percent}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 border border-slate-700 rounded-xs overflow-hidden">
                          <div
                            className={`h-full ${m.completed ? 'bg-[#00FFA3]' : 'bg-slate-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Incentive Teaser */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">INCENTIVE REWARD:</span>
                        <span className="text-[#00FFA3] font-bold">{m.rewardName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 4: SETTINGS ================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl font-mono text-xs">
              {/* Callsign Editor */}
              <div className="p-4 bg-[#121520] border border-slate-800 rounded-sm">
                <label className="text-slate-400 font-bold block mb-1">TERMINAL CALLSIGN / HANDLE</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingCallsign}
                    onChange={(e) => setEditingCallsign(e.target.value)}
                    maxLength={18}
                    className="flex-1 bg-black/60 border border-slate-700 px-3 py-2 text-white font-cyber font-bold rounded focus:outline-none focus:border-[#00FFA3]"
                    placeholder="Enter callsign..."
                  />
                  <button
                    onClick={handleSaveCallsign}
                    className="px-4 py-2 bg-[#00FFA3] hover:bg-[#1cfcac] text-[#0a0b10] font-cyber font-bold rounded cursor-pointer transition-colors"
                  >
                    SAVE
                  </button>
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="p-4 bg-[#121520] border border-slate-800 rounded-sm">
                <label className="text-slate-400 font-bold block mb-2">CHOOSE AVATAR EMBLEM</label>
                <div className="flex flex-wrap gap-2.5">
                  {AVATARS.map((a) => {
                    const isSelected = profile.avatarIcon === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleAvatarSelect(a.id)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#00FFA3]/20 border-[#00FFA3] text-white shadow-[0_0_15px_rgba(0,255,163,0.3)]'
                            : 'bg-[#181b26] border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-xl">{a.icon}</span>
                        <span className="text-xs font-cyber font-bold">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gameplay & Control Preferences */}
              <div className="p-4 bg-[#121520] border border-slate-800 rounded-sm space-y-4">
                <div className="text-slate-400 font-bold border-b border-slate-800 pb-1">
                  GAMEPLAY & FEEDBACK SETTINGS
                </div>

                {/* Screen Shake Intensity */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Screen Shake Feedback</span>
                    <span className="text-[#00FFA3] font-bold">
                      {Math.round(profile.settings.screenShakeIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={profile.settings.screenShakeIntensity}
                    onChange={(e) =>
                      handleSettingChange('screenShakeIntensity', parseFloat(e.target.value))
                    }
                    className="w-full accent-[#00FFA3] cursor-pointer"
                  />
                </div>

                {/* Master Volume */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Synthesizer Volume</span>
                    <span className="text-[#00FFA3] font-bold">
                      {Math.round(profile.settings.masterVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={profile.settings.masterVolume}
                    onChange={(e) =>
                      handleSettingChange('masterVolume', parseFloat(e.target.value))
                    }
                    className="w-full accent-[#00FFA3] cursor-pointer"
                  />
                </div>

                {/* Auto-Fire Default */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-slate-300 font-bold">Auto-Fire Default</div>
                    <div className="text-[10px] text-slate-500">
                      Automatically fire lasers on sprint startup without holding click
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleSettingChange('autoFireDefault', !profile.settings.autoFireDefault)
                    }
                    className={`px-3 py-1.5 border rounded cursor-pointer font-bold transition-colors ${
                      profile.settings.autoFireDefault
                        ? 'bg-[#00FFA3]/20 border-[#00FFA3] text-[#00FFA3]'
                        : 'bg-[#181b26] border-slate-700 text-slate-400'
                    }`}
                  >
                    {profile.settings.autoFireDefault ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {/* Touch Controls Default */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-slate-300 font-bold">On-Screen Virtual Controls</div>
                    <div className="text-[10px] text-slate-500">
                      Show dual thumbstick controls for phones and touchpads
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleSettingChange(
                        'showTouchControls',
                        !profile.settings.showTouchControls
                      )
                    }
                    className={`px-3 py-1.5 border rounded cursor-pointer font-bold transition-colors ${
                      profile.settings.showTouchControls
                        ? 'bg-[#00FFA3]/20 border-[#00FFA3] text-[#00FFA3]'
                        : 'bg-[#181b26] border-slate-700 text-slate-400'
                    }`}
                  >
                    {profile.settings.showTouchControls ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Profile Creation Modal */}
      {showNewProfileModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
          <form
            onSubmit={handleCreateNewProfile}
            className="w-full max-w-sm bg-[#121520] border-2 border-[#00FFA3] p-5 rounded-sm shadow-[0_0_30px_rgba(0,255,163,0.4)] font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
              <span className="font-cyber font-bold text-white text-sm">CREATE NEW PLAYER ACCOUNT</span>
              <button
                type="button"
                onClick={() => setShowNewProfileModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-3">
              <label className="text-slate-400 block mb-1">CALLSIGN / HANDLE</label>
              <input
                type="text"
                required
                maxLength={18}
                value={newProfileCallsign}
                onChange={(e) => setNewProfileCallsign(e.target.value)}
                placeholder="e.g. Whale_Hunter_99"
                className="w-full bg-black/60 border border-slate-700 px-3 py-2 text-white font-cyber rounded focus:outline-none focus:border-[#00FFA3]"
              />
            </div>

            <div className="mb-5">
              <label className="text-slate-400 block mb-1">AVATAR</label>
              <div className="flex gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setNewProfileAvatar(a.id)}
                    className={`flex-1 py-2 text-lg border rounded flex items-center justify-center cursor-pointer ${
                      newProfileAvatar === a.id
                        ? 'bg-[#00FFA3]/20 border-[#00FFA3]'
                        : 'bg-black/40 border-slate-800'
                    }`}
                  >
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#00FFA3] hover:bg-[#1cfcac] text-[#0a0b10] font-cyber font-bold tracking-wider rounded cursor-pointer"
              >
                CREATE ACCOUNT
              </button>
              <button
                type="button"
                onClick={() => setShowNewProfileModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
