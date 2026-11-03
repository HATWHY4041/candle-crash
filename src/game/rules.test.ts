import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDt,
  checkCircleCollision,
  checkPointInCircle,
  calculateMultiplier,
  calculateScoreGain,
  getMarketCycle,
  calculatePlayerSpeed,
  calculateSpawnParams,
  calculateTraumaShake,
  calculateJoystickVector,
  CYCLE_DURATION,
} from './rules.ts';

test('calculateJoystickVector respects deadzone and maximum radius clamping', () => {
  // Inside deadzone (< 6)
  const dead = calculateJoystickVector(3, 4, 50, 6);
  assert.equal(dead.active, false);
  assert.equal(dead.x, 0);
  assert.equal(dead.y, 0);

  // At right edge (dx: 50, dy: 0)
  const right = calculateJoystickVector(50, 0, 50, 6);
  assert.equal(right.active, true);
  assert.equal(Math.round(right.x), 1);
  assert.equal(Math.round(right.y), 0);
  assert.equal(right.distance, 50);

  // Exceeding max radius (dx: 100, dy: 0 clamped to 50)
  const over = calculateJoystickVector(100, 0, 50, 6);
  assert.equal(over.distance, 50);
  assert.equal(Math.round(over.x), 1);
});

test('clampDt restricts delta time to maximum budget', () => {
  assert.equal(clampDt(0.016), 0.016);
  assert.equal(clampDt(0.5, 0.05), 0.05);
  assert.equal(clampDt(-0.1), 0);
});

test('checkCircleCollision accurately detects overlapping or separating radii', () => {
  // Overlapping circles
  assert.equal(checkCircleCollision(0, 0, 10, 15, 0, 10), true);
  // Touching circles
  assert.equal(checkCircleCollision(0, 0, 10, 20, 0, 10), true);
  // Separated circles
  assert.equal(checkCircleCollision(0, 0, 10, 25, 0, 10), false);
});

test('checkPointInCircle identifies inner vs outer points', () => {
  assert.equal(checkPointInCircle(5, 5, 0, 0, 10), true);
  assert.equal(checkPointInCircle(10, 0, 0, 0, 10), true);
  assert.equal(checkPointInCircle(12, 0, 0, 0, 10), false);
});

test('calculateMultiplier scales correctly with market index thresholds', () => {
  assert.equal(calculateMultiplier(0), 1);
  assert.equal(calculateMultiplier(20), 1);
  assert.equal(calculateMultiplier(25), 2);
  assert.equal(calculateMultiplier(49), 2);
  assert.equal(calculateMultiplier(50), 5);
  assert.equal(calculateMultiplier(79), 5);
  assert.equal(calculateMultiplier(80), 10);
  assert.equal(calculateMultiplier(100), 10);
});

test('calculateScoreGain multiplies base score properly', () => {
  assert.equal(calculateScoreGain(100, 1), 100);
  assert.equal(calculateScoreGain(100, 2), 200);
  assert.equal(calculateScoreGain(150, 5), 750);
  assert.equal(calculateScoreGain(500, 10), 5000);
});

test('getMarketCycle toggles between BULL_RUN and BEAR_CRASH every 15s', () => {
  // At 0s -> Cycle 0 -> BULL_RUN
  const c0 = getMarketCycle(0, CYCLE_DURATION);
  assert.equal(c0.sentiment, 'BULL_RUN');
  assert.equal(c0.timeRemaining, 15);
  assert.equal(c0.cycleIndex, 0);

  // At 7.5s -> Mid Bull Run
  const c1 = getMarketCycle(7.5, CYCLE_DURATION);
  assert.equal(c1.sentiment, 'BULL_RUN');
  assert.equal(Math.round(c1.timeRemaining * 10) / 10, 7.5);

  // At 15.1s -> Cycle 1 -> BEAR_CRASH
  const c2 = getMarketCycle(15.1, CYCLE_DURATION);
  assert.equal(c2.sentiment, 'BEAR_CRASH');
  assert.equal(c2.cycleIndex, 1);

  // At 30s -> Cycle 2 -> BULL_RUN again
  const c3 = getMarketCycle(30, CYCLE_DURATION);
  assert.equal(c3.sentiment, 'BULL_RUN');
  assert.equal(c3.cycleIndex, 2);
});

test('calculatePlayerSpeed applies 1.5x boost only in Bull Run', () => {
  const baseSpeed = 260;
  assert.equal(calculatePlayerSpeed(baseSpeed, 'BULL_RUN'), 390);
  assert.equal(calculatePlayerSpeed(baseSpeed, 'BEAR_CRASH'), 260);
});

test('calculateSpawnParams ramps difficulty and doubles spawn rate in Bear Crash', () => {
  const bullParams = calculateSpawnParams(10, 'BULL_RUN');
  const bearParams = calculateSpawnParams(10, 'BEAR_CRASH');

  assert.ok(bearParams.spawnInterval < bullParams.spawnInterval, 'Bear interval should be halved');
  assert.ok(bearParams.maxEnemies > bullParams.maxEnemies, 'Bear max enemies should be higher');
});

test('calculateTraumaShake produces 0 displacement when trauma is 0', () => {
  const shake = calculateTraumaShake(0, 20);
  assert.equal(shake.offsetX, 0);
  assert.equal(shake.offsetY, 0);
});
