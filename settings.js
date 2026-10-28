// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Floating joystick: touch anywhere on the game and drag. Radius is in screen (CSS) pixels.
  touch: { stickRadius: 55, deadZone: 0.2, restartDelay: 600 },
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
