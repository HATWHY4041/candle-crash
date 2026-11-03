export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type MarketSentiment = 'BULL_RUN' | 'BEAR_CRASH';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  fireCooldown: number;
  invulnerableTimer: number;
  trailTimer: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  isEnemy: boolean;
  color: string;
}

export type EnemyType = 'fud_bot' | 'bear_tank' | 'bear_golem';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  scoreValue: number;
  hitFlashTimer: number;
  attackTimer: number;
  telegraphTimer: number;
  isCharging?: boolean;
  chargeTarget?: Vector2D;
}

export interface YieldToken {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  life: number;
  maxLife: number;
  radius: number;
  bobOffset: number;
}

export interface LiquidationCandle {
  id: number;
  targetX: number;
  targetY: number;
  currY: number;
  width: number;
  height: number;
  timer: number;
  warningDuration: number;
  hasLanded: boolean;
  shockwaveRadius: number;
  maxShockwaveRadius: number;
  damage: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'circle' | 'square' | 'line' | 'flame' | 'spark';
  angle?: number;
  vAngle?: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  decay: number;
}

export interface GameMetrics {
  score: number;
  highScore: number;
  multiplier: number;
  marketIndex: number;
  sentiment: MarketSentiment;
  cycleTimeRemaining: number;
  cycleDuration: number;
  hp: number;
  maxHp: number;
  timeSurvived: number;
  enemiesKilled: number;
  tokensCollected: number;
  autoFire: boolean;
  isMuted: boolean;
}

export interface SprintRecord {
  id: string;
  timestamp: number;
  score: number;
  timeSurvived: number;
  enemiesKilled: number;
  tokensCollected: number;
  maxMultiplier: number;
  sentimentReached: MarketSentiment;
}

export interface PlayerStats {
  lifetimeScore: number;
  highScore: number;
  totalRuns: number;
  longestSurvivalTime: number;
  totalLiquidations: number;
  totalTokensMined: number;
  highestMultiplier: number;
  bullRunsSurvived: number;
  bearCrashesSurvived: number;
}

export interface PlayerSettings {
  screenShakeIntensity: number; // 0 to 1
  masterVolume: number; // 0 to 1
  isMuted: boolean;
  autoFireDefault: boolean;
  showTouchControls: boolean;
}

export interface MilestoneIncentive {
  id: string;
  title: string;
  description: string;
  category: 'survival' | 'combat' | 'harvest' | 'prestige';
  targetValue: number;
  currentValue: number;
  completed: boolean;
  rewardName: string;
  rewardType: 'badge' | 'skin' | 'boost' | 'perk';
  rewardTeaser: string;
}

export interface PlayerProfile {
  id: string;
  callsign: string;
  avatarIcon: string;
  createdAt: number;
  stats: PlayerStats;
  settings: PlayerSettings;
  history: SprintRecord[];
  unlockedMilestones: string[];
}

