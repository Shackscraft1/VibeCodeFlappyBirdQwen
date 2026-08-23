// Central tuning for the game.
// Distances are logical pixels, speeds are px/second, times are seconds.

export const GAME = Object.freeze({
  WIDTH: 480,
  HEIGHT: 640,
  GROUND_HEIGHT: 80,
  // Shader scroll wrap — must match PERIOD in js/rendering/shaders/sky.js.
  WORLD_PERIOD: 8192,
  MENU_SCROLL: 24,

  BIRD: Object.freeze({
    X: 120,
    RADIUS: 16,
    BOB_Y: 300,
    GRAVITY: 1900,
    FLAP: -430,
    MAX_FALL: 640,
  }),

  PIPES: Object.freeze({
    WIDTH: 66,
    GAP: 168,
    SPEED: 175,
    SPAWN_EVERY: 1.45,
    TOP_MARGIN: 60,
  }),
});
