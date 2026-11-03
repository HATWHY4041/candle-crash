import { PlayerProfile, GameMetrics, MilestoneIncentive, SprintRecord } from './types.ts';

const PROFILES_STORAGE_KEY = 'roguemarket_profiles_v1';
const ACTIVE_PROFILE_KEY = 'roguemarket_active_profile_id_v1';

export const TRADER_RANKS = [
  { rank: 'TIER 1', title: 'Paper Hands Intern', min: 0, max: 2500 },
  { rank: 'TIER 2', title: 'Junior Scalper', min: 2500, max: 10000 },
  { rank: 'TIER 3', title: 'Momentum Chaser', min: 10000, max: 35000 },
  { rank: 'TIER 4', title: 'Bull Runner', min: 35000, max: 100000 },
  { rank: 'TIER 5', title: 'Liquidation Specialist', min: 100000, max: 300000 },
  { rank: 'TIER 6', title: 'Market Maker', min: 300000, max: 800000 },
  { rank: 'TIER 7', title: 'Whale Alpha Supreme', min: 800000, max: Infinity },
];

export const AVATARS = [
  { id: 'bull', name: 'Cyber Bull', icon: '🐂', color: '#00FFA3' },
  { id: 'bear', name: 'Rogue Bear', icon: '🐻', color: '#FF3B56' },
  { id: 'rocket', name: 'To The Moon', icon: '🚀', color: '#38bdf8' },
  { id: 'whale', name: 'Alpha Whale', icon: '🐋', color: '#818cf8' },
  { id: 'matrix', name: 'Terminal Neo', icon: '⚡', color: '#facc15' },
];

export function createDefaultProfile(
  callsign: string = 'Trader_01',
  avatarIcon: string = 'bull'
): PlayerProfile {
  return {
    id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    callsign,
    avatarIcon,
    createdAt: Date.now(),
    stats: {
      lifetimeScore: 0,
      highScore: 0,
      totalRuns: 0,
      longestSurvivalTime: 0,
      totalLiquidations: 0,
      totalTokensMined: 0,
      highestMultiplier: 1,
      bullRunsSurvived: 0,
      bearCrashesSurvived: 0,
    },
    settings: {
      screenShakeIntensity: 1.0,
      masterVolume: 0.8,
      isMuted: false,
      autoFireDefault: false,
      showTouchControls: true,
    },
    history: [],
    unlockedMilestones: [],
  };
}

/**
 * Calculates trader tier rank and progress toward next tier.
 */
export function calculateTraderRank(lifetimeScore: number): {
  rank: string;
  title: string;
  min: number;
  max: number;
  progress: number;
  nextTitle: string | null;
} {
  const score = Math.max(0, lifetimeScore);
  for (let i = 0; i < TRADER_RANKS.length; i++) {
    const tier = TRADER_RANKS[i];
    if (score < tier.max || tier.max === Infinity) {
      const span = tier.max === Infinity ? 500000 : tier.max - tier.min;
      const progress = tier.max === Infinity ? 1 : Math.min(1, Math.max(0, (score - tier.min) / span));
      const nextTitle = i + 1 < TRADER_RANKS.length ? TRADER_RANKS[i + 1].title : null;
      return {
        rank: tier.rank,
        title: tier.title,
        min: tier.min,
        max: tier.max,
        progress,
        nextTitle,
      };
    }
  }
  return {
    rank: 'TIER 7',
    title: 'Whale Alpha Supreme',
    min: 800000,
    max: Infinity,
    progress: 1,
    nextTitle: null,
  };
}

/**
 * Returns milestone achievements and upcoming incentives.
 */
