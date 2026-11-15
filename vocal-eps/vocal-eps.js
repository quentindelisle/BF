/*!
 * VocalEPS 2.0 — module de saisie vocale HORS LIGNE pour les applis N'EPS
 * by Quentin Delisle
 *
 * L'élève annonce son observation (« fouetté haut », « smash long droit ») et
 * l'appli reçoit des valeurs propres : { coup: "fouetté", hauteur: "haut" }.
 *
 * Moteur par défaut : Vosk (reconnaissance vocale qui tourne DANS le navigateur).
 *   → aucun son ne quitte l'appareil, fonctionne sans Internet après le 1er chargement.
 * Moteur optionnel : 'navigateur' (Web Speech API, en ligne, envoie l'audio à Google/Apple).
 *
 * Arborescence attendue (par rapport à ce fichier) :
 *   vocal-eps.js
 *   lib/vosk.js
 *   modeles/vosk-model-small-fr-pguyot-0.3.tar.gz
 *
 * Utilisation minimale :
 *   const voix = VocalEPS.creer({
 *     grammaire: VocalEPS.grammaires.boxeFrancaise,
 *     onResultat: r => console.log(r.valeurs)
 *   });
 *   VocalEPS.bouton(document.querySelector('#zone-micro'), voix);
 */
(function (global) {
  'use strict';

  // Dossier où se trouve vocal-eps.js (pour trouver lib/ et modeles/)
  const BASE = (function () {
    try {
      const s = document.currentScript && document.currentScript.src;
      if (s) return s.replace(/[^/]*$/, '');
    } catch (e) { /* */ }
    return '';
  })();

  // ---------------------------------------------------------------------------
  // Outils texte
  // ---------------------------------------------------------------------------
  function normaliser(txt) {
    return String(txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, ' ')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }
  // Les mots courts doivent être exacts (sinon « lob » ≈ « long », « bas » ≈ « pas »)
  function tolerance(mot) { return mot.length <= 4 ? 0 : (mot.length <= 7 ? 1 : 2); }

  // ---------------------------------------------------------------------------
  // Grammaires
  //   valeurs : { "Valeur officielle": [ce que l'élève peut dire / ce que le moteur peut entendre] }
  //   Écrire les variantes AVEC les accents : elles servent aussi de vocabulaire au moteur hors ligne.
  //   Le modèle français ne connaît pas « smash », « lob » ni « médian » : on liste des mots
  //   qui sonnent pareil (« lobe », « médiane », « ça mâche »…).
  // ---------------------------------------------------------------------------
  const grammaires = {
    boxeFrancaise: {
      nom: 'Boxe française',
      champs: [
        {
          cle: 'coup', libelle: 'Coup', obligatoire: true,
          valeurs: {
            'fouetté': ['fouetté', 'fouetter', 'fouettée', 'fouet', 'fouettez', 'fouettes'],
            'chassé': ['chassé', 'chasser', 'chasse', 'chassés', 'chassez'],
            'crochet': ['crochet', 'crochets'],
            'direct': ['direct', 'directe', 'directs']
          }
        },
        {
          cle: 'hauteur', libelle: 'Hauteur', obligatoire: false,
          valeurs: {
            'haut': ['haut', 'haute', 'en haut', 'tête', 'figure'],
            'médian': ['médian', 'médiane', 'milieu', 'au milieu', 'corps'],
            'bas': ['bas', 'basse', 'en bas', 'jambe']
          }
        }
      ]
    },

    badminton: {
      nom: 'Badminton',
      champs: [
        {
          cle: 'coup', libelle: 'Coup', obligatoire: true,
          valeurs: {
            'dégagé': ['dégagé', 'dégager', 'dégage', 'dégagée', 'dégagez'],
            'lob': ['lob', 'lobe', 'lobes'],
            'smash': ['smash', 'smatch', 'ça mâche', 's mâche', 'mâche', 'match'],
            'amorti': ['amorti', 'amortie', 'amortir', 'amortis']
          }
        },
        {
          cle: 'longueur', libelle: 'Longueur', obligatoire: false,
          valeurs: {
            'court': ['court', 'courte', 'cours', 'filet'],
            'moyen': ['moyen', 'moyenne', 'milieu', 'au milieu'],
            'long': ['long', 'longue'],
            'couloir': ['couloir', 'couloirs', 'au fond', 'fond', 'dans le couloir']
          }
        },
        {
          cle: 'cote', libelle: 'Côté', obligatoire: false,
          valeurs: {
            'droit': ['droit', 'droite', 'à droite'],
            'gauche': ['gauche', 'à gauche']
          }
        }
      ]
    }
  };

  // Mots à donner au moteur hors ligne (vocabulaire restreint = bien meilleure précision)
  function vocabulaire(grammaire) {
    const mots = new Set();
    grammaire.champs.forEach(c => Object.entries(c.valeurs).forEach(([off, vars]) => {
      [off].concat(vars).forEach(v => String(v).toLowerCase().split(/\s+/).forEach(m => m && mots.add(m)));
    }));
    return Array.from(mots);
  }

  // ---------------------------------------------------------------------------
  // Analyseur : phrase entendue → valeurs structurées
  // ---------------------------------------------------------------------------
  function analyser(texte, grammaire) {
    const norm = normaliser(texte);
    const mots = norm ? norm.split(' ') : [];
    const utilises = new Set();
    const valeurs = {}, details = {};
    let score = 0;

    grammaire.champs.forEach(champ => {
      const candidats = [];
      Object.entries(champ.valeurs).forEach(([officielle, variantes]) => {
        [officielle].concat(variantes).map(normaliser).forEach(v =>
          candidats.push({ officielle, v, nb: v.split(' ').length }));
      });
      candidats.sort((a, b) => b.nb - a.nb);   // expressions longues d'abord (« au fond »)

      let trouve = null;
      for (const c of candidats) {
        const vm = c.v.split(' ');
        for (let i = 0; i + vm.length <= mots.length; i++) {
          let ok = true, dist = 0;
          for (let k = 0; k < vm.length; k++) {
            if (utilises.has(i + k)) { ok = false; break; }
            const d = levenshtein(mots[i + k], vm[k]);
            if (d > tolerance(vm[k])) { ok = false; break; }
            dist += d;
          }
          if (ok && (!trouve || dist < trouve.dist || (dist === trouve.dist && vm.length > trouve.nb))) {
            trouve = { officielle: c.officielle, debut: i, nb: vm.length, dist, entendu: mots.slice(i, i + vm.length).join(' ') };
            if (dist === 0) break;
          }
        }
        if (trouve && trouve.dist === 0 && trouve.nb === c.nb) break;
      }
      if (trouve) {
        for (let k = 0; k < trouve.nb; k++) utilises.add(trouve.debut + k);
        valeurs[champ.cle] = trouve.officielle;
        details[champ.cle] = { entendu: trouve.entendu, exact: trouve.dist === 0 };
        score += trouve.dist === 0 ? 2 : 1;
      }
    });

    const manquants = grammaire.champs.filter(c => !(c.cle in valeurs)).map(c => c.cle);
    const r = {
      texte, valeurs, details, manquants, score,
      reconnu: Object.keys(valeurs).length > 0,
      valide: grammaire.champs.filter(c => c.obligatoire).every(c => c.cle in valeurs),
      complet: manquants.length === 0
    };
    r.libelle = grammaire.champs.map(c => valeurs[c.cle]).filter(Boolean).join(' ');
    return r;
  }

  function meilleure(alternatives, grammaire) {
    let best = null;
    alternatives.forEach((alt, rang) => {
      const r = analyser(alt.texte, grammaire);
      r.confiance = alt.confiance; r.rang = rang;
      if (!best || r.score > best.score || (r.score === best.score && rang < best.rang)) best = r;
    });
    return best;
  }

  // ---------------------------------------------------------------------------
  // Chargement du moteur hors ligne (une seule fois par page)
  // ---------------------------------------------------------------------------
  const config = {
    cheminVosk: BASE + 'lib/vosk.js',
    modele: BASE + 'modeles/vosk-model-small-fr-pguyot-0.3.tar.gz'
  };
  let promesseModele = null;

  function chargerScript(src) {
    return new Promise((ok, ko) => {
      if (global.Vosk) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = () => ok(); s.onerror = () => ko(new Error('Impossible de charger ' + src));
      document.head.appendChild(s);
    });
  }

  /** Charge le modèle vocal (≈ 46 Mo la 1re fois, puis gardé sur l'appareil). */
  function prechargerModele() {
    if (!promesseModele) {
      promesseModele = (async () => {
        if (location.protocol === 'file:') {
          throw new Error("Ouvre l'appli via un serveur (http://localhost ou https://), pas en double-cliquant sur le fichier.");
        }
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* */ }
        await chargerScript(config.cheminVosk);
        // URL absolue : sert aussi de clé de cache sur l'appareil
        const url = new URL(config.modele, location.href).href;
        return await global.Vosk.createModel(url);
      })();
      promesseModele.catch(() => { promesseModele = null; });
    }
    return promesseModele;
  }

  // ---------------------------------------------------------------------------
  // Moteur Vosk (hors ligne)
  // ---------------------------------------------------------------------------
  function moteurVosk(api, opt, emit) {
    let ctx = null, flux = null, source = null, proc = null, puits = null;
    let reco = null, recoGrammaire = null, actif = false, minuterie = null, finDemandee = false;

    function nouveauRecognizer(model) {
      if (reco) { try { reco.remove(); } catch (e) { /* */ } }
      const mots = vocabulaire(opt.grammaire).concat(['[unk]']);
      reco = new model.KaldiRecognizer(ctx.sampleRate, JSON.stringify(mots));
      recoGrammaire = opt.grammaire;
      reco.on('partialresult', m => {
        const t = m.result && m.result.partial;
        if (t && actif) { emit.partiel(t); relancerMinuterie(); }
      });
      reco.on('result', m => {
        const t = ((m.result && m.result.text) || '').replace(/\[unk\]/g, '').trim();
        if (!t) { if (finDemandee) couper(); return; }
        traiter(t);
      });
    }

    function traiter(texte) {
      const r = analyser(texte, opt.grammaire);
      r.alternatives = [texte];
      emit.resultat(r);
      if (!opt.continu || finDemandee) couper();
    }

    function relancerMinuterie() {
      clearTimeout(minuterie);
      if (!opt.continu) minuterie = setTimeout(() => api.arreter(), opt.delaiMax || 8000);
    }

    async function ecouter() {
      if (actif) return;
      finDemandee = false;
      try {
        // L'AudioContext doit être créé pendant le geste de l'utilisateur
        ctx = ctx || new (global.AudioContext || global.webkitAudioContext)();
        if (ctx.state === 'suspended') await ctx.resume();
        emit.etat('chargement');
        const [model, stream] = await Promise.all([
          prechargerModele(),
          navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
          })
        ]);
        flux = stream;
        if (finDemandee) { couper(); return; }        // relâché pendant le chargement
        if (!reco || recoGrammaire !== opt.grammaire) nouveauRecognizer(model);
        source = ctx.createMediaStreamSource(flux);
        proc = ctx.createScriptProcessor(4096, 1, 1);
        puits = ctx.createGain(); puits.gain.value = 0;   // nécessaire pour que le flux soit traité
        proc.onaudioprocess = (ev) => {
          if (!actif || api.parle) return;               // on n'écoute pas pendant que l'appli parle
          try { reco.acceptWaveform(ev.inputBuffer); } catch (e) { /* */ }
        };
        source.connect(proc); proc.connect(puits); puits.connect(ctx.destination);
        actif = true;
        emit.etat('ecoute');
        relancerMinuterie();
      } catch (e) {
        couper();
        const nom = e && e.name;
        if (nom === 'NotAllowedError') emit.erreur("Accès au micro refusé. Autorise le micro pour cette page.");
        else if (nom === 'NotFoundError') emit.erreur("Aucun micro détecté.");
        else emit.erreur('Saisie vocale impossible : ' + (e && e.message || e));
      }
    }

    function arreter() {
      if (!actif) { finDemandee = true; couper(); return; }
      // On demande au moteur de finir la phrase en cours (utile en appui maintenu)
      finDemandee = true; actif = false;
      clearTimeout(minuterie);
      try { reco.retrieveFinalResult(); } catch (e) { couper(); return; }
      setTimeout(couper, 1500);   // sécurité si aucun résultat ne revient
    }

    function couper() {
      clearTimeout(minuterie);
      actif = false;
      try { proc && (proc.onaudioprocess = null); source && source.disconnect(); proc && proc.disconnect(); puits && puits.disconnect(); } catch (e) { /* */ }
      if (flux) flux.getTracks().forEach(t => t.stop());
      flux = source = proc = puits = null;
      if (api.ecoute || api.etat === 'chargement') emit.etat('repos');
    }

    return { ecouter, arreter, disponible: !!(global.navigator && navigator.mediaDevices && (global.AudioContext || global.webkitAudioContext)) };
  }

  // ---------------------------------------------------------------------------
  // Moteur navigateur (Web Speech API — EN LIGNE, conservé en option)
  // ---------------------------------------------------------------------------
  function moteurNavigateur(api, opt, emit) {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    let rec = null, voulue = false;
    function ecouter() {
      if (!SR) return emit.erreur("Reconnaissance vocale du navigateur indisponible.");
      voulue = true;
      rec = new SR();
      rec.lang = 'fr-FR'; rec.continuous = !!opt.continu; rec.interimResults = true; rec.maxAlternatives = 5;
      rec.onstart = () => emit.etat('ecoute');
      rec.onerror = ev => { if (ev.error !== 'aborted' && ev.error !== 'no-speech') emit.erreur('Erreur : ' + ev.error); };
      rec.onend = () => { if (voulue && opt.continu) { try { rec.start(); return; } catch (e) { /* */ } } emit.etat('repos'); };
      rec.onresult = ev => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (!res.isFinal) { emit.partiel(res[0].transcript); continue; }
          const alts = []; for (let k = 0; k < res.length; k++) alts.push({ texte: res[k].transcript, confiance: res[k].confidence });
          const r = meilleure(alts, opt.grammaire); r.alternatives = alts.map(a => a.texte);
          emit.resultat(r);
        }
      };
      try { rec.start(); } catch (e) { emit.erreur(e.message); }
    }
    function arreter() { voulue = false; if (rec) try { rec.stop(); } catch (e) { /* */ } }
    return { ecouter, arreter, disponible: !!SR };
  }

  // ---------------------------------------------------------------------------
  // API publique
  // ---------------------------------------------------------------------------
  function creer(options) {
    const opt = Object.assign({
      grammaire: grammaires.boxeFrancaise,
      moteur: 'vosk',        // 'vosk' (hors ligne) ou 'navigateur' (en ligne)
      continu: false,        // true = le micro reste ouvert pour enchaîner les annonces
      echo: true,            // relit à voix haute ce qui a été compris (voix installée sur l'appareil)
      sonore: true,          // bips de retour
      delaiMax: 8000,        // en mode simple, arrêt auto après ce délai sans parole (ms)
      onResultat: null, onIncompris: null, onEtat: null, onErreur: null, onPartiel: null
    }, options || {});

    const api = {
      options: opt, ecoute: false, etat: 'repos', parle: false,
      setGrammaire(g) { opt.grammaire = g; },
      analyser: txt => analyser(txt, opt.grammaire),
      ecouter() { moteur.ecouter(); },
      arreter() { moteur.arreter(); },
      basculer() { (api.ecoute || api.etat === 'chargement') ? moteur.arreter() : moteur.ecouter(); }
    };

    const emit = {
      etat(e) { api.etat = e; api.ecoute = e === 'ecoute'; if (opt.sonore && e === 'ecoute') bip(880); opt.onEtat && opt.onEtat(e); },
      partiel(t) { opt.onPartiel && opt.onPartiel(t); },
      erreur(m) { api.etat = 'erreur'; api.ecoute = false; opt.onErreur && opt.onErreur(m); opt.onEtat && opt.onEtat('erreur'); },
      resultat(r) {
        if (r.reconnu) {
          if (opt.sonore) bip(r.valide ? 1320 : 660);
          if (opt.echo) dire(r.libelle, api);
          opt.onResultat && opt.onResultat(r);
        } else {
          if (opt.sonore) bip(330);
          opt.onIncompris && opt.onIncompris(r);
        }
      }
    };

    const moteur = opt.moteur === 'navigateur' ? moteurNavigateur(api, opt, emit) : moteurVosk(api, opt, emit);
    api.disponible = moteur.disponible;
    return api;
  }

  // ---------------------------------------------------------------------------
  // Retours sonores et vocaux (hors ligne : bips générés + voix de synthèse de l'appareil)
  // ---------------------------------------------------------------------------
  let ctxBip = null;
  function bip(freq) {
    try {
      ctxBip = ctxBip || new (global.AudioContext || global.webkitAudioContext)();
      const o = ctxBip.createOscillator(), g = ctxBip.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, ctxBip.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctxBip.currentTime + 0.15);
      o.connect(g).connect(ctxBip.destination);
      o.start(); o.stop(ctxBip.currentTime + 0.15);
    } catch (e) { /* */ }
  }
  function voixLocale() {
    try {
      const vs = global.speechSynthesis.getVoices().filter(v => /^fr/i.test(v.lang));
      return vs.find(v => v.localService) || null;   // une voix installée sur l'appareil
    } catch (e) { return null; }
  }
  try { global.speechSynthesis && global.speechSynthesis.getVoices(); } catch (e) { /* précharge la liste */ }
  function dire(texte, api) {
    try {
      if (!global.speechSynthesis || !texte) return;
      const v = voixLocale();
      if (!v) return;                                  // pas de voix locale : on ne passe pas par Internet
      const u = new SpeechSynthesisUtterance(texte);
      u.voice = v; u.lang = v.lang; u.rate = 1.05;
      if (api) { api.parle = true; u.onend = u.onerror = () => setTimeout(() => { api.parle = false; }, 250); }
      global.speechSynthesis.cancel();
      global.speechSynthesis.speak(u);
    } catch (e) { if (api) api.parle = false; }
  }

  // ---------------------------------------------------------------------------
  // Bouton micro prêt à l'emploi
  // ---------------------------------------------------------------------------
  function injecterStyle() {
    if (document.getElementById('vocal-eps-style')) return;
    const s = document.createElement('style');
    s.id = 'vocal-eps-style';
    s.textContent = `
      .veps-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;
        min-width:64px;min-height:64px;padding:.6em 1.1em;border:none;border-radius:999px;
        font:600 1.05rem system-ui,sans-serif;color:#fff;background:#1f6feb;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.2);transition:transform .1s,background .2s;
        -webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:none}
      .veps-btn:active{transform:scale(.96)}
      .veps-btn svg{width:1.6em;height:1.6em;fill:currentColor}
      .veps-btn.veps-ecoute{background:#d1242f;animation:veps-pulse 1.2s infinite}
      .veps-btn.veps-chargement{background:#9a6700}
      .veps-btn.veps-indispo{background:#888;cursor:not-allowed}
      @keyframes veps-pulse{0%{box-shadow:0 0 0 0 rgba(209,36,47,.6)}70%{box-shadow:0 0 0 16px rgba(209,36,47,0)}100%{box-shadow:0 0 0 0 rgba(209,36,47,0)}}
      .veps-retour{margin-top:.5em;font:500 1rem system-ui,sans-serif;min-height:1.4em}
      .veps-retour.ok{color:#1a7f37}.veps-retour.ko{color:#d1242f}.veps-retour.info{color:#666;font-style:italic}`;
    document.head.appendChild(s);
  }
  const ICONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';

  /**
   * options.texte     : libellé (défaut « Parler »)
   * options.retour    : affiche sous le bouton ce qui a été compris (défaut true)
   * options.maintenir : appui maintenu façon talkie-walkie (défaut false)
   */
  function bouton(conteneur, moteur, options) {
    const o = Object.assign({ texte: 'Parler', retour: true, maintenir: false }, options || {});
    injecterStyle();
    const wrap = document.createElement('div');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'veps-btn';
    b.innerHTML = ICONE + (o.texte ? '<span>' + o.texte + '</span>' : '');
    b.setAttribute('aria-label', 'Saisie vocale');
    wrap.appendChild(b);
    let zone = null;
    if (o.retour) { zone = document.createElement('div'); zone.className = 'veps-retour'; zone.setAttribute('aria-live', 'polite'); wrap.appendChild(zone); }
    conteneur.appendChild(wrap);

    if (!moteur.disponible) {
      b.classList.add('veps-indispo');
      if (zone) { zone.textContent = 'Saisie vocale indisponible sur cet appareil.'; zone.className = 'veps-retour ko'; }
      return { element: b };
    }
    const op = moteur.options;
    const chaine = (nom, fn) => { const avant = op[nom]; op[nom] = x => { fn(x); avant && avant(x); }; };
    const montrer = (t, c) => { if (zone) { zone.textContent = t; zone.className = 'veps-retour ' + c; } };
    chaine('onEtat', e => {
      b.classList.toggle('veps-ecoute', e === 'ecoute');
      b.classList.toggle('veps-chargement', e === 'chargement');
      if (e === 'chargement') montrer('Préparation du micro…', 'info');
      if (e === 'ecoute' && zone && zone.className.includes('info')) montrer('Je t\'écoute…', 'info');
    });
    chaine('onPartiel', t => montrer('« ' + t + ' »', 'info'));
    chaine('onResultat', r => montrer((r.valide ? '✔ ' : '⚠ ') + r.libelle + (r.valide ? '' : ' (incomplet)'), r.valide ? 'ok' : 'ko'));
    chaine('onIncompris', r => montrer('✖ Pas compris : « ' + r.texte + ' »', 'ko'));
    chaine('onErreur', m => montrer(m, 'ko'));

    if (o.maintenir) {
      b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* */ } moteur.ecouter(); });
      ['pointerup', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => moteur.arreter()));
      b.addEventListener('contextmenu', e => e.preventDefault());
    } else {
      b.addEventListener('click', () => moteur.basculer());
    }
    return { element: b, retour: zone };
  }

  const VocalEPS = { version: '2.0.0', creer, bouton, analyser, normaliser, vocabulaire, grammaires, config, prechargerModele, dire };
  if (typeof module !== 'undefined' && module.exports) module.exports = VocalEPS;
  global.VocalEPS = VocalEPS;
})(typeof window !== 'undefined' ? window : globalThis);
