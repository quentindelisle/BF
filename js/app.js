/* Observ'BF — N'EPS numérique · by Quentin Delisle */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const fmtLong = sec => { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m} min${s ? ' ' + String(s).padStart(2, '0') : ''}` : `${s} s`; };

/* ================= Référentiel ================= */
const CAT = {tete:'tete', tronc:'tronc', cuisse:'bas', tibia:'bas', epaule:'garde', bras:'garde', avantbras:'garde'};
const ZL = BFDraw.ZL;
const CATL = {tete:'Visage', tronc:'Tronc', bas:'Ligne basse', garde:'Bras / garde', manque:'Dans le vide'};
const COUPS = {direct:{l:'Direct', w:'poing'}, crochet:{l:'Crochet', w:'poing'}, chasse:{l:'Chassé', w:'pied'}, fouette:{l:'Fouetté', w:'pied'}};
const COL = {R:{c:'#E53935', d:'#B71C1C', name:'rouge'}, B:{c:'#1E6FE0', d:'#0D47A1', name:'bleu'}};
const OTHER = {R:'B', B:'R'};
const DEF_BAREME = {poing:{tete:2, tronc:1, bas:0, garde:0}, pied:{tete:3, tronc:2, bas:1, garde:0}};
const DEF = {
  v: 2, className: '', students: [],
  groups: [{id:'g1', name:'Groupe 1', members:[], sig:''}, {id:'g2', name:'Groupe 2', members:[], sig:''}],
  settings: {totalMin:40, reprises:2, recupSec:30, transitionSec:60, mode:'auto', manualSec:90,
    bareme: clone(DEF_BAREME), penalite:1, bonusEnch:1, seuil:0.18, ptsV:3, ptsN:2, ptsD:1, autoNext:10, pin:''},
  tabletGroup: null, assaults: [], live: null
};
const KEY = 'observbf.v2';
let D;
try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e) { D = null; }
if (!D || D.v !== 2) D = clone(DEF);
D.settings = Object.assign(clone(DEF.settings), D.settings || {});
let saveT;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch(e) { toast('Mémoire de la tablette pleine : exportez une sauvegarde'); } };
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 600); };
const S = () => D.settings;

/* ================= Utilitaires UI ================= */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch(e) {} };
let actx = null;
function audio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch(e) {} return actx; }
function beep(n = 1, freq = 880, dur = .18) {
  const a = audio(); if (!a) return;
  for (let i = 0; i < n; i++) {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * (dur + .12);
    o.frequency.value = freq; o.type = 'square'; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
  }
}
// Confirmation sans boîte de dialogue : 2e appui dans les 4 s
function confirmTap(btn, label, fn) {
  if (btn.dataset.armed) { clearTimeout(+btn.dataset.armed); delete btn.dataset.armed; btn.textContent = btn.dataset.label; btn.classList.remove('armed'); fn(); return; }
  btn.dataset.label = btn.textContent; btn.textContent = label; btn.classList.add('armed');
  btn.dataset.armed = setTimeout(() => { delete btn.dataset.armed; btn.textContent = btn.dataset.label; btn.classList.remove('armed'); }, 4000);
}
function show(id) { $$('.screen').forEach(s => s.hidden = s.id !== id); current = id; if (id === 'fight') startClockLoop(); else stopClockLoop(); }
let current = 'home';

/* ================= Élèves ================= */
const stu = id => D.students.find(s => s.id === id);
const fullName = s => s ? `${s.prenom} ${s.nom}`.trim() : '';
const nameOf = id => { const s = stu(id); return s ? fullName(s) : ''; };
const sortStudents = arr => arr.sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr'));
const groupOf = id => D.groups.find(g => g.members.includes(id));

/* ================= Tournoi ================= */
const pairKey = (a, b) => [a, b].sort().join('|');
function roundRobin(ids) {
  const p = [...ids]; if (p.length < 2) return [];
  if (p.length % 2) p.push(null);
  const n = p.length, out = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) { const a = p[i], b = p[n - 1 - i]; if (a && b) out.push((r + i) % 2 ? [b, a] : [a, b]); }
    p.splice(1, 0, p.pop());
  }
  // éviter qu'un élève combatte deux fois de suite
  const seq = [], rest = out.slice();
  while (rest.length) {
    const p1 = seq[seq.length - 1] || [], p2 = seq[seq.length - 2] || [];
    let k = rest.findIndex(x => !x.some(y => p1.includes(y) || p2.includes(y)));
    if (k < 0) k = rest.findIndex(x => !x.some(y => p1.includes(y)));
    if (k < 0) k = 0;
    seq.push(rest.splice(k, 1)[0]);
  }
  return seq;
}
function ensureSchedule(g) {
  const sig = [...g.members].sort().join(',');
  if (g.sig === sig) return;
  const done = D.assaults.filter(a => a.groupId === g.id && a.status === 'done');
  D.assaults = D.assaults.filter(a => !(a.groupId === g.id && a.status !== 'done'));
  const doneKeys = new Set(done.filter(a => g.members.includes(a.red) && g.members.includes(a.blue)).map(a => pairKey(a.red, a.blue)));
  let order = done.reduce((m, a) => Math.max(m, a.order || 0), 0);
  for (const [r, b] of roundRobin(g.members)) if (!doneKeys.has(pairKey(r, b)))
    D.assaults.push({id: uid(), groupId: g.id, red: r, blue: b, order: ++order, status: 'todo'});
  g.sig = sig; save();
}
const groupAssaults = g => D.assaults.filter(a => a.groupId === g.id).sort((a, b) => (a.order || 0) - (b.order || 0));
const todoList = g => groupAssaults(g).filter(a => a.status !== 'done');
function timing(n) {
  const s = S(), nA = n * (n - 1) / 2, R = Math.max(1, +s.reprises || 1), rec = +s.recupSec || 0, tr = +s.transitionSec || 0;
  let rep, warn = '';
  if (s.mode === 'manuel' || !nA) rep = +s.manualSec || 90;
  else {
    rep = Math.floor(((s.totalMin * 60 / nA) - tr - (R - 1) * rec) / R / 5) * 5;
    if (rep < 30) { rep = 30; warn = 'Temps insuffisant'; }
    if (rep > 180) rep = 180;
  }
  const assaultSec = R * rep + (R - 1) * rec, total = nA * (assaultSec + tr);
  if (!warn && total > s.totalMin * 60 + 1) warn = 'Dépasse la durée prévue';
  return {nA, rep, rec, R, assaultSec, total, warn};
}
function suggestJudges(a, g) {
  const others = g.members.filter(id => id !== a.red && id !== a.blue);
  const done = D.assaults.filter(x => x.groupId === g.id && x.status === 'done');
  const cnt = id => done.filter(x => x.jc === id || x.coin === id).length;
  const todo = todoList(g), idx = todo.findIndex(x => x.id === a.id), next = todo[idx + 1];
  const busy = id => next && (next.red === id || next.blue === id) ? 1 : 0;
  const last = id => { const i = done.findLastIndex ? done.findLastIndex(x => x.jc === id || x.coin === id) : -1; return i; };
  others.sort((x, y) => busy(x) - busy(y) || cnt(x) - cnt(y) || last(x) - last(y));
  return [others[0] || '', others[1] || ''];
}
function ranking(g) {
  const s = S(), rows = new Map(g.members.map(id => [id, {id, J:0, V:0, N:0, D:0, pts:0, pm:0, pe:0}]));
  for (const a of D.assaults) {
    if (a.groupId !== g.id || a.status !== 'done') continue;
    for (const [me, my, their, w] of [[a.red, a.scoreR, a.scoreB, 'R'], [a.blue, a.scoreB, a.scoreR, 'B']]) {
      const r = rows.get(me); if (!r) continue;
      r.J++; r.pm += my; r.pe += their;
      if (a.winner === 'N') { r.N++; r.pts += +s.ptsN; } else if (a.winner === w) { r.V++; r.pts += +s.ptsV; } else { r.D++; r.pts += +s.ptsD; }
    }
  }
  return [...rows.values()].sort((a, b) => b.pts - a.pts || (b.pm - b.pe) - (a.pm - a.pe) || b.pm - a.pm || nameOf(a.id).localeCompare(nameOf(b.id), 'fr'));
}
function rankingTable(g, compact) {
  const rk = ranking(g);
  if (!rk.length) return '<p class="note">Aucun élève dans ce groupe.</p>';
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Élève</th><th class="n">J</th><th class="n">V</th><th class="n">N</th><th class="n">D</th><th class="n">Pts</th>${compact ? '' : '<th class="n">Marqués</th><th class="n">Encaissés</th><th class="n">Diff.</th>'}</tr></thead><tbody>` +
    rk.map((r, i) => `<tr class="${i === 0 && r.J ? 'rank-1' : ''}"><td>${i + 1}</td><td>${esc(nameOf(r.id))}</td><td class="n">${r.J}</td><td class="n">${r.V}</td><td class="n">${r.N}</td><td class="n">${r.D}</td><td class="n"><b>${r.pts}</b></td>${compact ? '' : `<td class="n">${r.pm}</td><td class="n">${r.pe}</td><td class="n">${r.pm - r.pe > 0 ? '+' : ''}${r.pm - r.pe}</td>`}</tr>`).join('') + '</tbody></table></div>';
}