export function getMilestones(profile: PlayerProfile): MilestoneIncentive[] {
  const stats = profile.stats;
  const milestones: MilestoneIncentive[] = [
    {
      id: 'FIRST_SPRINT',
      title: 'First Liquidation Sprint',
      description: 'Complete your first market survival run.',
      category: 'prestige',
      targetValue: 1,
      currentValue: stats.totalRuns,
      completed: stats.totalRuns >= 1,
      rewardName: 'Junior Callsign Tag',
      rewardType: 'badge',
      rewardTeaser: 'Unlocks Junior Terminal Identity Badge',
    },
    {
      id: 'BOT_DESTROYER_25',
      title: 'FUD Bot Purge',
      description: 'Destroy 25 enemy bots across sprints.',
      category: 'combat',
      targetValue: 25,
      currentValue: stats.totalLiquidations,
      completed: stats.totalLiquidations >= 25,
      rewardName: 'Neon Crosshair Reticle',
      rewardType: 'skin',
      rewardTeaser: 'Unlocks glowing cyan weapon sights',
    },
    {
      id: 'YIELD_FARMER_50',
      title: 'Token Accumulator',
      description: 'Collect 50 green Yield Tokens from fallen foes.',
      category: 'harvest',
      targetValue: 50,
      currentValue: stats.totalTokensMined,
      completed: stats.totalTokensMined >= 50,
      rewardName: 'Yield Sparkle Trail',
      rewardType: 'boost',
      rewardTeaser: 'Unlocks shimmering green currency collection aura',
    },
    {
      id: 'SURVIVE_MINUTE',
      title: 'Diamond Hands',
      description: 'Survive for at least 60 seconds in a single run.',
      category: 'survival',
      targetValue: 60,
      currentValue: stats.longestSurvivalTime,
      completed: stats.longestSurvivalTime >= 60,
      rewardName: 'Diamond Hull Plating',
      rewardType: 'skin',
      rewardTeaser: 'Unlocks prismatic ship hull finish',
    },
    {
      id: 'BULL_RUNNER_5',
      title: 'Bull Run Veteran',
      description: 'Survive through 5 Bull Run market cycles.',
      category: 'survival',
      targetValue: 5,
      currentValue: stats.bullRunsSurvived,
      completed: stats.bullRunsSurvived >= 5,
      rewardName: 'Green Flame Thrusters',
      rewardType: 'skin',
      rewardTeaser: 'Unlocks persistent high-heat green exhaust',
    },
    {
      id: 'TEN_X_MULTIPLIER',
      title: 'Peak Leverage 10X',
      description: 'Push Market Index above 80% to achieve a 10X yield multiplier.',
      category: 'harvest',
      targetValue: 10,
      currentValue: stats.highestMultiplier,
      completed: stats.highestMultiplier >= 10,
      rewardName: 'Golden 10X Crown Emblem',
      rewardType: 'badge',
      rewardTeaser: 'Unlocks Golden Crown profile emblem',
    },
    {
      id: 'PORTFOLIO_WHALE_50K',
      title: 'Market Mover',
      description: 'Mint over $50,000 in a single Sprint session.',
      category: 'prestige',
      targetValue: 50000,
      currentValue: stats.highScore,
      completed: stats.highScore >= 50000,
      rewardName: 'Alpha Staking Pass (Future Incentive)',
      rewardType: 'perk',
      rewardTeaser: 'Grants VIP entry when community prize incentives go live',
    },
  ];

  return milestones;
}

/**
 * Pure function: Records a completed sprint to profile stats, run history, and calculates newly unlocked milestones.
 */
export function recordRunToProfile(
  profile: PlayerProfile,
  metrics: GameMetrics
): { profile: PlayerProfile; newMilestones: MilestoneIncentive[] } {
  const newStats = {
    ...profile.stats,
    lifetimeScore: profile.stats.lifetimeScore + metrics.score,
    highScore: Math.max(profile.stats.highScore, metrics.score),
    totalRuns: profile.stats.totalRuns + 1,
    longestSurvivalTime: Math.max(profile.stats.longestSurvivalTime, metrics.timeSurvived),
    totalLiquidations: profile.stats.totalLiquidations + metrics.enemiesKilled,
    totalTokensMined: profile.stats.totalTokensMined + metrics.tokensCollected,
    highestMultiplier: Math.max(profile.stats.highestMultiplier, metrics.multiplier),
    bullRunsSurvived: profile.stats.bullRunsSurvived + Math.floor((metrics.timeSurvived + 7.5) / 30),
    bearCrashesSurvived: profile.stats.bearCrashesSurvived + Math.floor(metrics.timeSurvived / 30),
  };

  const newRecord: SprintRecord = {
    id: `run_${Date.now()}`,
    timestamp: Date.now(),
    score: metrics.score,
    timeSurvived: metrics.timeSurvived,
    enemiesKilled: metrics.enemiesKilled,
    tokensCollected: metrics.tokensCollected,
    maxMultiplier: metrics.multiplier,
    sentimentReached: metrics.sentiment,
  };

  const updatedHistory = [newRecord, ...profile.history].slice(0, 20); // Keep last 20 runs

  const updatedProfile: PlayerProfile = {
    ...profile,
    stats: newStats,
    history: updatedHistory,
  };

  const allMilestones = getMilestones(updatedProfile);
  const previouslyUnlocked = new Set(profile.unlockedMilestones);
  const newlyUnlocked: MilestoneIncentive[] = [];

  allMilestones.forEach((m) => {
    if (m.completed && !previouslyUnlocked.has(m.id)) {
      newlyUnlocked.push(m);
      previouslyUnlocked.add(m.id);
    }
  });

  updatedProfile.unlockedMilestones = Array.from(previouslyUnlocked);

  return {
    profile: updatedProfile,
    newMilestones: newlyUnlocked,
  };
}

/**
 * LocalStorage Helpers
 */
export function loadProfiles(): { profiles: PlayerProfile[]; activeId: string } {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY) || '';

    if (raw) {
      const parsed: PlayerProfile[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const found = parsed.find((p) => p.id === activeId) || parsed[0];
        return {
          profiles: parsed,
          activeId: found.id,
        };
      }
    }
  } catch (err) {
    console.warn('Could not load profiles from storage:', err);
  }

  // Create default fallback profile
  const defaultProfile = createDefaultProfile('Alpha_Trader', 'bull');
  saveProfiles([defaultProfile], defaultProfile.id);
  return {
    profiles: [defaultProfile],
    activeId: defaultProfile.id,
  };
}

export function saveProfiles(profiles: PlayerProfile[], activeId: string) {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeId);
  } catch (err) {
    console.warn('Could not save profiles:', err);
  }
}
