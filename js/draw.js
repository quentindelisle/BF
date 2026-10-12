/* Observ'BF — dessins SVG (combattant cible, gant, chaussure) */
(function (global) {
  'use strict';

  const SKIN = '#F3C9A3', SKIN_SH = '#E2A97F', HAIR = '#6B3E26', PANTS = '#1B2D6B', PANTS_SH = '#14214F',
        SHIRT = '#FFFFFF', SHIRT_SH = '#E4ECF7', SHOE = '#1B1F2E', OUT = '#13285A';

  const ZL = {tete:'Tête (visage)', tronc:'Tronc', epaule:'Épaule', bras:'Bras', avantbras:'Avant-bras / gant', cuisse:'Cuisse', tibia:'Tibia / pied'};

  // Une zone = dessin de base + calque de surbrillance (mêmes formes)
  function zone(z, side, shapes, mirror) {
    const tr = mirror ? ' transform="matrix(-1 0 0 1 240 0)"' : '';
    return `<g class="part" data-zone="${z}" data-side="${side}"${tr}><title>${ZL[z]}</title>` +
      `<g class="base">${shapes}</g><g class="hl">${shapes}</g></g>`;
  }

  function fighter(opts) {
    const girl = opts.sexe === 'F';
    const C = opts.color, CD = opts.dark;
    const o = `stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;

    // ---- Jambes (côté gauche de l'écran, l'autre est en miroir)
    const hipX = girl ? 82 : 86;
    const cuisse =
      `<path d="M${hipX} 212 L120 214 L114 302 L84 300 Q${hipX - 5} 258 ${hipX} 212 Z" fill="${PANTS}" ${o}/>` +
      `<path d="M104 222 L116 222 L112 298 L100 298 Z" fill="${PANTS_SH}" opacity=".55"/>` +
      `<path d="M${hipX + 3} 220 Q${hipX - 2} 258 87 296" fill="none" stroke="#fff" stroke-width="3.2"/>`;
    const tibia =
      `<path d="M84 300 L114 302 L110 386 L86 386 Z" fill="${PANTS}" ${o}/>` +
      `<path d="M101 306 L112 306 L108 384 L99 384 Z" fill="${PANTS_SH}" opacity=".55"/>` +
      `<path d="M87 304 L89 384" fill="none" stroke="#fff" stroke-width="3.2"/>` +
      `<path d="M86 382 L112 382 Q116 396 111 405 L68 407 Q60 405 64 396 Q70 389 84 386 Z" fill="${SHOE}" ${o}/>` +
      `<path d="M64 402 L111 401" stroke="#fff" stroke-width="2.4" opacity=".75"/>` +
      `<path d="M90 388 L98 386 M88 393 L97 391" stroke="#fff" stroke-width="1.6" opacity=".7"/>`;

    // ---- Tronc
    const torso = girl
      ? `M98 96 Q120 104 142 96 L156 104 Q162 110 160 122 L151 168 Q147 188 156 210 Q120 216 84 210 Q93 188 89 168 L80 122 Q78 110 84 104 Z`
      : `M96 96 Q120 104 144 96 L160 104 Q166 110 164 122 L156 210 Q120 216 84 210 L76 122 Q74 110 80 104 Z`;
    const tronc =
      `<rect x="110" y="84" width="20" height="20" rx="6" fill="${SKIN}" ${o}/>` +
      `<path d="${torso}" fill="${SHIRT}" ${o}/>` +
      `<path d="M138 112 Q150 160 146 206 Q152 206 155 205 Q${girl ? '150 186 152 168' : '160 160 160 122'} L156 106 Z" fill="${SHIRT_SH}"/>` +
      `<path d="M104 99 Q120 116 136 99" fill="none" stroke="${C}" stroke-width="4.5"/>` +
      `<path d="M${girl ? '86 126 L93 204' : '82 126 L88 204'}" stroke="${C}" stroke-width="5"/>` +
      `<path d="M${girl ? '154 126 L147 204' : '158 126 L152 204'}" stroke="${C}" stroke-width="5"/>` +
      `<path d="M84 206 Q120 213 156 206 L156 217 Q120 223 84 217 Z" fill="${PANTS}" ${o}/>` +
      `<circle cx="120" cy="140" r="9" fill="none" stroke="${C}" stroke-width="2.4" opacity=".55"/>`;

    // ---- Bras (gauche, en garde haute ouverte)
    const sx = girl ? 4 : 0; // épaules un peu plus étroites
    const epaule =
      `<ellipse cx="${82 + sx}" cy="114" rx="15" ry="14" fill="${SHIRT}" ${o}/>` +
      `<path d="M${71 + sx} 108 Q${82 + sx} 101 ${94 + sx} 106" fill="none" stroke="${C}" stroke-width="3.5"/>`;
    const bras =
      `<path d="M${68 + sx} 116 L${94 + sx} 124 L74 188 L50 180 Z" fill="${SKIN}" ${o}/>` +
      `<path d="M${68 + sx} 116 L${94 + sx} 124 L88 146 L62 138 Z" fill="${SHIRT}" ${o}/>` +
      `<path d="M62 138 L88 146" stroke="${C}" stroke-width="4"/>` +
      `<circle cx="62" cy="184" r="12" fill="${SKIN}" ${o}/>`;
    const avantbras =
      `<path d="M50 186 L73 186 L57 128 L35 128 Z" fill="${SKIN}" ${o}/>` +
      `<path d="M62 178 L70 180 L55 134 L49 134 Z" fill="${SKIN_SH}" opacity=".6"/>` +
      `<path d="M30 118 L62 118 L60 134 L32 134 Z" fill="#fff" ${o}/>` +
      `<path d="M31 126 L61 126" stroke="${C}" stroke-width="3"/>` +
      `<path d="M24 100 Q22 74 46 72 Q70 72 70 98 L68 116 Q64 124 46 124 Q28 124 26 114 Z" fill="${C}" ${o}/>` +
      `<path d="M66 96 Q78 98 76 112 Q72 120 64 116" fill="${C}" ${o}/>` +
      `<path d="M30 88 Q34 78 46 77" fill="none" stroke="#fff" stroke-width="4" opacity=".45"/>` +
      `<path d="M30 104 Q46 110 64 104" fill="none" stroke="${CD}" stroke-width="2.4" opacity=".7"/>`;

    // ---- Tête avec casque
    const tail = girl
      ? `<path d="M144 50 Q174 58 170 100 Q166 124 152 134 Q158 104 146 82 Z" fill="${HAIR}" ${o}/>` +
        `<path d="M150 60 Q164 76 158 110" fill="none" stroke="#8A5536" stroke-width="2"/>` +
        `<rect x="140" y="50" width="10" height="12" rx="4" fill="${C}" ${o}/>`
      : '';
    const lashes = girl
      ? `<path d="M108 60 L106 57 M111 59 L110 56 M132 60 L134 57 M129 59 L130 56" stroke="${OUT}" stroke-width="1.4"/>`
      : `<path d="M108 57 L117 56 M123 56 L132 57" stroke="${HAIR}" stroke-width="2.4"/>`;
    const tete = tail +
      `<path d="M120 20 C147 20 157 41 155 66 C154 83 147 93 137 97 L103 97 C93 93 86 83 85 66 C83 41 93 20 120 20 Z" fill="${C}" ${o}/>` +
      `<path d="M98 32 Q120 20 142 32" fill="none" stroke="#fff" stroke-width="4" opacity=".35"/>` +
      `<path d="M95 44 Q120 36 145 44" fill="none" stroke="${CD}" stroke-width="2.4" opacity=".6"/>` +
      `<ellipse cx="120" cy="68" rx="19" ry="22" fill="${SKIN}" ${o}/>` +
      (girl ? `<path d="M103 58 Q110 48 120 50 Q130 48 137 58 Q130 54 120 55 Q110 54 103 58 Z" fill="${HAIR}"/>` : `<path d="M104 54 Q120 46 136 54 Q120 51 104 54 Z" fill="${HAIR}"/>`) +
      lashes +
      `<ellipse cx="112.5" cy="65" rx="2.4" ry="2.8" fill="${OUT}"/><ellipse cx="127.5" cy="65" rx="2.4" ry="2.8" fill="${OUT}"/>` +
      `<path d="M120 68 Q118 74 121 75" fill="none" stroke="${SKIN_SH}" stroke-width="1.8"/>` +
      `<path d="M113 80 Q120 84 127 80" fill="none" stroke="${OUT}" stroke-width="2"/>` +
      (girl ? `<circle cx="108" cy="75" r="3.2" fill="#F29C9C" opacity=".55"/><circle cx="132" cy="75" r="3.2" fill="#F29C9C" opacity=".55"/>` : '');

    return `<svg class="fighter" viewBox="0 0 240 420" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cibles">` +
      `<ellipse cx="120" cy="406" rx="86" ry="10" fill="${OUT}" opacity=".12"/>` +
      zone('cuisse','g',cuisse) + zone('cuisse','d',cuisse,true) +
      zone('tibia','g',tibia) + zone('tibia','d',tibia,true) +
      zone('tronc','c',tronc) +
      zone('bras','g',bras) + zone('bras','d',bras,true) +
      zone('epaule','g',epaule) + zone('epaule','d',epaule,true) +
      zone('avantbras','g',avantbras) + zone('avantbras','d',avantbras,true) +
      zone('tete','c',tete) +
      `</svg>`;
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