/* ================= Points ================= */
function ptsOf(e) { if (!e.z) return 0; if (e.trop) return -Math.abs(+S().penalite || 0); return +(S().bareme[e.w]?.[e.cat] ?? 0); }
const isValid = e => e.z && !e.trop && ptsOf(e) > 0;
function enchStats(events, side) {
  const m = new Map();
  for (const e of events) if (e.t === side && e.ench) { if (!m.has(e.ench)) m.set(e.ench, []); m.get(e.ench).push(e); }
  let tries = 0, ok = 0;
  for (const arr of m.values()) { tries++; if (arr.length === 2 && arr.every(isValid)) ok++; }
  return {tries, ok};
}
const scoreOf = (events, side) => events.filter(e => e.t === side).reduce((s, e) => s + ptsOf(e), 0) + enchStats(events, side).ok * (+S().bonusEnch || 0);
function sideStats(events, side) {
  const ev = events.filter(e => e.t === side);
  const st = {tent: ev.length, valid: ev.filter(isValid).length, trop: ev.filter(e => e.trop).length, poing: 0, pied: 0, cats: {}, coups: {}, ...enchStats(events, side)};
  for (const k in CATL) st.cats[k] = ev.filter(e => e.cat === k).length;
  for (const c in COUPS) { const ce = ev.filter(e => e.c === c); st.coups[c] = {t: ce.length, v: ce.filter(isValid).length}; }
  st.poing = ev.filter(e => e.w === 'poing').length; st.pied = ev.filter(e => e.w === 'pied').length;
  return st;
}

/* ================= ACCUEIL ================= */
function renderHome() {
  const g = D.groups.find(x => x.id === D.tabletGroup);
  $('#studentInfo').textContent = g ? `${g.name} · ${g.members.length} élèves · ${todoList(g).length} assauts à faire` : 'Choisissez d\'abord le groupe dans l\'espace prof';
  const L = D.live;
  $('#goResume').hidden = !L;
  if (L) $('#resumeInfo').textContent = `${L.R.name} contre ${L.B.name}`;
}
$('#goResume').addEventListener('click', () => openFight());
$('#goStudent').addEventListener('click', () => {
  if (!D.tabletGroup || !D.groups.find(g => g.id === D.tabletGroup)) { toast('Choisissez le groupe de la tablette dans Espace prof > Tournoi'); return askProf('tournoi'); }
  openPrep(false);
});
$('#goFree').addEventListener('click', () => openPrep(true));
$('#goProf').addEventListener('click', () => askProf());

function askProf(tab) {
  if (!S().pin) return openProf(tab);
  $('#pinInput').value = ''; $('#pinMsg').textContent = ''; $('#pinDlg').dataset.tab = tab || '';
  $('#pinDlg').showModal(); setTimeout(() => $('#pinInput').focus(), 50);
}
$('#pinForm').addEventListener('submit', e => {
  e.preventDefault();
  if ($('#pinInput').value === S().pin) { $('#pinDlg').close(); openProf($('#pinDlg').dataset.tab); }
  else { $('#pinMsg').textContent = 'Code incorrect'; $('#pinInput').value = ''; }
});
$('#pinCancel').addEventListener('click', () => $('#pinDlg').close());

/* ================= ESPACE PROF ================= */
let profTab = 'classe';
function openProf(tab) { if (tab) profTab = tab; show('prof'); renderProf(); }
$('#profHome').addEventListener('click', () => { show('home'); renderHome(); });
$('#profTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; profTab = b.dataset.tab; renderProf(); });
function renderProf() {
  $$('#profTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === profTab));
  $$('#prof .tab').forEach(t => t.hidden = t.id !== 'tab-' + profTab);
  ({classe: renderClasse, groupes: renderGroupes, tournoi: renderTournoi, resultats: renderResultats})[profTab]();
}

/* ---- Classe ---- */
function renderClasse() {
  $('#className').value = D.className || '';
  const f = D.students.filter(s => s.sexe === 'F').length;
  $('#classCount').textContent = D.students.length ? `${D.students.length} · ${f} F · ${D.students.length - f} G` : '';
  $('#classList').innerHTML = D.students.length ? sortStudents([...D.students]).map(s =>
    `<div class="stile"><button class="sx ${s.sexe}" data-sx="${s.id}" aria-label="Changer garçon / fille">${s.sexe}</button><span class="nm"><b>${esc(s.nom)}</b> ${esc(s.prenom)}</span><button class="del" data-del="${s.id}" aria-label="Retirer ${esc(fullName(s))}">×</button></div>`).join('')
    : '<p class="note">Aucun élève. Importez un fichier Excel ou ajoutez les élèves un par un.</p>';
}
$('#className').addEventListener('input', e => { D.className = e.target.value; saveSoon(); });
$('#classList').addEventListener('click', e => {
  const sx = e.target.closest('[data-sx]'), del = e.target.closest('[data-del]');
  if (sx) { const s = stu(sx.dataset.sx); s.sexe = s.sexe === 'F' ? 'G' : 'F'; save(); renderClasse(); }
  if (del) confirmTap(del, '?', () => removeStudent(del.dataset.del));
});
function removeStudent(id) {
  D.students = D.students.filter(s => s.id !== id);
  D.groups.forEach(g => g.members = g.members.filter(m => m !== id));
  save(); renderClasse();
}
let addSexe = 'G';
$('#addSexe').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; addSexe = b.dataset.v; $$('#addSexe button').forEach(x => x.classList.toggle('on', x === b)); });
$('#addForm').addEventListener('submit', e => {
  e.preventDefault();
  const nom = $('#addNom').value.trim().toUpperCase(), prenom = cap($('#addPrenom').value.trim());
  if (!nom && !prenom) return toast('Saisissez au moins un nom');
  D.students.push({id: uid(), nom, prenom, sexe: addSexe}); save();
  $('#addNom').value = ''; $('#addPrenom').value = ''; $('#addNom').focus(); renderClasse();
});
const cap = s => s.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

