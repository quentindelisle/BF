/*!
 * BoxeSaisie — module de saisie "à l'aveugle" des touches en Boxe Française (EPS)
 * Aucune dépendance. Usage :
 *
 *   const saisie = BoxeSaisie.create(document.getElementById('zone'), {
 *     onHit: (touche) => console.log(touche)
 *   });
 *
 * Grammaire des gestes (sur l'écran, le personnage frappé est au centre) :
 *   - Côté de l'écran où le geste COMMENCE : gauche = ROUGE, droite = BLEU
 *   - Moitié de l'écran où le geste COMMENCE : haut = POING, bas = PIED
 *   - Trajectoire droite  : poing → direct   | pied → chassé
 *   - Trajectoire courbe  : poing → crochet  | pied → fouetté
 *   - Nombre de doigts    : 1 = bas, 2 = milieu, 3 = haut
 *   - Tap à 4 doigts      : annule la dernière touche du côté concerné
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoxeSaisie = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var DEFAULTS = {
    colors: { rouge: '#e53935', bleu: '#2f7df6' },
    labels: { rouge: 'Rouge', bleu: 'Bleu' },
    sides: { left: 'rouge', right: 'bleu' }, // quel observateur est à gauche / à droite
    splitX: 0.5,          // fraction de largeur : séparation gauche / droite
    splitY: 0.5,          // fraction de hauteur : au-dessus = poings, en dessous = pieds
    joinRadius: 220,      // px : un doigt posé à moins de cette distance rejoint le geste en cours
    landingMs: 250,       // ms : durée pendant laquelle les doigts d'une même main "atterrissent"
    minTravel: 40,        // px : en dessous, le geste est un simple tap (trajectoire inconnue)
    curveThreshold: 0.09, // écart max à la corde / longueur du trait : au-dessus = courbe
    curveMetric: 'path',
    tapTrajectory: 'droite', // trajectoire retenue pour un tap (la touche est marquée "incertaine")
    undoFingers: 4,       // tap avec ce nombre de doigts (ou plus) = annuler
    feedback: { sound: true, vibrate: true },
    showTrail: true,
    showControls: true,   // barre du haut : aide, bilan, réinitialiser
    onHit: null,          // (touche) => void
    onUndo: null,         // (touche annulée) => void
    onChange: null        // (touches[]) => void
  };

  var TECHNIQUES = {
    poing: { droite: 'direct', courbe: 'crochet' },
    pied: { droite: 'chassé', courbe: 'fouetté' }
  };
  var HAUTEURS = ['bas', 'milieu', 'haut']; // 1, 2, 3 doigts
  var CIBLES = {
    poing: { haut: 'visage', milieu: 'torse', bas: 'ventre' },
    pied: { haut: 'visage', milieu: 'flancs', bas: 'jambes' }
  };
  var ZONES = [
    { id: 'visage', label: 'Visage' },
    { id: 'torse', label: 'Épaules / torse' },
    { id: 'ventre', label: 'Ventre' },
    { id: 'flancs', label: 'Flancs' },
    { id: 'jambes', label: 'Jambes' }
  ];

  /* ------------------------------------------------------------------ utils */
  function merge(base, extra) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in extra) {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object') {
        out[k] = merge(base[k], extra[k]);
      } else out[k] = extra[k];
    }
    return out;
  }
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function s(tag, attrs) {
    var e = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var css = [
      '.bx-root{position:relative;display:flex;flex-direction:column;width:100%;height:100%;background:#0e1319;color:#e8eef5;',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;user-select:none;-webkit-user-select:none;overflow:hidden}',
      '.bx-bar{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:8px 12px;background:#161d27;border-bottom:1px solid #263243}',
      '.bx-block{display:flex;align-items:center;gap:10px;flex:1;min-width:0}',
      '.bx-block.bx-right{flex-direction:row-reverse;text-align:right}',
      '.bx-dot{width:16px;height:16px;border-radius:50%;flex:0 0 auto}',
      '.bx-name{font-weight:700;font-size:18px}',
      '.bx-total{font-weight:800;font-size:30px;line-height:1;min-width:1.4em;text-align:center}',
      '.bx-last{font-size:13px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}',
      '.bx-btn{appearance:none;border:1px solid #33445a;background:#1f2a38;color:#e8eef5;border-radius:10px;padding:10px 14px;font-size:16px;',
      'cursor:pointer;min-height:44px;font-family:inherit}',
      '.bx-btn:active{background:#2b3a4f}',
      '.bx-center{display:flex;gap:8px;flex:0 0 auto}',
      '.bx-stage{position:relative;flex:1;min-height:0;touch-action:none;-webkit-touch-callout:none;overflow:hidden}',
      '.bx-tint{position:absolute;top:0;bottom:0;width:50%;pointer-events:none}',
      '.bx-split{position:absolute;left:0;right:0;border-top:2px dashed rgba(255,255,255,.18);pointer-events:none}',
      '.bx-tag{position:absolute;font-size:13px;letter-spacing:.18em;font-weight:700;opacity:.45;pointer-events:none}',
      '.bx-figure,.bx-trails{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
      '.bx-overlay{position:absolute;inset:0;background:rgba(8,12,17,.94);z-index:5;overflow:auto;padding:20px;box-sizing:border-box}',
      '.bx-overlay h2{margin:0 0 12px;font-size:22px}',
      '.bx-overlay h3{margin:18px 0 6px;font-size:16px;opacity:.8}',
      '.bx-overlay p,.bx-overlay li{font-size:16px;line-height:1.5}',
      '.bx-overlay table{border-collapse:collapse;min-width:320px}',
      '.bx-overlay th,.bx-overlay td{border-bottom:1px solid #2b394b;padding:6px 14px;text-align:center;font-size:16px}',
      '.bx-overlay th:first-child,.bx-overlay td:first-child{text-align:left}',
      '.bx-overlay .bx-row{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}',
      '.bx-trail-fade{transition:opacity .35s;opacity:0}'
    ].join('');
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ moteur de gestes (sans interface) */
  /* createEngine(element, options) : reconnaît les gestes à 1/2/3 doigts sur un élément.
     Rappels : onTrail({type:'start'|'move', id, side, cx, cy}) pendant le geste,
               onGesture({kind:'hit'|'undo'|'cancel', side, arme, trajectoire, fingers, flags, metrics, ids, bestId, cx, cy}) à la fin. */
  var ENGINE_DEFAULTS = {
    sides: { left: 'rouge', right: 'bleu' },
    splitX: 0.5, splitY: 0.5, // splitY : nombre ou fonction () => fraction de la hauteur
    joinRadius: 220, landingMs: 250, minTravel: 40,
    curveThreshold: 0.09,   // nombre, ou fonction () => nombre
    curveMetric: 'path',    // 'path' : écart max / longueur du trait · 'chord' : écart max / corde (mesure de l'appli Observ'BF)
    tapTrajectory: 'droite',
    undoFingers: 4,
    ignore: 'button, a, input, select, textarea, .bx-overlay',
    classify: null,         // (p:{x,y,w,h}) => {side, key, arme, hand} : classement personnalisé du point de départ (boutons en bas d'écran)
    doubleTapMs: 0,         // > 0 : un double tap (deux touchers courts successifs) émet kind:'chain' ; un tap simple n'est alors plus une touche
    enabled: null,          // () => bool : false = le moteur ignore les touchers
    onTrail: null, onGesture: null
  };

  function createEngine(el, opts) {
    var o = merge(ENGINE_DEFAULTS, opts || {});
    var gestures = {};    // côté -> geste en cours
    var pointerMap = {};  // pointerId -> geste
    var heldDigit = 1;    // simulation des doigts à la souris (touches 1..4)
    var lastTap = {};     // clé -> instant du dernier tap (double tap)

    function rel(e) {
      var r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height, cx: e.clientX, cy: e.clientY };
    }
    function sideAt(p) { return p.x < p.w * o.splitX ? o.sides.left : o.sides.right; }
    function startInfo(p) {
      if (o.classify) { var c = o.classify(p) || {}; var sd = c.side || sideAt(p); return { side: sd, key: c.key || sd, arme: c.arme || 'poing', hand: c.hand || null }; }
      var s0 = sideAt(p);
      return { side: s0, key: s0, arme: p.y < p.h * (typeof o.splitY === 'function' ? o.splitY() : o.splitY) ? 'poing' : 'pied', hand: null };
    }
    function downPointers(g) {
      var out = [];
      for (var id in g.pointers) if (g.pointers[id].down) out.push(g.pointers[id]);
      return out;
    }
    function centroid(g) {
      var d = downPointers(g), x = 0, y = 0;
      if (!d.length) return null;
      d.forEach(function (q) { var p = q.path[q.path.length - 1]; x += p.x; y += p.y; });
      return { x: x / d.length, y: y / d.length };
    }
    function threshold() { return typeof o.curveThreshold === 'function' ? o.curveThreshold() : o.curveThreshold; }
    function emitTrail(type, id, g, p) { if (o.onTrail) o.onTrail({ type: type, id: id, side: g.side, key: g.key, cx: p.cx, cy: p.cy }); }

    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (o.enabled && !o.enabled()) return;
      if (o.ignore && e.target.closest && e.target.closest(o.ignore)) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      var p = rel(e), now = performance.now(), best = null, bestD = Infinity, info = startInfo(p);
      Object.keys(gestures).forEach(function (k) {
        var g = gestures[k]; if (!g) return;
        var c = centroid(g); if (!c) return;
        var d = dist(p, c);
        if (d <= o.joinRadius && (now - g.t0 <= o.landingMs || info.key === g.key) && d < bestD) { best = g; bestD = d; }
      });
      if (!best) {
        best = gestures[info.key];
        if (!best) {
          best = gestures[info.key] = { side: info.side, key: info.key, t0: now, arme: info.arme, hand: info.hand, pointers: {}, maxFingers: 0 };
        }
      }
      best.pointers[e.pointerId] = { path: [p], down: true };
      pointerMap[e.pointerId] = best;
      best.maxFingers = Math.max(best.maxFingers, downPointers(best).length);
      if (e.pointerType === 'mouse') best.maxFingers = Math.max(best.maxFingers, heldDigit);
      emitTrail('start', e.pointerId, best, p);
    }
    function onMove(e) {
      var g = pointerMap[e.pointerId]; if (!g) return;
      e.preventDefault();
      var q = g.pointers[e.pointerId], l = q.path[q.path.length - 1];
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (list.length ? list : [e]).forEach(function (ev) {
        var p = rel(ev);
        if (dist(p, q.path[q.path.length - 1]) < 1.5) return;
        q.path.push(p);
        emitTrail('move', e.pointerId, g, p);
      });
    }
    function onUp(e) {
      var g = pointerMap[e.pointerId]; if (!g) return;
      var q = g.pointers[e.pointerId];
      if (q) { q.down = false; q.end = rel(e); }
      delete pointerMap[e.pointerId];
      try { el.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      if (!downPointers(g).length) finalize(g, e.type === 'pointercancel');
    }
    function analyse(path) {
      var len = 0, i;
      for (i = 1; i < path.length; i++) len += dist(path[i - 1], path[i]);
      var a = path[0], b = path[path.length - 1], chord = dist(a, b), maxDev = 0, dev;
      for (i = 0; i < path.length; i++) {
        var p = path[i];
        dev = chord > 1e-6
          ? Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / chord
          : dist(p, a);
        if (dev > maxDev) maxDev = dev;
      }
      var ratio = o.curveMetric === 'chord' ? (chord > 1 ? maxDev / chord : 9) : (len > 0 ? maxDev / len : 0);
      return { len: len, chord: chord, ratio: ratio };
    }
    function finalize(g, cancelled) {
      gestures[g.key] = null;
      var best = null, bestM = null, bestId = null, ids = [];
      Object.keys(g.pointers).forEach(function (id) {
        var q = g.pointers[id], m = analyse(q.path);
        ids.push(+id);
        if (!bestM || m.len > bestM.len) { best = q; bestM = m; bestId = +id; }
      });
      var res = { side: g.side, key: g.key, arme: g.arme, hand: g.hand, ids: ids, bestId: bestId, kind: 'cancel' };
      if (cancelled || !bestM) { if (o.onGesture) o.onGesture(res); return; }
      var last = best.path[best.path.length - 1], first = best.path[0];
      res.cx = last.cx; res.cy = last.cy; res.sx = first.cx; res.sy = first.cy; res.metrics = bestM;
      var tap = bestM.len < o.minTravel;
      if (tap && g.maxFingers >= o.undoFingers) { res.kind = 'undo'; if (o.onGesture) o.onGesture(res); return; }
      var dtm = typeof o.doubleTapMs === 'function' ? o.doubleTapMs(g) : o.doubleTapMs;
      if (tap && dtm > 0) {
        var nowT = performance.now(), prevT = lastTap[g.key] || 0;
        if (prevT && nowT - prevT <= o.doubleTapMs) { lastTap[g.key] = 0; res.kind = 'chain'; }
        else { lastTap[g.key] = nowT; res.kind = 'cancel'; }
        if (o.onGesture) o.onGesture(res); return;
      }
      var flags = [], fingers = g.maxFingers;
      if (fingers > 3) { fingers = 3; flags.push('plus de 3 doigts'); }
      if (fingers < 1) fingers = 1;
      var traj;
      if (tap) { traj = o.tapTrajectory; flags.push('trajectoire non détectée (tap)'); }
      else traj = bestM.ratio > threshold() ? 'courbe' : 'droite';
      res.kind = 'hit'; res.trajectoire = traj; res.fingers = fingers; res.flags = flags;
      if (o.onGesture) o.onGesture(res);
    }
    function onKeyDown(e) { if (/^[1-4]$/.test(e.key)) heldDigit = +e.key; }
    function onKeyUp(e) { if (/^[1-4]$/.test(e.key)) heldDigit = 1; }
    function onCtx(e) { e.preventDefault(); }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('lostpointercapture', onUp);
    el.addEventListener('contextmenu', onCtx);
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);

    return {
      setOptions: function (extra) { o = merge(o, extra); },
      destroy: function () {
        el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp);
        el.removeEventListener('lostpointercapture', onUp); el.removeEventListener('contextmenu', onCtx);
        window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp);
      }
    };
  }


  /* ------------------------------------------------------------------ module */
  function create(container, opts) {
    injectStyle();
    var o = merge(DEFAULTS, opts || {});
    var hits = [];
    var nextId = 1;
    var t0 = null;
    var actx = null;
    var cleanup = [];

    /* ---------- DOM ---------- */
    var rootEl = h('div', 'bx-root');
    var bar = h('div', 'bx-bar');
    var stage = h('div', 'bx-stage');
    var blocks = {};

    function makeBlock(side, cls) {
      var b = h('div', 'bx-block ' + cls);
      var dot = h('span', 'bx-dot'); dot.style.background = o.colors[side];
      var name = h('span', 'bx-name', o.labels[side]); name.style.color = o.colors[side];
      var total = h('span', 'bx-total', '0');
      var last = h('span', 'bx-last', '');
      var undo = h('button', 'bx-btn', '↶ Annuler'); undo.type = 'button';
      undo.addEventListener('click', function () { undoLast(side); });
      b.appendChild(dot); b.appendChild(name); b.appendChild(total); b.appendChild(last); b.appendChild(undo);
      blocks[side] = { total: total, last: last };
      return b;
    }
    bar.appendChild(makeBlock(o.sides.left, 'bx-left'));
    if (o.showControls) {
      var center = h('div', 'bx-center');
      [['?', 'Aide', showHelp], ['Bilan', 'Bilan', showSummary], ['⟲', 'Réinitialiser', resetAsk]].forEach(function (d) {
        var b = h('button', 'bx-btn', d[0]); b.type = 'button'; b.title = d[1]; b.addEventListener('click', d[2]); center.appendChild(b);
      });
      bar.appendChild(center);
    }
    bar.appendChild(makeBlock(o.sides.right, 'bx-right'));

    // fond teinté + séparateurs + étiquettes
    var tintL = h('div', 'bx-tint'); tintL.style.left = '0'; tintL.style.width = (o.splitX * 100) + '%';
    tintL.style.background = o.colors[o.sides.left] + '14';
    var tintR = h('div', 'bx-tint'); tintR.style.right = '0'; tintR.style.width = ((1 - o.splitX) * 100) + '%';
    tintR.style.background = o.colors[o.sides.right] + '14';
    var split = h('div', 'bx-split'); split.style.top = (o.splitY * 100) + '%';
    stage.appendChild(tintL); stage.appendChild(tintR); stage.appendChild(split);
    [['POINGS', o.splitY, 'top'], ['PIEDS', o.splitY, 'bottom']].forEach(function (d) {
      [[o.sides.left, '12px', null], [o.sides.right, null, '12px']].forEach(function (sd) {
        var t = h('span', 'bx-tag', d[0]);
        if (sd[1]) t.style.left = sd[1]; else t.style.right = sd[2];
        t.style.color = o.colors[sd[0]];
        if (d[2] === 'top') t.style.top = '10px'; else t.style.bottom = '10px';
        stage.appendChild(t);
      });
    });

    // personnage central
    var zoneShapes = {}, zoneTexts = {};
    var fig = s('svg', { 'class': 'bx-figure', viewBox: '0 0 300 580', preserveAspectRatio: 'xMidYMid meet' });
    function shape(zone, el) {
      el.setAttribute('fill', '#263240'); el.setAttribute('stroke', '#5d7088'); el.setAttribute('stroke-width', '2');
      fig.appendChild(el);
      (zoneShapes[zone] = zoneShapes[zone] || []).push(el);
    }
    shape('visage', s('circle', { cx: 150, cy: 70, r: 46 }));
    shape('torse', s('rect', { x: 90, y: 130, width: 120, height: 115, rx: 22 }));
    shape('ventre', s('rect', { x: 90, y: 250, width: 120, height: 90, rx: 18 }));
    shape('flancs', s('rect', { x: 52, y: 150, width: 30, height: 190, rx: 15 }));
    shape('flancs', s('rect', { x: 218, y: 150, width: 30, height: 190, rx: 15 }));
    shape('jambes', s('rect', { x: 96, y: 356, width: 52, height: 200, rx: 20 }));
    shape('jambes', s('rect', { x: 152, y: 356, width: 52, height: 200, rx: 20 }));
    var textSpots = {
      visage: [150, 62, 150, 88, 0], torse: [150, 180, 150, 206, 0], ventre: [150, 285, 150, 311, 0],
      flancs: [67, 245, 233, 245, -90], jambes: [150, 440, 150, 470, 0]
    };
    ZONES.forEach(function (z) {
      var p = textSpots[z.id];
      var lab = s('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'font-size': 14, fill: '#b9c6d6', 'pointer-events': 'none' });
      lab.textContent = z.label;
      var cnt = s('text', { x: p[2], y: p[3], 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, 'pointer-events': 'none' });
      if (p[4]) {
        lab.setAttribute('transform', 'rotate(' + p[4] + ' ' + p[0] + ' ' + p[1] + ')');
        cnt.setAttribute('transform', 'rotate(' + p[4] + ' ' + p[2] + ' ' + p[3] + ')');
      }
      fig.appendChild(lab); fig.appendChild(cnt);
      zoneTexts[z.id] = cnt;
    });
    var trails = s('svg', { 'class': 'bx-trails' });
    stage.appendChild(fig); stage.appendChild(trails);

    rootEl.appendChild(bar); rootEl.appendChild(stage);
    container.appendChild(rootEl);

    /* ---------- rendu ---------- */
    function render() {
      var tot = { rouge: 0, bleu: 0 }, zc = {}, last = { rouge: null, bleu: null };
      ZONES.forEach(function (z) { zc[z.id] = { rouge: 0, bleu: 0, last: null }; });
      hits.forEach(function (t) {
        tot[t.cote]++; zc[t.cible][t.cote]++; zc[t.cible].last = t.cote; last[t.cote] = t;
      });
      ZONES.forEach(function (z) {
        var info = zc[z.id], col = info.last ? o.colors[info.last] : null;
        zoneShapes[z.id].forEach(function (el) {
          el.setAttribute('fill', col || '#263240');
          el.setAttribute('fill-opacity', col ? '0.6' : '1');
          el.setAttribute('stroke', col || '#5d7088');
        });
        var txt = zoneTexts[z.id];
        while (txt.firstChild) txt.removeChild(txt.firstChild);
        var first = true;
        ['rouge', 'bleu'].forEach(function (sd) {
          if (!info[sd]) return;
          if (!first) { var sep = s('tspan', { fill: '#8da0b5' }); sep.textContent = ' · '; txt.appendChild(sep); }
          var ts = s('tspan', { fill: lighten(o.colors[sd]) }); ts.textContent = info[sd]; txt.appendChild(ts);
          first = false;
        });
      });
      ['rouge', 'bleu'].forEach(function (sd) {
        blocks[sd].total.textContent = tot[sd];
        var l = last[sd];
        blocks[sd].last.textContent = l ? cap(l.technique) + ' · ' + l.hauteur + ' → ' + l.cible + (l.incertain ? ' ?' : '') : '';
      });
    }
    function lighten(hex) { return hex === DEFAULTS.colors.bleu ? '#8fbaff' : hex === DEFAULTS.colors.rouge ? '#ff8a80' : '#fff'; }

    function flash(zone, side) {
      if (!zoneShapes[zone][0].animate) return;
      zoneShapes[zone].forEach(function (el) {
        el.animate([{ fillOpacity: 1, strokeWidth: '9px' }, { fillOpacity: 0.6, strokeWidth: '2px' }], { duration: 650, easing: 'ease-out' });
      });
    }

    /* ---------- retours sensoriels ---------- */
    function audio() {
      if (!o.feedback.sound) return null;
      try {
        if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; actx = AC ? new AC() : null; }
        if (actx && actx.state === 'suspended') actx.resume();
      } catch (e) { actx = null; }
      return actx;
    }
    function tone(freq, at, dur, type, pan, vol) {
      var c = actx; if (!c) return;
      var osc = c.createOscillator(), g = c.createGain(), node = g;
      osc.type = type; osc.frequency.value = freq;
      var t = c.currentTime + at;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(c.destination); }
      else g.connect(c.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
    }
    function sideOfScreen(side) { return side === o.sides.left ? -0.8 : 0.8; }
    function feedbackHit(t) {
      var n = HAUTEURS.indexOf(t.hauteur) + 1;
      if (audio()) {
        var f = t.arme === 'poing' ? 260 : 520, type = t.trajectoire === 'droite' ? 'square' : 'sine';
        for (var i = 0; i < n; i++) tone(f, i * 0.1, 0.07, type, sideOfScreen(t.cote), type === 'square' ? 0.08 : 0.22);
      }
      if (o.feedback.vibrate && navigator.vibrate) {
        var pat = [], on = t.arme === 'poing' ? 30 : 80;
        for (var j = 0; j < n; j++) { if (j) pat.push(40); pat.push(on); }
        navigator.vibrate(pat);
      }
    }
    function feedbackUndo(side) {
      if (audio()) { tone(400, 0, 0.09, 'sine', sideOfScreen(side), 0.2); tone(250, 0.1, 0.14, 'sine', sideOfScreen(side), 0.2); }
      if (o.feedback.vibrate && navigator.vibrate) navigator.vibrate([120]);
    }

    /* ---------- enregistrement ---------- */
    function emit(name, detail) {
      container.dispatchEvent(new CustomEvent('bx:' + name, { detail: detail }));
    }
    function changed() {
      render();
      if (o.onChange) o.onChange(hits.slice());
      emit('change', hits.slice());
    }
    function record(side, arme, trajectoire, fingers, flags, metrics) {
      if (t0 == null) t0 = performance.now();
      var hauteur = HAUTEURS[fingers - 1];
      var touche = {
        id: nextId++,
        t: Math.round(performance.now() - t0),
        cote: side,
        arme: arme,
        technique: TECHNIQUES[arme][trajectoire],
        trajectoire: trajectoire,
        hauteur: hauteur,
        cible: CIBLES[arme][hauteur],
        doigts: fingers,
        incertain: flags.length > 0,
        alertes: flags,
        longueur: Math.round(metrics.len),
        courbure: Math.round(metrics.ratio * 1000) / 1000
      };
      hits.push(touche);
      feedbackHit(touche);
      changed();
      flash(touche.cible, side);
      if (o.onHit) o.onHit(touche);
      emit('hit', touche);
      return touche;
    }
    function undoLast(side) {
      for (var i = hits.length - 1; i >= 0; i--) {
        if (!side || hits[i].cote === side) {
          var removed = hits.splice(i, 1)[0];
          feedbackUndo(removed.cote);
          changed();
          if (o.onUndo) o.onUndo(removed);
          emit('undo', removed);
          return removed;
        }
      }
      return null;
    }
    function reset() { hits.length = 0; nextId = 1; t0 = null; changed(); }
    function resetAsk() { if (confirm('Effacer toutes les touches saisies ?')) reset(); }

    /* ---------- geste (moteur partagé) ---------- */
    var trailEls = {};
    function onTrail(ev) {
      if (!o.showTrail) return;
      var r = stage.getBoundingClientRect(), pt = (ev.cx - r.left).toFixed(0) + ',' + (ev.cy - r.top).toFixed(0);
      if (ev.type === 'start') {
        var pl = s('polyline', { fill: 'none', stroke: o.colors[ev.side], 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.55, points: pt });
        trails.appendChild(pl); trailEls[ev.id] = pl;
      } else if (trailEls[ev.id]) {
        trailEls[ev.id].setAttribute('points', trailEls[ev.id].getAttribute('points') + ' ' + pt);
      }
    }
    function onGesture(res) {
      (res.ids || []).forEach(function (id) {
        var tr = trailEls[id]; delete trailEls[id];
        if (tr) { tr.setAttribute('class', 'bx-trail-fade'); setTimeout(function () { if (tr.parentNode) tr.parentNode.removeChild(tr); }, 400); }
      });
      audio();
      if (res.kind === 'undo') undoLast(res.side);
      else if (res.kind === 'hit') record(res.side, res.arme, res.trajectoire, res.fingers, res.flags, res.metrics);
    }
    var engine = createEngine(stage, {
      sides: o.sides, splitX: o.splitX, splitY: o.splitY, joinRadius: o.joinRadius, landingMs: o.landingMs,
      minTravel: o.minTravel, curveThreshold: function () { return o.curveThreshold; }, curveMetric: o.curveMetric,
      tapTrajectory: o.tapTrajectory, undoFingers: o.undoFingers,
      onTrail: onTrail, onGesture: onGesture
    });
    cleanup.push(function () { engine.destroy(); });


    /* ---------- bilan / aide / export ---------- */
    function summary() {
      var out = { total: { rouge: 0, bleu: 0 }, technique: {}, cible: {}, hauteur: {} };
      ['direct', 'crochet', 'chassé', 'fouetté'].forEach(function (k) { out.technique[k] = { rouge: 0, bleu: 0 }; });
      ZONES.forEach(function (z) { out.cible[z.id] = { rouge: 0, bleu: 0 }; });
      HAUTEURS.forEach(function (k) { out.hauteur[k] = { rouge: 0, bleu: 0 }; });
      hits.forEach(function (t) {
        out.total[t.cote]++; out.technique[t.technique][t.cote]++; out.cible[t.cible][t.cote]++; out.hauteur[t.hauteur][t.cote]++;
      });
      return out;
    }
    function toCSV() {
      var cols = ['id', 't_ms', 'cote', 'arme', 'technique', 'hauteur', 'cible', 'doigts', 'incertain'];
      var rows = [cols.join(';')];
      hits.forEach(function (t) {
        rows.push([t.id, t.t, t.cote, t.arme, t.technique, t.hauteur, t.cible, t.doigts, t.incertain ? 'oui' : 'non'].join(';'));
      });
      return rows.join('\n');
    }
    function download() {
      var blob = new Blob(['﻿' + toCSV()], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'touches-boxe-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function overlay(build) {
      var ov = h('div', 'bx-overlay');
      build(ov);
      var row = h('div', 'bx-row');
      var close = h('button', 'bx-btn', 'Fermer'); close.type = 'button';
      close.addEventListener('click', function () { ov.remove(); });
      row.appendChild(close);
      ov.appendChild(row);
      rootEl.appendChild(ov);
      return row;
    }
    function table(title, rowsObj, labels) {
      var wrap = document.createDocumentFragment();
      wrap.appendChild(h('h3', null, title));
      var t = h('table');
      var head = h('tr');
      head.appendChild(h('th', null, ''));
      ['rouge', 'bleu'].forEach(function (sd) { var th = h('th', null, o.labels[sd]); th.style.color = o.colors[sd]; head.appendChild(th); });
      t.appendChild(head);
      Object.keys(rowsObj).forEach(function (k) {
        var tr = h('tr');
        tr.appendChild(h('td', null, labels && labels[k] ? labels[k] : cap(k)));
        tr.appendChild(h('td', null, rowsObj[k].rouge));
        tr.appendChild(h('td', null, rowsObj[k].bleu));
        t.appendChild(tr);
      });
      wrap.appendChild(t);
      return wrap;
    }
    function showSummary() {
      var sm = summary();
      var row = overlay(function (ov) {
        ov.appendChild(h('h2', null, 'Bilan · ' + hits.length + ' touche' + (hits.length > 1 ? 's' : '')));
        var tot = {}; tot['Total'] = sm.total;
        ov.appendChild(table('Total', tot));
        ov.appendChild(table('Techniques', sm.technique));
        var zl = {}; ZONES.forEach(function (z) { zl[z.id] = z.label; });
        ov.appendChild(table('Zones touchées', sm.cible, zl));
      });
      var b = h('button', 'bx-btn', '⬇ Exporter en CSV'); b.type = 'button'; b.addEventListener('click', download);
      row.insertBefore(b, row.firstChild);
    }
    function showHelp() {
      overlay(function (ov) {
        ov.appendChild(h('h2', null, 'Comment saisir (sans regarder la tablette)'));
        var ul = h('ul');
        [
          'Le personnage frappé est au centre. Chaque observateur frappe sur son côté : gauche = ' + o.labels[o.sides.left] + ', droite = ' + o.labels[o.sides.right] + '.',
          'Le geste COMMENCE en haut de l\'écran pour un POING, en bas pour un PIED.',
          'Trajectoire DROITE : direct (poing) ou chassé (pied). Trajectoire COURBE : crochet (poing) ou fouetté (pied).',
          'Nombre de doigts = hauteur : 1 doigt = bas, 2 doigts = milieu, 3 doigts = haut.',
          'Poings : bas = ventre · milieu = épaules / torse · haut = visage.',
          'Pieds : bas = jambes · milieu = flancs · haut = visage.',
          'Erreur ? Tap à ' + o.undoFingers + ' doigts (ou bouton « Annuler ») : retire la dernière touche de ton côté.',
          'Sons : grave = poing, aigu = pied · 1, 2 ou 3 bips = bas, milieu, haut.'
        ].forEach(function (t) { ul.appendChild(h('li', null, t)); });
        ov.appendChild(ul);
        ov.appendChild(h('p', null, 'Astuce test à la souris : maintenir la touche 1, 2, 3 ou 4 du clavier pendant le geste simule le nombre de doigts.'));
      });
    }

    /* ---------- API publique ---------- */
    return {
      getHits: function () { return hits.slice(); },
      getSummary: summary,
      toCSV: toCSV,
      download: download,
      undo: undoLast,
      reset: reset,
      showSummary: showSummary,
      showHelp: showHelp,
      setOptions: function (extra) { o = merge(o, extra); },
      destroy: function () {
        cleanup.forEach(function (f) { f(); });
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      },
      element: rootEl
    };
  }

  return { create: create, createEngine: createEngine, TECHNIQUES: TECHNIQUES, CIBLES: CIBLES, HAUTEURS: HAUTEURS };
});
