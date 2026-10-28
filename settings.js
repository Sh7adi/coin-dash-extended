// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Extra enemies join the round appearAt seconds in, after blinking for `warning` seconds.
  enemies: {
    warning: 1,
    hunter: { appearAt: 8, speed: 75, turnRate: 0.03, size: 22, color: 0xff8c1a },
    dasher: { appearAt: 18, cruiseSpeed: 50, dashSpeed: 430, dashEvery: [2.5, 4], windup: 0.6, dashTime: 0.45,
      radius: 11, color: 0xb44dff }
  },
  timeCoin: { every: [10, 15], lifetime: 4, bonusSeconds: 5, color: 0x39ff14 },
  // Neon arcade palette: near-black backdrop, synthwave grid, glowing saturated sprites.
  colors: {
    background: 0x0b0614, // near-black violet
    grid: 0x7a1fa8,       // synthwave purple grid lines
    player: 0x00f0ff,     // electric cyan
    coin: 0xffd400,       // neon gold
    drone: 0xff2e88,      // hot pink
    hud: '#b6ff3b',       // lime HUD text (CSS string for Phaser text)
    panel: 0x12061f,      // end-of-round panel
    panelText: '#f2fbff'  // near-white panel text
  }
};