/* Import Excel */
let importRows = [];
$('#fileXlsx').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  if (!window.XLSX) return toast('Lecteur Excel non chargé : réessayez dans un instant');
  try {
    const wb = XLSX.read(await file.arrayBuffer(), {type: 'array'});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, blankrows: false, defval: ''});
    importRows = parseClass(rows);
    showImportPreview(file.name);
  } catch(err) { toast('Fichier illisible : vérifiez qu\'il s\'agit bien d\'un fichier Excel'); }
});
const sexOf = v => { v = String(v || '').trim().toUpperCase(); if (/^(F|FILLE|FÉMININ|FEMININ)$/.test(v)) return 'F'; if (/^(G|M|H|GARÇON|GARCON|MASCULIN)$/.test(v)) return 'G'; return null; };
function parseClass(rows) {
  const out = [];
  rows = rows.filter(r => String(r[0] || '').trim());
  if (rows.length && /^(nom|élève|eleve|nom prénom|nom et prénom|noms?)\b/i.test(String(rows[0][0]).trim())) rows.shift();
  const bIsName = rows.filter(r => String(r[1] || '').trim() && !sexOf(r[1])).length > rows.length / 2;
  for (const r of rows) {
    const a = String(r[0]).trim().replace(/\s+/g, ' ');
    let nom, prenom, sexe = null;
    if (bIsName) { nom = a.toUpperCase(); prenom = cap(String(r[1]).trim()); sexe = sexOf(r[2]); }
    else {
      const t = a.split(' '); const up = [];
      while (t.length > 1 && t[0] === t[0].toUpperCase() && /\p{L}/u.test(t[0])) up.push(t.shift());
      if (!up.length) up.push(t.shift());
      nom = up.join(' ').toUpperCase(); prenom = cap(t.join(' ')); sexe = sexOf(r[1]) || sexOf(r[2]);
    }
    out.push({nom, prenom, sexe: sexe || 'G', sexKnown: !!sexe});
  }
  return out;
}
function showImportPreview(name) {
  const p = $('#importPreview');
  if (!importRows.length) { p.hidden = true; return toast('Aucun élève trouvé dans ' + name); }
  const unknown = importRows.filter(r => !r.sexKnown).length;
  p.hidden = false;
  p.innerHTML = `<h2>${importRows.length} élèves trouvés</h2>
    <p class="note">${esc(name)}${unknown ? ` · ${unknown} sans sexe indiqué (garçon par défaut, modifiable ensuite)` : ''}</p>
    <div class="import-list">${importRows.map(r => `<div><b>${esc(r.nom)}</b> ${esc(r.prenom)} · ${r.sexe}</div>`).join('')}</div>
    <div class="row"><button class="btn primary" id="impReplace">Remplacer la classe</button><button class="btn" id="impAdd">Ajouter à la classe</button><button class="btn" id="impCancel">Annuler</button></div>`;
  $('#impReplace').onclick = () => doImport(true);
  $('#impAdd').onclick = () => doImport(false);
  $('#impCancel').onclick = () => { p.hidden = true; };
}
function doImport(replace) {
  if (replace) { D.students = []; D.groups.forEach(g => { g.members = []; g.sig = ''; }); D.assaults = D.assaults.filter(a => a.status === 'done'); }
  for (const r of importRows) D.students.push({id: uid(), nom: r.nom, prenom: r.prenom, sexe: r.sexe});
  save(); $('#importPreview').hidden = true; renderClasse(); toast(`${importRows.length} élèves importés`);
}

/* ---- Groupes (glisser-déposer) ---- */
function setGroupCount(n) {
  n = Math.max(1, Math.min(10, n));
  while (D.groups.length < n) { const i = D.groups.length + 1; D.groups.push({id: 'g' + uid(), name: 'Groupe ' + i, members: [], sig: ''}); }
  while (D.groups.length > n) {
    const g = D.groups.pop();
    D.assaults = D.assaults.filter(a => !(a.groupId === g.id && a.status !== 'done'));
    if (D.tabletGroup === g.id) D.tabletGroup = null;
  }
  save(); renderGroupes();
}
$('#gMinus').addEventListener('click', () => setGroupCount(D.groups.length - 1));
$('#gPlus').addEventListener('click', () => setGroupCount(D.groups.length + 1));
$('#gClear').addEventListener('click', e => confirmTap(e.currentTarget, 'Confirmer ?', () => { D.groups.forEach(g => g.members = []); save(); renderGroupes(); }));
$('#gAuto').addEventListener('click', () => {
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const list = [...shuffle(D.students.filter(s => s.sexe === 'F')), ...shuffle(D.students.filter(s => s.sexe !== 'F'))];
  D.groups.forEach(g => g.members = []);
  const n = D.groups.length;
  list.forEach((s, i) => { const r = Math.floor(i / n), k = i % n; D.groups[r % 2 ? n - 1 - k : k].members.push(s.id); });
  save(); renderGroupes(); toast('Répartition faite : ajustez en glissant les tuiles');
});
const tile = id => { const s = stu(id); return s ? `<div class="dtile" data-id="${id}"><span class="sx ${s.sexe}">${s.sexe}</span>${esc(s.prenom)} <b>${esc(s.nom)}</b></div>` : ''; };
function renderGroupes() {
  $('#gCount').textContent = D.groups.length;
  const placed = new Set(D.groups.flatMap(g => g.members));
  const pool = sortStudents(D.students.filter(s => !placed.has(s.id)));
  $('#poolCount').textContent = pool.length ? `(${pool.length})` : '';
  $('#poolTiles').innerHTML = pool.length ? pool.map(s => tile(s.id)).join('') : `<p class="note">${D.students.length ? 'Tous les élèves sont placés.' : 'Importez d\'abord la classe.'}</p>`;
  $('#groupsGrid').innerHTML = D.groups.map(g => {
    const t = timing(g.members.length);
    return `<div class="group" data-drop="${g.id}"><header><h2>${esc(g.name)}</h2><span class="meta">${g.members.length} élèves · ${t.nA} assauts</span></header>
      <div class="g-tiles">${g.members.map(tile).join('') || '<p class="note">Déposez des élèves ici</p>'}</div></div>`;
  }).join('');
  selTile = null;
}
let drag = null, selTile = null;
$('#tab-groupes').addEventListener('pointerdown', e => {
  const t = e.target.closest('.dtile'); if (!t) return;
  drag = {id: t.dataset.id, el: t, x: e.clientX, y: e.clientY, moving: false, pid: e.pointerId};
});
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
    drag.moving = true; const gh = $('#dragGhost'); gh.innerHTML = drag.el.outerHTML; gh.hidden = false; drag.el.style.opacity = .35;
  }
  if (drag.moving) {
    const gh = $('#dragGhost'); gh.style.left = e.clientX + 'px'; gh.style.top = e.clientY + 'px';
    $$('.drop-hot').forEach(x => x.classList.remove('drop-hot'));
    const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]'); if (z) z.classList.add('drop-hot');
  }
});
document.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag; drag = null;
  $('#dragGhost').hidden = true; d.el.style.opacity = '';
  $$('.drop-hot').forEach(x => x.classList.remove('drop-hot'));
  if (d.moving) { const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]'); if (z) moveTo(d.id, z.dataset.drop); }
  else { // appui simple : sélection puis appui sur un groupe
    if (selTile === d.id) { selTile = null; d.el.classList.remove('sel'); }
    else { $$('.dtile.sel').forEach(x => x.classList.remove('sel')); selTile = d.id; d.el.classList.add('sel'); }
    e.stopPropagation();
  }
});
document.addEventListener('pointercancel', () => { if (drag) { $('#dragGhost').hidden = true; drag.el.style.opacity = ''; drag = null; } });
$('#tab-groupes').addEventListener('click', e => {
  if (!selTile || e.target.closest('.dtile')) return;
  const z = e.target.closest('[data-drop]'); if (z) moveTo(selTile, z.dataset.drop);
});
function moveTo(id, dest) {
  D.groups.forEach(g => g.members = g.members.filter(m => m !== id));
  const g = D.groups.find(x => x.id === dest); if (g) g.members.push(id);
  save(); renderGroupes();
}

