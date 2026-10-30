'use strict';
const assert = require('assert');
const P = require('../www/core.js');

let n = 0;
function t(name, fn) { fn(); n++; console.log('  ok  ' + name); }

t('118 éléments, symboles et noms uniques', () => {
  assert.strictEqual(P.ALL_Z.length, 118);
  const syms = new Set(), names = new Set();
  P.ALL_Z.forEach(z => {
    const e = P.ELEMENTS[z];
    assert.strictEqual(e.z, z);
    assert.ok(/^[A-Z][a-z]?$/.test(e.sym), 'symbole ' + e.sym);
    syms.add(e.sym); names.add(e.name);
  });
  assert.strictEqual(syms.size, 118);
  assert.strictEqual(names.size, 118);
});

t('symboles connus aux bons numéros', () => {
  const known = { 1: 'H', 6: 'C', 8: 'O', 11: 'Na', 26: 'Fe', 29: 'Cu', 47: 'Ag', 50: 'Sn', 74: 'W', 79: 'Au', 80: 'Hg', 82: 'Pb', 92: 'U', 118: 'Og' };
  Object.keys(known).forEach(z => assert.strictEqual(P.ELEMENTS[z].sym, known[z]));
});

t('chaque case de la grille est occupée une seule fois', () => {
  const seen = {};
  P.ALL_Z.forEach(z => {
    const e = P.ELEMENTS[z], k = e.row + ',' + e.col;
    assert.ok(!seen[k], 'doublon en ' + k + ' (' + e.sym + ')');
    seen[k] = z;
    assert.ok(e.col >= 1 && e.col <= 18, 'colonne ' + e.sym);
  });
  assert.strictEqual(Object.keys(seen).length, 118);
});

t('positions de référence (période, groupe)', () => {
  const ref = { 1: [1, 1], 2: [1, 18], 5: [2, 13], 10: [2, 18], 13: [3, 13], 18: [3, 18], 26: [4, 8], 36: [4, 18],
    53: [5, 17], 55: [6, 1], 72: [6, 4], 86: [6, 18], 87: [7, 1], 104: [7, 4], 118: [7, 18] };
  Object.keys(ref).forEach(z => {
    const e = P.ELEMENTS[z];
    assert.deepStrictEqual([e.p, e.g], ref[z], e.sym);
  });
  assert.strictEqual(P.ELEMENTS[57].g, null);
  assert.strictEqual(P.ELEMENTS[71].row, 9);
  assert.strictEqual(P.ELEMENTS[103].row, 10);
});

t('effectifs par famille', () => {
  const c = {};
  P.ALL_Z.forEach(z => { c[P.ELEMENTS[z].cat] = (c[P.ELEMENTS[z].cat] || 0) + 1; });
  assert.deepStrictEqual(c, { nonmetal: 7, noble: 7, alcalin: 6, alcalino: 6, metalloide: 6, halogene: 6, pauvre: 12, transition: 38, lanthanide: 15, actinide: 15 });
});

t('valence', () => {
  const v = z => P.ELEMENTS[z].valence;
  assert.strictEqual(v(1), 1); assert.strictEqual(v(2), 2); assert.strictEqual(v(6), 4);
  assert.strictEqual(v(8), 6); assert.strictEqual(v(17), 7); assert.strictEqual(v(18), 8);
  assert.strictEqual(v(11), 1); assert.strictEqual(v(20), 2);
  assert.strictEqual(v(26), null); assert.strictEqual(v(60), null);
});

t('niveaux : couvrent les 118 éléments (le dernier est le niveau maître)', () => {
  const seen = new Set();
  P.LEVELS.slice(0, -1).forEach(l => l.els.forEach(z => { assert.ok(!seen.has(z), 'doublon ' + z); seen.add(z); }));
  assert.strictEqual(seen.size, 118);
  assert.strictEqual(P.LEVELS[P.LEVELS.length - 1].els.length, 118);
});

t('questions : tous types × tous éléments, une seule bonne réponse, pas de doublon', () => {
  const rng = P.mulberry32(42);
  let count = 0;
  P.ALL_Z.forEach(z => P.TYPES.forEach(type => {
    if (!P.eligible(z, type)) return;
    for (const typed of [false, true]) {
      const q = P.makeQuestion(rng, z, type, { pool: P.ALL_Z, typed });
      count++;
      assert.ok(q.prompt && q.reveal, type);
      if (q.kind === 'choice') {
        assert.strictEqual(q.options.length, 4, type + ' z=' + z + ' ' + q.options.map(o => o.label));
        const labels = q.options.map(o => o.label);
        assert.strictEqual(new Set(labels).size, 4, 'labels dupliqués ' + type + ' z=' + z + ' ' + labels);
        assert.strictEqual(q.options.filter(o => o.value === q.correct).length, 1, 'bonne réponse ' + type + ' z=' + z);
        q.options.forEach(o => assert.strictEqual(P.checkAnswer(q, o.value), o.value === q.correct));
      } else if (q.kind === 'typed') {
        assert.ok(P.checkAnswer(q, q.accept[0]));
        assert.ok(!P.checkAnswer(q, ''));
      } else if (q.kind === 'place') {
        assert.ok(P.checkAnswer(q, z));
        assert.ok(!P.checkAnswer(q, z === 1 ? 2 : 1));
      }
    }
  }));
  assert.ok(count > 1500, 'questions testées : ' + count);
});

