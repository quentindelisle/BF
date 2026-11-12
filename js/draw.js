/* Observ'BF — dessins (combattants cibles, gant, chaussure) à partir des illustrations du dossier img/ */
(function (global) {
  'use strict';

  const ZL = {tete:'Tête (visage)', tronc:'Tronc (épaules / torse)', ventre:'Ventre', flancs:'Flancs', epaule:'Épaule', bras:'Bras', avantbras:'Avant-bras / gant', jambes:'Jambes', cuisse:'Cuisse', tibia:'Tibia / pied'};
  const FIG_W = 720, FIG_H = 1010;

  /* Combattant de face, en garde. sexe : 'G' garçon · 'F' fille · 'N' non genré — corner : 'R' (gants rouges) ou 'B' (gants bleus).
     Chaque zone est un <g class="part"> avec ses calques base / heat / hl (couleur selon le nombre de touches, survol). */
  const SPLIT = new Set(['tete', 'ventre', 'flancs', 'jambes']);   // zones coupées en deux : moitié gauche (g) et droite (d) de l'écran
  let clipN = 0;
  const bboxX = dd => { const n = (dd.match(/-?\d+(?:\.\d+)?/g) || []).map(Number); let x0 = 1e9, x1 = -1e9; for (let i = 0; i < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); } return [x0, x1]; };
  function fighter(opts) {
    const k = opts.sexe === 'F' ? 'F' : opts.sexe === 'N' ? 'N' : 'G', corner = opts.corner === 'R' ? 'r' : 'b';
    const fig = (global.BF_FIG || {})[k] || {zones: []};
    const vz = fig.zones.find(z => z.z === 'ventre'), axis = vz ? (bboxX(vz.d)[0] + bboxX(vz.d)[1]) / 2 : FIG_W / 2;   // axe du corps
    const id = 'bfc' + (++clipN);
    const part = (z, side, clip) => `<g class="part" data-zone="${z.z}" data-side="${side}"${clip ? ` clip-path="url(#${id}${side})"` : ''}><title>${ZL[z.z]}</title>` +
      `<g class="base"><path d="${z.d}" fill="#fff" fill-opacity="0.001"/></g>` +
      `<g class="heat"><path d="${z.d}"/></g>` +
      `<g class="hl"><path d="${z.d}" stroke-width="5" stroke-linejoin="round"/></g></g>`;
    const parts = fig.zones.map(z => SPLIT.has(z.z) && z.s === 'c' ? part(z, 'g', true) + part(z, 'd', true) : part(z, z.s, false)).join('');
    const defs = `<defs><clipPath id="${id}g"><rect x="0" y="0" width="${axis}" height="${FIG_H}"/></clipPath><clipPath id="${id}d"><rect x="${axis}" y="0" width="${FIG_W - axis}" height="${FIG_H}"/></clipPath></defs>`;
    return `<svg class="fighter" viewBox="0 0 ${FIG_W} ${FIG_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cibles sur le boxeur">${defs}` +
      `<image href="img/fig-${k.toLowerCase()}-${corner}.webp" x="0" y="0" width="${FIG_W}" height="${FIG_H}"/>${parts}</svg>`;
  }

  /* Gant et chaussure : corner = 'R' ou 'B', mirror = retourné (coin bleu, à droite de l'écran) */
  function icon(file, w, h, corner, mirror) {
    const c = corner === 'R' ? 'r' : 'b';
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g${mirror ? ` transform="matrix(-1 0 0 1 ${w} 0)"` : ''}>` +
      `<image href="img/${file}-${c}.webp" x="0" y="0" width="${w}" height="${h}"/></g></svg>`;
  }
  const glove = (corner, mirror) => icon('glove', 340, 451, corner, mirror);
  const shoe = (corner, mirror) => icon('shoe', 420, 310, corner, mirror);

  global.BFDraw = {fighter, glove, shoe, ZL, SPLIT};
})(window);
