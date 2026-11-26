/* Observ'BF — récap animé de l'assaut : deux boxeurs en vue de 3/4 rejouent, au bon moment, les coups saisis.
   Personnages dessinés en SVG articulé, dans l'esthétique des illustrations (contour marine épais, aplats). */
(function (global) {
  'use strict';
  const NAVY = '#0A1F4D', SKIN = '#F4B07A', SKIN_D = '#E8975C', HAIR = '#8A4B1F', HAIR_D = '#6E3A15', TEE_B = '#2F7BEA', PANTS = '#1B3A8F', SHOE = '#1A2A55';
  const COL = {R: '#E53935', B: '#1E6FE0'};
  const GAP_MAX = 5, LEAD = 1.2, TAIL = 1.8, STRIKE = 0.62, IMPACT = 0.28;
  const rad = d => d * Math.PI / 180, dir = a => [Math.cos(rad(a)), Math.sin(rad(a))];
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = k => 1 - Math.pow(1 - k, 3), easeIn = k => k * k * k, easeIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const LEN = {u: 60, f: 54, th: 84, sh: 84};
  const HIP_X = 108;                                  // distance de chaque boxeur au centre
  const GUARD = {dx: 0, bob: 0, lean: 8, head: 0, pv: 0, a1: [62, -75], a2: [58, -82], l1: [80, 98], l2: [108, 88]};

  /* ---------- géométrie ---------- */
  const rot = (p, a) => [p[0] * Math.cos(rad(a)) - p[1] * Math.sin(rad(a)), p[0] * Math.sin(rad(a)) + p[1] * Math.cos(rad(a))];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const shoulderOf = (pose, off) => add([pose.dx, pose.bob], rot([8 + (off || 0), -122], pose.lean));
  /* cinématique inverse à deux segments ; s = +1 : coude / genou du côté des aiguilles (en dessous de la ligne), -1 : au-dessus */
  function ik(root, target, l1, l2, s) {
    const dx = target[0] - root[0], dy = target[1] - root[1];
    let d = Math.hypot(dx, dy); const phi = Math.atan2(dy, dx) * 180 / Math.PI;
    if (d >= l1 + l2 - 1) return [phi, phi];
    d = Math.max(d, Math.abs(l1 - l2) + 1);
    const beta = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * 180 / Math.PI;
    const a1 = phi + s * beta, e = add(root, dir(a1).map(v => v * l1));
    return [a1, Math.atan2(target[1] - e[1], target[0] - e[0]) * 180 / Math.PI];
  }

  /* ---------- technique d'un événement ---------- */
  function techOf(e) {
    const arme = e.gen ? 'poing' : e.w, coup = e.gen ? 'direct' : e.c;
    let h = e.h;
    if (!h) h = e.z === 'tete' ? 'haut' : e.z === 'jambes' ? 'bas' : e.z === 'flancs' ? 'milieu' : e.z === 'ventre' ? 'bas' : 'milieu';
    if (arme === 'poing' && h === 'milieu') h = 'bas';
    const ty = e.nh ? (arme === 'poing' ? -100 : -75) : arme === 'poing' ? (h === 'haut' ? -165 : -48) : (h === 'haut' ? -160 : h === 'milieu' ? -78 : 62);
    return {arme, coup, h, ty};
  }
  /* pose au moment de l'impact (angles calculés par cinématique inverse vers la cible sur l'adversaire).
     Coups de pied, d'après la planche des coups de pied : garde → armé (genou levé) → frappe (jambe d'appui tendue qui pivote,
     buste qui se penche en arrière pour le haut, mains en garde) → retour par l'armé. */
  function impactPose(t, limb) {
    const D = 2 * HIP_X - 14, tgt = [D, t.ty], p = JSON.parse(JSON.stringify(GUARD));
    if (t.arme === 'poing') {
      p.dx = 52; p.lean = t.h === 'haut' ? 16 : 11; p.l1 = [74, 100]; p.l2 = [112, 84];
      const sh = shoulderOf(p, limb === 'a1' ? 4 : -6), hook = t.coup === 'crochet';
      const target = hook ? [tgt[0] - 26, tgt[1] - 4] : tgt;
      p[limb] = ik(sh, target, LEN.u, LEN.f, hook ? -1 : 1);
      p.head = -4;
    } else {
      const high = t.h === 'haut', mid = t.h === 'milieu', whip = t.coup === 'fouette';
      p.dx = 58; p.lean = high ? -20 : mid ? -11 : 6; p.head = high ? 8 : 0;
      const sup = limb === 'l1' ? 'l2' : 'l1';
      p[sup] = [sup === 'l1' ? 87 : 93, 90];                        // jambe d'appui quasi tendue
      p.pv = whip ? 1 : 0.6;                                         // le pied d'appui pivote
      p.a1 = [high ? 66 : 62, -72]; p.a2 = [high ? 100 : 74, -64];  // mains qui restent en garde
      const hipPos = [p.dx + (limb === 'l1' ? 6 : -6), 0];
      p[limb] = ik(hipPos, [tgt[0] - 4, tgt[1] * 0.8], LEN.th, LEN.sh, whip ? -1 : 1);
      p.ch = {limb, l: whip ? [high ? -32 : mid ? -12 : 28, 152] : [high ? -38 : mid ? -22 : 12, 96]};
    }
    return p;
  }
  /* mélange garde → (armé) → impact. Poing : le dernier segment peut claquer (crochet). Pied : chassé = jambe qui pousse,
     fouetté = cuisse qui monte puis tibia qui claque. */
  function blend(S, limb, kind, k, ks) {
    const out = {}, isLeg = limb[0] === 'l', kj = isLeg ? easeIO(k) : k;
    for (const key of Object.keys(GUARD)) {
      const g = GUARD[key];
      if (Array.isArray(g)) {
        if (isLeg && key === limb && S.ch) {
          const c = S.ch.l, im = S[key];
          if (k < 0.5) { const x = easeIO(k / 0.5); out[key] = [lerp(g[0], c[0], x), lerp(g[1], c[1], x)]; }
          else { const x = (k - 0.5) / 0.5; out[key] = [lerp(c[0], im[0], easeOut(x)), lerp(c[1], im[1], kind === 'fouette' ? easeIn(x) : easeOut(x))]; }
        } else if (key === limb && kind === 'crochet') out[key] = [lerp(g[0], S[key][0], k), lerp(g[1], S[key][1], ks)];
        else out[key] = g.map((v, i) => lerp(v, S[key][i], kj));
      } else out[key] = lerp(g, S[key], kj);
    }
    return out;
  }
  function strikeK(u, ext, kick) {   // u : 0..1 sur la durée du coup ; renvoie [k, kSnap]
    if (u < ext) { const x = u / ext; return kick ? [x, x] : [easeOut(x), easeIn(x)]; }
    if (u < ext + 0.08) return [1, 1];
    const x = clamp((u - ext - 0.08) / (1 - ext - 0.08), 0, 1), k = kick ? 1 - x : 1 - easeIO(x); return [k, k];
  }

  /* ---------- dessin d'un boxeur (axe de face = +x) ---------- */
  const path = (pts, w, col) => { const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    return `<path d="${d}" stroke="${NAVY}" stroke-width="${w + 7}" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; };
  const fillOnly = (pts, w, col) => { const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L'); return `<path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; };
  function glove(h, ang, col) {
    return `<g transform="translate(${h[0].toFixed(1)} ${h[1].toFixed(1)}) rotate(${ang.toFixed(1)}) scale(1.15)">
      <rect x="-14" y="-12" width="14" height="24" rx="4" fill="#fff" stroke="${NAVY}" stroke-width="3.5"/><rect x="-10" y="-12" width="4" height="24" fill="${col}"/>
      <ellipse cx="14" cy="0" rx="24" ry="20" fill="${col}" stroke="${NAVY}" stroke-width="4"/>
      <ellipse cx="18" cy="-8" rx="9" ry="5" fill="#fff" opacity=".45"/><path d="M6 12 Q20 20 34 8" stroke="${NAVY}" stroke-width="2.5" fill="none" opacity=".5"/></g>`;
  }
  function shoe(f, shinAng, corner, sq) {
    return `<g transform="translate(${f[0].toFixed(1)} ${f[1].toFixed(1)}) rotate(${(shinAng - 90).toFixed(1)}) scale(${(1.12 * (sq || 1)).toFixed(3)} 1.12)">
      <path d="M-16 -16 L-16 6 Q-16 14 -8 14 L30 14 Q42 14 40 4 Q36 -6 20 -9 L-2 -9 L-5 -16 Z" fill="${SHOE}" stroke="${NAVY}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-16 6 L-16 14 L36 14 L38 8 Z" fill="#fff" stroke="${NAVY}" stroke-width="2"/><path d="M-8 -2 L22 -2 L30 6" stroke="${corner}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M-2 -16 L-2 -9 M10 -9 L12 -3" stroke="#fff" stroke-width="2" fill="none"/></g>`;
  }
  function hair(variant) {
    if (variant === 'F') return `<path d="M-20 -154 Q-26 -182 4 -184 Q34 -184 38 -160 Q24 -170 10 -166 Q-4 -158 -20 -154Z" fill="${HAIR}" stroke="${NAVY}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-18 -166 Q-52 -170 -48 -134 Q-46 -112 -34 -102 Q-40 -126 -24 -142Z" fill="${HAIR}" stroke="${NAVY}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="-22" cy="-170" r="4" fill="${COL.R}" stroke="${NAVY}" stroke-width="2"/>`;
    return `<path d="M-22 -154 Q-30 -186 -4 -184 Q4 -198 22 -188 Q44 -188 38 -164 Q28 -172 16 -170 Q6 -162 -8 -168 Q-14 -158 -22 -154Z" fill="${HAIR}" stroke="${NAVY}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-4 -184 L-10 -196 L6 -188 M14 -190 L24 -200 L28 -188" stroke="${NAVY}" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
  }
  function boxer(pose, o) {
    const gc = COL[o.corner], sh1 = shoulderOf(pose, 6), sh2 = shoulderOf(pose, -10), hip = [pose.dx, pose.bob];
    const arm = (a, sh) => { const e = add(sh, dir(a[0]).map(v => v * LEN.u)), h = add(e, dir(a[1]).map(v => v * LEN.f)); return {e, h, ang: a[1]}; };
    const A1 = arm(pose.a1, sh1), A2 = arm(pose.a2, sh2);
    const leg = (l, hp) => { const k = add(hp, dir(l[0]).map(v => v * LEN.th)), f = add(k, dir(l[1]).map(v => v * LEN.sh)); return {k, f, sh: l[1], th: l[0], hp}; };
    const L1 = leg(pose.l1, add(hip, [6, 0])), L2 = leg(pose.l2, add(hip, [-6, 0]));
    const longP = o.sexe === 'F';
    const f1 = v => v.toFixed(1);
    const taper = (p, q, w0, w1, col) => { const dx = q[0] - p[0], dy = q[1] - p[1], L0 = Math.hypot(dx, dy) || 1, nx = -dy / L0, ny = dx / L0;
      const P = [[p[0] + nx * w0 / 2, p[1] + ny * w0 / 2], [q[0] + nx * w1 / 2, q[1] + ny * w1 / 2], [q[0] - nx * w1 / 2, q[1] - ny * w1 / 2], [p[0] - nx * w0 / 2, p[1] - ny * w0 / 2]];
      return `<path d="M${P.map(v => f1(v[0]) + ' ' + f1(v[1])).join('L')}Z" fill="${col}" stroke="${NAVY}" stroke-width="4.5" stroke-linejoin="round"/>`; };
    const knee = (k, rr, col) => `<circle cx="${f1(k[0])}" cy="${f1(k[1])}" r="${rr}" fill="${col}"/>`;
    const along = (p, q, a0, a1) => [[lerp(p[0], q[0], a0), lerp(p[1], q[1], a0)], [lerp(p[0], q[0], a1), lerp(p[1], q[1], a1)]];
    const legSvg = (L, name) => {
      const support = pose.kl && name !== pose.kl && pose.kk > 0.12, sq = support ? 1 - 0.45 * pose.pv * Math.min(1, pose.kk * 1.5) : 1;
      let s;
      if (longP) {
        s = taper(L.hp, L.k, 40, 31, PANTS) + taper(L.k, L.f, 31, 23, PANTS) + knee(L.k, 12, PANTS);
        const st1 = along(L.hp, L.k, 0.1, 0.92), st2 = along(L.k, L.f, 0.08, 0.95);
        s += `<path d="M${f1(st1[0][0])} ${f1(st1[0][1])}L${f1(st1[1][0])} ${f1(st1[1][1])}M${f1(st2[0][0])} ${f1(st2[0][1])}L${f1(st2[1][0])} ${f1(st2[1][1])}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".95"/>`;
      } else {
        const mid = add(L.hp, dir(L.th).map(v => v * LEN.th * 0.8)), sock = along(L.k, L.f, 0.62, 0.98);
        s = taper(L.k, L.f, 26, 18, SKIN) + knee(L.k, 9, SKIN) + taper(L.hp, mid, 44, 36, PANTS) +
          `<path d="M${f1(sock[0][0])} ${f1(sock[0][1])}L${f1(sock[1][0])} ${f1(sock[1][1])}" stroke="#fff" stroke-width="20" stroke-linecap="round"/>`;
        const st = along(L.hp, mid, 0.08, 0.9); s += `<path d="M${f1(st[0][0])} ${f1(st[0][1])}L${f1(st[1][0])} ${f1(st[1][1])}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
      }
      return s + shoe(L.f, L.sh, gc, sq);
    };
    const armSvg = (A, sh) => { const ua = Math.atan2(A.e[1] - sh[1], A.e[0] - sh[0]) * 180 / Math.PI, sl = add(sh, dir(ua).map(v => v * 20));
      return path([sh, A.e, A.h], 22, SKIN) + `<path d="M${sh[0].toFixed(1)} ${sh[1].toFixed(1)}L${sl[0].toFixed(1)} ${sl[1].toFixed(1)}" stroke="#fff" stroke-width="27" stroke-linecap="round"/>` + glove(A.h, A.ang, gc); };
    const torso = `<g transform="translate(${hip[0].toFixed(1)} ${hip[1].toFixed(1)}) rotate(${pose.lean.toFixed(1)})">
      <path d="M-26 4 L28 4 L36 -112 Q8 -132 -30 -116 Z" fill="#fff" stroke="${NAVY}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M10 4 L26 4 L32 -112 L20 -118 Z" fill="${TEE_B}"/><path d="M-24 4 L-14 4 L-24 -116 L-26 -116Z" fill="${TEE_B}"/>
      <path d="M-24 4 L26 4 L32 -112 Q8 -130 -26 -116 Z" fill="none" stroke="${NAVY}" stroke-width="4.5" stroke-linejoin="round"/>
      <text x="4" y="-62" font-family="Barlow Condensed, sans-serif" font-weight="800" font-style="italic" font-size="15" fill="${TEE_B}" text-anchor="middle">N'EPS</text>
      <path d="M-6 -86 q10 -8 16 -2 q-8 2 -10 8z" fill="${TEE_B}"/>
      <rect x="-24" y="2" width="50" height="22" rx="4" fill="${PANTS}" stroke="${NAVY}" stroke-width="4"/><path d="M-6 3 L-6 22" stroke="#fff" stroke-width="3"/>
      <g transform="rotate(${pose.head.toFixed(1)} 8 -124)"><g transform="translate(9 -146) scale(1.28) translate(-9 146)">
        <rect x="-2" y="-134" width="18" height="16" fill="${SKIN_D}" stroke="${NAVY}" stroke-width="3"/>
        <circle cx="-15" cy="-152" r="7" fill="${SKIN}" stroke="${NAVY}" stroke-width="3.5"/>
        <circle cx="9" cy="-152" r="28" fill="${SKIN}" stroke="${NAVY}" stroke-width="4.5"/>
        ${hair(o.sexe)}
        <ellipse cx="14" cy="-153" rx="3.8" ry="5.2" fill="${NAVY}"/><ellipse cx="29" cy="-153" rx="3" ry="4.4" fill="${NAVY}"/>
        <circle cx="15.2" cy="-155" r="1.3" fill="#fff"/><path d="M8 -162 L20 -160 M25 -161 L34 -158" stroke="${NAVY}" stroke-width="3" stroke-linecap="round"/>
        <path d="M33 -148 L40 -142 L33 -140" stroke="${NAVY}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20 -134 Q28 -129 34 -135" stroke="${NAVY}" stroke-width="2.8" fill="none" stroke-linecap="round"/><ellipse cx="22" cy="-141" rx="5" ry="3" fill="#F08A6A" opacity=".5"/>
      </g></g></g>`;
    const kick = pose.kl && pose.kk > 0.12 ? pose.kl : null, lg = {l1: legSvg(L1, 'l1'), l2: legSvg(L2, 'l2')};
    return (kick === 'l1' ? lg.l2 : kick === 'l2' ? lg.l1 : lg.l2 + lg.l1) + armSvg(A2, sh2) + torso + (kick ? lg[kick] : '') + armSvg(A1, sh1);
  }

  /* ---------- chronologie ---------- */
  function build(data) {
    const evs = (data.events || []).filter(e => e.z && e.ts).slice().sort((a, b) => a.ts - b.ts);
    const items = []; let tr = LEAD, prev = null, skipped = 0;
    const cnt = {R: 0, B: 0};
    evs.forEach((e, i) => {
      if (prev != null) { const gap = (e.ts - prev) / 1000; if (gap > GAP_MAX) skipped += gap - GAP_MAX; tr += Math.min(gap, GAP_MAX); }
      prev = e.ts;
      const tech = techOf(e), n = cnt[e.t]++, lead = e.main ? e.main === 'g' : n % 2 === 0;
      const limb = tech.arme === 'poing' ? (lead ? 'a1' : 'a2') : (tech.coup === 'chasse' ? (e.main ? (lead ? 'l1' : 'l2') : 'l1') : (e.main ? (lead ? 'l1' : 'l2') : 'l2'));
      const sc = {R: scoreOf(evs.slice(0, i + 1), 'R'), B: scoreOf(evs.slice(0, i + 1), 'B')};
      items.push({t: tr, side: e.t, e, tech, limb, S: impactPose(tech, limb), sc, pts: ptsOf(e), dur: tech.arme === 'pied' ? 0.92 : STRIKE, imp: tech.arme === 'pied' ? 0.46 : IMPACT});
    });
    return {items, dur: (items.length ? tr : LEAD) + TAIL, skipped: Math.round(skipped), evs};
  }
  const labelOf = it => {
    const e = it.e, h = it.tech.h, hl = e.nh ? '' : it.tech.arme === 'poing' ? (h === 'haut' ? 'visage' : 'ventre') : (h === 'haut' ? 'haut' : h === 'milieu' ? 'médian' : 'bas');
    const nm = e.gen ? 'Touche' : COUPS[e.c].l;
    return `${nm}${hl ? ' ' + hl : ''}`;
  };

  /* ---------- lecteur ---------- */
  const R = {open};
  let st = null;
  function ensureDom() {
    if (document.getElementById('replayDlg')) return;
    const d = document.createElement('dialog'); d.id = 'replayDlg';
    d.innerHTML = `<div class="rp"><div class="rp-top"><div class="rp-sc red"><span class="rp-name" id="rpNR"></span><b id="rpSR">0</b></div>
      <div class="rp-mid"><div class="rp-clock" id="rpClock">0:00</div><div class="rp-cap" id="rpCap"></div></div>
      <div class="rp-sc blue"><b id="rpSB">0</b><span class="rp-name" id="rpNB"></span></div></div>
      <svg id="rpStage" viewBox="-205 -235 410 415" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Récap animé de l'assaut"></svg>
      <div class="rp-bar"><button class="btn" id="rpRestart" title="Revenir au début">⏮</button><button class="btn go" id="rpPlay">⏸</button>
        <div class="rp-seekwrap"><input type="range" id="rpSeek" min="0" max="1000" value="0"><div class="rp-ticks" id="rpTicks"></div></div>
        <div class="seg small" id="rpSpeed"><button data-sp="1" class="on">×1</button><button data-sp="1.5">×1,5</button><button data-sp="2">×2</button></div>
        <button class="btn" id="rpClose">✕ Fermer</button></div><div class="rp-note" id="rpNote"></div></div>`;
    document.body.appendChild(d);
    d.addEventListener('cancel', e => { e.preventDefault(); close(); });
    d.querySelector('#rpClose').onclick = close;
    d.querySelector('#rpPlay').onclick = () => { st.playing = !st.playing; if (st.playing && st.t >= st.tl.dur) st.t = 0; draw(); };
    d.querySelector('#rpRestart').onclick = () => { st.t = 0; st.playing = true; draw(); };
    d.querySelector('#rpSeek').addEventListener('input', e => { st.t = +e.target.value / 1000 * st.tl.dur; draw(); });
    d.querySelector('#rpSpeed').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (!b) return; st.speed = +b.dataset.sp; d.querySelectorAll('#rpSpeed button').forEach(x => x.classList.toggle('on', x === b)); });
  }
  function open(data) {
    ensureDom();
    const tl = build(data);
    st = {data, tl, t: 0, playing: true, speed: 1, last: performance.now(), raf: 0, cnt: {R: 0, B: 0}};
    const d = document.getElementById('replayDlg');
    d.querySelector('#rpNR').textContent = data.R.name; d.querySelector('#rpNB').textContent = data.B.name;
    d.querySelector('#rpTicks').innerHTML = tl.items.map(it => `<i style="left:${(it.t / tl.dur * 100).toFixed(2)}%;background:${COL[it.side]}"></i>`).join('');
    d.querySelector('#rpNote').textContent = tl.items.length ? `${tl.items.length} coup${tl.items.length > 1 ? 's' : ''} rejoué${tl.items.length > 1 ? 's' : ''} au moment où ils ont été saisis${tl.skipped ? ` · temps morts de plus de ${GAP_MAX} s raccourcis (${tl.skipped} s)` : ''}` : 'Aucun coup saisi dans cet assaut.';
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
  function poseAt(side, t) {
    const items = st.tl.items;
    let cur = null;
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.side === side && it.t - it.imp <= t && t < it.t - it.imp + it.dur) { cur = it; break; } }
    const idle = Math.sin(t * 5 + (side === 'B' ? 1.7 : 0)) * 3, shuffle = Math.sin(t * 2.3 + (side === 'B' ? 2 : 0)) * 4;
    let p;
    if (cur) { const u = (t - (cur.t - cur.imp)) / cur.dur, [k, ks] = strikeK(u, cur.imp / cur.dur, cur.limb[0] === 'l'); p = blend(cur.S, cur.limb, cur.tech.coup, k, ks); if (cur.limb[0] === 'l') { p.kl = cur.limb; p.kk = k; } p.dx += shuffle * (1 - k); p.bob += idle * (1 - k); }
    else { p = JSON.parse(JSON.stringify(GUARD)); p.bob = idle; p.dx = shuffle; p.lean += Math.sin(t * 5) * 1.2; }
    // coup reçu : recul
    const opp = side === 'R' ? 'B' : 'R';
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.side === opp && t >= it.t && t < it.t + 0.4) {
      const bump = (1 - (t - it.t) / 0.4) * (it.e.hd ? 0.3 : 1);
      p.dx -= 14 * bump; p.lean -= (it.tech.h === 'haut' ? 7 : 10) * bump; p.head -= (it.tech.h === 'haut' ? 14 : 5) * bump; break; } }
    return p;
  }
  function draw() {
    if (!st) return;
    const d = document.getElementById('replayDlg'); if (!d) return;
    const t = st.t, items = st.tl.items, data = st.data;
    const R0 = poseAt('R', t), B0 = poseAt('B', t);
    let svg = `<defs><linearGradient id="rpBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF2FF"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient></defs>
      <rect x="-1400" y="-900" width="2800" height="1100" fill="url(#rpBg)"/><rect x="-1400" y="168" width="2800" height="400" fill="#D8E6FA"/><path d="M-1400 168 L1400 168" stroke="#9DB8E5" stroke-width="3"/>
      <ellipse cx="${-HIP_X + R0.dx}" cy="176" rx="64" ry="8" fill="#13285A" opacity=".16"/><ellipse cx="${HIP_X - B0.dx}" cy="176" rx="64" ry="8" fill="#13285A" opacity=".16"/>`;
    svg += `<g transform="translate(${-HIP_X} 0)">${boxer(R0, {corner: 'R', sexe: data.R.sexe})}</g>`;
    svg += `<g transform="translate(${HIP_X} 0) scale(-1 1)">${boxer(B0, {corner: 'B', sexe: data.B.sexe})}</g>`;
    // impacts
    let cap = '', last = null;
    items.forEach(it => {
      const dt = t - it.t;
      if (dt >= 0) last = it;
      if (dt >= 0 && dt < 0.7) {
        const k = dt / 0.7, side = it.side;
        const x = side === 'R' ? HIP_X - 14 : -HIP_X + 14, y = it.tech.ty, r = 14 + 30 * Math.sqrt(k), col = it.e.hd ? '#9AA3B5' : it.e.trop ? '#E65100' : COL[side];
        let star = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * .45 : r; star += `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)} `; }
        const tag = it.e.hd ? 'hors distance' : it.e.trop ? 'trop fort' : (it.pts > 0 ? '+' + it.pts : '0');
        svg += `<g opacity="${(1 - k * k).toFixed(2)}"><polygon points="${star}" fill="${col}" stroke="#fff" stroke-width="3"/>
          <text x="${x}" y="${(y - r - 6).toFixed(1)}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-style="italic" font-size="26" stroke="${NAVY}" stroke-width="5" paint-order="stroke" fill="#fff">${esc(labelOf(it))} ${tag}</text></g>`;
      }
    });
    d.querySelector('#rpStage').innerHTML = svg;
    const sc = last ? last.sc : {R: 0, B: 0};
    d.querySelector('#rpSR').textContent = sc.R; d.querySelector('#rpSB').textContent = sc.B;
    d.querySelector('#rpClock').textContent = fmt(Math.max(0, t - LEAD));
    d.querySelector('#rpCap').innerHTML = last && t - last.t < 2.2 ? `<span class="${last.side === 'R' ? 'wR' : 'wB'}">${last.side === 'R' ? 'Rouge' : 'Bleu'}</span> · ${esc(labelOf(last))}${last.e.hd ? ' · hors distance' : last.e.trop ? ' · trop fort' : ''} <b>${last.pts > 0 ? '+' + last.pts : last.pts}</b>` : '&nbsp;';
    d.querySelector('#rpSeek').value = Math.round(t / st.tl.dur * 1000);
    d.querySelector('#rpPlay').textContent = st.playing ? '⏸' : '▶';
  }

  R.state = () => st;
  R.fromLive = l => ({R: {name: l.R.name, sexe: l.R.sexe}, B: {name: l.B.name, sexe: l.B.sexe}, events: l.events});
  R.fromAssault = a => ({R: {name: a.names?.R || nameOf(a.red), sexe: stu(a.red)?.sexe || 'G'}, B: {name: a.names?.B || nameOf(a.blue), sexe: stu(a.blue)?.sexe || 'F'}, events: a.events || []});
  global.Replay = R;
})(window);
