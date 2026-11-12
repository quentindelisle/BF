/* =====================================================================
   Observ'BF — Boxe française Savate (CA4) · N'EPS numérique · by Quentin Delisle
   Organisation reprise de l'appli Biathlon : tablette enseignant / tablette élève,
   parcours prof en 4 étapes, échanges par QR codes, paramètres du cycle, piliers.
   ===================================================================== */
'use strict';
const APP_VERSION = '3.5.2';
const ROOT_KEY = 'observbf.v3';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const rnd = n => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const uid = () => rnd(6);
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const fmtLong = sec => { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m} min${s ? ' ' + String(s).padStart(2, '0') : ''}` : `${s} s`; };
const capName = s => String(s || '').toLowerCase().replace(/(^|[\s\-'’])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase()).trim();

/* ---------------- Référentiel ---------------- */
const CAT = {tete:'tete', tronc:'tronc', ventre:'tronc', flancs:'tronc', jambes:'bas', cuisse:'bas', tibia:'bas', epaule:'garde', bras:'garde', avantbras:'garde'};
const ZL = BFDraw.ZL;
const ZONES = ['tete', 'tronc', 'epaule', 'bras', 'avantbras', 'cuisse', 'tibia', 'ventre', 'flancs', 'jambes'], SIDES = ['c', 'g', 'd'];
const CATL = {tete:'Visage', tronc:'Tronc', bas:'Ligne basse'};
const COUPS = {direct:{l:'Direct', w:'poing'}, crochet:{l:'Crochet', w:'poing'}, chasse:{l:'Chassé', w:'pied'}, fouette:{l:'Fouetté', w:'pied'}};
const COUP_KEYS = Object.keys(COUPS);
/* Constitution des groupes : niveau (1 à 3) et besoin prioritaire de chaque élève */
const NIVEAUX = [null, 'Débutant', 'Intermédiaire', 'Confirmé'];
const BESOINS = [['conf', 'Confiance'], ['maitrise', 'Maîtrise de soi'], ['tech', 'Technique'], ['phys', 'Condition physique'], ['tact', 'Tactique']];
const besL = k => (BESOINS.find(b => b[0] === k) || [])[1] || '';
/* Saisie « sans regarder » : nombre de doigts = hauteur (1 bas · 2 milieu · 3 haut) */
const BLIND_H = ['bas', 'milieu', 'haut'];
/* Poing : 1 doigt = ventre, 2 doigts = visage · Pied : 1 doigt = jambes, 2 = flancs, 3 = visage */
const BLIND_ZONE = {poing: {haut: ['tete', 'c'], bas: ['ventre', 'c']}, pied: {haut: ['tete', 'c'], milieu: ['flancs', 'c'], bas: ['jambes', 'c']}};
const BLIND_LAB = {poing: {haut: 'visage', milieu: 'torse', bas: 'ventre'}, pied: {haut: 'visage', milieu: 'flancs', bas: 'jambes'}};
const hOf = (arme, fingers) => arme === 'poing' ? (fingers >= 2 ? 'haut' : 'bas') : BLIND_H[Math.min(3, Math.max(1, fingers)) - 1];
/* Niveaux de jugement (réglés leçon par leçon) */
const JUG = {debutant: 'Débutant', debrouille: 'Débrouillé', complet: 'Jugement complet', expert: 'Expert'};
const JUG_HELP = {debutant: 'Une seule case : aucune distinction poing / pied ni de hauteur.', debrouille: 'Poing et pied distingués, pas les hauteurs.', complet: 'Armes, trajectoires et hauteurs, deux coachs sur la tablette.', expert: 'Un seul observateur : main ou pied gauche / droit, côté touché, coups croisés.'};
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
const DEF_BAREME = {poing:{tete:1, tronc:1, bas:1, garde:0, nh:1}, pied:{tete:4, tronc:2, bas:1, garde:0, nh:2}};
const DEF_SET = {jmode:'lecon', nbLessons:6, current:1, totalMin:40, reprises:2, recupSec:30, transitionSec:60, mode:'auto', manualSec:60, bonusOn:true, bonusPts:1, bonusArmes:['direct','crochet','chasse','fouette'],
  bareme:clone(DEF_BAREME), penalite:1, bonusEnch:0, seuil:0.18, ptsV:3, ptsN:2, ptsD:1, autoNext:10, bv:2};

/* ---------------- État ---------------- */
let ROOT, S;
function newClass(name, id) { return {id: id || rnd(4), name: name || 'Classe', students: [], groups: [], settings: clone(DEF_SET), lessons: {}, assaults: []}; }
function normClass(c) {
  const old = c.settings || {}, mig = (old.bv || 0) < 2 && Object.keys(old).length > 0;
  c.settings = Object.assign(clone(DEF_SET), old);
  c.settings.bareme = {poing: Object.assign(clone(DEF_BAREME.poing), old.bareme?.poing), pied: Object.assign(clone(DEF_BAREME.pied), old.bareme?.pied)};
  if (mig) { c.settings.bareme = clone(DEF_BAREME); c.settings.bonusEnch = 0; if (c.settings.manualSec === 90) c.settings.manualSec = 60; }
  c.settings.bonusEnch = 0;   // plus de bonus : l'enchaînement est seulement noté dans les stats
  c.settings.bv = 2;
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
  if (!ROOT.piliers.some(p => p.id === 'ench')) ROOT.piliers.push(clone(DEFAULT_PILIERS.find(p => p.id === 'ench')));
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
const realName = s => s ? `${s.prenom} ${s.nom}`.trim() : '';
const initialOf = s => (String(s.nom || '').trim()[0] || '').toUpperCase();
const nameKey = x => String(x.prenom || '').trim().toLowerCase() + '|' + initialOf(x);
/* Affichage : « Prénom N. » ; « Prénom Nom » seulement si deux élèves ont le même prénom et la même initiale */
function dispName(s) {
  if (!s) return '';
  const pre = String(s.prenom || '').trim(), k = nameKey(s);
  if (S.students.some(x => x.id !== s.id && nameKey(x) === k)) return `${pre} ${capName(s.nom)}`.trim();
  return pre ? `${pre}${initialOf(s) ? ' ' + initialOf(s) + '.' : ''}` : capName(s.nom);
}
const fullName = dispName;
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
const lessonPils = n => { const L = lesson(n); return [L.pil, L.pil2].filter(p => p && typeof p === 'object'); };
/* un ou deux piliers : s'il y en a deux, les critères sont mis bout à bout (jusqu'à 8 critères observés) */
const lessonPil = n => { const a = lessonPils(n); if (!a.length) return null; if (a.length === 1) return a[0]; return {id: a.map(p => p.id).join('+'), n: a.map(p => p.n).join(' + '), cr: a.flatMap(p => p.cr)}; };
/* Niveaux de jugement : un niveau par leçon, ou un niveau par élève (fil rouge) */
const studentLevel = s => s && JUG[s.jug] && s.jug !== 'expert' ? s.jug : 'debutant';
function levelsFor(n, jp) {
  const L = lesson(n);
  if (SET().jmode !== 'eleve') { const j = JUG[L.jug] ? L.jug : 'complet'; return {R: j, B: j}; }
  if (L.xp) return {R: 'expert', B: 'expert'};
  const lv = id => stu(id) ? studentLevel(stu(id)) : 'complet';
  return {R: lv(jp[0]), B: lv(jp[1])};
}
/* Gestion du tournoi de la leçon : « assaut » = durée de reprise et temps mort fixes · « tournoi » = durée totale fixe, l'appli répartit */
const LS = n => { const L = lesson(n), s = SET(), tm = L.tmode ?? (s.mode === 'manuel' ? 'assaut' : 'tournoi');
  return {totalMin: L.totalMin ?? s.totalMin, reprises: L.reprises ?? s.reprises, recupSec: L.deadSec ?? s.recupSec, transitionSec: s.transitionSec, mode: tm === 'assaut' ? 'manuel' : 'auto', tmode: tm, manualSec: L.repSec ?? s.manualSec}; };
/* Réglages de saisie de la leçon : niveau de jugement, armes autorisées, enchaînements, arme bonus */
function lessonCfg(n) {
  const L = lesson(n), diff = SET().jmode === 'eleve', jug = diff ? (L.xp ? 'expert' : 'complet') : (JUG[L.jug] ? L.jug : 'complet');
  return {jug, diff, poing: L.poing !== false, pied: L.pied !== false,
    ench: jug !== 'debutant' && (L.ench === true || (L.ench == null && lessonPils(n).some(p => p.id === 'ench'))), bon: jug !== 'debutant' && (L.bon ?? !!SET().bonusOn)};
}
const lessonLabel = n => `Leçon ${n}/${SET().nbLessons}` + (lesson(n).title ? ' · ' + lesson(n).title : '');
function timing(n, nb) {
  const s = LS(n), nA = nb * (nb - 1) / 2, R = Math.max(1, +s.reprises || 1), rec = +s.recupSec || 0, tr = +s.transitionSec || 0;
  let rep, warn = '';
  if (s.mode === 'manuel' || !nA) rep = +s.manualSec || 90;
  else { rep = Math.floor(((s.totalMin * 60 / nA) - tr - (R - 1) * rec) / R / 5) * 5; if (rep < 30) { rep = 30; warn = 'Temps insuffisant'; } if (rep > 180) rep = 180; }
  const assaultSec = R * rep + (R - 1) * rec, total = nA * (assaultSec + tr);
  const fit = nA ? Math.min(nA, Math.max(0, Math.floor((s.totalMin * 60 + tr) / (assaultSec + tr)))) : 0;
  if (!warn && total > s.totalMin * 60 + 1) warn = 'Dépasse la durée prévue';
  return {nA, rep, rec, R, assaultSec, total, warn, fit, partial: nA > 0 && fit < nA, tr, tmode: s.tmode, totalMin: s.totalMin};
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
/* Classement. Si le tournoi n'a pas pu aller au bout (assauts restants), le classement final est pondéré :
   note = (points par reprise disputée) × (reprises prévues) × coefficient, coefficient = 0,5 + 0,5 × (reprises disputées ÷ reprises prévues). */
function ranking(n, g) {
  const s = SET(), ids = new Set(g.members), all = lessonAssaults(n, g.id), R0 = Math.max(1, +LS(n).reprises || 1);
  all.forEach(a => { ids.add(a.red); ids.add(a.blue); });
  const rows = new Map([...ids].filter(id => stu(id)).map(id => [id, {id, J: 0, V: 0, N: 0, D: 0, pts: 0, pm: 0, pe: 0, rd: 0, rp: 0}]));
  for (const a of all) {
    const rr = a.reprises || R0;
    [a.red, a.blue].forEach(id => { const r = rows.get(id); if (r) r.rp += rr; });
    if (a.status !== 'done') continue;
    const played = Math.max(1, Math.min(rr, a.rp || rr));
    for (const [me, my, their, w] of [[a.red, a.scoreR, a.scoreB, 'R'], [a.blue, a.scoreB, a.scoreR, 'B']]) {
      const r = rows.get(me); if (!r) continue;
      r.J++; r.pm += my; r.pe += their; r.rd += played;
      if (a.winner === 'N') { r.N++; r.pts += +s.ptsN; } else if (a.winner === w) { r.V++; r.pts += +s.ptsV; } else { r.D++; r.pts += +s.ptsD; }
    }
  }
  const inc = all.some(a => a.status === 'done') && all.some(a => a.status !== 'done');
  const list = [...rows.values()].filter(r => r.J || g.members.includes(r.id));
  list.forEach(r => { r.coef = r.rp ? Math.min(1, r.rd / r.rp) : 0; r.note = r.rd ? Math.round(r.pts / r.rd * r.rp * (0.5 + 0.5 * r.coef) * 10) / 10 : 0; });
  list.sort((a, b) => (inc ? b.note - a.note : 0) || b.pts - a.pts || (b.pm - b.pe) - (a.pm - a.pe) || b.pm - a.pm || nameOf(a.id).localeCompare(nameOf(b.id), 'fr'));
  list.inc = inc; return list;
}
function rankingTable(n, g, compact) {
  const rk = ranking(n, g); if (!rk.length) return '<p class="note">Aucun élève.</p>';
  const inc = rk.inc;
  return (inc ? `<p class="note" style="margin:0 0 3px"><b>Tournoi incomplet</b> : classement pondéré par les assauts et reprises réellement disputés.</p>` : '') +
    `<div class="table-wrap"><table class="tight"><thead><tr><th>#</th><th>Élève</th><th class="n">J</th><th class="n">V</th><th class="n">N</th><th class="n">D</th><th class="n">Pts</th>${inc ? '<th class="n" title="reprises disputées / prévues">Rep.</th><th class="n" title="coefficient de pondération">Coef.</th><th class="n">Note pond.</th>' : ''}${compact ? '' : '<th class="n">Marqués</th><th class="n">Encaissés</th><th class="n">Diff.</th>'}</tr></thead><tbody>` +
    rk.map((r, i) => `<tr class="${i === 0 && r.J ? 'rank-1' : ''}"><td>${i + 1}</td><td>${esc(nameOf(r.id))}${present(n, r.id) ? '' : ' <span class="status">absent</span>'}</td><td class="n">${r.J}</td><td class="n">${r.V}</td><td class="n">${r.N}</td><td class="n">${r.D}</td><td class="n"><b>${r.pts}</b></td>${inc ? `<td class="n">${r.rd}/${r.rp}</td><td class="n">${r.coef.toFixed(2)}</td><td class="n"><b>${r.note}</b></td>` : ''}${compact ? '' : `<td class="n">${r.pm}</td><td class="n">${r.pe}</td><td class="n">${r.pm - r.pe > 0 ? '+' : ''}${r.pm - r.pe}</td>`}</tr>`).join('') + '</tbody></table></div>';
}

