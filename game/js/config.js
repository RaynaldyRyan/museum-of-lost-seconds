// config.js — palette, controls and tuning for The Museum of Lost Seconds.
// Two-hue world (warm cream/brass + deep blue shadow). The vision cone is the
// only saturated hue at low opacity. ONE accent colour (teal) marks the
// objective — the stolen second and the exit — and nothing else.
const CONFIG = {
  canvasWidth: 1280,
  canvasHeight: 720,
  hudHeight: 72,
  tile: 40,

  // Palette: warm cream / brass world, deep blue shadows.
  palette: {
    floorLight: '#f2e7c9',
    floorDark: '#e6d5ae',
    floorEdge: '#d9c48f',
    wallFace: '#2c3f63',
    wallTop: '#3d547e',
    wallEdge: '#c9a227',
    brass: '#c9a227',
    brassDark: '#9a7a1a',
    cream: '#f7efda',
    ink: '#1a2440',
    shadowBlue: '#16233f',
    deepBlue: '#0e1830',
    // The vision cone: the only saturated hue, kept at low opacity.
    // Tinted by detection state — grey while UNSEEN, amber while NOTICED,
    // red while HUNTED — so the state reads in the room, not just the HUD.
    coneFill: 'rgba(232, 164, 32, 0.30)',
    coneEdge: 'rgba(232, 164, 32, 0.95)',
    coneUnseenFill: 'rgba(148, 163, 184, 0.30)',
    coneUnseenEdge: 'rgba(148, 163, 184, 0.95)',
    coneNoticedFill: 'rgba(232, 164, 32, 0.42)',
    coneNoticedEdge: 'rgba(232, 164, 32, 0.95)',
    coneHuntedFill: 'rgba(214, 69, 44, 0.34)',
    coneHuntedEdge: 'rgba(214, 69, 44, 0.95)',
    // ONE accent colour: the stolen second + the exit. Nothing else uses it.
    accent: '#0fb5a3',
    accentGlow: 'rgba(15, 181, 163, 0.55)',
    accentDark: '#078a7d',
    guardBody: '#22345c',
    guardTrim: '#f2e7c9',
    playerBody: '#f7efda',
    playerRing: '#c9a227',
  },

  // Controls.
  controls: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    restart: ['KeyR'],
  },

  // Tuning.
  playerSpeed: 178,        // px per second
  playerRadius: 15,
  guardSpeedPatrol: 62,
  guardSpeedChase: 128,
  guardSpeedInvestigate: 92,
  guardRadius: 16,
  coneRange: 265,          // how far a guard can see
  coneHalfAngle: 0.61,     // ~35 degrees each side
  noticeTime: 0.75,        // seconds seen before NOTICED becomes HUNTED
  huntedMemory: 3.2,       // seconds out of sight before HUNTED cools down
  noticedDecay: 1.6,       // seconds out of sight before NOTICED cools down
  catchDistance: 30,       // guard this close while HUNTED = caught
  mothsPerGallery: 3,
  mothRange: 420,          // max toss distance from the player
  mothFlySpeed: 520,
  mothLureRadius: 230,     // guards inside this hear the moth
  mothRippleRadius: 175,
  mothInvestigateTime: 4.5,
  hiddenProximity: 34,     // px from a wall/exhibit to count as tucked in cover
  exitInteractDistance: 64,
};
