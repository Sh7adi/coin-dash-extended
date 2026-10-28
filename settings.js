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
  timeCoin: { every: [10, 15], lifetime: 4, bonusSeconds: 5 },
  themes: {
    // Neon arcade palette: near-black backdrop, synthwave grid, glowing saturated sprites.
    neon: {
      background: 0x0b0614, // near-black violet
      grid: 0x7a1fa8,       // synthwave purple grid lines
      player: 0x00f0ff,     // electric cyan
      coin: 0xffd400,       // neon gold
      drone: 0xff2e88,      // hot pink
      timeCoin: 0x39ff14,   // neon green bonus coin
      hud: '#b6ff3b',       // lime HUD text (CSS string for Phaser text)
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
      timeCoin: 0x1f4fd8,   // cobalt blue bonus coin, distinct from the greens and red
      hud: '#0f380f',
      panel: 0x0f380f,      // game-over panel
      panelText: '#e0f8d0'
    }
  }
};
// The page sets <html data-theme> from localStorage before first paint; colors is the active palette.
COIN_DASH.theme = document.documentElement.dataset.theme === 'retro' ? 'retro' : 'neon';
COIN_DASH.colors = COIN_DASH.themes[COIN_DASH.theme];
