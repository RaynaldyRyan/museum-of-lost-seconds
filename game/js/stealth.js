// stealth.js — visibility, cover, sound and the three detection states.
// There is NO continuous suspicion bar: a guard is UNSEEN, NOTICED or
// HUNTED, and each state has its own behaviour, cue and screen-edge tint.

// Detection states (discrete — never a bar).
const DETECTION = { UNSEEN: 'UNSEEN', NOTICED: 'NOTICED', HUNTED: 'HUNTED' };

// --- geometry helpers -------------------------------------------------------

function segmentHitsRect(x1, y1, x2, y2, r) {
  // True when the segment from (x1,y1) to (x2,y2) touches rect r.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

function hasLineOfSight(x1, y1, x2, y2, walls) {
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  }
  return true;
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// --- vision -----------------------------------------------------------------

function guardCanSeePlayer(guard, player, walls) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONFIG.coneRange) return false;
  // Very close is always spotted, even just outside the cone edge.
  if (dist < 46) return hasLineOfSight(guard.x, guard.y, player.x, player.y, walls);
  const angleToPlayer = Math.atan2(dy, dx);
  if (angleDifference(angleToPlayer, guard.facing) > CONFIG.coneHalfAngle) return false;
  return hasLineOfSight(guard.x, guard.y, player.x, player.y, walls);
}

// --- cover ------------------------------------------------------------------

// The player is HIDDEN when no guard has line of sight AND the player is
// tucked right up against a solid exhibit — cover that visibly occludes.
function playerIsHidden(player, guards, walls) {
  for (const g of guards) {
    if (guardCanSeePlayer(g, player, walls)) return false;
  }
  for (const w of walls) {
    const nx = Math.max(w.x, Math.min(player.x, w.x + w.w));
    const ny = Math.max(w.y, Math.min(player.y, w.y + w.h));
    if (Math.hypot(player.x - nx, player.y - ny) <= CONFIG.hiddenProximity) return true;
  }
  return false;
}

// --- detection state machine ------------------------------------------------

function updateGuardDetection(guard, player, walls, dt) {
  const sees = guardCanSeePlayer(guard, player, walls);
  if (sees) {
    guard.seenTime += dt;
    guard.unseenTime = 0;
    if (guard.state === DETECTION.UNSEEN && guard.seenTime > 0.18) {
      guard.state = DETECTION.NOTICED;
      guard.onStateChange(guard, DETECTION.NOTICED);
    } else if (guard.state === DETECTION.NOTICED && guard.seenTime >= CONFIG.noticeTime) {
      guard.state = DETECTION.HUNTED;
      guard.onStateChange(guard, DETECTION.HUNTED);
    }
  } else {
    guard.seenTime = 0;
    guard.unseenTime += dt;
    if (guard.state === DETECTION.HUNTED && guard.unseenTime >= CONFIG.huntedMemory) {
      guard.state = DETECTION.NOTICED;
      guard.unseenTime = 0;
      guard.onStateChange(guard, DETECTION.NOTICED);
    } else if (guard.state === DETECTION.NOTICED && guard.unseenTime >= CONFIG.noticedDecay) {
      guard.state = DETECTION.UNSEEN;
      guard.onStateChange(guard, DETECTION.UNSEEN);
    }
  }
  return sees;
}

function overallAlertLevel(guards) {
  let level = DETECTION.UNSEEN;
  for (const g of guards) {
    if (g.state === DETECTION.HUNTED) return DETECTION.HUNTED;
    if (g.state === DETECTION.NOTICED) level = DETECTION.NOTICED;
  }
  return level;
}

// --- the wind-up moth (sound lure) ------------------------------------------

// A tossed moth lands, ticks, and rings a sound ripple. Guards inside the
// lure radius turn toward the landing point and walk over to investigate.
function updateMoth(moth, guards, dt) {
  if (!moth.active) return;
  if (moth.flying) {
    const dx = moth.targetX - moth.x;
    const dy = moth.targetY - moth.y;
    const dist = Math.hypot(dx, dy);
    const step = CONFIG.mothFlySpeed * dt;
    if (dist <= step) {
      moth.x = moth.targetX;
      moth.y = moth.targetY;
      moth.flying = false;
      moth.landedTime = 0;
      moth.onLand(moth);
    } else {
      moth.x += (dx / dist) * step;
      moth.y += (dy / dist) * step;
    }
    return;
  }
  moth.landedTime += dt;
  moth.ripple = Math.min(1, moth.landedTime / 1.1);
  if (moth.landedTime < 0.15 && !moth.lured) {
    moth.lured = true;
    for (const g of guards) {
      const d = Math.hypot(g.x - moth.x, g.y - moth.y);
      if (d <= CONFIG.mothLureRadius && g.state !== DETECTION.HUNTED) {
        g.investigate = { x: moth.x, y: moth.y, time: CONFIG.mothInvestigateTime };
        g.facing = Math.atan2(moth.y - g.y, moth.x - g.x);
      }
    }
  }
  if (moth.landedTime > 2.6) moth.active = false;
}