/* ---- Tournoi / paramètres ---- */
const NUMS = {sTotal:'totalMin', sReprises:'reprises', sRecup:'recupSec', sTransition:'transitionSec', sManual:'manualSec', sPen:'penalite', sEnch:'bonusEnch', sV:'ptsV', sN:'ptsN', sD:'ptsD', sAuto:'autoNext'};
function renderTournoi() {
  const s = S();
  $('#tabletGroup').innerHTML = D.groups.map(g => `<button data-g="${g.id}" class="${D.tabletGroup === g.id ? 'on' : ''}">${esc(g.name)} (${g.members.length})</button>`).join('');
  for (const [id, k] of Object.entries(NUMS)) $('#' + id).value = s[k];
  $$('#sMode button').forEach(b => b.classList.toggle('on', b.dataset.v === s.mode));
  $('#sManualWrap').hidden = s.mode !== 'manuel';
  $('#sSeuil').value = s.seuil; $('#seuilVal').textContent = Math.round(s.seuil * 100) + ' %';
  $('#sPin').value = s.pin || '';
  $('#baremeBody').innerHTML = ['poing', 'pied'].map(w => `<tr><th>${w === 'poing' ? 'Poing' : 'Pied'}</th>` +
    ['tete', 'tronc', 'bas', 'garde'].map(c => `<td><input type="number" min="0" max="10" step="1" id="b-${w}-${c}" data-w="${w}" data-c="${c}" value="${s.bareme[w][c]}"></td>`).join('') + '</tr>').join('');
  renderTiming();
}
function renderTiming() {
  const rows = D.groups.map(g => {
    const t = timing(g.members.length);
    return `<tr><td>${esc(g.name)}</td><td class="n">${g.members.length}</td><td class="n">${t.nA}</td><td class="n"><b>${t.R} × ${fmt(t.rep)}</b></td><td class="n">${fmt(t.assaultSec)}</td><td class="n ${t.warn ? 'warn' : ''}">${t.nA ? fmtLong(t.total) : '—'}${t.warn ? ' · ' + t.warn : ''}</td></tr>`;
  }).join('');
  $('#timingTable').innerHTML = `<thead><tr><th>Groupe</th><th class="n">Élèves</th><th class="n">Assauts</th><th class="n">Reprises</th><th class="n">Assaut</th><th class="n">Durée totale</th></tr></thead><tbody>${rows}</tbody>`;
}
$('#tab-tournoi').addEventListener('input', e => {
  const t = e.target, s = S();
  if (NUMS[t.id]) s[NUMS[t.id]] = Math.max(0, +t.value || 0);
  if (t.dataset.w) s.bareme[t.dataset.w][t.dataset.c] = Math.max(0, +t.value || 0);
  if (t.id === 'sSeuil') { s.seuil = +t.value; $('#seuilVal').textContent = Math.round(s.seuil * 100) + ' %'; }
  if (t.id === 'sPin') s.pin = t.value.trim();
  saveSoon(); renderTiming();
});
$('#sMode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S().mode = b.dataset.v; save(); renderTournoi(); });
$('#tabletGroup').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; D.tabletGroup = b.dataset.g; save(); renderTournoi(); });
$('#launchStudent').addEventListener('click', () => {
  const g = D.groups.find(x => x.id === D.tabletGroup);
  if (!g) return toast('Choisissez d\'abord le groupe de la tablette');
  if (g.members.length < 2) return toast('Ce groupe a moins de 2 élèves');
  openPrep(false);
});

/* ---- Résultats ---- */
function renderResultats() {
  D.groups.forEach(ensureSchedule);
  let html = '';
  for (const g of D.groups) {
    const list = groupAssaults(g), done = list.filter(a => a.status === 'done').length;
    html += `<div class="card res-group"><div class="row between"><h2>${esc(g.name)}</h2><span class="pill">${done} / ${list.length} assauts</span></div>
      <div class="res-grid"><div>${rankingTable(g)}</div><div class="table-wrap"><table><thead><tr><th>#</th><th>Rouge</th><th>Bleu</th><th class="n">Score</th><th></th></tr></thead><tbody>` +
      list.map((a, i) => `<tr><td>${i + 1}</td><td class="${a.winner === 'R' ? 'wR' : ''}">${esc(nameOf(a.red))}</td><td class="${a.winner === 'B' ? 'wB' : ''}">${esc(nameOf(a.blue))}</td>` +
        (a.status === 'done' ? `<td class="n"><b>${a.scoreR} – ${a.scoreB}</b></td><td class="n"><button class="btn small" data-undo="${a.id}">Rejouer</button></td>` : `<td class="n"><span class="status">à faire</span></td><td></td>`) + '</tr>').join('') +
      `</tbody></table></div></div></div>`;
  }
  const free = D.assaults.filter(a => !a.groupId && a.status === 'done');
  if (free.length) html += `<div class="card res-group"><h2>Assauts libres</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Rouge</th><th>Bleu</th><th class="n">Score</th><th></th></tr></thead><tbody>` +
    free.map(a => `<tr><td>${new Date(a.endedAt).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'})}</td><td class="${a.winner === 'R' ? 'wR' : ''}">${esc(a.names?.R)}</td><td class="${a.winner === 'B' ? 'wB' : ''}">${esc(a.names?.B)}</td><td class="n"><b>${a.scoreR} – ${a.scoreB}</b></td><td class="n"><button class="btn small" data-delfree="${a.id}">Supprimer</button></td></tr>`).join('') + '</tbody></table></div></div>';
  const stats = D.students.map(s => ({s, st: studentStats(s.id)})).filter(x => x.st.J);
  if (stats.length) html += `<div class="card res-group"><h2>Statistiques des élèves</h2><div class="table-wrap"><table><thead><tr><th>Élève</th><th class="n">Assauts</th><th class="n">V-N-D</th><th class="n">Pts marqués</th><th class="n">Coups</th><th class="n">Touches</th><th class="n">Effic.</th><th class="n">Poing / pied</th><th class="n">Visage</th><th class="n">Trop fort</th><th class="n">Enchaîn.</th><th class="n">Arbitrage</th></tr></thead><tbody>` +
    sortStudents(stats.map(x => x.s)).map(s => { const st = stats.find(x => x.s === s).st; return `<tr><td>${esc(fullName(s))}</td><td class="n">${st.J}</td><td class="n">${st.V}-${st.N}-${st.D}</td><td class="n">${st.pm}</td><td class="n">${st.tent}</td><td class="n">${st.valid}</td><td class="n">${st.tent ? Math.round(100 * st.valid / st.tent) + ' %' : '—'}</td><td class="n">${st.poing} / ${st.pied}</td><td class="n">${st.cats.tete}</td><td class="n">${st.trop}</td><td class="n">${st.ok}/${st.tries}</td><td class="n">${st.jc + st.coin}</td></tr>`; }).join('') + '</tbody></table></div></div>';
  $('#resultsBody').innerHTML = html || '<div class="card"><p class="note">Pas encore de résultats.</p></div>';
}
$('#resultsBody').addEventListener('click', e => {
  const u = e.target.closest('[data-undo]'), f = e.target.closest('[data-delfree]');
  if (u) confirmTap(u, 'Sûr ?', () => { const a = D.assaults.find(x => x.id === u.dataset.undo); Object.assign(a, {status:'todo', events:[], scoreR:null, scoreB:null, winner:null}); save(); renderResultats(); });
  if (f) confirmTap(f, 'Sûr ?', () => { D.assaults = D.assaults.filter(x => x.id !== f.dataset.delfree); save(); renderResultats(); });
});
$('#resetResults').addEventListener('click', e => confirmTap(e.currentTarget, 'Confirmer : effacer les résultats', () => {
  D.assaults = []; D.groups.forEach(g => g.sig = ''); D.live = null; save(); renderResultats(); toast('Résultats effacés');
}));
$('#resetAll').addEventListener('click', e => confirmTap(e.currentTarget, 'Confirmer : tout effacer', () => {
  D = clone(DEF); save(); renderProf(); toast('Application remise à zéro');
}));

function studentStats(id) {
  const st = {J:0, V:0, N:0, D:0, pm:0, pe:0, tent:0, valid:0, trop:0, poing:0, pied:0, tries:0, ok:0, jc:0, coin:0, cats:{}, coups:{}};
  for (const k in CATL) st.cats[k] = 0;
  for (const c in COUPS) st.coups[c] = {t:0, v:0};
  for (const a of D.assaults) {
    if (a.status !== 'done') continue;
    if (a.jc === id) st.jc++;
    if (a.coin === id) st.coin++;
    const side = a.red === id ? 'R' : a.blue === id ? 'B' : null; if (!side) continue;
    st.J++; st.pm += side === 'R' ? a.scoreR : a.scoreB; st.pe += side === 'R' ? a.scoreB : a.scoreR;
    if (a.winner === 'N') st.N++; else if (a.winner === side) st.V++; else st.D++;
    const s = sideStats(a.events || [], side);
    for (const k of ['tent', 'valid', 'trop', 'poing', 'pied', 'tries', 'ok']) st[k] += s[k];
    for (const k in CATL) st.cats[k] += s.cats[k];
    for (const c in COUPS) { st.coups[c].t += s.coups[c].t; st.coups[c].v += s.coups[c].v; }
  }
  return st;
}

