/* =====================================================================
   Observ'BF — Boxe française Savate (CA4) · N'EPS numérique · by Quentin Delisle
   Organisation reprise de l'appli Biathlon : tablette enseignant / tablette élève,
   parcours prof en 4 étapes, échanges par QR codes, paramètres du cycle, piliers.
   ===================================================================== */
'use strict';
const APP_VERSION = '3.1.0';
const ROOT_KEY = 'observbf.v3';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const rnd = n => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const uid = () => rnd(6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const fmtLong = sec => { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m} min${s ? ' ' + String(s).padStart(2, '0') : ''}` : `${s} s`; };
const capName = s => String(s || '').toLowerCase().replace(/(^|[\s\-'’])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase()).trim();

/* ---------------- Référentiel ---------------- */
const CAT = {tete:'tete', tronc:'tronc', cuisse:'bas', tibia:'bas', epaule:'garde', bras:'garde', avantbras:'garde'};
const ZL = BFDraw.ZL;
const ZONES = ['tete', 'tronc', 'epaule', 'bras', 'avantbras', 'cuisse', 'tibia'], SIDES = ['c', 'g', 'd'];
const CATL = {tete:'Visage', tronc:'Tronc', bas:'Ligne basse', garde:'Bras / garde', manque:'Dans le vide'};
const COUPS = {direct:{l:'Direct', w:'poing'}, crochet:{l:'Crochet', w:'poing'}, chasse:{l:'Chassé', w:'pied'}, fouette:{l:'Fouetté', w:'pied'}};
const COUP_KEYS = Object.keys(COUPS);
const COL = {R:{c:'#E53935', d:'#B71C1C'}, B:{c:'#1E6FE0', d:'#0D47A1'}};
const OTHER = {R:'B', B:'R'};
/* Couleurs de groupes : sans rouge ni bleu (réservés aux coins) */
const GCOLORS = [
  {k:'vert', n:'Vert', c:'#1FA24A'}, {k:'jaune', n:'Jaune', c:'#FFD400', tx:'#13285A'}, {k:'orange', n:'Orange', c:'#FF7A00'},
  {k:'violet', n:'Violet', c:'#8A2BE2'}, {k:'rose', n:'Rose', c:'#FF4FA3'}, {k:'cyan', n:'Cyan', c:'#00B8D9'},
  {k:'marron', n:'Marron', c:'#8B5A2B'}, {k:'turquoise', n:'Turquoise', c:'#14B8A6'}, {k:'noir', n:'Noir', c:'#1A1A1A'},
  {k:'lime', n:'Vert clair', c:'#9BE13C', tx:'#13285A'}, {k:'bordeaux', n:'Bordeaux', c:'#8E1B3A'}, {k:'gris', n:'Gris', c:'#8A94A6'},
  {k:'saumon', n:'Saumon', c:'#FF8C7A'}, {k:'kaki', n:'Kaki', c:'#7A7A2E'}, {k:'marine', n:'Bleu marine', c:'#0B2A6B'}];
const gcol = k => GCOLORS.find(c => c.k === k) || GCOLORS[0];
/* Observation des piliers (comme Biathlon) */
const OBS = [null, {n:'Jamais', c:'#D0161B', f:'#fff'}, {n:'Parfois', c:'#F07000', f:'#fff'}, {n:'Souvent', c:'#86DC96', f:'#0A1633'}, {n:'Toujours', c:'#0B4F1C', f:'#fff'}];
const DEFAULT_PILIERS = [
  {id:'garde', n:'Garde et déplacements', cr:['Garde haute : les gants protègent le visage', 'Regard sur l\'adversaire, menton rentré', 'Se déplace sans croiser les pieds']},
  {id:'poings', n:'Toucher avec les poings', cr:['Bras tendu au moment de la touche', 'Retour en garde après la frappe', 'Touche contrôlée, sans appuyer']},
  {id:'pieds', n:'Toucher avec les pieds', cr:['Armé de la jambe avant de frapper', 'Touche avec la chaussure', 'Garde l\'équilibre et revient en garde']},
  {id:'ench', n:'Enchaîner', cr:['Enchaîne deux touches sans arrêt', 'Varie les armes (poing / pied)', 'Varie les cibles (haut / bas)']},
  {id:'def', n:'Défendre et riposter', cr:['Pare ou esquive les attaques', 'Riposte après une parade', 'Garde la distance de sécurité']},
  {id:'arb', n:'Arbitrer et juger', cr:['Annonces claires : en garde, allez, stop', 'Sanctionne les frappes trop fortes', 'Compte les touches sans se tromper']}];
const DEF_BAREME = {poing:{tete:2, tronc:1, bas:0, garde:0}, pied:{tete:3, tronc:2, bas:1, garde:0}};
const DEF_SET = {nbLessons:6, current:1, totalMin:40, reprises:2, recupSec:30, transitionSec:60, mode:'auto', manualSec:90, bonusOn:true, bonusPts:1, bonusArmes:['direct','crochet','chasse','fouette'],
  bareme:clone(DEF_BAREME), penalite:1, bonusEnch:1, seuil:0.18, ptsV:3, ptsN:2, ptsD:1, autoNext:10};

/* ---------------- État ---------------- */
let ROOT, S;
function newClass(name, id) { return {id: id || rnd(4), name: name || 'Classe', students: [], groups: [], settings: clone(DEF_SET), lessons: {}, assaults: []}; }
function normClass(c) {
  c.settings = Object.assign(clone(DEF_SET), c.settings || {});
  c.settings.bareme = Object.assign(clone(DEF_BAREME), c.settings.bareme || {});
  ['students', 'groups', 'assaults'].forEach(k => c[k] = c[k] || []);
  c.lessons = c.lessons || {};
  c.groups.forEach((g, i) => { g.color = g.color || GCOLORS[i % GCOLORS.length].k; g.members = g.members || []; });
  return c;
}
function loadRoot() {
  try { ROOT = JSON.parse(localStorage.getItem(ROOT_KEY)); } catch(e) { ROOT = null; }
  if (!ROOT || !ROOT.classes) {
    ROOT = {v: 3, role: null, pin: '0000', deviceId: rnd(4), active: null, classes: {}, piliers: clone(DEFAULT_PILIERS), myGroup: {}, recv: null, live: null};
    // reprise de la version 2 (une seule classe)
    try {
      const old = JSON.parse(localStorage.getItem('observbf.v2') || 'null');
      if (old && old.students && old.students.length) {
        const c = newClass(old.className || 'Classe 1');
        c.students = old.students; c.groups = (old.groups || []).map((g, i) => ({id: g.id, name: g.name, color: GCOLORS[i % GCOLORS.length].k, members: g.members}));
        Object.assign(c.settings, old.settings || {}); delete c.settings.pin;
        ROOT.classes[c.id] = c; ROOT.role = 'prof';
      }
    } catch(e) {}
  }
  ROOT.piliers = ROOT.piliers || clone(DEFAULT_PILIERS); ROOT.myGroup = ROOT.myGroup || {};
  Object.values(ROOT.classes).forEach(normClass);
  if (!Object.keys(ROOT.classes).length) { const c = newClass('Classe 1'); ROOT.classes[c.id] = c; }
  if (!ROOT.classes[ROOT.active]) ROOT.active = Object.keys(ROOT.classes)[0];
  S = ROOT.classes[ROOT.active];
}
function useClass(id) { ROOT.active = id; S = ROOT.classes[id]; }
let saveT;
function save() { try { localStorage.setItem(ROOT_KEY, JSON.stringify(ROOT)); } catch(e) { toast('⚠️ Mémoire pleine : exportez une sauvegarde'); } }
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 500); };
loadRoot();
const isProf = () => ROOT.role === 'prof';
const SET = () => S.settings;

/* ---------------- Utilitaires UI ---------------- */
let toastT;
function toast(msg, ms = 2400) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch(e) {} };
let actx = null;
function audio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch(e) {} return actx; }
function beep(n = 1, freq = 880, dur = .18) {
  const a = audio(); if (!a) return;
  for (let i = 0; i < n; i++) { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * (dur + .12);
    o.frequency.value = freq; o.type = 'square'; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02); }
}
function modal(html, onOpen) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
  const bg = root.firstElementChild; bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  if (onOpen) onOpen(bg.firstElementChild); return bg.firstElementChild;
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function choiceBox(title, text, choices) {
  return new Promise(res => {
    const m = modal(`<h2>${esc(title)}</h2><p>${text}</p><div class="btn-row">${choices.map((c, i) => `<button class="btn ${c.cls || ''}" data-i="${i}">${esc(c.label)}</button>`).join('')}<button class="btn ghost" data-i="-1">Annuler</button></div>`);
    m.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { closeModal(); const i = +b.dataset.i; res(i < 0 ? null : choices[i].value); });
  });
}
const confirmBox = (title, text, ok = 'Valider', danger = false) => choiceBox(title, text, [{label: ok, value: true, cls: danger ? 'red' : 'primary'}]).then(v => !!v);
function pinPad(onOk, title = '🔒 Code enseignant') {
  let code = '';
  const m = modal(`<h2 class="center" style="text-align:center">${title}</h2><div class="pin-dots">${'<span></span>'.repeat(4)}</div>
    <div class="pin-pad">${[1,2,3,4,5,6,7,8,9,'⌫',0,'✕'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>
    <p class="note" style="text-align:center">Code par défaut : 0000 (modifiable dans Bilans → Export & réglages)</p>`);
  const dots = m.querySelectorAll('.pin-dots span');
  m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === '✕') return closeModal();
    if (k === '⌫') code = code.slice(0, -1); else if (code.length < 4) code += k;
    dots.forEach((d, i) => d.classList.toggle('f', i < code.length));
    if (code.length === 4) { if (code === String(ROOT.pin || '0000')) { closeModal(); onOk(); } else { toast('Code incorrect'); code = ''; dots.forEach(d => d.classList.remove('f')); } }
  });
}

/* ---------------- Élèves, groupes ---------------- */
const stu = id => S.students.find(s => s.id === id);
const fullName = s => s ? `${s.prenom} ${s.nom}`.trim() : '';
const nameOf = id => fullName(stu(id));
const sortedStudents = (list = S.students) => [...list].sort((a, b) => (a.nom + ' ' + a.prenom).localeCompare(b.nom + ' ' + b.prenom, 'fr'));
const groupById = id => S.groups.find(g => g.id === id);
const groupOf = sid => S.groups.find(g => g.members.includes(sid));
const gStyle = g => { const c = gcol(g.color); return `--gc:${c.c};--gtx:${c.tx || '#fff'}`; };
const gDot = g => g ? `<span class="gdot" style="background:${gcol(g.color).c}"></span>` : '';

/* ---------------- Leçons ---------------- */
function lesson(n) {
  n = +n; S.lessons[n] = S.lessons[n] || {};
  const L = S.lessons[n];
  if (L.title == null) L.title = ''; L.att = L.att || {}; L.sig = L.sig || {};
  return L;
}
const curLesson = () => Math.min(SET().current || 1, SET().nbLessons);
const present = (n, sid) => !lesson(n).att[sid];
const lessonPil = n => { const p = lesson(n).pil; return p && typeof p === 'object' ? p : null; };
const LS = n => { const L = lesson(n), s = SET(); return {totalMin: L.totalMin ?? s.totalMin, reprises: L.reprises ?? s.reprises, recupSec: s.recupSec, transitionSec: s.transitionSec, mode: s.mode, manualSec: s.manualSec}; };
const lessonLabel = n => `Leçon ${n}/${SET().nbLessons}` + (lesson(n).title ? ' · ' + lesson(n).title : '');
function timing(n, nb) {
  const s = LS(n), nA = nb * (nb - 1) / 2, R = Math.max(1, +s.reprises || 1), rec = +s.recupSec || 0, tr = +s.transitionSec || 0;
  let rep, warn = '';
  if (s.mode === 'manuel' || !nA) rep = +s.manualSec || 90;
  else { rep = Math.floor(((s.totalMin * 60 / nA) - tr - (R - 1) * rec) / R / 5) * 5; if (rep < 30) { rep = 30; warn = 'Temps insuffisant'; } if (rep > 180) rep = 180; }
  const assaultSec = R * rep + (R - 1) * rec, total = nA * (assaultSec + tr);
  if (!warn && total > s.totalMin * 60 + 1) warn = 'Dépasse la durée prévue';
  return {nA, rep, rec, R, assaultSec, total, warn};
}

/* ---------------- Tournoi : assauts et rôles ---------------- */
const pairKey = (a, b) => [a, b].sort().join('|');
function roundRobin(ids) {
  const p = [...ids]; if (p.length < 2) return [];
  if (p.length % 2) p.push(null);
  const n = p.length, out = [];
  for (let r = 0; r < n - 1; r++) { for (let i = 0; i < n / 2; i++) { const a = p[i], b = p[n - 1 - i]; if (a && b) out.push((r + i) % 2 ? [b, a] : [a, b]); } p.splice(1, 0, p.pop()); }
  const seq = [], rest = out.slice();
  while (rest.length) {
    const p1 = seq[seq.length - 1] || [], p2 = seq[seq.length - 2] || [];
    let k = rest.findIndex(x => !x.some(y => p1.includes(y) || p2.includes(y)));
    if (k < 0) k = rest.findIndex(x => !x.some(y => p1.includes(y))); if (k < 0) k = 0;
    seq.push(rest.splice(k, 1)[0]);
  }
  return seq;
}
const lessonAssaults = (n, gid) => S.assaults.filter(a => a.n === +n && a.gid === gid).sort((a, b) => (a.order || 0) - (b.order || 0));
const todoList = (n, gid) => lessonAssaults(n, gid).filter(a => a.status !== 'done');
const presentMembers = (n, g) => g.members.filter(id => stu(id) && present(n, id));
function ensureSchedule(n, g) {
  if (!isProf()) return;
  const L = lesson(n), mem = presentMembers(n, g), sig = [...mem].sort().join(',') + '#roles4';
  if (L.sig[g.id] === sig) return;
  const done = S.assaults.filter(a => a.n === +n && a.gid === g.id && a.status === 'done');
  S.assaults = S.assaults.filter(a => !(a.n === +n && a.gid === g.id && a.status !== 'done'));
  const doneKeys = new Set(done.map(a => pairKey(a.red, a.blue)));
  let order = done.reduce((m, a) => Math.max(m, a.order || 0), 0);
  for (const [r, b] of roundRobin(mem)) if (!doneKeys.has(pairKey(r, b))) S.assaults.push({id: uid(), n: +n, gid: g.id, red: r, blue: b, order: ++order, status: 'todo', jc: '', jp: []});
  assignRoles(n, g);
  L.sig[g.id] = sig; save();
}
/* Rotation des rôles : arbitre (juge central), coach rouge et coach bleu (juges de coin, observateurs sur la tablette), repos.
   Priorité aux élèves qui se sont le plus reposés ; on évite de donner un rôle à ceux qui combattent juste après. */
const ROLE_N = {jc: 'Arbitre', cR: 'Coach rouge', cB: 'Coach bleu'};
function restOf(a) {
  if (!a.gid) return [];
  const g = groupById(a.gid); if (!g) return [];
  const busy = new Set([a.red, a.blue, a.jc, ...(a.jp || [])].filter(Boolean));
  return presentMembers(a.n, g).filter(id => !busy.has(id));
}
function assignRoles(n, g) {
  const mem = presentMembers(n, g), cnt = {};
  mem.forEach(id => cnt[id] = {jc: 0, co: 0, rest: 0});
  const tally = a => { if (cnt[a.jc]) cnt[a.jc].jc++; (a.jp || []).forEach(j => cnt[j] && cnt[j].co++); restOf(a).forEach(r => cnt[r] && cnt[r].rest++); };
  lessonAssaults(n, g.id).filter(a => a.status === 'done').forEach(tally);
  const todo = todoList(n, g.id);
  todo.forEach((a, i) => {
    const next = todo[i + 1], busy = id => next && (next.red === id || next.blue === id) ? 1 : 0;
    const others = mem.filter(id => id !== a.red && id !== a.blue);
    const pick = key => { others.sort((x, y) => busy(x) - busy(y) || cnt[y].rest - cnt[x].rest || cnt[x][key] - cnt[y][key] || (cnt[x].jc + cnt[x].co) - (cnt[y].jc + cnt[y].co)); return others.shift() || ''; };
    a.jc = pick('jc');
    const cR = pick('co'), cB = pick('co');
    a.jp = [cR, cB];
    tally(a);
  });
}
function ranking(n, g) {
  const s = SET(), ids = new Set(g.members);
  lessonAssaults(n, g.id).forEach(a => { ids.add(a.red); ids.add(a.blue); });
  const rows = new Map([...ids].filter(id => stu(id)).map(id => [id, {id, J: 0, V: 0, N: 0, D: 0, pts: 0, pm: 0, pe: 0}]));
  for (const a of lessonAssaults(n, g.id)) {
    if (a.status !== 'done') continue;
    for (const [me, my, their, w] of [[a.red, a.scoreR, a.scoreB, 'R'], [a.blue, a.scoreB, a.scoreR, 'B']]) {
      const r = rows.get(me); if (!r) continue;
      r.J++; r.pm += my; r.pe += their;
      if (a.winner === 'N') { r.N++; r.pts += +s.ptsN; } else if (a.winner === w) { r.V++; r.pts += +s.ptsV; } else { r.D++; r.pts += +s.ptsD; }
    }
  }
  return [...rows.values()].filter(r => r.J || g.members.includes(r.id)).sort((a, b) => b.pts - a.pts || (b.pm - b.pe) - (a.pm - a.pe) || b.pm - a.pm || nameOf(a.id).localeCompare(nameOf(b.id), 'fr'));
}
function rankingTable(n, g, compact) {
  const rk = ranking(n, g); if (!rk.length) return '<p class="note">Aucun élève.</p>';
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Élève</th><th class="n">J</th><th class="n">V</th><th class="n">N</th><th class="n">D</th><th class="n">Pts</th>${compact ? '' : '<th class="n">Marqués</th><th class="n">Encaissés</th><th class="n">Diff.</th>'}</tr></thead><tbody>` +
    rk.map((r, i) => `<tr class="${i === 0 && r.J ? 'rank-1' : ''}"><td>${i + 1}</td><td>${esc(nameOf(r.id))}${present(n, r.id) ? '' : ' <span class="status">absent</span>'}</td><td class="n">${r.J}</td><td class="n">${r.V}</td><td class="n">${r.N}</td><td class="n">${r.D}</td><td class="n"><b>${r.pts}</b></td>${compact ? '' : `<td class="n">${r.pm}</td><td class="n">${r.pe}</td><td class="n">${r.pm - r.pe > 0 ? '+' : ''}${r.pm - r.pe}</td>`}</tr>`).join('') + '</tbody></table></div>';
}

/* ---------------- Points et statistiques ---------------- */
function ptsOf(e) { if (!e.z) return 0; if (e.trop) return -Math.abs(+SET().penalite || 0); const b = +(SET().bareme[e.w]?.[e.cat] ?? 0); return b > 0 ? b + (+e.bx || 0) : b; }
const isValid = e => e.z && !e.trop && ptsOf(e) > 0;
function enchStats(events, side) {
  const m = new Map();
  for (const e of events) if (e.t === side && e.ench) { if (!m.has(e.ench)) m.set(e.ench, []); m.get(e.ench).push(e); }
  let tries = 0, ok = 0; for (const arr of m.values()) { tries++; if (arr.length === 2 && arr.every(isValid)) ok++; }
  return {tries, ok};
}
const scoreOf = (events, side) => events.filter(e => e.t === side).reduce((s, e) => s + ptsOf(e), 0) + enchStats(events, side).ok * (+SET().bonusEnch || 0);
function sideStats(events, side) {
  const ev = events.filter(e => e.t === side);
  const st = {tent: ev.length, valid: ev.filter(isValid).length, trop: ev.filter(e => e.trop).length, bonus: ev.filter(e => e.bx && isValid(e)).length, cats: {}, coups: {}, ...enchStats(events, side)};
  for (const k in CATL) st.cats[k] = ev.filter(e => e.cat === k).length;
  for (const c in COUPS) { const ce = ev.filter(e => e.c === c); st.coups[c] = {t: ce.length, v: ce.filter(isValid).length}; }
  st.poing = ev.filter(e => e.w === 'poing').length; st.pied = ev.filter(e => e.w === 'pied').length;
  return st;
}
function studentStats(id, n) {
  const st = {J:0, V:0, N:0, D:0, pm:0, pe:0, tent:0, valid:0, trop:0, poing:0, pied:0, tries:0, ok:0, bonus:0, jc:0, jp:0, rest:0, cats:{}, coups:{}};
  for (const k in CATL) st.cats[k] = 0; for (const c in COUPS) st.coups[c] = {t: 0, v: 0};
  for (const a of S.assaults) {
    if (a.status !== 'done' || (n && a.n !== n)) continue;
    if (a.jc === id) st.jc++; if ((a.jp || []).includes(id)) st.jp++; if (restOf(a).includes(id)) st.rest++;
    const side = a.red === id ? 'R' : a.blue === id ? 'B' : null; if (!side) continue;
    st.J++; st.pm += side === 'R' ? a.scoreR : a.scoreB; st.pe += side === 'R' ? a.scoreB : a.scoreR;
    if (a.winner === 'N') st.N++; else if (a.winner === side) st.V++; else st.D++;
    const s = sideStats(a.events || [], side);
    for (const k of ['tent', 'valid', 'trop', 'poing', 'pied', 'tries', 'ok', 'bonus']) st[k] += s[k];
    for (const k in CATL) st.cats[k] += s.cats[k];
    for (const c in COUPS) { st.coups[c].t += s.coups[c].t; st.coups[c].v += s.coups[c].v; }
  }
  return st;
}

/* ---------------- Piliers ---------------- */
const pilById = id => ROOT.piliers.find(p => p.id === id);
const snapPil = p => p ? {id: p.id, n: p.n, cr: p.cr.filter(Boolean)} : null;
/* Bilan d'un élève sur une leçon : moyenne arrondie des observations de ses assauts */
function obsAgg(n, sid) {
  const pil = lessonPil(n); if (!pil) return null;
  const by = pil.cr.map(() => []);
  for (const a of S.assaults) {
    if (a.n !== n || a.status !== 'done' || !a.obs) continue;
    const side = a.red === sid ? 'R' : a.blue === sid ? 'B' : null; if (!side) continue;
    (a.obs[side] || []).forEach((v, i) => { if (v && by[i]) by[i].push(v); });
  }
  const out = by.map(v => v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : null);
  return out.some(Boolean) ? out : null;
}
/* Conseil : dernière leçon avec le même pilier, critère le moins réussi */
function adviceFor(n, sid) {
  const pil = lessonPil(n); if (!pil) return null;
  const sent = lesson(n).adv?.[sid]; if (sent) return {k: sent[0], i: sent[1], v: sent[2]};
  for (let k = n - 1; k >= 1; k--) {
    const p2 = lessonPil(k); if (!p2 || p2.id !== pil.id) continue;
    const ob = obsAgg(k, sid); if (!ob) continue;
    let i = 0; ob.forEach((x, j) => { if (x && (!ob[i] || x < ob[i])) i = j; });
    if (ob[i]) return {k, i, v: ob[i]};
  }
  return null;
}
function adviceHTML(n, sid) {
  const a = adviceFor(n, sid), pil = lessonPil(n); if (!a || !pil || !pil.cr[a.i]) return '';
  return a.v <= 2 ? `<div class="advice warn">💡 Leçon ${a.k} : « ${esc(pil.cr[a.i])} » était <b>${OBS[a.v].n.toLowerCase()}</b> réussi. Concentre-toi dessus !</div>`
    : `<div class="advice good">👍 Leçon ${a.k} : critères réussis souvent ou toujours. Vise « toujours » pour « ${esc(pil.cr[a.i])} ».</div>`;
}
const obsChip = v => v ? `<span class="obs-chip" style="background:${OBS[v].c};color:${OBS[v].f}">${OBS[v].n}</span>` : '<span class="muted">—</span>';

/* =====================================================================
   RENDU
   ===================================================================== */
const UI = {view: 'home', tab: 'menu', unlocked: false, studentMode: false, sel: null, statN: null, rankN: null};
function setTop(main, sub, right = '') { $('#tb-main').textContent = main; $('#tb-sub').textContent = sub || ''; $('#tb-right').innerHTML = right; }
function go(view, opts = {}) { Object.assign(UI, opts); UI.view = view; render(); window.scrollTo(0, 0); }
function render() {
  BFQR.stop();
  const m = $('#main'); let v = UI.view;
  if (!ROOT.role) { setTop('Observ\'BF', 'Choix du rôle de la tablette'); m.innerHTML = viewRole(); return; }
  const studentSide = !isProf() || UI.studentMode;
  if (isProf() && !UI.unlocked && !UI.studentMode && v !== 'home') v = UI.view = 'home';
  const cls = '🏫 ' + (S.name || 'Classe');
  const homeBtn = `<button class="btn small" data-action="home">⌂ Accueil</button>`;
  if (v === 'home') {
    if (studentSide) { setTop('Observ\'BF · élève', cls + (hasLesson() ? ' · ' + lessonLabel(curLesson()) : ''), isProf() ? `<button class="btn small" data-action="leaveStudent">👩‍🏫 Prof</button>` : `<button class="btn small" data-action="eleveLock" aria-label="Réglages">🔒</button>`); m.innerHTML = viewHomeEleve(); }
    else if (UI.unlocked) { UI.view = 'prof'; UI.tab = 'menu'; return render(); }
    else { setTop('Observ\'BF', cls + ' · tablette enseignant'); m.innerHTML = viewHomeProfLocked(); }
  }
  else if (v === 'prof') { setTop('Espace enseignant', cls + ' · ' + lessonLabel(curLesson()), `<button class="btn small" data-action="toStudent">🧒 Élève</button>`); m.innerHTML = viewProf(); afterProf(); }
  else if (v === 'prep') { m.innerHTML = viewPrep(); }
  else if (v === 'rank') { const g = myGroup(); setTop('Classement', g ? g.name + ' · ' + lessonLabel(curLesson()) : '', homeBtn); m.innerHTML = viewRank(); }
  else if (v === 'send') { setTop('Envoyer mes résultats', 'QR à scanner par l\'enseignant', homeBtn); m.innerHTML = viewSend(); afterSend(); }
  else if (v === 'receive') { setTop('Scanner la leçon', 'QR affiché par l\'enseignant', homeBtn); m.innerHTML = viewReceive(); afterReceive(); }
}

/* ---------------- Rôle / accueils ---------------- */
function viewRole() {
  return `<div class="home"><img class="home-logo" src="img/logo.webp" alt="N'EPS numérique – Boxe française Savate CA4">
    <div class="home-lesson"><div class="big">Cette tablette est…</div></div>
    <div class="home-grid two">
      <button class="home-btn hb-navy" data-action="setRole" data-r="prof"><span class="ico">👩‍🏫</span>Tablette enseignant<small>Préparer le cycle · QR de la leçon · récupérer · bilans</small></button>
      <button class="home-btn hb-blue" data-action="setRole" data-r="eleve"><span class="ico">🥊</span>Tablette élève<small>Scanner la leçon · assauts · envoyer les résultats</small></button>
    </div><p class="note">Les données déjà présentes sur la tablette sont conservées.</p></div>`;
}
const hasLesson = () => isProf() ? S.students.length > 0 : !!(ROOT.recv && ROOT.recv.cid === S.id);
const myGroup = () => groupById(ROOT.myGroup[S.id]);
function viewHomeEleve() {
  const n = curLesson(), L = lesson(n), g = myGroup(), pil = lessonPil(n);
  if (!hasLesson()) return `<div class="home"><img class="home-logo" src="img/logo.webp" alt="">
    <div class="home-lesson"><div class="big">Aucune leçon</div><div style="font-weight:700">Scanne le QR de la leçon affiché par ton enseignant.</div></div>
    <div class="home-grid one" style="max-width:420px;grid-template-columns:1fr"><button class="home-btn hb-orange" data-action="go" data-view="receive"><span class="ico">📷</span>Scanner la leçon</button></div></div>`;
  const groups = S.groups.filter(x => x.members.length);
  const todo = g ? (ensureSchedule(n, g), todoList(n, g.id)) : [];
  const done = g ? lessonAssaults(n, g.id).filter(a => a.status === 'done').length : 0;
  const live = ROOT.live && ROOT.live.cid === S.id;
  return `<div class="home">
    <div class="home-lesson"><div class="big">${esc(lessonLabel(n))}</div>
      ${pil ? `<div style="font-weight:800;margin-top:4px">🏛 Pilier : ${esc(pil.n)}</div>` : ''}
      ${!isProf() && ROOT.recv ? `<div class="note">Leçon scannée le ${new Date(ROOT.recv.at).toLocaleDateString('fr-FR')} à ${new Date(ROOT.recv.at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>` : ''}</div>
    <h3 style="margin:0">Notre groupe</h3>
    <div class="group-pick">${groups.map(x => `<button class="gp-btn ${g && g.id === x.id ? 'on' : ''}" style="${gStyle(x)}" data-action="pickGroup" data-g="${x.id}"><b>${gDot(x)}${esc(x.name)}</b><small>${presentMembers(n, x).length} présents · ${todoList(n, x.id).length} assaut(s) à faire</small></button>`).join('') || '<p class="note">Aucun groupe dans cette leçon.</p>'}</div>
    <div class="home-grid ${isProf() ? '' : 'four'}">
      ${live ? `<button class="home-btn hb-red" data-action="resume"><span class="ico">⏱</span>Reprendre l'assaut<small>${esc(ROOT.live.R.name)} – ${esc(ROOT.live.B.name)}</small></button>`
        : `<button class="home-btn hb-blue" data-action="openPrep" ${g ? '' : 'disabled'}><span class="ico">🥊</span>Assauts<small>${g ? `${done} fait(s) · ${todo.length} à faire` : 'Choisissez votre groupe'}</small></button>`}
      <button class="home-btn hb-green" data-action="go" data-view="rank" ${g ? '' : 'disabled'}><span class="ico">🏆</span>Classement<small>du groupe</small></button>
      ${isProf() ? '' : `<button class="home-btn hb-dark" data-action="go" data-view="send"><span class="ico">📤</span>Envoyer<small>les résultats au prof</small></button>`}
      <button class="home-btn hb-violet" data-action="openFree"><span class="ico">🤝</span>Assaut libre<small>hors tournoi</small></button>
    </div>
    ${isProf() ? '' : `<button class="btn" data-action="go" data-view="receive">📷 Scanner une nouvelle leçon</button>`}</div>`;
}
function viewHomeProfLocked() {
  return `<div class="home"><img class="home-logo" src="img/logo.webp" alt="N'EPS numérique – Boxe française Savate CA4">
    <div class="home-lesson"><div class="big">${esc(lessonLabel(curLesson()))}</div><div class="note">${S.students.length} élèves · ${S.groups.length} groupe(s)</div></div>
    <div class="home-grid two"><button class="home-btn hb-navy" data-action="openProf"><span class="ico">🔒</span>Espace enseignant</button>
      <button class="home-btn hb-blue" data-action="toStudent"><span class="ico">🥊</span>Espace élève<small>sur cette tablette</small></button></div></div>`;
}

/* ---------------- Espace enseignant ---------------- */
const PSECT = {
  prep:   {ico: '🛠', t: 'Préparer le cycle', tabs: [['classe', '👥 Classe & élèves'], ['groupes', '🎽 Groupes'], ['cycle', '⚙️ Paramètres du cycle'], ['piliers', '🏛 Piliers']]},
  jour:   {ico: '📅', t: 'Leçon du jour', tabs: [['appel', '✅ Appel'], ['assauts', '🥊 Assauts & rôles'], ['qr', '📲 QR de la leçon']]},
  recup:  {ico: '📥', t: 'Récupérer les résultats', tabs: []},
  bilans: {ico: '📊', t: 'Résultats et bilans', tabs: [['classements', '🏆 Classements'], ['stats', '📊 Stats élèves'], ['obs', '🏛 Bilan des piliers'], ['export', '📁 Export & réglages']]}};
const sectOf = tab => tab === 'recup' ? 'recup' : Object.keys(PSECT).find(k => PSECT[k].tabs.some(t => t[0] === tab));
function sectHeader(sec) {
  const P = PSECT[sec], N = SET().nbLessons, cur = curLesson();
  const cls = Object.values(ROOT.classes);
  return `<div class="btn-row" style="margin-bottom:10px"><button class="btn small" data-action="tab" data-tab="menu">← Menu enseignant</button></div>
    <div class="card strong"><div class="sect-head"><h2>${P.ico} ${P.t}</h2>
      <div class="class-chips">${cls.map(c => `<button class="class-chip ${c.id === S.id ? 'on' : ''}" data-action="selClass" data-id="${c.id}">🏫 ${esc(c.name)}</button>`).join('')}</div></div>
      ${sec === 'jour' || sec === 'recup' ? `<h3 style="margin-top:12px">Leçon du jour</h3><div class="lesson-picker">${Array.from({length: N}, (_, i) => i + 1).map(n => `<button class="lp ${n === cur ? 'on' : ''}" data-action="setCurrent" data-n="${n}">${n}</button>`).join('')}</div>
        <div class="note" style="font-weight:700">${esc(lesson(cur).title || 'Sans titre')}${lessonPil(cur) ? ' · 🏛 ' + esc(lessonPil(cur).n) : ''}</div>` : ''}</div>
    ${P.tabs.length ? `<div class="tabs">${P.tabs.map(([k, l]) => `<button class="tab ${UI.tab === k ? 'on' : ''}" data-action="tab" data-tab="${k}">${l}</button>`).join('')}</div>` : ''}`;
}
function viewProf() {
  const t = UI.tab || 'menu';
  if (t === 'menu') return profMenu();
  const sec = sectOf(t); if (!sec) { UI.tab = 'menu'; return profMenu(); }
  const body = {classe: profClasse, groupes: profGroupes, cycle: profCycle, piliers: profPiliers, appel: profAppel, assauts: profAssauts, qr: profQR,
    recup: profRecup, classements: profClassements, stats: profStats, obs: profObs, export: profExport}[t]();
  return sectHeader(sec) + body;
}
const appURL = () => location.href.split('#')[0].split('?')[0].replace(/index\.html$/, '');
function profMenu() {
  const n = curLesson(), done = S.assaults.filter(a => a.n === n && a.gid && a.status === 'done').length, all = S.assaults.filter(a => a.n === n && a.gid).length;
  return `<div class="card strong" style="text-align:center"><b style="font-size:20px">🏫 ${esc(S.name)}</b> · ${esc(lessonLabel(n))} · ${S.students.length} élèves · ${S.groups.length} groupe(s) · ${done}/${all} assauts reçus</div>
    <div class="pmenu">
      <button class="pm-btn" data-action="tab" data-tab="classe"><span class="step">1</span><span class="ico">🛠</span>Préparer le cycle<small>Classe · groupes · paramètres · piliers</small></button>
      <button class="pm-btn" data-action="tab" data-tab="appel"><span class="step">2</span><span class="ico">📅</span>Leçon du jour<small>Appel · assauts & rôles · 📲 QR de la leçon</small></button>
      <button class="pm-btn" data-action="tab" data-tab="recup"><span class="step">3</span><span class="ico">📥</span>Récupérer<small>Scanner les QR des tablettes élèves</small></button>
      <button class="pm-btn" data-action="tab" data-tab="classements"><span class="step">4</span><span class="ico">📊</span>Résultats et bilans<small>Classements · stats · piliers · export</small></button>
    </div>
    ${/^https?:/.test(location.protocol) ? `<div class="card app-qr" style="margin-top:14px"><img src="${BFQR.urlQR(appURL(), 5)}" alt="QR d'accès à l'application">
      <div><b>📲 Installer l'appli sur une tablette élève</b><div class="note">Scannez avec l'appareil photo de la tablette, ouvrez le lien, puis Partager → « Sur l'écran d'accueil ».</div><div class="app-url">${esc(appURL())}</div></div></div>` : ''}`;
}

/* ---- 1. Classe & élèves ---- */
function profClasse() {
  const f = S.students.filter(s => s.sexe === 'F').length;
  return `<div class="card"><div class="row"><label class="field grow">Nom de la classe<input type="text" data-field="className" value="${esc(S.name)}"></label>
      <label class="field grow">Nouvelle classe<input type="text" id="newClass" placeholder="ex. 2nde 4"></label>
      <button class="btn green" data-action="addClass" style="align-self:flex-end">＋ Ajouter</button>
      ${Object.keys(ROOT.classes).length > 1 ? `<button class="btn danger" data-action="delClass" style="align-self:flex-end">🗑 Supprimer « ${esc(S.name)} »</button>` : ''}</div></div>
    <div class="card strong"><h2>Importer la liste (Excel)</h2>
      <p class="note"><b>NOM Prénom</b> dans la colonne A, ou <b>NOM</b> en A et <b>Prénom</b> en B. Une colonne F/G (ou Sexe) est reconnue si elle existe. Les lignes de titre sont ignorées.</p>
      <div class="btn-row" style="margin-top:10px"><label class="btn primary file-btn">📂 Choisir un fichier (.xlsx, .csv)<input type="file" id="fileStudents" accept=".xlsx,.xls,.csv,.txt"></label></div></div>
    <div class="card"><h2>Ajouter un élève</h2><form class="row add-form" id="addForm">
      <input type="text" id="addNom" placeholder="NOM" autocomplete="off"><input type="text" id="addPrenom" placeholder="Prénom" autocomplete="off">
      <div class="seg" id="addSexe"><button type="button" data-v="G" class="on">Garçon</button><button type="button" data-v="F">Fille</button></div>
      <button class="btn green" type="submit">＋ Ajouter</button></form></div>
    <div class="card"><div class="row between"><h2 style="margin:0">${S.students.length} élève(s) <span class="muted" style="font:600 15px var(--font)">${S.students.length ? `· ${f} F · ${S.students.length - f} G` : ''}</span></h2>
      ${S.students.length ? '<button class="btn small danger" data-action="clearStudents">Vider la liste</button>' : ''}</div>
      <p class="note">Touchez G / F pour changer le dessin du combattant (garçon / fille).</p>
      <div class="tiles-grid">${sortedStudents().map(s => `<div class="stile"><button class="sx ${s.sexe}" data-action="toggleSex" data-sid="${s.id}" aria-label="Garçon ou fille">${s.sexe}</button><span class="nm"><b>${esc(s.nom)}</b> ${esc(s.prenom)}</span><button class="del" data-action="delStudent" data-sid="${s.id}" aria-label="Retirer">×</button></div>`).join('')}</div></div>`;
}

/* ---- Groupes colorés ---- */
function profGroupes() {
  const G = S.groups.length, placed = new Set(S.groups.flatMap(g => g.members));
  const pool = sortedStudents(S.students.filter(s => !placed.has(s.id)));
  const item = (id, g) => { const s = stu(id); return s ? `<div class="gitem ${UI.sel === id ? 'sel' : ''}" data-gid="${id}" ${g ? `style="--gc:${gcol(g.color).c}"` : ''}><span class="sx ${s.sexe}">${s.sexe}</span>${esc(s.prenom)} <b>${esc(s.nom)}</b></div>` : ''; };
  return `<div class="card strong"><h2>Groupes · ${esc(S.name)}</h2><h3>Nombre de groupes</h3>
      <div class="lesson-picker">${Array.from({length: 10}, (_, i) => i + 1).map(n => `<button class="lp small ${n === G ? 'on' : ''}" data-action="setGroups" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="btn-row" style="margin-top:12px"><button class="btn" data-action="autoGroups">🎲 Répartition automatique (mixte)</button><button class="btn ghost" data-action="clearGroups">Tout retirer</button></div>
      <p class="note">Glissez les tuiles élèves dans un groupe. Sans glisser : touchez une tuile puis le titre du groupe.</p></div>
    <div class="gzone pool" data-zone=""><h3 data-action="dropSel" data-zone="">Sans groupe <span class="meta">(${pool.length})</span></h3><div class="gitems">${pool.map(s => item(s.id)).join('') || '<span class="note">Tous les élèves sont placés.</span>'}</div></div>
    <div class="groups" style="margin-top:14px">${S.groups.map(g => { const t = timing(curLesson(), g.members.length);
      return `<div class="gzone colored" data-zone="${g.id}" style="${gStyle(g)}"><h3 data-action="dropSel" data-zone="${g.id}">${gDot(g)}${esc(g.name)}</h3>
        <div class="meta">${g.members.length} élèves · ${t.nA} assauts · reprises de ${fmt(t.rep)}</div>
        <div class="gcolors">${GCOLORS.map(c => `<button class="gc ${g.color === c.k ? 'on' : ''}" style="background:${c.c}" data-action="groupColor" data-g="${g.id}" data-c="${c.k}" aria-label="${c.n}"></button>`).join('')}</div>
        <div class="gitems">${g.members.map(id => item(id, g)).join('')}</div></div>`; }).join('')}</div>`;
}
function setGroupCount(n) {
  n = Math.max(1, Math.min(10, n));
  while (S.groups.length < n) { const i = S.groups.length; const used = new Set(S.groups.map(g => g.color)); S.groups.push({id: 'g' + uid(), name: 'Groupe ' + (i + 1), color: (GCOLORS.find(c => !used.has(c.k)) || GCOLORS[i % GCOLORS.length]).k, members: []}); }
  while (S.groups.length > n) { const g = S.groups.pop(); S.assaults = S.assaults.filter(a => !(a.gid === g.id && a.status !== 'done')); }
  save();
}

/* ---- Paramètres du cycle ---- */
function profCycle() {
  const s = SET(), N = s.nbLessons, cur = curLesson();
  const pilOpts = sel => `<option value="">— aucun —</option>` + ROOT.piliers.map(p => `<option value="${p.id}" ${sel === p.id ? 'selected' : ''}>${esc(p.n)}</option>`).join('');
  const biggest = Math.max(2, ...S.groups.map(g => g.members.length));
  let rows = '';
  for (let n = 1; n <= N; n++) {
    const L = lesson(n), ls = LS(n), t = timing(n, biggest);
    rows += `<div class="lrow"><div class="lp ${n === cur ? 'on' : ''}">${n}</div><div class="lrow-main">
      <label>Titre de la leçon<input type="text" data-field="lTitle" data-n="${n}" value="${esc(L.title)}" placeholder="${n === 1 ? 'ex. Découverte, règles, sécurité' : n === N ? 'ex. Tournoi final' : 'ex. Tournoi poules'}"></label>
      <label>🏛 Pilier<select data-field="lPil" data-n="${n}">${pilOpts(lessonPil(n)?.id)}</select></label>
      <label>Tournoi (min)<input type="number" min="0" max="240" data-field="lTotal" data-n="${n}" value="${ls.totalMin}"></label>
      <label>Reprises<input type="number" min="1" max="5" data-field="lRep" data-n="${n}" value="${ls.reprises}"></label>
      <div class="lrow-info">Groupe de ${biggest} : ${t.nA} assauts de ${t.R} × ${fmt(t.rep)} · ${t.nA ? fmtLong(t.total) : '—'}${t.warn ? ` · <b style="color:var(--warn)">${t.warn}</b>` : ''}</div></div></div>`;
  }
  return `<div class="card strong"><h2>Le cycle</h2>
      <div class="cgrid">
        <label>Nombre de leçons<div class="stepper"><button data-action="nbLessons" data-d="-1">−</button><b>${N}</b><button data-action="nbLessons" data-d="1">+</button></div></label>
        <label>Durée du tournoi par défaut (min)<input type="number" min="5" max="240" data-field="set" data-k="totalMin" value="${s.totalMin}"></label>
        <label>Reprises par assaut<input type="number" min="1" max="5" data-field="set" data-k="reprises" value="${s.reprises}"></label>
        <label>Récupération (s)<input type="number" min="0" max="120" step="5" data-field="set" data-k="recupSec" value="${s.recupSec}"></label>
        <label>Changement entre assauts (s)<input type="number" min="0" max="300" step="5" data-field="set" data-k="transitionSec" value="${s.transitionSec}"></label>
        <label>Durée de reprise<select data-field="set" data-k="mode"><option value="auto" ${s.mode === 'auto' ? 'selected' : ''}>Calculée selon la durée du tournoi</option><option value="manuel" ${s.mode === 'manuel' ? 'selected' : ''}>Fixe</option></select></label>
        <label ${s.mode === 'manuel' ? '' : 'hidden'}>Reprise fixe (s)<input type="number" min="20" max="300" step="5" data-field="set" data-k="manualSec" value="${s.manualSec}"></label>
      </div>
      <p class="note">En mode calculé, chaque groupe reçoit la durée de reprise qui permet de faire tous ses assauts dans le temps du tournoi (arrondie à 5 s, entre 30 s et 3 min).</p></div>
    <div class="card"><h2>Les leçons</h2><p class="note">Titre, pilier d'apprentissage observé, durée du tournoi et nombre de reprises de chaque leçon, réglés à l'avance.</p>${rows}</div>
    <div class="card"><h2>🎯 Arme bonus (temps de coaching)</h2>
      <p class="note">Pendant la récupération entre deux reprises, le coach de chaque tireur choisit avec lui une arme bonus parmi celles cochées. Chaque touche valable avec cette arme rapporte des points en plus à la reprise suivante.</p>
      <div class="cgrid" style="margin-top:10px">
        <label>Arme bonus<select data-field="set" data-k="bonusOn"><option value="1" ${s.bonusOn ? 'selected' : ''}>Activée</option><option value="" ${s.bonusOn ? '' : 'selected'}>Désactivée</option></select></label>
        <label>Points en plus par touche<input type="number" min="1" max="5" data-field="set" data-k="bonusPts" value="${s.bonusPts}"></label>
        <div style="grid-column:span 2"><b style="font-size:14px">Armes proposées</b><div class="row" style="margin-top:6px">${COUP_KEYS.map(c => `<label class="chk"><input type="checkbox" data-field="bonusArme" data-c="${c}" ${s.bonusArmes.includes(c) ? 'checked' : ''}> ${COUPS[c].l} <span class="note">(${COUPS[c].w})</span></label>`).join('')}</div></div>
      </div></div>
    <div class="card"><h2>Barème</h2><div class="table-wrap"><table class="bareme"><thead><tr><th></th><th class="c">Visage</th><th class="c">Tronc</th><th class="c">Ligne basse</th><th class="c">Bras / garde</th></tr></thead><tbody>
      ${['poing', 'pied'].map(w => `<tr><th>${w === 'poing' ? 'Poing' : 'Pied'}</th>${['tete', 'tronc', 'bas', 'garde'].map(c => `<td class="c"><input type="number" min="0" max="10" data-field="bareme" data-w="${w}" data-c="${c}" value="${s.bareme[w][c]}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="cgrid" style="margin-top:12px">
        <label>Frappe trop forte (pts retirés)<input type="number" min="0" max="5" data-field="set" data-k="penalite" value="${s.penalite}"></label>
        <label>Bonus enchaînement réussi<input type="number" min="0" max="5" data-field="set" data-k="bonusEnch" value="${s.bonusEnch}"></label>
        <label>Classement V / N / D<span class="row" style="gap:4px"><input type="number" style="width:60px" min="0" max="10" data-field="set" data-k="ptsV" value="${s.ptsV}"><input type="number" style="width:60px" min="0" max="10" data-field="set" data-k="ptsN" value="${s.ptsN}"><input type="number" style="width:60px" min="0" max="10" data-field="set" data-k="ptsD" value="${s.ptsD}"></span></label>
        <label>Assaut suivant automatique (s)<input type="number" min="3" max="60" data-field="set" data-k="autoNext" value="${s.autoNext}"></label>
        <label style="grid-column:span 2">Geste droit / courbe : ${Math.round(s.seuil * 100)} %<input type="range" min="0.08" max="0.40" step="0.01" data-field="set" data-k="seuil" value="${s.seuil}"><span class="note">À gauche, le moindre arrondi devient une courbe.</span></label>
      </div></div>`;
}

/* ---- Piliers ---- */
function profPiliers() {
  const used = id => Object.values(S.lessons).some(L => L.pil?.id === id);
  return `<div class="card strong"><h2>🏛 Piliers d'apprentissage</h2><p class="note">Pendant la validation de chaque assaut, le juge de points observe le pilier de la leçon pour chaque tireur : Jamais, Parfois, Souvent, Toujours. La leçon suivante sur le même pilier, l'élève reçoit un conseil sur son critère le moins réussi.</p></div>
    <div class="pil-list">${ROOT.piliers.map(p => `<div class="pil-item"><div class="row"><input type="text" class="grow" style="font-weight:800" data-field="pilName" data-id="${p.id}" value="${esc(p.n)}" placeholder="Nom du pilier">
        ${used(p.id) ? '<span class="pill">Utilisé dans le cycle</span>' : ''}<button class="btn small danger" data-action="pilDel" data-id="${p.id}">🗑</button></div>
      <div class="pil-cr">${Array.from({length: 4}, (_, i) => `<input type="text" data-field="pilCr" data-id="${p.id}" data-i="${i}" value="${esc(p.cr[i] || '')}" placeholder="Critère ${i + 1}${i ? ' (facultatif)' : ''}">`).join('')}</div></div>`).join('')}</div>
    <div class="btn-row" style="margin-top:12px"><button class="btn green" data-action="pilAdd">＋ Nouveau pilier</button><button class="btn ghost" data-action="pilReset">Piliers par défaut</button></div>`;
}
function refreshPilSnapshots(id) {
  const p = pilById(id);
  Object.values(ROOT.classes).forEach(c => Object.values(c.lessons || {}).forEach(L => { if (L.pil && L.pil.id === id) L.pil = snapPil(p); }));
}

/* ---- 2. Leçon du jour ---- */
function profAppel() {
  const n = curLesson(), L = lesson(n);
  const abs = S.students.filter(s => L.att[s.id] === 'abs').length, inap = S.students.filter(s => L.att[s.id] === 'inap').length;
  return `<div class="card"><b>${S.students.length - abs - inap} présent(s)</b> · ${abs} absent(s) · ${inap} inapte(s). <span class="note">Les absents et inaptes sont retirés des assauts de la leçon ; un inapte peut rester juge.</span></div>
    <div class="att-grid">${sortedStudents().map(s => { const a = L.att[s.id], g = groupOf(s.id);
      return `<div class="att-tile ${a || ''}" ${g ? `style="--gc:${gcol(g.color).c}"` : ''}><b>${esc(fullName(s))}</b><span class="note">${g ? esc(g.name) : 'Sans groupe'}</span>
        <div class="btn-row"><button class="btn small ${a === 'abs' ? 'abs-on' : ''}" data-action="att" data-sid="${s.id}" data-v="abs">Absent</button><button class="btn small ${a === 'inap' ? 'inap-on' : ''}" data-action="att" data-sid="${s.id}" data-v="inap">Inapte</button></div></div>`; }).join('')}</div>`;
}
function profAssauts() {
  const n = curLesson();
  if (!S.groups.some(g => g.members.length)) return `<div class="card">Aucun groupe. <button class="btn small" data-action="tab" data-tab="groupes">🎽 Créer les groupes</button></div>`;
  S.groups.forEach(g => ensureSchedule(n, g));
  return `<div class="card"><p class="note" style="margin:0">Ordre des assauts et rôles de chaque groupe pour la leçon ${n}. Les rôles tournent pour que chacun soit toujours occupé : arbitre (juge central), coach rouge et coach bleu (juges de coin, ils saisissent les touches de leur tireur sur la tablette). Au-delà de 5 élèves présents, les autres sont au repos. Les élèves peuvent les modifier avant chaque assaut.</p>
      <div class="btn-row" style="margin-top:10px"><button class="btn small" data-action="reroll">🔄 Recalculer les rôles des assauts à faire</button></div></div>` +
    S.groups.filter(g => g.members.length).map(g => { const list = lessonAssaults(n, g.id), t = timing(n, presentMembers(n, g).length);
      return `<div class="card gzone colored" style="${gStyle(g)};margin-bottom:14px"><div class="row between"><h3>${gDot(g)}${esc(g.name)}</h3><span class="pill">${list.filter(a => a.status === 'done').length}/${list.length} · ${t.R} × ${fmt(t.rep)}${t.warn ? ' · ⚠ ' + t.warn : ''}</span></div>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>Rouge</th><th>Bleu</th><th>⚖️ Arbitre</th><th>📋 Coach rouge</th><th>📋 Coach bleu</th><th>💤 Repos</th><th class="n">Score</th></tr></thead><tbody>
        ${list.map((a, i) => `<tr><td>${i + 1}</td><td class="wR">${esc(nameOf(a.red))}</td><td class="wB">${esc(nameOf(a.blue))}</td><td>${esc(nameOf(a.jc) || '—')}</td><td class="wR" style="font-weight:600">${esc(nameOf(a.jp?.[0]) || '—')}</td><td class="wB" style="font-weight:600">${esc(nameOf(a.jp?.[1]) || '—')}</td><td class="note">${restOf(a).map(nameOf).map(esc).join(', ') || '—'}</td>
          <td class="n">${a.status === 'done' ? `<b>${a.scoreR} – ${a.scoreB}</b>` : '<span class="status">à faire</span>'}</td></tr>`).join('')}</tbody></table></div></div>`; }).join('');
}
function profQR() {
  const n = curLesson(), L = lesson(n), abs = S.students.filter(s => L.att[s.id]).length;
  return `<div class="card strong"><h2>📲 QR de la leçon ${n}</h2>
    <p class="note" style="font-weight:700">${esc(L.title || 'Sans titre')} · ${S.students.length} élèves · ${abs} absent(s)/inapte(s) · ${S.groups.length} groupe(s)${lessonPil(n) ? ' · 🏛 ' + esc(lessonPil(n).n) : ''}</p>
    <div class="advice warn">Faites l'appel <b>avant</b> d'afficher ce QR. Sur chaque tablette élève : <b>📷 Scanner la leçon</b>, puis choisir le groupe.</div>
    <div id="qrLesson" style="margin-top:14px">Préparation…</div></div>`;
}

/* ---- 3. Récupérer ---- */
function profRecup() {
  return `<div class="recup-grid"><div class="card strong"><h2>📥 Scanner les tablettes élèves</h2>
      <p class="note">Sur chaque tablette élève : <b>📤 Envoyer</b>, puis scannez le QR ici.</p><div id="scanArea"></div>
      <div class="btn-row center" style="margin-top:10px"><label class="btn file-btn">📂 Importer un fichier (.json)<input type="file" id="fileSync" accept=".json,application/json"></label></div></div>
    <div class="card strong" id="waitBox">${waitList()}</div></div>`;
}
function waitList() {
  const n = curLesson();
  return `<h2>Leçon ${n} · assauts reçus</h2>` + S.groups.filter(g => g.members.length).map(g => {
    ensureSchedule(n, g); const list = lessonAssaults(n, g.id), d = list.filter(a => a.status === 'done').length, pc = list.length ? Math.round(d / list.length * 100) : 0;
    return `<div class="wait-g" style="${gStyle(g)}"><b>${esc(g.name)}</b> · ${d} / ${list.length} assauts<div class="prog"><i style="width:${pc}%"></i></div></div>`; }).join('') +
    (S.assaults.some(a => a.n === n && !a.gid) ? `<p class="note">+ ${S.assaults.filter(a => a.n === n && !a.gid).length} assaut(s) libre(s)</p>` : '');
}

/* ---- 4. Bilans ---- */
function lessonPickerSmall(cur, action) { return `<div class="lesson-picker" style="margin-bottom:12px">${Array.from({length: SET().nbLessons}, (_, i) => i + 1).map(n => `<button class="lp small ${n === cur ? 'on' : ''}" data-action="${action}" data-n="${n}">${n}</button>`).join('')}</div>`; }
function profClassements() {
  const n = UI.rankN || curLesson();
  return lessonPickerSmall(n, 'rankN') + S.groups.filter(g => g.members.length || lessonAssaults(n, g.id).length).map(g => {
    const list = lessonAssaults(n, g.id);
    return `<div class="card gzone colored" style="${gStyle(g)};margin-bottom:14px"><div class="row between"><h3>${gDot(g)}${esc(g.name)}</h3><span class="pill">${list.filter(a => a.status === 'done').length} / ${list.length} assauts</span></div>
      ${rankingTable(n, g)}
      <details style="margin-top:8px"><summary style="font-weight:800;cursor:pointer">Assauts</summary><div class="table-wrap"><table><tbody>${list.map((a, i) => `<tr><td>${i + 1}</td><td class="${a.winner === 'R' ? 'wR' : ''}">${esc(nameOf(a.red))}</td><td class="${a.winner === 'B' ? 'wB' : ''}">${esc(nameOf(a.blue))}</td>
        <td class="n">${a.status === 'done' ? `<b>${a.scoreR} – ${a.scoreB}</b>` : '<span class="status">à faire</span>'}</td><td class="n">${a.status === 'done' ? `<button class="btn small" data-action="replay" data-id="${a.id}">Rejouer</button>` : ''}</td></tr>`).join('')}</tbody></table></div></details></div>`; }).join('');
}
function profStats() {
  const n = UI.statN || 0;
  const rows = sortedStudents().map(s => ({s, st: studentStats(s.id, n || null)}));
  return `<div class="lesson-picker" style="margin-bottom:12px"><button class="lp small ${!n ? 'on' : ''}" style="width:auto;padding:0 12px" data-action="statN" data-n="0">Cycle</button>${Array.from({length: SET().nbLessons}, (_, i) => i + 1).map(k => `<button class="lp small ${k === n ? 'on' : ''}" data-action="statN" data-n="${k}">${k}</button>`).join('')}</div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Élève</th><th class="n">Assauts</th><th class="n">V-N-D</th><th class="n">Pts</th><th class="n">Coups</th><th class="n">Touches</th><th class="n">Effic.</th><th class="n">Dir.</th><th class="n">Cro.</th><th class="n">Cha.</th><th class="n">Fou.</th><th class="n">Visage</th><th class="n">Trop fort</th><th class="n">Ench.</th><th class="n">Arbitre</th><th class="n">Coach</th><th class="n">Repos</th><th class="n">Bonus</th></tr></thead><tbody>
    ${rows.map(({s, st}) => `<tr><td>${esc(fullName(s))}</td><td class="n">${st.J}</td><td class="n">${st.V}-${st.N}-${st.D}</td><td class="n"><b>${st.pm}</b></td><td class="n">${st.tent}</td><td class="n">${st.valid}</td><td class="n">${st.tent ? Math.round(100 * st.valid / st.tent) + ' %' : '—'}</td>
      ${COUP_KEYS.map(c => `<td class="n">${st.coups[c].v}/${st.coups[c].t}</td>`).join('')}<td class="n">${st.cats.tete}</td><td class="n">${st.trop}</td><td class="n">${st.ok}/${st.tries}</td><td class="n">${st.jc}</td><td class="n">${st.jp}</td><td class="n">${st.rest}</td><td class="n">${st.bonus}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function profObs() {
  const N = SET().nbLessons, byPil = {};
  for (let n = 1; n <= N; n++) { const p = lessonPil(n); if (p) (byPil[p.id] = byPil[p.id] || {p, ls: []}).ls.push(n); }
  const list = Object.values(byPil);
  if (!list.length) return `<div class="card">Aucun pilier n'est associé aux leçons. <button class="btn small" data-action="tab" data-tab="cycle">⚙️ Paramètres du cycle</button></div>`;
  return list.map(({p, ls}) => `<div class="card"><h2>🏛 ${esc(p.n)}</h2><div class="table-wrap"><table><thead><tr><th>Élève</th><th>Critère</th>${ls.map(n => `<th class="c">L${n}</th>`).join('')}</tr></thead><tbody>
    ${sortedStudents().map(s => { const obs = ls.map(n => obsAgg(n, s.id)); if (!obs.some(Boolean)) return '';
      return p.cr.map((c, i) => `<tr>${i === 0 ? `<td rowspan="${p.cr.length}"><b>${esc(fullName(s))}</b></td>` : ''}<td class="note">${esc(c)}</td>${obs.map(o => `<td class="c">${obsChip(o && o[i])}</td>`).join('')}</tr>`).join(''); }).join('') || `<tr><td colspan="${2 + ls.length}" class="note">Pas encore d'observation.</td></tr>`}</tbody></table></div></div>`).join('');
}
function profExport() {
  return `<div class="card strong"><h2>Export Excel</h2><p class="note">Classements de chaque leçon, assauts, statistiques de chaque élève, toutes les touches, bilan des piliers et paramètres du cycle.</p>
      <button class="btn green" data-action="exportXlsx">📊 Exporter tous les résultats (.xlsx)</button></div>
    <div class="card"><h2>Sauvegarde complète</h2><div class="btn-row"><button class="btn" data-action="backup">💾 Sauvegarder (.json)</button>
      <label class="btn file-btn">♻️ Restaurer<input type="file" id="fileRestore" accept=".json,application/json"></label></div></div>
    <div class="card"><h2>Code enseignant</h2><div class="row"><label class="field">Nouveau code (4 chiffres)<input type="password" inputmode="numeric" maxlength="4" id="newPin" style="max-width:180px"></label>
      <button class="btn" data-action="setPin" style="align-self:flex-end">Changer</button></div></div>
    <div class="card"><h2>Rôle de cette tablette</h2><button class="btn small" data-action="setRole" data-r="eleve">🥊 Passer en tablette élève</button></div>
    <div class="card"><h2>Réinitialiser</h2><div class="btn-row"><button class="btn small ghost" data-action="clearResults">Effacer les résultats de ${esc(S.name)}</button><button class="btn small danger" data-action="resetClass">Réinitialiser ${esc(S.name)}</button></div>
      <p class="note">Version ${APP_VERSION} · appareil ${esc(ROOT.deviceId)}</p></div>`;
}

/* =====================================================================
   ESPACE ÉLÈVE
   ===================================================================== */
function judgePool(n, g) { return g ? g.members.filter(id => stu(id) && lesson(n).att[id] !== 'abs') : sortedStudents().map(s => s.id); }
function openPrep(free) {
  if (ROOT.live) return openFight();
  const n = curLesson(), g = myGroup();
  if (free) UI.P = {free: true, gid: g ? g.id : null, aid: null, red: '', blue: '', jc: '', jp: [], guest: {R: {sexe: 'G'}, B: {sexe: 'F'}}};
  else {
    if (!g) return toast('Choisissez d\'abord votre groupe');
    ensureSchedule(n, g);
    const a = todoList(n, g.id)[0];
    UI.P = a ? {free: false, gid: g.id, aid: a.id, red: a.red, blue: a.blue, jc: a.jc || '', jp: [...(a.jp || [])], guest: {R: {sexe: 'G'}, B: {sexe: 'G'}}} : {free: false, gid: g.id, finished: true};
  }
  go('prep');
}
const opts = (sel, pool, empty) => `<option value="">${empty}</option>` + pool.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(nameOf(id))}</option>`).join('');
function viewPrep() {
  const P = UI.P, n = curLesson(), g = groupById(P.gid), pil = lessonPil(n);
  setTop(P.free ? 'Assaut libre' : (g ? g.name : 'Assauts'), lessonLabel(n), `<button class="btn small" data-action="home">⌂ Accueil</button>`);
  if (P.finished) return `<div class="card strong" style="${gStyle(g)}"><h2>🏁 Tous les assauts du ${esc(g.name)} sont terminés</h2><p class="note">Classement de la leçon. Pensez à envoyer les résultats au prof.</p>${rankingTable(n, g)}
    <div class="btn-row" style="margin-top:12px">${isProf() ? '' : '<button class="btn green" data-action="go" data-view="send">📤 Envoyer les résultats</button>'}<button class="btn" data-action="home">⌂ Accueil</button></div></div>`;
  const fightPool = P.free ? sortedStudents().map(s => s.id) : presentMembers(n, g).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'fr'));
  const jPool = judgePool(n, P.free ? null : g).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'fr'));
  const all = g && !P.free ? lessonAssaults(n, g.id) : [], done = all.filter(a => a.status === 'done').length;
  const t = timing(n, P.free ? 0 : presentMembers(n, g).length);
  const card = side => { const id = side === 'R' ? P.red : P.blue, sx = stu(id)?.sexe || P.guest[side].sexe;
    return `<div class="vs-card ${side === 'R' ? 'red' : 'blue'}"><span class="corner">Coin ${side === 'R' ? 'rouge' : 'bleu'}</span>
      <div class="vs-figure">${BFDraw.fighter({sexe: sx, color: COL[side].c, dark: COL[side].d, mirror: side === 'R'})}</div>
      <select data-field="prep" data-k="${side === 'R' ? 'red' : 'blue'}">${opts(id, fightPool, P.free ? 'Choisir le tireur' : '—')}</select>
      <div class="seg small">${['G', 'F'].map(v => `<button class="${sx === v ? 'on' : ''}" data-action="prepSex" data-side="${side}" data-v="${v}">${v === 'G' ? 'Garçon' : 'Fille'}</button>`).join('')}</div>
      ${id ? adviceHTML(n, id) : ''}</div>`; };
  const rest = jPool.filter(id => ![P.red, P.blue, P.jc, P.jp[0], P.jp[1]].includes(id));
  const next = g && !P.free ? todoList(n, g.id).filter(a => a.id !== P.aid).slice(0, 4) : [];
  return `<div class="prep-body"><div class="prep-main card ${g && !P.free ? 'gzone colored' : ''}" style="${g ? gStyle(g) : ''}">
      <div class="row between"><span class="pill">${gDot(g)}${P.free ? 'Assaut libre' : `Assaut ${done + 1} / ${all.length}`}</span><span class="note" style="font-weight:700">${t.R} reprise${t.R > 1 ? 's' : ''} de ${fmt(t.rep)}${t.R > 1 ? ` · récupération ${fmt(t.rec)}` : ''}</span></div>
      <div class="vs">${card('R')}<div class="vs-mid"><span>VS</span></div>${card('B')}</div>
      <div class="judges"><label>⚖️ Arbitre (juge central)<select data-field="prep" data-k="jc">${opts(P.jc, jPool, '— aucun —')}</select></label>
        <label class="wR">📋 Coach rouge (juge de coin)<select data-field="prep" data-k="jp" data-i="0">${opts(P.jp[0] || '', jPool, '— aucun —')}</select></label>
        <label class="wB">📋 Coach bleu (juge de coin)<select data-field="prep" data-k="jp" data-i="1">${opts(P.jp[1] || '', jPool, '— aucun —')}</select></label></div>
      ${rest.length ? `<p class="note" style="margin:0">💤 Repos : <b>${rest.map(nameOf).map(esc).join(', ')}</b></p>` : ''}
      <p class="note" style="margin:0">Les coachs saisissent les touches de leur tireur (rouge à gauche, bleu à droite) et le conseillent pendant la récupération.</p>
      <div class="row between"><button class="btn ghost" data-action="prepSkip" ${P.free ? 'hidden' : ''}>Passer cet assaut</button><button class="btn go" data-action="prepStart">🥊 Commencer l'assaut</button></div></div>
    <aside>${pil ? `<div class="pil-card"><b>🏛 Pilier : ${esc(pil.n)}</b><ul>${pil.cr.map(c => `<li>${esc(c)}</li>`).join('')}</ul><div class="note">Chaque coach l'observe chez son tireur.</div></div>` : ''}
      ${next.length ? `<div class="card" style="margin-top:14px"><h3>À suivre</h3><ol class="next-list">${next.map(a => `<li><span class="wR">${esc(nameOf(a.red))}</span> – <span class="wB">${esc(nameOf(a.blue))}</span><div class="note">⚖️ ${esc(nameOf(a.jc) || '—')} · 📋 ${(a.jp || []).filter(Boolean).map(nameOf).map(esc).join(' / ') || '—'}</div></li>`).join('')}</ol></div>` : ''}
      ${g && !P.free ? `<div class="card" style="margin-top:14px"><h3>Classement</h3>${rankingTable(n, g, true)}</div>` : ''}</aside></div>`;
}
function startAssault() {
  const P = UI.P, n = curLesson();
  audio();
  if (!P.red || !P.blue) return toast('Choisissez les deux tireurs');
  if (P.red === P.blue) return toast('Choisissez deux tireurs différents');
  const roles = [P.jc, ...P.jp].filter(Boolean);
  if (roles.some(r => r === P.red || r === P.blue)) return toast('Un tireur ne peut pas être arbitre ou coach de son propre assaut');
  if (new Set(roles).size !== roles.length) return toast('Un élève ne peut avoir qu\'un seul rôle');
  const g = groupById(P.gid);
  if (!P.free) {
    const a = S.assaults.find(x => x.id === P.aid);
    if (pairKey(a.red, a.blue) !== pairKey(P.red, P.blue)) {
      const other = todoList(n, g.id).find(x => x.id !== a.id && pairKey(x.red, x.blue) === pairKey(P.red, P.blue));
      if (!other) return toast('Ces deux tireurs ont déjà fait leur assaut');
      [other.red, other.blue] = [a.red, a.blue];
    }
    Object.assign(a, {red: P.red, blue: P.blue, jc: P.jc, jp: [P.jp[0] || '', P.jp[1] || '']});
  }
  const t = timing(n, P.free ? 0 : presentMembers(n, g).length);
  const fighter = (id, side) => { const s = stu(id); return {id, name: fullName(s), sexe: s ? s.sexe : P.guest[side].sexe}; };
  ROOT.live = {cid: S.id, n, aid: P.aid, gid: P.gid, free: P.free, R: fighter(P.red, 'R'), B: fighter(P.blue, 'B'), jc: P.jc, jp: [P.jp[0] || '', P.jp[1] || ''],
    events: [], ench: {R: null, B: null}, bonus: {R: null, B: null}, bonusPick: {R: 0, B: 0}, pil: lessonPil(n), obs: {R: [], B: []},
    clock: {phase: 'ready', rep: 1, R: t.R, repSec: t.rep, recSec: t.rec, remaining: t.rep * 1000, endAt: null}, startedAt: Date.now()};
  save(); openFight();
}
function viewRank() {
  const n = curLesson(), g = myGroup(); if (!g) return '<div class="card">Choisissez d\'abord votre groupe.</div>';
  const list = lessonAssaults(n, g.id);
  return `<div class="card gzone colored" style="${gStyle(g)}"><h3>${gDot(g)}${esc(g.name)} · ${esc(lessonLabel(n))}</h3>${rankingTable(n, g)}</div>
    <div class="card"><h3>Assauts</h3><div class="table-wrap"><table><tbody>${list.map((a, i) => `<tr><td>${i + 1}</td><td class="${a.winner === 'R' ? 'wR' : ''}">${esc(nameOf(a.red))}</td><td class="${a.winner === 'B' ? 'wB' : ''}">${esc(nameOf(a.blue))}</td><td>⚖️ ${esc(nameOf(a.jc) || '—')} · 📋 ${(a.jp || []).filter(Boolean).map(nameOf).map(esc).join(' / ') || '—'}</td>
      <td class="n">${a.status === 'done' ? `<b>${a.scoreR} – ${a.scoreB}</b>` : '<span class="status">à faire</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function viewSend() {
  const n = curLesson(), list = S.assaults.filter(a => a.n === n && a.status === 'done' && a.events && a.d === ROOT.deviceId);
  return `<div class="card strong" style="text-align:center"><b style="font-size:20px">${list.length} assaut(s) terminé(s) sur cette tablette · ${esc(lessonLabel(n))}</b>
      <p class="note">Montrez ce QR à l'enseignant (📥 Récupérer). Vous pouvez l'envoyer plusieurs fois : rien n'est compté en double.</p></div>
    <div id="qrSend">Préparation…</div>
    <div class="btn-row center" style="margin-top:12px"><button class="btn" data-action="fileResults">📤 Partager en fichier (AirDrop…) à la place</button></div>`;
}
async function afterSend() { const area = $('#qrSend'); const payload = await BFQR.encode(resultsPacket()); if (area && UI.view === 'send') BFQR.showSeries(BFQR.chunk(payload, 'R', 360), area, ''); }
function viewReceive() {
  return `<div class="card strong" style="text-align:center"><b style="font-size:20px">📷 Scanne le QR de la leçon affiché par l'enseignant</b></div><div id="scanArea"></div>
    <div class="btn-row center" style="margin-top:12px"><label class="btn file-btn">📂 Importer un fichier (.json)<input type="file" id="fileSync" accept=".json,application/json"></label></div>`;
}
function afterReceive() {
  BFQR.start($('#scanArea'), ['L'], async p => { applyLesson(p); toast('✓ Leçon reçue : choisissez votre groupe'); go('home'); return 'done'; }, 'Ce QR est destiné à la tablette enseignant (📥 Récupérer).');
}

/* =====================================================================
   PAQUETS QR
   ===================================================================== */
const SET_KEYS = ['bareme', 'penalite', 'bonusEnch', 'seuil', 'ptsV', 'ptsN', 'ptsD', 'autoNext', 'recupSec', 'transitionSec', 'mode', 'manualSec', 'bonusOn', 'bonusPts', 'bonusArmes', 'totalMin', 'reprises'];
function lessonPacket(n) {
  S.groups.forEach(g => ensureSchedule(n, g));
  const L = lesson(n), ls = LS(n), set = {}; SET_KEYS.forEach(k => set[k] = SET()[k]);
  const adv = {}; S.students.forEach(s => { const a = adviceFor(n, s.id); if (a) adv[s.id] = [a.k, a.i, a.v]; });
  return {k: 'L', v: 3, cid: S.id, cn: S.name, n, N: SET().nbLessons, title: L.title, pil: L.pil || null, tm: ls.totalMin, rp: ls.reprises, set,
    st: S.students.map(s => [s.id, s.nom, s.prenom, s.sexe]), gr: S.groups.map(g => [g.id, g.name, g.color, g.members]), att: L.att, adv,
    as: S.assaults.filter(a => a.n === n && a.gid).map(a => a.status === 'done' ? [a.id, a.gid, a.red, a.blue, a.order, a.jc, a.jp, 1, a.scoreR, a.scoreB, a.winner] : [a.id, a.gid, a.red, a.blue, a.order, a.jc, a.jp, 0])};
}
function applyLesson(p) {
  if (p.k !== 'L') throw new Error('Ce QR n\'est pas un QR de leçon');
  let c = ROOT.classes[p.cid];
  if (!c) { c = normClass(newClass(p.cn, p.cid)); ROOT.classes[p.cid] = c; }
  useClass(p.cid);
  c.name = p.cn; c.students = p.st.map(([id, nom, prenom, sexe]) => ({id, nom, prenom, sexe}));
  c.groups = p.gr.map(([id, name, color, members]) => ({id, name, color, members}));
  Object.assign(c.settings, p.set, {nbLessons: p.N, current: p.n});
  const L = lesson(p.n); Object.assign(L, {title: p.title || '', pil: p.pil, totalMin: p.tm, reprises: p.rp, att: p.att || {}, adv: p.adv || {}});
  const mine = new Map(c.assaults.filter(a => a.n === p.n && a.gid && a.status === 'done' && a.d === ROOT.deviceId).map(a => [a.id, a]));
  c.assaults = c.assaults.filter(a => a.n !== p.n || !a.gid);
  for (const [id, gid, red, blue, order, jc, jp, done, sR, sB, w] of p.as) {
    if (mine.has(id)) { c.assaults.push(mine.get(id)); mine.delete(id); continue; }
    c.assaults.push({id, n: p.n, gid, red, blue, order, jc, jp: jp || [], status: done ? 'done' : 'todo', ...(done ? {scoreR: sR, scoreB: sB, winner: w, events: []} : {})});
  }
  mine.forEach(a => c.assaults.push(a));
  ROOT.recv = {cid: p.cid, n: p.n, at: Date.now()};
  if (!groupById(ROOT.myGroup[c.id])) delete ROOT.myGroup[c.id];
  save();
}
function packEvents(a) {
  const m = {}; let k = 0;
  return (a.events || []).map(e => [e.t === 'R' ? 0 : 1, e.w === 'poing' ? 0 : 1, COUP_KEYS.indexOf(e.c), e.z ? ZONES.indexOf(e.z) : -1, SIDES.indexOf(e.s), e.trop ? 1 : 0, e.ench ? (m[e.ench] = m[e.ench] || ++k) : 0, e.rep, Math.round((e.ts - a.startedAt) / 1000), e.bx || 0]);
}
const unpackEvents = (arr, start) => (arr || []).map((x, i) => ({id: 'e' + i, t: x[0] ? 'B' : 'R', w: x[1] ? 'pied' : 'poing', c: COUP_KEYS[x[2]], z: x[3] >= 0 ? ZONES[x[3]] : null, s: x[4] >= 0 ? SIDES[x[4]] : null,
  cat: x[3] >= 0 ? CAT[ZONES[x[3]]] : 'manque', trop: !!x[5], ench: x[6] ? 'x' + x[6] : null, rep: x[7], ts: start + x[8] * 1000, bx: x[9] || 0}));
function resultsPacket() {
  const n = curLesson();
  const as = S.assaults.filter(a => a.n === n && a.status === 'done' && a.events && a.d === ROOT.deviceId).map(a => [a.id, a.gid || '', a.red, a.blue, a.order || 0, a.jc || '', a.jp || [], a.scoreR, a.scoreB, a.winner,
    a.repSec, a.reprises, Math.round(a.startedAt / 1000), Math.round(a.endedAt / 1000), packEvents(a), a.obs || null, a.pil || '', a.names?.R || '', a.names?.B || '']);
  return {k: 'R', v: 3, cid: S.id, n, d: ROOT.deviceId, as};
}
function applyResults(p) {
  if (p.k !== 'R') throw new Error('Ce QR n\'est pas un QR de résultats');
  if (!ROOT.classes[p.cid]) throw new Error('Classe inconnue sur cette tablette');
  if (p.cid !== S.id) useClass(p.cid);
  let cnt = 0;
  for (const [id, gid, red, blue, order, jc, jp, sR, sB, w, repSec, reprises, st, en, ev, obs, pil, nR, nB] of p.as) {
    const data = {red, blue, jc, jp, scoreR: sR, scoreB: sB, winner: w, repSec, reprises, startedAt: st * 1000, endedAt: en * 1000, events: unpackEvents(ev, st * 1000), obs, pil, names: {R: nR, B: nB}, status: 'done', d: p.d};
    const loc = S.assaults.find(a => a.id === id);
    if (loc) { if (loc.status !== 'done' || (loc.endedAt || 0) < en * 1000) { Object.assign(loc, data); cnt++; } }
    else { S.assaults.push({id, n: p.n, gid: gid || null, free: !gid, order, ...data}); cnt++; }
  }
  save(); return cnt;
}
async function shareJSON(obj, name) {
  const blob = new Blob([JSON.stringify(obj)], {type: 'application/json'});
  try { const file = new File([blob], name, {type: 'application/json'}); if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: name}); return; } }
  catch(e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function importSyncFile(file) {
  try {
    const obj = JSON.parse(await file.text());
    if (obj.k === 'L') { applyLesson(obj); toast('✓ Leçon reçue'); go('home'); }
    else if (obj.k === 'R') { const k = applyResults(obj); toast(`✓ ${k} assaut(s) reçu(s)`); render(); }
    else if (obj.classes) {
      if (!(await confirmBox('Restaurer la sauvegarde ?', 'Toutes les classes de cette tablette seront remplacées.', 'Restaurer', true))) return;
      const dev = ROOT.deviceId, role = ROOT.role; ROOT = obj; ROOT.deviceId = dev; ROOT.role = role; ROOT.live = null;
      Object.values(ROOT.classes).forEach(normClass); useClass(ROOT.classes[ROOT.active] ? ROOT.active : Object.keys(ROOT.classes)[0]); save(); toast('✓ Sauvegarde restaurée'); render();
    } else throw new Error('Fichier non reconnu');
  } catch(e) { toast('⚠️ ' + e.message, 3500); }
}

/* =====================================================================
   IMPORT DE LA CLASSE (lecteur de l'appli Biathlon + colonne sexe)
   ===================================================================== */
async function readSheetRows(file) {
  if (!window.XLSX) throw new Error('Bibliothèque Excel non chargée, réessayez dans un instant');
  const buf = await file.arrayBuffer(); let wb;
  if (/\.(csv|txt)$/i.test(file.name)) {
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const FS = first.includes(';') && (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : first.includes('\t') ? '\t' : ',';
    wb = XLSX.read(text, {type: 'string', FS, raw: true});
  } else wb = XLSX.read(buf, {type: 'array'});
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, raw: false, defval: ''});
}
const HEADER_RX = /^(nom|noms|élève|élèves|eleve|eleves|nom\s*(et)?\s*pr[ée]nom|pr[ée]nom|identit[ée]|classe|sexe|genre)\b/i;
const isNameLike = s => !!s && /^[A-Za-zÀ-ÖØ-öø-ÿ'’\- .]+$/.test(s) && !/\d/.test(s);
const sexOf = v => { v = String(v || '').trim().toUpperCase(); if (/^(F|FILLE|FÉMININ|FEMININ|FEM)$/.test(v)) return 'F'; if (/^(G|M|H|GARÇON|GARCON|MASCULIN|MASC)$/.test(v)) return 'G'; return null; };
function parseStudents(rows) {
  let sxCol = -1;
  for (let j = 1; j < 8 && sxCol < 0; j++) { const v = rows.map(r => String(r[j] || '').trim()).filter(Boolean); if (v.length >= 2 && v.filter(sexOf).length >= v.length * 0.7) sxCol = j; }
  const out = [];
  rows.forEach((row, i) => {
    const a = String(row[0] || '').trim().replace(/\s+/g, ' '), b = sxCol === 1 ? '' : String(row[1] || '').trim().replace(/\s+/g, ' ');
    if (!a) return;
    if (HEADER_RX.test(a) && (i < 3 || !b || HEADER_RX.test(b))) return;
    if (!isNameLike(a)) return;
    let nom, prenom;
    if (b && isNameLike(b) && !HEADER_RX.test(b) && !sexOf(b)) { nom = a; prenom = b; }
    else {
      const tk = a.split(' '), isUp = t => t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t);
      let k = 0; while (k < tk.length && isUp(tk[k])) k++;
      if (k === 0) { nom = tk[0]; prenom = tk.slice(1).join(' '); }
      else if (k === tk.length) { nom = tk.slice(0, Math.max(1, k - 1)).join(' '); prenom = tk.slice(Math.max(1, k - 1)).join(' '); }
      else { nom = tk.slice(0, k).join(' '); prenom = tk.slice(k).join(' '); }
      if (!prenom) prenom = nom;
    }
    const sx = sxCol >= 0 ? sexOf(row[sxCol]) : null;
    out.push({nom: nom.toUpperCase(), prenom: capName(prenom), sexe: sx || 'G', known: !!sx});
  });
  return out;
}
async function importStudentsFile(file) {
  try {
    const list = parseStudents(await readSheetRows(file));
    if (!list.length) return toast('Aucun élève reconnu dans ce fichier', 3500);
    let mode = 'add';
    if (S.students.length) {
      mode = await choiceBox(`Importer ${list.length} élève(s)`, `La classe « ${esc(S.name)} » contient déjà ${S.students.length} élève(s).`, [{label: 'Ajouter à la liste', value: 'add', cls: 'primary'}, {label: 'Remplacer la liste', value: 'replace', cls: 'red'}]);
      if (!mode) return;
    }
    if (mode === 'replace') { S.students = []; S.groups.forEach(g => g.members = []); S.assaults = []; Object.values(S.lessons).forEach(L => { L.att = {}; L.sig = {}; }); }
    let added = 0;
    list.forEach(p => { if (S.students.some(s => s.nom === p.nom && s.prenom.toLowerCase() === p.prenom.toLowerCase())) return; S.students.push({id: rnd(5), nom: p.nom, prenom: p.prenom, sexe: p.sexe}); added++; });
    save(); render();
    const unk = list.filter(p => !p.known).length;
    toast(`✓ ${added} élève(s) importé(s)${unk ? ` · ${unk} sans sexe indiqué : touchez G/F pour corriger` : ''}`, 4000);
  } catch(e) { toast('⚠️ Lecture impossible : ' + e.message, 4000); }
}

/* =====================================================================
   APRÈS RENDU (glisser-déposer, QR, scanner)
   ===================================================================== */
function afterProf() {
  if (UI.tab === 'groupes') bindGroups();
  if (UI.tab === 'qr') (async () => { const n = curLesson(); const payload = await BFQR.encode(lessonPacket(n)); const area = $('#qrLesson');
    if (area && UI.tab === 'qr' && UI.view === 'prof') BFQR.showSeries(BFQR.chunk(payload, 'L', 440), area, `Leçon ${n} · ${esc(S.name)}`); })();
  if (UI.tab === 'recup') BFQR.start($('#scanArea'), ['R'], async p => { const k = applyResults(p); toast(`✓ ${k} assaut(s) reçu(s)`); const w = $('#waitBox'); if (w) w.innerHTML = waitList(); return 'continue'; },
    'Ce QR est destiné aux tablettes élèves (📷 Scanner la leçon).');
}
function bindGroups() {
  let drag = null;
  $$('.gitem').forEach(el => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); drag = {id: el.dataset.gid, x0: e.clientX, y0: e.clientY, el, moved: false}; try { el.setPointerCapture(e.pointerId); } catch(_) {} });
    el.addEventListener('pointermove', e => {
      if (!drag || drag.el !== el) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
      const gh = $('#dragGhost');
      if (!drag.moved) { drag.moved = true; gh.innerHTML = el.outerHTML; gh.hidden = false; el.style.opacity = .3; }
      gh.style.left = e.clientX + 'px'; gh.style.top = e.clientY + 'px';
      $$('.gzone.hover').forEach(z => z.classList.remove('hover'));
      const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('.gzone'); if (z) z.classList.add('hover');
      if (e.clientY < 110) window.scrollBy(0, -14); else if (e.clientY > innerHeight - 70) window.scrollBy(0, 14);
    });
    const end = e => {
      if (!drag || drag.el !== el) return;
      const d = drag; drag = null; $('#dragGhost').hidden = true; el.style.opacity = '';
      $$('.gzone.hover').forEach(z => z.classList.remove('hover'));
      if (!d.moved) { UI.sel = UI.sel === d.id ? null : d.id; return render(); }
      const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('.gzone');
      if (z) moveToGroup(d.id, z.dataset.zone); else render();
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  });
}
function moveToGroup(sid, gid) { S.groups.forEach(g => g.members = g.members.filter(m => m !== sid)); const g = groupById(gid); if (g) g.members.push(sid); UI.sel = null; save(); render(); }

/* =====================================================================
   ACTIONS
   ===================================================================== */
const A = {
  home: () => { UI.P = null; go(isProf() && UI.unlocked && !UI.studentMode ? 'prof' : 'home', {tab: 'menu'}); },
  go: d => go(d.view),
  setRole: async d => {
    if (ROOT.role && d.r === 'eleve' && !(await confirmBox('Passer en tablette élève ?', 'L\'espace enseignant ne sera plus accessible sans le code.', 'Passer en élève'))) return;
    ROOT.role = d.r; UI.unlocked = false; UI.studentMode = false; save(); go('home');
  },
  openProf: () => pinPad(() => { UI.unlocked = true; UI.studentMode = false; go('prof', {tab: 'menu'}); }),
  eleveLock: () => pinPad(async () => { const r = await choiceBox('Réglages de la tablette', 'Cette tablette est une tablette élève.', [{label: '👩‍🏫 Passer en tablette enseignant', value: 'prof', cls: 'primary'}]); if (r) { ROOT.role = 'prof'; UI.unlocked = true; save(); go('prof', {tab: 'menu'}); } }),
  toStudent: () => { UI.studentMode = true; go('home'); },
  leaveStudent: () => { UI.studentMode = false; if (UI.unlocked) go('prof', {tab: 'menu'}); else go('home'); },
  tab: d => { UI.sel = null; UI.tab = d.tab; go('prof'); },
  selClass: d => { useClass(d.id); save(); render(); },
  setCurrent: d => { SET().current = +d.n; save(); render(); },
  addClass: () => { const nm = $('#newClass').value.trim(); if (!nm) return toast('Saisissez le nom de la classe'); const c = newClass(nm); ROOT.classes[c.id] = c; useClass(c.id); save(); render(); },
  delClass: async () => { if (!(await confirmBox(`Supprimer « ${S.name} » ?`, 'Élèves, groupes et résultats de cette classe seront effacés.', 'Supprimer', true))) return; delete ROOT.classes[S.id]; useClass(Object.keys(ROOT.classes)[0]); save(); render(); },
  toggleSex: d => { const s = stu(d.sid); s.sexe = s.sexe === 'F' ? 'G' : 'F'; save(); render(); },
  delStudent: async d => { if (!(await confirmBox(`Retirer ${nameOf(d.sid)} ?`, 'L\'élève sera retiré de la classe et de son groupe.', 'Retirer', true))) return; S.students = S.students.filter(s => s.id !== d.sid); S.groups.forEach(g => g.members = g.members.filter(m => m !== d.sid)); save(); render(); },
  clearStudents: async () => { if (!(await confirmBox('Vider la liste ?', 'Tous les élèves, les groupes et les résultats de la classe seront effacés.', 'Vider', true))) return; S.students = []; S.groups.forEach(g => g.members = []); S.assaults = []; S.lessons = {}; save(); render(); },
  setGroups: d => { setGroupCount(+d.n); render(); },
  autoGroups: () => {
    const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const list = [...sh(S.students.filter(s => s.sexe === 'F')), ...sh(S.students.filter(s => s.sexe !== 'F'))], n = S.groups.length || (setGroupCount(2), 2);
    S.groups.forEach(g => g.members = []);
    list.forEach((s, i) => { const r = Math.floor(i / n), k = i % n; S.groups[r % 2 ? n - 1 - k : k].members.push(s.id); });
    save(); render(); toast('Répartition faite : ajustez en glissant les tuiles');
  },
  clearGroups: () => { S.groups.forEach(g => g.members = []); save(); render(); },
  groupColor: d => { groupById(d.g).color = d.c; save(); render(); },
  dropSel: d => { if (UI.sel) moveToGroup(UI.sel, d.zone); },
  nbLessons: d => { SET().nbLessons = Math.max(1, Math.min(20, SET().nbLessons + +d.d)); save(); render(); },
  pilAdd: () => { ROOT.piliers.push({id: 'p' + uid(), n: 'Nouveau pilier', cr: ['']}); save(); render(); },
  pilDel: async d => { if (!(await confirmBox('Supprimer ce pilier ?', 'Les leçons qui l\'utilisent n\'auront plus de pilier.', 'Supprimer', true))) return; ROOT.piliers = ROOT.piliers.filter(p => p.id !== d.id); Object.values(ROOT.classes).forEach(c => Object.values(c.lessons).forEach(L => { if (L.pil?.id === d.id) L.pil = null; })); save(); render(); },
  pilReset: async () => { if (!(await confirmBox('Revenir aux piliers par défaut ?', 'Vos piliers modifiés seront remplacés.', 'Rétablir', true))) return; ROOT.piliers = clone(DEFAULT_PILIERS); save(); render(); },
  att: d => { const L = lesson(curLesson()); if (L.att[d.sid] === d.v) delete L.att[d.sid]; else L.att[d.sid] = d.v; save(); render(); },
  reroll: () => { const n = curLesson(); S.groups.forEach(g => { ensureSchedule(n, g); assignRoles(n, g); }); save(); render(); toast('Rôles recalculés'); },
  rankN: d => { UI.rankN = +d.n; render(); },
  statN: d => { UI.statN = +d.n; render(); },
  replay: async d => { if (!(await confirmBox('Rejouer cet assaut ?', 'Son résultat sera effacé et il repassera « à faire ».', 'Rejouer', true))) return; const a = S.assaults.find(x => x.id === d.id); Object.assign(a, {status: 'todo', events: [], scoreR: null, scoreB: null, winner: null, obs: null}); save(); render(); },
  exportXlsx: () => exportXlsx(),
  backup: () => shareJSON({...ROOT, live: null}, `ObservBF_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`),
  setPin: () => { const v = $('#newPin').value; if (!/^\d{4}$/.test(v)) return toast('Le code doit faire 4 chiffres'); ROOT.pin = v; save(); toast('✓ Code changé'); $('#newPin').value = ''; },
  clearResults: async () => { if (!(await confirmBox('Effacer les résultats ?', `Tous les assauts de « ${S.name} » seront effacés.`, 'Effacer', true))) return; S.assaults = []; Object.values(S.lessons).forEach(L => L.sig = {}); save(); render(); },
  resetClass: async () => { if (!(await confirmBox(`Réinitialiser « ${S.name} » ?`, 'Élèves, groupes, leçons et résultats seront effacés.', 'Réinitialiser', true))) return; const c = newClass(S.name, S.id); ROOT.classes[S.id] = c; S = c; save(); render(); },
  pickGroup: d => { ROOT.myGroup[S.id] = d.g; save(); render(); },
  openPrep: () => openPrep(false),
  openFree: () => openPrep(true),
  resume: () => openFight(),
  prepSex: d => { const P = UI.P, s = stu(d.side === 'R' ? P.red : P.blue); if (s) { s.sexe = d.v; save(); } else P.guest[d.side].sexe = d.v; render(); },
  prepSkip: () => { const P = UI.P, a = S.assaults.find(x => x.id === P.aid); a.order = lessonAssaults(a.n, a.gid).reduce((m, x) => Math.max(m, x.order || 0), 0) + 1; save(); openPrep(false); toast('Assaut repoussé à la fin'); },
  prepStart: () => startAssault(),
  fileResults: () => shareJSON(resultsPacket(), `ObservBF_resultats_L${curLesson()}_${ROOT.deviceId}.json`),
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el || el.disabled) return;
  const f = A[el.dataset.action]; if (f) { e.preventDefault(); f(el.dataset, el, e); }
});
const LFIELDS = {lTitle: (L, v) => L.title = v, lTotal: (L, v) => L.totalMin = v === '' ? null : Math.max(0, +v), lRep: (L, v) => L.reprises = v === '' ? null : Math.max(1, +v)};
document.addEventListener('input', e => {
  const t = e.target, f = t.dataset.field; if (!f) return;
  if (f === 'className') { S.name = t.value; saveSoon(); }
  else if (f === 'set') { const k = t.dataset.k; SET()[k] = t.type === 'range' || t.type === 'number' ? +t.value : k === 'bonusOn' ? !!t.value : t.value; saveSoon(); if (t.tagName === 'SELECT' || t.type === 'range') render(); }
  else if (f === 'bonusArme') { const s2 = SET(), c = t.dataset.c; s2.bonusArmes = COUP_KEYS.filter(k => k === c ? t.checked : s2.bonusArmes.includes(k)); saveSoon(); }
  else if (f === 'bareme') { SET().bareme[t.dataset.w][t.dataset.c] = Math.max(0, +t.value || 0); saveSoon(); }
  else if (LFIELDS[f]) { LFIELDS[f](lesson(t.dataset.n), t.value); saveSoon(); }
  else if (f === 'lPil') { lesson(t.dataset.n).pil = snapPil(pilById(t.value)); save(); }
  else if (f === 'pilName') { pilById(t.dataset.id).n = t.value; refreshPilSnapshots(t.dataset.id); saveSoon(); }
  else if (f === 'pilCr') { const p = pilById(t.dataset.id); p.cr[+t.dataset.i] = t.value; p.cr = p.cr.map(x => x || ''); refreshPilSnapshots(t.dataset.id); saveSoon(); }
  else if (f === 'prep') { const P = UI.P; if (t.dataset.k === 'jp') P.jp[+t.dataset.i] = t.value; else P[t.dataset.k] = t.value; if (t.dataset.k === 'red' || t.dataset.k === 'blue') render(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fileStudents' && t.files[0]) { importStudentsFile(t.files[0]); t.value = ''; }
  if ((t.id === 'fileSync' || t.id === 'fileRestore') && t.files[0]) { importSyncFile(t.files[0]); t.value = ''; }
  if (t.dataset.field === 'lTotal' || t.dataset.field === 'lRep' || t.dataset.field === 'lPil' || (t.dataset.field === 'set' && t.type === 'number')) { save(); render(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'addForm') return; e.preventDefault();
  const nom = $('#addNom').value.trim().toUpperCase(), prenom = capName($('#addPrenom').value.trim());
  if (!nom && !prenom) return toast('Saisissez au moins un nom');
  const sexe = $('#addSexe .on')?.dataset.v || 'G';
  S.students.push({id: rnd(5), nom, prenom, sexe}); save(); render(); setTimeout(() => $('#addNom')?.focus(), 30);
});
document.addEventListener('click', e => { const b = e.target.closest('#addSexe button'); if (b) { $$('#addSexe button').forEach(x => x.classList.toggle('on', x === b)); } });

/* =====================================================================
   ASSAUT
   ===================================================================== */
const LV = () => ROOT.live;
function openFight() {
  const l = LV(); if (!l) return;
  if (l.cid !== S.id && ROOT.classes[l.cid]) useClass(l.cid);
  BFQR.stop(); $('#fight').hidden = false; document.body.classList.add('fighting');
  l.bonus = l.bonus || {R: null, B: null}; l.bonusPick = l.bonusPick || {R: 0, B: 0};
  $('#targetR').innerHTML = BFDraw.fighter({sexe: l.B.sexe, color: COL.B.c, dark: COL.B.d}) + HEAT_LEGEND;
  $('#targetB').innerHTML = BFDraw.fighter({sexe: l.R.sexe, color: COL.R.c, dark: COL.R.d, mirror: true}) + HEAT_LEGEND;
  for (const s of ['R', 'B']) {
    const m = s === 'B';
    $('#wp' + s).innerHTML = BFDraw.glove(COL[s].c, COL[s].d, m) + `<span class="wl">Poing<small>droit : direct<br>courbe : crochet</small></span>`;
    $('#wf' + s).innerHTML = BFDraw.shoe(COL[s].c, m) + `<span class="wl">Pied<small>droit : chassé<br>courbe : fouetté</small></span>`;
    defaultBanner(s);
  }
  coachKey = ''; renderFight(); renderClock(); resizeCanvas(); startClockLoop();
}
function closeFight() { $('#fight').hidden = true; document.body.classList.remove('fighting'); stopClockLoop(); }
const coachOf = (l, side) => nameOf(l.jp?.[side === 'R' ? 0 : 1]);
function defaultBanner(side) { const l = LV(), c = coachOf(l, side);
  banner(side, `${c ? `📋 <b>${esc(c)}</b>, coach ${side === 'R' ? 'rouge' : 'bleu'} : ` : ''}tracez les coups de <b>${esc(l[side].name)}</b> depuis le gant ou la chaussure jusqu'à la cible.`); }
/* ---- Couleur des zones selon le nombre de touches reçues ---- */
const HEAT = [null, null, {c: '#2E9E44', n: 'très peu touché'}, {c: '#FFD400', n: 'peu touché'}, {c: '#F59E0B', n: 'un peu touché'}, {c: '#D32F2F', n: 'beaucoup touché'}];
const heatOf = n => HEAT[Math.min(5, n)] || null;
const HEAT_LEGEND = `<div class="heat-legend"><span><i style="background:#2E9E44"></i>2</span><span><i style="background:#FFD400"></i>3</span><span><i style="background:#F59E0B"></i>4</span><span><i style="background:#D32F2F"></i>5+</span></div>`;
function heatCounts(events, side) { const m = {}; events.forEach(e => { if (e.t === side && e.z) { const k = e.z + '-' + e.s; m[k] = (m[k] || 0) + 1; } }); return m; }
function paintHeat(root, events, side) {
  const m = heatCounts(events, side);
  root.querySelectorAll('.part').forEach(p => { const h = heatOf(m[p.dataset.zone + '-' + p.dataset.side] || 0);
    p.classList.toggle('heated', !!h); if (h) p.style.setProperty('--heat', h.c); else p.style.removeProperty('--heat'); });
}
/* ---- Temps de coaching : arme bonus ---- */
let coachKey = '';
function bonusTarget(c) { return c.phase === 'recup' ? c.rep + 1 : (c.phase === 'ready' && c.rep >= 2 ? c.rep : 0); }
function renderCoach() {
  const l = LV(); if (!l) return;
  const c = l.clock, s = SET(), tr = s.bonusOn && s.bonusArmes.length && c.R > 1 ? bonusTarget(c) : 0;
  const key = [tr, l.bonusPick.R, l.bonusPick.B, l.bonus.R?.c, l.bonus.B?.c].join('|'); if (key === coachKey) return; coachKey = key;
  for (const side of ['R', 'B']) {
    const el = $('#coach' + side), show = tr && l.bonusPick[side] !== tr, coach = coachOf(l, side);
    el.hidden = !show;
    if (show) el.innerHTML = `<div class="coach-box"><small>⏱ Temps de coaching · reprise ${tr}</small><h3>${coach ? `📋 ${esc(coach)}, ` : ''}choisis avec <b>${esc(l[side].name)}</b> son arme bonus</h3>
      <p class="note">Chaque touche valable avec cette arme rapporte <b>+${s.bonusPts}</b> à la reprise ${tr}.</p>
      <div class="coach-btns">${s.bonusArmes.map(k => `<button class="cbonus" data-bonus="${side}" data-c="${k}"><b>${COUPS[k].l}</b><span>${COUPS[k].w}</span></button>`).join('')}</div>
      <button class="btn small ghost" data-bonus="${side}" data-c="">Pas d'arme bonus</button></div>`;
    const tag = $('#fBonus' + side), b = l.bonus[side];
    tag.hidden = !b; if (b) tag.textContent = `★ ${COUPS[b.c].l} +${s.bonusPts} dès R${b.from}`;
  }
}
$$('.coach').forEach(el => el.addEventListener('click', e => {
  const b = e.target.closest('[data-bonus]'); if (!b) return;
  const l = LV(), side = b.dataset.bonus, tr = bonusTarget(l.clock);
  l.bonusPick[side] = tr; l.bonus[side] = b.dataset.c ? {c: b.dataset.c, from: tr} : null;
  save(); renderCoach(); buzz(30);
  banner(side, b.dataset.c ? `★ Arme bonus de <b>${esc(l[side].name)}</b> : <b>${COUPS[b.dataset.c].l}</b> (+${SET().bonusPts} par touche à partir de la reprise ${tr})` : `Pas d'arme bonus pour la reprise ${tr}.`, 'ok');
}));
function banner(side, html, cls = '') { const b = $('#banner' + side); b.className = 'banner ' + cls; b.innerHTML = html; }
function renderFight() {
  const l = LV();
  for (const s of ['R', 'B']) {
    $('#fName' + s).textContent = l[s].name;
    $('#fScore' + s).textContent = scoreOf(l.events, s);
    const st = sideStats(l.events, s);
    $('#fSub' + s).textContent = `${st.valid} touche${st.valid > 1 ? 's' : ''} · ${st.tent} coup${st.tent > 1 ? 's' : ''}${st.trop ? ` · ${st.trop} trop fort` : ''}${st.ok ? ` · ${st.ok} enchaîn.` : ''}`;
    const en = l.ench[s], b = $(`.sbtn.ench[data-side="${s}"]`);
    b.classList.toggle('on', !!en); b.textContent = en ? (en.n ? 'Enchaîn. : 2e touche' : 'Enchaîn. : 1re touche') : 'Enchaînement';
  }
  paintHeat($('#targetR'), l.events, 'R'); paintHeat($('#targetB'), l.events, 'B');
  const g = groupById(l.gid), rest = l.aid ? restOf({...l, n: l.n, gid: l.gid, red: l.R.id, blue: l.B.id}) : [];
  $('#fJudges').innerHTML = `${g ? gDot(g) + `<b>${esc(g.name)}</b> · ` : ''}⚖️ Arbitre : <b>${esc(nameOf(l.jc) || '—')}</b> · <span class="wR">📋 Coach rouge :</span> <b>${esc(coachOf(l, 'R') || '—')}</b> · <span class="wB">📋 Coach bleu :</span> <b>${esc(coachOf(l, 'B') || '—')}</b>${rest.length ? ` · 💤 ${rest.map(nameOf).map(esc).join(', ')}` : ''}`;
  renderCoach();
}

/* ---- Chrono ---- */
let clockTimer = null, lastSave = 0;
function startClockLoop() { if (!clockTimer) clockTimer = setInterval(clockTick, 200); }
function stopClockLoop() { clearInterval(clockTimer); clockTimer = null; }
function clockTick() {
  const l = LV(); if (!l) return;
  const c = l.clock;
  if (c.phase === 'run' || c.phase === 'recup') {
    c.remaining = Math.max(0, c.endAt - Date.now());
    if (c.remaining <= 0) phaseEnd();
    if (Date.now() - lastSave > 2000) { lastSave = Date.now(); save(); }
  }
  renderClock();
}
function renderClock() {
  const l = LV(); if (!l) return;
  const c = l.clock;
  $('#clock').className = 'clock ' + c.phase + (c.phase === 'run' && c.remaining < 10000 ? ' low' : '');
  $('#cTime').textContent = fmt(Math.ceil(c.remaining / 1000));
  $('#cRep').textContent = `Reprise ${c.rep}/${c.R}`;
  $('#cPhase').textContent = {ready: 'Prêt', run: 'Combat', pause: 'Arrêt', recup: 'Récupération', end: 'Terminé'}[c.phase];
  $('#cStart').textContent = {ready: 'Départ', run: 'Arrêt', pause: 'Reprendre', recup: 'Reprise !', end: 'Résultat'}[c.phase];
  $('#cSkip').textContent = c.phase === 'recup' ? 'Fin de récup.' : 'Fin de reprise';
  $('#cSkip').disabled = c.phase === 'end';
  renderCoach();
}
function phaseEnd() {
  const l = LV(), c = l.clock;
  if (c.phase === 'run' || c.phase === 'pause' || c.phase === 'ready') {
    beep(3, 660, .25); buzz([200, 100, 200]);
    if (c.rep < c.R) {
      if (c.recSec > 0) { c.phase = 'recup'; c.remaining = c.recSec * 1000; c.endAt = Date.now() + c.remaining; toast(`Fin de la reprise ${c.rep} : récupération`); }
      else nextRep();
    } else { c.phase = 'end'; c.remaining = 0; save(); renderClock(); setTimeout(openResult, 600); }
  } else if (c.phase === 'recup') { beep(1, 1040, .3); nextRep(); }
  save(); renderClock();
}
function nextRep() { const c = LV().clock; c.rep++; c.phase = 'ready'; c.remaining = c.repSec * 1000; c.endAt = null; toast(`Reprise ${c.rep} : appuyez sur Départ`); }
$('#cStart').addEventListener('click', () => {
  audio(); const c = LV().clock;
  if (c.phase === 'ready' || c.phase === 'pause') { if (c.phase === 'ready') beep(1, 1040, .3); c.phase = 'run'; c.endAt = Date.now() + c.remaining; }
  else if (c.phase === 'run') { c.phase = 'pause'; c.remaining = Math.max(0, c.endAt - Date.now()); }
  else if (c.phase === 'recup') { beep(1, 1040, .3); nextRep(); c.phase = 'run'; c.endAt = Date.now() + c.remaining; }
  else if (c.phase === 'end') openResult();
  save(); renderClock();
});
$('#cReset').addEventListener('click', async () => {
  const c = LV().clock; if (c.phase === 'end') return;
  if (!(await confirmBox('Remettre la reprise à zéro ?', `Le chrono de la reprise ${c.rep} repart de ${fmt(c.repSec)}. Les touches sont conservées.`, 'Remettre à zéro'))) return;
  c.phase = 'ready'; c.remaining = c.repSec * 1000; c.endAt = null; save(); renderClock();
});
/* Fin de reprise directe (sans confirmation) */
$('#cSkip').addEventListener('click', () => { const c = LV().clock; if (c.phase === 'end') return; if (c.phase === 'recup') { nextRep(); save(); renderClock(); } else phaseEnd(); });
$('#fEnd').addEventListener('click', async () => {
  if (!(await confirmBox('Terminer l\'assaut ?', 'Le chrono s\'arrête et le résultat s\'affiche.', 'Terminer'))) return;
  const c = LV().clock; c.phase = 'end'; c.remaining = 0; save(); renderClock(); openResult();
});
$('#fMenu').addEventListener('click', () => { save(); closeFight(); go('home'); });

/* ---- Gestes ---- */
const arena = $('#arena'), cv = $('#trail'), ctx = cv.getContext('2d');
let arect = arena.getBoundingClientRect();
function resizeCanvas() { arect = arena.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; cv.width = Math.round(arect.width * dpr); cv.height = Math.round(arect.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
new ResizeObserver(resizeCanvas).observe(arena);
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const gestures = new Map(); let trails = [], impacts = [], raf = null, lastXY = null;
function loop() {
  ctx.clearRect(0, 0, arect.width, arect.height);
  const now = performance.now();
  trails = trails.filter(t => !t.t0 || now - t.t0 < 900);
  for (const t of trails) {
    const a = t.t0 ? 1 - Math.pow((now - t.t0) / 900, 2) : .85;
    ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = ctx.fillStyle = t.color; ctx.lineWidth = 9; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath(); t.pts.forEach(([x, y], i) => i ? ctx.lineTo(x - arect.left, y - arect.top) : ctx.moveTo(x - arect.left, y - arect.top)); ctx.stroke();
    const [x0, y0] = t.pts[0]; ctx.beginPath(); ctx.arc(x0 - arect.left, y0 - arect.top, 10, 0, 7); ctx.fill();
    if (t.label) { const [x, y] = t.pts[t.pts.length - 1]; ctx.font = 'italic 800 24px "Barlow Condensed", sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
      ctx.strokeText(t.label, x - arect.left + 12, y - arect.top - 14); ctx.fillText(t.label, x - arect.left + 12, y - arect.top - 14); }
  }
  impacts = impacts.filter(m => now - m.t0 < 650);
  for (const m of impacts) {
    const k = (now - m.t0) / 650, r = 14 + 34 * Math.sqrt(k), x = m.x - arect.left, y = m.y - arect.top;
    ctx.globalAlpha = 1 - k; ctx.fillStyle = m.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.stroke();
    if (m.txt) { ctx.globalAlpha = Math.min(1, 2 - 2 * k); ctx.font = 'italic 800 26px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#13285A'; ctx.fillStyle = '#fff';
      ctx.strokeText(m.txt, x, y - r - 6); ctx.fillText(m.txt, x, y - r - 6); ctx.textAlign = 'start'; }
  }
  ctx.globalAlpha = 1; raf = trails.length || impacts.length ? requestAnimationFrame(loop) : null;
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
function classify(pts) {
  const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1], dx = x1 - x0, dy = y1 - y0, Dd = Math.hypot(dx, dy);
  let len = 0, h = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (Dd > 1) for (const [x, y] of pts) h = Math.max(h, Math.abs(dy * (x - x0) - dx * (y - y0)) / Dd);
  return {len, curved: (Dd > 1 ? h / Dd : 9) > SET().seuil};
}
function hitAt(x, y, side) {
  const el = document.elementFromPoint(x, y); if (!el) return {};
  const p = el.closest('.target .part'); if (p && p.closest('.target').dataset.side === side) return {part: p};
  const m = el.closest('[data-miss]'); if (m && m.dataset.miss === side) return {miss: m};
  return {};
}
const hovers = new Map();
function setHover(pid, el) { const old = hovers.get(pid); if (old === el) return; old && old.classList.remove('hover'); if (el) { el.classList.add('hover'); hovers.set(pid, el); } else hovers.delete(pid); }
$$('.weapon').forEach(w => w.addEventListener('pointerdown', e => {
  if (!LV()) return;
  e.preventDefault(); audio();
  const side = w.dataset.side; setPending(side, null);
  const t = {pts: [[e.clientX, e.clientY]], color: cssv('--navy')};
  gestures.set(e.pointerId, {side, weapon: w.dataset.weapon, el: w, trail: t}); trails.push(t); kick();
  w.classList.add('armed');
  try { arena.setPointerCapture(e.pointerId); } catch(_) {}
  arect = arena.getBoundingClientRect();
}));
arena.addEventListener('pointermove', e => {
  const g = gestures.get(e.pointerId); if (!g) return;
  const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  for (const c of (list.length ? list : [e])) g.trail.pts.push([c.clientX, c.clientY]);
  const h = hitAt(e.clientX, e.clientY, g.side); setHover(e.pointerId, h.part || h.miss || null); kick();
});
function endGesture(e, cancel) {
  const g = gestures.get(e.pointerId); if (!g) return;
  gestures.delete(e.pointerId); g.el.classList.remove('armed'); setHover(e.pointerId, null);
  try { arena.releasePointerCapture(e.pointerId); } catch(_) {}
  const t = g.trail;
  if (cancel) { t.t0 = performance.now() - 900; return; }
  const c = classify(t.pts);
  if (c.len < 40) { t.t0 = performance.now() - 900; kick(); toast('Geste trop court : glissez de l\'arme vers la cible'); return; }
  const coup = g.weapon === 'poing' ? (c.curved ? 'crochet' : 'direct') : (c.curved ? 'fouette' : 'chasse');
  t.color = c.curved ? cssv('--curve') : cssv('--straight'); t.label = COUPS[coup].l; t.t0 = performance.now(); kick();
  const h = hitAt(e.clientX, e.clientY, g.side); lastXY = [e.clientX, e.clientY];
  if (h.part) record(g.side, g.weapon, coup, h.part.dataset.zone, h.part.dataset.side);
  else if (h.miss) record(g.side, g.weapon, coup, null, null);
  else setPending(g.side, {weapon: g.weapon, coup});
}
arena.addEventListener('pointerup', e => endGesture(e, false));
arena.addEventListener('pointercancel', e => endGesture(e, true));
const pending = {R: null, B: null};
function setPending(side, p) {
  pending[side] = p; $('#target' + side).classList.toggle('await', !!p);
  if (p) banner(side, `<b>${COUPS[p.coup].l}</b> du ${p.weapon} : touchez la cible <button class="linkbtn" data-cancel="${side}">annuler</button>`, 'await');
}
$$('.target').forEach(t => t.addEventListener('click', e => {
  const p = e.target.closest('.part'); if (!p) return; const side = t.dataset.side; lastXY = [e.clientX, e.clientY];
  if (pending[side]) record(side, pending[side].weapon, pending[side].coup, p.dataset.zone, p.dataset.side);
  else toast('Commencez le geste sur le gant ou la chaussure');
}));
$$('.half').forEach(h => h.addEventListener('click', e => { const c = e.target.closest('[data-cancel]'); if (c) { setPending(c.dataset.cancel, null); defaultBanner(c.dataset.cancel); } }));
function record(side, weapon, coup, zone, zside) {
  const l = LV();
  const e = {id: uid(), ts: Date.now(), t: side, w: weapon, c: coup, z: zone || null, s: zside || null, cat: zone ? CAT[zone] : 'manque', trop: false, rep: l.clock.rep, ench: null};
  const bn = l.bonus?.[side]; if (bn && bn.c === coup && l.clock.rep >= bn.from) e.bx = +SET().bonusPts || 0;
  let enchMsg = '';
  const en = l.ench[side];
  if (en) {
    e.ench = en.id; en.n++;
    if (en.n >= 2) { l.ench[side] = null; const pair = [...l.events.filter(x => x.ench === en.id), e];
      enchMsg = pair.every(isValid) ? ` · <b>enchaînement réussi +${SET().bonusEnch}</b>` : ' · enchaînement non validé'; }
    else enchMsg = ' · enchaînement 1/2';
  }
  l.events.push(e); setPending(side, null); save(); renderFight();
  const p = ptsOf(e), where = zone ? ZL[zone] : 'dans le vide';
  const note = zone && CAT[zone] === 'garde' ? ' (sur la garde)' : (zone && p === 0 ? ' (cible non valable)' : '');
  banner(side, `<b>${COUPS[coup].l}</b> du ${weapon} → ${where}${note}${e.bx && p > 0 ? ` · <b>★ arme bonus +${e.bx}</b>` : ''}${enchMsg}<span class="pts">${p > 0 ? '+' + p : p}</span>`, p > 0 ? 'ok' : 'zero');
  buzz(p > 0 ? 25 : 10);
  if (zone && lastXY) { impacts.push({x: lastXY[0], y: lastXY[1], t0: performance.now(), color: p > 0 ? '#F29A12' : '#9AA3B5', txt: p > 0 ? (e.bx ? `★ +${p}` : `+${p}`) : ''}); kick(); }
  lastXY = null;
  if (zone) { const g = $(`#target${side} .part[data-zone="${zone}"][data-side="${zside}"]`); if (g) { g.classList.add('hit'); setTimeout(() => g.classList.remove('hit'), 650); } }
}
$$('.side-ctrl').forEach(c => c.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const side = b.dataset.side, l = LV();
  if (b.dataset.miss) { if (pending[side]) record(side, pending[side].weapon, pending[side].coup, null, null); else toast('Tracez le geste depuis l\'arme jusqu\'à « Dans le vide »'); return; }
  const act = b.dataset.act;
  if (act === 'ench') {
    const en = l.ench[side];
    if (!en) { l.ench[side] = {id: uid(), n: 0}; banner(side, 'Enchaînement : observez les <b>deux touches</b> qui suivent.', 'await'); }
    else { l.events.forEach(x => { if (x.ench === en.id) x.ench = null; }); l.ench[side] = null; defaultBanner(side); }
    save(); renderFight();
  }
  if (act === 'trop') {
    const ev = [...l.events].reverse().find(x => x.t === side && x.z);
    if (!ev) return toast('Aucune touche à pénaliser');
    if (ev.trop) return toast('Cette touche est déjà marquée trop forte');
    ev.trop = true; save(); renderFight(); buzz([30, 60, 30]);
    banner(side, `<b>Frappe trop forte</b> : ${COUPS[ev.c].l} → ${ZL[ev.z]}, touche annulée<span class="pts">${ptsOf(ev)}</span>`, 'neg');
  }
  if (act === 'undo') {
    if (pending[side]) { setPending(side, null); return defaultBanner(side); }
    let i = -1; for (let k = l.events.length - 1; k >= 0; k--) if (l.events[k].t === side) { i = k; break; }
    if (i < 0) return toast('Rien à annuler');
    const [ev] = l.events.splice(i, 1); const en = l.ench[side]; if (en && ev.ench === en.id) en.n--;
    save(); renderFight(); banner(side, `Annulé : ${COUPS[ev.c].l} → ${ev.z ? ZL[ev.z] : 'dans le vide'}`, 'zero');
  }
}));

/* ---- Résultat + observation du pilier ---- */
let autoT = null;
function result() { const l = LV(), sR = scoreOf(l.events, 'R'), sB = scoreOf(l.events, 'B'); return {sR, sB, winner: sR > sB ? 'R' : sB > sR ? 'B' : 'N'}; }
function obsBlock(side) {
  const l = LV(), pil = l.pil; if (!pil || !pil.cr.length) return '';
  const cur = l.obs[side] || [];
  return `<div class="res-obs"><h3 style="color:var(--orange)">🏛 ${esc(pil.n)} · observé par le coach</h3>${pil.cr.map((c, i) => `<div class="obs-row"><div class="obs-c">${esc(c)}</div><div class="obs-btns">${[1, 2, 3, 4].map(v =>
    `<button class="obtn ${cur[i] === v ? 'on' : ''}" style="--cc:${OBS[v].c};--cf:${OBS[v].f}" data-obs="${side}" data-i="${i}" data-v="${v}">${OBS[v].n}</button>`).join('')}</div></div>`).join('')}</div>`;
}
function openResult() {
  const l = LV(); if (!l) return;
  const r = result();
  const col = side => { const st = sideStats(l.events, side);
    return `<div class="res-col ${side}"><h3>${esc(l[side].name)}</h3><div class="kv">
      <span>Touches valables</span><b>${st.valid} / ${st.tent}</b><span>Poing / pied</span><b>${st.poing} / ${st.pied}</b>
      <span>Directs · crochets</span><b>${st.coups.direct.v} · ${st.coups.crochet.v}</b><span>Chassés · fouettés</span><b>${st.coups.chasse.v} · ${st.coups.fouette.v}</b>
      <span>Visage · tronc · bas</span><b>${st.cats.tete} · ${st.cats.tronc} · ${st.cats.bas}</b><span>Sur la garde · dans le vide</span><b>${st.cats.garde} · ${st.cats.manque}</b>
      <span>Enchaînements réussis</span><b>${st.ok} / ${st.tries}</b><span>Touches arme bonus</span><b>${st.bonus}</b><span>Frappes trop fortes</span><b>${st.trop}</b></div>
      <div class="res-heat" id="rh${side}">${BFDraw.fighter({sexe: l[OTHER[side]].sexe, color: COL[OTHER[side]].c, dark: COL[OTHER[side]].d, mirror: side === 'B'})}<span class="note">Zones touchées sur ${esc(l[OTHER[side]].name)}</span></div>${obsBlock(side)}</div>`; };
  $('#resultBody').innerHTML = `<div class="result">
    <div class="res-head ${r.winner}"><small>Résultat de l'observation</small><h2>${r.winner === 'N' ? 'Match nul' : 'Victoire de ' + esc(l[r.winner].name)}</h2>
      <div class="res-score"><span>${r.sR}</span><span style="font-size:30px;opacity:.7">–</span><span>${r.sB}</span></div></div>
    <div class="res-cols">${col('R')}${col('B')}</div>
    <div class="res-foot" id="resFoot"><button class="btn" id="resBack">Corriger l'observation</button><button class="btn go" id="resOk">✓ Valider le résultat</button></div></div>`;
  paintHeat($('#rhR'), l.events, 'R'); paintHeat($('#rhB'), l.events, 'B');
  $('#resBack').onclick = () => $('#resultDlg').close();
  $('#resOk').onclick = commitResult;
  if (!$('#resultDlg').open) $('#resultDlg').showModal();
}
$('#resultBody').addEventListener('click', e => {
  const b = e.target.closest('[data-obs]'); if (!b || !LV()) return;
  const l = LV(), side = b.dataset.obs, i = +b.dataset.i, v = +b.dataset.v;
  l.obs[side] = l.obs[side] || []; l.obs[side][i] = l.obs[side][i] === v ? null : v; save();
  b.parentElement.querySelectorAll('.obtn').forEach(x => x.classList.toggle('on', +x.dataset.v === l.obs[side][i]));
});
$('#resultDlg').addEventListener('cancel', e => { if (!LV()) e.preventDefault(); });
function commitResult() {
  const l = LV(), r = result();
  const data = {status: 'done', red: l.R.id, blue: l.B.id, jc: l.jc, jp: l.jp, scoreR: r.sR, scoreB: r.sB, winner: r.winner, events: l.events, obs: l.pil ? l.obs : null, pil: l.pil?.id || '',
    repSec: l.clock.repSec, reprises: l.clock.R, startedAt: l.startedAt, endedAt: Date.now(), names: {R: l.R.name, B: l.B.name}, d: ROOT.deviceId};
  const a = l.aid && S.assaults.find(x => x.id === l.aid);
  if (a) Object.assign(a, data); else S.assaults.push({id: uid(), n: l.n, gid: l.free ? null : l.gid, free: l.free, order: 0, ...data, gid: l.aid ? l.gid : null});
  const free = l.free; ROOT.live = null; save();
  let next = null; const g = groupById(l.gid);
  if (!free && g) { ensureSchedule(l.n, g); next = todoList(l.n, g.id)[0]; }
  let left = +SET().autoNext || 10;
  const label = free ? 'Nouvel assaut libre' : next ? `Assaut suivant : <span class="wR">${esc(nameOf(next.red))}</span> – <span class="wB">${esc(nameOf(next.blue))}</span>` : 'Tous les assauts du groupe sont faits';
  $('#resFoot').innerHTML = `<span>${label}</span><span class="countdown" id="cd">dans ${left} s</span><div class="btn-row"><button class="btn" id="resStay">Rester ici</button><button class="btn go" id="resNext">Continuer</button></div>`;
  const goNext = () => { clearInterval(autoT); $('#resultDlg').close(); closeFight(); openPrep(free); };
  $('#resNext').onclick = goNext;
  $('#resStay').onclick = () => { clearInterval(autoT); $('#cd').textContent = ''; $('#resStay').hidden = true; };
  clearInterval(autoT);
  autoT = setInterval(() => { left--; const cd = $('#cd'); if (cd) cd.textContent = `dans ${left} s`; if (left <= 0) goNext(); }, 1000);
  toast('✓ Résultat enregistré');
}

/* =====================================================================
   EXPORT EXCEL
   ===================================================================== */
function exportXlsx() {
  if (!window.XLSX) return toast('Bibliothèque Excel non chargée');
  const wb = XLSX.utils.book_new(), N = SET().nbLessons;
  const add = (name, rows, widths) => { const ws = XLSX.utils.aoa_to_sheet(rows); if (widths) ws['!cols'] = widths.map(w => ({wch: w})); XLSX.utils.book_append_sheet(wb, ws, name); };
  const gName = id => groupById(id)?.name || 'Assaut libre';
  const cl = [];
  for (let n = 1; n <= N; n++) for (const g of S.groups) {
    if (!lessonAssaults(n, g.id).some(a => a.status === 'done')) continue;
    cl.push([`Leçon ${n}${lesson(n).title ? ' · ' + lesson(n).title : ''} · ${g.name}`]);
    cl.push(['Rang', 'Élève', 'Joués', 'Victoires', 'Nuls', 'Défaites', 'Points classement', 'Points marqués', 'Points encaissés', 'Différence']);
    ranking(n, g).forEach((r, i) => cl.push([i + 1, nameOf(r.id), r.J, r.V, r.N, r.D, r.pts, r.pm, r.pe, r.pm - r.pe])); cl.push([]);
  }
  add('Classements', cl.length ? cl : [['Aucun assaut terminé']], [8, 28, 8, 10, 8, 10, 16, 15, 16, 11]);
  const sorted = [...S.assaults].sort((a, b) => a.n - b.n || gName(a.gid).localeCompare(gName(b.gid)) || (a.order || 0) - (b.order || 0));
  const nm = (a, s) => a.names?.[s] || nameOf(s === 'R' ? a.red : a.blue);
  add('Assauts', [['Leçon', 'Groupe', 'Tireur rouge', 'Tireur bleu', 'Score rouge', 'Score bleu', 'Vainqueur', 'Arbitre', 'Coach rouge', 'Coach bleu', 'Repos', 'Reprises', 'Fin', 'Statut'],
    ...sorted.map(a => [a.n, gName(a.gid), nm(a, 'R'), nm(a, 'B'), a.status === 'done' ? a.scoreR : '', a.status === 'done' ? a.scoreB : '', a.status === 'done' ? (a.winner === 'N' ? 'Nul' : nm(a, a.winner)) : '',
      nameOf(a.jc), nameOf(a.jp?.[0]), nameOf(a.jp?.[1]), restOf(a).map(nameOf).join(', '), a.reprises ? `${a.reprises} × ${fmt(a.repSec)}` : '', a.endedAt ? new Date(a.endedAt).toLocaleString('fr-FR') : '', a.status === 'done' ? 'terminé' : 'à faire'])],
    [7, 14, 24, 24, 11, 10, 24, 22, 22, 22, 34, 10, 20, 9]);
  const se = [['Élève', 'Groupe', 'Sexe', 'Assauts', 'Victoires', 'Nuls', 'Défaites', 'Points marqués', 'Points encaissés', 'Coups observés', 'Touches valables', 'Efficacité (%)',
    'Directs (tentés)', 'Directs (valables)', 'Crochets (tentés)', 'Crochets (valables)', 'Chassés (tentés)', 'Chassés (valables)', 'Fouettés (tentés)', 'Fouettés (valables)',
    'Touches visage', 'Touches tronc', 'Touches ligne basse', 'Touches bras/garde', 'Dans le vide', 'Frappes trop fortes', 'Enchaînements tentés', 'Enchaînements réussis', 'Touches arme bonus', 'Arbitre (nb)', 'Coach (nb)', 'Repos (nb)']];
  for (const s of sortedStudents()) { const st = studentStats(s.id);
    se.push([fullName(s), groupOf(s.id)?.name || '', s.sexe, st.J, st.V, st.N, st.D, st.pm, st.pe, st.tent, st.valid, st.tent ? Math.round(100 * st.valid / st.tent) : '',
      ...COUP_KEYS.flatMap(c => [st.coups[c].t, st.coups[c].v]), st.cats.tete, st.cats.tronc, st.cats.bas, st.cats.garde, st.cats.manque, st.trop, st.tries, st.ok, st.bonus, st.jc, st.jp, st.rest]); }
  add('Stats élèves', se, [26, 12, 6, ...Array(27).fill(12)]);
  const pl = [['Élève', 'Groupe', 'Leçon', 'Pilier', 'Critère', 'Observation']];
  for (let n = 1; n <= N; n++) { const p = lessonPil(n); if (!p) continue;
    for (const s of sortedStudents()) { const o = obsAgg(n, s.id); if (!o) continue; p.cr.forEach((c, i) => pl.push([fullName(s), groupOf(s.id)?.name || '', n, p.n, c, o[i] ? OBS[o[i]].n : ''])); } }
  add('Piliers', pl, [26, 12, 7, 26, 44, 12]);
  const to = [['Leçon', 'Groupe', 'Tireur', 'Coin', 'Adversaire', 'Reprise', 'Heure', 'Arme', 'Coup', 'Cible', 'Côté', 'Zone', 'Points', 'Trop fort', 'Enchaînement', 'Arme bonus']];
  for (const a of sorted) { if (a.status !== 'done') continue;
    for (const e of a.events || []) to.push([a.n, gName(a.gid), nm(a, e.t), e.t === 'R' ? 'rouge' : 'bleu', nm(a, OTHER[e.t]), e.rep, new Date(e.ts).toLocaleTimeString('fr-FR'), e.w, COUPS[e.c].l,
      e.z ? ZL[e.z] : 'Dans le vide', e.s === 'g' ? 'gauche' : e.s === 'd' ? 'droite' : '', CATL[e.cat], ptsOf(e), e.trop ? 'oui' : '', e.ench ? 'oui' : '', e.bx ? '+' + e.bx : '']); }
  add('Touches', to, [7, 14, 24, 7, 24, 8, 10, 7, 10, 18, 8, 12, 7, 9, 13]);
  const s = SET();
  add('Cycle', [['Classe', S.name], ['Barème poing (visage / tronc / bas / garde)', ['tete', 'tronc', 'bas', 'garde'].map(c => s.bareme.poing[c]).join(' / ')], ['Barème pied (visage / tronc / bas / garde)', ['tete', 'tronc', 'bas', 'garde'].map(c => s.bareme.pied[c]).join(' / ')],
    ['Frappe trop forte', -s.penalite], ['Bonus enchaînement', s.bonusEnch], ['Classement V / N / D', `${s.ptsV} / ${s.ptsN} / ${s.ptsD}`], ['Arme bonus', s.bonusOn ? `+${s.bonusPts} · ${s.bonusArmes.map(k => COUPS[k].l).join(', ')}` : 'désactivée'], [],
    ['Leçon', 'Titre', 'Pilier', 'Tournoi (min)', 'Reprises'], ...Array.from({length: N}, (_, i) => { const n = i + 1, ls = LS(n); return [n, lesson(n).title, lessonPil(n)?.n || '', ls.totalMin, ls.reprises]; })], [40, 26, 26, 14, 10]);
  XLSX.writeFile(wb, `ObservBF_${(S.name || 'classe').replace(/[^\w-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* =====================================================================
   PWA / démarrage
   ===================================================================== */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
let lock = null;
async function keepAwake() { try { if ('wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => lock = null); } } catch(e) {} }
document.addEventListener('pointerdown', keepAwake);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
document.addEventListener('gesturestart', e => e.preventDefault());
render();
