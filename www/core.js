/* Periodik – cœur du jeu (données + logique pure, sans DOM).
   Utilisé par l'application (navigateur) et par les tests (Node). */
(function (root) {
  'use strict';

  /* ---------- Données : Z, symbole, nom (FR), masse atomique ---------- */
  const RAW = [
    [1, 'H', 'Hydrogène', 1.008], [2, 'He', 'Hélium', 4.0026], [3, 'Li', 'Lithium', 6.94],
    [4, 'Be', 'Béryllium', 9.0122], [5, 'B', 'Bore', 10.81], [6, 'C', 'Carbone', 12.011],
    [7, 'N', 'Azote', 14.007], [8, 'O', 'Oxygène', 15.999], [9, 'F', 'Fluor', 18.998],
    [10, 'Ne', 'Néon', 20.18], [11, 'Na', 'Sodium', 22.99], [12, 'Mg', 'Magnésium', 24.305],
    [13, 'Al', 'Aluminium', 26.982], [14, 'Si', 'Silicium', 28.085], [15, 'P', 'Phosphore', 30.974],
    [16, 'S', 'Soufre', 32.06], [17, 'Cl', 'Chlore', 35.45], [18, 'Ar', 'Argon', 39.948],
    [19, 'K', 'Potassium', 39.098], [20, 'Ca', 'Calcium', 40.078], [21, 'Sc', 'Scandium', 44.956],
    [22, 'Ti', 'Titane', 47.867], [23, 'V', 'Vanadium', 50.942], [24, 'Cr', 'Chrome', 51.996],
    [25, 'Mn', 'Manganèse', 54.938], [26, 'Fe', 'Fer', 55.845], [27, 'Co', 'Cobalt', 58.933],
    [28, 'Ni', 'Nickel', 58.693], [29, 'Cu', 'Cuivre', 63.546], [30, 'Zn', 'Zinc', 65.38],
    [31, 'Ga', 'Gallium', 69.723], [32, 'Ge', 'Germanium', 72.63], [33, 'As', 'Arsenic', 74.922],
    [34, 'Se', 'Sélénium', 78.971], [35, 'Br', 'Brome', 79.904], [36, 'Kr', 'Krypton', 83.798],
    [37, 'Rb', 'Rubidium', 85.468], [38, 'Sr', 'Strontium', 87.62], [39, 'Y', 'Yttrium', 88.906],
    [40, 'Zr', 'Zirconium', 91.224], [41, 'Nb', 'Niobium', 92.906], [42, 'Mo', 'Molybdène', 95.95],
    [43, 'Tc', 'Technétium', 98], [44, 'Ru', 'Ruthénium', 101.07], [45, 'Rh', 'Rhodium', 102.91],
    [46, 'Pd', 'Palladium', 106.42], [47, 'Ag', 'Argent', 107.87], [48, 'Cd', 'Cadmium', 112.41],
    [49, 'In', 'Indium', 114.82], [50, 'Sn', 'Étain', 118.71], [51, 'Sb', 'Antimoine', 121.76],
    [52, 'Te', 'Tellure', 127.6], [53, 'I', 'Iode', 126.9], [54, 'Xe', 'Xénon', 131.29],
    [55, 'Cs', 'Césium', 132.91], [56, 'Ba', 'Baryum', 137.33], [57, 'La', 'Lanthane', 138.91],
    [58, 'Ce', 'Cérium', 140.12], [59, 'Pr', 'Praséodyme', 140.91], [60, 'Nd', 'Néodyme', 144.24],
    [61, 'Pm', 'Prométhium', 145], [62, 'Sm', 'Samarium', 150.36], [63, 'Eu', 'Europium', 151.96],
    [64, 'Gd', 'Gadolinium', 157.25], [65, 'Tb', 'Terbium', 158.93], [66, 'Dy', 'Dysprosium', 162.5],
    [67, 'Ho', 'Holmium', 164.93], [68, 'Er', 'Erbium', 167.26], [69, 'Tm', 'Thulium', 168.93],
    [70, 'Yb', 'Ytterbium', 173.05], [71, 'Lu', 'Lutécium', 174.97], [72, 'Hf', 'Hafnium', 178.49],
    [73, 'Ta', 'Tantale', 180.95], [74, 'W', 'Tungstène', 183.84], [75, 'Re', 'Rhénium', 186.21],
    [76, 'Os', 'Osmium', 190.23], [77, 'Ir', 'Iridium', 192.22], [78, 'Pt', 'Platine', 195.08],
    [79, 'Au', 'Or', 196.97], [80, 'Hg', 'Mercure', 200.59], [81, 'Tl', 'Thallium', 204.38],
    [82, 'Pb', 'Plomb', 207.2], [83, 'Bi', 'Bismuth', 208.98], [84, 'Po', 'Polonium', 209],
    [85, 'At', 'Astate', 210], [86, 'Rn', 'Radon', 222], [87, 'Fr', 'Francium', 223],
    [88, 'Ra', 'Radium', 226], [89, 'Ac', 'Actinium', 227], [90, 'Th', 'Thorium', 232.04],
    [91, 'Pa', 'Protactinium', 231.04], [92, 'U', 'Uranium', 238.03], [93, 'Np', 'Neptunium', 237],
    [94, 'Pu', 'Plutonium', 244], [95, 'Am', 'Américium', 243], [96, 'Cm', 'Curium', 247],
    [97, 'Bk', 'Berkélium', 247], [98, 'Cf', 'Californium', 251], [99, 'Es', 'Einsteinium', 252],
    [100, 'Fm', 'Fermium', 257], [101, 'Md', 'Mendélévium', 258], [102, 'No', 'Nobélium', 259],
    [103, 'Lr', 'Lawrencium', 266], [104, 'Rf', 'Rutherfordium', 267], [105, 'Db', 'Dubnium', 268],
    [106, 'Sg', 'Seaborgium', 269], [107, 'Bh', 'Bohrium', 270], [108, 'Hs', 'Hassium', 277],
    [109, 'Mt', 'Meitnérium', 278], [110, 'Ds', 'Darmstadtium', 281], [111, 'Rg', 'Roentgenium', 282],
    [112, 'Cn', 'Copernicium', 285], [113, 'Nh', 'Nihonium', 286], [114, 'Fl', 'Flérovium', 289],
    [115, 'Mc', 'Moscovium', 290], [116, 'Lv', 'Livermorium', 293], [117, 'Ts', 'Tennesse', 294],
    [118, 'Og', 'Oganesson', 294]
  ];

  const ALT_NAMES = { 117: ['tennessine'], 14: ['silicium'], 55: ['cesium', 'caesium'], 51: ['stibium'] };

  const CATS = {
    alcalin:    { name: 'Métaux alcalins',      color: '#ef4444' },
    alcalino:   { name: 'Alcalino-terreux',     color: '#f97316' },
    transition: { name: 'Métaux de transition', color: '#eab308' },
    pauvre:     { name: 'Métaux pauvres',       color: '#84cc16' },
    metalloide: { name: 'Métalloïdes',          color: '#10b981' },
    nonmetal:   { name: 'Non-métaux',           color: '#06b6d4' },
    halogene:   { name: 'Halogènes',            color: '#3b82f6' },
    noble:      { name: 'Gaz nobles',           color: '#8b5cf6' },
    lanthanide: { name: 'Lanthanides',          color: '#ec4899' },
    actinide:   { name: 'Actinides',            color: '#a8a29e' }
  };

  function categoryOf(z) {
    if (z >= 57 && z <= 71) return 'lanthanide';
    if (z >= 89 && z <= 103) return 'actinide';
    if ([3, 11, 19, 37, 55, 87].includes(z)) return 'alcalin';
    if ([4, 12, 20, 38, 56, 88].includes(z)) return 'alcalino';
    if ([9, 17, 35, 53, 85, 117].includes(z)) return 'halogene';
    if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return 'noble';
    if ([5, 14, 32, 33, 51, 52].includes(z)) return 'metalloide';
    if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return 'nonmetal';
    if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(z)) return 'pauvre';
    return 'transition';
  }

  /* Position : p = période, g = groupe (null pour le bloc f).
     row/col = case dans la grille d'affichage (rangs 1–7, lanthanides rang 9, actinides rang 10). */
  function posOf(z) {
    let p, g;
    if (z === 1) { p = 1; g = 1; }
    else if (z === 2) { p = 1; g = 18; }
    else if (z <= 4) { p = 2; g = z - 2; }
    else if (z <= 10) { p = 2; g = z + 8; }
    else if (z <= 12) { p = 3; g = z - 10; }
    else if (z <= 18) { p = 3; g = z; }
    else if (z <= 36) { p = 4; g = z - 18; }
    else if (z <= 54) { p = 5; g = z - 36; }
    else if (z <= 56) { p = 6; g = z - 54; }
    else if (z <= 71) { return { p: 6, g: null, row: 9, col: 3 + (z - 57) }; }
    else if (z <= 86) { p = 6; g = z - 68; }
    else if (z <= 88) { p = 7; g = z - 86; }
    else if (z <= 103) { return { p: 7, g: null, row: 10, col: 3 + (z - 89) }; }
    else { p = 7; g = z - 100; }
    return { p, g, row: p, col: g };
  }

  function valenceOf(z) {
    const g = posOf(z).g;
    if (g === null) return null;
    if (z === 2) return 2;
    if (g <= 2) return g;
    if (g >= 13) return g - 10;
    return null;
  }

  const ELEMENTS = [null];
  RAW.forEach(function (r) {
    const z = r[0], pos = posOf(z);
    ELEMENTS[z] = {
      z: z, sym: r[1], name: r[2], mass: r[3], cat: categoryOf(z),
      p: pos.p, g: pos.g, row: pos.row, col: pos.col,
      valence: valenceOf(z), alt: ALT_NAMES[z] || []
    };
  });
  const ALL_Z = ELEMENTS.slice(1).map(function (e) { return e.z; });

  /* ---------- Aléatoire déterministe ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pickWeighted(rng, arr, wfn) {
    let total = 0;
    const ws = arr.map(function (x) { const w = Math.max(0.0001, wfn(x)); total += w; return w; });
    let r = rng() * total;
    for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }

  function norm(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /* ---------- Questions ---------- */
  const TYPES = ['name', 'symbol', 'protons', 'shells', 'valence', 'place', 'posname', 'category'];

  function eligible(z, type) {
    if (type === 'valence') return ELEMENTS[z].valence !== null;
    if (type === 'posname') return ELEMENTS[z].g !== null;
    return true;
  }

  function distractors(rng, z, n, poolZ, labelOf, needG) {
    const el = ELEMENTS[z];
    const seen = {}; seen[labelOf(z)] = true;
    function ok(c) {
      if (c === z) return false;
      if (needG && ELEMENTS[c].g === null) return false;
      return !seen[labelOf(c)];
    }
    const base = poolZ.filter(function (c) { return c !== z; });
    const same = shuffle(rng, base.filter(function (c) { return ELEMENTS[c].cat === el.cat; }));
    const other = shuffle(rng, base.filter(function (c) { return ELEMENTS[c].cat !== el.cat; }));
    const fill = shuffle(rng, ALL_Z);
    const out = [];
    [same.slice(0, 2), other, same.slice(2), fill].forEach(function (list) {
      list.forEach(function (c) {
        if (out.length < n && ok(c)) { seen[labelOf(c)] = true; out.push(c); }
      });
    });
    return out;
  }

  function numOptions(rng, correct, min, max, n) {
    const set = [correct];
    const near = shuffle(rng, [-3, -2, -1, 1, 2, 3].map(function (d) { return correct + d; })
      .filter(function (v) { return v >= min && v <= max; }));
    near.forEach(function (v) { if (set.length < n) set.push(v); });
    for (let v = min; v <= max && set.length < n; v++) if (!set.includes(v)) set.push(v);
    return shuffle(rng, set).map(function (v) { return { label: String(v), value: v }; });
  }

  function makeQuestion(rng, z, type, o) {
    o = o || {};
    const el = ELEMENTS[z];
    const poolZ = (o.pool && o.pool.length >= 6) ? o.pool : ALL_Z;
    const q = { type: type, z: z, kind: 'choice', big: '', prompt: '', options: [], correct: z, reveal: '' };
    function zOpts(labelOf, needG) {
      const d = distractors(rng, z, 3, poolZ, labelOf, needG);
      return shuffle(rng, [z].concat(d)).map(function (c) { return { label: labelOf(c), value: c }; });
    }
    switch (type) {
      case 'name':
        if (rng() < 0.3) { q.prompt = 'Quel élément a le numéro atomique ' + z + ' ?'; q.big = String(z); }
        else { q.prompt = 'Quel est le nom de cet élément ?'; q.big = el.sym; }
        q.reveal = el.sym + ' = ' + el.name + ' (n°' + z + ')';
        if (o.typed) { q.kind = 'typed'; q.accept = [el.name].concat(el.alt); }
        else q.options = zOpts(function (c) { return ELEMENTS[c].name; });
        break;
      case 'symbol':
        q.prompt = 'Quel est le symbole de cet élément ?'; q.big = el.name;
        q.reveal = el.name + ' = ' + el.sym;
        if (o.typed) { q.kind = 'typed'; q.accept = [el.sym]; }
        else q.options = zOpts(function (c) { return ELEMENTS[c].sym; });
        break;
      case 'protons':
        q.prompt = 'Combien de protons (donc d’électrons) pour un atome neutre de ' + el.name + ' ?';
        q.big = el.sym; q.correct = z; q.options = numOptions(rng, z, 1, 118, 4);
        q.reveal = el.name + ' : ' + z + ' protons et ' + z + ' électrons';
        break;
      case 'shells':
        q.prompt = 'Combien de couches électroniques possède ' + el.name + ' ?';
        q.big = el.sym; q.correct = el.p; q.options = numOptions(rng, el.p, 1, 7, 4);
        q.reveal = el.name + ' est en période ' + el.p + ' : ' + el.p + ' couches';
        break;
      case 'valence':
        q.prompt = 'Combien d’électrons sur la couche externe (valence) pour ' + el.name + ' ?';
        q.big = el.sym; q.correct = el.valence; q.options = numOptions(rng, el.valence, 1, 8, 4);
        q.reveal = el.name + ' (groupe ' + el.g + ') : ' + el.valence + ' électron' + (el.valence > 1 ? 's' : '') + ' de valence';
        break;
      case 'place':
        q.kind = 'place'; q.prompt = 'Touche la case de cet élément dans le tableau'; q.big = el.name;
        q.sub = el.sym + ' · n°' + z; q.correct = z;
        q.reveal = el.name + ' : période ' + el.p + (el.g ? ', groupe ' + el.g : ', ' + CATS[el.cat].name.toLowerCase());
        break;
      case 'posname':
        q.prompt = 'Quel élément se trouve ici ?';
        q.big = 'P' + el.p + ' · G' + el.g; q.sub = 'période ' + el.p + ', groupe ' + el.g;
        q.options = zOpts(function (c) { return ELEMENTS[c].name; }, true);
        q.reveal = 'Période ' + el.p + ', groupe ' + el.g + ' = ' + el.name + ' (' + el.sym + ')';
        break;
      case 'category':
        q.prompt = 'À quelle famille appartient ' + el.name + ' ?'; q.big = el.sym; q.correct = el.cat;
        q.options = shuffle(rng, [el.cat].concat(shuffle(rng, Object.keys(CATS).filter(function (k) { return k !== el.cat; })).slice(0, 3)))
          .map(function (k) { return { label: CATS[k].name, value: k, color: CATS[k].color }; });
        q.reveal = el.name + ' : ' + CATS[el.cat].name;
        break;
      default: throw new Error('type inconnu ' + type);
    }
    return q;
  }

  function nextQuestion(rng, o) {
    const pool = o.pool;
    const wfn = o.weight || function () { return 1; };
    let z, type, tries = 0;
    do {
      z = pickWeighted(rng, pool, wfn);
      const okTypes = o.types.filter(function (t) { return eligible(z, t); });
      type = okTypes.length ? okTypes[Math.floor(rng() * okTypes.length)] : 'name';
      tries++;
    } while (z === o.avoid && pool.length > 1 && tries < 12);
    return makeQuestion(rng, z, type, o);
  }

  function checkAnswer(q, given) {
    if (q.kind === 'typed') {
      const g = norm(given);
      return g.length > 0 && q.accept.some(function (a) { return norm(a) === g; });
    }
    return given === q.correct;
  }

  /* ---------- Score, combo, rangs ---------- */
  function multOf(streak) { return Math.min(4, 1 + Math.floor(streak / 3) * 0.5); }
  function points(streak, ms) {
    const bonus = ms < 2000 ? 5 : ms < 4000 ? 2 : 0;
    return Math.round((10 + bonus) * multOf(streak));
  }

  const RANKS = [
    { id: 'noob',    name: 'Noob',    min: 0,    color: '#7c8a99' },
    { id: 'bronze',  name: 'Bronze',  min: 100,  color: '#cd7f32' },
    { id: 'argent',  name: 'Argent',  min: 250,  color: '#dfe6ee' },
    { id: 'or',      name: 'Or',      min: 450,  color: '#ffd700' },
    { id: 'pro',     name: 'Pro',     min: 700,  color: '#22c55e' },
    { id: 'expert',  name: 'Expert',  min: 1000, color: '#2f6bff' },
    { id: 'celeste', name: 'Céleste', min: 1400, color: '#4fe3ff' },
    { id: 'divin',   name: 'Divin',   min: 1900, color: '#e052ff' },
    { id: 'error',   name: 'Error',   min: 2500, color: '#ff1744' }
  ];
  function rankIndex(rp) {
    let idx = 0;
    RANKS.forEach(function (r, i) { if (rp >= r.min) idx = i; });
    return idx;
  }
  function rankTarget(idx) { return 60 + idx * 35; }          // points par minute attendus
  function rpDelta(score, seconds, idx) {
    const spm = score / (seconds / 60), t = rankTarget(idx);
    return Math.max(-25, Math.min(40, Math.round((spm - t) / t * 40)));
  }
  function rankPoolMax(idx) { return [18, 36, 36, 54, 54, 86, 86, 118, 118][idx]; }
  function applyRp(rp, delta) { return Math.max(0, rp + delta); }

  /* ---------- Mémoire (répétition espacée simple, boîtes 0–5) ---------- */
  function masteryWeight(box) { return Math.pow(6 - (box || 0), 2); }
  function updateBox(box, ok) { box = box || 0; return ok ? Math.min(5, box + 1) : Math.max(0, box - 2); }

  /* ---------- Niveaux du mode Apprendre ---------- */
  function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
  const LEVELS = [
    { name: 'Premiers pas',            els: range(1, 10) },
    { name: 'Le sel et l’air',     els: range(11, 18) },
    { name: 'Les métaux du quotidien', els: range(19, 30) },
    { name: 'Le 4e rang, suite',       els: range(31, 36) },
    { name: 'Argent et compagnie',     els: range(37, 48) },
    { name: 'Étain, iode, xénon',      els: range(49, 54) },
    { name: 'Le 6e rang',              els: [55, 56].concat(range(72, 80)) },
    { name: 'Les lourds',              els: range(81, 88) },
    { name: 'Lanthanides',             els: range(57, 71) },
    { name: 'Actinides',               els: range(89, 103) },
    { name: 'Super-lourds',            els: range(104, 118) },
    { name: 'Maître du tableau',       els: ALL_Z.slice(), master: true }
  ];
  function typesForLevel(i) {
    if (i <= 1) return ['name', 'symbol', 'protons', 'category'];
    if (i <= 3) return ['name', 'symbol', 'protons', 'category', 'place', 'shells'];
    return TYPES.slice();
  }
  function levelPool(i) {
    const out = [];
    for (let k = 0; k <= i; k++) LEVELS[k].els.forEach(function (z) { if (!out.includes(z)) out.push(z); });
    return out;
  }
  function starsFor(mistakes) { return mistakes === 0 ? 3 : mistakes === 1 ? 2 : mistakes === 2 ? 1 : 0; }

  /* ---------- Skins ---------- */
  const SKINS = [
    { id: 'classic', name: 'Labo', unlock: 0, bg1: '#0f0e24', bg2: '#1b1840', accent: '#ffb020', tile: '#1b1840', radius: 8,  glow: 0,  font: 'sans',  mono: false },
    { id: 'neon',    name: 'Néon',      unlock: 1, bg1: '#12001f', bg2: '#2a0047', accent: '#ff2bd6', tile: '#2a0047', radius: 6,  glow: 10, font: 'mono',  mono: false },
    { id: 'ocean',   name: 'Océan',     unlock: 2, bg1: '#021b2b', bg2: '#064663', accent: '#22d3ee', tile: '#064663', radius: 14, glow: 4,  font: 'sans',  mono: false },
    { id: 'royal',   name: 'Or royal',  unlock: 3, bg1: '#1a1204', bg2: '#3b2a08', accent: '#ffd700', tile: '#3b2a08', radius: 4,  glow: 6,  font: 'serif', mono: true },
    { id: 'matrix',  name: 'Matrix',    unlock: 4, bg1: '#000000', bg2: '#03150a', accent: '#22ff66', tile: '#052a14', radius: 0,  glow: 6,  font: 'mono',  mono: true },
    { id: 'plasma',  name: 'Plasma',    unlock: 5, bg1: '#0a0f2e', bg2: '#1b2a7a', accent: '#5b8cff', tile: '#1b2a7a', radius: 50, glow: 12, font: 'sans',  mono: false },
    { id: 'aurore',  name: 'Aurore',    unlock: 6, bg1: '#02121a', bg2: '#0c3a4a', accent: '#4fe3ff', tile: '#0c3a4a', radius: 18, glow: 14, font: 'sans',  mono: false },
    { id: 'divin',   name: 'Divinité',  unlock: 7, bg1: '#1a0626', bg2: '#46105e', accent: '#e052ff', tile: '#46105e', radius: 12, glow: 18, font: 'serif', mono: true },
    { id: 'error',   name: 'Glitch',    unlock: 8, bg1: '#1a0000', bg2: '#3a0008', accent: '#ff1744', tile: '#3a0008', radius: 2,  glow: 12, font: 'mono',  mono: true, glitch: true }
  ];

  const P = {
    ELEMENTS: ELEMENTS, ALL_Z: ALL_Z, CATS: CATS, TYPES: TYPES, RANKS: RANKS, LEVELS: LEVELS, SKINS: SKINS,
    posOf: posOf, categoryOf: categoryOf, valenceOf: valenceOf,
    mulberry32: mulberry32, hashStr: hashStr, shuffle: shuffle, pickWeighted: pickWeighted, norm: norm,
    makeQuestion: makeQuestion, nextQuestion: nextQuestion, checkAnswer: checkAnswer, eligible: eligible,
    multOf: multOf, points: points, rankIndex: rankIndex, rankTarget: rankTarget, rpDelta: rpDelta,
    rankPoolMax: rankPoolMax, applyRp: applyRp, masteryWeight: masteryWeight, updateBox: updateBox,
    typesForLevel: typesForLevel, levelPool: levelPool, starsFor: starsFor, range: range
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = P;
  else root.Periodik = P;
})(typeof window !== 'undefined' ? window : globalThis);