/* Export Excel */
$('#exportXlsx').addEventListener('click', () => {
  if (!window.XLSX) return toast('Module Excel non chargé');
  D.groups.forEach(ensureSchedule);
  const wb = XLSX.utils.book_new();
  const add = (name, rows, widths) => { const ws = XLSX.utils.aoa_to_sheet(rows); if (widths) ws['!cols'] = widths.map(w => ({wch: w})); XLSX.utils.book_append_sheet(wb, ws, name); };
  const gName = id => D.groups.find(g => g.id === id)?.name || 'Assaut libre';
  // Classement
  const cl = [];
  for (const g of D.groups) {
    cl.push([g.name]); cl.push(['Rang', 'Élève', 'Joués', 'Victoires', 'Nuls', 'Défaites', 'Points classement', 'Points marqués', 'Points encaissés', 'Différence']);
    ranking(g).forEach((r, i) => cl.push([i + 1, nameOf(r.id), r.J, r.V, r.N, r.D, r.pts, r.pm, r.pe, r.pm - r.pe]));
    cl.push([]);
  }
  add('Classement', cl, [8, 28, 8, 10, 8, 10, 16, 15, 16, 11]);
  // Assauts
  const as = [['Groupe', 'N°', 'Tireur rouge', 'Tireur bleu', 'Score rouge', 'Score bleu', 'Vainqueur', 'Juge central', 'Juge de coin', 'Reprises', 'Date', 'Statut']];
  const sorted = [...D.assaults].sort((a, b) => gName(a.groupId).localeCompare(gName(b.groupId)) || (a.order || 0) - (b.order || 0));
  const numIn = a => a.groupId ? groupAssaults(D.groups.find(g => g.id === a.groupId) || {id: a.groupId}).indexOf(a) + 1 : '';
  for (const a of sorted) {
    const nR = a.names?.R || nameOf(a.red), nB = a.names?.B || nameOf(a.blue);
    as.push([gName(a.groupId), numIn(a), nR, nB, a.status === 'done' ? a.scoreR : '', a.status === 'done' ? a.scoreB : '',
      a.status === 'done' ? (a.winner === 'N' ? 'Nul' : a.winner === 'R' ? nR : nB) : '', nameOf(a.jc), nameOf(a.coin),
      a.reprises ? `${a.reprises} × ${fmt(a.repSec)}` : '', a.endedAt ? new Date(a.endedAt).toLocaleString('fr-FR') : '', a.status === 'done' ? 'terminé' : 'à faire']);
  }
  add('Assauts', as, [14, 5, 24, 24, 11, 10, 24, 22, 22, 10, 20, 9]);
  // Stats élèves
  const se = [['Élève', 'Groupe', 'Sexe', 'Assauts', 'Victoires', 'Nuls', 'Défaites', 'Points marqués', 'Points encaissés', 'Coups observés', 'Touches valables', 'Efficacité (%)',
    'Directs (tentés)', 'Directs (valables)', 'Crochets (tentés)', 'Crochets (valables)', 'Chassés (tentés)', 'Chassés (valables)', 'Fouettés (tentés)', 'Fouettés (valables)',
    'Touches visage', 'Touches tronc', 'Touches ligne basse', 'Touches bras/garde', 'Dans le vide', 'Frappes trop fortes', 'Enchaînements tentés', 'Enchaînements réussis', 'Juge central (nb)', 'Juge de coin (nb)']];
  for (const s of sortStudents([...D.students])) {
    const st = studentStats(s.id);
    se.push([fullName(s), groupOf(s.id)?.name || '', s.sexe, st.J, st.V, st.N, st.D, st.pm, st.pe, st.tent, st.valid, st.tent ? Math.round(100 * st.valid / st.tent) : '',
      st.coups.direct.t, st.coups.direct.v, st.coups.crochet.t, st.coups.crochet.v, st.coups.chasse.t, st.coups.chasse.v, st.coups.fouette.t, st.coups.fouette.v,
      st.cats.tete, st.cats.tronc, st.cats.bas, st.cats.garde, st.cats.manque, st.trop, st.tries, st.ok, st.jc, st.coin]);
  }
  add('Stats élèves', se, [26, 12, 6, ...Array(27).fill(12)]);
  // Touches
  const to = [['Groupe', 'Assaut', 'Tireur', 'Coin', 'Adversaire', 'Reprise', 'Heure', 'Arme', 'Coup', 'Cible', 'Côté', 'Zone', 'Points', 'Trop fort', 'Enchaînement']];
  for (const a of sorted) {
    if (a.status !== 'done') continue;
    const nm = {R: a.names?.R || nameOf(a.red), B: a.names?.B || nameOf(a.blue)};
    for (const e of a.events || []) to.push([gName(a.groupId), numIn(a), nm[e.t], e.t === 'R' ? 'rouge' : 'bleu', nm[OTHER[e.t]], e.rep, new Date(e.ts).toLocaleTimeString('fr-FR'),
      e.w, COUPS[e.c].l, e.z ? ZL[e.z] : 'Dans le vide', e.s === 'g' ? 'gauche' : e.s === 'd' ? 'droite' : '', CATL[e.cat], ptsOf(e), e.trop ? 'oui' : '', e.ench ? 'oui' : '']);
  }
  add('Touches', to, [14, 7, 24, 7, 24, 8, 10, 7, 10, 18, 8, 12, 7, 9, 13]);
  const s = S();
  add('Paramètres', [['Classe', D.className], ['Durée du tournoi (min)', s.totalMin], ['Reprises', s.reprises], ['Récupération (s)', s.recupSec], ['Changement (s)', s.transitionSec],
    ['Poing visage / tronc / bas / garde', ['tete', 'tronc', 'bas', 'garde'].map(c => s.bareme.poing[c]).join(' / ')], ['Pied visage / tronc / bas / garde', ['tete', 'tronc', 'bas', 'garde'].map(c => s.bareme.pied[c]).join(' / ')],
    ['Frappe trop forte', -s.penalite], ['Bonus enchaînement', s.bonusEnch], ['Classement V / N / D', `${s.ptsV} / ${s.ptsN} / ${s.ptsD}`], ['Export', new Date().toLocaleString('fr-FR')]], [34, 22]);
  XLSX.writeFile(wb, `ObservBF_${(D.className || 'classe').replace(/[^\w-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
$('#exportJson').addEventListener('click', () => {
  const g = D.groups.find(x => x.id === D.tabletGroup);
  download(`ObservBF_sauvegarde_${g ? g.name.replace(/\s+/g, '') + '_' : ''}${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, JSON.stringify({...D, live: null}), 'application/json');
});
$('#importJson').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  let data; try { data = JSON.parse(await f.text()); } catch(err) { return toast('Sauvegarde illisible'); }
  if (!data || data.v !== 2) return toast('Ce fichier n\'est pas une sauvegarde Observ\'BF');
  const panel = document.createElement('div'); panel.className = 'card';
  panel.innerHTML = `<h2>Sauvegarde : ${data.students.length} élèves, ${data.assaults.filter(a => a.status === 'done').length} assauts terminés</h2>
    <p class="note">« Remplacer » installe cette sauvegarde sur la tablette (préparer les autres tablettes). « Fusionner » ajoute les assauts terminés d'une autre tablette.</p>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-m="replace">Remplacer tout</button><button class="btn" data-m="merge">Fusionner les résultats</button><button class="btn" data-m="no">Annuler</button></div>`;
  $('#resultsBody').prepend(panel);
  panel.addEventListener('click', ev => {
    const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return;
    if (m === 'replace') { const tg = D.tabletGroup; D = Object.assign(clone(DEF), data, {live: null}); D.settings = Object.assign(clone(DEF.settings), data.settings); if (D.groups.some(g => g.id === tg)) D.tabletGroup = tg; toast('Sauvegarde installée'); }
    if (m === 'merge') {
      let n = 0;
      for (const s of data.students) if (!stu(s.id)) D.students.push(s);
      for (const a of data.assaults) {
        if (a.status !== 'done') continue;
        const loc = D.assaults.find(x => x.id === a.id);
        if (!loc) { D.assaults.push(a); n++; } else if (loc.status !== 'done') { Object.assign(loc, a); n++; }
      }
      toast(`${n} assauts ajoutés`);
    }
    save(); panel.remove(); renderResultats();
  });
});

