/* Observ'BF — échanges par QR codes (repris de l'appli Biathlon N'EPS : base45 + compression, séries de QR, lecteur caméra) */
(function (global) {
  'use strict';
  const B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  function b45enc(u8) { let s = '';
    for (let i = 0; i < u8.length; i += 2) {
      if (i + 1 < u8.length) { let x = u8[i] * 256 + u8[i + 1]; const c = x % 45; x = (x - c) / 45; const d = x % 45; const e = (x - d) / 45; s += B45[c] + B45[d] + B45[e]; }
      else { const x = u8[i], c = x % 45, d = (x - c) / 45; s += B45[c] + B45[d]; }
    } return s; }
  function b45dec(s) { const out = [];
    for (let i = 0; i < s.length; i += 3) {
      const c = B45.indexOf(s[i]), d = B45.indexOf(s[i + 1]);
      if (i + 2 < s.length) { const x = c + d * 45 + B45.indexOf(s[i + 2]) * 2025; out.push(x >> 8, x & 255); }
      else out.push(c + d * 45);
    } return new Uint8Array(out); }
  async function streamBytes(u8, ts) { const st = new Blob([u8]).stream().pipeThrough(ts); return new Uint8Array(await new Response(st).arrayBuffer()); }
  async function encode(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (global.CompressionStream) { try { return 'Z' + b45enc(await streamBytes(raw, new CompressionStream('deflate-raw'))); } catch (e) {} }
    return 'J' + b45enc(raw);
  }
  async function decode(str) {
    let raw = b45dec(str.slice(1));
    if (str[0] === 'Z') { if (!global.DecompressionStream) throw new Error('Appareil trop ancien pour décompresser'); raw = await streamBytes(raw, new DecompressionStream('deflate-raw')); }
    return JSON.parse(new TextDecoder().decode(raw));
  }
  const rid = n => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  function chunk(payload, type, max) {
    const id = rid(3), n = Math.max(1, Math.ceil(payload.length / max)), per = Math.ceil(payload.length / n), parts = [];
    for (let i = 0; i < n; i++) parts.push(`BF:${type}:${id}:${i + 1}:${n}:` + payload.slice(i * per, (i + 1) * per));
    return parts;
  }
  function parsePart(txt) {
    if (!txt || !txt.startsWith('BF:')) return null;
    const f = txt.split(':'); if (f.length < 6) return null;
    return {type: f[1], id: f[2], i: +f[3], n: +f[4], data: f.slice(5).join(':')};
  }
  function dataURL(text, size = 10) { const qr = qrcode(0, 'L'); qr.addData(text, 'Alphanumeric'); qr.make(); return qr.createDataURL(size, 40); }
  function urlQR(url, size = 6) { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); return qr.createDataURL(size, 24); }

  /* Série de QR qui défile toute seule */
  let qrTimer = null;
  function showSeries(parts, container, title) {
    let i = 0, auto = parts.length > 1;
    const imgs = parts.map(p => dataURL(p));
    const draw = () => {
      container.innerHTML = `<div class="qr-box">${title ? `<h2>${title}</h2>` : ''}
        <img src="${imgs[i]}" alt="QR code ${i + 1}/${parts.length}">
        <div class="qr-part">${parts.length > 1 ? `QR ${i + 1} / ${parts.length}` : 'QR unique'}</div>
        ${parts.length > 1 ? `<div class="qr-nums">${parts.map((_, k) => `<button class="${k === i ? 'on' : ''}" data-q="${k}">${k + 1}</button>`).join('')}</div>
          <div class="btn-row center"><button class="btn" data-q="prev">←</button><button class="btn ${auto ? 'orange' : ''}" data-q="auto">${auto ? '⏸ Pause' : '▶ Défilement auto'}</button><button class="btn" data-q="next">→</button></div>` : ''}</div>`;
      container.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
        const q = b.dataset.q;
        if (q === 'auto') auto = !auto; else if (q === 'prev') { auto = false; i = (i - 1 + parts.length) % parts.length; }
        else if (q === 'next') { auto = false; i = (i + 1) % parts.length; } else { auto = false; i = +q; }
        draw();
      });
    };
    clearInterval(qrTimer);
    qrTimer = setInterval(() => { if (!document.body.contains(container)) return clearInterval(qrTimer); if (auto) { i = (i + 1) % parts.length; draw(); } }, 1000);
    draw();
  }

  /* Lecteur : détecteur natif → ZXing (WebAssembly) → jsQR ; secours « photo du QR » */
  let scan = null, nativeDetector, camIdx = 0, camId = null, zxReady = false;
  try {
    if (global.ZXingWASM) ZXingWASM.prepareZXingModule({overrides: {locateFile: (path, prefix) => path.endsWith('.wasm') ? new URL('lib/' + path, document.baseURI).href : prefix + path}, fireImmediately: true})
      .then(() => { zxReady = true; }).catch(() => {});
  } catch (e) {}
  function stop() { if (!scan) return; scan.stopped = true; clearTimeout(scan.timer); if (scan.stream) scan.stream.getTracks().forEach(t => t.stop()); scan = null; }
  async function getNative() {
    if (nativeDetector !== undefined) return nativeDetector;
    nativeDetector = null;
    try { if ('BarcodeDetector' in global && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) nativeDetector = new BarcodeDetector({formats: ['qr_code']}); } catch (e) {}
    return nativeDetector;
  }
  const SCALES = [0.4, 0.3, 0.5, 0.24, 0.62, 0.35, 0.8, 0.45];
  function grabGray(ctx, cv, src, sx, sy, sw, sh, maxSide) {
    const k = Math.min(1, maxSide / Math.max(sw, sh)), w = Math.round(sw * k), h = Math.round(sh * k);
    cv.width = w; cv.height = h; ctx.imageSmoothingEnabled = true; ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11;
    return {g, w, h};
  }
  function boxDown(G, f) {
    const {g, w, h} = G; if (f >= 0.999) return G;
    const nw = Math.max(1, Math.round(w * f)), nh = Math.max(1, Math.round(h * f)), o = new Float32Array(nw * nh), c = new Float32Array(nw * nh);
    for (let y = 0; y < h; y++) { const row = Math.min(nh - 1, (y * f) | 0) * nw; for (let x = 0; x < w; x++) { const i = row + Math.min(nw - 1, (x * f) | 0); o[i] += g[y * w + x]; c[i]++; } }
    for (let i = 0; i < o.length; i++) o[i] /= c[i] || 1;
    return {g: o, w: nw, h: nh};
  }
  function jsqrGray(G, both) {
    if (!global.jsQR) return null;
    const {g, w, h} = G, d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) { d[j] = d[j + 1] = d[j + 2] = g[i]; d[j + 3] = 255; }
    const c = jsQR(d, w, h, {inversionAttempts: both ? 'attemptBoth' : 'dontInvert'}); return c && c.data ? c.data : null;
  }
  async function zxRead(img, hard = true) {
    if (!zxReady) return null;
    try { const r = await ZXingWASM.readBarcodes(img, {formats: ['QRCode'], tryHarder: hard, maxNumberOfSymbols: 1}); const ok = r.find(x => x.isValid && x.text); return ok ? ok.text : null; } catch (e) { return null; }
  }
  async function decodeImage(src, sw, sh, cv, ctx, frame, all = false) {
    const det = await getNative();
    if (det) { try { const r = await det.detect(src); if (r && r.length) return r.map(x => x.rawValue); } catch (e) {} }
    const side = Math.min(sw, sh) * 0.92, sx = (sw - side) / 2, sy = (sh - side) / 2;
    if (zxReady) {
      const k = Math.min(1, (all ? 1000 : 800) / side), w = Math.round(side * k);
      cv.width = w; cv.height = w; ctx.drawImage(src, sx, sy, side, side, 0, 0, w, w);
      let t = await zxRead(ctx.getImageData(0, 0, w, w), all || frame % 3 !== 1); if (t) return [t];
      if (all || frame % 3 === 2) {
        const k2 = Math.min(1, 1280 / Math.max(sw, sh)), w2 = Math.round(sw * k2), h2 = Math.round(sh * k2);
        cv.width = w2; cv.height = h2; ctx.drawImage(src, 0, 0, sw, sh, 0, 0, w2, h2);
        t = await zxRead(ctx.getImageData(0, 0, w2, h2)); if (t) return [t];
      }
      if (!all && frame % 2 === 0) return [];
    }
    const G = grabGray(ctx, cv, src, sx, sy, side, side, 1100);
    const scales = all ? SCALES : [SCALES[frame % SCALES.length], SCALES[(frame + 3) % SCALES.length]];
    for (const f of scales) { const t = jsqrGray(boxDown(G, f * side / G.w), all || frame % 5 === 4); if (t) return [t]; }
    if (all || frame % 4 === 3) { const F = grabGray(ctx, cv, src, 0, 0, sw, sh, 1100); for (const f of (all ? [0.35, 0.5, 0.7] : [0.5])) { const t = jsqrGray(boxDown(F, f), all); if (t) return [t]; } }
    return [];
  }
  /* expect : types acceptés ('L' leçon, 'R' résultats) · onDone(objet) → 'continue' pour garder la caméra allumée */
  async function start(container, expect, onDone, wrongMsg) {
    stop();
    container.innerHTML = `<div class="scan-wrap"><video playsinline webkit-playsinline muted autoplay></video><div class="scan-frame"></div></div>
      <div class="scan-info"><div class="scan-parts"></div><p class="scan-msg">Démarrage de la caméra…</p>
      <div class="btn-row center"><button class="btn" data-cam>🔄 Caméra</button><label class="btn orange">📷 Photo du QR<input type="file" accept="image/*" capture="environment" hidden class="scan-photo"></label></div></div>`;
    const video = container.querySelector('video'), msg = container.querySelector('.scan-msg'), partsEl = container.querySelector('.scan-parts');
    const me = scan = {stopped: false, parts: {}, id: null, n: 0, frame: 0};
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', {willReadFrequently: true});
    const showParts = () => { const got = Object.keys(me.parts).length, pc = me.n ? Math.round(got / me.n * 100) : 0;
      partsEl.innerHTML = me.n > 1 ? `<div class="scan-prog"><div class="scan-bar" style="width:${pc}%"></div><span>${pc} %</span></div>` : ''; };
    let finished = false;
    const handle = async texts => {
      for (const txt of texts) {
        const pt = parsePart(txt);
        if (!pt) { msg.textContent = 'QR non reconnu : ce n\'est pas un QR Observ\'BF.'; continue; }
        if (expect.length && !expect.includes(pt.type)) { msg.textContent = wrongMsg || 'Ce QR n\'est pas destiné à cet écran.'; continue; }
        if (pt.id === me.doneId) continue;
        if (me.id !== pt.id) { me.id = pt.id; me.parts = {}; me.n = pt.n; }
        if (!me.parts[pt.i]) { me.parts[pt.i] = pt.data; try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} }
        const got = Object.keys(me.parts).length; showParts();
        msg.textContent = me.n > 1 ? (got < me.n ? `Import : ${Math.round(got / me.n * 100)} % · laissez défiler les QR devant la caméra` : 'Import : 100 %') : 'QR reçu !';
        if (got === me.n && !finished) {
          finished = true;
          const payload = Array.from({length: me.n}, (_, k) => me.parts[k + 1]).join('');
          me.doneId = me.id; me.id = null; me.parts = {};
          let r; try { r = await onDone(await decode(payload)); } catch (e) { msg.textContent = '⚠️ ' + e.message; r = 'continue'; }
          if (r === 'continue' && scan === me && !me.stopped) { finished = false; showParts(); msg.textContent = '✓ Reçu · QR suivant ?'; me.timer = setTimeout(tick, 400); }
          else if (scan === me) stop();
          return;
        }
      }
    };
    container.querySelector('.scan-photo').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      msg.textContent = 'Lecture de la photo…';
      try { const bmp = await createImageBitmap(f), pcv = document.createElement('canvas'), pctx = pcv.getContext('2d', {willReadFrequently: true});
        const r = await decodeImage(bmp, bmp.width, bmp.height, pcv, pctx, 0, true);
        if (r.length) await handle(r); else msg.textContent = '⚠️ QR non trouvé : recommencez en cadrant le QR bien net, en entier.';
      } catch (err) { msg.textContent = '⚠️ Photo illisible'; }
    });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = '⚠️ Caméra indisponible : utilisez 📷 Photo du QR.'; return; }
    container.querySelector('[data-cam]').onclick = async () => {
      try { const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
        if (cams.length < 2) return; camIdx = (camIdx + 1) % cams.length; camId = cams[camIdx].deviceId; start(container, expect, onDone, wrongMsg); } catch (e) {}
    };
    const attempts = camId ? [{deviceId: {exact: camId}}] : [{facingMode: 'environment'}, {facingMode: {ideal: 'environment'}, width: {ideal: 1280}, height: {ideal: 720}}, true];
    let lastErr = null;
    for (const vc of attempts) { try { me.stream = await navigator.mediaDevices.getUserMedia({video: vc, audio: false}); break; } catch (e) { lastErr = e; } }
    if (!me.stream) { msg.textContent = lastErr && lastErr.name === 'NotAllowedError' ? '⚠️ Caméra refusée : autorisez la caméra pour ce site, ou utilisez 📷 Photo du QR.' : '⚠️ Caméra impossible à ouvrir : utilisez 📷 Photo du QR.'; return; }
    if (me.stopped) { me.stream.getTracks().forEach(t => t.stop()); return; }
    const track = me.stream.getVideoTracks()[0];
    try { await track.applyConstraints({advanced: [{focusMode: 'continuous'}]}); } catch (e) {}
    video.muted = true; video.srcObject = me.stream;
    const playIt = () => video.play().catch(() => {}); video.onloadedmetadata = playIt; playIt();
    msg.textContent = 'Visez le QR code (30 à 40 cm, écran à pleine luminosité)…';
    const t0 = Date.now();
    const tick = async () => {
      if (me.stopped || finished) return;
      if (video.readyState >= 2 && video.videoWidth) {
        me.frame++;
        try { const r = await decodeImage(video, video.videoWidth, video.videoHeight, cv, ctx, me.frame); if (r.length) await handle(r); } catch (e) {}
      } else if (Date.now() - t0 > 4000 && me.frame === 0) { msg.textContent = '⚠️ Pas d\'image : touchez 🔄 Caméra ou utilisez 📷 Photo du QR.'; playIt(); }
      if (!me.stopped && !finished) me.timer = setTimeout(tick, 60);
    };
    tick();
  }

  global.BFQR = {encode, decode, chunk, showSeries, start, stop, urlQR};
})(window);
