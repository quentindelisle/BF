/* Observ'BF — dessins SVG (combattant cible, gant, chaussure) */
(function (global) {
  'use strict';

  const SKIN = '#F3C9A3', SKIN_SH = '#E2A97F', HAIR = '#6B3E26', PANTS = '#1B2D6B', PANTS_SH = '#14214F',
        SHIRT = '#FFFFFF', SHIRT_SH = '#E4ECF7', SHOE = '#1B1F2E', OUT = '#13285A';

  const ZL = {tete:'Tête (visage)', tronc:'Tronc', epaule:'Épaule', bras:'Bras', avantbras:'Avant-bras / gant', cuisse:'Cuisse', tibia:'Tibia / pied'};

  /* Boxeur en garde, vu de trois quarts, tourné vers la gauche (mirror = tourné vers la droite).
     Côté « g » = bras / jambe avant, côté « d » = bras / jambe arrière. */
  function zone(z, side, shapes) {
    return `<g class="part" data-zone="${z}" data-side="${side}"><title>${ZL[z]}${side === 'g' ? ' (avant)' : side === 'd' ? ' (arrière)' : ''}</title>` +
      `<g class="base">${shapes}</g><g class="heat">${shapes}</g><g class="hl">${shapes}</g></g>`;
  }
  function fighter(opts) {
    const girl = opts.sexe === 'F', C = opts.color, CD = opts.dark;
    const o = `stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
    const glove = (cx, cy, r) =>
      `<path d="M${cx - r} ${cy + 2} Q${cx - r} ${cy - r - 2} ${cx} ${cy - r - 2} Q${cx + r + 2} ${cy - r - 2} ${cx + r} ${cy + 2} L${cx + r - 2} ${cy + r * .55} Q${cx + r * .6} ${cy + r} ${cx} ${cy + r} Q${cx - r * .7} ${cy + r} ${cx - r + 1} ${cy + r * .5} Z" fill="${C}" ${o}/>` +
      `<path d="M${cx - r * .65} ${cy - r * .45} Q${cx - r * .3} ${cy - r * .85} ${cx + r * .15} ${cy - r * .8}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>` +
      `<path d="M${cx - r * .7} ${cy + r * .25} Q${cx} ${cy + r * .5} ${cx + r * .7} ${cy + r * .2}" fill="none" stroke="${CD}" stroke-width="2.2" opacity=".6"/>`;
    // ---- jambe arrière (derrière)
    const cuisseD = `<path d="M128 210 L160 208 L186 292 L156 300 Z" fill="${PANTS_SH}" ${o}/><path d="M156 214 L180 290" stroke="#fff" stroke-width="3" opacity=".8"/>`;
    const tibiaD = `<path d="M156 298 L186 290 L200 376 L174 380 Z" fill="${PANTS_SH}" ${o}/><path d="M184 296 L196 374" stroke="#fff" stroke-width="3" opacity=".8"/>` +
      `<path d="M172 376 L201 373 Q206 389 199 396 L158 398 Q150 394 156 386 Q163 381 172 380 Z" fill="${SHOE}" ${o}/><path d="M154 394 L200 392" stroke="#fff" stroke-width="2.2" opacity=".7"/>`;
    // ---- jambe avant
    const cuisseG = `<path d="M96 208 L130 213 L104 300 L72 293 Z" fill="${PANTS}" ${o}/><path d="M100 216 L76 290" stroke="#fff" stroke-width="3.2"/>`;
    const tibiaG = `<path d="M72 292 L104 299 L88 384 L62 380 Z" fill="${PANTS}" ${o}/><path d="M76 298 L64 378" stroke="#fff" stroke-width="3.2"/>` +
      `<path d="M62 377 L90 381 Q93 395 86 402 L36 402 Q28 397 38 390 Q50 384 62 383 Z" fill="${SHOE}" ${o}/><path d="M32 399 L86 399" stroke="#fff" stroke-width="2.2" opacity=".75"/>` +
      `<path d="M66 386 L74 385 M64 391 L73 390" stroke="#fff" stroke-width="1.6" opacity=".7"/>`;
    // ---- bras arrière (derrière le tronc pour le haut du bras)
    const brasD = `<path d="M150 106 L172 110 L182 164 L160 172 Z" fill="${SKIN_SH}" ${o}/><path d="M150 106 L172 110 L176 132 L154 132 Z" fill="${SHIRT_SH}" ${o}/>`;
    // ---- tronc de trois quarts
    const torso = girl
      ? 'M96 102 Q122 95 148 100 L155 114 Q157 126 152 140 L146 176 Q144 192 150 210 Q122 217 94 210 Q100 190 96 172 L86 130 Q84 112 96 102 Z'
      : 'M94 102 Q122 95 150 100 L157 114 Q159 126 155 140 L150 210 Q122 217 94 210 L86 130 Q84 112 94 102 Z';
    const tronc = `<rect x="114" y="86" width="22" height="20" rx="7" fill="${SKIN}" ${o}/>` +
      `<path d="${torso}" fill="${SHIRT}" ${o}/>` +
      `<path d="M132 103 Q148 103 154 118 L149 180 Q147 196 149 208 L139 210 Q142 160 132 103 Z" fill="${SHIRT_SH}"/>` +
      `<path d="M104 101 Q116 118 132 100" fill="none" stroke="${C}" stroke-width="4.5"/>` +
      `<path d="M92 130 L98 206" stroke="${C}" stroke-width="5"/><path d="M154 128 L147 206" stroke="${C}" stroke-width="4" opacity=".8"/>` +
      `<path d="M94 206 Q122 213 150 206 L151 218 Q122 225 94 218 Z" fill="${PANTS}" ${o}/>`;
    const epauleD = `<ellipse cx="158" cy="110" rx="13" ry="12" fill="${SHIRT_SH}" ${o}/><path d="M148 104 Q158 99 168 106" fill="none" stroke="${C}" stroke-width="3"/>`;
    // ---- avant-bras arrière : remonte vers le menton, gant contre la joue
    const avantbrasD = `<path d="M160 170 L182 164 L166 112 L146 118 Z" fill="${SKIN}" ${o}/><path d="M146 114 L166 108 L168 120 L148 126 Z" fill="#fff" ${o}/>` + glove(156, 92, 19);
    // ---- tête de trois quarts avec casque
    const tail = girl ? `<path d="M146 46 Q176 52 172 96 Q168 120 154 128 Q160 98 148 76 Z" fill="${HAIR}" ${o}/><rect x="142" y="46" width="10" height="12" rx="4" fill="${C}" ${o}/>` : '';
    const tete = tail +
      `<path d="M124 22 C152 22 160 44 158 66 C157 84 150 94 140 98 L106 98 C98 94 92 84 92 66 C90 42 98 22 124 22 Z" fill="${C}" ${o}/>` +
      `<path d="M104 32 Q124 22 146 34" fill="none" stroke="#fff" stroke-width="4" opacity=".35"/>` +
      `<path d="M150 50 Q156 66 150 82" fill="none" stroke="${CD}" stroke-width="3" opacity=".5"/>` +
      `<path d="M112 46 Q96 48 96 70 Q97 88 112 92 Q126 92 130 76 Q132 56 124 48 Q118 45 112 46 Z" fill="${SKIN}" ${o}/>` +
      (girl ? `<path d="M100 56 Q108 46 124 50 Q114 52 102 60 Z" fill="${HAIR}"/>` : `<path d="M100 54 Q110 47 124 50 Q112 51 100 56 Z" fill="${HAIR}"/>`) +
      (girl ? `<path d="M101 60 L99 57 M104 59 L103 56" stroke="${OUT}" stroke-width="1.3"/>` : `<path d="M100 60 L109 58 M115 58 L122 60" stroke="${HAIR}" stroke-width="2.2"/>`) +
      `<ellipse cx="105" cy="66" rx="2.3" ry="2.8" fill="${OUT}"/><ellipse cx="118" cy="66" rx="2.1" ry="2.7" fill="${OUT}"/>` +
      `<path d="M100 68 Q95 75 100 77" fill="none" stroke="${SKIN_SH}" stroke-width="2"/>` +
      `<path d="M103 83 Q110 86 117 82" fill="none" stroke="${OUT}" stroke-width="2"/>` +
      (girl ? `<circle cx="120" cy="76" r="3.2" fill="#F29C9C" opacity=".55"/>` : '');
    // ---- bras avant : coude bas, gant devant le visage
    const brasG = `<path d="M80 108 L104 116 L88 166 L64 158 Z" fill="${SKIN}" ${o}/><path d="M80 108 L104 116 L98 136 L74 128 Z" fill="${SHIRT}" ${o}/><path d="M74 128 L98 136" stroke="${C}" stroke-width="4"/>`;
    const epauleG = `<ellipse cx="92" cy="114" rx="15" ry="13" fill="${SHIRT}" ${o}/><path d="M80 108 Q92 100 104 108" fill="none" stroke="${C}" stroke-width="3.5"/>`;
    const avantbrasG = `<path d="M64 160 L88 164 L78 108 L56 110 Z" fill="${SKIN}" ${o}/><path d="M72 156 L80 158 L72 116 L66 116 Z" fill="${SKIN_SH}" opacity=".6"/>` +
      `<path d="M54 104 L80 102 L82 116 L56 118 Z" fill="#fff" ${o}/><path d="M55 110 L81 109" stroke="${C}" stroke-width="3"/>` + glove(66, 82, 22);
    const body =
      zone('cuisse', 'd', cuisseD) + zone('tibia', 'd', tibiaD) + zone('bras', 'd', `<g transform="translate(-9 2)">${brasD}</g>`) +
      zone('tronc', 'c', tronc) + zone('epaule', 'd', `<g transform="translate(-8 0)">${epauleD}</g>`) +
      zone('cuisse', 'g', cuisseG) + zone('tibia', 'g', tibiaG) +
      zone('tete', 'c', tete) + zone('avantbras', 'd', `<g transform="translate(-10 2)">${avantbrasD}</g>`) +
      zone('bras', 'g', brasG) + zone('epaule', 'g', epauleG) + zone('avantbras', 'g', avantbrasG);
    return `<svg class="fighter" viewBox="10 10 210 410" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cibles sur le boxeur">` +
      `<ellipse cx="120" cy="402" rx="96" ry="9" fill="${OUT}" opacity=".12"/>` +
      `<g${opts.mirror ? ' transform="matrix(-1 0 0 1 230 0)"' : ''}>${body}</g></svg>`;
  }

  function glove(color, dark, mirror) {
    const o = `stroke="${OUT}" stroke-width="3" stroke-linejoin="round"`;
    const g = `<g${mirror ? ' transform="matrix(-1 0 0 1 180 0)"' : ''}>` +
      `<path d="M40 76 Q14 80 16 110 Q20 136 50 132 Q62 126 56 104 Z" fill="${color}" ${o}/>` +
      `<path d="M44 52 Q46 14 92 14 Q150 14 154 62 L154 108 Q154 140 122 146 L60 146 Q34 140 32 110 Z" fill="${color}" ${o}/>` +
      `<path d="M58 40 Q78 22 104 24" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".4"/>` +
      `<path d="M64 62 Q98 48 136 62" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>` +
      `<path d="M66 96 Q78 112 72 132" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>` +
      `<path d="M138 70 Q146 100 136 132" fill="none" stroke="${dark}" stroke-width="6" stroke-linecap="round" opacity=".25"/>` +
      `<rect x="52" y="142" width="90" height="46" rx="10" fill="#fff" ${o}/>` +
      `<rect x="52" y="154" width="90" height="16" fill="${color}" opacity=".85"/>` +
      `<path d="M62 150 L132 150" stroke="${OUT}" stroke-width="1.6" stroke-dasharray="4 4" opacity=".4"/>` +
      `</g>`;
    return `<svg viewBox="0 0 180 196" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g}</svg>`;
  }

  function shoe(color, mirror) {
    const o = `stroke="${OUT}" stroke-width="3" stroke-linejoin="round"`;
    const g = `<g${mirror ? ' transform="matrix(-1 0 0 1 220 0)"' : ''}>` +
      // cheville / bas de jambe dans la chaussure
      `<path d="M52 6 L98 6 L100 44 L50 44 Z" fill="${SKIN}" ${o}/>` +
      `<path d="M50 30 L100 30 L100 44 L50 44 Z" fill="${SKIN_SH}" opacity=".6"/>` +
      // tige montante
      `<path d="M44 40 Q46 30 60 30 L94 30 Q104 30 106 42 L108 78 Q150 82 184 100 Q210 112 204 132 Q200 142 182 142 L46 142 Q30 142 30 124 Z" fill="${SHOE}" ${o}/>` +
      `<path d="M46 40 Q48 34 60 34 L94 34 Q102 34 104 42 L104 50 L46 50 Z" fill="${color}"/>` +
      `<path d="M106 54 L116 84 M100 62 L124 70 M100 74 L134 80" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>` +
      `<path d="M150 92 Q176 102 190 118" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".25"/>` +
      `<path d="M58 70 Q70 100 60 130" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>` +
      // semelle
      `<path d="M28 134 L206 132 Q206 150 188 152 L44 152 Q28 152 28 134 Z" fill="#E9EEF5" ${o}/>` +
      `</g>`;
    return `<svg viewBox="0 0 220 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g}</svg>`;
  }

  global.BFDraw = {fighter, glove, shoe, ZL};
})(window);
