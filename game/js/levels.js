// levels.js — three handcrafted galleries for The Museum of Lost Seconds.
// Coordinates are pixels inside the play area (1280 x 648, below the HUD).
// Walls are solid exhibits: they block movement, block vision cones, and
// give cover. Each guard walks a named patrol route with pauses at the ends.
const LEVELS = [
  {
    name: 'Gallery I — The Hall of Small Hours',
    hint: 'Learn the patrols. The brass clock holds the stolen second.',
    playerStart: { x: 90, y: 560 },
    second: { x: 600, y: 130 },
    exit: { x: 1224, y: 540, w: 56, h: 108, label: 'EXIT — service door' },
    walls: [
      { x: 520, y: 200, w: 160, h: 120, kind: 'clock' },
      { x: 240, y: 360, w: 120, h: 80, kind: 'plinth' },
      { x: 880, y: 120, w: 120, h: 200, kind: 'plinth' },
      { x: 640, y: 460, w: 200, h: 60, kind: 'bench' },
    ],
    guards: [
      {
        name: 'Warden Ansel',
        waypoints: [{ x: 180, y: 90 }, { x: 1100, y: 90 }],
        pause: 1.4, speed: 62,
      },
      {
        name: 'Warden Brice',
        waypoints: [{ x: 1080, y: 200 }, { x: 1080, y: 520 }],
        pause: 1.0, speed: 62,
      },
    ],
  },
  {
    name: 'Gallery II — The Gallery of Long Shadows',
    hint: 'Three wardens, crossing routes. Cross only when both cones turn away.',
    playerStart: { x: 90, y: 90 },
    second: { x: 1120, y: 590 },
    exit: { x: 0, y: 540, w: 56, h: 108, label: 'EXIT — west door' },
    walls: [
      { x: 200, y: 120, w: 140, h: 100, kind: 'plinth' },
      { x: 520, y: 80, w: 100, h: 220, kind: 'clock' },
      { x: 820, y: 300, w: 180, h: 90, kind: 'plinth' },
      { x: 300, y: 400, w: 220, h: 80, kind: 'bench' },
      { x: 900, y: 120, w: 120, h: 140, kind: 'plinth' },
      { x: 1080, y: 420, w: 120, h: 120, kind: 'plinth' },
      { x: 120, y: 300, w: 90, h: 140, kind: 'plinth' },
    ],
    guards: [
      {
        name: 'Warden Ansel',
        waypoints: [{ x: 140, y: 520 }, { x: 1040, y: 520 }],
        pause: 1.2, speed: 66,
      },
      {
        name: 'Warden Brice',
        waypoints: [{ x: 640, y: 120 }, { x: 640, y: 560 }],
        pause: 1.0, speed: 66,
      },
      {
        name: 'Warden Cora',
        waypoints: [{ x: 880, y: 90 }, { x: 1180, y: 90 }],
        pause: 1.6, speed: 58,
      },
    ],
  },
  {
    name: 'Gallery III — The Vault of Stopped Clocks',
    hint: 'The last second ticks loudest. Slip out the north door before dawn.',
    playerStart: { x: 90, y: 600 },
    second: { x: 640, y: 540 },
    exit: { x: 1150, y: 0, w: 100, h: 56, label: 'EXIT — north door' },
    walls: [
      { x: 180, y: 100, w: 120, h: 160, kind: 'plinth' },
      { x: 420, y: 300, w: 160, h: 80, kind: 'bench' },
      { x: 700, y: 80, w: 100, h: 200, kind: 'clock' },
      { x: 980, y: 320, w: 200, h: 90, kind: 'plinth' },
      { x: 240, y: 460, w: 200, h: 70, kind: 'bench' },
      { x: 820, y: 480, w: 140, h: 100, kind: 'plinth' },
      { x: 1120, y: 100, w: 100, h: 180, kind: 'plinth' },
    ],
    guards: [
      {
        name: 'Warden Ansel',
        waypoints: [{ x: 160, y: 430 }, { x: 1120, y: 430 }],
        pause: 1.0, speed: 74,
      },
      {
        name: 'Warden Brice',
        waypoints: [{ x: 620, y: 100 }, { x: 620, y: 560 }],
        pause: 0.9, speed: 74,
      },
      {
        name: 'Warden Cora',
        waypoints: [
          { x: 900, y: 440 }, { x: 1210, y: 440 },
          { x: 1210, y: 300 }, { x: 900, y: 300 },
        ],
        pause: 0.8, speed: 70,
      },
    ],
  },
];

// Play-area bounds in pixels (below the HUD bar).
const PLAY = { x: 0, y: 0, w: 1280, h: 648 };