/* ================= PRÉPARATION ================= */
let P = null; // {free, groupId, aid, red, blue, jc, coin, guest:{R:{sexe},B:{sexe}}}
function openPrep(free) {
  if (D.live) return openFight();
  if (free) P = {free: true, groupId: null, aid: null, red: '', blue: '', jc: '', coin: '', guest: {R:{sexe:'G'}, B:{sexe:'F'}}};
  else {
    const g = D.groups.find(x => x.id === D.tabletGroup);
    ensureSchedule(g);
    const a = todoList(g)[0];
    if (!a) P = {free: false, groupId: g.id, aid: null, finished: true};
    else { const [jc, coin] = suggestJudges(a, g); P = {free: false, groupId: g.id, aid: a.id, red: a.red, blue: a.blue, jc, coin, guest: {R:{sexe:'G'}, B:{sexe:'G'}}}; }
  }
  show('prep'); renderPrep();
}
function prepPool() { if (P.free) return sortStudents([...D.students]).map(s => s.id); return [...D.groups.find(g => g.id === P.groupId).members].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'fr')); }
function options(sel, pool, empty) { return `<option value="">${empty}</option>` + pool.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(nameOf(id))}</option>`).join(''); }
function renderPrep() {
  const g = D.groups.find(x => x.id === P.groupId);
  $('#prepTitle').textContent = P.free ? 'Assaut libre' : g.name;
  const main = $('.prep-main');
  if (P.finished) {
    $('#prepProgress').textContent = 'Tournoi terminé';
    main.querySelector('.vs').hidden = true; main.querySelector('.judges').hidden = true; main.querySelector('.prep-foot').hidden = true;
    let fin = main.querySelector('.finished');
    if (!fin) { fin = document.createElement('div'); fin.className = 'finished'; main.appendChild(fin); }
    fin.innerHTML = `<h2 style="font-size:40px">Tous les assauts du ${esc(g.name)} sont terminés</h2><p class="note">Classement final ci-dessous. Le prof peut exporter les résultats depuis l'espace prof.</p><div style="margin-top:14px">${rankingTable(g)}</div>`;
  } else {
    main.querySelector('.finished')?.remove();
    main.querySelector('.vs').hidden = false; main.querySelector('.judges').hidden = false; main.querySelector('.prep-foot').hidden = false;
    const pool = prepPool();
    if (P.free) $('#prepProgress').textContent = 'Hors tournoi';
    else { const all = groupAssaults(g), done = all.filter(a => a.status === 'done').length; $('#prepProgress').textContent = `Assaut ${done + 1} / ${all.length}`; }
    $('#selRed').innerHTML = options(P.red, pool, P.free ? 'Tireur rouge' : '—');
    $('#selBlue').innerHTML = options(P.blue, pool, P.free ? 'Tireur bleu' : '—');
    $('#selJC').innerHTML = options(P.jc, pool, '— aucun —');
    $('#selCoin').innerHTML = options(P.coin, pool, '— aucun —');
    for (const side of ['R', 'B']) {
      const id = side === 'R' ? P.red : P.blue, sx = stu(id)?.sexe || P.guest[side].sexe;
      $$(`#sex${side} button`).forEach(b => b.classList.toggle('on', b.dataset.v === sx));
      $(`#prepFig${side}`).innerHTML = BFDraw.fighter({sexe: sx, color: COL[side].c, dark: COL[side].d});
    }
    const t = P.free ? timing(0) : timing(g.members.length);
    $('#prepTiming').textContent = `${t.R} reprise${t.R > 1 ? 's' : ''} de ${fmt(t.rep)}${t.R > 1 ? ` · récupération ${fmt(t.rec)}` : ''}`;
  }
  // colonne de droite
  if (!P.free) {
    const todo = todoList(g).filter(a => a.id !== P.aid).slice(0, 5);
    $('#nextList').innerHTML = todo.length ? todo.map(a => `<li><span class="wR">${esc(nameOf(a.red))}</span> – <span class="wB">${esc(nameOf(a.blue))}</span></li>`).join('') : '<li>Dernier assaut</li>';
    $('#prepRanking').innerHTML = rankingTable(g, true);
    $('.prep-side').hidden = false;
  } else $('.prep-side').hidden = true;
}
$('#prepHome').addEventListener('click', () => { show('home'); renderHome(); });
['selRed', 'selBlue', 'selJC', 'selCoin'].forEach(id => $('#' + id).addEventListener('change', e => {
  P[{selRed:'red', selBlue:'blue', selJC:'jc', selCoin:'coin'}[id]] = e.target.value; renderPrep();
}));
['R', 'B'].forEach(side => $('#sex' + side).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const s = stu(side === 'R' ? P.red : P.blue);
  if (s) { s.sexe = b.dataset.v; save(); } else P.guest[side].sexe = b.dataset.v;
  renderPrep();
}));
$('#prepSkip').addEventListener('click', () => {
  if (P.free || !P.aid) return;
  const g = D.groups.find(x => x.id === P.groupId), a = D.assaults.find(x => x.id === P.aid);
  a.order = groupAssaults(g).reduce((m, x) => Math.max(m, x.order || 0), 0) + 1; save(); openPrep(false); toast('Assaut repoussé à la fin');
});
$('#prepStart').addEventListener('click', () => {
  audio();
  if (P.red && P.red === P.blue) return toast('Choisissez deux tireurs différents');
  if (!P.free && (!P.red || !P.blue)) return toast('Choisissez les deux tireurs');
  const roles = [P.red, P.blue].filter(Boolean);
  if ((P.jc && roles.includes(P.jc)) || (P.coin && roles.includes(P.coin))) return toast('Un tireur ne peut pas être juge du même assaut');
  if (P.jc && P.jc === P.coin) return toast('Juge central et juge de coin doivent être différents');
  let repSec, R, rec;
  if (!P.free) {
    const g = D.groups.find(x => x.id === P.groupId), a = D.assaults.find(x => x.id === P.aid);
    // si les tireurs ont été changés, on échange avec l'assaut prévu correspondant
    if (pairKey(a.red, a.blue) !== pairKey(P.red, P.blue)) {
      const other = todoList(g).find(x => x.id !== a.id && pairKey(x.red, x.blue) === pairKey(P.red, P.blue));
      if (!other) return toast('Ces deux tireurs ont déjà fait leur assaut');
      [other.red, other.blue] = [a.red, a.blue];
    }
    a.red = P.red; a.blue = P.blue;
    ({rep: repSec, R, rec} = timing(g.members.length));
  } else ({rep: repSec, R, rec} = timing(0));
  const fighter = (id, side) => { const s = stu(id); return {id: id || '', name: s ? fullName(s) : (side === 'R' ? 'Rouge' : 'Bleu'), sexe: s ? s.sexe : P.guest[side].sexe}; };
  D.live = {aid: P.aid, groupId: P.groupId, free: P.free, R: fighter(P.red, 'R'), B: fighter(P.blue, 'B'), jc: P.jc, coin: P.coin, events: [], ench: {R: null, B: null},
    clock: {phase: 'ready', rep: 1, R, repSec, recSec: rec, remaining: repSec * 1000, endAt: null}, startedAt: Date.now()};
  save(); openFight();
});

