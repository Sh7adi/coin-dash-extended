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
    this.level = 1;
    this.levelCoins = 0;
    this.goal = c.levels.firstGoal;
    this.droneSpeed = c.droneSpeed;
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
      this.addDrone(this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone), 35 + i * 105);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.levelCoins++;
      CoinDashSound.coin();
      this.placeCoin();
      if (this.levelCoins >= this.goal) this.levelUp();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
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
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.drones.getChildren().forEach((d) => d.body.velocity.setLength(this.droneSpeed));
    if (this.drones.getLength() < l.maxDrones) this.spawnDrone();
    CoinDashSound.levelUp();
    const banner = this.add.text(c.width / 2, c.height / 2 - 60, `LEVEL ${this.level}`,
      { font: 'bold 48px monospace', color: c.colors.hud }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: banner, y: banner.y - 30, alpha: 0, delay: 600, duration: 900, onComplete: () => banner.destroy() });
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
    this.tweens.add({ targets: drone, alpha: { from: 0.15, to: 1 }, duration: 250, yoyo: true, repeat: -1 });
    this.time.delayedCall(c.levels.newDroneWarning * 1000, () => {
      if (this.finished) return;
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

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Level ${this.level}     Goal: ${this.levelCoins}/${this.goal}     Coins: ${this.score}     Best: ${this.best}     Time: ${seconds}s`);
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
      `${reason}\nLevel ${this.level} · ${this.score} coins\n${newBest ? 'New best! ' : ''}Best: ${this.best}\nPress R to try again`,
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
