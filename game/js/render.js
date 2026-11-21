// render.js — canvas drawing: the museum world, vision cones, effects, HUD.
// Bright and legible by design: high-contrast translucent cones with crisp
// edges, big readable HUD, player and guards large on screen. Never near-black.
const Render = {
  // Draw a vision cone for one guard, clipped by the exhibits it cannot see
  // through, so cover visibly blocks the cone. Each ray is clipped with the
  // SAME occlusion test the detection code runs (hasLineOfSight), so what
  // the cone shows is exactly what the guard can see. The cone is tinted
  // by detection state — grey UNSEEN, amber NOTICED, red HUNTED — so the
  // state reads in the room, not just the HUD.
  drawVisionCone(ctx, guard, walls) {
    const range = CONFIG.coneRange;
    const half = CONFIG.coneHalfAngle;
    const steps = 26;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (let i = 0; i <= steps; i++) {
      const a = guard.facing - half + (2 * half * i) / steps;
      let r = range;
      // March outward; stop the ray where the guard's sight is blocked.
      for (let d = 12; d <= range; d += 12) {
        const px = guard.x + Math.cos(a) * d;
        const py = guard.y + Math.sin(a) * d;
        if (!hasLineOfSight(guard.x, guard.y, px, py, walls)) { r = d; break; }
      }
      ctx.lineTo(guard.x + Math.cos(a) * r, guard.y + Math.sin(a) * r);
    }
    ctx.closePath();
    const p = CONFIG.palette;
    ctx.fillStyle = guard.state === DETECTION.HUNTED ? p.coneHuntedFill
      : guard.state === DETECTION.NOTICED ? p.coneNoticedFill : p.coneUnseenFill;
    ctx.fill();
    ctx.strokeStyle = guard.state === DETECTION.HUNTED ? p.coneHuntedEdge
      : guard.state === DETECTION.NOTICED ? p.coneNoticedEdge : p.coneUnseenEdge;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  },

  drawExhibit(ctx, w) {
    const p = CONFIG.palette;
    ctx.save();
    // Deep blue shadow cast to the lower right.
    ctx.fillStyle = 'rgba(14, 24, 48, 0.28)';
    ctx.fillRect(w.x + 7, w.y + 9, w.w, w.h);
    // Solid body.
    ctx.fillStyle = p.wallFace;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    // Brass top edge catches the light.
    ctx.fillStyle = p.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 10);
    ctx.strokeStyle = p.brass;
    ctx.lineWidth = 3;
    ctx.strokeRect(w.x + 1.5, w.y + 1.5, w.w - 3, w.h - 3);
    // A clock face on clock exhibits, brass studs on the rest.
    if (w.kind === 'clock') {
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;
      const r = Math.min(w.w, w.h) / 2 - 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = p.cream;
      ctx.fill();
      ctx.strokeStyle = p.brassDark;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - r + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.6, cy + r * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fillStyle = p.ink; ctx.fill();
    } else {
      ctx.fillStyle = p.brass;
      const spots = [[14, 14], [w.w - 14, 14], [14, w.h - 14], [w.w - 14, w.h - 14]];
      for (const [sx, sy] of spots) {
        ctx.beginPath(); ctx.arc(w.x + sx, w.y + sy, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  },

  drawGuard(ctx, guard) {
    const p = CONFIG.palette;
    ctx.save();
    ctx.translate(guard.x, guard.y);
    // Soft shadow.
    ctx.beginPath(); ctx.ellipse(3, 6, 20, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(14, 24, 48, 0.25)'; ctx.fill();
    // Body: deep blue uniform, cream trim — readable against the cream floor.
    ctx.beginPath(); ctx.arc(0, 0, CONFIG.guardRadius, 0, Math.PI * 2);
    ctx.fillStyle = p.guardBody; ctx.fill();
    ctx.strokeStyle = p.guardTrim; ctx.lineWidth = 3; ctx.stroke();
    // Facing tick and eyes show exactly where the guard looks.
    ctx.rotate(guard.facing);
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(24, 0);
    ctx.strokeStyle = p.guardTrim; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(6, -6, 3, 0, Math.PI * 2); ctx.arc(6, 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.cream; ctx.fill();
    ctx.restore();
    // State mark above the head: ? when NOTICED, ! when HUNTED.
    if (guard.state !== DETECTION.UNSEEN) {
      ctx.save();
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = guard.state === DETECTION.HUNTED ? '#d6452c' : '#e8a420';
      ctx.strokeStyle = '#f7efda';
      ctx.lineWidth = 5;
      const mark = guard.state === DETECTION.HUNTED ? '!' : '?';
      ctx.strokeText(mark, guard.x, guard.y - 26);
      ctx.fillText(mark, guard.x, guard.y - 26);
      ctx.restore();
    }
    // Guard name, small and brass.
    ctx.save();
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(26, 36, 64, 0.75)';
    ctx.fillText(guard.name, guard.x, guard.y + 32);
    ctx.restore();
  },

  drawPlayer(ctx, player, hidden) {
    const p = CONFIG.palette;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.beginPath(); ctx.ellipse(3, 6, 18, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(14, 24, 48, 0.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, CONFIG.playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = p.playerBody; ctx.fill();
    ctx.strokeStyle = p.playerRing; ctx.lineWidth = 4; ctx.stroke();
    // A small brass keyhole mark: the thief.
    ctx.beginPath(); ctx.arc(0, -3, 4, 0, Math.PI * 2); ctx.fillStyle = p.brassDark; ctx.fill();
    ctx.fillRect(-2, 0, 4, 7);
    ctx.restore();
    if (hidden) {
      ctx.save();
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      const label = 'HIDDEN';
      const w = ctx.measureText(label).width + 18;
      ctx.fillStyle = 'rgba(22, 35, 63, 0.92)';
      ctx.beginPath();
      ctx.roundRect(player.x - w / 2, player.y - 52, w, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#f7efda';
      ctx.fillText(label, player.x, player.y - 35);
      ctx.restore();
    }
  },

  drawSecond(ctx, second, time) {
    const p = CONFIG.palette;
    const pulse = 1 + Math.sin(time * 3.2) * 0.12;
    ctx.save();
    ctx.translate(second.x, second.y);
    // Teal glow: the one accent colour, marking the objective.
    ctx.beginPath(); ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = p.accentGlow; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#f7efda'; ctx.fill();
    ctx.strokeStyle = p.accent; ctx.lineWidth = 4; ctx.stroke();
    // A pocket watch: the stolen second.
    ctx.strokeStyle = p.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, 3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fillStyle = p.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -17, 4, 0, Math.PI * 2); ctx.strokeStyle = p.accentDark; ctx.stroke();
    ctx.restore();
  },

  drawExit(ctx, exit, hasSecond, time) {
    const p = CONFIG.palette;
    const open = hasSecond;
    const glow = open ? 0.5 + Math.sin(time * 3) * 0.2 : 0.12;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 181, 163, ' + glow.toFixed(2) + ')';
    ctx.fillRect(exit.x - 6, exit.y - 6, exit.w + 12, exit.h + 12);
    // A large unique doorway: teal arch, the only teal structure in the room.
    ctx.fillStyle = open ? p.accent : '#5d7a78';
    ctx.beginPath();
    if (exit.h > exit.w) {
      ctx.moveTo(exit.x, exit.y + exit.h);
      ctx.lineTo(exit.x, exit.y + 26);
      ctx.arc(exit.x + exit.w / 2, exit.y + 26, exit.w / 2, Math.PI, 0);
      ctx.lineTo(exit.x + exit.w, exit.y + exit.h);
    } else {
      ctx.moveTo(exit.x, exit.y + exit.h);
      ctx.lineTo(exit.x, exit.y + exit.h / 2);
      ctx.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, exit.w / 2, Math.PI, 0);
      ctx.lineTo(exit.x + exit.w, exit.y + exit.h);
    }
    ctx.closePath();
    ctx.fill();
    // The EXIT label sits inside the room, never clipped by the screen edge:
    // doors on the right edge label to their left, left edge to their right,
    // top edge below the door.
    ctx.fillStyle = '#0e1830';
    ctx.font = 'bold 15px Georgia, serif';
    if (exit.x + exit.w >= 1276) {
      ctx.textAlign = 'right';
      ctx.fillText('EXIT', exit.x - 10, exit.y + exit.h / 2 + 5);
    } else if (exit.x <= 4) {
      ctx.textAlign = 'left';
      ctx.fillText('EXIT', exit.x + exit.w + 10, exit.y + exit.h / 2 + 5);
    } else if (exit.y <= 4) {
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', exit.x + exit.w / 2, exit.y + exit.h + 20);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 5);
    }
    ctx.restore();
  },

  drawMoth(ctx, moth) {
    if (!moth.active) return;
    ctx.save();
    if (moth.flying) {
      ctx.translate(moth.x, moth.y);
      ctx.fillStyle = '#f7efda';
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-6, -5, 7, 4, -0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, -5, 7, 4, 0.5, 0, Math.PI * 2); ctx.stroke();
    } else {
      // Sound ripple rings spreading from the landing point.
      for (let i = 0; i < 3; i++) {
        const phase = (moth.ripple + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(moth.x, moth.y, 12 + phase * CONFIG.mothRippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(201, 162, 39, ' + (0.9 * (1 - phase)).toFixed(2) + ')';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.translate(moth.x, moth.y);
      ctx.fillStyle = '#f7efda';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-5, -4, 6, 3.5, -0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(5, -4, 6, 3.5, 0.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  },

  // Screen-edge tint: one per detection state, so the state is felt as
  // well as read. UNSEEN is a calm deep-blue edge; NOTICED amber; HUNTED red.
  drawEdgeTint(ctx, state) {
    const w = CONFIG.canvasWidth;
    const h = CONFIG.canvasHeight;
    let colour = null;
    if (state === DETECTION.NOTICED) colour = 'rgba(232, 164, 32, 0.20)';
    else if (state === DETECTION.HUNTED) colour = 'rgba(214, 69, 44, 0.30)';
    else colour = 'rgba(22, 35, 63, 0.10)';
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 26;
    ctx.strokeRect(13, 13, w - 26, h - 26);
    ctx.restore();
  },
};
