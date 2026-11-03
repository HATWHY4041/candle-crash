import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProfile,
  calculateTraderRank,
  getMilestones,
  recordRunToProfile,
} from './account.ts';
import { GameMetrics } from './types.ts';

test('createDefaultProfile initializes empty career statistics', () => {
  const profile = createDefaultProfile('BullRider', 'bull');
  assert.equal(profile.callsign, 'BullRider');
  assert.equal(profile.stats.lifetimeScore, 0);
  assert.equal(profile.stats.totalRuns, 0);
  assert.equal(profile.history.length, 0);
});

test('calculateTraderRank scales properly across tiers', () => {
  // 0 score => Tier 1 Paper Hands Intern
  const t1 = calculateTraderRank(0);
  assert.equal(t1.rank, 'TIER 1');
  assert.equal(t1.title, 'Paper Hands Intern');
  assert.equal(t1.progress, 0);

  // 1250 score => Tier 1 50%
  const t1Mid = calculateTraderRank(1250);
  assert.equal(t1Mid.progress, 0.5);

  // 50,000 score => Tier 4 Bull Runner
  const t4 = calculateTraderRank(50000);
  assert.equal(t4.rank, 'TIER 4');
  assert.equal(t4.title, 'Bull Runner');

  // 1,000,000 score => Tier 7 Whale Alpha Supreme
  const t7 = calculateTraderRank(1000000);
  assert.equal(t7.rank, 'TIER 7');
  assert.equal(t7.title, 'Whale Alpha Supreme');
  assert.equal(t7.progress, 1);
});

test('recordRunToProfile accumulates lifetime score, updates highscore and history', () => {
  const profile = createDefaultProfile('Trader_Alpha', 'bull');

  const mockRun1: GameMetrics = {
    score: 1500,
    highScore: 1500,
    multiplier: 5,
    marketIndex: 60,
    sentiment: 'BULL_RUN',
    cycleTimeRemaining: 10,
    cycleDuration: 15,
    hp: 0,
    maxHp: 100,
    timeSurvived: 35,
    enemiesKilled: 12,
    tokensCollected: 18,
    autoFire: false,
    isMuted: false,
  };

  const { profile: updated1, newMilestones: m1 } = recordRunToProfile(profile, mockRun1);

  assert.equal(updated1.stats.lifetimeScore, 1500);
  assert.equal(updated1.stats.highScore, 1500);
  assert.equal(updated1.stats.totalRuns, 1);
  assert.equal(updated1.stats.totalLiquidations, 12);
  assert.equal(updated1.stats.totalTokensMined, 18);
  assert.equal(updated1.history.length, 1);
  assert.equal(updated1.history[0].score, 1500);

  // First run milestone should unlock
  assert.ok(m1.some((m) => m.id === 'FIRST_SPRINT'));
  assert.ok(updated1.unlockedMilestones.includes('FIRST_SPRINT'));

  // Second run with higher score
  const mockRun2: GameMetrics = {
    ...mockRun1,
    score: 3000,
    enemiesKilled: 20,
    timeSurvived: 70,
  };

  const { profile: updated2 } = recordRunToProfile(updated1, mockRun2);
  assert.equal(updated2.stats.lifetimeScore, 4500);
  assert.equal(updated2.stats.highScore, 3000);
  assert.equal(updated2.stats.totalRuns, 2);
  assert.equal(updated2.stats.longestSurvivalTime, 70);
  assert.equal(updated2.stats.totalLiquidations, 32);

  // 60-second survival and 25-bot purge should now unlock
  assert.ok(updated2.unlockedMilestones.includes('SURVIVE_MINUTE'));
  assert.ok(updated2.unlockedMilestones.includes('BOT_DESTROYER_25'));
});
