/* global Phaser, COIN_DASH */
const BEST_KEY = 'coinDash.bestScore';
const DIFFICULTY_KEY = 'coinDash.difficulty';
// Normal keeps the original key so best scores from before presets carry over.
function bestKey(difficulty) {
  return difficulty === 'normal' ? BEST_KEY : `${BEST_KEY}.${difficulty}`;
}
function loadBest(difficulty) {
  try { return Math.max(0, parseInt(localStorage.getItem(bestKey(difficulty)), 10) || 0); } catch (e) { return 0; }
}
function saveBest(difficulty, n) {
  try { localStorage.setItem(bestKey(difficulty), String(n)); } catch (e) { /* storage unavailable */ }
}
function loadDifficulty() {
  try {
    const id = localStorage.getItem(DIFFICULTY_KEY);
    if (Object.prototype.hasOwnProperty.call(COIN_DASH.difficulties, id)) return id;
  } catch (e) { /* storage unavailable */ }
  return COIN_DASH.defaultDifficulty;
}
function saveDifficulty(id) {
  try { localStorage.setItem(DIFFICULTY_KEY, id); } catch (e) { /* storage unavailable */ }
}
function showThemeLabel() {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = 'Theme: ' + (COIN_DASH.theme === 'retro' ? 'Retro' : 'Neon');
}
function toggleTheme() {
  const c = COIN_DASH;
  c.theme = c.theme === 'retro' ? 'neon' : 'retro';
  c.colors = c.themes[c.theme];
  document.documentElement.dataset.theme = c.theme;
  try { localStorage.setItem('coinDash.theme', c.theme); } catch (e) { /* storage unavailable */ }
  showThemeLabel();
  const scene = window.coinDashGame && window.coinDashGame.scene.getScene('CoinDash');
  if (scene && scene.sys.isActive() && scene.hud) scene.applyTheme();
}
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    this.difficulty = this.difficulty || loadDifficulty();
    // Preset values override the base tuning for this round.
    const c = this.tune = { ...COIN_DASH, ...COIN_DASH.difficulties[this.difficulty] };
    this.score = 0;
    this.level = 1;
    this.levelCoins = 0;
    this.goal = c.levels.firstGoal;
    this.droneSpeed = c.droneSpeed;
    this.banner = null;
    this.incomingDrones = [];
    this.best = loadBest(this.difficulty);
    this.finished = false;
    this.panel = this.panelText = null;
    this.enemies = [];
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.grid = this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, c.colors.grid, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: c.colors.hud });
    this.difficultyLabel = this.add.text(c.width - 18, 12, `${c.label} [1/2/3]`,
      { font: '18px monospace', color: c.colors.hud }).setOrigin(1, 0);
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      this.addDrone(this.add.rectangle(90 + (i % 3) * 270, 100 + Math.floor(i / 3) * 300, 26, 26, c.colors.drone), 35 + i * 105);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.levelCoins++;
      CoinDashSound.coin();
      this.burst(this.coin.x, this.coin.y, COIN_DASH.colors.coin);
      this.placeCoin();
      if (this.levelCoins >= this.goal) this.levelUp();
    });
    this.physics.add.overlap(this.player, this.drones,
      (player, enemy) => this.finish(`A ${enemy.getData('kind') || 'drone'} caught you!`, enemy.fillColor));
    this.time.delayedCall(c.enemies.hunter.appearAt * 1000, () => this.spawnEnemy('hunter'));
    this.time.delayedCall(c.enemies.dasher.appearAt * 1000, () => this.spawnEnemy('dasher'));
    this.timeCoin = this.add.circle(0, 0, 11, c.colors.timeCoin).setStrokeStyle(3, 0xffffff).setVisible(false);
    this.physics.add.existing(this.timeCoin);
    this.timeCoin.body.setCircle(11);
    this.timeCoin.body.enable = false;
    this.physics.add.overlap(this.player, this.timeCoin, () => this.collectTimeCoin());
    this.scheduleTimeCoin();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-T', toggleTheme);
    const presets = Object.keys(COIN_DASH.difficulties);
    this.input.keyboard.on('keydown', (e) => {
      const id = presets[Number(e.key) - 1];
      if (!id || e.repeat) return;
      this.difficulty = id;
      saveDifficulty(id);
      this.scene.restart();
    });
    this.createTouchStick();
  }

  applyTheme() {
    const k = COIN_DASH.colors;
    this.cameras.main.setBackgroundColor(k.background);
    this.grid.setFillStyle(k.background, 1).setOutlineStyle(k.grid, 0.45);
    this.hud.setColor(k.hud);
    this.difficultyLabel.setColor(k.hud);
    this.player.setFillStyle(k.player);
    this.coin.setFillStyle(k.coin);
    this.drones.getChildren().forEach(d => { if (!d.getData('kind')) d.setFillStyle(k.drone); });
    this.incomingDrones.forEach(d => d.setFillStyle(k.drone));
    this.enemies.forEach(e => this.paintEnemy(e));
    this.timeCoin.setFillStyle(k.timeCoin);
    this.paintStick();
    if (this.banner) this.banner.setColor(k.levelBanner);
    if (this.panel) {
      this.panel.setFillStyle(k.panel, 0.95);
      this.panelText.setColor(k.panelText);
    }
  }

  createTouchStick() {
    const t = COIN_DASH.touch;
    this.stick = {
      pointerId: null,
      radius: t.stickRadius,
      vector: new Phaser.Math.Vector2(),
      base: this.add.circle(0, 0, t.stickRadius).setDepth(10).setVisible(false),
      knob: this.add.circle(0, 0, 22).setDepth(11).setVisible(false)
    };
    this.paintStick();
    this.input.on('pointerdown', (p) => {
      // After a round ends, a fresh tap restarts (short delay so the finishing touch doesn't).
      if (this.finished) {
        if (this.time.now - this.finishedAt > t.restartDelay) this.scene.restart();
        return;
      }
      if (this.stick.pointerId !== null) return;
      // The canvas is scaled to fit the page, so convert the radius to game pixels.
      const r = t.stickRadius * Math.max(1, this.scale.displayScale.x);
      this.stick.pointerId = p.id;
      this.stick.radius = r;
      this.stick.base.setRadius(r).setPosition(p.x, p.y).setVisible(true);
      this.stick.knob.setRadius(r * 0.4).setPosition(p.x, p.y).setVisible(true);
    });
    this.input.on('pointermove', (p) => {
      if (p.id !== this.stick.pointerId) return;
      const { base, knob, vector, radius } = this.stick;
      vector.set(p.x - base.x, p.y - base.y).limit(radius);
      knob.setPosition(base.x + vector.x, base.y + vector.y);
      vector.scale(1 / radius);
    });
    const release = (p) => { if (p.id === this.stick.pointerId) this.releaseStick(); };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  paintStick() {
    const k = COIN_DASH.colors;
    this.stick.base.setFillStyle(k.stickBase, 0.1).setStrokeStyle(2, k.stick, 0.6);
    this.stick.knob.setFillStyle(k.stick, 0.45);
  }

  releaseStick() {
    this.stick.pointerId = null;
    this.stick.vector.reset();
    this.stick.base.setVisible(false);
    this.stick.knob.setVisible(false);
  }

  addDrone(drone, angleDeg) {
    this.drones.add(drone);
    drone.body.setCollideWorldBounds(true).setBounce(1, 1);
    this.physics.velocityFromAngle(angleDeg, this.droneSpeed, drone.body.velocity);
  }

  levelUp() {
    const c = COIN_DASH, l = c.levels;
    this.level++;
    this.levelCoins = 0;
    this.goal = l.firstGoal + (this.level - 1) * l.goalStep;
    this.droneSpeed += l.droneSpeedStep;
    this.deadline = this.time.now + this.tune.roundSeconds * 1000;
    // Only the plain drones speed up and count toward the cap; hunters and dashers keep their own tuning.
    const drones = this.drones.getChildren().filter(d => !d.getData('kind'));
    drones.forEach((d) => d.body.velocity.setLength(this.droneSpeed));
    if (drones.length + this.incomingDrones.length < l.maxDrones) this.spawnDrone();
    CoinDashSound.levelUp();
    if (this.banner) this.banner.destroy();
    const banner = this.banner = this.add.text(c.width / 2, c.height / 2 - 60, `LEVEL ${this.level}`,
      { font: 'bold 48px monospace', color: c.colors.levelBanner }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: banner, y: banner.y - 30, alpha: 0, delay: 600, duration: 900,
      onComplete: () => { banner.destroy(); if (this.banner === banner) this.banner = null; } });
  }

  spawnDrone() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(40, c.width - 40);
      y = Phaser.Math.Between(84, c.height - 40);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 200);
    // Blink harmlessly first so a new drone never appears on top of the player unannounced.
    const drone = this.add.rectangle(x, y, 26, 26, c.colors.drone);
    this.incomingDrones.push(drone);
    this.tweens.add({ targets: drone, alpha: { from: 0.15, to: 1 }, duration: 250, yoyo: true, repeat: -1 });
    this.time.delayedCall(c.levels.newDroneWarning * 1000, () => {
      if (this.finished) return;
      Phaser.Utils.Array.Remove(this.incomingDrones, drone);
      this.tweens.killTweensOf(drone);
      drone.setAlpha(1);
      // Diagonal-ish headings so it doesn't just bounce along one axis.
      this.addDrone(drone, Phaser.Math.Between(20, 70) + 90 * Phaser.Math.Between(0, 3));
    });
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  burst(x, y, color, count = 10) {
    if (!this.textures.exists('spark')) this.make.graphics({}, false).fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture('spark', 8, 8).destroy();
    const fx = this.add.particles(x, y, 'spark', { speed: { min: 80, max: 200 }, lifespan: 400,
      scale: { start: 1, end: 0.2 }, alpha: { start: 1, end: 0 }, tint: color, emitting: false });
    fx.explode(count);
    this.time.delayedCall(450, () => fx.destroy());
  }

  spawnEnemy(kind) {
    if (this.finished) return;
    const c = COIN_DASH, e = c.enemies[kind];
    // Appear well away from the player and blink before becoming dangerous.
    let x, y;
    do {
      x = Phaser.Math.Between(40, c.width - 40);
      y = Phaser.Math.Between(84, c.height - 40);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 250);
    const enemy = kind === 'hunter' ? this.add.rectangle(x, y, e.size, e.size) : this.add.circle(x, y, e.radius);
    enemy.setData('kind', kind);
    this.enemies.push(enemy);
    this.paintEnemy(enemy);
    this.tweens.add({ targets: enemy, alpha: { from: 0.15, to: 1 }, duration: 250, yoyo: true, repeat: -1 });
    this.time.delayedCall(c.enemies.warning * 1000, () => {
      if (this.finished) return;
      this.tweens.killTweensOf(enemy);
      enemy.setAlpha(1);
      this.drones.add(enemy);
      enemy.body.setCollideWorldBounds(true);
      if (kind === 'hunter') {
        enemy.body.setAngularVelocity(120);
      } else {
        enemy.body.setCircle(e.radius).setBounce(1, 1);
        this.dasherCruise(enemy);
      }
    });
  }

  // Colours are looked up from the active theme each time, so applyTheme() can repaint mid-round.
  paintEnemy(enemy) {
    const k = COIN_DASH.colors, kind = enemy.getData('kind');
    enemy.setFillStyle(enemy.getData('windup') ? k.dasherFlash : k[kind])
      .setStrokeStyle(kind === 'hunter' ? 2 : 3, k.enemyStroke);
  }

  steerHunters(delta) {
    const e = COIN_DASH.enemies.hunter;
    // Frame-rate independent easing toward the player; turning sharply also slows it down.
    const t = 1 - Math.pow(1 - e.turnRate, delta / (1000 / 60));
    this.drones.getChildren().forEach((d) => {
      if (d.getData('kind') !== 'hunter') return;
      const want = new Phaser.Math.Vector2(this.player.x - d.x, this.player.y - d.y).normalize().scale(e.speed);
      d.body.velocity.lerp(want, t);
    });
  }

  dasherCruise(d) {
    if (this.finished) return;
    const e = COIN_DASH.enemies.dasher;
    this.physics.velocityFromAngle(Phaser.Math.Between(0, 359), e.cruiseSpeed, d.body.velocity);
    this.time.delayedCall(Phaser.Math.FloatBetween(...e.dashEvery) * 1000, () => this.dasherWindup(d));
  }

  dasherWindup(d) {
    if (this.finished) return;
    const e = COIN_DASH.enemies.dasher;
    d.body.setVelocity(0, 0);
    this.paintEnemy(d.setData('windup', true));
    this.time.delayedCall(e.windup * 1000, () => {
      if (this.finished) return;
      this.paintEnemy(d.setData('windup', false));
      // Charge at where the player is now, so moving during the flash dodges it.
      this.physics.moveTo(d, this.player.x, this.player.y, e.dashSpeed);
      this.time.delayedCall(e.dashTime * 1000, () => this.dasherCruise(d));
    });
  }

  scheduleTimeCoin() {
    const [min, max] = COIN_DASH.timeCoin.every;
    this.time.delayedCall(Phaser.Math.FloatBetween(min, max) * 1000, () => this.spawnTimeCoin());
  }

  spawnTimeCoin() {
    if (this.finished) return;
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    const t = this.timeCoin.setPosition(x, y).setVisible(true).setAlpha(1).setScale(1);
    t.body.enable = true;
    t.body.reset(x, y);
    this.tweens.add({ targets: t, scale: 1.3, duration: 350, yoyo: true, repeat: -1 });
    const life = c.timeCoin.lifetime * 1000;
    this.timeCoinTimers = [
      this.time.delayedCall(life - 1000, () => this.tweens.add({ targets: t, alpha: 0.15, duration: 125, yoyo: true, repeat: -1 })),
      this.time.delayedCall(life, () => this.hideTimeCoin())
    ];
  }

  hideTimeCoin() {
    const t = this.timeCoin;
    this.tweens.killTweensOf(t);
    (this.timeCoinTimers || []).forEach(timer => timer.remove());
    this.timeCoinTimers = null;
    t.setVisible(false).setAlpha(1).setScale(1);
    t.body.enable = false;
    if (!this.finished) this.scheduleTimeCoin();
  }

  collectTimeCoin() {
    if (this.finished || !this.timeCoin.visible) return;
    const bonus = COIN_DASH.timeCoin.bonusSeconds;
    this.deadline += bonus * 1000;
    const label = this.add.text(this.timeCoin.x, this.timeCoin.y - 14, `+${bonus}s`,
      { font: 'bold 20px monospace', color: '#' + COIN_DASH.colors.timeCoin.toString(16).padStart(6, '0') }).setOrigin(0.5);
    this.tweens.add({ targets: label, y: label.y - 36, alpha: 0, duration: 900, onComplete: () => label.destroy() });
    this.burst(this.timeCoin.x, this.timeCoin.y, COIN_DASH.colors.timeCoin ?? COIN_DASH.timeCoin.color);
    this.hideTimeCoin();
  }

  update(time, delta) {
    if (this.finished) return;
    this.steerHunters(delta);
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    let direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.tune.playerSpeed);
    // Keyboard wins; otherwise the joystick gives analog speed past its dead zone.
    if (!dx && !dy && this.stick.vector.length() > COIN_DASH.touch.deadZone) {
      direction = this.stick.vector.clone().scale(this.tune.playerSpeed);
    }
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    // Tighter than the original spacing so it stays clear of the difficulty label on the right.
    this.hud.setText(`Level ${this.level}   Goal ${this.levelCoins}/${this.goal}   Coins ${this.score}   Best ${this.best}   Time ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason, hitColor = COIN_DASH.colors.drone) {
    if (this.finished) return;
    this.finished = true;
    this.finishedAt = this.time.now;
    this.physics.pause();
    this.releaseStick();
    CoinDashSound[reason === 'Time is up!' ? 'timeUp' : 'hit']();
    if (reason !== 'Time is up!') { this.cameras.main.shake(250, 0.01).flash(150, 255, 40, 60); this.burst(this.player.x, this.player.y, hitColor, 16); }
    const c = COIN_DASH;
    const newBest = this.score > this.best;
    if (newBest) { this.best = this.score; saveBest(this.difficulty, this.best); }
    this.panel = this.add.rectangle(c.width / 2, c.height / 2, 460, 200, c.colors.panel, 0.95);
    this.panelText = this.add.text(c.width / 2, c.height / 2,
      `${reason}\nLevel ${this.level} · ${this.score} coins\n${newBest ? 'New best! ' : ''}${this.tune.label} best: ${this.best}\nPress R or tap to try again`,
      { font: '24px monospace', color: c.colors.panelText, align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
showThemeLabel();
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
