/* global Phaser, COIN_DASH */
const BEST_KEY = 'coinDash.bestScore';
function loadBest() {
  try { return Math.max(0, parseInt(localStorage.getItem(BEST_KEY), 10) || 0); } catch (e) { return 0; }
}
function saveBest(n) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* storage unavailable */ }
}
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.best = loadBest();
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, c.colors.grid, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: c.colors.hud });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      CoinDashSound.coin();
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones,
      (player, enemy) => this.finish(`A ${enemy.getData('kind') || 'drone'} caught you!`));
    this.time.delayedCall(c.enemies.hunter.appearAt * 1000, () => this.spawnEnemy('hunter'));
    this.time.delayedCall(c.enemies.dasher.appearAt * 1000, () => this.spawnEnemy('dasher'));
    this.timeCoin = this.add.circle(0, 0, 11, c.timeCoin.color).setStrokeStyle(3, 0xffffff).setVisible(false);
    this.physics.add.existing(this.timeCoin);
    this.timeCoin.body.setCircle(11);
    this.timeCoin.body.enable = false;
    this.physics.add.overlap(this.player, this.timeCoin, () => this.collectTimeCoin());
    this.scheduleTimeCoin();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
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

  spawnEnemy(kind) {
    if (this.finished) return;
    const c = COIN_DASH, e = c.enemies[kind];
    // Appear well away from the player and blink before becoming dangerous.
    let x, y;
    do {
      x = Phaser.Math.Between(40, c.width - 40);
      y = Phaser.Math.Between(84, c.height - 40);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 250);
    const enemy = kind === 'hunter'
      ? this.add.rectangle(x, y, e.size, e.size, e.color).setStrokeStyle(2, 0xffffff)
      : this.add.circle(x, y, e.radius, e.color).setStrokeStyle(3, 0xffffff);
    enemy.setData('kind', kind);
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
    d.setFillStyle(0xffffff);
    this.time.delayedCall(e.windup * 1000, () => {
      if (this.finished) return;
      d.setFillStyle(e.color);
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
      { font: 'bold 20px monospace', color: '#' + COIN_DASH.timeCoin.color.toString(16).padStart(6, '0') }).setOrigin(0.5);
    this.tweens.add({ targets: label, y: label.y - 36, alpha: 0, duration: 900, onComplete: () => label.destroy() });
    this.hideTimeCoin();
  }

  update(time, delta) {
    if (this.finished) return;
    this.steerHunters(delta);
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
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
    const c = COIN_DASH;
    const newBest = this.score > this.best;
    if (newBest) { this.best = this.score; saveBest(this.best); }
    this.add.rectangle(c.width / 2, c.height / 2, 460, 200, c.colors.panel, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n${newBest ? 'New best! ' : ''}Best: ${this.best}\nPress R to try again`,
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
