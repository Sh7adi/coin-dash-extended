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
    this.best = loadBest(this.difficulty);
    this.finished = false;
    this.panel = this.panelText = null;
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
      const drone = this.add.rectangle(90 + (i % 3) * 270, 100 + Math.floor(i / 3) * 300, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      CoinDashSound.coin();
      this.burst(this.coin.x, this.coin.y, COIN_DASH.colors.coin);
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
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
  }

  applyTheme() {
    const k = COIN_DASH.colors;
    this.cameras.main.setBackgroundColor(k.background);
    this.grid.setFillStyle(k.background, 1).setOutlineStyle(k.grid, 0.45);
    this.hud.setColor(k.hud);
    this.difficultyLabel.setColor(k.hud);
    this.player.setFillStyle(k.player);
    this.coin.setFillStyle(k.coin);
    this.drones.getChildren().forEach(d => d.setFillStyle(k.drone));
    this.timeCoin.setFillStyle(k.timeCoin);
    if (this.panel) {
      this.panel.setFillStyle(k.panel, 0.95);
      this.panelText.setColor(k.panelText);
    }
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

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.tune.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}          Best: ${this.best}          Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    CoinDashSound[reason === 'Time is up!' ? 'timeUp' : 'hit']();
    if (reason !== 'Time is up!') { this.cameras.main.shake(250, 0.01).flash(150, 255, 40, 60); this.burst(this.player.x, this.player.y, COIN_DASH.colors.drone, 16); }
    const c = COIN_DASH;
    const newBest = this.score > this.best;
    if (newBest) { this.best = this.score; saveBest(this.difficulty, this.best); }
    this.panel = this.add.rectangle(c.width / 2, c.height / 2, 460, 200, c.colors.panel, 0.95);
    this.panelText = this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n${newBest ? 'New best! ' : ''}${this.tune.label} best: ${this.best}\nPress R to try again`,
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
