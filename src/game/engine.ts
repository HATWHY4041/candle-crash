import {
  GamePhase,
  MarketSentiment,
  Player,
  Bullet,
  Enemy,
  YieldToken,
  LiquidationCandle,
  Particle,
  FloatingText,
  GameMetrics,
} from './types.ts';
import {
  CYCLE_DURATION,
  clampDt,
  checkCircleCollision,
  checkPointInCircle,
  calculateMultiplier,
  calculateScoreGain,
  getMarketCycle,
  calculatePlayerSpeed,
  calculateSpawnParams,
  calculateTraumaShake,
} from './rules.ts';
import { audio } from './audio.ts';

const MAX_PARTICLES = 600;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  // Phase & States
  public phase: GamePhase = 'title';
  private sentiment: MarketSentiment = 'BULL_RUN';
  private totalPlayTime: number = 0;
  private score: number = 0;
  private highScore: number = 0;
  private enemiesKilled: number = 0;
  private tokensCollected: number = 0;
  private marketIndex: number = 20; // 0 to 100
  private currentMultiplier: number = 1;
  private autoFire: boolean = false;
  private hitstopTimer: number = 0;
  private cameraTrauma: number = 0;
  private nextEnemyId: number = 1;
  private nextTokenId: number = 1;
  private nextCandleId: number = 1;
  private nextTextId: number = 1;

  // Market sentiment banner alert timer
  private bannerTimer: number = 0;
  private bannerTitle: string = '';
  private bannerSubtitle: string = '';
  private lastCycleIndex: number = -1;

  // Spawning timers
  private enemySpawnTimer: number = 0;
  private candleSpawnTimer: number = 0;

  // Entities
  private player: Player = {
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: 16,
    hp: 100,
    maxHp: 100,
    speed: 260,
    fireCooldown: 0,
    invulnerableTimer: 0,
    trailTimer: 0,
  };

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private tokens: YieldToken[] = [];
  private candles: LiquidationCandle[] = [];
  private floatingTexts: FloatingText[] = [];

  // Particle pool
  private particlePool: Particle[] = [];
  private particleIndex: number = 0;

  // Input states
  private keysHeld: Set<string> = new Set();
  private mousePos = { x: 400, y: 300 };
  private isMouseDown: boolean = false;

  // Virtual / Mobile inputs
  private virtualMove = { x: 0, y: 0 };
  private virtualAim = { angle: 0, active: false, isFiring: false };
  private virtualFireHeld: boolean = false;
  private dashCooldown: number = 0;
  private screenShakeMultiplier: number = 1.0;

  // Animated background market charts
  private chartCandles: { x: number; open: number; close: number; high: number; low: number; vol: number }[] = [];
  private chartOffset: number = 0;

  // Callbacks
  private onMetricsUpdate?: (metrics: GameMetrics) => void;
  private onGameOverCallback?: (finalMetrics: GameMetrics) => void;
  private onPhaseChangeCallback?: (phase: GamePhase) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    // Load High Score
    try {
      this.highScore = parseInt(localStorage.getItem('roguemarket_high_score') || '0', 10) || 0;
    } catch {
      this.highScore = 0;
    }

    this.initParticlePool();
    this.initChartCandles();
    this.bindEvents();
    this.handleResize();
  }

  private initParticlePool() {
    this.particlePool = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        color: '#00FFA3',
        alpha: 0,
        decay: 1,
        shape: 'circle',
      });
    }
  }

  private emitParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    alpha: number,
    decay: number,
    shape: 'circle' | 'square' | 'line' | 'flame' | 'spark' = 'circle',
    angle: number = 0,
    vAngle: number = 0
  ) {
    const p = this.particlePool[this.particleIndex];
    this.particleIndex = (this.particleIndex + 1) % MAX_PARTICLES;

    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.color = color;
    p.alpha = alpha;
    p.decay = decay;
    p.shape = shape;
    p.angle = angle;
    p.vAngle = vAngle;
  }

  private emitBurst(x: number, y: number, count: number, color: string, speedMax: number = 180) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.2 + Math.random() * 0.8) * speedMax;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 4;
      const decay = 1.2 + Math.random() * 1.8;
      this.emitParticle(x, y, vx, vy, size, color, 1, decay, Math.random() > 0.5 ? 'spark' : 'circle');
    }
  }

  private initChartCandles() {
    this.chartCandles = [];
    let currentPrice = 180;
    for (let i = 0; i < 60; i++) {
      const delta = (Math.random() - 0.48) * 24;
      const open = currentPrice;
      const close = Math.max(40, currentPrice + delta);
      const high = Math.max(open, close) + Math.random() * 12;
      const low = Math.min(open, close) - Math.random() * 12;
      const vol = 10 + Math.random() * 40;
      this.chartCandles.push({
        x: i * 36,
        open,
        close,
        high,
        low,
        vol,
      });
      currentPrice = close;
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('resize', this.handleResize);
  }

  public unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // If user is on Title screen, Space / Enter starts sprint
    if (this.phase === 'title') {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.startSprint();
        return;
      }
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.phase === 'playing') {
        this.pause();
      } else if (this.phase === 'paused') {
        this.resume();
      }
      return;
    }

    if (this.phase === 'playing' && e.code === 'Space') {
      e.preventDefault();
      this.triggerDash();
      return;
    }

    if (e.code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (e.code === 'KeyF') {
      // Toggle auto fire
      this.toggleAutoFire();
      return;
    }

    this.keysHeld.add(e.code);
  };

  public setVirtualMove(x: number, y: number) {
    this.virtualMove.x = Math.max(-1, Math.min(1, x));
    this.virtualMove.y = Math.max(-1, Math.min(1, y));
  }

  public setVirtualAim(angle: number, active: boolean, isFiring: boolean = true) {
    this.virtualAim.angle = angle;
    this.virtualAim.active = active;
    this.virtualAim.isFiring = isFiring;
    if (active) {
      this.player.angle = angle;
    }
  }

  public setVirtualFire(isFiring: boolean) {
    this.virtualFireHeld = isFiring;
  }

  public triggerDash(): boolean {
    if (this.dashCooldown > 0 || this.phase !== 'playing') return false;
    this.dashCooldown = 1.1;
    const dashSpeed = 580;
    let dashAngle = this.player.angle;
    if (Math.hypot(this.player.vx, this.player.vy) > 20) {
      dashAngle = Math.atan2(this.player.vy, this.player.vx);
    }
    this.player.vx = Math.cos(dashAngle) * dashSpeed;
    this.player.vy = Math.sin(dashAngle) * dashSpeed;
    this.player.invulnerableTimer = Math.max(this.player.invulnerableTimer, 0.28);
    this.cameraTrauma = Math.max(this.cameraTrauma, 0.22);
    this.addFloatingText(this.player.x, this.player.y - 30, 'DASH!', '#00FFA3', 1.0);
    this.emitBurst(this.player.x, this.player.y, 14, '#00FFA3', 190);
    audio.playLaser(true);
    return true;
  }

  public setScreenShakeMultiplier(val: number) {
    this.screenShakeMultiplier = Math.max(0, Math.min(2, val));
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  };

  private handleWindowBlur = () => {
    this.keysHeld.clear();
    this.isMouseDown = false;
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.keysHeld.clear();
      this.isMouseDown = false;
    }
  };

  public handleResize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  public setCallbacks(
    onMetricsUpdate: (m: GameMetrics) => void,
    onGameOver: (m: GameMetrics) => void,
    onPhaseChange: (p: GamePhase) => void
  ) {
    this.onMetricsUpdate = onMetricsUpdate;
    this.onGameOverCallback = onGameOver;
    this.onPhaseChangeCallback = onPhaseChange;
  }

  public setPhase(phase: GamePhase) {
    this.phase = phase;
    document.body.dataset.state = phase;
    this.onPhaseChangeCallback?.(phase);
  }

  public toggleMute(): boolean {
    const muted = audio.toggleMute();
    this.pushMetrics();
    return muted;
  }

  public toggleAutoFire(): boolean {
    this.autoFire = !this.autoFire;
    this.addFloatingText(
      this.player.x,
      this.player.y - 28,
      this.autoFire ? 'AUTO-FIRE ON' : 'AUTO-FIRE OFF',
      '#00FFA3'
    );
    this.pushMetrics();
    return this.autoFire;
  }

  public startSprint() {
    this.score = 0;
    this.enemiesKilled = 0;
    this.tokensCollected = 0;
    this.marketIndex = 25;
    this.currentMultiplier = 2;
    this.totalPlayTime = 0;
    this.enemySpawnTimer = 0.5;
    this.candleSpawnTimer = 3.0;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.bullets = [];
    this.enemies = [];
    this.tokens = [];
    this.candles = [];
    this.floatingTexts = [];
    this.keysHeld.clear();
    this.isMouseDown = false;

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.player.x = width / 2;
    this.player.y = height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = 100;
    this.player.maxHp = 100;
    this.player.invulnerableTimer = 1.0;

    this.lastCycleIndex = -1;
    this.setPhase('playing');

    // Trigger initial Bull Run banner
    this.triggerMarketBanner('BULL RUN INITIATED', 'SPEED BOOST + PROFIT FLAME WAKE ACTIVE');
    audio.playMarketShift('BULL_RUN');
    this.pushMetrics();
  }

  public pause() {
    if (this.phase === 'playing') {
      this.setPhase('paused');
      this.keysHeld.clear();
      this.isMouseDown = false;
    }
  }

  public resume() {
    if (this.phase === 'paused') {
      this.setPhase('playing');
      this.keysHeld.clear();
      this.isMouseDown = false;
      this.lastTime = performance.now();
    }
  }

  public retry() {
    this.startSprint();
  }

  public goToTitle() {
    this.setPhase('title');
  }

  public startLoop() {
    if (this.animationFrameId !== null) return;
    this.lastTime = performance.now();
    const frame = (time: number) => {
      const rawDt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      const dt = clampDt(rawDt);

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(frame);
    };
    this.animationFrameId = requestAnimationFrame(frame);
  }

  public stopLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, scale: number = 1.0) {
    this.floatingTexts.push({
      id: this.nextTextId++,
      x,
      y,
      vy: -55 - Math.random() * 20,
      text,
      color,
      alpha: 1.0,
      scale,
      decay: 0.9,
    });
  }

  private triggerMarketBanner(title: string, subtitle: string) {
    this.bannerTitle = title;
    this.bannerSubtitle = subtitle;
    this.bannerTimer = 2.8;
  }

  private update(dt: number) {
    // Background charts tick even on title screen for visual ambiance
    this.chartOffset = (this.chartOffset + dt * 32) % 36;

    // Decay trauma always
    if (this.cameraTrauma > 0) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.2);
    }

    // Always update particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particlePool[i];
      if (p.alpha > 0) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.92, dt * 60);
        p.vy *= Math.pow(0.92, dt * 60);
        p.alpha -= p.decay * dt;
        if (p.vAngle && p.angle !== undefined) {
          p.angle += p.vAngle * dt;
        }
      }
    }

    // Always update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= ft.decay * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
    }

    // Only update gameplay simulation if in 'playing' phase
    if (this.phase !== 'playing') {
      return;
    }

    // Sim-level hitstop freeze timer (renders continue, physics pause)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.totalPlayTime += dt;

    // 1. Market Cycle Shift Check
    const cycle = getMarketCycle(this.totalPlayTime, CYCLE_DURATION);
    if (cycle.cycleIndex !== this.lastCycleIndex) {
      this.lastCycleIndex = cycle.cycleIndex;
      this.sentiment = cycle.sentiment;
      if (this.sentiment === 'BULL_RUN') {
        this.triggerMarketBanner('BULL RUN SURGE', '1.5X SPEED · SPREAD FIRE · FLAME TRAIL WAKE');
        audio.playMarketShift('BULL_RUN');
        this.cameraTrauma = Math.max(this.cameraTrauma, 0.45);
        this.marketIndex = Math.min(100, this.marketIndex + 15);
      } else {
        this.triggerMarketBanner('BEAR CRASH WARNING', 'MISSILE LIQUIDATION CANDLES · DOUBLE SPAWNS');
        audio.playMarketShift('BEAR_CRASH');
        this.cameraTrauma = Math.max(this.cameraTrauma, 0.65);
      }
    }

    // Market Index naturally slowly drains toward 10 if not gathering tokens
    if (this.marketIndex > 5) {
      this.marketIndex = Math.max(5, this.marketIndex - dt * 2.2);
    }
    this.currentMultiplier = calculateMultiplier(this.marketIndex);

    // 2. Player Movement & Input
    this.updatePlayer(dt);

    // 3. Spawners
    this.updateSpawners(dt);

    // 4. Bullets
    this.updateBullets(dt);

    // 5. Enemies
    this.updateEnemies(dt);

    // 6. Liquidation Candles (Bear Crash Hazard)
    this.updateCandles(dt);

    // 7. Yield Tokens ($)
    this.updateTokens(dt);

    // 8. Collisions
    this.handleCollisions();

    // 9. Push metrics to React HUD
    this.pushMetrics();
  }

  private updatePlayer(dt: number) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Compute input direction (keyboard + mobile virtual joystick)
    let moveX = this.virtualMove.x;
    let moveY = this.virtualMove.y;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveY -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveY += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveX += 1;

    // Clamp combined movement vector
    const moveMag = Math.hypot(moveX, moveY);
    if (moveMag > 1) {
      moveX /= moveMag;
      moveY /= moveMag;
    }

    // Speed calculation
    const baseSpeed = calculatePlayerSpeed(270, this.sentiment);
    const targetVx = moveX * baseSpeed;
    const targetVy = moveY * baseSpeed;

    // Smooth inertia acceleration & damping
    const accel = 14;
    this.player.vx += (targetVx - this.player.vx) * Math.min(1, dt * accel);
    this.player.vy += (targetVy - this.player.vy) * Math.min(1, dt * accel);

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Arena boundary clamp
    const pad = this.player.radius + 12;
    this.player.x = Math.max(pad, Math.min(width - pad, this.player.x));
    this.player.y = Math.max(pad + 40, Math.min(height - pad - 30, this.player.y));

    // Player aim angle
    if (this.virtualAim.active) {
      this.player.angle = this.virtualAim.angle;
    } else {
      const dx = this.mousePos.x - this.player.x;
      const dy = this.mousePos.y - this.player.y;
      this.player.angle = Math.atan2(dy, dx);
    }

    // Invulnerability timer
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Bull Run Fiery Profit Trail
    this.player.trailTimer -= dt;
    if (this.player.trailTimer <= 0) {
      const isMoving = Math.hypot(this.player.vx, this.player.vy) > 15;
      if (this.sentiment === 'BULL_RUN') {
        this.player.trailTimer = 0.04;
        // Emit fiery profit particles behind player
        const trailAngle = this.player.angle + Math.PI + (Math.random() - 0.5) * 0.5;
        const trailSpeed = 40 + Math.random() * 50;
        this.emitParticle(
          this.player.x - Math.cos(this.player.angle) * 12 + (Math.random() - 0.5) * 10,
          this.player.y - Math.sin(this.player.angle) * 12 + (Math.random() - 0.5) * 10,
          Math.cos(trailAngle) * trailSpeed,
          Math.sin(trailAngle) * trailSpeed,
          6 + Math.random() * 6,
          '#00FFA3',
          0.85,
          1.8,
          'flame'
        );

        // Damaging profit wake: damaging any enemy near the wake
        if (isMoving) {
          const wakeX = this.player.x - Math.cos(this.player.angle) * 20;
          const wakeY = this.player.y - Math.sin(this.player.angle) * 20;
          for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (checkCircleCollision(wakeX, wakeY, 24, e.x, e.y, e.radius)) {
              e.hp -= 35 * dt;
              e.hitFlashTimer = 0.05;
              if (Math.random() < 0.2) {
                this.emitBurst(e.x, e.y, 2, '#00FFA3', 90);
              }
            }
          }
        }
      } else {
        // Standard thruster particle
        this.player.trailTimer = 0.06;
        if (isMoving) {
          const thrusterAngle = this.player.angle + Math.PI + (Math.random() - 0.5) * 0.4;
          this.emitParticle(
            this.player.x - Math.cos(this.player.angle) * 14,
            this.player.y - Math.sin(this.player.angle) * 14,
            Math.cos(thrusterAngle) * 70,
            Math.sin(thrusterAngle) * 70,
            3,
            '#00FFA3',
            0.5,
            2.5,
            'circle'
          );
        }
      }
    }

    // Weapon Firing & Dash Cooldown
    if (this.dashCooldown > 0) {
      this.dashCooldown -= dt;
    }

    if (this.player.fireCooldown > 0) {
      this.player.fireCooldown -= dt;
    }

    const wantFire =
      this.isMouseDown || this.autoFire || this.virtualFireHeld || this.virtualAim.isFiring;
    if (wantFire && this.player.fireCooldown <= 0) {
      this.firePlayerWeapon();
    }
  }

  private firePlayerWeapon() {
    const isBull = this.sentiment === 'BULL_RUN';
    const fireInterval = isBull ? 0.11 : 0.17;
    this.player.fireCooldown = fireInterval;

    const bulletSpeed = 750;
    const baseAngle = this.player.angle;
    const spawnDist = this.player.radius + 6;

    if (isBull) {
      // 3-way to 5-way spread shot
      const count = this.marketIndex >= 80 ? 5 : 3;
      const spreadStep = count === 5 ? 0.12 : 0.15;
      const startAngle = baseAngle - ((count - 1) / 2) * spreadStep;

      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * spreadStep;
        const bx = this.player.x + Math.cos(angle) * spawnDist;
        const by = this.player.y + Math.sin(angle) * spawnDist;

        this.bullets.push({
          x: bx,
          y: by,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          radius: 4.5,
          damage: 28,
          life: 0,
          maxLife: 1.1,
          isEnemy: false,
          color: '#00FFA3',
        });
      }
      audio.playLaser(true);
      this.cameraTrauma = Math.max(this.cameraTrauma, 0.12);
    } else {
      // Single snappy data-packet
      const bx = this.player.x + Math.cos(baseAngle) * spawnDist;
      const by = this.player.y + Math.sin(baseAngle) * spawnDist;

      this.bullets.push({
        x: bx,
        y: by,
        vx: Math.cos(baseAngle) * bulletSpeed,
        vy: Math.sin(baseAngle) * bulletSpeed,
        radius: 4,
        damage: 34,
        life: 0,
        maxLife: 1.2,
        isEnemy: false,
        color: '#00FFA3',
      });
      audio.playLaser(false);
      this.cameraTrauma = Math.max(this.cameraTrauma, 0.08);
    }

    // Muzzle flash particle
    this.emitParticle(
      this.player.x + Math.cos(baseAngle) * (spawnDist + 2),
      this.player.y + Math.sin(baseAngle) * (spawnDist + 2),
      Math.cos(baseAngle) * 60,
      Math.sin(baseAngle) * 60,
      8,
      '#00FFA3',
      0.9,
      7.0,
      'circle'
    );
  }

  private updateSpawners(dt: number) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const params = calculateSpawnParams(this.totalPlayTime, this.sentiment);

    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0 && this.enemies.length < params.maxEnemies) {
      this.enemySpawnTimer = params.spawnInterval;
      this.spawnRandomEnemy(width, height, params);
    }

    // Liquidation Candles: Fall during BEAR CRASH as missile artillery
    if (this.sentiment === 'BEAR_CRASH') {
      this.candleSpawnTimer -= dt;
      if (this.candleSpawnTimer <= 0) {
        // Spawn 1 to 3 candles depending on run time
        const candleCount = this.totalPlayTime > 60 ? 2 : 1;
        this.candleSpawnTimer = Math.max(1.8, 4.0 - this.totalPlayTime * 0.02);

        for (let i = 0; i < candleCount; i++) {
          // Target near the player or randomized nearby
          const offsetRadius = 60 + Math.random() * 220;
          const offsetAngle = Math.random() * Math.PI * 2;
          const targetX = Math.max(40, Math.min(width - 40, this.player.x + Math.cos(offsetAngle) * offsetRadius));
          const targetY = Math.max(70, Math.min(height - 60, this.player.y + Math.sin(offsetAngle) * offsetRadius));

          this.candles.push({
            id: this.nextCandleId++,
            targetX,
            targetY,
            currY: -120 - i * 80,
            width: 32,
            height: 90,
            timer: 0,
            warningDuration: 0.85,
            hasLanded: false,
            shockwaveRadius: 0,
            maxShockwaveRadius: 130,
            damage: 42,
          });
          audio.playWarningPing();
        }
      }
    }
  }

  private spawnRandomEnemy(
    width: number,
    height: number,
    params: { golemChance: number; tankChance: number }
  ) {
    // Spawn off-screen perimeter
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    const pad = 50;

    switch (side) {
      case 0: // top
        x = Math.random() * width;
        y = -pad;
        break;
      case 1: // right
        x = width + pad;
        y = Math.random() * height;
        break;
      case 2: // bottom
        x = Math.random() * width;
        y = height + pad;
        break;
      case 3: // left
        x = -pad;
        y = Math.random() * height;
        break;
    }

    const roll = Math.random();
    if (roll < params.golemChance) {
      // Bear Golem: Heavy charging brute
      this.enemies.push({
        id: this.nextEnemyId++,
        type: 'bear_golem',
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0,
        radius: 28,
        hp: 240,
        maxHp: 240,
        speed: 95,
        scoreValue: 350,
        hitFlashTimer: 0,
        attackTimer: 1.5,
        telegraphTimer: 0,
        isCharging: false,
      });
    } else if (roll < params.golemChance + params.tankChance) {
      // Bear Tank: Heavy armored ranged enemy
      this.enemies.push({
        id: this.nextEnemyId++,
        type: 'bear_tank',
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0,
        radius: 22,
        hp: 130,
        maxHp: 130,
        speed: 120,
        scoreValue: 180,
        hitFlashTimer: 0,
        attackTimer: 2.2,
        telegraphTimer: 0,
      });
    } else {
      // FUD Bot: Fast agile swarmer
      this.enemies.push({
        id: this.nextEnemyId++,
        type: 'fud_bot',
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0,
        radius: 14,
        hp: 45,
        maxHp: 45,
        speed: 185 + Math.random() * 40,
        scoreValue: 80,
        hitFlashTimer: 0,
        attackTimer: 0,
        telegraphTimer: 0,
      });
    }
  }

  private updateBullets(dt: number) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life += dt;

      // Bullet trail
      if (Math.random() < 0.6) {
        this.emitParticle(
          b.x,
          b.y,
          -b.vx * 0.05 + (Math.random() - 0.5) * 20,
          -b.vy * 0.05 + (Math.random() - 0.5) * 20,
          2.5,
          b.color,
          0.6,
          3.5,
          'spark'
        );
      }

      // Check boundary or life expiration
      if (
        b.life >= b.maxLife ||
        b.x < -20 ||
        b.x > width + 20 ||
        b.y < -20 ||
        b.y > height + 20
      ) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
      }

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);

      // Distinct enemy AI policies per craft guide
      switch (e.type) {
        case 'fud_bot': {
          // Swarmer: directly seeks player with subtle avoidance
          e.angle = Math.atan2(dy, dx);
          e.vx = (dx / (dist || 1)) * e.speed;
          e.vy = (dy / (dist || 1)) * e.speed;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          break;
        }

        case 'bear_tank': {
          // Kiter / Heavy Ranged: keeps medium range, aims, charges beam
          e.angle = Math.atan2(dy, dx);
          const targetDist = 260;
          if (dist > targetDist + 40) {
            e.vx = (dx / (dist || 1)) * e.speed;
            e.vy = (dy / (dist || 1)) * e.speed;
          } else if (dist < targetDist - 40) {
            // Back away slowly
            e.vx = (-dx / (dist || 1)) * (e.speed * 0.6);
            e.vy = (-dy / (dist || 1)) * (e.speed * 0.6);
          } else {
            // Strafe perpendicular
            e.vx = (-dy / (dist || 1)) * (e.speed * 0.5);
            e.vy = (dx / (dist || 1)) * (e.speed * 0.5);
          }
          e.x += e.vx * dt;
          e.y += e.vy * dt;

          // Attack timer
          e.attackTimer -= dt;
          if (e.attackTimer <= 0.6 && e.telegraphTimer <= 0) {
            // Windup telegraph
            e.telegraphTimer = 0.6;
          }
          if (e.telegraphTimer > 0) {
            e.telegraphTimer -= dt;
            // Telegraph particles
            this.emitParticle(
              e.x + Math.cos(e.angle) * 18,
              e.y + Math.sin(e.angle) * 18,
              (Math.random() - 0.5) * 40,
              (Math.random() - 0.5) * 40,
              4,
              '#FF3B56',
              0.8,
              3.0,
              'spark'
            );
          }
          if (e.attackTimer <= 0) {
            e.attackTimer = 2.4 + Math.random() * 0.8;
            e.telegraphTimer = 0;
            // Shoot slow red expanding plasma bullet towards player
            const pAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            this.bullets.push({
              x: e.x + Math.cos(pAngle) * 20,
              y: e.y + Math.sin(pAngle) * 20,
              vx: Math.cos(pAngle) * 240,
              vy: Math.sin(pAngle) * 240,
              radius: 9,
              damage: 22,
              life: 0,
              maxLife: 3.5,
              isEnemy: true,
              color: '#FF3B56',
            });
            audio.playExplosion('light');
          }
          break;
        }

        case 'bear_golem': {
          // Giant Brute: Stomp charge behavior
          if (e.isCharging) {
            // Charging towards stored target
            if (e.chargeTarget) {
              const cdx = e.chargeTarget.x - e.x;
              const cdy = e.chargeTarget.y - e.y;
              const cdist = Math.hypot(cdx, cdy);
              if (cdist < 20 || e.attackTimer <= 0) {
                // Charge ended
                e.isCharging = false;
                e.attackTimer = 2.0;
              } else {
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                // Emit heavy dust / spark wake
                this.emitParticle(
                  e.x + (Math.random() - 0.5) * 20,
                  e.y + (Math.random() - 0.5) * 20,
                  -e.vx * 0.1,
                  -e.vy * 0.1,
                  6,
                  '#FF3B56',
                  0.7,
                  2.2,
                  'spark'
                );
              }
            }
          } else {
            // Normal slow lumbering
            e.angle = Math.atan2(dy, dx);
            e.vx = (dx / (dist || 1)) * e.speed;
            e.vy = (dy / (dist || 1)) * e.speed;
            e.x += e.vx * dt;
            e.y += e.vy * dt;

            e.attackTimer -= dt;
            if (e.attackTimer <= 0.7 && e.telegraphTimer <= 0) {
              // Stomp windup telegraph
              e.telegraphTimer = 0.7;
              audio.playWarningPing();
            }
            if (e.telegraphTimer > 0) {
              e.telegraphTimer -= dt;
            }
            if (e.attackTimer <= 0) {
              // Initiate violent charge
              e.isCharging = true;
              e.telegraphTimer = 0;
              e.attackTimer = 1.2; // Charge duration
              const chargeAngle = Math.atan2(dy, dx);
              const chargeSpeed = 440;
              e.vx = Math.cos(chargeAngle) * chargeSpeed;
              e.vy = Math.sin(chargeAngle) * chargeSpeed;
              e.chargeTarget = {
                x: this.player.x + Math.cos(chargeAngle) * 80,
                y: this.player.y + Math.sin(chargeAngle) * 80,
              };
              this.cameraTrauma = Math.max(this.cameraTrauma, 0.3);
            }
          }
          break;
        }
      }

      // Check if enemy is dead
      if (e.hp <= 0) {
        this.destroyEnemy(e, i);
      }
    }
  }

  private destroyEnemy(e: Enemy, index: number) {
    this.enemies.splice(index, 1);
    this.enemiesKilled++;

    // Hitstop freeze on kill for impact juice!
    this.hitstopTimer = e.type === 'bear_golem' ? 0.08 : 0.035;
    this.cameraTrauma = Math.max(this.cameraTrauma, e.type === 'bear_golem' ? 0.6 : 0.25);

    // Audio
    audio.playExplosion(e.type === 'fud_bot' ? 'light' : 'heavy');

    // Score with multiplier
    const gained = calculateScoreGain(e.scoreValue, this.currentMultiplier);
    this.score += gained;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('roguemarket_high_score', String(this.highScore));
      } catch {}
    }

    // Particle burst
    this.emitBurst(e.x, e.y, e.type === 'bear_golem' ? 32 : 14, '#FF3B56', 220);

    // Floating text
    this.addFloatingText(e.x, e.y - 10, `+$${gained}`, '#00FFA3', 1.1);

    // Drop yield gem ($ token)
    const tokenCount = e.type === 'bear_golem' ? 5 : e.type === 'bear_tank' ? 3 : 1;
    for (let k = 0; k < tokenCount; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.tokens.push({
        id: this.nextTokenId++,
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        value: 10,
        life: 0,
        maxLife: 14.0,
        radius: 9,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateCandles(dt: number) {
    for (let i = this.candles.length - 1; i >= 0; i--) {
      const c = this.candles[i];
      c.timer += dt;

      if (!c.hasLanded) {
        // Warning phase
        if (c.timer >= c.warningDuration) {
          // Candle slams down from ceiling
          c.currY = c.targetY;
          c.hasLanded = true;
          this.cameraTrauma = Math.max(this.cameraTrauma, 0.7);
          audio.playCandleImpact();

          // Explosion burst & ground scorch
          this.emitBurst(c.targetX, c.targetY, 28, '#FF3B56', 260);
          this.addFloatingText(c.targetX, c.targetY - 40, 'LIQUIDATION!', '#FF3B56', 1.3);

          // Check damage to player
          const distToPlayer = Math.hypot(this.player.x - c.targetX, this.player.y - c.targetY);
          if (distToPlayer <= 110) {
            this.damagePlayer(c.damage);
          }

          // Also damages any enemy nearby
          for (let j = 0; j < this.enemies.length; j++) {
            const en = this.enemies[j];
            const dist = Math.hypot(en.x - c.targetX, en.y - c.targetY);
            if (dist <= 120) {
              en.hp -= 100;
              en.hitFlashTimer = 0.2;
            }
          }
        }
      } else {
        // Shockwave expansion phase
        c.shockwaveRadius += dt * 320;
        if (c.shockwaveRadius >= c.maxShockwaveRadius) {
          this.candles.splice(i, 1);
        }
      }
    }
  }

  private updateTokens(dt: number) {
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const t = this.tokens[i];
      t.life += dt;

      // Friction
      t.vx *= Math.pow(0.9, dt * 60);
      t.vy *= Math.pow(0.9, dt * 60);
      t.x += t.vx * dt;
      t.y += t.vy * dt;

      // Magnetic attraction toward player
      const dx = this.player.x - t.x;
      const dy = this.player.y - t.y;
      const dist = Math.hypot(dx, dy);
      const magnetDist = this.sentiment === 'BULL_RUN' ? 220 : 130;

      if (dist < magnetDist) {
        const pull = (1 - dist / magnetDist) * 380;
        t.x += (dx / dist) * pull * dt;
        t.y += (dy / dist) * pull * dt;
      }

      // Check collection by player
      if (checkCircleCollision(this.player.x, this.player.y, this.player.radius, t.x, t.y, t.radius)) {
        this.collectToken(t, i);
      } else if (t.life >= t.maxLife) {
        this.tokens.splice(i, 1);
      }
    }
  }

  private collectToken(t: YieldToken, index: number) {
    this.tokens.splice(index, 1);
    this.tokensCollected++;

    // Raise market index
    this.marketIndex = Math.min(100, this.marketIndex + 4.5);
    this.currentMultiplier = calculateMultiplier(this.marketIndex);

    // Audio chime
    audio.playPickup(this.tokensCollected);

    // Score
    const gain = calculateScoreGain(50, this.currentMultiplier);
    this.score += gain;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('roguemarket_high_score', String(this.highScore));
      } catch {}
    }

    // Small sparkle
    this.emitBurst(t.x, t.y, 6, '#00FFA3', 90);
    this.addFloatingText(t.x, t.y - 12, `+$${gain}`, '#00FFA3', 0.9);
  }

  private handleCollisions() {
    // 1. Player Bullets vs Enemies
    for (let bIdx = this.bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = this.bullets[bIdx];
      if (b.isEnemy) continue;

      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = this.enemies[eIdx];
        if (checkCircleCollision(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
          e.hp -= b.damage;
          e.hitFlashTimer = 0.08;

          // Impact sparks
          this.emitBurst(b.x, b.y, 4, '#00FFA3', 120);

          // Remove bullet
          this.bullets.splice(bIdx, 1);
          break;
        }
      }
    }

    // 2. Enemy Bullets vs Player
    for (let bIdx = this.bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = this.bullets[bIdx];
      if (!b.isEnemy) continue;

      if (checkCircleCollision(b.x, b.y, b.radius, this.player.x, this.player.y, this.player.radius)) {
        this.damagePlayer(b.damage);
        this.emitBurst(b.x, b.y, 6, '#FF3B56', 150);
        this.bullets.splice(bIdx, 1);
      }
    }

    // 3. Enemy Body vs Player
    for (let eIdx = 0; eIdx < this.enemies.length; eIdx++) {
      const e = this.enemies[eIdx];
      if (checkCircleCollision(e.x, e.y, e.radius, this.player.x, this.player.y, this.player.radius)) {
        const bodyDamage = e.type === 'bear_golem' ? 38 : e.type === 'bear_tank' ? 24 : 14;
        this.damagePlayer(bodyDamage);

        // Push player away
        const pDx = this.player.x - e.x;
        const pDy = this.player.y - e.y;
        const pDist = Math.hypot(pDx, pDy) || 1;
        this.player.vx += (pDx / pDist) * 220;
        this.player.vy += (pDy / pDist) * 220;
      }
    }
  }

  private damagePlayer(damage: number) {
    if (this.player.invulnerableTimer > 0) return;

    this.player.hp = Math.max(0, this.player.hp - damage);
    this.player.invulnerableTimer = 0.45;
    this.cameraTrauma = Math.max(this.cameraTrauma, 0.55);
    audio.playPlayerHit();

    this.addFloatingText(this.player.x, this.player.y - 20, `-${damage} HP`, '#FF3B56', 1.2);
    this.emitBurst(this.player.x, this.player.y, 10, '#FF3B56', 160);

    // Drop market index upon being hit
    this.marketIndex = Math.max(0, this.marketIndex - 12);
    this.currentMultiplier = calculateMultiplier(this.marketIndex);

    if (this.player.hp <= 0) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    this.setPhase('gameover');
    this.hitstopTimer = 0.2;
    this.cameraTrauma = 0.9;
    audio.playExplosion('heavy');

    const metrics = this.getMetrics();
    this.onGameOverCallback?.(metrics);
  }

  public getMetrics(): GameMetrics {
    const cycle = getMarketCycle(this.totalPlayTime, CYCLE_DURATION);
    return {
      score: this.score,
      highScore: this.highScore,
      multiplier: this.currentMultiplier,
      marketIndex: Math.round(this.marketIndex),
      sentiment: this.sentiment,
      cycleTimeRemaining: Math.round(cycle.timeRemaining * 10) / 10,
      cycleDuration: CYCLE_DURATION,
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      timeSurvived: Math.floor(this.totalPlayTime),
      enemiesKilled: this.enemiesKilled,
      tokensCollected: this.tokensCollected,
      autoFire: this.autoFire,
      isMuted: audio.getIsMuted(),
    };
  }

  private pushMetrics() {
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.getMetrics());
    }
  }

  // ==========================================
  // RENDER PIPELINE
  // ==========================================
  private render() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ctx = this.ctx;

    // Apply Camera Shake via Trauma
    const shake = calculateTraumaShake(this.cameraTrauma, 16 * this.screenShakeMultiplier);

    ctx.save();
    ctx.translate(shake.offsetX, shake.offsetY);

    // 1. Deep slate background
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(-20, -20, width + 40, height + 40);

    // 2. Faint Cyber Grid
    this.renderCyberGrid(width, height);

    // 3. Moving Market Candlestick & Volume Charts in background
    this.renderMarketCharts(width, height);

    // 4. Ground Warning Telegraphs for Liquidation Candles
    this.renderCandleWarnings();

    // 5. Particles (Trails, sparks, flame wake)
    this.renderParticles();

    // 6. Yield Tokens ($)
    this.renderTokens();

    // 7. Bullets
    this.renderBullets();

    // 8. Enemies
    this.renderEnemies();

    // 9. Falling Liquidation Candles & Shockwaves
    this.renderCandles();

    // 10. Player Ship
    if (this.phase === 'playing' || this.phase === 'paused') {
      this.renderPlayer();
    }

    // 11. Floating Combat Texts
    this.renderFloatingTexts();

    // 12. Atmosphere & Sentiment Vignette Overlay
    this.renderAtmosphereOverlay(width, height);

    // 13. Market Shift Alert Banner (in-world canvas text)
    this.renderMarketBanner(width, height);

    ctx.restore();
  }

  private renderCyberGrid(width: number, height: number) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.sentiment === 'BULL_RUN' ? 'rgba(0, 255, 163, 0.05)' : 'rgba(255, 59, 86, 0.06)';
    ctx.lineWidth = 1;

    const gridSize = 48;
    ctx.beginPath();
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  private renderMarketCharts(width: number, height: number) {
    const ctx = this.ctx;
    const chartYBase = height * 0.45;
    const isBull = this.sentiment === 'BULL_RUN';

    // Draw background moving candlesticks
    ctx.save();
    ctx.globalAlpha = 0.22;

    this.chartCandles.forEach((c, idx) => {
      const renderX = (c.x - this.chartOffset + width + 100) % (width + 200) - 50;
      const candleColor = c.close >= c.open ? '#00FFA3' : '#FF3B56';

      ctx.fillStyle = candleColor;
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;

      // Wick
      ctx.beginPath();
      ctx.moveTo(renderX, chartYBase - c.high * 0.7);
      ctx.lineTo(renderX, chartYBase - c.low * 0.7);
      ctx.stroke();

      // Body
      const topY = chartYBase - Math.max(c.open, c.close) * 0.7;
      const bHeight = Math.max(3, Math.abs(c.open - c.close) * 0.7);
      ctx.fillRect(renderX - 6, topY, 12, bHeight);

      // Volume bar at bottom
      ctx.fillRect(renderX - 6, height - c.vol * 1.5, 12, c.vol * 1.5);
    });

    ctx.restore();
  }

  private renderCandleWarnings() {
    const ctx = this.ctx;
    this.candles.forEach((c) => {
      if (!c.hasLanded) {
        const progress = c.timer / c.warningDuration;
        const radius = 55;

        // Warning circle with animated strobe
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 59, 86, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.targetX, c.targetY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Shrinking countdown lock ring
        const shrinkRadius = radius * (1 - progress);
        ctx.fillStyle = 'rgba(255, 59, 86, 0.18)';
        ctx.beginPath();
        ctx.arc(c.targetX, c.targetY, shrinkRadius, 0, Math.PI * 2);
        ctx.fill();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(c.targetX - radius - 8, c.targetY);
        ctx.lineTo(c.targetX + radius + 8, c.targetY);
        ctx.moveTo(c.targetX, c.targetY - radius - 8);
        ctx.lineTo(c.targetX, c.targetY + radius + 8);
        ctx.stroke();

        // Warning text
        ctx.fillStyle = '#FF3B56';
        ctx.font = 'bold 11px var(--font-cyber, monospace)';
        ctx.textAlign = 'center';
        ctx.fillText('LIQUIDATION IMMINENT', c.targetX, c.targetY + radius + 16);
        ctx.restore();
      }
    });
  }

  private renderCandles() {
    const ctx = this.ctx;
    this.candles.forEach((c) => {
      if (c.hasLanded) {
        // Shockwave ring
        ctx.save();
        const shockAlpha = 1 - c.shockwaveRadius / c.maxShockwaveRadius;
        ctx.strokeStyle = `rgba(255, 59, 86, ${shockAlpha})`;
        ctx.lineWidth = 4 * shockAlpha;
        ctx.beginPath();
        ctx.arc(c.targetX, c.targetY, c.shockwaveRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Ground crater / candle residual
        ctx.fillStyle = `rgba(255, 59, 86, ${shockAlpha * 0.4})`;
        ctx.fillRect(c.targetX - c.width / 2, c.targetY - c.height, c.width, c.height);
        ctx.restore();
      }
    });
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particlePool[i];
      if (p.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'flame') {
        // Glowing flame particle
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderTokens() {
    const ctx = this.ctx;
    const now = performance.now() / 300;

    this.tokens.forEach((t) => {
      ctx.save();
      const bob = Math.sin(now + t.bobOffset) * 3;
      const cy = t.y + bob;

      // Pulsing glow
      ctx.shadowColor = '#00FFA3';
      ctx.shadowBlur = 12;

      // Hexagonal coin token
      ctx.strokeStyle = '#00FFA3';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#08251a';

      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const hx = t.x + Math.cos(a) * t.radius;
        const hy = cy + Math.sin(a) * t.radius;
        if (k === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dollar sign
      ctx.fillStyle = '#00FFA3';
      ctx.font = 'bold 11px var(--font-cyber, monospace)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', t.x, cy);

      ctx.restore();
    });
  }

  private renderBullets() {
    const ctx = this.ctx;
    this.bullets.forEach((b) => {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;

      // Stretched capsule in direction of travel
      const angle = Math.atan2(b.vy, b.vx);
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 2, b.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bright white core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius, b.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  private renderEnemies() {
    const ctx = this.ctx;
    this.enemies.forEach((e) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);

      const isFlashing = e.hitFlashTimer > 0;
      const baseRed = '#FF3B56';
      const drawColor = isFlashing ? '#ffffff' : baseRed;

      ctx.shadowColor = drawColor;
      ctx.shadowBlur = isFlashing ? 15 : 8;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 2;

      switch (e.type) {
        case 'fud_bot': {
          // Sharp triangular interceptor drone
          ctx.fillStyle = '#1c0c12';
          ctx.beginPath();
          ctx.moveTo(e.radius * 1.3, 0);
          ctx.lineTo(-e.radius * 0.9, -e.radius * 0.85);
          ctx.lineTo(-e.radius * 0.4, 0);
          ctx.lineTo(-e.radius * 0.9, e.radius * 0.85);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Red glowing core
          ctx.fillStyle = drawColor;
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'bear_tank': {
          // Armored hexagonal fortress with laser turret
          ctx.fillStyle = '#1c0910';
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            const hx = Math.cos(a) * e.radius;
            const hy = Math.sin(a) * e.radius;
            if (k === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cannon barrel
          ctx.fillStyle = drawColor;
          ctx.fillRect(0, -3.5, e.radius * 1.3, 7);

          // Turret dome
          ctx.beginPath();
          ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'bear_golem': {
          // Massive hulking quad brute with horns/spikes
          ctx.fillStyle = '#220811';
          ctx.beginPath();
          ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Horn spikes
          ctx.beginPath();
          ctx.moveTo(e.radius * 0.6, -e.radius * 0.9);
          ctx.lineTo(e.radius * 1.4, -e.radius * 0.7);
          ctx.lineTo(e.radius * 0.8, -e.radius * 0.3);
          ctx.moveTo(e.radius * 0.6, e.radius * 0.9);
          ctx.lineTo(e.radius * 1.4, e.radius * 0.7);
          ctx.lineTo(e.radius * 0.8, e.radius * 0.3);
          ctx.stroke();

          // Ominous eye visor
          ctx.fillStyle = e.isCharging ? '#ffffff' : drawColor;
          ctx.fillRect(e.radius * 0.2, -5, 6, 10);
          break;
        }
      }

      ctx.restore();

      // Mini in-world health bar for heavy units
      if (e.type !== 'fud_bot' && e.hp < e.maxHp) {
        ctx.save();
        const barWidth = e.radius * 2;
        const barHeight = 4;
        const bx = e.x - barWidth / 2;
        const by = e.y - e.radius - 12;

        ctx.fillStyle = 'rgba(10, 11, 16, 0.8)';
        ctx.fillRect(bx, by, barWidth, barHeight);

        const fillRatio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#FF3B56';
        ctx.fillRect(bx, by, barWidth * fillRatio, barHeight);
        ctx.restore();
      }
    });
  }

  private renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Invulnerability blink
    if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const isBull = this.sentiment === 'BULL_RUN';
    const mainColor = '#00FFA3';

    ctx.shadowColor = mainColor;
    ctx.shadowBlur = isBull ? 20 : 12;

    // Advanced Cyberpunk Player Chassis (Sleek Interceptor)
    ctx.fillStyle = '#061d15';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.2;

    // Arrowhead cockpit
    ctx.beginPath();
    ctx.moveTo(p.radius * 1.35, 0); // Nose
    ctx.lineTo(-p.radius * 0.9, -p.radius * 0.9); // Left wing
    ctx.lineTo(-p.radius * 0.4, -p.radius * 0.25);
    ctx.lineTo(-p.radius * 0.7, 0); // Engine notch
    ctx.lineTo(-p.radius * 0.4, p.radius * 0.25);
    ctx.lineTo(-p.radius * 0.9, p.radius * 0.9); // Right wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neon cockpit canopy
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(p.radius * 0.2, 0, p.radius * 0.5, p.radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dual wing lasers
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.radius * 0.2, -p.radius * 0.75, 6, 2);
    ctx.fillRect(p.radius * 0.2, p.radius * 0.75 - 2, 6, 2);

    ctx.restore();

    // Laser sight line toward mouse cursor
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 163, 0.22)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(this.mousePos.x, this.mousePos.y);
    ctx.stroke();

    // Subtle aiming crosshair on mouse
    ctx.strokeStyle = 'rgba(0, 255, 163, 0.6)';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(this.mousePos.x, this.mousePos.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderFloatingTexts() {
    const ctx = this.ctx;
    this.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${Math.round(14 * ft.scale)}px var(--font-cyber, monospace)`;
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  private renderAtmosphereOverlay(width: number, height: number) {
    const ctx = this.ctx;

    // Peripheral screen vignette
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.35,
      width / 2,
      height / 2,
      width * 0.7
    );

    if (this.sentiment === 'BEAR_CRASH') {
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(255, 30, 60, 0.22)');
    } else {
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 255, 163, 0.08)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Critical HP Red Alert vignette
    if (this.player.hp <= 30 && this.phase === 'playing') {
      const pulse = Math.sin(performance.now() / 150) * 0.15 + 0.25;
      ctx.fillStyle = `rgba(255, 0, 40, ${pulse})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private renderMarketBanner(width: number, height: number) {
    if (this.bannerTimer <= 0) return;

    const ctx = this.ctx;
    const progress = this.bannerTimer / 2.8;
    const alpha = Math.min(1, progress * 2.5);
    const isBull = this.sentiment === 'BULL_RUN';
    const accentColor = isBull ? '#00FFA3' : '#FF3B56';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';

    const bannerY = height * 0.22;

    // Glowing border ribbon
    ctx.fillStyle = isBull ? 'rgba(0, 255, 163, 0.12)' : 'rgba(255, 59, 86, 0.15)';
    ctx.fillRect(width * 0.15, bannerY - 32, width * 0.7, 64);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(width * 0.15, bannerY - 32, width * 0.7, 64);

    // Title
    ctx.fillStyle = accentColor;
    ctx.font = '900 24px var(--font-cyber, monospace)';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 15;
    ctx.fillText(this.bannerTitle, width / 2, bannerY - 6);

    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px var(--font-mono, monospace)';
    ctx.shadowBlur = 0;
    ctx.fillText(this.bannerSubtitle, width / 2, bannerY + 18);

    ctx.restore();
  }
}
