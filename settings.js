// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Difficulty presets override the tuning above; press 1/2/3 in game to switch.
  difficulties: {
    easy:   { label: 'Easy',   roundSeconds: 60, playerSpeed: 260, droneSpeed: 80,  droneCount: 2 },
    normal: { label: 'Normal', roundSeconds: 45, playerSpeed: 240, droneSpeed: 105, droneCount: 3 },
    hard:   { label: 'Hard',   roundSeconds: 35, playerSpeed: 240, droneSpeed: 150, droneCount: 5 }
  },
  defaultDifficulty: 'normal',
  // Floating joystick: touch anywhere on the game and drag. Radius is in screen (CSS) pixels.
  touch: { stickRadius: 55, deadZone: 0.2, restartDelay: 600 },
  // Extra enemies join the round appearAt seconds in, after blinking for `warning` seconds.
  enemies: {
    warning: 1,
    hunter: { appearAt: 8, speed: 75, turnRate: 0.03, size: 22 },
    dasher: { appearAt: 18, cruiseSpeed: 50, dashSpeed: 430, dashEvery: [2.5, 4], windup: 0.6, dashTime: 0.45, radius: 11 }
  },
  // Reach a level's coin goal before the clock runs out to advance; the clock then resets.
  levels: { firstGoal: 8, goalStep: 2, droneSpeedStep: 15, maxDrones: 6, newDroneWarning: 1 },
  timeCoin: { every: [10, 15], lifetime: 4, bonusSeconds: 5 },
  themes: {
    // Neon arcade palette: near-black backdrop, synthwave grid, glowing saturated sprites.
    neon: {
      background: 0x0b0614, // near-black violet
      grid: 0x7a1fa8,       // synthwave purple grid lines
      player: 0x00f0ff,     // electric cyan
      coin: 0xffd400,       // neon gold
      drone: 0xff2e88,      // hot pink
      hunter: 0xff8c1a,     // orange homing enemy
      dasher: 0xb44dff,     // violet charging enemy
      dasherFlash: 0xffffff, // dasher fill while winding up a charge
      enemyStroke: 0xffffff, // outline on hunters and dashers
      timeCoin: 0x39ff14,   // neon green bonus coin
      stickBase: 0xffffff,  // touch joystick ring fill (drawn faint)
      stick: 0x00f0ff,      // touch joystick ring outline and knob
      hud: '#b6ff3b',       // lime HUD text (CSS string for Phaser text)
      levelBanner: '#00f0ff', // "LEVEL n" text
      panel: 0x12061f,      // end-of-round panel
      panelText: '#f2fbff'  // near-white panel text
    },
    // Retro handheld palette: four greens + one muted brick-red accent for drones.
    retro: {
      background: 0x8bac0f, // light green "LCD" field
      grid: 0x306230,       // dark green, drawn at low alpha
      player: 0x0f380f,     // darkest green square
      coin: 0xe0f8d0,       // pale highlight so coins pop off the field
      drone: 0x9c2a2a,      // single accent: muted brick red
      hunter: 0xb5651d,     // muted ochre: reads apart from the red drones and green player
      dasher: 0x4b3f72,     // muted indigo
      dasherFlash: 0xffffff,
      enemyStroke: 0x0f380f, // dark outline; white would wash out on the light field
      timeCoin: 0x1f4fd8,   // cobalt blue bonus coin, distinct from the greens and red
      stickBase: 0x0f380f,  // joystick ring fill: white would vanish on the light field
      stick: 0x0f380f,
      hud: '#0f380f',
      levelBanner: '#0f380f',
      panel: 0x0f380f,      // game-over panel
      panelText: '#e0f8d0'
    }
  }
};
// The page sets <html data-theme> from localStorage before first paint; colors is the active palette.
COIN_DASH.theme = document.documentElement.dataset.theme === 'retro' ? 'retro' : 'neon';
COIN_DASH.colors = COIN_DASH.themes[COIN_DASH.theme];
