/* Observ'BF — saisie vocale optionnelle (module vocal-eps/, hors ligne, Vosk).
   Les grammaires sont définies ici ; vocal-eps.js n'est pas modifié.
   Une seule saisie pour le geste et la voix : saisirTouche() dans app.js.
   Mode Inclusion uniquement (un observateur par tablette, donc un seul micro). */
(function (global) {
  'use strict';
  const COUP = {
    'fouetté': ['fouetté', 'fouetter', 'fouettée', 'fouet'],
    'chassé': ['chassé', 'chasser', 'chasse', 'chassés', 'chassez'],
    'crochet': ['crochet', 'crochets'],
    'direct': ['direct', 'directe', 'directs']
  };
  const HAUT = {
    'haut': ['haut', 'haute', 'en haut', 'tête', 'figure', 'visage'],
    'médiane': ['médiane', 'milieu', 'au milieu', 'flancs', 'ventre'],
    'bas': ['bas', 'basse', 'en bas', 'jambe', 'jambes']
  };
  /* N1 / N2 / N3 : niveaux du mode Inclusion (= débutant / débrouillé / complet) */
  const GRAMMAIRES = {
    debutant: {nom: 'Inclusion N1', champs: [{cle: 'touche', libelle: 'Touche', obligatoire: true, valeurs: {'touche': ['touche', 'touché', 'touchée', 'touchez', 'touches']}}]},
    debrouille: {nom: 'Inclusion N2', champs: [{cle: 'coup', libelle: 'Coup', obligatoire: true, valeurs: COUP}]},
    complet: {nom: 'Inclusion N3', champs: [{cle: 'coup', libelle: 'Coup', obligatoire: true, valeurs: COUP}, {cle: 'hauteur', libelle: 'Hauteur', obligatoire: true, valeurs: HAUT}]}
  };
  const VERS_COUP = {'fouetté': {arme: 'pied', courbe: true}, 'chassé': {arme: 'pied', courbe: false}, 'crochet': {arme: 'poing', courbe: true}, 'direct': {arme: 'poing', courbe: false}};
  const VERS_H = {'haut': 'haut', 'médiane': 'milieu', 'bas': 'bas'};

  const chip = (k, t, big) => `<span class="lx${big ? ' big' : ''}" data-k="${k}">${t}</span>`;
  /* Lexique affiché à côté du personnage : ce que l'on peut dire à ce niveau */
  const LEXIQUE = {
    debutant: () => `<div class="lex-h">À chaque touche, dis :</div><div class="lex-g">${chip('touche:touche', 'touche', true)}</div>`,
    debrouille: () => `<div class="lex-h">Dis le coup :</div>
      <div class="lex-g"><b>🥊 Poing</b>${chip('coup:direct', 'direct')}${chip('coup:crochet', 'crochet')}</div>
      <div class="lex-g"><b>🦶 Pied</b>${chip('coup:chassé', 'chassé')}${chip('coup:fouetté', 'fouetté')}</div>`,
    complet: () => `<div class="lex-h">Dis le coup, puis la hauteur :</div>
      <div class="lex-g"><b>🥊 Poing</b>${chip('coup:direct', 'direct')}${chip('coup:crochet', 'crochet')}</div>
      <div class="lex-g"><b>🦶 Pied</b>${chip('coup:chassé', 'chassé')}${chip('coup:fouetté', 'fouetté')}</div>
      <div class="lex-g"><b>↕ Hauteur</b>${chip('hauteur:haut', 'haut')}${chip('hauteur:médiane', 'médian')}${chip('hauteur:bas', 'bas')}</div>
      <div class="lex-n">haut = visage · médian = ventre, flancs · bas = jambes<br>(au poing : haut ou médian)</div>`
  };

  const Voix = {
    statut: 'off', erreur: '', continu: false, GRAMMAIRES,
    notifier() { const el = document.getElementById('voixStatut'); if (el) el.innerHTML = Voix.statutHTML(); Voix.accueil(); },
    statutHTML() {
      return {off: 'inactive', chargement: '⏳ chargement du modèle…', pret: '✅ modèle prêt', erreur: '⚠ ' + (Voix.erreur || 'erreur')}[Voix.statut] || '';
    },
    /* Message d'accueil du mode Inclusion : dit clairement l'état (voix désactivée, modèle en chargement, prête) */
    accueil() {
      const l = LV(); if (!l || !l.inc) return;
      const b = document.getElementById('banner' + l.xs); if (!b || (b.className.indexOf('voix') < 0 && b.textContent && !/^\s*(📋|Niveau)/.test(b.textContent))) return;
      const jug = jugOf(l.xs), ex = {debutant: '« touche »', debrouille: '« chassé » ou « crochet »', complet: '« fouetté haut »'}[jug];
      const niv = INC_N[jug][0] + ' · ' + INC_N[jug][1];
      let m;
      if (!SET().voix) m = `Mode Inclusion ${niv} · saisie tactile (voix désactivée : Paramètres du cycle → Saisie vocale)`;
      else if (Voix.statut === 'erreur') m = `Mode Inclusion ${niv} · ⚠ voix indisponible : ${esc(Voix.erreur)} (la saisie tactile reste possible)`;
      else if (Voix.statut !== 'pret') m = `Mode Inclusion ${niv} · ⏳ chargement du modèle vocal… (saisie tactile possible)`;
      else if (Voix.continu) m = `Mode Inclusion ${niv} · 🎧 écoute continue : annonce tes touches (${ex})`;
      else m = `Mode Inclusion ${niv} · 🎤 maintiens « Parler » et dis ${ex}, ou active l'écoute continue`;
      banner(l.xs, m, 'await voix');
    },
    /* Précharge le modèle (52 Mo la 1re fois) dès que la saisie vocale est activée */
    init(force) {
      if (!global.VocalEPS) return;
      if (!SET().voix && !force) { Voix.statut = 'off'; Voix.notifier(); return; }
      if (Voix.statut === 'pret' || Voix.statut === 'chargement') { Voix.notifier(); return; }
      Voix.statut = 'chargement'; Voix.erreur = ''; Voix.notifier();
      VocalEPS.prechargerModele().then(() => { Voix.statut = 'pret'; Voix.notifier(); })
        .catch(e => { Voix.statut = 'erreur'; Voix.erreur = (e && e.message) || 'chargement impossible'; Voix.notifier(); });
    },
    /* Surligne dans le lexique ce que la tablette reconnaît (en direct, puis au résultat) */
    surligner(side, texte, final, r) {
      const lex = document.getElementById('lex' + side); if (!lex || !Voix.cur) return;
      const a = VocalEPS.analyser(texte, Voix.cur.options.grammaire), cles = new Set(Object.entries(a.valeurs).map(([c, v]) => c + ':' + v));
      lex.querySelectorAll('.lx').forEach(el => { el.classList.toggle('hear', cles.has(el.dataset.k)); el.classList.remove('okk', 'ko'); });
      if (final) {
        const cls = r && r.valide ? 'okk' : 'ko';
        lex.querySelectorAll('.lx.hear').forEach(el => el.classList.add(cls));
        clearTimeout(Voix.tFlash); Voix.tFlash = setTimeout(() => lex.querySelectorAll('.lx').forEach(el => el.classList.remove('hear', 'okk', 'ko')), 1600);
      }
    },
    /* Mode Inclusion : lexique du niveau + (si la voix est activée) bouton « Parler » et écoute continue */
    monter() {
      Voix.demonter();
      const l = LV();
      if (!l || !l.inc) return;
      const side = l.xs, jug = jugOf(side), lex = document.getElementById('lex' + side);
      if (lex && LEXIQUE[jug]) lex.innerHTML = LEXIQUE[jug]();
      Voix.accueil();
      if (!SET().voix || !global.VocalEPS) return;
      const g = GRAMMAIRES[jug], box = document.getElementById('mic' + side);
      if (!g || !box) return;
      const v = VocalEPS.creer({
        grammaire: g, echo: false,
        onPartiel: t => Voix.surligner(side, t, false),
        onResultat: r => { Voix.surligner(side, r.texte, true, r); Voix.recu(side, r); },
        onIncompris: r => { banner(side, `🎤 Entendu : « ${esc(r.texte)} » : pas compris`, 'zero'); },
        onErreur: m => { Voix.continu = false; Voix.majBouton(); banner(side, '🎤 ' + esc(m), 'zero'); },
        onEtat: e => { if (e === 'repos' && Voix.continu && Voix.cur === v) { /* l'écoute continue s'est arrêtée toute seule */ Voix.continu = false; Voix.majBouton(); } }
      });
      VocalEPS.bouton(box, v, {texte: 'Parler', maintenir: true, retour: false});
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'mic-cont'; c.addEventListener('click', () => Voix.basculerContinu());
      box.appendChild(c);
      Voix.cur = v; $('#arena').classList.add('vocal');
      Voix.majBouton();
      Voix.init(true);
    },
    /* Écoute continue : le micro reste ouvert pendant tout l'assaut, chaque annonce s'ajoute l'une après l'autre */
    basculerContinu() {
      const v = Voix.cur; if (!v) return;
      if (Voix.continu) Voix.arreterEcoute();
      else { Voix.continu = true; v.options.continu = true; v.ecouter(); }
      Voix.majBouton(); Voix.accueil();
    },
    arreterEcoute() {
      const v = Voix.cur; Voix.continu = false;
      if (v) { v.options.continu = false; try { v.arreter(); } catch (e) { /* */ } }
      Voix.majBouton();
    },
    majBouton() {
      const c = document.querySelector('.mic-cont'); if (!c) return;
      c.classList.toggle('on', Voix.continu);
      c.textContent = Voix.continu ? '⏹ Arrêter l\'écoute continue' : '🎧 Écoute continue';
      const p = document.querySelector('.mic .veps-btn'); if (p) p.style.display = Voix.continu ? 'none' : '';
    },
    demonter() {
      Voix.arreterEcoute();
      Voix.cur = null; clearTimeout(Voix.tFlash);
      ['R', 'B'].forEach(s => { const b = document.getElementById('mic' + s); if (b) b.innerHTML = ''; const x = document.getElementById('lex' + s); if (x) x.innerHTML = ''; });
      const a = document.getElementById('arena'); if (a) a.classList.remove('vocal');
    },
    /* Résultat vocal -> la MÊME fonction que le geste : saisirTouche() */
    recu(side, r) {
      const l = LV(); if (!l || !l.inc || !blindOn()) return;     // rien n'est enregistré si le résultat est affiché
      if (!r.valide) { banner(side, `🎤 Entendu : « ${esc(r.texte)} » : incomplet${r.manquants && r.manquants.length ? ' (il manque : ' + r.manquants.join(', ') + ')' : ''}, rien enregistré`, 'zero'); return; }
      const jug = jugOf(side), v = r.valeurs, t = {};
      if (jug === 'debutant') t.arme = 'poing';
      else { const c = VERS_COUP[v.coup]; if (!c) return; t.arme = c.arme; t.courbe = c.courbe; if (jug === 'complet') t.h = VERS_H[v.hauteur]; }
      saisirTouche(side, t);
    }
  };
  global.Voix = Voix;
})(window);