t('questions sur petit pool : distracteurs complétés avec tous les éléments', () => {
  const rng = P.mulberry32(7);
  for (let i = 0; i < 200; i++) {
    const q = P.nextQuestion(rng, { pool: [1, 2, 3], types: P.TYPES, typed: false });
    if (q.kind === 'choice') assert.strictEqual(new Set(q.options.map(o => o.label)).size, 4);
  }
});

t('saisie libre : accents, majuscules, tirets ignorés', () => {
  const q = P.makeQuestion(P.mulberry32(1), 1, 'name', { typed: true });
  if (q.kind === 'typed') {
    ['hydrogene', 'HYDROGÈNE', ' hydrogène '].forEach(s => assert.ok(P.checkAnswer(q, s), s));
    assert.ok(!P.checkAnswer(q, 'helium'));
  }
  const ts = { kind: 'typed', accept: [P.ELEMENTS[117].name].concat(P.ELEMENTS[117].alt) };
  assert.ok(P.checkAnswer(ts, 'Tennessine') && P.checkAnswer(ts, 'tennesse'));
  const sym = { kind: 'typed', accept: ['Fe'] };
  assert.ok(P.checkAnswer(sym, 'fe') && P.checkAnswer(sym, 'FE') && !P.checkAnswer(sym, 'f'));
});

t('aléatoire déterministe (défi du jour identique pour tous)', () => {
  const seq = seed => { const r = P.mulberry32(P.hashStr(seed)); return Array.from({ length: 10 }, () => P.nextQuestion(r, { pool: P.ALL_Z, types: P.TYPES }).z); };
  assert.deepStrictEqual(seq('2026-10-24'), seq('2026-10-24'));
  assert.notDeepStrictEqual(seq('2026-10-24'), seq('2026-10-25'));
});

t('pas deux fois le même élément de suite quand on évite', () => {
  const rng = P.mulberry32(3); let avoid = 0;
  for (let i = 0; i < 300; i++) {
    const q = P.nextQuestion(rng, { pool: [1, 2, 3, 4], types: ['name'], avoid });
    assert.notStrictEqual(q.z, avoid); avoid = q.z;
  }
});

t('combo et points', () => {
  assert.strictEqual(P.multOf(0), 1); assert.strictEqual(P.multOf(3), 1.5);
  assert.strictEqual(P.multOf(6), 2); assert.strictEqual(P.multOf(99), 4);
  assert.strictEqual(P.points(1, 5000), 10); assert.strictEqual(P.points(1, 1000), 15);
  assert.strictEqual(P.points(6, 1000), 30);
});

t('rangs : seuils, couleurs uniques, montée et relégation', () => {
  assert.strictEqual(P.RANKS.length, 9);
  assert.strictEqual(new Set(P.RANKS.map(r => r.color)).size, 9);
  assert.deepStrictEqual(P.RANKS.map(r => r.name), ['Noob', 'Bronze', 'Argent', 'Or', 'Pro', 'Expert', 'Céleste', 'Divin', 'Error']);
  assert.strictEqual(P.rankIndex(0), 0); assert.strictEqual(P.rankIndex(99), 0);
  assert.strictEqual(P.rankIndex(100), 1); assert.strictEqual(P.rankIndex(5000), 8);
  let rp = 120; assert.strictEqual(P.rankIndex(rp), 1);
  rp = P.applyRp(rp, P.rpDelta(10, 120, 1));            // très mauvaise partie : relégation
  assert.ok(P.rpDelta(10, 120, 1) < 0 && P.rankIndex(rp) === 0);
  assert.strictEqual(P.applyRp(5, -25), 0);              // jamais sous 0
  assert.ok(P.rpDelta(400, 120, 0) > 0);                 // grosse partie : promotion
  assert.ok(P.rpDelta(1e6, 120, 0) <= 40 && P.rpDelta(0, 120, 8) >= -25);
});

t('mémoire : montée/descente des boîtes et poids de révision', () => {
  assert.strictEqual(P.updateBox(0, true), 1); assert.strictEqual(P.updateBox(5, true), 5);
  assert.strictEqual(P.updateBox(3, false), 1); assert.strictEqual(P.updateBox(0, false), 0);
  assert.ok(P.masteryWeight(0) > P.masteryWeight(5));
});

t('skins : un par rang, déblocage croissant', () => {
  assert.strictEqual(P.SKINS.length, 9);
  P.SKINS.forEach((s, i) => assert.strictEqual(s.unlock, i));
});

console.log('\n' + n + ' groupes de tests réussis');