/* ================= ASSAUT ================= */
const L = () => D.live;
function openFight() {
  const l = L(); if (!l) return openPrep(false);
  show('fight');
  // cible du rouge = le combattant bleu, et inversement
  $('#targetR').innerHTML = BFDraw.fighter({sexe: l.B.sexe, color: COL.B.c, dark: COL.B.d});
  $('#targetB').innerHTML = BFDraw.fighter({sexe: l.R.sexe, color: COL.R.c, dark: COL.R.d});
  for (const s of ['R', 'B']) {
    const m = s === 'B';
    $('#wp' + s).innerHTML = BFDraw.glove(COL[s].c, COL[s].d, m) + `<span class="wl">Poing<small>droit : direct<br>courbe : crochet</small></span>`;
    $('#wf' + s).innerHTML = BFDraw.shoe(COL[s].c, m) + `<span class="wl">Pied<small>droit : chassé<br>courbe : fouetté</small></span>`;
    defaultBanner(s);
  }
  renderFight(); renderClock(); resizeCanvas();
}
function defaultBanner(side) { banner(side, `<b>${esc(L().names?.[side] || L()[side].name)}</b> frappe : tracez depuis son gant ou sa chaussure jusqu'à la cible.`); }
function banner(side, html, cls = '') { const b = $('#banner' + side); b.className = 'banner ' + cls; b.innerHTML = html; }
function renderFight() {
  const l = L();
  for (const s of ['R', 'B']) {
    $('#fName' + s).textContent = l[s].name;
    $('#fScore' + s).textContent = scoreOf(l.events, s);
    const st = sideStats(l.events, s);
    $('#fSub' + s).textContent = `${st.valid} touche${st.valid > 1 ? 's' : ''} · ${st.tent} coup${st.tent > 1 ? 's' : ''}${st.trop ? ` · ${st.trop} trop fort` : ''}${st.ok ? ` · ${st.ok} enchaîn.` : ''}`;
    const en = l.ench[s], b = $(`.sbtn.ench[data-side="${s}"]`);
    b.classList.toggle('on', !!en); b.textContent = en ? (en.n ? 'Enchaîn. : 2e touche' : 'Enchaîn. : 1re touche') : 'Enchaînement';
  }
  $('#fJudges').innerHTML = `Juge central : <b>${esc(nameOf(l.jc) || '—')}</b> · Juge de coin : <b>${esc(nameOf(l.coin) || '—')}</b>`;
}

/* ---- Chrono ---- */
let clockTimer = null, lastSave = 0;
function startClockLoop() { if (!clockTimer) clockTimer = setInterval(clockTick, 200); }
function stopClockLoop() { clearInterval(clockTimer); clockTimer = null; }
function clockTick() {
  const l = L(); if (!l) return;
  const c = l.clock;
  if (c.phase === 'run' || c.phase === 'recup') {
    c.remaining = Math.max(0, c.endAt - Date.now());
    if (c.remaining <= 0) phaseEnd();
    if (Date.now() - lastSave > 2000) { lastSave = Date.now(); save(); }
  }
  renderClock();
}
function renderClock() {
  const l = L(); if (!l) return;
  const c = l.clock, el = $('#clock');
  el.className = 'clock ' + c.phase + (c.phase === 'run' && c.remaining < 10000 ? ' low' : '');
  $('#cTime').textContent = fmt(Math.ceil(c.remaining / 1000));
  $('#cRep').textContent = `Reprise ${c.rep}/${c.R}`;
  $('#cPhase').textContent = {ready: 'Prêt', run: 'Combat', pause: 'Arrêt', recup: 'Récupération', end: 'Terminé'}[c.phase];
  $('#cStart').textContent = {ready: 'Départ', run: 'Arrêt', pause: 'Reprendre', recup: 'Reprise !', end: 'Résultat'}[c.phase];
}
function phaseEnd() {
  const l = L(), c = l.clock;
  if (c.phase === 'run' || c.phase === 'pause' || c.phase === 'ready') {
    beep(3, 660, .25); buzz([200, 100, 200]);
    if (c.rep < c.R) {
      if (c.recSec > 0) { c.phase = 'recup'; c.remaining = c.recSec * 1000; c.endAt = Date.now() + c.remaining; toast(`Fin de la reprise ${c.rep} : récupération`); }
      else nextRep();
    } else { c.phase = 'end'; c.remaining = 0; save(); renderClock(); setTimeout(openResult, 700); }
  } else if (c.phase === 'recup') { beep(1, 1040, .3); nextRep(); }
  save(); renderClock();
}
function nextRep() { const c = L().clock; c.rep++; c.phase = 'ready'; c.remaining = c.repSec * 1000; c.endAt = null; toast(`Reprise ${c.rep} : appuyez sur Départ`); }
$('#cStart').addEventListener('click', () => {
  audio(); const c = L().clock;
  if (c.phase === 'ready' || c.phase === 'pause') { if (c.phase === 'ready') beep(1, 1040, .3); c.phase = 'run'; c.endAt = Date.now() + c.remaining; }
  else if (c.phase === 'run') { c.phase = 'pause'; c.remaining = Math.max(0, c.endAt - Date.now()); }
  else if (c.phase === 'recup') { beep(1, 1040, .3); nextRep(); c.phase = 'run'; c.endAt = Date.now() + c.remaining; }
  else if (c.phase === 'end') openResult();
  save(); renderClock();
});
$('#cReset').addEventListener('click', e => {
  const c = L().clock; if (c.phase === 'end') return;
  confirmTap(e.currentTarget, '?', () => { c.phase = 'ready'; c.remaining = c.repSec * 1000; c.endAt = null; save(); renderClock(); });
});
$('#cSkip').addEventListener('click', e => {
  const c = L().clock; if (c.phase === 'end') return;
  confirmTap(e.currentTarget, '?', () => { if (c.phase === 'recup') { nextRep(); save(); renderClock(); } else phaseEnd(); });
});
$('#fEnd').addEventListener('click', e => confirmTap(e.currentTarget, 'Confirmer la fin', () => { const c = L().clock; c.phase = 'end'; c.remaining = 0; save(); renderClock(); openResult(); }));
$('#fMenu').addEventListener('click', () => { save(); show('home'); renderHome(); });

