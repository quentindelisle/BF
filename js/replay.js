/* Observ'BF — récap animé de l'assaut : deux boxeurs (vos dessins, planches de poses) rejouent les coups saisis, au bon moment.
   Animation « pose à pose » : chaque coup utilise la pose dessinée correspondante (direct, crochet, chassé et fouetté bas / médian / haut),
   enchaînée avec la garde (et le genou levé pour les coups de pied), fondus croisés, fente vers l'adversaire, recul de celui qui encaisse.
   Images : img/poses/ (découpées des planches), le boxeur bleu est le miroir du rouge avec des gants bleus. */
(function (global) {
  'use strict';
  const COL = {R: '#E53935', B: '#1E6FE0'}, NAVY = '#0A1F4D';
  const GAP_MAX = 5, LEAD = 1.2, TAIL = 1.8;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const ramp = (t, a, b) => smooth((t - a) / (b - a));          // 0 avant a, 1 après b

  /* ---------- poses (images) ---------- */
  let META = null, IMGS = {}, state = 'idle';                   // idle | loading | ready | error
  function loadPoses(cb) {
    if (state === 'ready') return cb && cb();
    if (state === 'loading') { (loadPoses.q = loadPoses.q || []).push(cb); return; }
    state = 'loading'; loadPoses.q = [cb];
    fetch('img/poses/poses.json').then(r => r.json()).then(meta => {
      META = meta; const names = Object.keys(meta); let n = 0; const total = names.length * 2;
      names.forEach(name => ['r', 'b'].forEach(c => { const im = new Image(); im.onload = im.onerror = () => { if (++n === total) { state = 'ready'; (loadPoses.q || []).forEach(f => f && f()); loadPoses.q = []; } }; im.src = `img/poses/${name}_${c}.webp`; IMGS[name + '_' + c] = im; }));
    }).catch(() => { state = 'error'; });
  }

  /* ---------- technique d'un événement → pose dessinée ---------- */
  function techOf(e) {
    const arme = e.gen ? 'poing' : e.w, coup = e.gen ? 'direct' : e.c;
    let h = e.h;
    if (!h) h = e.z === 'tete' ? 'haut' : e.z === 'jambes' ? 'bas' : e.z === 'flancs' ? 'milieu' : e.z === 'ventre' ? 'bas' : 'milieu';
    if (arme === 'poing' && h === 'milieu') h = 'bas';
    let sprite;
    if (arme === 'poing') sprite = coup === 'crochet' ? (h === 'haut' ? 'p_hook1' : 'p_hook2') : (h === 'haut' ? 'p_direct_haut' : 'p_lunge1');
    else sprite = (coup === 'chasse' ? 'cha_' : 'fou_') + (h === 'haut' ? 'haut' : h === 'milieu' ? (coup === 'chasse' ? 'mil' : 'med') : 'bas');
    return {arme, coup, h, sprite, kick: arme === 'pied'};
  }
  const labelOf = it => {
    const e = it.e, h = it.tech.h, hl = e.nh ? '' : it.tech.arme === 'poing' ? (h === 'haut' ? 'visage' : 'ventre') : (h === 'haut' ? 'haut' : h === 'milieu' ? 'médian' : 'bas');
    return `${e.gen ? 'Touche' : COUPS[e.c].l}${hl ? ' ' + hl : ''}`;
  };

  /* ---------- chronologie ---------- */
  function build(data) {
    const evs = (data.events || []).filter(e => e.z && e.ts).slice().sort((a, b) => a.ts - b.ts);
    const items = []; let tr = LEAD, prev = null, skipped = 0;
    evs.forEach((e, i) => {
      if (prev != null) { const gap = (e.ts - prev) / 1000; if (gap > GAP_MAX) skipped += gap - GAP_MAX; tr += Math.min(gap, GAP_MAX); }
      prev = e.ts;
      const sc = {R: scoreOf(evs.slice(0, i + 1), 'R'), B: scoreOf(evs.slice(0, i + 1), 'B')};
      items.push({t: tr, side: e.t, e, tech: techOf(e), sc, pts: ptsOf(e)});
    });
    return {items, dur: (items.length ? tr : LEAD) + TAIL, skipped: Math.round(skipped), evs, seq: {R: seqOf('R', items), B: seqOf('B', items)}};
  }
  /* Séquence des changements de pose d'un boxeur : garde → (genou levé) → coup → (genou levé) → garde.
     Si le coup suivant arrive avant le retour en garde, on enchaîne directement : moins de changements = animation plus fluide. */
  function seqOf(side, items) {
    let seq = [{t: -99, pose: 'guard34'}];
    items.filter(it => it.side === side).forEach(it => {
      const k = it.tech.kick, ev = k ? [[it.t - 0.34, 'knee'], [it.t - 0.12, it.tech.sprite], [it.t + 0.22, 'knee'], [it.t + 0.38, 'guard34']] : [[it.t - 0.10, it.tech.sprite], [it.t + 0.24, 'guard34']];
      seq = seq.filter(s => s.t < ev[0][0]);
      while (seq.length > 1 && (seq[seq.length - 1].pose === 'guard34' || seq[seq.length - 1].pose === 'knee') && ev[0][0] - seq[seq.length - 1].t < 0.3) seq.pop();   // pas de retour en garde éclair entre deux coups rapprochés
      ev.forEach(([t, pose]) => { if (seq[seq.length - 1].pose !== pose) seq.push({t, pose}); });
    });
    return seq;
  }
  const XF = 0.09;                                              // durée du fondu enchaîné entre deux poses
  function layersAt(seq, t) {
    let i = 0; while (i + 1 < seq.length && seq[i + 1].t - XF / 2 <= t) i++;
    const cur = seq[i], prev = seq[i - 1];
    const k = prev ? smooth((t - (cur.t - XF / 2)) / XF) : 1;
    return k >= 1 ? [[cur.pose, 1]] : [[prev.pose, 1 - k], [cur.pose, k]];
  }

  /* ---------- scène ---------- */
  const D = 192;                                                // écart entre les deux boxeurs (unités du dessin : garde = 300) : un coup n'est valable que bras / jambe tendus
  function layout(W, H) { const u = H * 0.72 / 300; return {u, ground: H * 0.9, xR: W / 2 - D * u / 2, xB: W / 2 + D * u / 2}; }
  /* enveloppe d'un coup (temps relatif à l'impact) : A = engagement dans le coup, S = part de la pose finale (le reste = genou levé) */
  function envelope(tech, dt) {
    if (tech.kick) return {A: ramp(dt, -0.36, -0.20) * (1 - ramp(dt, 0.30, 0.44)), S: ramp(dt, -0.20, -0.06) * (1 - ramp(dt, 0.18, 0.30))};
    const A = ramp(dt, -0.14, -0.04) * (1 - ramp(dt, 0.14, 0.34)); return {A, S: 1};
  }
  function lungeOf(it) {                                         // avance du boxeur pour que gant / pied atteigne l'adversaire
    const m = META[it.tech.sprite]; if (!m) return 0;
    return clamp((D - 24) - (m.cx - m.ax), -14, 72);
  }
  function drawSprite(ctx, name, corner, x, ground, u, alpha, f, tilt, sy) {
    const m = META[name], im = IMGS[name + '_' + (corner === 'R' ? 'r' : 'b')]; if (!m || !im || !im.complete || alpha <= 0.004) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, ground); if (tilt) ctx.rotate(tilt * f); ctx.scale(f * u, u * (sy || 1)); ctx.drawImage(im, -m.ax, -m.h, m.w, m.h); ctx.restore();
  }
  function boxerAt(side, t, items, st) {
    const f = side === 'R' ? 1 : -1, opp = side === 'R' ? 'B' : 'R', ph = side === 'B' ? 0.5 : 0;
    // coup en cours
    let cur = null, env = {A: 0, S: 0}, dtc = 0;
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.side === side && t - it.t > -0.4 && t - it.t < 0.5) { const e = envelope(it.tech, t - it.t); if (e.A > 0.001 || !cur) { cur = it; env = e; dtc = t - it.t; if (e.A > 0.001) break; } } }
    if (cur && env.A <= 0.001) cur = null;
    let dx = 0, tilt = 0, dip = 0;
    if (cur) { const lg = lungeOf(cur), k = cur.tech.kick ? 0.4 * env.A * (1 - env.S) + env.S * env.A : env.A; dx = lg * k; dip = 4 * env.A; }
    // coup reçu : recul et inclinaison
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.side === opp && t >= it.t && t < it.t + 0.42) { const b = (1 - (t - it.t) / 0.42) * (it.e.hd ? 0.35 : 1); dx -= 16 * b; tilt -= 0.07 * b; break; } }
    // poses : séquence précalculée, avec un souffle léger sur place (la garde ne change plus de dessin)
    const layers = layersAt(st.tl.seq[side], t), breath = Math.sin(t * 4.6 + ph * 6);
    return {f, dx, tilt, dip: dip + breath * 1.6, sy: 1 + 0.006 * breath, layers, cur, env, A: env.A};
  }
  function draw2d(ctx, W, H, t, st) {
    const L = layout(W, H), items = st.tl.items, data = st.data;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#EAF2FF'); g.addColorStop(0.62, '#FFFFFF'); g.addColorStop(0.62, '#DCE8FA'); g.addColorStop(1, '#C9DBF5'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#A9C0E8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, L.ground - 2); ctx.lineTo(W, L.ground - 2); ctx.stroke();
    if (state !== 'ready') { ctx.fillStyle = '#5C6B8C'; ctx.font = '700 18px "Barlow", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(state === 'error' ? 'Images du récap indisponibles' : 'Chargement des poses…', W / 2, H / 2); return; }
    const P = {R: boxerAt('R', t, items, st), B: boxerAt('B', t, items, st)}, X = {R: L.xR, B: L.xB};
    ['R', 'B'].forEach(s => { const x = X[s] + P[s].f * P[s].dx * L.u; ctx.fillStyle = 'rgba(19,40,90,.16)'; ctx.beginPath(); ctx.ellipse(x, L.ground + 2, 70 * L.u, 9 * L.u, 0, 0, 7); ctx.fill(); });
    const order = P.R.A >= P.B.A ? ['B', 'R'] : ['R', 'B'];
    order.forEach(s => { const b = P[s], x = X[s] + b.f * b.dx * L.u; b.layers.forEach(([name, w]) => drawSprite(ctx, name, s, x, L.ground + b.dip * L.u * 0.2, L.u, w, b.f, b.tilt, b.sy)); });
    // impacts : étoile au point de contact de la pose
    items.forEach(it => {
      const dt = t - it.t; if (dt < 0 || dt >= 0.7) return;
      const m = META[it.tech.sprite]; if (!m) return;
      const f = it.side === 'R' ? 1 : -1, x = (it.side === 'R' ? L.xR : L.xB) + f * (lungeOf(it) + (m.cx - m.ax)) * L.u, y = L.ground - (m.h - m.cy) * L.u;
      const k = dt / 0.7, r = (16 + 30 * Math.sqrt(k)) * (L.u * 1.4), col = it.e.hd ? '#9AA3B5' : it.e.trop ? '#E65100' : COL[it.side];
      ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * .45 : r; ctx[i ? 'lineTo' : 'moveTo'](x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = `italic 800 ${Math.round(Math.max(18, H * 0.06))}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = NAVY; ctx.fillStyle = '#fff';
      const txt = `${labelOf(it)} ${it.e.hd ? 'hors distance' : it.e.trop ? 'trop fort' : (it.pts > 0 ? '+' + it.pts : '0')}`; ctx.strokeText(txt, x, y - r - 8); ctx.fillText(txt, x, y - r - 8); ctx.restore();
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
      <canvas id="rpStage" role="img" aria-label="Récap animé de l'assaut"></canvas>
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
    ensureDom(); loadPoses();
    const tl = build(data);
    st = {data, tl, t: 0, playing: true, speed: 1, last: performance.now(), raf: 0};
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
    if (st.playing && state === 'ready') { st.t += dt * st.speed; if (st.t >= st.tl.dur) { st.t = st.tl.dur; st.playing = false; } }
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
    draw2d(ctx, r.width, r.height, t, st);
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
