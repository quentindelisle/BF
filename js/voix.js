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

  const Voix = {
    statut: 'off', erreur: '', GRAMMAIRES,
    notifier() { const el = document.getElementById('voixStatut'); if (el) el.innerHTML = Voix.statutHTML(); Voix.accueil(); },
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
      else m = `Mode Inclusion ${niv} · 🎤 maintiens « Parler » et dis ${ex}`;
      banner(l.xs, m, 'await voix');
    },
    statutHTML() {
      return {off: 'inactive', chargement: '⏳ chargement du modèle…', pret: '✅ modèle prêt', erreur: '⚠ ' + (Voix.erreur || 'erreur')}[Voix.statut] || '';
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
    /* Un bouton micro (appui maintenu) sur le côté observé, seulement en mode Inclusion avec la voix activée */
    monter() {
      Voix.demonter();
      const l = LV();
      if (l && l.inc) Voix.accueil();
      if (!l || !l.inc || !SET().voix || !global.VocalEPS) return;
      const side = l.xs, g = GRAMMAIRES[jugOf(side)], box = document.getElementById('mic' + side);
      if (!g || !box) return;
      const v = VocalEPS.creer({
        grammaire: g, echo: false,
        onResultat: r => Voix.recu(side, r),
        onIncompris: r => banner(side, `🎤 Entendu : « ${esc(r.texte)} » : pas compris`, 'zero'),
        onErreur: m => banner(side, '🎤 ' + esc(m), 'zero')
      });
      VocalEPS.bouton(box, v, {texte: 'Parler', maintenir: true, retour: false});
      Voix.cur = v; $('#arena').classList.add('vocal');
      Voix.init(true);
    },
    demonter() {
      if (Voix.cur) { try { Voix.cur.arreter(); } catch (e) { /* */ } Voix.cur = null; }
      ['R', 'B'].forEach(s => { const b = document.getElementById('mic' + s); if (b) b.innerHTML = ''; });
      const a = document.getElementById('arena'); if (a) a.classList.remove('vocal');
    },
    /* Résultat vocal -> la MÊME fonction que le geste : saisirTouche() */
    recu(side, r) {
      const l = LV(); if (!l || !l.inc) return;
      if (!r.valide) { banner(side, `🎤 Entendu : « ${esc(r.texte)} » : incomplet${r.manquants && r.manquants.length ? ' (il manque : ' + r.manquants.join(', ') + ')' : ''}, rien enregistré`, 'zero'); return; }
      const jug = jugOf(side), v = r.valeurs, t = {};
      if (jug === 'debutant') t.arme = 'poing';
      else { const c = VERS_COUP[v.coup]; if (!c) return; t.arme = c.arme; t.courbe = c.courbe; if (jug === 'complet') t.h = VERS_H[v.hauteur]; }
      saisirTouche(side, t);
    }
  };
  global.Voix = Voix;
})(window);
