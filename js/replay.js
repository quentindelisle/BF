/* Observ'BF — récap animé de l'assaut en 3D.
   Deux boxeurs modélisés en 3D (squelette articulé : genoux et coudes = charnières qui ne plient que dans le bon sens,
   cinématique inverse pour amener gant ou pied sur la cible), vus de 3/4, rendus en aplats avec contour marine.
   Moteur 3D minimal écrit pour l'appli (aucune bibliothèque, fonctionne hors ligne). */
(function (global) {
  'use strict';
  const NAVY = '#0A1F4D', SKIN = '#F4B07A', SKIN_D = '#E8975C', HAIR = '#8A4B1F', PANTS = '#1B3A8F', SHOE = '#1A2A55', TEE_B = '#2F7BEA';
  const COL = {R: '#E53935', B: '#1E6FE0'};
  const GAP_MAX = 5, LEAD = 1.2, TAIL = 1.8;
  const rad = d => d * Math.PI / 180;
  const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = k => 1 - Math.pow(1 - k, 3), easeIn = k => k * k * k, easeIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  /* ---------- vecteurs ---------- */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlerp = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  /* ---------- squelette (cm) ---------- */
  const B = {hipH: 84, thigh: 44, shin: 44, hipW: 9, shW: 19, shY: 48, neckY: 57, headY: 71, headR: 11.5, upper: 29, fore: 31, gloveR: 9.5, dist: 52, ankle: 5};

  /* repère du haut du corps : (avant, haut, latéral) → monde ; s = +1 (rouge, regarde +x) ou -1 (bleu, regarde -x) */
  function up(R, s, pitch, twist, p) {
    const cp = Math.cos(rad(pitch)), sp = Math.sin(rad(pitch));
    const x = p[0] * cp + p[1] * sp, y = -p[0] * sp + p[1] * cp, z = p[2];
    const ct = Math.cos(rad(twist)), st = Math.sin(rad(twist));
    return [R[0] + s * (x * ct - z * st), R[1] + y, R[2] + s * (x * st + z * ct)];
  }
  /* cinématique inverse à deux segments dans le plan (racine → cible) ; pole = direction vers laquelle plie l'articulation */
  function ik2(P, T, l1, l2, pole) {
    const d = sub(T, P); let D = len(d); const u = norm(d), reach = (l1 + l2) * 0.999;
    if (D > reach) { T = add(P, mul(u, reach)); D = reach; }
    D = Math.max(D, Math.abs(l1 - l2) + 0.5);
    let w = sub(pole, mul(u, dot(pole, u))); w = len(w) < 1e-4 ? [0, 1, 0] : norm(w);
    const a = Math.acos(clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1));
    return {J: add(P, add(mul(u, Math.cos(a) * l1), mul(w, Math.sin(a) * l1))), T};
  }

  /* ---------- technique d'un événement ---------- */
  function techOf(e) {
    const arme = e.gen ? 'poing' : e.w, coup = e.gen ? 'direct' : e.c;
    let h = e.h;
    if (!h) h = e.z === 'tete' ? 'haut' : e.z === 'jambes' ? 'bas' : e.z === 'flancs' ? 'milieu' : e.z === 'ventre' ? 'bas' : 'milieu';
    if (arme === 'poing' && h === 'milieu') h = 'bas';
    const ty = e.nh ? (arme === 'poing' ? 122 : 100) : arme === 'poing' ? (h === 'haut' ? 146 : 104) : (h === 'haut' ? 142 : h === 'milieu' ? 102 : 46);
    return {arme, coup, h, ty};
  }
  const DUR = {main: [0.66, 0.30], pied: [1.0, 0.5]};

  /* ---------- chronologie ---------- */
  function build(data) {
    const evs = (data.events || []).filter(e => e.z && e.ts).slice().sort((a, b) => a.ts - b.ts);
    const items = []; let tr = LEAD, prev = null, skipped = 0; const cnt = {R: 0, B: 0};
    evs.forEach((e, i) => {
      if (prev != null) { const gap = (e.ts - prev) / 1000; if (gap > GAP_MAX) skipped += gap - GAP_MAX; tr += Math.min(gap, GAP_MAX); }
      prev = e.ts;
      const tech = techOf(e), n = cnt[e.t]++, lead = e.main ? e.main === 'g' : n % 2 === 0;
      const limb = tech.arme === 'poing' ? (lead ? 'hL' : 'hR') : (tech.coup === 'chasse' ? (e.main ? (lead ? 'fL' : 'fR') : 'fL') : (e.main ? (lead ? 'fL' : 'fR') : 'fR'));
      const sc = {R: scoreOf(evs.slice(0, i + 1), 'R'), B: scoreOf(evs.slice(0, i + 1), 'B')}, d = tech.arme === 'pied' ? DUR.pied : DUR.main;
      items.push({t: tr, side: e.t, e, tech, limb, sc, pts: ptsOf(e), dur: d[0], imp: d[1]});
    });
    return {items, dur: (items.length ? tr : LEAD) + TAIL, skipped: Math.round(skipped), evs};
  }
  const labelOf = it => {
    const e = it.e, h = it.tech.h, hl = e.nh ? '' : it.tech.arme === 'poing' ? (h === 'haut' ? 'visage' : 'ventre') : (h === 'haut' ? 'haut' : h === 'milieu' ? 'médian' : 'bas');
    return `${e.gen ? 'Touche' : COUPS[e.c].l}${hl ? ' ' + hl : ''}`;
  };
  /* cible de l'impact : face avant de l'adversaire à la hauteur visée */
  function targetOf(it) {
    const s = it.side === 'R' ? 1 : -1, ox = B.dist * s;
    return [ox - s * 9, it.tech.ty, it.tech.arme === 'pied' && it.tech.h === 'milieu' ? 11 : 0];
  }

  /* ---------- pose d'un boxeur à l'instant t ---------- */
  function poseOf(side, t, items) {
    const s = side === 'R' ? 1 : -1, ph = side === 'B' ? 1.7 : 0, opp = side === 'R' ? 'B' : 'R', x0 = -B.dist * s;
    let cur = null;
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.side === side && it.t - it.imp <= t && t < it.t - it.imp + it.dur) { cur = it; break; } }
    let k = 0, kk = 0;
    if (cur) {
      const u = (t - (cur.t - cur.imp)) / cur.dur, ext = cur.imp / cur.dur;
      if (u < ext) k = u / ext; else if (u < ext + 0.08) k = 1; else k = 1 - clamp((u - ext - 0.08) / (1 - ext - 0.08), 0, 1);
      kk = easeIO(k);
    }
    let dx = Math.sin(t * 2.3 + ph) * 2.2, sag = 0, pitch = 9 + Math.sin(t * 5 + ph) * 0.8, twist = 0, headP = 0;
    const bob = Math.sin(t * 5 + ph) * 0.8, kick = !!cur && cur.limb[0] === 'f', hi = !!cur && cur.tech.h === 'haut', mid = !!cur && cur.tech.h === 'milieu';
    if (cur) {
      if (kick) { dx += kk * 24; pitch = lerp(pitch, hi ? -24 : mid ? -13 : 7, kk); twist = kk * (cur.tech.coup === 'fouette' ? 22 : 8); sag = kk * 2; headP = kk * (hi ? 6 : 0); }
      else { dx += kk * 28; pitch = lerp(pitch, hi ? 19 : 14, kk); twist = kk * (cur.limb === 'hR' ? 24 : 12) * (cur.tech.coup === 'crochet' ? 1.4 : 1); sag = kk * 3; headP = -kk * 4; }
    }
    // coup reçu : recul
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.side === opp && t >= it.t && t < it.t + 0.42) {
      const bump = (1 - (t - it.t) / 0.42) * (it.e.hd ? 0.3 : 1);
      dx -= 9 * bump; pitch -= (it.tech.h === 'haut' ? 7 : 11) * bump; headP -= (it.tech.h === 'haut' ? 16 : 5) * bump; break; } }
    const R = [x0 + s * dx, B.hipH - sag + bob, 0], latL = s;               // côté « avant » : local = s → monde +z (proche de la caméra)
    const F0 = {L: [x0 + s * 21, B.ankle, 14], R: [x0 - s * 23, B.ankle, -14]};
    const G = {L: up(R, s, pitch, twist, [27, 61, latL * 12]), R: up(R, s, pitch, twist, [22, 57, -latL * 11])};
    const shL = up(R, s, pitch, twist, [0, B.shY, latL * B.shW]), shR = up(R, s, pitch, twist, [0, B.shY, -latL * B.shW]);
    const hipL = up(R, s, pitch * 0.3, twist * 0.3, [0, 0, latL * B.hipW]), hipR = up(R, s, pitch * 0.3, twist * 0.3, [0, 0, -latL * B.hipW]);
    const hands = {L: G.L, R: G.R}, feet = {L: F0.L, R: F0.R}, polesH = {L: [0, -1, 0.5], R: [0, -1, -0.5]};
    if (cur && kick) { const supp = cur.limb === 'fL' ? 'R' : 'L'; feet[supp] = add(F0[supp], [s * 7 * kk, 0, 0]); }
    if (cur) {
      const T = targetOf(cur);
      if (!kick) {
        const key = cur.limb === 'hL' ? 'L' : 'R', hook = cur.tech.coup === 'crochet', out = key === 'L' ? 1 : -1;
        let p = vlerp(G[key], T, hook ? easeIO(k) : easeOut(k));
        if (hook) p = add(p, [0, 6 * Math.sin(Math.PI * k), out * 20 * Math.sin(Math.PI * k)]);
        hands[key] = p; polesH[key] = hook ? [0, 0.45, out] : [0, -1, out * 0.35];
      } else {
        const key = cur.limb === 'fL' ? 'L' : 'R', out = key === 'L' ? 1 : -1, G0 = F0[key];
        const ch = add(R, [s * (hi ? 22 : mid ? 20 : 16), -(B.hipH - B.ankle) + (hi ? 42 : mid ? 38 : 28), out * 8]);   // armé : genou levé, pied sous le genou
        let p;
        if (k < 0.5) p = vlerp(G0, ch, easeIO(k / 0.5));
        else { const x = (k - 0.5) / 0.5, whip = cur.tech.coup === 'fouette'; p = vlerp(ch, T, whip ? easeIn(x) * 0.15 + easeOut(x) * 0.85 : easeOut(x)); if (whip) p = add(p, [0, 10 * Math.sin(Math.PI * x), out * 8 * Math.sin(Math.PI * x)]); }
        feet[key] = p;
      }
    }
    return {s, R, pitch, twist, headP, shL, shR, hipL, hipR, hands, feet, polesH, kickKey: cur && kick ? (cur.limb === 'fL' ? 'L' : 'R') : null, latL};
  }

  /* ---------- squelette → formes à dessiner ---------- */
  function prims(side, P, o) {
    const out = [], s = P.s, gc = COL[side], longP = o.sexe === 'F';
    const cap = (a, b, ra, rb, c, bias) => out.push({t: 'cap', a, b, ra, rb, c, bias: bias || 0});
    const sph = (p, r, c, o2) => out.push({t: 'sph', p, r, c, noOutline: !!(o2 && o2.no), bias: (o2 && o2.bias) || 0});
    // jambes : le genou ne plie que dans le bon sens (pôle = côté « avant » du plan du corps)
    const legs = {};
    ['L', 'R'].forEach(key => {
      const hip = key === 'L' ? P.hipL : P.hipR, F = P.feet[key], u0 = norm(sub(F, hip));
      const r = ik2(hip, F, B.thigh, B.shin, [-s * u0[1], s * u0[0], 0]), K = r.J, A = r.T, sd = norm(sub(A, K));
      legs[key] = {hip, K, A, toe: norm([-s * sd[1], s * sd[0], key === 'L' ? 0.05 : -0.05])};
    });
    ['R', 'L'].forEach(key => {
      const g = legs[key], mid = add(g.hip, mul(sub(g.K, g.hip), 0.78));
      if (longP) { cap(g.hip, g.K, 7.4, 5.6, PANTS); cap(g.K, g.A, 5.4, 4.0, PANTS); }
      else { cap(g.hip, mid, 8.2, 6.8, PANTS); cap(mid, g.K, 5.6, 5.2, SKIN); cap(g.K, g.A, 5.0, 3.6, SKIN); cap(add(g.A, mul(sub(g.K, g.A), 0.34)), g.A, 4.4, 4.0, '#fff'); }
      sph(g.K, longP ? 5.6 : 5.2, longP ? PANTS : SKIN, {no: true, bias: -0.5});
      const heel = sub(g.A, mul(g.toe, 4.5)), tip = add(g.A, mul(g.toe, 17));
      cap(add(heel, [0, -3.2, 0]), add(tip, [0, -3.2, 0]), 3.2, 3.0, '#fff', 0.2);
      cap(add(heel, [0, -0.6, 0]), add(tip, [0, -0.6, 0]), 4.6, 4.0, SHOE, 0.3);
      cap(add(g.A, mul(g.toe, 6)), add(g.A, mul(g.toe, 13)), 4.7, 4.1, gc, 0.35);
    });
    // bassin, torse, tenue
    cap(P.hipL, P.hipR, 8.8, 8.8, PANTS);
    cap(up(P.R, s, P.pitch, P.twist, [0, 8, 0]), up(P.R, s, P.pitch, P.twist, [0, 40, 0]), 13.5, 15.5, '#fff', 0.2);
    cap(P.shL, P.shR, 6.2, 6.2, '#fff', 0.4);
    cap(up(P.R, s, P.pitch, P.twist, [0, 12, P.latL * 12]), up(P.R, s, P.pitch, P.twist, [0, 42, P.latL * 13]), 2.2, 2.2, TEE_B, 0.5);
    cap(up(P.R, s, P.pitch, P.twist, [0, 12, -P.latL * 12]), up(P.R, s, P.pitch, P.twist, [0, 42, -P.latL * 13]), 2.2, 2.2, TEE_B, 0.5);
    out.push({t: 'logo', p: up(P.R, s, P.pitch, P.twist, [14, 30, 0]), n: [s, 0, 0], bias: 0.9});
    // bras : le coude ne plie que dans le bon sens
    const arm = (key, sh) => {
      const r = ik2(sh, P.hands[key], B.upper, B.fore, P.polesH[key]), E = r.J, T = r.T, fdir = norm(sub(T, E)), wrist = sub(T, mul(fdir, 7));
      cap(sh, E, 4.8, 4.2, SKIN); cap(E, wrist, 4.2, 3.7, SKIN);
      cap(sh, add(sh, mul(norm(sub(E, sh)), 9)), 6.6, 6.0, '#fff', 0.1);
      sph(E, 4.4, SKIN, {no: true, bias: -0.5});
      cap(sub(T, mul(fdir, 9)), sub(T, mul(fdir, 3)), 5.6, 5.6, '#fff', 0.2);
      sph(T, B.gloveR, gc, {bias: 0.4});
      sph(add(T, add(mul(fdir, 3), [0, 4, 0])), 2.6, '#fff', {no: true, bias: 0.6});
    };
    arm('R', P.shR); arm('L', P.shL);
    // tête
    const neck = up(P.R, s, P.pitch, P.twist, [0, B.neckY, 0]), hd = up(P.R, s, P.pitch + P.headP, P.twist, [0, B.headY, 0]);
    const fw = norm(sub(up(P.R, s, P.pitch + P.headP, P.twist, [1, B.headY, 0]), hd)), rt = norm(sub(up(P.R, s, P.pitch + P.headP, P.twist, [0, B.headY, 1]), hd));
    cap(sub(neck, [0, 2, 0]), add(neck, [0, 4, 0]), 4.4, 4.4, SKIN_D);
    sph(add(sub(hd, mul(fw, 2.5)), [0, 1.8, 0]), B.headR + 1.1, HAIR, {bias: -0.6});
    if (o.sexe === 'F') { const tail = sub(add(hd, [0, -1, 0]), mul(fw, 13)); sph(tail, 5.2, HAIR, {bias: -0.7}); cap(tail, sub(add(hd, [0, -15, 0]), mul(fw, 16)), 4.2, 3.0, HAIR, -0.7); }
    sph(hd, B.headR, SKIN);
    sph(add(sub(hd, mul(rt, 9.4)), mul(fw, -1.5)), 2.8, SKIN, {bias: -0.2});
    sph(add(add(hd, mul(rt, 9.4)), mul(fw, -1.5)), 2.8, SKIN, {bias: -0.2});
    sph(add(add(hd, mul(fw, 4)), [0, 8.4, 0]), 7.2, HAIR, {bias: 0.4});
    if (o.sexe !== 'F') [-1, 0, 1].forEach(j => sph(add(add(hd, [0, 11.2, 0]), add(mul(rt, j * 5), mul(fw, 1))), 3.6, HAIR, {bias: 0.3}));
    out.push({t: 'face', hd, fw, rt, bias: 1.4});
    return out;
  }

  /* ---------- rendu ---------- */
  const CAM = {pos: [26, 112, 318], look: [0, 90, 0]}, view = {az: 14, el: 13, R: 330};   // caméra orbitale (glisser pour tourner)
  function camera(W, H) {
    const az = rad(view.az), el = rad(view.el);
    CAM.pos = [CAM.look[0] + view.R * Math.sin(az) * Math.cos(el), CAM.look[1] + view.R * Math.sin(el), CAM.look[2] + view.R * Math.cos(az) * Math.cos(el)];
    const f = norm(sub(CAM.look, CAM.pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    return {f, r, u, F: Math.min(W * view.R / 215, H * view.R / 205), W, H};
  }
  function proj(c, p) { const d = sub(p, CAM.pos), z = dot(d, c.f), k = c.F / z; return {x: c.W / 2 + dot(d, c.r) * k, y: c.H * 0.5 - dot(d, c.u) * k, z, k}; }
  const depthOf = (c, pr) => dot(sub(pr.a ? vlerp(pr.a, pr.b, 0.5) : (pr.p || pr.hd), CAM.pos), c.f) - (pr.bias || 0) * 3;
  function drawCap(ctx, c, pr) {
    const A = proj(c, pr.a), Bp = proj(c, pr.b), ra = pr.ra * A.k, rb = pr.rb * Bp.k, ol = Math.max(1.6, c.F * 0.0036);
    const pass = (e, col) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(A.x, A.y, ra + e, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(Bp.x, Bp.y, rb + e, 0, 7); ctx.fill();
      const dx = Bp.x - A.x, dy = Bp.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      ctx.beginPath(); ctx.moveTo(A.x + nx * (ra + e), A.y + ny * (ra + e)); ctx.lineTo(Bp.x + nx * (rb + e), Bp.y + ny * (rb + e)); ctx.lineTo(Bp.x - nx * (rb + e), Bp.y - ny * (rb + e)); ctx.lineTo(A.x - nx * (ra + e), A.y - ny * (ra + e)); ctx.closePath(); ctx.fill();
    };
    pass(ol, NAVY); pass(0, pr.c);
  }
  function drawSph(ctx, c, pr) {
    const A = proj(c, pr.p), r = pr.r * A.k, ol = Math.max(1.6, c.F * 0.0036);
    if (!pr.noOutline) { ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(A.x, A.y, r + ol, 0, 7); ctx.fill(); }
    ctx.fillStyle = pr.c; ctx.beginPath(); ctx.arc(A.x, A.y, r, 0, 7); ctx.fill();
  }
  function drawFace(ctx, c, pr) {
    const hd = pr.hd, toCam = norm(sub(CAM.pos, hd));
    const eye = lat => {
      const vis = dot(norm(add(pr.fw, mul(pr.rt, lat * 0.62))), toCam); if (vis < 0.05) return;
      const p = add(add(hd, mul(norm(add(pr.fw, mul(pr.rt, lat * 0.42))), B.headR - 0.4)), [0, 1.2, 0]), A = proj(c, p), k = A.k, w = (1.35 + 0.8 * vis) * k;
      ctx.fillStyle = NAVY; ctx.beginPath(); ctx.ellipse(A.x, A.y, w, 2.7 * k, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(A.x + w * 0.25, A.y - 1.4 * k, 0.9 * k, 0, 7); ctx.fill();
      ctx.strokeStyle = NAVY; ctx.lineWidth = Math.max(1.5, 1.1 * k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A.x - w * 1.1, A.y - 4.6 * k); ctx.lineTo(A.x + w * 1.1, A.y - 5.2 * k); ctx.stroke();
    };
    eye(-1); eye(1);
    if (dot(pr.fw, toCam) > -0.1) { const A = proj(c, add(hd, add(mul(pr.fw, B.headR + 0.6), [0, -1.6, 0]))); ctx.fillStyle = SKIN_D; ctx.strokeStyle = NAVY; ctx.lineWidth = Math.max(1.4, 0.9 * A.k); ctx.beginPath(); ctx.arc(A.x, A.y, 1.6 * A.k, 0, 7); ctx.fill(); ctx.stroke(); }
    if (dot(pr.fw, toCam) > 0.05) { const m = add(hd, add(mul(pr.fw, B.headR - 0.5), [0, -5.6, 0])), A = proj(c, m), A2 = proj(c, add(m, mul(pr.rt, 2.8))), A1 = proj(c, sub(m, mul(pr.rt, 2.8)));
      ctx.strokeStyle = NAVY; ctx.lineWidth = Math.max(1.5, A.k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A1.x, A1.y); ctx.quadraticCurveTo(A.x, A.y + 1.6 * A.k, A2.x, A2.y); ctx.stroke(); }
  }
  function drawLogo(ctx, c, pr) {
    if (dot(pr.n, norm(sub(CAM.pos, pr.p))) < 0.12) return;
    const A = proj(c, pr.p); ctx.fillStyle = TEE_B; ctx.font = `italic 800 ${(6.6 * A.k).toFixed(1)}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.fillText("N'EPS", A.x, A.y);
  }
  function draw3d(ctx, W, H, t, st) {
    const c = camera(W, H), items = st.tl.items, data = st.data;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#EAF2FF'); g.addColorStop(1, '#FFFFFF'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const quad = [[-400, 0, -220], [400, 0, -220], [400, 0, 160], [-400, 0, 160]].map(p => proj(c, p));
    ctx.fillStyle = '#D8E6FA'; ctx.beginPath(); quad.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#B7CDEE'; ctx.lineWidth = 2; for (let x = -240; x <= 240; x += 40) { const a = proj(c, [x, 0, -220]), b = proj(c, [x, 0, 160]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    const poses = {R: poseOf('R', t, items), B: poseOf('B', t, items)};
    ['R', 'B'].forEach(sd => { const P = poses[sd], S = proj(c, [P.R[0], 0, 0]); ctx.fillStyle = 'rgba(19,40,90,.16)'; ctx.beginPath(); ctx.ellipse(S.x, S.y, 34 * S.k, 8 * S.k, 0, 0, 7); ctx.fill(); });
    const list = prims('R', poses.R, {sexe: data.R.sexe}).concat(prims('B', poses.B, {sexe: data.B.sexe}));
    list.forEach((p, i) => { p.d = depthOf(c, p); p.i = i; });
    list.sort((a, b) => (b.d - a.d) || (a.i - b.i));
    list.forEach(p => { if (p.t === 'cap') drawCap(ctx, c, p); else if (p.t === 'sph') drawSph(ctx, c, p); else if (p.t === 'face') drawFace(ctx, c, p); else if (p.t === 'logo') drawLogo(ctx, c, p); });
    items.forEach(it => {
      const dt = t - it.t; if (dt < 0 || dt >= 0.7) return;
      const k = dt / 0.7, A = proj(c, targetOf(it)), r = (14 + 30 * Math.sqrt(k)) * (c.F / 800), col = it.e.hd ? '#9AA3B5' : it.e.trop ? '#E65100' : COL[it.side];
      ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * .45 : r; ctx[i ? 'lineTo' : 'moveTo'](A.x + rr * Math.cos(a), A.y + rr * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = `italic 800 ${Math.round(c.F * 0.034)}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = NAVY; ctx.fillStyle = '#fff';
      const txt = `${labelOf(it)} ${it.e.hd ? 'hors distance' : it.e.trop ? 'trop fort' : (it.pts > 0 ? '+' + it.pts : '0')}`; ctx.strokeText(txt, A.x, A.y - r - 6); ctx.fillText(txt, A.x, A.y - r - 6); ctx.restore();
    });
  }

  /* ---------- lecteur ---------- */
  let st = null;
  function ensureDom() {
    if (document.getElementById('replayDlg')) return;
    const d = document.createElement('dialog'); d.id = 'replayDlg';
    d.innerHTML = `<div class="rp"><div class="rp-top"><div class="rp-sc red"><span class="rp-name" id="rpNR"></span><b id="rpSR">0</b></div>
      <div class="rp-mid"><div class="rp-clock" id="rpClock">0:00</div><div class="rp-cap" id="rpCap"></div></div>
      <div class="rp-sc blue"><b id="rpSB">0</b><span class="rp-name" id="rpNB"></span></div></div>
      <canvas id="rpStage" role="img" aria-label="Récap animé de l'assaut en 3D"></canvas>
      <div class="rp-bar"><button class="btn" id="rpRestart" title="Revenir au début">⏮</button><button class="btn go" id="rpPlay">⏸</button>
        <div class="rp-seekwrap"><input type="range" id="rpSeek" min="0" max="1000" value="0"><div class="rp-ticks" id="rpTicks"></div></div>
        <div class="seg small" id="rpSpeed"><button data-sp="1" class="on">×1</button><button data-sp="1.5">×1,5</button><button data-sp="2">×2</button></div>
        <button class="btn" id="rpClose">✕ Fermer</button></div><div class="rp-note" id="rpNote"></div></div>`;
    document.body.appendChild(d);
    d.addEventListener('cancel', e => { e.preventDefault(); close(); });
    d.querySelector('#rpClose').onclick = close;
    const cv = d.querySelector('#rpStage'); let drag = null;
    cv.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY, az: view.az, el: view.el}; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* */ } });
    cv.addEventListener('pointermove', e => { if (!drag) return; view.az = clamp(drag.az + (e.clientX - drag.x) * 0.35, -85, 85); view.el = clamp(drag.el + (e.clientY - drag.y) * 0.2, 2, 55); draw(); });
    ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { drag = null; }));
    cv.addEventListener('dblclick', () => { view.az = 14; view.el = 13; draw(); });
    d.querySelector('#rpPlay').onclick = () => { st.playing = !st.playing; if (st.playing && st.t >= st.tl.dur) st.t = 0; draw(); };
    d.querySelector('#rpRestart').onclick = () => { st.t = 0; st.playing = true; draw(); };
    d.querySelector('#rpSeek').addEventListener('input', e => { st.t = +e.target.value / 1000 * st.tl.dur; draw(); });
    d.querySelector('#rpSpeed').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (!b) return; st.speed = +b.dataset.sp; d.querySelectorAll('#rpSpeed button').forEach(x => x.classList.toggle('on', x === b)); });
  }
  function open(data) {
    ensureDom();
    const tl = build(data);
    st = {data, tl, t: 0, playing: true, speed: 1, last: performance.now(), raf: 0}; view.az = 14; view.el = 13;
    const d = document.getElementById('replayDlg');
    d.querySelector('#rpNR').textContent = data.R.name; d.querySelector('#rpNB').textContent = data.B.name;
    d.querySelector('#rpTicks').innerHTML = tl.items.map(it => `<i style="left:${(it.t / tl.dur * 100).toFixed(2)}%;background:${COL[it.side]}"></i>`).join('');
    d.querySelector('#rpNote').textContent = tl.items.length ? `Glissez sur l'image pour tourner la caméra · ${tl.items.length} coup${tl.items.length > 1 ? 's' : ''} rejoué${tl.items.length > 1 ? 's' : ''} au moment où ils ont été saisis${tl.skipped ? ` · temps morts de plus de ${GAP_MAX} s raccourcis (${tl.skipped} s)` : ''}` : 'Aucun coup saisi dans cet assaut.';
    if (!d.open) d.showModal();
    cancelAnimationFrame(st.raf); st.last = performance.now(); st.raf = requestAnimationFrame(loop);
  }
  function close() { if (st) cancelAnimationFrame(st.raf); const d = document.getElementById('replayDlg'); if (d && d.open) d.close(); }
  function loop(now) {
    if (!st) return;
    const dt = Math.min(0.4, (now - st.last) / 1000); st.last = now;
    if (st.playing) { st.t += dt * st.speed; if (st.t >= st.tl.dur) { st.t = st.tl.dur; st.playing = false; } }
    draw();
    const d = document.getElementById('replayDlg'); if (d && d.open) st.raf = requestAnimationFrame(loop);
  }
  function draw() {
    if (!st) return;
    const d = document.getElementById('replayDlg'); if (!d) return;
    const cv = d.querySelector('#rpStage'), r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (r.width < 10) return;
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = st.t, items = st.tl.items;
    draw3d(ctx, r.width, r.height, t, st);
    let last = null; items.forEach(it => { if (t - it.t >= 0) last = it; });
    const sc = last ? last.sc : {R: 0, B: 0};
    d.querySelector('#rpSR').textContent = sc.R; d.querySelector('#rpSB').textContent = sc.B;
    d.querySelector('#rpClock').textContent = fmt(Math.max(0, t - LEAD));
    d.querySelector('#rpCap').innerHTML = last && t - last.t < 2.2 ? `<span class="${last.side === 'R' ? 'wR' : 'wB'}">${last.side === 'R' ? 'Rouge' : 'Bleu'}</span> · ${esc(labelOf(last))}${last.e.hd ? ' · hors distance' : last.e.trop ? ' · trop fort' : ''} <b>${last.pts > 0 ? '+' + last.pts : last.pts}</b>` : '&nbsp;';
    d.querySelector('#rpSeek').value = Math.round(t / st.tl.dur * 1000);
    d.querySelector('#rpPlay').textContent = st.playing ? '⏸' : '▶';
  }
  const R = {open, state: () => st};
  R.fromLive = l => ({R: {name: l.R.name, sexe: l.R.sexe}, B: {name: l.B.name, sexe: l.B.sexe}, events: l.events});
  R.fromAssault = a => ({R: {name: a.names?.R || nameOf(a.red), sexe: stu(a.red)?.sexe || 'G'}, B: {name: a.names?.B || nameOf(a.blue), sexe: stu(a.blue)?.sexe || 'F'}, events: a.events || []});
  global.Replay = R;
})(window);