/* ---------------- Points et statistiques ---------------- */
function ptsOf(e) { if (!e.z) return 0; if (e.trop) return -Math.abs(+SET().penalite || 0); const B = SET().bareme[e.w] || {}, b = +(e.nh ? (B.nh ?? B.tronc ?? 0) : (B[e.cat] ?? 0)); return b > 0 ? b + (+e.bx || 0) : b; }
const isValid = e => e.z && !e.trop && ptsOf(e) > 0;
function enchStats(events, side) {
  const m = new Map();
  for (const e of events) if (e.t === side && e.ench) { if (!m.has(e.ench)) m.set(e.ench, []); m.get(e.ench).push(e); }
  let tries = 0, ok = 0; for (const arr of m.values()) { if (arr.length < 2) continue; tries++; if (arr.length === 2 && arr.every(isValid)) ok++; }
  return {tries, ok};
}
const scoreOf = (events, side) => events.filter(e => e.t === side).reduce((s, e) => s + ptsOf(e), 0);
function sideStats(events, side) {
  const ev = events.filter(e => e.t === side), ev2 = ev.filter(e => !e.gen);
  const st = {tent: ev.length, valid: ev.filter(isValid).length, trop: ev.filter(e => e.trop).length, bonus: ev.filter(e => e.bx && isValid(e)).length, cats: {}, coups: {}, nh: ev.filter(e => e.nh).length, gen: ev.filter(e => e.gen).length, cross: ev.filter(e => e.main && e.k && e.main !== e.k).length, ...enchStats(events, side)};
  for (const k in CATL) st.cats[k] = ev.filter(e => e.cat === k && !e.nh).length;
  for (const c in COUPS) { const ce = ev2.filter(e => e.c === c); st.coups[c] = {t: ce.length, v: ce.filter(isValid).length}; }
  st.poing = ev2.filter(e => e.w === 'poing').length; st.pied = ev2.filter(e => e.w === 'pied').length;
  return st;
}
function studentStats(id, n) {
  const st = {J:0, V:0, N:0, D:0, pm:0, pe:0, tent:0, valid:0, trop:0, poing:0, pied:0, tries:0, ok:0, bonus:0, nh:0, gen:0, cross:0, jc:0, jp:0, rest:0, cats:{}, coups:{}};
  for (const k in CATL) st.cats[k] = 0; for (const c in COUPS) st.coups[c] = {t: 0, v: 0};
  for (const a of S.assaults) {
    if (a.status !== 'done' || (n && a.n !== n)) continue;
    if (a.jc === id) st.jc++; if ((a.jp || []).includes(id)) st.jp++; if (restOf(a).includes(id)) st.rest++;
    const side = a.red === id ? 'R' : a.blue === id ? 'B' : null; if (!side) continue;
    st.J++; st.pm += side === 'R' ? a.scoreR : a.scoreB; st.pe += side === 'R' ? a.scoreB : a.scoreR;
    if (a.winner === 'N') st.N++; else if (a.winner === side) st.V++; else st.D++;
    const s = sideStats(a.events || [], side);
    for (const k of ['tent', 'valid', 'trop', 'poing', 'pied', 'tries', 'ok', 'bonus', 'nh', 'gen', 'cross']) st[k] += s[k];
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
  m.classList.toggle('compact', v === 'prof');
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
    <div class="home-grid two"><button class="home-btn hb-orange" data-action="go" data-view="receive"><span class="ico">📷</span>Scanner la leçon</button><button class="home-btn hb-violet" data-action="openFree"><span class="ico">🤝</span>Assaut libre<small>noms à saisir · à envoyer plus tard</small></button></div></div>`;
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
  prep:   {ico: '🛠', t: 'Préparer le cycle', tabs: [['classe', '👥 Classe & élèves'], ['cycle', '⚙️ Paramètres du cycle'], ['piliers', '🏛 Piliers']]},
  jour:   {ico: '📅', t: 'Leçon du jour', tabs: [['appel', '✅ Appel'], ['groupes', '🎽 Constituer les groupes'], ['niveaux', '🎚 Niveaux de jugement'], ['tournoi', '🏁 Tournoi'], ['assauts', '🥊 Assauts & rôles'], ['qr', '📲 QR de la leçon']]},
  recup:  {ico: '📥', t: 'Récupérer les résultats', tabs: []},
  notice: {ico: '📖', t: 'Notice de saisie', tabs: []},
  bilans: {ico: '📊', t: 'Résultats et bilans', tabs: [['classements', '🏆 Classements'], ['stats', '📊 Stats élèves'], ['obs', '🏛 Bilan des piliers'], ['export', '📁 Export & réglages']]}};
const sectOf = tab => tab === 'recup' ? 'recup' : tab === 'notice' ? 'notice' : Object.keys(PSECT).find(k => PSECT[k].tabs.some(t => t[0] === tab));
function sectHeader(sec) {
  const P = PSECT[sec], N = SET().nbLessons, cur = curLesson();
  const cls = Object.values(ROOT.classes), lessons = sec === 'jour' || sec === 'recup';
  return `<div class="sect-bar"><button class="btn small" data-action="tab" data-tab="menu" aria-label="Menu enseignant">←</button><h2>${P.ico} ${P.t}</h2>
      ${P.tabs.length ? `<div class="tabs mini">${P.tabs.map(([k, l]) => `<button class="tab ${UI.tab === k ? 'on' : ''}" data-action="tab" data-tab="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="class-chips">${cls.map(c => `<button class="class-chip ${c.id === S.id ? 'on' : ''}" data-action="selClass" data-id="${c.id}">🏫 ${esc(c.name)}</button>`).join('')}</div></div>
    ${lessons ? `<div class="sect-lesson"><span class="lbl">Leçon du jour</span><div class="lesson-picker mini">${Array.from({length: N}, (_, i) => i + 1).map(n => `<button class="lp ${n === cur ? 'on' : ''}" data-action="setCurrent" data-n="${n}">${n}</button>`).join('')}</div>
      <b class="note">${esc(lesson(cur).title || 'Sans titre')}${lessonPil(cur) ? ' · 🏛 ' + esc(lessonPil(cur).n) : ''}</b></div>` : ''}`;
}
function viewProf() {
  const t = UI.tab || 'menu';
  if (t === 'menu') return profMenu();
  const sec = sectOf(t); if (!sec) { UI.tab = 'menu'; return profMenu(); }
  const body = {classe: profClasse, groupes: profGroupes, niveaux: profNiveaux, tournoi: profTournoi, cycle: profCycle, piliers: profPiliers, appel: profAppel, assauts: profAssauts, qr: profQR,
    recup: profRecup, classements: profClassements, stats: profStats, obs: profObs, export: profExport, notice: profNotice}[t]();
  return sectHeader(sec) + body;
}
const appURL = () => location.href.split('#')[0].split('?')[0].replace(/index\.html$/, '');
function profMenu() {
  const n = curLesson(), done = S.assaults.filter(a => a.n === n && a.gid && a.status === 'done').length, all = S.assaults.filter(a => a.n === n && a.gid).length;
  return `<div class="card strong menu-head"><b>🏫 ${esc(S.name)}</b> · ${esc(lessonLabel(n))} · ${S.students.length} élèves · ${S.groups.length} groupe(s) · ${done}/${all} assauts reçus
      <button class="btn small" data-action="tab" data-tab="notice">📖 Notice de saisie</button></div>
    <div class="pmenu">
      <button class="pm-btn" data-action="tab" data-tab="classe"><span class="step">1</span><span class="ico">🛠</span>Préparer le cycle<small>Classe · paramètres du cycle · piliers</small></button>
      <button class="pm-btn" data-action="tab" data-tab="appel"><span class="step">2</span><span class="ico">📅</span>Leçon du jour<small>Appel · groupes · tournoi · assauts & rôles · QR</small></button>
      <button class="pm-btn" data-action="tab" data-tab="recup"><span class="step">3</span><span class="ico">📥</span>Récupérer<small>Scanner les QR des tablettes élèves</small></button>
      <button class="pm-btn" data-action="tab" data-tab="classements"><span class="step">4</span><span class="ico">📊</span>Résultats et bilans<small>Classements · stats · piliers · export</small></button>
    </div>
    ${/^https?:/.test(location.protocol) ? `<div class="card app-qr"><img src="${BFQR.urlQR(appURL(), 5)}" alt="QR d'accès à l'application">
      <div><b>📲 Installer l'appli sur une tablette élève</b><div class="note">Scannez avec l'appareil photo, ouvrez le lien, puis Partager → « Sur l'écran d'accueil ».</div><div class="app-url">${esc(appURL())}</div></div></div>` : ''}`;
}

/* ---- 1. Classe & élèves ---- */
function profClasse() {
  const f = S.students.filter(s => s.sexe === 'F').length, nb = S.students.filter(s => s.sexe === 'N').length, many = Object.keys(ROOT.classes).length > 1;
  return `<div class="card"><div class="row">
      <label class="field">Classe<input type="text" data-field="className" value="${esc(S.name)}"></label>
      <label class="field">Nouvelle<input type="text" id="newClass" placeholder="ex. 2nde 4" size="9"></label>
      <button class="btn green small" data-action="addClass">＋ Classe</button>${many ? `<button class="btn danger small" data-action="delClass">🗑 « ${esc(S.name)} »</button>` : ''}
      <span class="sep"></span>
      <label class="btn primary small file-btn">📂 Importer Excel / CSV<input type="file" id="fileStudents" accept=".xlsx,.xls,.csv,.txt"></label>
      <span class="note grow">Export Pronote / Siècle : Nom · Prénom · Prénom d'usage · Sexe · Classe (une classe créée par valeur).</span></div>
    <form class="row add-form" id="addForm"><b>Ajouter</b><input type="text" id="addNom" placeholder="NOM" autocomplete="off" size="14"><input type="text" id="addPrenom" placeholder="Prénom" autocomplete="off" size="14">
      <div class="seg small" id="addSexe"><button type="button" data-v="G" class="on">Garçon</button><button type="button" data-v="F">Fille</button><button type="button" data-v="N">Non genré</button></div>
      <button class="btn green small" type="submit">＋</button></form></div>
    <div class="card"><div class="row between"><h2 style="margin:0">${S.students.length} élève(s) <span class="muted" style="font:600 12px var(--font)">${S.students.length ? `· ${S.students.length - f - nb} G · ${f} F${nb ? ` · ${nb} non genré` : ''}` : ''}</span></h2>
      <span class="note grow" style="text-align:center">Pastille G / F / N = dessin du combattant · <b>1 2 3</b> = niveau (débutant → confirmé) · liste = besoin</span>
      ${S.students.length ? '<button class="btn small danger" data-action="clearStudents">Vider la liste</button>' : ''}</div>
      <div class="tiles-grid">${sortedStudents().map(s => `<div class="stile"><button class="sx ${s.sexe}" data-action="toggleSex" data-sid="${s.id}" aria-label="Garçon, fille ou non genré">${s.sexe}</button><span class="nm"><b>${esc(dispName(s))}</b></span>
        <button class="niv n${s.niv || 0}" data-action="cycleNiv" data-sid="${s.id}" title="Niveau : ${NIVEAUX[s.niv || 0] || 'non renseigné'}">${s.niv || '–'}</button>
        <select class="bes" data-field="stuBes" data-sid="${s.id}" title="Besoin prioritaire"><option value="">besoin</option>${BESOINS.map(([k, l]) => `<option value="${k}" ${s.bes === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="del" data-action="delStudent" data-sid="${s.id}" aria-label="Retirer">×</button></div>`).join('')}</div></div>`;
}

/* ---- Groupes colorés ---- */
function profGroupes() {
  const G = S.groups.length, placed = new Set(S.groups.flatMap(g => g.members)), crit = UI.gcrit || 'libre', comp = UI.gcomp || 'hetero';
  const pool = sortedStudents(S.students.filter(s => !placed.has(s.id)));
  const item = (id, g) => { const s = stu(id); return s ? `<div class="gitem ${UI.sel === id ? 'sel' : ''}" data-gid="${id}" ${g ? `style="--gc:${gcol(g.color).c}"` : ''}><span class="sx ${s.sexe}">${s.sexe}</span><span class="gn"><b>${esc(dispName(s))}</b></span>${s.niv ? `<i class="nv n${s.niv}" title="${NIVEAUX[s.niv]}">${s.niv}</i>` : ''}${s.bes ? `<i class="bs" title="${besL(s.bes)}">${esc(besL(s.bes).slice(0, 3))}</i>` : ''}</div>` : ''; };
  const seg = (key, cur, opts) => `<div class="seg small">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-action="gset" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const sel = UI.sel ? stu(UI.sel) : null;
  return `<div class="card gbar"><div class="gset"><span class="lbl">Groupes</span><div class="lesson-picker mini">${Array.from({length: 10}, (_, i) => i + 1).map(n => `<button class="lp small ${n === G ? 'on' : ''}" data-action="setGroups" data-n="${n}">${n}</button>`).join('')}</div></div>
      <div class="gset"><span class="lbl">Groupes constitués selon</span>${seg('gcrit', crit, [['libre', '✋ Libre (glisser-déposer)'], ['besoin', '🎯 Les besoins'], ['niveau', '📶 Les niveaux']])}</div>
      <div class="gset" ${crit === 'libre' ? 'hidden' : ''}><span class="lbl">Composition</span>${seg('gcomp', comp, [['hetero', '🔀 Hétérogène'], ['homo', '🟰 Homogène']])}</div>
      <div class="gset btns"><button class="btn small primary" data-action="autoGroups">🎲 ${crit === 'libre' ? 'Répartir au hasard (mixte)' : 'Constituer'}</button><button class="btn small ghost" data-action="clearGroups">Tout retirer</button></div>
      <div class="ghint">${sel ? `👉 <b>${esc(fullName(sel))}</b> : touchez le groupe où le placer` : 'Touchez un élève puis son nouveau groupe (ou glissez-le).'}${crit === 'libre' ? '' : ` · niveaux et besoins se renseignent dans <b>Classe & élèves</b>`}</div></div>
    <div class="gzone pool ${UI.sel ? 'target' : ''}" data-zone=""><h3>Sans groupe <span class="meta">(${pool.length})</span></h3><div class="gitems">${pool.map(s => item(s.id)).join('') || '<span class="note">Tous les élèves sont placés.</span>'}</div></div>
    <div class="groups ${UI.sel ? 'has-sel' : ''}" style="grid-template-columns:repeat(${Math.max(1, Math.min(G, 5))},minmax(0,1fr))">${S.groups.map(g => { const t = timing(curLesson(), g.members.length);
      return `<div class="gzone colored" data-zone="${g.id}" style="${gStyle(g)}"><h3><button class="gdotbtn" data-action="cycleGroupColor" data-g="${g.id}" title="Changer la couleur">${gDot(g)}</button>${esc(g.name)} <span class="meta">${g.members.length} · ${t.nA} assauts · ${fmt(t.rep)}</span></h3>
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
    const L = lesson(n), ls = LS(n), t = timing(n, biggest), cfg = lessonCfg(n), deb = cfg.jug === 'debutant';
    rows += `<div class="lrow"><div class="lp ${n === cur ? 'on' : ''}">${n}</div>
      <input type="text" data-field="lTitle" data-n="${n}" value="${esc(L.title)}" placeholder="${n === 1 ? 'Titre : découverte, règles, sécurité' : n === N ? 'Titre : tournoi final' : 'Titre : tournoi poules'}" aria-label="Titre de la leçon ${n}">
      <select data-field="lPil" data-n="${n}" aria-label="Pilier 1">${pilOpts(L.pil?.id)}</select>
      <select data-field="lPil2" data-n="${n}" aria-label="Pilier 2">${pilOpts(L.pil2?.id)}</select>
      <div class="lrow2">${[['poing', '🥊', 'Poings autorisés'], ['pied', '🦶', 'Pieds autorisés'], ['ench', '🔗', 'Enchaînements'], ['bon', '★', 'Arme bonus (coaching)']].map(([k, i, t2]) => `<button class="tg ${cfg[k] && !deb ? 'on' : ''}" data-action="lTog" data-n="${n}" data-k="${k}" title="${t2}" ${deb ? 'disabled' : ''}>${i}</button>`).join('')}</div>
      <label class="mini-f"><input type="number" min="0" max="240" data-field="lTotal" data-n="${n}" value="${ls.totalMin}"> min</label>
      <label class="mini-f"><input type="number" min="1" max="5" data-field="lRep" data-n="${n}" value="${ls.reprises}"> rep.</label>
      <span class="lrow-info">${t.nA} assauts · ${fmt(t.rep)}${t.warn ? ` · <b style="color:var(--warn)">${t.warn}</b>` : ''}</span></div>`;
  }
  const f = (label, html) => `<label>${label}${html}</label>`;
  const num = (k, min, max, step = 1) => `<input type="number" min="${min}" max="${max}" step="${step}" data-field="set" data-k="${k}" value="${s[k]}">`;
  const bv = (w, c, v) => `<input type="number" min="0" max="20" data-field="bareme" data-w="${w}" data-c="${c}" value="${v}">`;
  const jm = (v, t) => `<button class="${(s.jmode || 'lecon') === v ? 'on' : ''}" data-action="setJmode" data-v="${v}">${t}</button>`;
  return `<div class="pgrid"><div class="pcol">
    <div class="card"><h2>Le cycle</h2><div class="cgrid">
        ${f('Leçons', `<div class="stepper"><button data-action="nbLessons" data-d="-1">−</button><b>${N}</b><button data-action="nbLessons" data-d="1">+</button></div>`)}${f('Suite auto (s)', num('autoNext', 3, 60))}</div>
      <p class="note">Durées, reprises et temps morts : <b>Leçon du jour → 🏁 Tournoi</b>. Groupes : <b>Leçon du jour → 🎽 Constituer les groupes</b>.</p></div>
    <div class="card"><h2>🎚 Capacité de juger <span class="note">(fil rouge sur 4 niveaux)</span></h2>
      <div class="seg small">${jm('lecon', 'Un niveau pour chaque leçon')}${jm('eleve', 'Niveaux différenciés par élève')}</div>
      <p class="note">${(s.jmode || 'lecon') === 'eleve' ? 'Chaque élève juge au niveau qui lui est attribué (débutant → débrouillé → complet) ; en fin de leçon, vous décidez qui change de niveau. Le mode expert se déclenche à la main (une tablette par élève observé).' : 'Un seul niveau de jugement pour toute la classe, choisi leçon par leçon.'} Réglage : <b>Leçon du jour → 🎚 Niveaux de jugement</b>.</p></div>
    <div class="card"><h2>🎯 Arme bonus <span class="note">(coaching entre deux reprises, à activer leçon par leçon avec ★)</span></h2><div class="cgrid">
        ${f('Points en plus', num('bonusPts', 1, 5))}</div>
      <div class="row" style="margin-top:5px">${COUP_KEYS.map(c => `<label class="chk"><input type="checkbox" data-field="bonusArme" data-c="${c}" ${s.bonusArmes.includes(c) ? 'checked' : ''}> ${COUPS[c].l}</label>`).join('')}</div></div></div>
    <div class="pcol">
    <div class="card"><h2>Valeurs des touches <span class="note">(la garde et le vide ne comptent pas)</span></h2><div class="cgrid">
        ${f('Poing : direct, crochet', bv('poing', 'all', s.bareme.poing.tete))}${f('Trop fort (−)', num('penalite', 0, 5))}<span></span>
        ${f('Pied · ligne basse (jambes)', bv('pied', 'bas', s.bareme.pied.bas))}${f('Pied · ligne médiane (flancs)', bv('pied', 'tronc', s.bareme.pied.tronc))}${f('Pied · ligne haute (visage)', bv('pied', 'tete', s.bareme.pied.tete))}</div>
      <div class="cgrid" style="margin-top:6px">${f('Points V / N / D', `<span class="row" style="gap:3px;flex-wrap:nowrap">${num('ptsV', 0, 10)}${num('ptsN', 0, 10)}${num('ptsD', 0, 10)}</span>`)}
        <label style="grid-column:span 2">Geste droit / courbe : ${Math.round(s.seuil * 100)} %<input type="range" min="0.08" max="0.40" step="0.01" data-field="set" data-k="seuil" value="${s.seuil}"></label></div></div></div>
    <div class="card wide"><h2>Les leçons</h2>
      <div class="lrow lhead"><span title="Numéro de la leçon">N°</span><span title="Nom de la leçon, affiché sur les tablettes élèves">Titre de la leçon</span><span title="Premier pilier observé par les juges pendant les assauts">Pilier observé n° 1</span><span title="Deuxième pilier facultatif (jusqu'à deux piliers par leçon)">Pilier n° 2 (facultatif)</span><span title="Cliquez pour autoriser (orange) ou interdire chaque élément dans cette leçon">Autorisé dans la saisie</span><span title="Durée totale du tournoi de la leçon, en minutes">Durée leçon</span><span title="Nombre de reprises par assaut">Reprises</span><span title="Aperçu calculé pour le plus grand groupe">Aperçu du plus grand groupe</span></div>
      <p class="note" style="margin:0 0 2px">Cases d'autorisation : 🥊 poings · 🦶 pieds · 🔗 enchaînements · ★ arme bonus (orange = autorisé). Le niveau de jugement se règle dans <b>Leçon du jour → 🎚 Niveaux de jugement</b>.</p>${rows}</div></div>`;
}

/* ---- Piliers ---- */
function profPiliers() {
  const used = id => Object.values(S.lessons).some(L => L.pil?.id === id || L.pil2?.id === id);
  return `<div class="pil-bar"><span class="note grow">Le juge de points observe le pilier de la leçon pour chaque tireur (Jamais → Toujours) ; la leçon suivante, l'élève reçoit un conseil sur son critère le plus faible. Le pilier <b>Enchaîner</b> active par défaut les enchaînements de la leçon (modifiable avec 🔗 dans Paramètres du cycle).</span>
      <button class="btn green small" data-action="pilAdd">＋ Nouveau pilier</button><button class="btn ghost small" data-action="pilReset">Piliers par défaut</button></div>
    <div class="pil-list">${ROOT.piliers.map(p => `<div class="pil-item"><div class="row"><input type="text" class="grow" style="font-weight:800" data-field="pilName" data-id="${p.id}" value="${esc(p.n)}" placeholder="Nom du pilier">
        ${used(p.id) ? '<span class="pill">utilisé</span>' : ''}<button class="btn small danger" data-action="pilDel" data-id="${p.id}">🗑</button></div>
      <div class="pil-cr">${Array.from({length: 4}, (_, i) => `<input type="text" data-field="pilCr" data-id="${p.id}" data-i="${i}" value="${esc(p.cr[i] || '')}" placeholder="Critère ${i + 1}${i ? ' (facultatif)' : ''}">`).join('')}</div></div>`).join('')}</div>`;
}
function refreshPilSnapshots(id) {
  const p = pilById(id);
  Object.values(ROOT.classes).forEach(c => Object.values(c.lessons || {}).forEach(L => { if (L.pil && L.pil.id === id) L.pil = snapPil(p); if (L.pil2 && L.pil2.id === id) L.pil2 = snapPil(p); }));
}

/* ---- Niveaux de jugement (leçon du jour) ---- */
function profNiveaux() {
  const n = curLesson(), L = lesson(n), diff = SET().jmode === 'eleve', cfg = lessonCfg(n);
  const card = (k, on, act) => `<button class="card tmode ${on ? 'on' : ''}" data-action="${act}" data-k="${k}" style="text-align:left;margin:0;flex:1;min-width:200px"><b>${JUG[k]}</b><div class="note">${JUG_HELP[k]}</div></button>`;
  if (!diff) return `<div class="card"><h2>🎚 Niveau de jugement · ${esc(lessonLabel(n))}</h2>
      <p class="note">Un seul niveau pour toute la classe sur cette leçon. Pour des niveaux différents selon l'élève : <b>Préparer le cycle → Paramètres du cycle → Capacité de juger</b>.</p>
      <div class="row" style="align-items:stretch;gap:6px">${Object.keys(JUG).map(k => card(k, cfg.jug === k, 'lJugSet')).join('')}</div>
      ${cfg.jug === 'expert' ? '<p class="note"><b>Mode expert</b> : un seul élève observé par tablette, donc une tablette par élève observé.</p>' : ''}</div>`;
  const rows = sortedStudents().map(s => {
    const lv = studentLevel(s), ob = obsAgg(n, s.id), vals = (ob || []).filter(Boolean), mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, st = studentStats(s.id, n), idx = Object.keys(JUG).indexOf(lv);
    const sug = mean == null ? '' : mean >= 3.5 && idx < 2 ? `⬆ ${JUG[Object.keys(JUG)[idx + 1]]}` : mean <= 1.5 && idx > 0 ? `⬇ ${JUG[Object.keys(JUG)[idx - 1]]}` : '';
    return `<tr><td>${esc(dispName(s))}</td><td><div class="seg small">${['debutant', 'debrouille', 'complet'].map(k => `<button class="${lv === k ? 'on' : ''}" data-action="stuJug" data-sid="${s.id}" data-v="${k}">${JUG[k]}</button>`).join('')}</div></td>
      <td class="n">${st.jc + st.jp}</td><td class="n">${mean == null ? '—' : mean.toFixed(1) + ' / 4'}</td><td>${sug ? `<b style="color:var(--orange)">${sug}</b>` : ''}</td></tr>`; }).join('');
  return `<div class="card row"><span class="note grow" style="margin:0">Chaque élève juge au niveau indiqué, dès sa prochaine séance de juge : l'écran de saisie s'adapte à son niveau. <b>En fin de leçon</b>, ajustez les niveaux selon vos observations (la suggestion vient de l'observation du pilier de la leçon : ≥ 3,5 sur 4 → monter, ≤ 1,5 → redescendre).</span>
      <button class="btn small primary" data-action="applySugg">Appliquer les suggestions</button>
      <button class="btn small ${L.xp ? 'primary' : ''}" data-action="xpToggle" title="Une tablette par élève observé">🎯 Mode expert ${L.xp ? 'activé' : 'pour cette leçon'}</button></div>
    ${L.xp ? '<div class="advice warn">Mode expert activé pour la leçon : tous les juges saisissent au niveau expert (un seul élève observé par tablette). Les niveaux ci-dessous sont ignorés pendant cette leçon.</div>' : ''}
    <div class="card"><div class="table-wrap"><table class="tight"><thead><tr><th>Élève</th><th>Niveau de juge</th><th class="n" title="Nombre de rôles de coach ou d'arbitre tenus cette leçon">Rôles juge</th><th class="n" title="Moyenne des observations du pilier de la leçon (1 = jamais, 4 = toujours)">Observé</th><th>Suggestion</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

/* ---- Gestion du tournoi (leçon du jour) ---- */
function profTournoi() {
  const n = curLesson(), ls = LS(n), s = SET();
  const num = (field, v, min, max, step = 1) => `<input type="number" min="${min}" max="${max}" step="${step}" data-field="${field}" data-n="${n}" value="${v}">`;
  const mode = (v, t, help) => `<button class="card tmode ${ls.tmode === v ? 'on' : ''}" data-action="tmode" data-v="${v}" style="text-align:left;margin:0"><b>${t}</b><div class="note">${help}</div></button>`;
  const groups = S.groups.filter(g => g.members.length);
  return `<div class="tourn-grid"><div class="card"><h2>🏁 Gestion du tournoi · ${esc(lessonLabel(n))}</h2>
      <div class="row" style="align-items:stretch;gap:6px">
        ${mode('assaut', '⏱ Temps d\'assaut fixe', 'Je choisis la durée de chaque reprise et du temps mort (par défaut 1 min et 30 s).')}
        ${mode('tournoi', '🏁 Temps de tournoi fixe', 'Je fixe la durée du tournoi : l\'appli répartit reprises et assauts selon la taille de chaque groupe.')}</div>
      <div class="cgrid" style="margin-top:8px;grid-template-columns:repeat(3,1fr)">
        ${ls.tmode === 'assaut' ? `<label>Durée d'une reprise (s)${num('lRepSec', ls.manualSec, 20, 300, 5)}</label>` : `<label>Durée du tournoi (min)${num('lTotal', ls.totalMin, 5, 240)}</label>`}
        <label>Temps mort (s)${num('lDead', ls.recupSec, 0, 120, 5)}</label>
        <label>Reprises par assaut${num('lRep', ls.reprises, 1, 5)}</label>
        <label>Changement d'assaut (s)<input type="number" min="0" max="300" step="5" data-field="set" data-k="transitionSec" value="${s.transitionSec}"></label>
        ${ls.tmode === 'assaut' ? `<label>Durée de la leçon (min)${num('lTotal', ls.totalMin, 5, 240)}</label>` : ''}</div></div>
    <div class="card"><h2>🏆 Si le tournoi ne peut pas se terminer</h2>
      <p class="note">Un classement final reste possible : il est <b>pondéré</b> par les assauts et reprises réellement disputés.</p>
      <p class="note"><b>Note pondérée</b> = points par reprise disputée × reprises prévues × coefficient, avec <b>coefficient = 0,5 + 0,5 × (reprises disputées ÷ reprises prévues)</b>. Un élève qui a tout disputé garde ses points ; moins il a combattu, plus sa note est tirée vers le bas. Il s'affiche automatiquement dans les classements dès qu'il reste des assauts à faire.</p></div></div>
    <div class="card"><div class="table-wrap"><table class="tight"><thead><tr><th>Groupe</th><th class="n">Présents</th><th class="n">Assauts</th><th>Reprises</th><th class="n">Temps mort</th><th class="n">Changement</th><th class="n">Durée totale</th><th>Verdict</th></tr></thead><tbody>
      ${groups.map(g => { const nb = presentMembers(n, g).length, t = timing(n, nb);
        return `<tr><td>${gDot(g)}<b>${esc(g.name)}</b></td><td class="n">${nb}</td><td class="n">${t.nA}</td><td>${t.R} × ${fmt(t.rep)}</td><td class="n">${t.R > 1 ? fmt(t.rec) : '—'}</td><td class="n">${fmt(t.tr)}</td><td class="n">${t.nA ? fmtLong(t.total) : '—'}</td>
          <td>${t.partial ? `<b style="color:var(--warn)">⚠ ${t.fit} assaut${t.fit > 1 ? 's' : ''} sur ${t.nA} tiendront : classement pondéré</b>` : t.nA ? '<b style="color:var(--green)">✓ le tournoi tient dans le temps</b>' : '—'}${t.warn && !t.partial ? ` · ${t.warn}` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="note">Aucun groupe : <button class="btn small" data-action="tab" data-tab="groupes">🎽 Constituer les groupes</button></td></tr>'}</tbody></table></div></div>`;
}

/* ---- 2. Leçon du jour ---- */
function profAppel() {
  const n = curLesson(), L = lesson(n);
  const abs = S.students.filter(s => L.att[s.id] === 'abs').length, inap = S.students.filter(s => L.att[s.id] === 'inap').length;
  return `<div class="card"><b>${S.students.length - abs - inap} présent(s)</b> · ${abs} absent(s) · ${inap} inapte(s) <span class="note">— les absents et inaptes sont retirés des assauts ; un inapte peut rester juge.</span></div>
    <div class="att-grid">${sortedStudents().map(s => { const a = L.att[s.id], g = groupOf(s.id);
      return `<div class="att-tile ${a || ''}" ${g ? `style="--gc:${gcol(g.color).c}"` : ''}><span class="who"><b>${esc(fullName(s))}</b><span class="note">${g ? esc(g.name) : 'Sans groupe'}</span></span>
        <button class="btn small ${a === 'abs' ? 'abs-on' : ''}" data-action="att" data-sid="${s.id}" data-v="abs">Abs.</button><button class="btn small ${a === 'inap' ? 'inap-on' : ''}" data-action="att" data-sid="${s.id}" data-v="inap">Inapte</button></div>`; }).join('')}</div>`;
}
function profNotice() {
  const B = SET().bareme, n = curLesson(), cfg = lessonCfg(n);
  return `<div class="notice">
    <div class="card"><h2>🥊 Observer sans regarder la tablette</h2>
      <p>Chaque coach tient sa moitié de l'écran (<b class="wR">rouge à gauche</b>, <b class="wB">bleu à droite</b>) et suit le combat des yeux. Il <b>part du bouton</b> en bas de sa moitié (gant = poing, chaussure = pied) et trace vers le personnage : la tablette lit le geste.</p>
      <table><thead><tr><th>Le geste…</th><th>…donne</th></tr></thead><tbody>
        <tr><td>Départ sur le bouton <b>gant</b> / <b>chaussure</b></td><td>un <b>poing</b> / un <b>pied</b></td></tr>
        <tr><td>Trajectoire <b>droite</b></td><td>poing : <b>direct</b> · pied : <b>chassé</b></td></tr>
        <tr><td>Trajectoire <b>courbe</b> (arc)</td><td>poing : <b>crochet</b> · pied : <b>fouetté</b></td></tr>
        <tr><td>Poing : <b>1 / 2 doigts</b></td><td><b>ventre</b> / <b>visage</b></td></tr>
        <tr><td>Pied : <b>1 / 2 / 3 doigts</b></td><td><b>jambes</b> / <b>flancs</b> / <b>visage</b></td></tr>
        <tr><td><b>Double tap</b> (deux touchers rapides)</td><td><b>enchaînement</b> : la touche précédente (moins de 2,5 s) et la suivante</td></tr>
        <tr><td><b>Tap à 4 doigts</b></td><td>annule la dernière touche de ce côté</td></tr></tbody></table>
      <p class="note">Un son accompagne chaque touche : grave = poing, aigu = pied, 1 à 3 bips = nombre de doigts. Le personnage au centre de chaque moitié est l'adversaire du coach : la zone touchée se colore (2 touches vert · 3 jaune · 4 orange · 5 et plus rouge).</p></div>
    <div class="card"><h2>🎚 Niveaux de jugement <span class="note">(Leçon du jour → Niveaux de jugement)</span></h2>
      <table><tbody>
        <tr><td><b>Débutant</b></td><td>une seule case (gant + chaussure) : on note qu'un coup touche, sans arme ni hauteur.</td></tr>
        <tr><td><b>Débrouillé</b></td><td>poing et pied distingués (et la trajectoire), pas les hauteurs.</td></tr>
        <tr><td><b>Jugement complet</b></td><td>armes, trajectoires et hauteurs ; deux coachs, un par couleur.</td></tr>
        <tr><td><b>Expert</b></td><td><b>un seul observateur</b> par tablette (il choisit 🔴 ou 🔵). Quatre boutons en bas : <b>pied G · poing G · poing D · pied D</b>. Le côté de l'écran où le geste <b>finit</b> donne le côté touché ; main gauche vers la droite de l'écran (ou l'inverse) = <b>coup croisé</b>.</td></tr></tbody></table>
      <p class="note">Leçon ${n} : niveau <b>${JUG[cfg.jug]}</b>${cfg.jug === 'debutant' ? '' : ` · ${cfg.poing ? '🥊 poings' : ''} ${cfg.pied ? '🦶 pieds' : ''} ${cfg.ench ? '· 🔗 enchaînements' : ''} ${cfg.bon ? '· ★ arme bonus' : ''}`}. Chaque leçon peut aussi interdire les poings, les pieds, les enchaînements ou l'arme bonus. Dans Paramètres du cycle, vous choisissez un niveau par leçon ou des <b>niveaux différenciés par élève</b> (fil rouge : l'écran de chaque coach s'adapte à son niveau ; en fin de leçon vous décidez qui monte ; l'expert se déclenche à la main).</p></div>
    <div class="card"><h2>🎯 Valeurs des touches</h2>
      <table><tbody>
        <tr><td>Poing (direct, crochet)</td><td><b>${B.poing.tete} pt</b></td></tr>
        <tr><td>Pied · ligne basse (jambes)</td><td><b>${B.pied.bas} pt</b></td></tr>
        <tr><td>Pied · ligne médiane (flancs)</td><td><b>${B.pied.tronc} pt</b></td></tr>
        <tr><td>Pied · ligne haute (visage)</td><td><b>${B.pied.tete} pt</b></td></tr>
        <tr><td>Enchaînement (deux touches qui touchent)</td><td>pas de bonus : chaque touche compte (deux poings = <b>${B.poing.tete * 2} pt</b>) et l'enchaînement est noté dans les stats</td></tr>
        <tr><td>Frappe trop forte</td><td><b>−${SET().penalite} pt</b> (dernière frappe seulement)</td></tr></tbody></table>
      <p class="note">La garde et les coups dans le vide ne se saisissent pas et ne comptent pas. Les valeurs se règlent dans <b>Paramètres du cycle</b>.</p></div>
    <div class="card"><h2>🧰 Boutons pendant l'assaut</h2>
      <table><tbody>
        <tr><td>↩️</td><td><b>Annuler</b> la dernière touche de son côté (comme le tap à 4 doigts).</td></tr>
        <tr><td>💥</td><td><b>Frappe trop forte</b> : pénalise uniquement la <b>toute dernière</b> frappe de ce côté (un second appui retire la pénalité).</td></tr>
        <tr><td>🔗</td><td><b>Enchaînement</b> au bouton (équivalent du double tap) ; présent seulement si la leçon autorise les enchaînements.</td></tr>
        <tr><td>Appui long sur « Terminer l'assaut »</td><td>propose de <b>déclarer un abandon</b> : l'autre tireur gagne.</td></tr></tbody></table></div>
    <div class="card"><h2>🏁 Groupes, tournoi, tablettes</h2>
      <p><b>Leçon du jour → Constituer les groupes</b> : libre (touchez un élève puis le groupe, ou glissez), selon les <b>besoins</b> ou les <b>niveaux</b>, hétérogène ou homogène. <b>Tournoi</b> : temps d'assaut fixe, ou temps de tournoi fixe réparti par groupe ; si le tournoi ne peut pas se terminer, le classement final est <b>pondéré</b>.</p>
      <p>Les élèves peuvent observer sur <b>n'importe quelle tablette</b>, même sans leçon (assaut libre). À l'envoi, chaque touche garde son horodatage : si deux tablettes ont observé le même assaut, les touches s'additionnent sans doublon.</p></div></div>`;
}
function profAssauts() {
  const n = curLesson();
  if (!S.groups.some(g => g.members.length)) return `<div class="card">Aucun groupe. <button class="btn small" data-action="tab" data-tab="groupes">🎽 Créer les groupes</button></div>`;
  S.groups.forEach(g => ensureSchedule(n, g));
  return `<div class="card row"><span class="note grow" style="margin:0">Ordre des assauts et rôles de la leçon ${n} : arbitre (juge central), coachs rouge et bleu (ils saisissent les touches de leur tireur), au-delà de 5 présents les autres sont au repos. Les élèves peuvent modifier les rôles avant chaque assaut.</span>
      <button class="btn small" data-action="reroll">🔄 Recalculer les rôles à faire</button></div><div class="agrid">` +
    S.groups.filter(g => g.members.length).map(g => { const list = lessonAssaults(n, g.id), t = timing(n, presentMembers(n, g).length);
      return `<div class="card gzone colored" style="${gStyle(g)}"><div class="row between"><h3 style="margin:0">${gDot(g)}${esc(g.name)}</h3><span class="pill">${list.filter(a => a.status === 'done').length}/${list.length} · ${t.R} × ${fmt(t.rep)}${t.warn ? ' · ⚠ ' + t.warn : ''}</span></div>
        <div class="table-wrap"><table class="tight"><thead><tr><th>#</th><th>Rouge</th><th>Bleu</th><th>⚖️ Arb.</th><th>📋 C. rouge</th><th>📋 C. bleu</th><th>💤</th><th class="n">Score</th></tr></thead><tbody>
        ${list.map((a, i) => `<tr><td>${i + 1}</td><td class="wR">${esc(nameOf(a.red))}</td><td class="wB">${esc(nameOf(a.blue))}</td><td>${esc(nameOf(a.jc) || '—')}</td><td class="wR" style="font-weight:600">${esc(nameOf(a.jp?.[0]) || '—')}</td><td class="wB" style="font-weight:600">${esc(nameOf(a.jp?.[1]) || '—')}</td><td class="note">${restOf(a).map(nameOf).map(esc).join(', ') || '—'}</td>
          <td class="n">${a.status === 'done' ? `<b>${a.scoreR}–${a.scoreB}</b>` : '<span class="status">à faire</span>'}</td></tr>`).join('')}</tbody></table></div></div>`; }).join('') + '</div>';
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
function lessonPickerSmall(cur, action) { return `<div class="lesson-picker mini" style="margin-bottom:6px">${Array.from({length: SET().nbLessons}, (_, i) => i + 1).map(n => `<button class="lp small ${n === cur ? 'on' : ''}" data-action="${action}" data-n="${n}">${n}</button>`).join('')}</div>`; }
function profClassements() {
  const n = UI.rankN || curLesson();
  return lessonPickerSmall(n, 'rankN') + '<div class="agrid">' + S.groups.filter(g => g.members.length || lessonAssaults(n, g.id).length).map(g => {
    const list = lessonAssaults(n, g.id);
    return `<div class="card gzone colored" style="${gStyle(g)};margin-bottom:14px"><div class="row between"><h3>${gDot(g)}${esc(g.name)}</h3><span class="pill">${list.filter(a => a.status === 'done').length} / ${list.length} assauts</span></div>
      ${rankingTable(n, g)}
      <details style="margin-top:8px"><summary style="font-weight:800;cursor:pointer">Assauts</summary><div class="table-wrap"><table><tbody>${list.map((a, i) => `<tr><td>${i + 1}</td><td class="${a.winner === 'R' ? 'wR' : ''}">${esc(nameOf(a.red))}</td><td class="${a.winner === 'B' ? 'wB' : ''}">${esc(nameOf(a.blue))}</td>
        <td class="n">${a.status === 'done' ? `<b>${a.scoreR} – ${a.scoreB}</b>` : '<span class="status">à faire</span>'}</td><td class="n">${a.status === 'done' ? `<button class="btn small" data-action="replay" data-id="${a.id}">Rejouer</button>` : ''}</td></tr>`).join('')}</tbody></table></div></details></div>`; }).join('') + '</div>';
}
function profStats() {
  const n = UI.statN || 0, scope = n ? [n] : Array.from({length: SET().nbLessons}, (_, i) => i + 1);
  const showEnch = scope.some(k => lessonCfg(k).ench), showBon = scope.some(k => lessonCfg(k).bon), showCross = S.assaults.some(a => (a.events || []).some(e => e.k));
  const rows = sortedStudents().map(s => ({s, st: studentStats(s.id, n || null)}));
  return `<div class="row" style="margin-bottom:6px"><div class="lesson-picker mini"><button class="lp small ${!n ? 'on' : ''}" style="width:auto;padding:0 12px" data-action="statN" data-n="0">Cycle</button>${Array.from({length: SET().nbLessons}, (_, i) => i + 1).map(k => `<button class="lp small ${k === n ? 'on' : ''}" data-action="statN" data-n="${k}">${k}</button>`).join('')}</div>
      <span class="note">Touchez le nom d'un élève pour voir son bilan : cibles touchées par arme et répartition poings / pieds.</span></div>
    <div class="card"><div class="table-wrap"><table class="tight"><thead><tr><th>Élève</th><th class="n">Assauts</th><th class="n">V-N-D</th><th class="n">Pts</th><th class="n">Coups</th><th class="n">Touches</th><th class="n">Effic.</th><th class="n">Dir.</th><th class="n">Cro.</th><th class="n">Cha.</th><th class="n">Fou.</th><th class="n">Visage</th><th class="n">Trop fort</th>${showCross ? '<th class="n" title="Coups croisés : main ou pied d\'un côté, cible de l\'autre">Croisés</th>' : ''}${showEnch ? '<th class="n">Ench.</th>' : ''}<th class="n">Arbitre</th><th class="n">Coach</th><th class="n">Repos</th>${showBon ? '<th class="n">Bonus</th>' : ''}</tr></thead><tbody>
    ${rows.map(({s, st}) => `<tr><td><span class="stat-name" data-action="statSid" data-sid="${s.id}">${esc(dispName(s))}</span></td><td class="n">${st.J}</td><td class="n">${st.V}-${st.N}-${st.D}</td><td class="n"><b>${st.pm}</b></td><td class="n">${st.tent}</td><td class="n">${st.valid}</td><td class="n">${st.tent ? Math.round(100 * st.valid / st.tent) + ' %' : '—'}</td>
      ${COUP_KEYS.map(c => `<td class="n">${st.coups[c].v}/${st.coups[c].t}</td>`).join('')}<td class="n">${st.cats.tete}</td><td class="n">${st.trop}</td>${showCross ? `<td class="n">${st.cross}</td>` : ''}${showEnch ? `<td class="n">${st.ok}/${st.tries}</td>` : ''}<td class="n">${st.jc}</td><td class="n">${st.jp}</td><td class="n">${st.rest}</td>${showBon ? `<td class="n">${st.bonus}</td>` : ''}</tr>`).join('')}</tbody></table></div></div>`;
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
  return `<div class="pgrid"><div class="pcol"><div class="card strong"><h2>Export Excel</h2><p class="note">Classements, assauts, statistiques de chaque élève, toutes les touches, piliers et paramètres.</p>
      <button class="btn green" data-action="exportXlsx">📊 Exporter tous les résultats (.xlsx)</button></div>
    <div class="card"><h2>Sauvegarde complète</h2><div class="btn-row"><button class="btn" data-action="backup">💾 Sauvegarder (.json)</button>
      <label class="btn file-btn">♻️ Restaurer<input type="file" id="fileRestore" accept=".json,application/json"></label></div></div></div>
    <div class="pcol"><div class="card"><h2>Code enseignant</h2><div class="row"><label class="field">Nouveau code (4 chiffres)<input type="password" inputmode="numeric" maxlength="4" id="newPin" style="max-width:140px"></label>
      <button class="btn small" data-action="setPin" style="align-self:flex-end">Changer</button></div></div>
    <div class="card"><h2>Cette tablette</h2><div class="btn-row"><button class="btn small" data-action="setRole" data-r="eleve">🥊 Passer en tablette élève</button><button class="btn small ghost" data-action="clearResults">Effacer les résultats de ${esc(S.name)}</button><button class="btn small danger" data-action="resetClass">Réinitialiser ${esc(S.name)}</button></div>
      <p class="note">Version ${APP_VERSION} · appareil ${esc(ROOT.deviceId)}</p></div></div></div>`;
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
      <div class="vs-figure">${BFDraw.fighter({sexe: sx, corner: side})}</div>
      ${P.free && !fightPool.length ? '' : `<select data-field="prep" data-k="${side === 'R' ? 'red' : 'blue'}">${opts(id, fightPool, P.free ? 'Choisir le tireur' : '—')}</select>`}
      ${P.free && !id ? `<input type="text" class="gname" placeholder="Nom du tireur ${side === 'R' ? 'rouge' : 'bleu'}" data-field="prep" data-k="gname" data-side="${side}" value="${esc(P.guest[side].name || '')}">` : ''}
      <div class="seg small">${['G', 'F', 'N'].map(v => `<button class="${sx === v ? 'on' : ''}" data-action="prepSex" data-side="${side}" data-v="${v}">${{G: 'Garçon', F: 'Fille', N: 'Non genré'}[v]}</button>`).join('')}</div>
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
      <p class="note" style="margin:0">${(() => { const lv = levelsFor(n, [P.jp[0] || '', P.jp[1] || '']); return lv.R === 'expert' ? 'Niveau de jugement : <b>Expert</b> · un seul observateur par tablette' : `Niveau de jugement : <span class="wR">coach rouge <b>${JUG[lv.R]}</b></span> · <span class="wB">coach bleu <b>${JUG[lv.B]}</b></span>`; })()}${lessonCfg(n).ench ? ' · 🔗 enchaînements' : ''}</p>
      <div class="row between"><button class="btn ghost" data-action="prepSkip" ${P.free ? 'hidden' : ''}>Passer cet assaut</button><button class="btn go" data-action="prepStart">🥊 Commencer l'assaut</button></div></div>
    <aside>${pil ? `<div class="pil-card"><b>🏛 Pilier : ${esc(pil.n)}</b><ul>${pil.cr.map(c => `<li>${esc(c)}</li>`).join('')}</ul><div class="note">Chaque coach l'observe chez son tireur.</div></div>` : ''}
      ${next.length ? `<div class="card" style="margin-top:14px"><h3>À suivre</h3><ol class="next-list">${next.map(a => `<li><span class="wR">${esc(nameOf(a.red))}</span> – <span class="wB">${esc(nameOf(a.blue))}</span><div class="note">⚖️ ${esc(nameOf(a.jc) || '—')} · 📋 ${(a.jp || []).filter(Boolean).map(nameOf).map(esc).join(' / ') || '—'}</div></li>`).join('')}</ol></div>` : ''}
      ${g && !P.free ? `<div class="card" style="margin-top:14px"><h3>Classement</h3>${rankingTable(n, g, true)}</div>` : ''}</aside></div>`;
}
function startAssault() {
  const P = UI.P, n = curLesson();
  audio();
  if (!P.free && (!P.red || !P.blue)) return toast('Choisissez les deux tireurs');
  if (P.red && P.red === P.blue) return toast('Choisissez deux tireurs différents');
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
  const fighter = (id, side) => { const s = stu(id); return {id, name: fullName(s) || (P.guest[side].name || '').trim() || (side === 'R' ? 'Rouge' : 'Bleu'), sexe: s ? s.sexe : P.guest[side].sexe}; };
  ROOT.live = {cid: S.id, n, aid: P.aid, gid: P.gid, free: P.free, R: fighter(P.red, 'R'), B: fighter(P.blue, 'B'), jc: P.jc, jp: [P.jp[0] || '', P.jp[1] || ''],
    events: [], ench: {R: null, B: null}, bonus: {R: null, B: null}, bonusPick: {R: 0, B: 0}, pil: lessonPil(n), obs: {R: [], B: []},
    cfg: lessonCfg(n), lv: levelsFor(n, [P.jp[0] || '', P.jp[1] || '']), xs: 'R', chain: {R: null, B: null},
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
  const n = curLesson(), list = S.assaults.filter(a => a.n === n && a.status === 'done' && a.events && (UI.sendAll || a.d === ROOT.deviceId));
  return `<div class="card strong" style="text-align:center"><b style="font-size:20px">${list.length} assaut(s) terminé(s) sur cette tablette · ${esc(lessonLabel(n))}</b>
      <p class="note">Montrez ce QR à l'enseignant (📥 Récupérer). Vous pouvez l'envoyer plusieurs fois : rien n'est compté en double.</p></div>
    <div id="qrSend">Préparation…</div>
    <div class="btn-row center" style="margin-top:12px"><button class="btn ${UI.sendAll ? 'primary' : ''}" data-action="sendAll">🔁 ${UI.sendAll ? 'Tout inclus (reçus d\'autres tablettes)' : 'Inclure aussi les assauts reçus d\'autres tablettes'}</button><button class="btn" data-action="fileResults">📤 Partager en fichier (AirDrop…) à la place</button></div>`;
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
const SET_KEYS = ['jmode', 'bareme', 'penalite', 'bonusEnch', 'seuil', 'ptsV', 'ptsN', 'ptsD', 'autoNext', 'recupSec', 'transitionSec', 'mode', 'manualSec', 'bonusOn', 'bonusPts', 'bonusArmes', 'totalMin', 'reprises'];
function lessonPacket(n) {
  S.groups.forEach(g => ensureSchedule(n, g));
  const L = lesson(n), ls = LS(n), cfg = lessonCfg(n), set = {}; SET_KEYS.forEach(k => set[k] = SET()[k]);
  const adv = {}; S.students.forEach(s => { const a = adviceFor(n, s.id); if (a) adv[s.id] = [a.k, a.i, a.v]; });
  return {k: 'L', v: 3, cid: S.id, cn: S.name, n, N: SET().nbLessons, title: L.title, pil: L.pil || null, pil2: L.pil2 || null, xp: L.xp ? 1 : 0, tm: ls.totalMin, rp: ls.reprises, jg: cfg.jug, ar: [cfg.poing, cfg.pied, cfg.ench, cfg.bon].map(Number), tmo: ls.tmode, rs: ls.manualSec, ds: ls.recupSec, set,
    st: S.students.map(s => [s.id, s.nom, s.prenom, s.sexe, s.niv || 0, s.bes || '', studentLevel(s)]), gr: S.groups.map(g => [g.id, g.name, g.color, g.members]), att: L.att, adv,
    as: S.assaults.filter(a => a.n === n && a.gid).map(a => a.status === 'done' ? [a.id, a.gid, a.red, a.blue, a.order, a.jc, a.jp, 1, a.scoreR, a.scoreB, a.winner] : [a.id, a.gid, a.red, a.blue, a.order, a.jc, a.jp, 0])};
}
function applyLesson(p) {
  if (p.k !== 'L') throw new Error('Ce QR n\'est pas un QR de leçon');
  let c = ROOT.classes[p.cid];
  if (!c) { c = normClass(newClass(p.cn, p.cid)); ROOT.classes[p.cid] = c; }
  useClass(p.cid);
  c.name = p.cn; c.students = p.st.map(([id, nom, prenom, sexe, niv, bes, jug]) => ({id, nom, prenom, sexe, niv: niv || 0, bes: bes || '', jug: jug || 'debutant'}));
  c.groups = p.gr.map(([id, name, color, members]) => ({id, name, color, members}));
  Object.assign(c.settings, p.set, {nbLessons: p.N, current: p.n});
  const L = lesson(p.n); Object.assign(L, {title: p.title || '', pil: p.pil, pil2: p.pil2 || null, xp: !!p.xp, totalMin: p.tm, reprises: p.rp, att: p.att || {}, adv: p.adv || {}, jug: p.jg || 'complet', tmode: p.tmo, repSec: p.rs, deadSec: p.ds});
  if (p.ar) { L.poing = !!p.ar[0]; L.pied = !!p.ar[1]; L.ench = !!p.ar[2]; L.bon = !!p.ar[3]; }
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
  return (a.events || []).map(e => [e.t === 'R' ? 0 : 1, e.w === 'poing' ? 0 : 1, COUP_KEYS.indexOf(e.c), e.z ? ZONES.indexOf(e.z) : -1, SIDES.indexOf(e.s), e.trop ? 1 : 0, e.ench ? (m[e.ench] = m[e.ench] || ++k) : 0, e.rep, Math.round((e.ts - a.startedAt) / 1000), e.bx || 0, e.h ? BLIND_H.indexOf(e.h) + 1 : 0, e.inc ? 1 : 0, (e.nh ? 1 : 0) | (e.gen ? 2 : 0), e.main === 'g' ? 1 : e.main === 'd' ? 2 : 0, e.k === 'g' ? 1 : e.k === 'd' ? 2 : 0]);
}
const unpackEvents = (arr, start) => (arr || []).map((x, i) => ({id: 'e' + i, t: x[0] ? 'B' : 'R', w: x[1] ? 'pied' : 'poing', c: COUP_KEYS[x[2]], z: x[3] >= 0 ? ZONES[x[3]] : null, s: x[4] >= 0 ? SIDES[x[4]] : null,
  cat: x[3] >= 0 ? CAT[ZONES[x[3]]] : 'manque', trop: !!x[5], ench: x[6] ? 'x' + x[6] : null, rep: x[7], ts: start + x[8] * 1000, bx: x[9] || 0, h: x[10] ? BLIND_H[x[10] - 1] : undefined, inc: !!x[11], ...(x[12] & 1 ? {nh: true} : {}), ...(x[12] & 2 ? {gen: true} : {}), ...(x[13] ? {main: x[13] === 1 ? 'g' : 'd'} : {}), ...(x[14] ? {k: x[14] === 1 ? 'g' : 'd'} : {})}));
function resultsPacket() {
  const n = curLesson();
  const as = S.assaults.filter(a => a.n === n && a.status === 'done' && a.events && (UI.sendAll || a.d === ROOT.deviceId)).map(a => [a.id, a.gid || '', a.red, a.blue, a.order || 0, a.jc || '', a.jp || [], a.scoreR, a.scoreB, a.winner,
    a.repSec, a.reprises, Math.round(a.startedAt / 1000), Math.round(a.endedAt / 1000), packEvents(a), a.obs || null, a.pil || '', a.names?.R || '', a.names?.B || '', a.ab || '', a.d || ROOT.deviceId, a.rp || 0]);
  return {k: 'R', v: 3, cid: S.id, n, d: ROOT.deviceId, as};
}
/* Fusion « par horodatage » : les touches observées sur plusieurs tablettes s'additionnent (jamais de doublon, jamais de perte). */
const evKey = e => `${e.t}|${Math.round(e.ts / 1000)}|${e.w}|${e.c}|${e.z || ''}|${e.s || ''}`;
function mergeAssault(loc, data) {
  if (loc.status !== 'done') { Object.assign(loc, data); return true; }
  if (!loc.d || loc.d === data.d) { if ((loc.endedAt || 0) < data.endedAt) { Object.assign(loc, data); return true; } return false; }
  // même assaut observé sur une autre tablette : union des touches, triées par horodatage
  const seen = new Set((loc.events || []).map(evKey)); let add = 0;
  (data.events || []).forEach(e => { if (!seen.has(evKey(e))) { loc.events.push(e); seen.add(evKey(e)); add++; } });
  loc.events.sort((x, y) => x.ts - y.ts);
  loc.obs = loc.obs || data.obs; loc.ab = loc.ab || data.ab || null;
  loc.startedAt = Math.min(loc.startedAt || data.startedAt, data.startedAt); loc.endedAt = Math.max(loc.endedAt || 0, data.endedAt);
  if (add) { loc.scoreR = scoreOf(loc.events, 'R'); loc.scoreB = scoreOf(loc.events, 'B'); loc.winner = loc.ab ? OTHER[loc.ab] : loc.scoreR > loc.scoreB ? 'R' : loc.scoreB > loc.scoreR ? 'B' : 'N'; }
  return add > 0;
}
function applyResults(p) {
  if (p.k !== 'R') throw new Error('Ce QR n\'est pas un QR de résultats');
  if (!ROOT.classes[p.cid]) throw new Error('Classe inconnue sur cette tablette');
  if (p.cid !== S.id) useClass(p.cid);
  let cnt = 0;
  for (const [id, gid, red, blue, order, jc, jp, sR, sB, w, repSec, reprises, st, en, ev, obs, pil, nR, nB, ab, dev, rp] of p.as) {
    const data = {red, blue, jc, jp, scoreR: sR, scoreB: sB, winner: w, repSec, reprises, startedAt: st * 1000, endedAt: en * 1000, events: unpackEvents(ev, st * 1000), obs, pil, names: {R: nR, B: nB}, ab: ab || null, rp: rp || 0, status: 'done', d: dev || p.d};
    const loc = S.assaults.find(a => a.id === id);
    if (loc) { if (mergeAssault(loc, data)) cnt++; }
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
const sexOf = v => { v = String(v || '').trim().toUpperCase(); if (/^(F|FILLE|FÉMININ|FEMININ|FEM)$/.test(v)) return 'F'; if (/^(G|M|H|GARÇON|GARCON|MASCULIN|MASC)$/.test(v)) return 'G'; if (/^(X|N|NB|AUTRE|NON[ -]?GENR[ÉE]|NON[ -]?BINAIRE|NEUTRE)$/.test(v)) return 'N'; return null; };
/* Export d'un logiciel de vie scolaire : Nom · Prénom · Né(e) le · Prénom d'usage · Sexe · Classe · … (seules 4 colonnes sont lues) */
const HDR = {nom: /^nom( de famille| d['’]usage)?$/i, prenom: /^pr[ée]noms?$/i, usage: /^pr[ée]nom d['’]usage$/i, sexe: /^(sexe|genre)$/i, classe: /^classe$/i};
function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i].map(c => String(c || '').trim().replace(/\s+/g, ' ')), idx = k => cells.findIndex(c => HDR[k].test(c));
    const h = {i, nom: idx('nom'), prenom: idx('prenom'), usage: idx('usage'), sexe: idx('sexe'), classe: idx('classe')};
    if (h.nom >= 0 && (h.prenom >= 0 || h.usage >= 0)) return h;
  }
  return null;
}
function parseByHeader(rows, h) {
  const out = [], cell = (r, k) => k >= 0 ? String(r[k] ?? '').trim().replace(/\s+/g, ' ') : '';
  rows.slice(h.i + 1).forEach(r => {
    const nom = cell(r, h.nom); if (!nom || !isNameLike(nom)) return;
    let prenom = cell(r, h.usage);
    if (!prenom) { const all = cell(r, h.prenom); prenom = all.split(/[ ,]+/)[0] || all; }
    const sx = sexOf(cell(r, h.sexe));
    out.push({nom: nom.toUpperCase(), prenom: capName(prenom), sexe: sx || 'G', known: !!sx, classe: cell(r, h.classe)});
  });
  return out;
}
function parseStudents(rows) {
  const hd = findHeader(rows); if (hd) { const r = parseByHeader(rows, hd); if (r.length) return r; }
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
const addStudentsTo = (cls, list) => { let n = 0; list.forEach(p => { if (cls.students.some(s => s.nom === p.nom && s.prenom.toLowerCase() === p.prenom.toLowerCase())) return; cls.students.push({id: rnd(5), nom: p.nom, prenom: p.prenom, sexe: p.sexe}); n++; }); return n; };
async function importStudentsFile(file) {
  try {
    const list = parseStudents(await readSheetRows(file));
    if (!list.length) return toast('Aucun élève reconnu dans ce fichier', 3500);
    const names = [...new Set(list.map(p => p.classe).filter(Boolean))];
    let mode = 'add';
    if (names.length > 1) {
      mode = await choiceBox(`Importer ${list.length} élèves de ${names.length} classes`, `Le fichier contient les classes : ${esc(names.slice(0, 8).join(', '))}${names.length > 8 ? '…' : ''}.`,
        [{label: `Créer une classe par valeur (${names.length})`, value: 'split', cls: 'primary'}, {label: `Tout mettre dans « ${esc(S.name)} »`, value: 'add'}]);
      if (!mode) return;
    }
    let added = 0, msg = '';
    if (mode === 'split') {
      let first = null;
      names.forEach(nm => {
        let c = Object.values(ROOT.classes).find(x => x.name.trim().toLowerCase() === nm.toLowerCase());
        if (!c) { c = newClass(nm); ROOT.classes[c.id] = c; }
        first = first || c; added += addStudentsTo(c, list.filter(p => p.classe === nm));
      });
      added += addStudentsTo(first, list.filter(p => !p.classe));
      useClass(first.id); msg = ` dans ${names.length} classes`;
    } else {
      if (S.students.length) {
        mode = await choiceBox(`Importer ${list.length} élève(s)`, `La classe « ${esc(S.name)} » contient déjà ${S.students.length} élève(s).`, [{label: 'Ajouter à la liste', value: 'add', cls: 'primary'}, {label: 'Remplacer la liste', value: 'replace', cls: 'red'}]);
        if (!mode) return;
      }
      if (mode === 'replace') { S.students = []; S.groups.forEach(g => g.members = []); S.assaults = []; Object.values(S.lessons).forEach(L => { L.att = {}; L.sig = {}; }); }
      added = addStudentsTo(S, list);
    }
    save(); render();
    const unk = list.filter(p => !p.known).length;
    toast(`✓ ${added} élève(s) importé(s)${msg}${unk ? ` · ${unk} sans sexe indiqué : touchez G / F / N pour corriger` : ''}`, 4500);
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
document.addEventListener('click', e => {
  const z = e.target.closest('.gzone'); if (!z || !UI.sel || e.target.closest('.gitem, .gdotbtn')) return;
  moveToGroup(UI.sel, z.dataset.zone);
});
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
  toggleSex: d => { const s = stu(d.sid); s.sexe = {G: 'F', F: 'N', N: 'G'}[s.sexe] || 'G'; save(); render(); },
  delStudent: async d => { if (!(await confirmBox(`Retirer ${nameOf(d.sid)} ?`, 'L\'élève sera retiré de la classe et de son groupe.', 'Retirer', true))) return; S.students = S.students.filter(s => s.id !== d.sid); S.groups.forEach(g => g.members = g.members.filter(m => m !== d.sid)); save(); render(); },
  clearStudents: async () => { if (!(await confirmBox('Vider la liste ?', 'Tous les élèves, les groupes et les résultats de la classe seront effacés.', 'Vider', true))) return; S.students = []; S.groups.forEach(g => g.members = []); S.assaults = []; S.lessons = {}; save(); render(); },
  setGroups: d => { setGroupCount(+d.n); render(); },
  gset: d => { UI[d.k] = d.v; render(); },
  autoGroups: () => {
    const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const crit = UI.gcrit || 'libre', comp = UI.gcomp || 'hetero', n = S.groups.length || (setGroupCount(2), 2);
    if (!S.students.length) return toast('Ajoutez d\'abord des élèves');
    let list;
    if (crit === 'niveau') list = sh([...S.students]).sort((a, b) => (a.niv || 2) - (b.niv || 2));
    else if (crit === 'besoin') list = sh([...S.students]).sort((a, b) => { const f = s => { const i = BESOINS.findIndex(x => x[0] === s.bes); return i < 0 ? 99 : i; }; return f(a) - f(b); });
    else list = [...sh(S.students.filter(s => s.sexe === 'F')), ...sh(S.students.filter(s => s.sexe !== 'F'))];
    S.groups.forEach(g => g.members = []);
    if (crit !== 'libre' && comp === 'homo') {          // homogène : tranches consécutives (profils proches)
      const base = Math.floor(list.length / n), extra = list.length % n; let i = 0;
      S.groups.forEach((g, k) => { const size = base + (k < extra ? 1 : 0); for (let c = 0; c < size; c++) g.members.push(list[i++].id); });
    } else {                                              // hétérogène (ou libre mixte) : distribution en serpentin
      list.forEach((s, i) => { const r = Math.floor(i / n), k = i % n; S.groups[r % 2 ? n - 1 - k : k].members.push(s.id); });
    }
    save(); render(); toast(crit === 'libre' ? 'Répartition faite : ajustez en touchant un élève puis son groupe' : `Groupes ${comp === 'homo' ? 'homogènes' : 'hétérogènes'} constitués selon ${crit === 'niveau' ? 'les niveaux' : 'les besoins'}`);
  },
  clearGroups: () => { S.groups.forEach(g => g.members = []); save(); render(); },
  cycleGroupColor: d => { const g = groupById(d.g), used = new Set(S.groups.filter(x => x !== g).map(x => x.color)); const i = GCOLORS.findIndex(c => c.k === g.color); for (let k = 1; k <= GCOLORS.length; k++) { const c = GCOLORS[(i + k) % GCOLORS.length]; if (!used.has(c.k)) { g.color = c.k; break; } } save(); render(); },
  cycleNiv: d => { const s = stu(d.sid); s.niv = ((s.niv || 0) + 1) % 4; save(); render(); },
  nbLessons: d => { SET().nbLessons = Math.max(1, Math.min(20, SET().nbLessons + +d.d)); save(); render(); },
  pilAdd: () => { ROOT.piliers.push({id: 'p' + uid(), n: 'Nouveau pilier', cr: ['']}); save(); render(); },
  pilDel: async d => { if (!(await confirmBox('Supprimer ce pilier ?', 'Les leçons qui l\'utilisent n\'auront plus de pilier.', 'Supprimer', true))) return; ROOT.piliers = ROOT.piliers.filter(p => p.id !== d.id); Object.values(ROOT.classes).forEach(c => Object.values(c.lessons).forEach(L => { if (L.pil?.id === d.id) L.pil = null; if (L.pil2?.id === d.id) L.pil2 = null; })); save(); render(); },
  pilReset: async () => { if (!(await confirmBox('Revenir aux piliers par défaut ?', 'Vos piliers modifiés seront remplacés.', 'Rétablir', true))) return; ROOT.piliers = clone(DEFAULT_PILIERS); save(); render(); },
  att: d => { const L = lesson(curLesson()); if (L.att[d.sid] === d.v) delete L.att[d.sid]; else L.att[d.sid] = d.v; save(); render(); },
  reroll: () => { const n = curLesson(); S.groups.forEach(g => { ensureSchedule(n, g); assignRoles(n, g); }); save(); render(); toast('Rôles recalculés'); },
  rankN: d => { UI.rankN = +d.n; render(); },
  statN: d => { UI.statN = +d.n; render(); },
  statSid: d => {
    const s = stu(d.sid), n = UI.statN || 0, ev = studentEvents(d.sid, n || null), st = studentStats(d.sid, n || null);
    modal(`<h2 style="margin:0 0 4px">${esc(dispName(s))} · ${n ? 'leçon ' + n : 'cycle complet'}</h2><p class="note" style="text-align:center">${st.J} assaut${st.J > 1 ? 's' : ''} · ${st.valid} touche${st.valid > 1 ? 's' : ''} valable${st.valid > 1 ? 's' : ''} sur ${st.tent} coup${st.tent > 1 ? 's' : ''}</p>
      ${bilanHTML(ev, 'X', {id: 'bilS', sexe: 'N', corner: 'B'})}<div class="btn-row center" style="margin-top:8px"><button class="btn" data-action="closeModal">Fermer</button></div>`, () => paintHeat($('#bilS'), ev, 'X'));
  },
  closeModal: () => closeModal(),
  setJmode: d => { SET().jmode = d.v; save(); render(); },
  lJugSet: d => { lesson(curLesson()).jug = d.k; save(); render(); },
  stuJug: d => { stu(d.sid).jug = d.v; save(); render(); },
  xpToggle: () => { const L = lesson(curLesson()); L.xp = !L.xp; save(); render(); },
  applySugg: () => {
    const n = curLesson(), keys = Object.keys(JUG); let c = 0;
    S.students.forEach(s => { const ob = obsAgg(n, s.id), v = (ob || []).filter(Boolean); if (!v.length) return; const m = v.reduce((a, b) => a + b, 0) / v.length, i = keys.indexOf(studentLevel(s));
      if (m >= 3.5 && i < 2) { s.jug = keys[i + 1]; c++; } else if (m <= 1.5 && i > 0) { s.jug = keys[i - 1]; c++; } });
    save(); render(); toast(c ? `${c} élève(s) changent de niveau` : 'Aucune suggestion à appliquer');
  },
  tmode: d => { lesson(curLesson()).tmode = d.v; save(); render(); },
  lTog: d => {
    const L = lesson(d.n), c = lessonCfg(+d.n), k = d.k;
    if ((k === 'poing' || k === 'pied') && c[k] && !c[k === 'poing' ? 'pied' : 'poing']) return toast('Gardez au moins une arme');
    L[k] = !c[k]; save(); render();
  },
  replay: async d => { if (!(await confirmBox('Rejouer cet assaut ?', 'Son résultat sera effacé et il repassera « à faire ».', 'Rejouer', true))) return; const a = S.assaults.find(x => x.id === d.id); Object.assign(a, {status: 'todo', events: [], scoreR: null, scoreB: null, winner: null, obs: null}); save(); render(); },
  exportXlsx: () => exportXlsx(),
  backup: () => shareJSON({...ROOT, live: null}, `ObservBF_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`),
  setPin: () => { const v = $('#newPin').value; if (!/^\d{4}$/.test(v)) return toast('Le code doit faire 4 chiffres'); ROOT.pin = v; save(); toast('✓ Code changé'); $('#newPin').value = ''; },
  clearResults: async () => { if (!(await confirmBox('Effacer les résultats ?', `Tous les assauts de « ${S.name} » seront effacés.`, 'Effacer', true))) return; S.assaults = []; Object.values(S.lessons).forEach(L => L.sig = {}); save(); render(); },
  resetClass: async () => { if (!(await confirmBox(`Réinitialiser « ${S.name} » ?`, 'Élèves, groupes, leçons et résultats seront effacés.', 'Réinitialiser', true))) return; const c = newClass(S.name, S.id); ROOT.classes[S.id] = c; S = c; save(); render(); },
  pickGroup: d => { ROOT.myGroup[S.id] = d.g; save(); render(); },
  openPrep: () => openPrep(false),
  openFree: () => openPrep(true),
  sendAll: () => { UI.sendAll = !UI.sendAll; render(); },
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
const LFIELDS = {lJug: (L, v) => L.jug = v, lRepSec: (L, v) => L.repSec = v === '' ? null : Math.max(20, +v), lDead: (L, v) => L.deadSec = v === '' ? null : Math.max(0, +v), lTitle: (L, v) => L.title = v, lTotal: (L, v) => L.totalMin = v === '' ? null : Math.max(0, +v), lRep: (L, v) => L.reprises = v === '' ? null : Math.max(1, +v)};
document.addEventListener('input', e => {
  const t = e.target, f = t.dataset.field; if (!f) return;
  if (f === 'className') { S.name = t.value; saveSoon(); }
  else if (f === 'set') { const k = t.dataset.k; SET()[k] = t.type === 'range' || t.type === 'number' ? +t.value : k === 'bonusOn' ? !!t.value : t.value; saveSoon(); if (t.tagName === 'SELECT' || t.type === 'range') render(); }
  else if (f === 'stuBes') { stu(t.dataset.sid).bes = t.value; saveSoon(); }
  else if (f === 'bonusArme') { const s2 = SET(), c = t.dataset.c; s2.bonusArmes = COUP_KEYS.filter(k => k === c ? t.checked : s2.bonusArmes.includes(k)); saveSoon(); }
  else if (f === 'bareme') { const B = SET().bareme, v = Math.max(0, +t.value || 0), w = t.dataset.w, c = t.dataset.c; if (w === 'poing') ['tete', 'tronc', 'bas', 'nh'].forEach(k => B.poing[k] = v); else { B.pied[c] = v; if (c === 'tronc') B.pied.nh = v; } saveSoon(); }
  else if (LFIELDS[f]) { LFIELDS[f](lesson(t.dataset.n), t.value); saveSoon(); }
  else if (f === 'lPil') { lesson(t.dataset.n).pil = snapPil(pilById(t.value)); save(); }
  else if (f === 'lPil2') { lesson(t.dataset.n).pil2 = snapPil(pilById(t.value)); save(); }
  else if (f === 'pilName') { pilById(t.dataset.id).n = t.value; refreshPilSnapshots(t.dataset.id); saveSoon(); }
  else if (f === 'pilCr') { const p = pilById(t.dataset.id); p.cr[+t.dataset.i] = t.value; p.cr = p.cr.map(x => x || ''); refreshPilSnapshots(t.dataset.id); saveSoon(); }
  else if (f === 'prep') { const P = UI.P; if (t.dataset.k === 'gname') { P.guest[t.dataset.side].name = t.value; return; } if (t.dataset.k === 'jp') P.jp[+t.dataset.i] = t.value; else P[t.dataset.k] = t.value; if (t.dataset.k === 'red' || t.dataset.k === 'blue') render(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fileStudents' && t.files[0]) { importStudentsFile(t.files[0]); t.value = ''; }
  if ((t.id === 'fileSync' || t.id === 'fileRestore') && t.files[0]) { importSyncFile(t.files[0]); t.value = ''; }
  if (['lTotal', 'lRep', 'lPil', 'lPil2', 'lJug', 'lRepSec', 'lDead'].includes(t.dataset.field) || (t.dataset.field === 'set' && t.type === 'number')) { save(); render(); }
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
let BX = null;
function openFight() {
  const l = LV(); if (!l) return;
  if (l.cid !== S.id && ROOT.classes[l.cid]) useClass(l.cid);
  l.cfg = l.cfg || lessonCfg(l.n); l.lv = l.lv || {R: l.cfg.jug, B: l.cfg.jug}; l.xs = l.xs || 'R'; l.ench = l.ench || {R: null, B: null};
  BFQR.stop(); $('#fight').hidden = false; document.body.classList.add('fighting');
  l.bonus = l.bonus || {R: null, B: null}; l.bonusPick = l.bonusPick || {R: 0, B: 0};
  $('#targetR').innerHTML = BFDraw.fighter({sexe: l.B.sexe, corner: 'B'}) + HEAT_LEGEND;
  $('#targetB').innerHTML = BFDraw.fighter({sexe: l.R.sexe, corner: 'R'}) + HEAT_LEGEND;
  $('#arena').className = 'arena ' + l.cfg.jug;
  for (const s of ['R', 'B']) defaultBanner(s);
  buildOrigins();
  coachKey = ''; renderFight(); renderClock(); resizeCanvas(); startClockLoop();
  if (l.cfg.jug === 'expert' && !l.xsDone) {      // mode expert : on choisit QUI on observe
    l.xsDone = true;
    choiceBox('Qui observez-vous ?', 'En mode expert, une tablette observe un seul tireur. Vous pourrez changer avec les boutons en haut de l\'écran.',
      [{label: `🔴 ${l.R.name}`, value: 'R', cls: 'red'}, {label: `🔵 ${l.B.name}`, value: 'B', cls: 'blue'}]).then(v => { if (v) l.xs = v; save(); buildOrigins(); renderFight(); });
  }
}
/* Boutons de départ en bas de chaque moitié : gant / chaussure (ou une seule case en niveau débutant ; quatre boutons en expert) */
function buildOrigins() {
  const l = LV(), cfg = l.cfg;
  const mk = (side, arme, hand, mirror) => `<div class="weapon" data-side="${side}" data-arme="${arme}" ${hand ? `data-hand="${hand}"` : ''}>${arme === 'poing' ? BFDraw.glove(side, mirror) : BFDraw.shoe(side, mirror)}${hand ? `<b class="wl">${hand.toUpperCase()}</b>` : ''}</div>`;
  for (const s of ['R', 'B']) {
    const m = s === 'B', o = $('#origin' + s), jug = cfg.jug === 'expert' ? 'expert' : jugOf(s);
    if (jug === 'debutant') o.innerHTML = `<div class="weapon both" data-side="${s}" data-arme="gen">${BFDraw.glove(s, m)}${BFDraw.shoe(s, m)}</div>`;
    else if (jug === 'expert') o.innerHTML = s === l.xs ? mk(s, 'pied', 'g', false) + mk(s, 'poing', 'g', true) + mk(s, 'poing', 'd', false) + mk(s, 'pied', 'd', true) : '';
    else { const parts = []; if (cfg.pied) parts.push(mk(s, 'pied', null, m)); if (cfg.poing) parts.push(mk(s, 'poing', null, m)); o.innerHTML = (m ? parts.reverse() : parts).join(''); }
  }
}
function closeFight() { $('#fight').hidden = true; document.body.classList.remove('fighting'); stopClockLoop(); }
const coachOf = (l, side) => nameOf(l.jp?.[side === 'R' ? 0 : 1]);
function defaultBanner(side) { const c = coachOf(LV(), side); banner(side, c ? `📋 <b>${esc(c)}</b> · ${JUG[jugOf(side)]}` : `Niveau ${JUG[jugOf(side)].toLowerCase()}`); }
const jugOf = side => { const l = LV(); return l.cfg.jug === 'expert' ? 'expert' : (l.lv?.[side] || l.cfg.jug); };
/* ---- Couleur des zones selon le nombre de touches reçues ---- */
const HEAT = [null, null, {c: '#2E9E44', n: 'très peu touché'}, {c: '#FFD400', n: 'peu touché'}, {c: '#F59E0B', n: 'un peu touché'}, {c: '#D32F2F', n: 'beaucoup touché'}];
const heatOf = n => HEAT[Math.min(5, n)] || null;
const HEAT_LEGEND = `<div class="heat-legend"><span><i style="background:#2E9E44"></i>2</span><span><i style="background:#FFD400"></i>3</span><span><i style="background:#F59E0B"></i>4</span><span><i style="background:#D32F2F"></i>5+</span></div>`;
function heatCounts(events, side) { const m = {}; events.forEach(e => { if (e.t === side && e.z) { const k = e.z + '-' + e.s; m[k] = (m[k] || 0) + 1; } }); return m; }
const SPLIT = BFDraw.SPLIT;
/* parties du personnage touchées : une zone coupée en deux se colore en entier pour un coup « central », par moitié pour un coup à gauche / droite */
const partsOf = (root, z, s) => [...root.querySelectorAll(`.part[data-zone="${z}"]`)].filter(p => p.dataset.side === s || (s === 'c' && SPLIT.has(z)));
function paintHeat(root, events, side) {
  const m = heatCounts(events, side);
  root.querySelectorAll('.part').forEach(p => { const z = p.dataset.zone, sd = p.dataset.side, h = heatOf((m[z + '-' + sd] || 0) + (SPLIT.has(z) && sd !== 'c' ? (m[z + '-c'] || 0) : 0));
    p.classList.toggle('heated', !!h); if (h) p.style.setProperty('--heat', h.c); else p.style.removeProperty('--heat'); });
}
/* ---- Temps de coaching : arme bonus ---- */
let coachKey = '';
function bonusTarget(c) { return c.phase === 'recup' ? c.rep + 1 : (c.phase === 'ready' && c.rep >= 2 ? c.rep : 0); }
function renderCoach() {
  const l = LV(); if (!l) return;
  const c = l.clock, s = SET(), arms = (s.bonusArmes || []).filter(k => l.cfg?.bon && l.cfg[COUPS[k].w]), tr0 = arms.length && c.R > 1 ? bonusTarget(c) : 0;
  const key = [tr0, jugOf("R"), jugOf("B"), l.bonusPick.R, l.bonusPick.B, l.bonus.R?.c, l.bonus.B?.c].join('|'); if (key === coachKey) return; coachKey = key;
  for (const side of ['R', 'B']) {
    const tr = jugOf(side) === 'debutant' ? 0 : tr0, el = $('#coach' + side), show = tr && l.bonusPick[side] !== tr, coach = coachOf(l, side);
    el.hidden = !show;
    if (show) el.innerHTML = `<div class="coach-box"><small>⏱ Temps de coaching · reprise ${tr}</small><h3>${coach ? `📋 ${esc(coach)}, ` : ''}choisis avec <b>${esc(l[side].name)}</b> son arme bonus</h3>
      <p class="note">Chaque touche valable avec cette arme rapporte <b>+${s.bonusPts}</b> à la reprise ${tr}.</p>
      <div class="coach-btns">${arms.map(k => `<button class="cbonus" data-bonus="${side}" data-c="${k}"><b>${COUPS[k].l}</b><span>${COUPS[k].w}</span></button>`).join('')}</div>
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
    $('#fSub' + s).textContent = `${st.valid} touche${st.valid > 1 ? 's' : ''} · ${st.tent} coup${st.tent > 1 ? 's' : ''}${st.trop ? ` · ${st.trop} trop fort` : ''}${l.cfg.ench && st.ok ? ` · ${st.ok} enchaîn.` : ''}`;
    const en = l.ench[s], b = $(`.sbtn.ench[data-side="${s}"]`);
    b.hidden = !l.cfg.ench || jugOf(s) === 'debutant'; b.classList.toggle('on', !!en); b.title = en ? (en.n ? 'Enchaînement : 2e touche' : 'Enchaînement : 1re touche') : 'Enchaînement (ou double tap)';
  }
  const expert = l.cfg.jug === 'expert';
  $$('#arena .half').forEach(h => h.hidden = expert && h.dataset.side !== l.xs);
  $('#xsel').hidden = !expert; $$('#xsel .xs').forEach(b => { b.classList.toggle('on', b.dataset.xs === l.xs); b.textContent = (b.dataset.xs === 'R' ? '🔴 ' : '🔵 ') + l[b.dataset.xs].name; });
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
let endTimer = null, endLong = false;
const fEnd = $('#fEnd');
fEnd.addEventListener('pointerdown', () => {
  endLong = false; clearTimeout(endTimer);
  endTimer = setTimeout(async () => {
    endLong = true; const l = LV(); if (!l) return; buzz(40);
    const v = await choiceBox('Déclarer un abandon', 'Qui abandonne cet assaut ? L\'autre tireur est déclaré vainqueur.',
      [{label: `Abandon de ${l.R.name}`, value: 'R', cls: 'red'}, {label: `Abandon de ${l.B.name}`, value: 'B', cls: 'blue'}]);
    if (!v) return;
    l.abandon = v; const c = l.clock; c.phase = 'end'; c.remaining = 0; save(); renderClock(); openResult();
  }, 650);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => fEnd.addEventListener(ev, () => clearTimeout(endTimer)));
fEnd.addEventListener('click', async () => {
  if (endLong) { endLong = false; return; }
  if (!(await confirmBox('Terminer l\'assaut ?', 'Le chrono s\'arrête et le résultat s\'affiche.<br><span class="note">Astuce : appui long pour déclarer un abandon.</span>', 'Terminer'))) return;
  const c = LV().clock; c.phase = 'end'; c.remaining = 0; save(); renderClock(); openResult();
});
$('#fMenu').addEventListener('click', () => { save(); closeFight(); go('home'); });

/* ---- Gestes : saisie « sans regarder » (module BoxeSaisie, js/boxe-saisie.js) ----
   Le geste commence à gauche (rouge) ou à droite (bleu) ; en haut = poing, en bas = pied (limite entre les deux boutons).
   Trajectoire droite : direct / chassé · courbe : crochet / fouetté · 1, 2, 3 doigts : bas, milieu, haut · tap à 4 doigts : annuler. */
const arena = $('#arena'), cv = $('#trail'), ctx = cv.getContext('2d');
let arect = arena.getBoundingClientRect();
function resizeCanvas() { arect = arena.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; cv.width = Math.round(arect.width * dpr); cv.height = Math.round(arect.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
new ResizeObserver(resizeCanvas).observe(arena);
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
let trails = [], impacts = [], raf = null, lastXY = null;
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
const blindOn = () => !!LV() && !$('#fight').hidden && !$('#resultDlg').open && !$('#modal-root').firstChild;
const blindTrails = new Map();
const CHAIN_MS = 2500;
BX = BoxeSaisie.createEngine(arena, {
  sides: {left: 'R', right: 'B'}, curveMetric: 'chord', curveThreshold: () => SET().seuil, enabled: blindOn,
  doubleTapMs: g => { const l = LV(); return l && l.cfg && l.cfg.ench && jugOf(g.side) !== 'debutant' ? 500 : 0; },
  /* le point de départ désigne le bouton (gant / chaussure) le plus proche, dans la moitié du coach (ou toute la largeur en mode expert) */
  classify: p => {
    const l = LV(), jug = l.cfg.jug, r = arena.getBoundingClientRect();
    const side = jug === 'expert' ? l.xs : (p.x < p.w / 2 ? 'R' : 'B');
    let best = null, bd = Infinity;
    arena.querySelectorAll(`.half[data-side="${side}"] .weapon`).forEach(el => { const b = el.getBoundingClientRect(), d = Math.abs(p.x + r.left - (b.left + b.right) / 2); if (d < bd) { bd = d; best = el; } });
    if (!best) return {side, key: side, arme: 'poing'};
    const arme = best.dataset.arme, hand = best.dataset.hand || null;
    return {side, key: jug === 'expert' ? side + arme + hand : side, arme, hand};
  },
  ignore: 'button, a, input, select, textarea, .coach',
  onTrail: ev => {
    if (ev.type === 'start') { audio(); arect = arena.getBoundingClientRect(); const t = {pts: [[ev.cx, ev.cy]], color: cssv('--navy')}; blindTrails.set(ev.id, t); trails.push(t); }
    else { const t = blindTrails.get(ev.id); if (t) t.pts.push([ev.cx, ev.cy]); }
    kick();
  },
  onGesture: res => {
    const tr = (res.ids || []).map(id => blindTrails.get(id)).filter(Boolean), best = blindTrails.get(res.bestId);
    (res.ids || []).forEach(id => blindTrails.delete(id));
    const fade = () => tr.forEach(t => { t.t0 = performance.now(); });
    if (res.kind === 'cancel') { tr.forEach(t => { t.t0 = performance.now() - 900; }); kick(); return; }
    if (res.kind === 'undo') { fade(); kick(); buzz(60); $(`.sbtn[data-act="undo"][data-side="${res.side}"]`).click(); return; }
    if (res.kind === 'chain') { tr.forEach(t => { t.t0 = performance.now() - 600; }); kick(); armChain(res.side); return; }
    const l = LV(), cfg = l.cfg, jug = jugOf(res.side);
    let arme = res.arme, coup, h, z, zs = 'c';
    const extra = {};
    if (jug === 'debutant') { arme = 'poing'; coup = 'direct'; z = 'tronc'; extra.gen = true; extra.nh = true; }
    else {
      if (!cfg[arme]) return;
      coup = arme === 'poing' ? (res.trajectoire === 'courbe' ? 'crochet' : 'direct') : (res.trajectoire === 'courbe' ? 'fouette' : 'chasse');
      if (jug === 'debrouille') { z = 'tronc'; extra.nh = true; }
      else { h = hOf(arme, res.fingers); [z, zs] = BLIND_ZONE[arme][h]; extra.h = h; }
    }
    if (jug === 'expert') { const r = arena.getBoundingClientRect(); extra.k = res.cx < r.left + r.width / 2 ? 'g' : 'd'; extra.main = res.hand; zs = extra.k; }
    extra.inc = res.flags.length > 0 && jug !== 'debutant';
    if (best) { best.color = res.trajectoire === 'courbe' ? cssv('--curve') : cssv('--straight'); best.label = jug === 'debutant' ? '' : COUPS[coup].l; }
    fade();
    const ps = partsOf($('#target' + res.side), z, zs).map(x => x.getBoundingClientRect());
    if (ps.length) { const L0 = Math.min(...ps.map(r => r.left)), R0 = Math.max(...ps.map(r => r.right)), T0 = Math.min(...ps.map(r => r.top)), B0 = Math.max(...ps.map(r => r.bottom)); lastXY = [jug === 'expert' ? (L0 + R0) / 2 : (L0 + R0) / 2, (T0 + B0) / 2]; if (jug === 'expert') lastXY[0] = res.cx < arena.getBoundingClientRect().left + arena.getBoundingClientRect().width / 2 ? (L0 + R0) / 2 : (L0 + R0) / 2; }
    beep(jug === 'debutant' ? 1 : (res.fingers || 1), arme === 'poing' ? 300 : 620, res.trajectoire === 'courbe' ? .11 : .06);
    record(res.side, arme, coup, z, zs, extra);
  }
});
function clearChain(side) { const l = LV(), en = l.ench[side]; if (en) l.events.forEach(x => { if (x.ench === en.id) x.ench = null; }); l.ench[side] = null; }
/* Enchaînement par double tap : touche précédente (moins de 2,5 s) + touche suivante, ou les deux touches qui suivent */
function armChain(side) {
  const l = LV(); if (!l.cfg.ench || jugOf(side) === 'debutant') return;
  clearChain(side);
  const now = Date.now(), prev = [...l.events].reverse().find(x => x.t === side);
  if (prev && now - prev.ts <= CHAIN_MS && !prev.ench) { const id = uid(); prev.ench = id; l.ench[side] = {id, n: 1, exp: prev.ts + CHAIN_MS}; banner(side, '🔗 Enchaînement : la <b>2e touche</b> maintenant', 'await'); }
  else { l.ench[side] = {id: uid(), n: 0, exp: now + CHAIN_MS}; banner(side, '🔗 Enchaînement : les <b>deux touches</b> qui suivent', 'await'); }
  save(); renderFight(); buzz(25);
}
function record(side, weapon, coup, zone, zside, extra = {}) {
  const l = LV();
  const e = {id: uid(), ts: Date.now(), t: side, w: weapon, c: coup, z: zone || null, s: zside || null, cat: zone ? CAT[zone] : 'manque', trop: false, rep: l.clock.rep, ench: null};
  if (extra.h) e.h = extra.h; if (extra.inc) e.inc = true; if (extra.nh) e.nh = 1; if (extra.gen) e.gen = 1; if (extra.k) { e.k = extra.k; e.main = extra.main; }
  const bn = l.bonus?.[side]; if (bn && bn.c === coup && l.clock.rep >= bn.from) e.bx = +SET().bonusPts || 0;
  let enchMsg = '', en = l.ench[side];
  if (en && Date.now() > en.exp) { clearChain(side); en = null; }
  if (en) {
    e.ench = en.id; en.n++;
    if (en.n === 1) en.exp = e.ts + CHAIN_MS;
    if (en.n >= 2) { l.ench[side] = null; const pair = [...l.events.filter(x => x.ench === en.id), e];
      enchMsg = pair.every(isValid) ? ' · <b>enchaînement validé</b>' : ' · enchaînement non validé'; }
    else enchMsg = ' · 🔗 1/2';
  }
  l.events.push(e); save(); renderFight();
  const p = ptsOf(e), lab = e.gen ? 'Touche' : COUPS[coup].l;
  const where = e.nh ? (e.gen ? '' : cap1(weapon)) : cap1(e.h ? BLIND_LAB[weapon][e.h] : ZL[zone]);
  const hand = e.main ? ` · ${e.main.toUpperCase()} → ${e.k.toUpperCase()}${e.main !== e.k ? ' ✖ croisé' : ''}` : '';
  banner(side, `<b>${lab}</b>${where ? ' · ' + where : ''}${hand}${e.inc ? ' ?' : ''}${p === 0 ? ' (non valable)' : ''}${e.bx && p > 0 ? ` · ★ +${e.bx}` : ''}${enchMsg}<span class="pts">${p > 0 ? '+' + p : p}</span>`, p > 0 ? 'ok' : 'zero');
  buzz(p > 0 ? 25 : 10);
  if (lastXY) { impacts.push({x: lastXY[0], y: lastXY[1], t0: performance.now(), color: p > 0 ? '#F29A12' : '#9AA3B5', txt: p > 0 ? (e.bx ? `★ +${p}` : `+${p}`) : ''}); kick(); }
  lastXY = null;
  partsOf($('#target' + side), zone, zside).forEach(g => { g.classList.add('hit'); setTimeout(() => g.classList.remove('hit'), 650); });
}
$$('.side-ctrl').forEach(c => c.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const side = b.dataset.side, l = LV(), act = b.dataset.act;
  if (act === 'ench') {
    const en = l.ench[side];
    if (!en) { l.ench[side] = {id: uid(), n: 0, exp: Date.now() + CHAIN_MS}; banner(side, '🔗 Enchaînement : les <b>deux touches</b> qui suivent', 'await'); }
    else { clearChain(side); defaultBanner(side); }
    save(); renderFight();
  }
  if (act === 'trop') {      /* uniquement la toute dernière frappe de ce côté */
    const ev = [...l.events].reverse().find(x => x.t === side);
    if (!ev) return toast('Aucune frappe à pénaliser');
    ev.trop = !ev.trop; save(); renderFight(); buzz([30, 60, 30]);
    banner(side, ev.trop ? `💥 <b>Trop fort</b> : dernière frappe pénalisée<span class="pts">${ptsOf(ev)}</span>` : '↩️ Pénalité retirée', ev.trop ? 'neg' : 'zero');
  }
  if (act === 'undo') {
    let i = -1; for (let k = l.events.length - 1; k >= 0; k--) if (l.events[k].t === side) { i = k; break; }
    if (i < 0) return toast('Rien à annuler');
    const [ev] = l.events.splice(i, 1); const en = l.ench[side]; if (en && ev.ench === en.id) { en.n--; if (en.n < 0) l.ench[side] = null; }
    save(); renderFight(); banner(side, `↩️ Annulé : ${ev.gen ? 'touche' : COUPS[ev.c].l}`, 'zero');
  }
}));
$('#xsel').addEventListener('click', e => { const b = e.target.closest('[data-xs]'); if (!b || !LV()) return; LV().xs = b.dataset.xs; save(); buildOrigins(); renderFight(); });

/* ---- Résultat + observation du pilier ---- */
let autoT = null;
function result() { const l = LV(), sR = scoreOf(l.events, 'R'), sB = scoreOf(l.events, 'B'); if (l.abandon) return {sR, sB, winner: OTHER[l.abandon], abandon: l.abandon}; return {sR, sB, winner: sR > sB ? 'R' : sB > sR ? 'B' : 'N'}; }
function obsBlock(side) {
  const l = LV(), pil = l.pil; if (!pil || !pil.cr.length) return '';
  const cur = l.obs[side] || [];
  return `<div class="res-obs"><h3 style="color:var(--orange)">🏛 ${esc(pil.n)} · observé par le coach</h3>${pil.cr.map((c, i) => `<div class="obs-row"><div class="obs-c">${esc(c)}</div><div class="obs-btns">${[1, 2, 3, 4].map(v =>
    `<button class="obtn ${cur[i] === v ? 'on' : ''}" style="--cc:${OBS[v].c};--cf:${OBS[v].f}" data-obs="${side}" data-i="${i}" data-v="${v}">${OBS[v].n}</button>`).join('')}</div></div>`).join('')}</div>`;
}
/* ---- Bilan : personnage au centre, nombre de touches par cible et par arme, camembert poings / pieds ---- */
const BIL_ZONE = {tete: 'tete', tronc: 'ventre', ventre: 'ventre', flancs: 'flancs', jambes: 'jambes'};
const BIL_ROWS = [['tete', 'Visage', 4, 'r'], ['ventre', 'Ventre', 34, 'r'], ['flancs', 'Flancs', 50, 'l'], ['jambes', 'Jambes', 78, 'r']];
function bilCounts(events, side) {
  const m = {nh: 0, gen: 0, poing: 0, pied: 0};
  BIL_ROWS.forEach(r => m[r[0]] = {poing: 0, pied: 0, g: 0, d: 0});
  events.forEach(e => {
    if (e.t !== side || !e.z) return;
    if (e.gen) { m.gen++; return; }
    m[e.w]++;
    const k = BIL_ZONE[e.z];
    if (e.nh || !k) { m.nh++; return; }
    m[k][e.w]++; if (e.k) m[k][e.k]++;
  });
  return m;
}
function pieHTML(parts) {
  const tot = parts.reduce((a, p) => a + p.v, 0);
  if (!tot) return '<span class="note">Pas encore de touche</span>';
  let a0 = -Math.PI / 2, paths = '';
  parts.filter(p => p.v).forEach(p => {
    const a1 = a0 + p.v / tot * 2 * Math.PI;
    if (p.v === tot) paths += `<circle cx="50" cy="50" r="48" fill="${p.c}"/>`;
    else paths += `<path d="M50 50L${(50 + 48 * Math.cos(a0)).toFixed(2)} ${(50 + 48 * Math.sin(a0)).toFixed(2)}A48 48 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${(50 + 48 * Math.cos(a1)).toFixed(2)} ${(50 + 48 * Math.sin(a1)).toFixed(2)}Z" fill="${p.c}" stroke="#fff" stroke-width="1.5"/>`;
    a0 = a1;
  });
  return `<div class="pie"><svg viewBox="0 0 100 100" aria-label="Répartition poings et pieds">${paths}</svg><div>${parts.map(p => `<div><i style="background:${p.c}"></i>${p.l} : ${p.v} (${Math.round(100 * p.v / tot)} %)</div>`).join('')}</div></div>`;
}
function bilanHTML(events, side, o) {
  const m = bilCounts(events, side), expert = events.some(e => e.k);
  const labs = BIL_ROWS.map(([k, l, y, pos]) => { const c = m[k];
    return `<div class="bil-lab ${pos}" style="top:${y}%"><b>${l}</b><span>🥊 ${c.poing} · 🦶 ${c.pied}</span>${expert && (c.g || c.d) ? `<small>G ${c.g} · D ${c.d}</small>` : ''}</div>`; }).join('');
  const combos = {};
  events.forEach(e => { if (e.t !== side || !e.k || !e.main || !BIL_ZONE[e.z]) return; const key = `${e.w}|${e.main}|${BIL_ZONE[e.z]}|${e.k}`; combos[key] = (combos[key] || 0) + 1; });
  const zl = Object.fromEntries(BIL_ROWS.map(r => [r[0], r[1]]));
  const detail = Object.entries(combos).sort((a, b) => b[1] - a[1]).map(([key, n]) => { const [w, main, z, k] = key.split('|');
    return `<tr${main !== k ? ' style="color:var(--orange);font-weight:800"' : ''}><td>${w === 'pied' ? 'Pied' : 'Poing'} ${main.toUpperCase()}</td><td>→ ${zl[z]} ${k.toUpperCase()}${main !== k ? ' ✖ croisé' : ''}</td><td class="n">${n}</td></tr>`; }).join('');
  const note = [m.nh ? `${m.nh} touche${m.nh > 1 ? 's' : ''} sans hauteur précisée` : '', m.gen ? `${m.gen} touche${m.gen > 1 ? 's' : ''} sans distinction poing / pied` : ''].filter(Boolean).join(' · ');
  return `<div class="bil-wrap"><div class="bil"><div class="bil-fig" id="${o.id}">${BFDraw.fighter({sexe: o.sexe, corner: o.corner})}</div>${labs}</div>
    <div>${pieHTML([{l: 'Poings', v: m.poing, c: '#F29A12'}, {l: 'Pieds', v: m.pied, c: '#13285A'}, {l: 'Touches non distinguées', v: m.gen, c: '#9AA3B5'}])}${note ? `<div class="bil-note">${note}</div>` : ''}${detail ? `<table class="tight bil-det"><tbody>${detail}</tbody></table><div class="bil-note">G / D : côté de l'écran où le geste finit</div>` : ''}</div></div>`;
}
function studentEvents(id, n) {
  const out = [];
  for (const a of S.assaults) {
    if (a.status !== 'done' || (n && a.n !== n)) continue;
    const side = a.red === id ? 'R' : a.blue === id ? 'B' : null; if (!side) continue;
    (a.events || []).forEach(e => { if (e.t === side) out.push({...e, t: 'X'}); });
  }
  return out;
}
function openResult() {
  const l = LV(); if (!l) return;
  const r = result(), cfg = l.cfg || lessonCfg(l.n);
  const col = side => { const jug = jugOf(side), st = sideStats(l.events, side), o = OTHER[side], cross = l.events.filter(e => e.t === side && e.main && e.main !== e.k).length;
    const rows = [['Touches valables', `${st.valid} / ${st.tent}`]];
    if (jug !== 'debutant' && cfg.poing) rows.push(['Directs · crochets', `${st.coups.direct.v} · ${st.coups.crochet.v}`]);
    if (jug !== 'debutant' && cfg.pied) rows.push(['Chassés · fouettés', `${st.coups.chasse.v} · ${st.coups.fouette.v}`]);
    if (jug === 'expert') rows.push(['Coups croisés', cross]);
    if (cfg.ench && jug !== 'debutant') rows.push(['Enchaînements réussis', `${st.ok} / ${st.tries}`]);
    if (cfg.bon && jug !== 'debutant') rows.push(['Touches arme bonus', st.bonus]);
    rows.push(['Frappes trop fortes', st.trop]);
    return `<div class="res-col ${side}"><h3>${esc(l[side].name)}</h3><div class="kv">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>
      ${bilanHTML(l.events, side, {id: 'rh' + side, sexe: l[o].sexe, corner: o})}<span class="note" style="display:block;text-align:center">Cibles touchées sur ${esc(l[o].name)}</span>${obsBlock(side)}</div>`; };
  $('#resultBody').innerHTML = `<div class="result">
    <div class="res-head ${r.winner}"><small>${r.abandon ? 'Abandon de ' + esc(l[r.abandon].name) : 'Résultat de l\'observation'}</small><h2>${r.winner === 'N' ? 'Match nul' : 'Victoire de ' + esc(l[r.winner].name)}${r.abandon ? ' par abandon' : ''}</h2>
      <div class="res-score"><span>${r.sR}</span><span style="font-size:30px;opacity:.7">–</span><span>${r.sB}</span></div></div>
    <div class="res-cols">${col('R')}${col('B')}</div>
    <div class="res-foot" id="resFoot"><span class="note">L'observation ne peut plus être corrigée une fois le bilan affiché.</span><button class="btn go" id="resOk">✓ Valider le résultat</button></div></div>`;
  paintHeat($('#rhR'), l.events, 'R'); paintHeat($('#rhB'), l.events, 'B');
  $('#resOk').onclick = commitResult;
  if (!$('#resultDlg').open) $('#resultDlg').showModal();
}
$('#resultBody').addEventListener('click', e => {
  const b = e.target.closest('[data-obs]'); if (!b || !LV()) return;
  const l = LV(), side = b.dataset.obs, i = +b.dataset.i, v = +b.dataset.v;
  l.obs[side] = l.obs[side] || []; l.obs[side][i] = l.obs[side][i] === v ? null : v; save();
  b.parentElement.querySelectorAll('.obtn').forEach(x => x.classList.toggle('on', +x.dataset.v === l.obs[side][i]));
});
$('#resultDlg').addEventListener('cancel', e => e.preventDefault());
function commitResult() {
  const l = LV(), r = result();
  const data = {status: 'done', red: l.R.id, blue: l.B.id, jc: l.jc, jp: l.jp, scoreR: r.sR, scoreB: r.sB, winner: r.winner, ab: l.abandon || null, events: l.events, obs: l.pil ? l.obs : null, pil: l.pil?.id || '',
    repSec: l.clock.repSec, reprises: l.clock.R, rp: l.clock.phase === 'ready' ? Math.max(1, l.clock.rep - 1) : l.clock.rep, startedAt: l.startedAt, endedAt: Date.now(), names: {R: l.R.name, B: l.B.name}, d: ROOT.deviceId};
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
    se.push([realName(s), groupOf(s.id)?.name || '', s.sexe, st.J, st.V, st.N, st.D, st.pm, st.pe, st.tent, st.valid, st.tent ? Math.round(100 * st.valid / st.tent) : '',
      ...COUP_KEYS.flatMap(c => [st.coups[c].t, st.coups[c].v]), st.cats.tete, st.cats.tronc, st.cats.bas, st.cats.garde, st.cats.manque, st.trop, st.tries, st.ok, st.bonus, st.jc, st.jp, st.rest]); }
  add('Stats élèves', se, [26, 12, 6, ...Array(27).fill(12)]);
  const pl = [['Élève', 'Groupe', 'Leçon', 'Pilier', 'Critère', 'Observation']];
  for (let n = 1; n <= N; n++) { const p = lessonPil(n); if (!p) continue;
    for (const s of sortedStudents()) { const o = obsAgg(n, s.id); if (!o) continue; p.cr.forEach((c, i) => pl.push([realName(s), groupOf(s.id)?.name || '', n, p.n, c, o[i] ? OBS[o[i]].n : ''])); } }
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