/* ---- Gestes ---- */
const arena = $('#arena'), cv = $('#trail'), ctx = cv.getContext('2d');
let arect = null;
function resizeCanvas() {
  arect = arena.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(arect.width * dpr); cv.height = Math.round(arect.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resizeCanvas).observe(arena);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const gestures = new Map(); let trails = [], raf = null;
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
  ctx.globalAlpha = 1;
  raf = trails.length ? requestAnimationFrame(loop) : null;
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
function classify(pts) {
  const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1], dx = x1 - x0, dy = y1 - y0, Dd = Math.hypot(dx, dy);
  let len = 0, h = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (Dd > 1) for (const [x, y] of pts) h = Math.max(h, Math.abs(dy * (x - x0) - dx * (y - y0)) / Dd);
  return {len, curved: (Dd > 1 ? h / Dd : 9) > S().seuil};
}
function hitAt(x, y, side) {
  const el = document.elementFromPoint(x, y); if (!el) return {};
  const p = el.closest('.target .part');
  if (p && p.closest('.target').dataset.side === side) return {part: p};
  const m = el.closest('[data-miss]'); if (m && m.dataset.miss === side) return {miss: m};
  return {};
}
const hovers = new Map();
function setHover(pid, el) { const old = hovers.get(pid); if (old === el) return; old && old.classList.remove('hover'); el ? (el.classList.add('hover'), hovers.set(pid, el)) : hovers.delete(pid); }
$$('.weapon').forEach(w => w.addEventListener('pointerdown', e => {
  if (!L()) return;
  e.preventDefault(); audio();
  const side = w.dataset.side; setPending(side, null);
  const t = {pts: [[e.clientX, e.clientY]], color: css('--navy')};
  gestures.set(e.pointerId, {side, weapon: w.dataset.weapon, el: w, trail: t});
  trails.push(t); kick();
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
  t.color = c.curved ? css('--curve') : css('--straight'); t.label = COUPS[coup].l; t.t0 = performance.now(); kick();
  const h = hitAt(e.clientX, e.clientY, g.side);
  if (h.part) record(g.side, g.weapon, coup, h.part.dataset.zone, h.part.dataset.side);
  else if (h.miss) record(g.side, g.weapon, coup, null, null);
  else setPending(g.side, {weapon: g.weapon, coup});
}
arena.addEventListener('pointerup', e => endGesture(e, false));
arena.addEventListener('pointercancel', e => endGesture(e, true));

const pending = {R: null, B: null};
function setPending(side, p) {
  pending[side] = p;
  $('#target' + side).classList.toggle('await', !!p);
  if (p) banner(side, `<b>${COUPS[p.coup].l}</b> du ${p.weapon} : touchez la cible <button class="linkbtn" data-cancel="${side}">annuler</button>`, 'await');
}
$$('.target').forEach(t => t.addEventListener('click', e => {
  const p = e.target.closest('.part'); if (!p) return; const side = t.dataset.side;
  if (pending[side]) record(side, pending[side].weapon, pending[side].coup, p.dataset.zone, p.dataset.side);
  else toast('Commencez le geste sur le gant ou la chaussure');
}));
$$('.half').forEach(h => h.addEventListener('click', e => {
  const c = e.target.closest('[data-cancel]'); if (c) { setPending(c.dataset.cancel, null); defaultBanner(c.dataset.cancel); }
}));

function record(side, weapon, coup, zone, zside) {
  const l = L();
  const e = {id: uid(), ts: Date.now(), t: side, w: weapon, c: coup, z: zone || null, s: zside || null, cat: zone ? CAT[zone] : 'manque', trop: false, rep: l.clock.rep, ench: null};
  let enchMsg = '';
  const en = l.ench[side];
  if (en) {
    e.ench = en.id; en.n++;
    if (en.n >= 2) {
      l.ench[side] = null;
      const pair = [...l.events.filter(x => x.ench === en.id), e];
      enchMsg = pair.every(isValid) ? ` · <b>enchaînement réussi +${S().bonusEnch}</b>` : ' · enchaînement non validé';
    } else enchMsg = ' · enchaînement 1/2';
  }
  l.events.push(e); setPending(side, null); save(); renderFight();
  const p = ptsOf(e), where = zone ? ZL[zone] : 'dans le vide';
  const note = zone && CAT[zone] === 'garde' ? ' (sur la garde)' : (zone && p === 0 ? ' (cible non valable)' : '');
  banner(side, `<b>${COUPS[coup].l}</b> du ${weapon} → ${where}${note}${enchMsg}<span class="pts">${p > 0 ? '+' + p : p}</span>`, p > 0 ? 'ok' : 'zero');
  buzz(p > 0 ? 25 : 10);
  if (zone) { const g = $(`#target${side} .part[data-zone="${zone}"][data-side="${zside}"]`); if (g) { g.classList.add('hit'); setTimeout(() => g.classList.remove('hit'), 650); } }
}
$$('.side-ctrl').forEach(c => c.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const side = b.dataset.side, l = L();
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
    const [ev] = l.events.splice(i, 1);
    const en = l.ench[side]; if (en && ev.ench === en.id) en.n--;
    save(); renderFight(); banner(side, `Annulé : ${COUPS[ev.c].l} → ${ev.z ? ZL[ev.z] : 'dans le vide'}`, 'zero');
  }
}));

/* ---- Résultat ---- */
let autoT = null;
function result() {
  const l = L(), sR = scoreOf(l.events, 'R'), sB = scoreOf(l.events, 'B');
  return {sR, sB, winner: sR > sB ? 'R' : sB > sR ? 'B' : 'N'};
}
function openResult() {
  const l = L(); if (!l) return;
  const r = result();
  const col = side => { const st = sideStats(l.events, side);
    return `<div class="res-col ${side}"><h3>${esc(l[side].name)}</h3><div class="kv">
      <span>Touches valables</span><b>${st.valid} / ${st.tent}</b><span>Poing / pied</span><b>${st.poing} / ${st.pied}</b>
      <span>Directs · crochets</span><b>${st.coups.direct.v} · ${st.coups.crochet.v}</b><span>Chassés · fouettés</span><b>${st.coups.chasse.v} · ${st.coups.fouette.v}</b>
      <span>Visage · tronc · bas</span><b>${st.cats.tete} · ${st.cats.tronc} · ${st.cats.bas}</b><span>Sur la garde · dans le vide</span><b>${st.cats.garde} · ${st.cats.manque}</b>
      <span>Enchaînements réussis</span><b>${st.ok} / ${st.tries}</b><span>Frappes trop fortes</span><b>${st.trop}</b></div></div>`; };
  $('#resultBody').innerHTML = `<div class="result">
    <div class="res-head ${r.winner}"><small>Résultat de l'observation</small><h2>${r.winner === 'N' ? 'Match nul' : 'Victoire de ' + esc(l[r.winner].name)}</h2>
      <div class="res-score"><span>${r.sR}</span><span>–</span><span>${r.sB}</span></div></div>
    <div class="res-cols">${col('R')}${col('B')}</div>
    <div class="res-foot" id="resFoot"><button class="btn" id="resBack">Corriger l'observation</button><button class="btn go" id="resOk">Valider le résultat</button></div></div>`;
  $('#resBack').onclick = () => { $('#resultDlg').close(); };
  $('#resOk').onclick = commitResult;
  if (!$('#resultDlg').open) $('#resultDlg').showModal();
}
function commitResult() {
  const l = L(), r = result();
  const data = {status: 'done', red: l.R.id, blue: l.B.id, jc: l.jc, coin: l.coin, scoreR: r.sR, scoreB: r.sB, winner: r.winner, events: l.events,
    repSec: l.clock.repSec, reprises: l.clock.R, startedAt: l.startedAt, endedAt: Date.now(), names: {R: l.R.name, B: l.B.name}};
  if (l.aid) Object.assign(D.assaults.find(a => a.id === l.aid), data);
  else D.assaults.push({id: uid(), groupId: null, free: true, order: 0, ...data});
  const free = l.free; D.live = null; save();
  // passage automatique
  let next = null, g = null;
  if (!free) { g = D.groups.find(x => x.id === D.tabletGroup); if (g) { ensureSchedule(g); next = todoList(g)[0]; } }
  const secs = +S().autoNext || 10; let left = secs;
  const label = free ? 'Nouvel assaut libre' : next ? `Assaut suivant : <span class="wR">${esc(nameOf(next.red))}</span> – <span class="wB">${esc(nameOf(next.blue))}</span>` : 'Tous les assauts du groupe sont faits';
  $('#resFoot').innerHTML = `<span>${label}</span><span class="countdown" id="cd">dans ${left} s</span><div class="row"><button class="btn" id="resStay">Rester ici</button><button class="btn go" id="resNext">Continuer</button></div>`;
  const go = () => { clearInterval(autoT); $('#resultDlg').close(); openPrep(free); };
  $('#resNext').onclick = go;
  $('#resStay').onclick = () => { clearInterval(autoT); $('#cd').textContent = ''; $('#resStay').hidden = true; };
  clearInterval(autoT);
  autoT = setInterval(() => { left--; const cd = $('#cd'); if (cd) cd.textContent = `dans ${left} s`; if (left <= 0) go(); }, 1000);
  toast('Résultat enregistré');
}
$('#resultDlg').addEventListener('cancel', e => { if (!L()) e.preventDefault(); });

/* ================= PWA / divers ================= */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
let lock = null;
async function keepAwake() { try { if ('wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => lock = null); } } catch(e) {} }
document.addEventListener('pointerdown', keepAwake);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
document.addEventListener('contextmenu', e => { if (!e.target.closest('input')) e.preventDefault(); });
document.addEventListener('gesturestart', e => e.preventDefault());

renderHome();
if (D.live) { show('home'); }
})();
