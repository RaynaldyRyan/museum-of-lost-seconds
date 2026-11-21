// game.js — input, state transitions, win/lose, restart, HUD and sound.
// States: title -> playing -> galleryClear -> playing ... -> won / caught.
// The game is fully playable from the keyboard (WASD + E + R) and the mouse
// (click to toss a wind-up moth that lures guards with sound).
const Game = {
  canvas: null,
  ctx: null,
  screen: 'title', // title | playing | galleryClear | caught | won
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  moth: null,
  mothsLeft: 0,
  hasSecond: false,
  alertLevel: DETECTION.UNSEEN,
  hidden: false,
  time: 0,
  keys: {},
  audio: null,
  frozen: false, // scene presets freeze the world for screenshots
  message: '',
  messageTime: 0,
  caughtBy: '',
  footstepTimer: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CONFIG.canvasWidth;
    this.canvas.height = CONFIG.canvasHeight;
    this.loadLevel(0);
    this.bindInput();
    const params = new URLSearchParams(window.location.search);
    if (params.get('scene')) this.applyScenePreset(params.get('scene'));
    else this.screen = 'title'; // loadLevel leaves the game 'playing'; the title comes first
    requestAnimationFrame((t) => this.loop(t));
  },

  // --- level setup ----------------------------------------------------------

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    const L = this.level;
    this.player = { x: L.playerStart.x, y: L.playerStart.y, vx: 0, vy: 0 };
    this.guards = L.guards.map((g) => ({
      name: g.name,
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      waypoints: g.waypoints,
      waypointIndex: 1,
      pause: g.pause,
      pauseTime: 0,
      speed: g.speed,
      facing: Math.atan2(
        g.waypoints[1].y - g.waypoints[0].y,
        g.waypoints[1].x - g.waypoints[0].x,
      ),
      state: DETECTION.UNSEEN,
      seenTime: 0,
      unseenTime: 0,
      investigate: null,
      onStateChange: (guard, state) => this.onGuardStateChange(guard, state),
    }));
    this.moth = { active: false, flying: false, x: 0, y: 0, targetX: 0, targetY: 0, landedTime: 0, ripple: 0, lured: false, onLand: (m) => this.onMothLand(m) };
    this.mothsLeft = CONFIG.mothsPerGallery;
    this.hasSecond = false;
    this.alertLevel = DETECTION.UNSEEN;
    this.hidden = false;
    this.screen = 'playing';
    this.message = L.hint;
    this.messageTime = 5;
  },

  restartGallery() {
    this.loadLevel(this.levelIndex);
  },

  nextGallery() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = 'won';
      this.playTone(660, 0.25, 'sine', 0.12);
      this.playTone(880, 0.4, 'sine', 0.12);
    } else {
      this.loadLevel(this.levelIndex + 1);
    }
  },

  // --- sound (synthesised, no files) ----------------------------------------

  ensureAudio() {
    if (!this.audio) {
      try { this.audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.audio = null; }
    }
    if (this.audio && this.audio.state === 'suspended') this.audio.resume();
  },

  playTone(freq, dur, type, vol) {
    if (!this.audio) return;
    try {
      const osc = this.audio.createOscillator();
      const gain = this.audio.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.08, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.audio.destination);
      osc.start();
      osc.stop(this.audio.currentTime + dur);
    } catch (e) { /* sound is decoration; never break the game */ }
  },

  onGuardStateChange(guard, state) {
    if (state === DETECTION.NOTICED) {
      this.playTone(392, 0.18, 'triangle', 0.1);
      this.showMessage(guard.name + ' noticed something…');
    } else if (state === DETECTION.HUNTED) {
      this.playTone(196, 0.35, 'sawtooth', 0.12);
      this.playTone(147, 0.35, 'sawtooth', 0.1);
      this.showMessage(guard.name + ' is HUNTING you — break line of sight!');
    } else if (state === DETECTION.UNSEEN) {
      this.playTone(523, 0.12, 'sine', 0.06);
    }
    this.alertLevel = overallAlertLevel(this.guards);
  },

  onMothLand(moth) {
    this.playTone(1175, 0.1, 'sine', 0.09);
    this.playTone(1568, 0.14, 'sine', 0.07);
    this.showMessage('The moth ticks — a warden turns to listen.');
  },

  showMessage(text) {
    this.message = text;
    this.messageTime = 3.5;
  },

  // --- input ------------------------------------------------------------------

  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.ensureAudio();
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this.tryExit();
      if (e.code === 'KeyR' && (this.screen === 'caught' || this.screen === 'playing')) this.restartGallery();
      if (e.code === 'Enter' || e.code === 'Space') {
        if (this.screen === 'title') { this.screen = 'playing'; }
        else if (this.screen === 'galleryClear') this.nextGallery();
        else if (this.screen === 'caught') this.restartGallery();
        else if (this.screen === 'won') { this.loadLevel(0); }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    this.canvas.addEventListener('mousedown', (e) => {
      this.ensureAudio();
      if (this.screen === 'title') { this.screen = 'playing'; return; }
      if (this.screen === 'galleryClear') { this.nextGallery(); return; }
      if (this.screen === 'caught') { this.restartGallery(); return; }
      if (this.screen === 'won') { this.loadLevel(0); return; }
      if (this.screen !== 'playing' || this.frozen) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CONFIG.canvasWidth / rect.width);
      const my = (e.clientY - rect.top) * (CONFIG.canvasHeight / rect.height) - CONFIG.hudHeight;
      this.tossMoth(mx, my);
    });
  },

  tossMoth(mx, my) {
    if (this.mothsLeft <= 0 || this.moth.active) {
      this.showMessage(this.mothsLeft <= 0 ? 'No moths left — move quietly.' : 'A moth is already out.');
      return;
    }
    const dx = mx - this.player.x;
    const dy = my - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONFIG.mothRange) {
      const s = CONFIG.mothRange / dist;
      mx = this.player.x + dx * s;
      my = this.player.y + dy * s;
    }
    this.mothsLeft -= 1;
    this.moth.active = true;
    this.moth.flying = true;
    this.moth.lured = false;
    this.moth.x = this.player.x;
    this.moth.y = this.player.y;
    this.moth.targetX = Math.max(10, Math.min(PLAY.w - 10, mx));
    this.moth.targetY = Math.max(10, Math.min(PLAY.h - 10, my));
    this.playTone(880, 0.08, 'sine', 0.07);
  },

  tryExit() {
    if (this.screen !== 'playing' || !this.hasSecond) return;
    const ex = this.level.exit;
    const cx = Math.max(ex.x, Math.min(this.player.x, ex.x + ex.w));
    const cy = Math.max(ex.y, Math.min(this.player.y, ex.y + ex.h));
    if (Math.hypot(this.player.x - cx, this.player.y - cy) <= CONFIG.exitInteractDistance) {
      // The gallery only clears on an UNSEEN escape: a HUNTED or NOTICED
      // player cannot slip out while the wardens are alerted.
      if (this.alertLevel !== DETECTION.UNSEEN) {
        this.showMessage('Too alert — break line of sight before you slip out');
        this.playTone(196, 0.2, 'sawtooth', 0.08);
        return;
      }
      this.screen = 'galleryClear';
      this.playTone(523, 0.2, 'sine', 0.1);
      this.playTone(784, 0.3, 'sine', 0.1);
    }
  },

  // --- update -----------------------------------------------------------------

  moveWithWalls(entity, dx, dy, radius) {
    const walls = this.level.walls;
    let nx = entity.x + dx;
    let ny = entity.y;
    let blocked = false;
    for (const w of walls) {
      if (nx + radius > w.x && nx - radius < w.x + w.w && ny + radius > w.y && ny - radius < w.y + w.h) { blocked = true; break; }
    }
    if (!blocked && nx >= radius && nx <= PLAY.w - radius) entity.x = nx;
    ny = entity.y + dy;
    blocked = false;
    for (const w of walls) {
      if (entity.x + radius > w.x && entity.x - radius < w.x + w.w && ny + radius > w.y && ny - radius < w.y + w.h) { blocked = true; break; }
    }
    if (!blocked && ny >= radius && ny <= PLAY.h - radius) entity.y = ny;
  },

  updatePlayer(dt) {
    let dx = 0;
    let dy = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) dy -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) dy += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) dx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) dx += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * CONFIG.playerSpeed * dt;
      dy = (dy / len) * CONFIG.playerSpeed * dt;
      this.moveWithWalls(this.player, dx, dy, CONFIG.playerRadius);
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.34;
        this.playTone(90, 0.05, 'sine', 0.03);
      }
    }
    // Pick up the stolen second.
    if (!this.hasSecond) {
      const s = this.level.second;
      if (Math.hypot(this.player.x - s.x, this.player.y - s.y) < 34) {
        this.hasSecond = true;
        this.showMessage('The second is yours. Now reach the EXIT unseen.');
        this.playTone(1047, 0.2, 'sine', 0.1);
        this.playTone(1319, 0.25, 'sine', 0.08);
      }
    }
  },

  updateGuard(guard, dt) {
    if (guard.state === DETECTION.HUNTED) {
      // Chase the player; if the player is caught, the gallery restarts.
      const dx = this.player.x - guard.x;
      const dy = this.player.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        guard.facing = Math.atan2(dy, dx);
        this.moveGuard(guard, (dx / dist) * CONFIG.guardSpeedChase * dt, (dy / dist) * CONFIG.guardSpeedChase * dt);
      }
      if (dist <= CONFIG.catchDistance) {
        this.screen = 'caught';
        this.caughtBy = guard.name;
        this.playTone(110, 0.6, 'sawtooth', 0.14);
      }
      return;
    }
    if (guard.investigate) {
      const t = guard.investigate;
      const dx = t.x - guard.x;
      const dy = t.y - guard.y;
      const dist = Math.hypot(dx, dy);
      // The timer runs while the guard is travelling too: a moth that lands
      // somewhere unreachable (behind an exhibit) must still time out,
      // instead of pinning the guard against the wall forever.
      t.time -= dt;
      if (t.time <= 0) { guard.investigate = null; return; }
      if (dist > 8) {
        guard.facing = Math.atan2(dy, dx);
        this.moveGuard(guard, (dx / dist) * CONFIG.guardSpeedInvestigate * dt, (dy / dist) * CONFIG.guardSpeedInvestigate * dt);
      } else {
        // On arrival, sweep the cone back and forth across the landing
        // point, listening — the cone visibly swings toward the moth.
        // (Capture the arrival facing once: at the landing point the
        // direction to the moth itself is undefined.)
        if (t.arrivedFacing === undefined) t.arrivedFacing = guard.facing;
        guard.facing = t.arrivedFacing + Math.sin(this.time * 1.4) * 0.55;
      }
      return;
    }
    // Patrol: walk to the next waypoint, pause, turn, repeat.
    if (guard.pauseTime > 0) {
      guard.pauseTime -= dt;
      return;
    }
    const target = guard.waypoints[guard.waypointIndex];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseTime = guard.pause;
      return;
    }
    guard.facing = Math.atan2(dy, dx);
    this.moveGuard(guard, (dx / dist) * guard.speed * dt, (dy / dist) * guard.speed * dt);
  },

  moveGuard(guard, dx, dy) {
    const walls = this.level.walls;
    const r = CONFIG.guardRadius;
    let nx = guard.x + dx;
    let blocked = false;
    for (const w of walls) {
      if (nx + r > w.x && nx - r < w.x + w.w && guard.y + r > w.y && guard.y - r < w.y + w.h) { blocked = true; break; }
    }
    if (!blocked && nx >= r && nx <= PLAY.w - r) guard.x = nx;
    const ny = guard.y + dy;
    blocked = false;
    for (const w of walls) {
      if (guard.x + r > w.x && guard.x - r < w.x + w.w && ny + r > w.y && ny - r < w.y + w.h) { blocked = true; break; }
    }
    if (!blocked && ny >= r && ny <= PLAY.h - r) guard.y = ny;
  },

  update(dt) {
    if (this.screen !== 'playing' || this.frozen) return;
    this.time += dt;
    if (this.messageTime > 0) this.messageTime -= dt;
    this.updatePlayer(dt);
    for (const g of this.guards) {
      updateGuardDetection(g, this.player, this.level.walls, dt);
      this.updateGuard(g, dt);
    }
    this.alertLevel = overallAlertLevel(this.guards);
    this.hidden = playerIsHidden(this.player, this.guards, this.level.walls);
    updateMoth(this.moth, this.guards, dt);
    // Walking into the exit with the second also works without pressing E —
    // but only while UNSEEN, same as tryExit(). A player who walks in
    // while NOTICED/HUNTED is turned back with a warning, not cleared.
    if (this.hasSecond) {
      const ex = this.level.exit;
      if (this.player.x >= ex.x - 4 && this.player.x <= ex.x + ex.w + 4 &&
          this.player.y >= ex.y - 4 && this.player.y <= ex.y + ex.h + 4) {
        if (this.alertLevel !== DETECTION.UNSEEN) {
          // Throttle the warning: showMessage() re-arms its own 3.5 s timer,
          // so only warn again once the previous warning has faded.
          if (this.messageTime <= 0) {
            this.showMessage('Too alert — break line of sight before you slip out');
            this.playTone(196, 0.2, 'sawtooth', 0.08);
          }
        } else {
          this.screen = 'galleryClear';
          this.playTone(523, 0.2, 'sine', 0.1);
          this.playTone(784, 0.3, 'sine', 0.1);
        }
      }
    }
  },

  // --- scene presets (deterministic staged views for screenshots) --------------

  applyScenePreset(scene) {
    this.frozen = true;
    this.screen = 'playing';
    const L = this.level;
    if (scene === 'overview') {
      this.loadLevel(0);
      this.frozen = true;
      this.screen = 'playing';
      this.player.x = 300; this.player.y = 480;
      this.guards[0].x = 420; this.guards[0].y = 140; this.guards[0].facing = 0;
      this.guards[1].x = 1080; this.guards[1].y = 380; this.guards[1].facing = Math.PI / 2;
      this.alertLevel = DETECTION.UNSEEN;
      this.message = 'Steal the glowing second, then reach the EXIT unseen.';
      this.messageTime = 99;
    } else if (scene === 'cover') {
      this.loadLevel(0);
      this.frozen = true;
      this.screen = 'playing';
      // Player tucked behind the central clock exhibit; the cone sweeps past,
      // blocked by the exhibit — the HIDDEN badge shows the cover works.
      this.player.x = 600; this.player.y = 348;
      this.guards[0].x = 500; this.guards[0].y = 140; this.guards[0].facing = Math.PI / 2;
      this.guards[1].x = 1080; this.guards[1].y = 380; this.guards[1].facing = -Math.PI / 2;
      this.hidden = true;
      this.alertLevel = DETECTION.UNSEEN;
      this.message = 'Behind the exhibit you are HIDDEN — the cone cannot reach you.';
      this.messageTime = 99;
    } else if (scene === 'moth') {
      this.loadLevel(1);
      this.frozen = true;
      this.screen = 'playing';
      this.player.x = 420; this.player.y = 500;
      this.hasSecond = true;
      this.mothsLeft = 2;
      this.moth.active = true;
      this.moth.flying = false;
      this.moth.x = 760; this.moth.y = 330;
      this.moth.landedTime = 0.55;
      this.moth.ripple = 0.5;
      this.moth.lured = true;
      this.guards[0].x = 640; this.guards[0].y = 520; this.guards[0].facing = Math.atan2(330 - 520, 760 - 640);
      this.guards[0].investigate = { x: 760, y: 330, time: 4 };
      this.guards[1].x = 640; this.guards[1].y = 300; this.guards[1].facing = Math.PI;
      this.guards[2].x = 1060; this.guards[2].y = 260; this.guards[2].facing = Math.PI;
      this.alertLevel = DETECTION.UNSEEN;
      this.message = 'The moth ticks — the warden turns to listen. Slip past.';
      this.messageTime = 99;
    } else if (scene === 'escape') {
      this.loadLevel(2);
      this.frozen = true;
      this.screen = 'playing';
      this.player.x = 1150; this.player.y = 75;
      this.hasSecond = true;
      this.mothsLeft = 1;
      this.guards[0].x = 900; this.guards[0].y = 140; this.guards[0].facing = 0;
      this.guards[1].x = 560; this.guards[1].y = 250; this.guards[1].facing = Math.PI / 2;
      this.guards[2].x = 1000; this.guards[2].y = 420; this.guards[2].facing = -Math.PI / 2;
      this.alertLevel = DETECTION.UNSEEN;
      this.message = 'One step from the north door — press E to slip out unseen.';
      this.messageTime = 99;
    }
  },

  // --- drawing ------------------------------------------------------------------

  draw() {
    const ctx = this.ctx;
    const p = CONFIG.palette;
    const H = CONFIG.hudHeight;
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // HUD bar.
    ctx.fillStyle = p.shadowBlue;
    ctx.fillRect(0, 0, CONFIG.canvasWidth, H);
    ctx.fillStyle = p.brass;
    ctx.fillRect(0, H - 4, CONFIG.canvasWidth, 4);
    ctx.fillStyle = p.cream;
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('The Museum of Lost Seconds', 20, 32);
    ctx.font = '15px Georgia, serif';
    ctx.fillStyle = '#d9c48f';
    ctx.fillText(this.level.name + '  ·  Gallery ' + (this.levelIndex + 1) + ' of 3', 20, 56);

    // Detection state badge — big, readable, one of three states.
    const badge = this.alertLevel;
    const badgeColor = badge === DETECTION.HUNTED ? '#d6452c' : badge === DETECTION.NOTICED ? '#e8a420' : '#7fb3d5';
    ctx.save();
    ctx.font = 'bold 22px Georgia, serif';
    const bw = ctx.measureText(badge).width + 36;
    ctx.fillStyle = 'rgba(247, 239, 218, 0.95)';
    ctx.beginPath();
    ctx.roundRect(CONFIG.canvasWidth - bw - 20, 14, bw, 40, 20);
    ctx.fill();
    ctx.fillStyle = badgeColor;
    ctx.textAlign = 'center';
    ctx.fillText(badge, CONFIG.canvasWidth - bw / 2 - 20, 42);
    ctx.restore();

    // Objective + moths, right under the title on the left of the badge.
    ctx.save();
    ctx.font = '15px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = this.hasSecond ? p.accent : '#d9c48f';
    const objText = this.hasSecond ? 'Second stolen — reach the EXIT' : 'Steal the glowing second';
    ctx.fillText(objText, CONFIG.canvasWidth - bw - 44, 30);
    ctx.fillStyle = '#d9c48f';
    ctx.fillText('Moths: ' + '✦'.repeat(this.mothsLeft) + '✧'.repeat(CONFIG.mothsPerGallery - this.mothsLeft) + '  (click to toss)', CONFIG.canvasWidth - bw - 44, 54);
    ctx.restore();

    // Play area.
    ctx.save();
    ctx.translate(0, H);
    // Checkerboard cream floor.
    const t = CONFIG.tile;
    for (let gy = 0; gy < PLAY.h / t; gy++) {
      for (let gx = 0; gx < PLAY.w / t; gx++) {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? p.floorLight : p.floorDark;
        ctx.fillRect(gx * t, gy * t, t, t);
      }
    }
    // Deep blue shadow border around the room.
    ctx.strokeStyle = 'rgba(14, 24, 48, 0.35)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, PLAY.w - 10, PLAY.h - 10);

    // Exit first (under the actors), then the second, exhibits, cones, actors.
    Render.drawExit(ctx, this.level.exit, this.hasSecond, this.time);
    if (!this.hasSecond) Render.drawSecond(ctx, this.level.second, this.time);
    for (const w of this.level.walls) Render.drawExhibit(ctx, w);
    for (const g of this.guards) Render.drawVisionCone(ctx, g, this.level.walls);
    for (const g of this.guards) Render.drawGuard(ctx, g);
    Render.drawPlayer(ctx, this.player, this.hidden);
    Render.drawMoth(ctx, this.moth);

    // Patrol route dots, faint, so routes can be learned.
    ctx.save();
    ctx.fillStyle = 'rgba(26, 36, 64, 0.30)';
    for (const g of this.guards) {
      for (const wp of g.waypoints) {
        ctx.beginPath(); ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // Exit prompt when close with the second.
    if (this.hasSecond && this.screen === 'playing') {
      const ex = this.level.exit;
      const cx = Math.max(ex.x, Math.min(this.player.x, ex.x + ex.w));
      const cy = Math.max(ex.y, Math.min(this.player.y, ex.y + ex.h));
      if (Math.hypot(this.player.x - cx, this.player.y - cy) <= CONFIG.exitInteractDistance + 40) {
        ctx.save();
        ctx.font = 'bold 18px Georgia, serif';
        ctx.textAlign = 'center';
        const label = 'Press E — slip out unseen';
        const w = ctx.measureText(label).width + 24;
        // Keep the prompt on screen: clamp it horizontally, and drop it
        // below the player when the player is near the top of the room.
        const px = Math.max(w / 2 + 8, Math.min(PLAY.w - w / 2 - 8, this.player.x));
        const py = this.player.y < 110 ? this.player.y + 52 : this.player.y - 84;
        const ty = this.player.y < 110 ? this.player.y + 73 : this.player.y - 63;
        ctx.fillStyle = 'rgba(15, 181, 163, 0.95)';
        ctx.beginPath();
        ctx.roundRect(px - w / 2, py, w, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#f7efda';
        ctx.fillText(label, px, ty);
        ctx.restore();
      }
    }

    // Message toast.
    if (this.messageTime > 0 && this.message) {
      ctx.save();
      ctx.font = '16px Georgia, serif';
      ctx.textAlign = 'center';
      const w = ctx.measureText(this.message).width + 28;
      ctx.fillStyle = 'rgba(22, 35, 63, 0.88)';
      ctx.beginPath();
      ctx.roundRect(PLAY.w / 2 - w / 2, PLAY.h - 52, w, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#f7efda';
      ctx.fillText(this.message, PLAY.w / 2, PLAY.h - 29);
      ctx.restore();
    }
    ctx.restore();

    // Screen-edge tint per detection state.
    Render.drawEdgeTint(ctx, this.alertLevel);

    // Overlays.
    if (this.screen === 'title') this.drawTitle();
    else if (this.screen === 'galleryClear') this.drawGalleryClear();
    else if (this.screen === 'caught') this.drawCaught();
    else if (this.screen === 'won') this.drawWon();
  },

  drawPanel(title, lines, accent) {
    const ctx = this.ctx;
    const p = CONFIG.palette;
    ctx.save();
    ctx.fillStyle = 'rgba(14, 24, 48, 0.72)';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    ctx.fillStyle = p.cream;
    ctx.beginPath();
    ctx.roundRect(290, 150, 700, 420, 18);
    ctx.fill();
    ctx.strokeStyle = p.brass;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = p.ink;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 640, 220);
    ctx.fillStyle = accent || p.brassDark;
    ctx.fillRect(540, 240, 200, 3);
    ctx.font = '18px Georgia, serif';
    ctx.fillStyle = p.ink;
    lines.forEach((line, i) => ctx.fillText(line, 640, 290 + i * 34));
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillStyle = p.brassDark;
    ctx.fillText('Click or press Enter to continue', 640, 520);
    ctx.restore();
  },

  drawTitle() {
    this.drawPanel('The Museum of Lost Seconds', [
      'Steal a glowing second from the clockwork museum before dawn.',
      '',
      'WASD — move     ·     Mouse click — toss a wind-up moth',
      'The moth ticks and lures wardens away. Hide behind exhibits.',
      'Three galleries. Reach the EXIT unseen in each one.',
      'UNSEEN · NOTICED · HUNTED — break line of sight to cool down.',
    ]);
  },

  drawGalleryClear() {
    this.drawPanel('Gallery escaped — unseen', [
      this.level.name + ' is behind you.',
      this.levelIndex + 1 >= LEVELS.length ? '' : 'The next gallery waits. Its wardens walk faster.',
      '',
      'Moths left: ' + this.mothsLeft,
    ], CONFIG.palette.accent);
  },

  drawCaught() {
    this.drawPanel('Caught by ' + this.caughtBy, [
      'The warden’s lamp finds you. The gallery resets.',
      '',
      'Watch the cones. Cross only when they turn away,',
      'or toss a moth and let the sound do the walking.',
      '',
      'Press R or click to try this gallery again.',
    ], '#d6452c');
  },

  drawWon() {
    this.drawPanel('Dawn breaks — you were never seen', [
      'Three seconds stolen. Three galleries crossed unseen.',
      'The museum wakes to empty plinths and a single brass moth,',
      'still ticking on the marble.',
      '',
      'Thank you for playing. Press Enter to steal again.',
    ], CONFIG.palette.accent);
  },

  // --- main loop --------------------------------------------------------------

  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - (this.lastTime || timestamp)) / 1000 || 0);
    this.lastTime = timestamp;
    if (!this.frozen) this.update(dt);
    else this.time += dt;
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  },
};

window.addEventListener('load', () => Game.init());
// Exposed for automated play-testing (keyboard/mouse drive the same code).
window.__museum = Game;
