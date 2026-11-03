import { MarketSentiment } from './types.ts';

export const CYCLE_DURATION = 15; // 15 seconds per market cycle as requested

/**
 * Clamps simulation delta time to prevent tunneling during lag or tab defocus.
 */
export function clampDt(rawDt: number, maxDt: number = 0.05): number {
  return Math.max(0, Math.min(rawDt, maxDt));
}

/**
 * Standard circle-to-circle collision check.
 */
export function checkCircleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distanceSq <= radiusSum * radiusSum;
}

/**
 * Checks if a point is within a circle.
 */
export function checkPointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Calculates current score multiplier based on Market Index (0 - 100).
 * Multipliers: 1x, 2x, 5x, 10x
 */
export function calculateMultiplier(marketIndex: number): number {
  if (marketIndex >= 80) return 10;
  if (marketIndex >= 50) return 5;
  if (marketIndex >= 25) return 2;
  return 1;
}

/**
 * Calculates score yield with current multiplier.
 */
export function calculateScoreGain(baseScore: number, multiplier: number): number {
  return Math.round(baseScore * Math.max(1, multiplier));
}

/**
 * Computes current market sentiment cycle and remaining time.
 * Cycles every cycleDuration seconds:
 * Cycle 0: BULL_RUN
 * Cycle 1: BEAR_CRASH
 * Cycle 2: BULL_RUN, etc.
 */
export function getMarketCycle(
  totalTime: number,
  cycleDuration: number = CYCLE_DURATION
): {
  sentiment: MarketSentiment;
  timeRemaining: number;
  progress: number;
  cycleIndex: number;
} {
  const safeTime = Math.max(0, totalTime);
  const cycleIndex = Math.floor(safeTime / cycleDuration);
  const timeIntoCycle = safeTime % cycleDuration;
  const timeRemaining = Math.max(0, cycleDuration - timeIntoCycle);
  const progress = Math.min(1, Math.max(0, timeIntoCycle / cycleDuration));
  const sentiment: MarketSentiment = cycleIndex % 2 === 0 ? 'BULL_RUN' : 'BEAR_CRASH';

  return {
    sentiment,
    timeRemaining,
    progress,
    cycleIndex,
  };
}

/**
 * Player movement speed modifier based on market sentiment.
 * BULL RUN MODE: 1.5x speed.
 */
export function calculatePlayerSpeed(baseSpeed: number, sentiment: MarketSentiment): number {
  return sentiment === 'BULL_RUN' ? baseSpeed * 1.5 : baseSpeed;
}

/**
 * Dynamic spawn rate and enemy difficulty ramp.
 */
export function calculateSpawnParams(timeSurvived: number, sentiment: MarketSentiment) {
  // Opening 10s is gentle, scaling up smoothly
  const minuteProgress = timeSurvived / 60;
  let baseInterval = Math.max(0.6, 2.0 - minuteProgress * 0.4);
  let maxEnemies = Math.min(60, Math.floor(12 + minuteProgress * 10));

  // In Bear Crash mode, enemy spawns double as requested!
  if (sentiment === 'BEAR_CRASH') {
    baseInterval *= 0.5;
    maxEnemies = Math.floor(maxEnemies * 1.6);
  }

  // Golem probability increases over time, boosted in Bear Crash
  const golemChance = sentiment === 'BEAR_CRASH' ? Math.min(0.4, 0.15 + minuteProgress * 0.1) : 0.05;
  const tankChance = Math.min(0.35, 0.15 + minuteProgress * 0.08);

  return {
    spawnInterval: baseInterval,
    maxEnemies,
    golemChance,
    tankChance,
  };
}

/**
 * Calculates camera trauma shake offset using quadratic decay.
 */
export function calculateTraumaShake(
  trauma: number,
  maxOffset: number = 18,
  randomAngle: number = Math.random() * Math.PI * 2
): { offsetX: number; offsetY: number } {
  const shake = Math.min(1, Math.max(0, trauma));
  const intensity = shake * shake;
  if (intensity <= 0) {
    return { offsetX: 0, offsetY: 0 };
  }
  return {
    offsetX: Math.cos(randomAngle) * maxOffset * intensity,
    offsetY: Math.sin(randomAngle) * maxOffset * intensity,
  };
}
