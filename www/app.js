/* Periodik – interface et boucle de jeu (JavaScript natif, aucune dépendance) */
(function () {
  'use strict';
  const P = window.Periodik, E = P.ELEMENTS, CATS = P.CATS, RANKS = P.RANKS, LV = P.LEVELS;
  const $ = (s, r) => (r || document).querySelector(s);
  const VERSION = '1.1.0';

  /* ================= Helpers DOM ================= */
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(x => add(el, x));
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function fill(el) {
    el.replaceChildren();
    for (let i = 1; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText = v;
        else Object.keys(v).forEach(p => el.style.setProperty(p, v[p]));
      } else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }

  /* ================= Sauvegarde ================= */
  const KEY = 'periodik_v1';
  const DEF = () => ({
    name: 'Joueur', photo: null, rp: 0, best: 0, xp: 0, lv: {}, m: {}, hs: {}, streak: 0, last: '', daily: {},
    skin: 'classic', cs: [], prefs: { sound: true, vibrate: true, typed: false },
    st: { games: 0, ok: 0, ko: 0, combo: 0, ranked: 0 }
  });
  function merge(a, b) {
    Object.keys(b).forEach(k => {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
      else a[k] = b[k];
    });
    return a;
  }
  function load() {
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && typeof r === 'object') return merge(DEF(), r); } catch (e) { /* ignore */ }
    return DEF();
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Impossible de sauvegarder (stockage plein ?)'); }
  }

  /* ================= Utilitaires ================= */
  const pad = n => (n < 10 ? '0' : '') + n;
  function dayStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  const today = () => dayStr(new Date());
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }
  function touchStreak() {
    const t = today();
    if (S.last === t) return;
    S.streak = S.last === yesterday() ? S.streak + 1 : 1;
    S.last = t;
  }
  function streakNow() { return (S.last === today() || S.last === yesterday()) ? S.streak : 0; }
  const plv = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
  const fmt = s => Math.floor(s / 60) + ':' + pad(Math.floor(s % 60));
  const rankIdx = () => P.rankIndex(S.rp);
  const mastered = () => P.ALL_Z.filter(z => (S.m[z] || 0) >= 4).length;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ================= Sons, vibrations, confettis ================= */
  let actx;
  function beep(f, d, type, vol) {
    if (!S.prefs.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(vol || 0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* audio indisponible */ }
  }
  function vib(p) { if (S.prefs.vibrate && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } }
  const fx = {
    ok() { beep(660, 0.09); setTimeout(() => beep(990, 0.12), 80); vib(15); },
    bad() { beep(140, 0.28, 'sawtooth', 0.06); vib([40, 30, 40]); },
    tick() { beep(900, 0.04, 'square', 0.03); },
    go() { beep(1200, 0.25); },
    drum() { beep(90, 0.18, 'triangle', 0.12); vib(30); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18), i * 120)); vib([60, 40, 120]); }
  };
  function confetti(n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('#fx'), ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const ps = Array.from({ length: n || 150 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 3,
      s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: 'hsl(' + Math.random() * 360 + ' 90% 60%)'
    }));
    let f = 0;
    (function step() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (++f < 160) requestAnimationFrame(step); else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }
  function countUp(el, to, ms) {
    const t0 = performance.now(), d = ms || 900;
    (function f(t) {
      const k = Math.min(1, (t - t0) / d);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ================= Skins ================= */
  const FONTS = {
    sans: '"Hanken Grotesk",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
    mono: 'ui-monospace,Menlo,Consolas,monospace',
    serif: 'Georgia,"Times New Roman",serif'
  };
  const allSkins = () => P.SKINS.concat(S.cs);
  const curSkin = () => allSkins().find(s => s.id === S.skin) || P.SKINS[0];
  function applySkin() {
    const sk = curSkin(), r = document.documentElement.style;
    r.setProperty('--bg1', sk.bg1); r.setProperty('--bg2', sk.bg2); r.setProperty('--accent', sk.accent);
    r.setProperty('--tile', sk.tile); r.setProperty('--radius', sk.radius >= 50 ? '50%' : sk.radius + 'px');
    r.setProperty('--glow', sk.glow + 'px'); r.setProperty('--font', FONTS[sk.font] || FONTS.sans);
    document.body.classList.toggle('mono-tiles', !!sk.mono);
    document.body.classList.toggle('glitch', !!sk.glitch);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', sk.bg1);
  }
  const skinUnlocked = sk => !('unlock' in sk) || S.best >= sk.unlock;
  const HEX = /^#[0-9a-f]{6}$/i;
  function cleanSkin(o) {
    if (!o || typeof o !== 'object') return null;
    const col = (v, d) => (typeof v === 'string' && HEX.test(v) ? v : d);
    const num = (v, a, b, d) => (isFinite(+v) ? Math.max(a, Math.min(b, Math.round(+v))) : d);
    return {
      id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 99), name: String(o.name || 'Mon skin').slice(0, 16),
      bg1: col(o.bg1, '#0f172a'), bg2: col(o.bg2, '#1e293b'), accent: col(o.accent, '#38bdf8'), tile: col(o.tile, '#1e293b'),
      radius: num(o.radius, 0, 50, 8), glow: num(o.glow, 0, 24, 0), font: FONTS[o.font] ? o.font : 'sans', mono: !!o.mono
    };
  }

  /* ================= Composants ================= */
  function avatar(cls, ri) {
    const r = RANKS[ri === undefined ? rankIdx() : ri];
    return h('div', { class: 'ava ' + (cls || ''), style: Object.assign({ '--c': r.color }, S.photo ? { 'background-image': 'url(' + S.photo + ')' } : {}) },
      S.photo ? null : (S.name || '?').trim().charAt(0).toUpperCase() || '?');
  }
  function badge(ri) {
    const r = RANKS[ri];
    return h('span', { class: 'badge' + (r.id === 'error' ? ' err' : ''), style: { '--c': r.color } }, r.name);
  }
  function buildTable(o) {
    o = o || {};
    const t = h('div', { class: 'pt' + (o.big ? ' big' : '') + (o.cls ? ' ' + o.cls : '') });
    t.cells = {};
    for (let g = 1; g <= 18; g++) t.append(h('div', { class: 'ax', style: { 'grid-row': '1', 'grid-column': String(g + 1) } }, g));
    for (let p = 1; p <= 7; p++) t.append(h('div', { class: 'ax', style: { 'grid-row': String(p + 1), 'grid-column': '1' } }, p));
    t.append(h('div', { class: 'ax', style: { 'grid-row': '10', 'grid-column': '1' } }, '*'));
    t.append(h('div', { class: 'ax', style: { 'grid-row': '11', 'grid-column': '1' } }, '**'));
    t.append(h('div', { class: 'mk', style: { 'grid-row': '7', 'grid-column': '4' } }, '*'));
    t.append(h('div', { class: 'mk', style: { 'grid-row': '8', 'grid-column': '4' } }, '**'));
    P.ALL_Z.forEach(z => {
      const e = E[z], info = o.cell ? o.cell(z) : {};
      const c = h('div', {
        class: 'cell' + (info.cls ? ' ' + info.cls : '') + (o.hide ? ' hide' : ''),
        style: { 'grid-row': String(e.row + 1), 'grid-column': String(e.col + 1), '--cat': info.color || CATS[e.cat].color },
        title: o.hide ? null : e.name, role: 'button', 'aria-label': o.hide ? ('case ' + e.row + ',' + e.col) : e.name,
        onclick: () => { if (o.onPick) o.onPick(z); }
      }, h('span', { class: 'z' }, z), h('span', { class: 's' }, e.sym));
      t.cells[z] = c; t.append(c);
    });
    return t;
  }

  function showCard(z) {
    const e = E[z], m = $('#modal');
    const close = () => m.replaceChildren();
    const mass = Number.isInteger(e.mass) ? '[' + e.mass + ']' : e.mass.toLocaleString('fr-FR');
    const row = (a, b) => [h('dt', null, a), h('dd', null, b)];
    m.replaceChildren(h('div', { class: 'overlay', onclick: close },
      h('div', { class: 'ecard', onclick: ev => ev.stopPropagation() },
        h('div', { class: 'top' },
          h('div', { class: 'cell xl', style: { '--cat': CATS[e.cat].color } }, h('span', { class: 'z' }, z), h('span', { class: 's' }, e.sym)),
          h('div', null, h('h2', null, e.name), h('div', { class: 'muted' }, CATS[e.cat].name))),
        h('dl', null,
          row('Numéro atomique', z), row('Masse atomique', mass),
          row('Période', e.p + ' (' + e.p + ' couche' + (e.p > 1 ? 's' : '') + ')'),
          row('Groupe', e.g ? e.g : 'bloc f'),
          row('Protons / électrons', z + ' / ' + z),
          row('Neutrons (≈ masse − Z)', Math.round(e.mass) - z),
          row('Électrons de valence', e.valence === null ? 'variable' : e.valence),
          row('Maîtrise', '★'.repeat(S.m[z] || 0) + '☆'.repeat(5 - (S.m[z] || 0)))),
        h('button', { class: 'btn primary big-btn', onclick: close }, 'Fermer'))));
  }

  /* ================= Dialogues (remplacent confirm / prompt, qui ne marchent pas partout) ================= */
  function dialog(o) {
    return new Promise(resolve => {
      const m = $('#modal'), cancelVal = o.input ? null : false;
      const done = v => { document.removeEventListener('keydown', onKey); m.replaceChildren(); resolve(v); };
      const onKey = e => { if (e.key === 'Escape') done(cancelVal); };
      let field = null;
      if (o.input) {
        field = document.createElement(o.input === 'area' ? 'textarea' : 'input');
        field.className = 'txt'; if (o.input === 'area') field.rows = 4;
        field.value = o.value || ''; field.readOnly = !!o.readonly;
        field.setAttribute('aria-label', o.title);
      }
      document.addEventListener('keydown', onKey);
      m.replaceChildren(h('div', { class: 'overlay', onclick: () => done(cancelVal) },
        h('div', { class: 'ecard dlg', role: 'dialog', 'aria-modal': 'true', onclick: ev => ev.stopPropagation() },
          h('h2', null, o.title), o.text ? h('div', { class: 'muted' }, o.text) : null, field ? h('div', { class: 'gap-s' }, field) : null,
          h('div', { class: 'row gap wrap-r' },
            o.cancel === false ? null : h('button', { class: 'btn grow', onclick: () => done(cancelVal) }, o.cancel || 'Annuler'),
            h('button', { class: 'btn primary grow' + (o.danger ? ' danger' : ''), onclick: () => done(field && !o.readonly ? field.value : true) }, o.ok || 'OK')))));
      if (field) setTimeout(() => { field.focus(); if (o.readonly) field.select(); }, 30);
    });
  }

  /* ================= Routeur ================= */
  const app = $('#app');
  let cleanup = null, guard = null;
  const screens = {};
  function render(name, arg) {
    if (cleanup) { cleanup(); cleanup = null; }
    $('#modal').replaceChildren();
    app.replaceChildren(); window.scrollTo(0, 0);
    (screens[name] || screens.home)(arg);
  }
  function go(name, arg) {
    if (guard) {
      const g = guard;
      g().then(ok => { if (ok && guard === g) { guard = null; history.pushState({ n: name }, ''); render(name, arg); } });
      return;
    }
    history.pushState({ n: name }, '');
    render(name, arg);
  }
  window.addEventListener('popstate', e => {
    const target = (e.state && e.state.n) || 'home';
    if (guard) {
      const g = guard; history.pushState({ n: 'x' }, '');
      g().then(ok => { if (ok && guard === g) { guard = null; render(target); } });
      return;
    }
    render(target);
  });
  const backBtn = (to, label) => h('button', { class: 'back', onclick: () => go(to || 'home') }, '‹ ' + (label || 'Menu'));

  /* ================= Moteur de session ================= */
  function countdown(done) {
    const ov = h('div', { class: 'cd' }); document.body.append(ov);
    let n = 3, dead = false;
    const prev = cleanup;
    cleanup = () => { dead = true; ov.remove(); if (prev) prev(); };
    (function step() {
      if (dead) return;
      if (n === 0) { ov.textContent = 'GO !'; fx.go(); setTimeout(() => { ov.remove(); if (!dead) done(); }, 450); return; }
      ov.textContent = n; ov.classList.remove('pulse'); void ov.offsetWidth; ov.classList.add('pulse'); fx.tick(); n--;
      setTimeout(step, 800);
    })();
  }

  /* cfg : rng, pool, types, typed, seconds, penalty, lives, total, scoring, weight, onEnd */
  function runSession(cfg) {
    const R = { score: 0, ok: 0, ko: 0, streak: 0, best: 0, log: [], seconds: cfg.seconds || 0 };
    let q = null, locked = true, over = false, qStart = 0, last = 0, asked = 0, lives = cfg.lives || 0;
    let pending = 0, timer = 0, deadline = 0, lastSec = 0, optNodes = [], cells = null, t0 = 0;
    const hud = {
      time: h('div', { class: 'time' }), barIn: h('div', { class: 'bar-in' }), score: h('div', { class: 'score' }, '0'),
      combo: h('div', { class: 'combo' }), lives: h('div', { class: 'lives' }), prog: h('div', { class: 'time' })
    };
    const qbox = h('div', { class: 'qbox' }), ans = h('div', { class: 'ans' }), fb = h('div', { class: 'fb' });
    const mid = cfg.seconds ? h('div', { class: 'mid' }, hud.time, h('div', { class: 'bar' }, hud.barIn)) : h('div', { class: 'mid' }, hud.prog);
    const right = cfg.scoring ? hud.score : hud.lives;
    app.append(h('div', { class: 'wrap session' },
      h('div', { class: 'hud' }, h('button', { class: 'back', onclick: () => go('home') }, '✕'), mid, right),
      cfg.lives && cfg.scoring ? hud.lives : null, hud.combo, qbox, ans, fb));

    const drawLives = () => {
      hud.lives.replaceChildren(...Array.from({ length: cfg.lives || 0 }, (_, i) => h('span', { class: i < lives ? '' : 'off' }, '♥')));
    };
    if (cfg.lives) drawLives();

    function stop() { over = true; clearInterval(timer); clearTimeout(pending); document.removeEventListener('keydown', onKey); }
    cleanup = stop;
    guard = () => dialog({ title: 'Quitter la partie ?', text: 'Ta progression sur cette partie sera perdue.', ok: 'Quitter', cancel: 'Continuer', danger: true });

    function finish(reason) {
      if (over) return;
      stop(); guard = null; cleanup = null; $('#modal').replaceChildren();
      R.reason = reason; R.time = (performance.now() - t0) / 1000; R.lives = lives;
      save(); cfg.onEnd(R);
    }
    function nextQ() {
      if (over) return;
      if (cfg.total && asked >= cfg.total) return finish('done');
      asked++;
      q = P.nextQuestion(cfg.rng, { pool: cfg.pool, types: cfg.types, typed: cfg.typed, weight: cfg.weight, avoid: last });
      last = q.z;
      if (cfg.total) hud.prog.textContent = 'Question ' + asked + ' / ' + cfg.total;
      renderQ(); qStart = performance.now(); locked = false;
    }
    function renderQ() {
      fill(qbox, h('div', { class: 'prompt' }, q.prompt),
        h('div', { class: 'big' + (q.big.length > 8 ? ' long' : '') }, q.big), q.sub ? h('div', { class: 'sub' }, q.sub) : null);
      ans.replaceChildren(); fb.textContent = ''; optNodes = []; cells = null;
      if (q.kind === 'choice') {
        q.options.forEach((o, i) => {
          const b = h('button', { class: 'opt', style: o.color ? { '--oc': o.color } : null, onclick: () => answer(o.value, b) },
            h('span', { class: 'k' }, i + 1), o.label);
          optNodes.push({ o, b }); ans.append(b);
        });
      } else if (q.kind === 'place') {
        const t = buildTable({ hide: true, onPick: z => answer(z, cells[z]) });
        cells = t.cells; ans.append(t, h('div', { class: 'tip rot' }, 'Astuce : tourne ton téléphone pour un tableau plus grand.'));
      } else {
        const inp = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Écris ta réponse…', 'aria-label': 'Ta réponse' });
        const f = h('form', { class: 'typed', onsubmit: ev => { ev.preventDefault(); if (inp.value.trim()) answer(inp.value, inp); } },
          inp, h('button', { class: 'btn primary', type: 'submit' }, 'OK'));
        ans.append(f); setTimeout(() => { if (!over) inp.focus(); }, 30);
      }
    }
    function popup(txt, neg) {
      const p = h('div', { class: 'pop' + (neg ? ' neg' : '') }, txt);
      (cfg.scoring ? hud.score : hud.lives).append(p); setTimeout(() => p.remove(), 850);
    }
    function answer(given, node) {
      if (locked || over) return;
      locked = true;
      const ms = performance.now() - qStart, ok = P.checkAnswer(q, given);
      S.m[q.z] = P.updateBox(S.m[q.z], ok);
      R.log.push({ z: q.z, ok: ok, type: q.type });
      if (ok) {
        R.ok++; R.streak++; R.best = Math.max(R.best, R.streak); fx.ok();
        if (cfg.scoring) { const pts = P.points(R.streak, ms); R.score += pts; hud.score.firstChild.textContent = R.score; popup('+' + pts); }
      } else {
        R.ko++; R.streak = 0; fx.bad();
        if (cfg.lives) { lives--; drawLives(); }
        if (cfg.seconds && cfg.penalty) { deadline -= cfg.penalty * 1000; popup('−' + cfg.penalty + ' s', true); }
        fb.textContent = q.reveal;
      }
      hud.combo.textContent = cfg.scoring && R.streak >= 3 ? 'Série de ' + R.streak + ' · ×' + P.multOf(R.streak) : '';
      // retour visuel
      if (q.kind === 'choice') {
        node.classList.add(ok ? 'good' : 'bad');
        if (!ok) optNodes.forEach(n => { if (n.o.value === q.correct) n.b.classList.add('reveal'); });
      } else if (q.kind === 'place') {
        node.classList.add(ok ? 'good' : 'bad');
        if (!ok) cells[q.z].classList.add('reveal');
      } else {
        node.classList.add(ok ? 'good' : 'bad'); node.blur();
      }
      pending = setTimeout(() => {
        if (cfg.lives && lives <= 0) return finish('lives');
        nextQ();
      }, ok ? 260 : 1000);
    }
    function onKey(e) {
      if (over || locked || !q || q.kind !== 'choice' || e.target.tagName === 'INPUT') return;
      const i = parseInt(e.key, 10) - 1;
      if (i >= 0 && optNodes[i]) answer(optNodes[i].o.value, optNodes[i].b);
    }
    function tick() {
      const rem = Math.max(0, deadline - performance.now());
      hud.time.textContent = fmt(Math.ceil(rem / 1000));
      hud.barIn.style.width = (rem / (cfg.seconds * 1000) * 100) + '%';
      hud.barIn.classList.toggle('low', rem < 10000);
      if (rem <= 0) return finish('time');
      const s = Math.ceil(rem / 1000);
      if (rem < 5100 && s !== lastSec) { lastSec = s; fx.tick(); }
    }
    function begin() {
      if (over) return;
      document.addEventListener('keydown', onKey);
      t0 = performance.now();
      if (cfg.seconds) { deadline = t0 + cfg.seconds * 1000; tick(); timer = setInterval(tick, 100); }
      nextQ();
    }
    if (cfg.seconds) countdown(begin); else begin();
  }

  /* commit commun à toutes les parties */
  function commit(R, bonusXp) {
    S.st.games++; S.st.ok += R.ok; S.st.ko += R.ko; S.st.combo = Math.max(S.st.combo, R.best);
    const gain = R.ok * 5 + 20 + (bonusXp || 0), before = plv(S.xp);
    S.xp += gain; touchStreak(); save();
    if (plv(S.xp) > before) setTimeout(() => toast('Niveau joueur ' + plv(S.xp) + ' atteint !'), 700);
    return gain;
  }

  /* écran de résultats commun */
  function showResults(o) {
    const R = o.R, tot = R.ok + R.ko, acc = tot ? Math.round(R.ok / tot * 100) : 0;
    const missed = Array.from(new Set(R.log.filter(l => !l.ok).map(l => l.z)));
    const sc = h('div', { class: 'bigscore' }, '0');
    app.append(h('div', { class: 'wrap center' },
      h('h1', null, o.title), o.subtitle ? h('div', { class: 'muted' }, o.subtitle) : null,
      h('div', { class: 'gap' }, sc),
      o.record ? h('div', { class: 'record' }, 'NOUVEAU RECORD') : null,
      o.promo ? o.promo : null,
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, R.ok), 'bonnes'),
        h('div', { class: 'stat' }, h('b', null, R.ko), 'erreurs'),
        h('div', { class: 'stat' }, h('b', null, acc + '%'), 'précision'),
        h('div', { class: 'stat' }, h('b', null, R.best), 'meilleure série'),
        h('div', { class: 'stat' }, h('b', null, '+' + o.xp), 'XP')),
      missed.length ? h('div', { class: 'card gap' }, h('h3', null, 'À revoir (touche pour la fiche)'),
        h('div', { class: 'chips' }, missed.map(z => h('span', { class: 'mchip', style: { '--cat': CATS[E[z].cat].color }, onclick: () => showCard(z) },
          h('b', null, E[z].sym), E[z].name)))) : h('div', { class: 'gap muted' }, 'Aucune erreur, bravo !'),
      o.extra || null,
      h('div', { class: 'row gap wrap-r' },
        o.again ? h('button', { class: 'btn primary grow', onclick: o.again }, 'Rejouer') : null,
        o.next ? h('button', { class: 'btn primary grow', onclick: o.next.fn }, o.next.label) : null,
        h('button', { class: 'btn grow', onclick: () => go(o.back || 'home') }, o.backLabel || 'Menu'))));
    countUp(sc, o.big === undefined ? R.score : o.big);
    if (o.record || o.confetti) { setTimeout(() => { confetti(); fx.win(); }, 500); }
  }
  const shownScore = (R, extra) => R.score;

  /* ================= ACCUEIL ================= */
  screens.home = function () {
    const ri = rankIdx(), r = RANKS[ri], nx = RANKS[ri + 1];
    const pct = nx ? Math.round((S.rp - r.min) / (nx.min - r.min) * 100) : 100;
    const lvl = plv(S.xp), base = 40 * (lvl - 1) * (lvl - 1), nextXp = 40 * lvl * lvl;
    const doneToday = !!S.daily[today()];
    const tcat = ['alcalin', 'alcalino', 'transition', 'pauvre', 'metalloide', 'nonmetal', 'halogene', 'noble', 'lanthanide', 'actinide'];
    let tn = 0;
    const tile = (sym, title, sub, fn, hot) => {
      const n = ++tn;
      return h('button', { class: 'mtile' + (hot ? ' hot' : ''), style: { '--cat': CATS[tcat[(n - 1) % 10]].color }, onclick: fn },
        h('span', { class: 'num' }, n), h('span', { class: 'sym' }, sym), h('b', null, title), h('span', { class: 'sub' }, sub));
    };
    app.append(h('div', { class: 'wrap' },
      h('div', { class: 'card me', onclick: () => go('profile') },
        avatar(), h('div', { class: 'grow' },
          h('div', { class: 'row wrap-r' }, h('b', null, S.name), badge(ri), streakNow() ? h('span', { class: 'streak', title: 'jours de suite' }, streakNow() + ' j de suite') : null),
          h('div', { class: 'small muted gap-s' }, r.name + ' · ' + S.rp + ' RP' + (nx ? ' → ' + nx.name + ' à ' + nx.min : ' · rang maximum')),
          h('div', { class: 'meter gap-s', style: { '--c': r.color } }, h('i', { style: { width: pct + '%' } })),
          h('div', { class: 'small muted gap-s' }, 'Niveau joueur ' + lvl + ' · ' + (S.xp - base) + ' / ' + (nextXp - base) + ' XP'))),
      h('div', { class: 'logo gap' }, h('div', { class: 'logo-tile' }, h('i', null, '119'), h('b', null, 'Pk')),
        h('div', null, h('h1', null, 'Periodik'), h('div', { class: 'muted small' }, mastered() + ' / 118 éléments maîtrisés'))),
      h('div', { class: 'menu gap' },
        tile('Ap', 'Apprendre', LV.filter((_, i) => S.lv[i] > 0).length + ' / ' + LV.length + ' niveaux', () => go('learn')),
        tile('Dé', 'Défi chrono', 'Choisis durée et contenu', () => go('challenge')),
        tile('Rk', 'Classé', 'Monte de rang (ou descends…)', () => go('ranked'), true),
        tile('Mu', 'Multijoueur local', '2 à 4 joueurs, 1 appareil', () => go('multi')),
        tile('Jo', 'Défi du jour', doneToday ? 'Fait aujourd’hui ✓ (' + S.daily[today()] + ' pts)' : 'Le même pour tout le monde', () => go('daily'), !doneToday),
        tile('Ré', 'Révision intelligente', 'Tes éléments les plus faibles', () => go('review')),
        tile('Ta', 'Mon tableau', 'Carte de ta mémoire', () => go('table')),
        tile('Pr', 'Profil & skins', 'Photo, rangs, skins', () => go('profile')),
        tile('On', 'En ligne', 'Bientôt : classement mondial', () => go('online')),
        tile('Rg', 'Réglages', 'Son, vibration, saisie', () => go('settings')))));
  };

  /* ================= APPRENDRE ================= */
  screens.learn = function () {
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Apprendre'),
      h('div', { class: 'muted small' }, 'Étudie les fiches puis réussis le quiz (3 cœurs). Sans faute = 3 étoiles.'),
      h('div', { class: 'levels gap' }, LV.map((l, i) => {
        const st = S.lv[i] || 0, locked = i > 0 && !(S.lv[i - 1] > 0);
        return h('button', { class: 'lvl' + (locked ? ' locked' : ''), onclick: () => go('lesson', i) },
          h('div', { class: 'n' }, i + 1), h('b', null, l.name),
          h('div', { class: 'stars' }, [1, 2, 3].map(k => h('span', { class: k <= st ? '' : 'off' }, '★'))),
          h('small', null, locked ? 'Réussis le niveau ' + i + ' pour l’ouvrir' : (l.master ? 'les 118 éléments' : l.els.length + ' éléments')));
      }))));
  };

  let lessonIdx = 0;
  screens.lesson = function (i) {
    if (typeof i !== 'number') { if (typeof lessonIdx !== 'number') return go('learn'); i = lessonIdx; }
    lessonIdx = i;
    const lv = LV[i], list = lv.els; let cur = 0;
    const holder = h('div');
    const tbl = buildTable({ cell: z => ({ cls: list.includes(z) ? 'hl' : 'dim' }), onPick: z => { const k = list.indexOf(z); if (k >= 0) { cur = k; draw(); } else showCard(z); } });
    function draw() {
      const z = list[cur], e = E[z];
      Object.keys(tbl.cells).forEach(k => tbl.cells[k].classList.toggle('hl', list.includes(+k) && +k !== z));
      tbl.cells[z] && tbl.cells[z].classList.add('hl');
      holder.replaceChildren(h('div', { class: 'card gap center' },
        h('div', { class: 'row', style: { 'justify-content': 'center' } },
          h('div', { class: 'cell xl', style: { '--cat': CATS[e.cat].color } }, h('span', { class: 'z' }, z), h('span', { class: 's' }, e.sym))),
        h('h2', { class: 'gap-s' }, e.name),
        h('div', { class: 'muted' }, CATS[e.cat].name + ' · période ' + e.p + (e.g ? ' · groupe ' + e.g : ' · bloc f')),
        h('div', { class: 'small gap-s' }, z + ' protons · ' + z + ' électrons' + (e.valence !== null ? ' · ' + e.valence + ' e⁻ de valence' : '')),
        h('div', { class: 'row gap' },
          h('button', { class: 'btn', disabled: cur === 0, onclick: () => { cur--; draw(); } }, '‹'),
          h('div', { class: 'grow muted' }, (cur + 1) + ' / ' + list.length),
          h('button', { class: 'btn', disabled: cur === list.length - 1, onclick: () => { cur++; draw(); } }, '›'))));
    }
    app.append(h('div', { class: 'wrap' }, backBtn('learn', 'Niveaux'),
      h('h1', null, 'Niveau ' + (i + 1) + ' · ' + lv.name),
      tbl, lv.master ? h('div', { class: 'card gap center' }, 'Épreuve finale : 20 questions sur les 118 éléments, 3 cœurs. Prêt ?') : holder,
      h('button', { class: 'btn primary big-btn gap', onclick: () => go('quiz', i) }, lv.master ? 'Lancer l’épreuve' : 'Je suis prêt → Quiz')));
    if (!lv.master) draw();
  };

  screens.quiz = function (i) {
    if (typeof i !== 'number') return go('learn');
    const lv = LV[i], pool = P.levelPool(i), newSet = new Set(lv.els);
    runSession({
      rng: P.mulberry32(Date.now() & 0xffffffff), pool: lv.master ? P.ALL_Z : pool, types: P.typesForLevel(i), typed: false,
      lives: 3, total: lv.master ? 20 : 12, scoring: false,
      weight: z => (lv.master ? P.masteryWeight(S.m[z]) : (newSet.has(z) ? 3 : 1) * (1 + P.masteryWeight(S.m[z]) / 12)),
      onEnd: R => {
        const failed = R.reason === 'lives', stars = failed ? 0 : P.starsFor(R.ko);
        const first = !(S.lv[i] > 0) && stars > 0;
        if (stars > (S.lv[i] || 0)) S.lv[i] = stars;
        const xp = commit(R, stars * 15);
        app.replaceChildren();
        showResults({
          title: failed ? 'Plus de cœurs' : 'Niveau réussi !', subtitle: lv.name, R: R, xp: xp,
          big: stars, confetti: stars === 3,
          extra: h('div', { class: 'stars center gap', style: { 'font-size': '2.4rem' } }, [1, 2, 3].map(k => h('span', { class: k <= stars ? '' : 'off' }, '★'))),
          again: () => go('lesson', i), back: 'learn', backLabel: 'Niveaux',
          next: !failed && i + 1 < LV.length ? { label: 'Niveau suivant', fn: () => go('lesson', i + 1) } : null
        });
        if (first) toast(i + 1 < LV.length ? 'Niveau ' + (i + 2) + ' débloqué !' : 'Tu as terminé tous les niveaux !');
      }
    });
  };

  /* ================= DÉFI CHRONO ================= */
  const MODES = {
    mix: { name: 'Mix', types: P.TYPES.slice() },
    nommer: { name: 'Nommer', types: ['name', 'symbol'] },
    placer: { name: 'Placer', types: ['place', 'posname'] },
    compo: { name: 'Composants', types: ['protons', 'shells', 'valence'] },
    familles: { name: 'Familles', types: ['category'] }
  };
  const poolFor = max => P.ALL_Z.filter(z => z <= max);
  const hsKey = (mode, sec, max, typed) => mode + '|' + sec + '|' + max + (typed ? '|t' : '');

  let cfgChallenge = { mode: 'mix', sec: 120, max: 54, typed: null };
  screens.challenge = function () {
    const c = cfgChallenge; if (c.typed === null) c.typed = !!S.prefs.typed;
    const out = h('div');
    function chips(items, cur, set) {
      return h('div', { class: 'chips' }, items.map(it => h('button', { class: 'chip' + (it[0] === cur ? ' on' : ''), onclick: () => { set(it[0]); draw(); } }, it[1])));
    }
    function draw() {
      const canType = c.mode === 'nommer';
      const rec = S.hs[hsKey(c.mode, c.sec, c.max, canType && c.typed)] || 0;
      fill(out,
        h('h3', { class: 'gap' }, 'Contenu'), chips(Object.keys(MODES).map(k => [k, MODES[k].name]), c.mode, v => { c.mode = v; }),
        h('h3', { class: 'gap' }, 'Durée'), chips([[60, '1 min'], [120, '2 min'], [180, '3 min'], [300, '5 min']], c.sec, v => { c.sec = v; }),
        h('h3', { class: 'gap' }, 'Éléments'), chips([[18, '1–18'], [36, '1–36'], [54, '1–54'], [86, '1–86'], [118, '1–118']], c.max, v => { c.max = v; }),
        canType ? h('label', { class: 'switch' }, h('span', null, 'Saisie libre (tape la réponse) — plus difficile'),
          h('input', { type: 'checkbox', checked: c.typed ? true : null, onchange: ev => { c.typed = ev.target.checked; draw(); } })) : null,
        h('div', { class: 'card gap center' }, h('div', { class: 'muted small' }, 'Ton record sur ce défi'), h('div', { class: 'bigscore', style: { 'font-size': '2.6rem' } }, rec)),
        h('button', { class: 'btn primary big-btn gap', onclick: () => go('play') }, 'Lancer le défi'));
    }
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Défi chrono'),
      h('div', { class: 'muted small' }, 'Bonne réponse : 10 pts + bonus de vitesse, multipliés par ta série. Erreur : −3 secondes.'), out));
    draw();
  };
  screens.play = function () {
    const c = cfgChallenge, typed = c.mode === 'nommer' && c.typed, key = hsKey(c.mode, c.sec, c.max, typed);
    runSession({
      rng: P.mulberry32(Date.now() & 0xffffffff), pool: poolFor(c.max), types: MODES[c.mode].types, typed: typed,
      seconds: c.sec, penalty: 3, scoring: true, weight: z => 1 + P.masteryWeight(S.m[z]) / 8,
      onEnd: R => {
        const prev = S.hs[key] || 0, rec = R.score > prev && R.score > 0;
        if (rec) S.hs[key] = R.score;
        const xp = commit(R); app.replaceChildren();
        showResults({ title: 'Temps écoulé !', subtitle: MODES[c.mode].name + ' · ' + fmt(c.sec) + ' · éléments 1–' + c.max, R: R, xp: xp, record: rec,
          extra: h('div', { class: 'muted small gap' }, 'Record précédent : ' + prev), again: () => go('play'), back: 'challenge', backLabel: 'Réglages' });
      }
    });
  };

  /* ================= CLASSÉ ================= */
  screens.ranked = function () {
    const ri = rankIdx(), r = RANKS[ri], nx = RANKS[ri + 1], max = P.rankPoolMax(ri);
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Classé'),
      h('div', { class: 'card center', style: { '--c': r.color } },
        avatar('', ri), h('div', { class: 'gap-s' }, badge(ri)), h('h2', { class: 'gap-s' }, S.rp + ' RP'),
        h('div', { class: 'muted small' }, nx ? 'Prochain rang : ' + nx.name + ' à ' + nx.min + ' RP' : 'Tu es au sommet : Error.')),
      h('div', { class: 'card gap' },
        h('div', null, 'Durée : 2 minutes · questions mixtes'),
        h('div', { class: 'gap-s' }, 'Éléments 1–' + max + ' à ton rang'),
        h('div', { class: 'gap-s' }, 'Objectif : ' + P.rankTarget(ri) + ' pts/min pour ne pas reculer'),
        h('div', { class: 'gap-s muted small' }, 'En dessous de l’objectif tu perds des RP (jusqu’à −25) et tu peux être relégué. Au-dessus, tu gagnes jusqu’à +40 et tu montes.')),
      h('button', { class: 'btn primary big-btn gap', onclick: () => go('rankedplay') }, 'Lancer une partie classée')));
  };
  screens.rankedplay = function () {
    const ri = rankIdx(), max = P.rankPoolMax(ri), SEC = 120;
    runSession({
      rng: P.mulberry32(Date.now() & 0xffffffff), pool: poolFor(max), types: P.TYPES.slice(), typed: false,
      seconds: SEC, penalty: 3, scoring: true, weight: z => 1 + P.masteryWeight(S.m[z]) / 8,
      onEnd: R => {
        const d = P.rpDelta(R.score, SEC, ri), old = S.rp;
        S.rp = P.applyRp(S.rp, d); const ni = rankIdx();
        const up = ni > ri, down = ni < ri; if (ni > S.best) S.best = ni;
        S.st.ranked++;
        const xp = commit(R, up ? 50 : 0); app.replaceChildren();
        const nr = RANKS[ni];
        const promo = h('div', { class: 'promo', style: { '--c': (up || down ? nr : RANKS[ri]).color } },
          (d >= 0 ? '+' : '') + d + ' RP  (' + old + ' → ' + S.rp + ')',
          up ? h('div', null, '↑ PROMOTION : ' + nr.name + ' !') : null,
          down ? h('div', null, '↓ Relégation : ' + nr.name) : null);
        showResults({ title: up ? 'Promotion !' : down ? 'Relégation…' : 'Partie classée', subtitle: 'Objectif : ' + P.rankTarget(ri) + ' pts/min', R: R, xp: xp,
          promo: promo, confetti: up, again: () => go('rankedplay'), back: 'ranked', backLabel: 'Mon rang' });
        if (up) toast('Skin débloqué : ' + (allSkins().find(s => s.unlock === ni) || { name: nr.name }).name);
      }
    });
  };

  /* ================= DÉFI DU JOUR ================= */
  screens.daily = function () {
    const d = today(), done = S.daily[d];
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Défi du jour'),
      h('div', { class: 'card center' }, h('div', { class: 'muted' }, d),
        done !== undefined ? h('div', null, h('div', { class: 'bigscore gap-s' }, done), h('div', { class: 'muted small' }, 'Ton score du jour (le premier compte). Tu peux rejouer pour t’entraîner.'))
          : h('div', { class: 'gap-s' }, '60 secondes, mêmes questions pour tous les joueurs aujourd’hui. Reviens chaque jour pour garder ta série.')),
      h('button', { class: 'btn primary big-btn gap', onclick: () => go('dailyplay') }, done !== undefined ? 'Rejouer' : 'Jouer le défi')));
  };
  screens.dailyplay = function () {
    const d = today();
    runSession({
      rng: P.mulberry32(P.hashStr('periodik-' + d)), pool: poolFor(86), types: P.TYPES.slice(), typed: false,
      seconds: 60, penalty: 3, scoring: true,
      onEnd: R => {
        const first = S.daily[d] === undefined; if (first) S.daily[d] = R.score;
        const xp = commit(R, first ? 30 : 0); app.replaceChildren();
        showResults({ title: 'Défi du jour terminé', subtitle: d + (first ? '' : ' · entraînement'), R: R, xp: xp, confetti: first && R.score > 0,
          again: () => go('dailyplay'), back: 'home' });
      }
    });
  };

  /* ================= RÉVISION ================= */
  screens.review = function () {
    const weak = P.ALL_Z.slice().sort((a, b) => (S.m[a] || 0) - (S.m[b] || 0)).slice(0, 12);
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Révision intelligente'),
      h('div', { class: 'muted small' }, 'Le jeu te repose surtout les éléments que tu connais le moins. Répète-les jusqu’à les savoir par cœur.'),
      h('div', { class: 'card gap' }, h('h3', null, 'Tes 12 plus faibles'),
        h('div', { class: 'chips' }, weak.map(z => h('span', { class: 'mchip', style: { '--cat': CATS[E[z].cat].color }, onclick: () => showCard(z) },
          h('b', null, E[z].sym), E[z].name, h('span', { class: 'muted' }, '★'.repeat(S.m[z] || 0) || '·'))))),
      h('button', { class: 'btn primary big-btn gap', onclick: () => go('reviewplay') }, 'Réviser (15 questions)')));
  };
  screens.reviewplay = function () {
    runSession({
      rng: P.mulberry32(Date.now() & 0xffffffff), pool: P.ALL_Z, types: P.TYPES.slice(), typed: false, total: 15, scoring: false,
      weight: z => P.masteryWeight(S.m[z]),
      onEnd: R => {
        const xp = commit(R); app.replaceChildren();
        showResults({ title: 'Révision terminée', subtitle: mastered() + ' / 118 éléments maîtrisés', R: R, xp: xp, big: R.ok, confetti: R.ko === 0,
          again: () => go('reviewplay'), back: 'table', backLabel: 'Mon tableau' });
      }
    });
  };

  /* ================= MON TABLEAU ================= */
  const MCOL = ['#475569', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
  screens.table = function () {
    let view = 'm';
    const holder = h('div');
    function draw() {
      const t = view === 'm'
        ? buildTable({ big: true, cls: 'mastery', cell: z => ({ color: MCOL[S.m[z] || 0] }), onPick: showCard })
        : buildTable({ big: true, onPick: showCard });
      holder.replaceChildren(t, view === 'm'
        ? h('div', { class: 'legend' }, MCOL.map((c, i) => h('span', { style: { '--cat': c } }, h('i'), i === 0 ? 'inconnu' : i === 5 ? 'par cœur' : 'niveau ' + i)))
        : h('div', { class: 'legend' }, Object.keys(CATS).map(k => h('span', { style: { '--cat': CATS[k].color } }, h('i'), CATS[k].name)),
          h('span', { class: 'muted' }, '* lanthanides · ** actinides')));
    }
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Mon tableau'),
      h('div', { class: 'muted small' }, mastered() + ' / 118 éléments maîtrisés (niveau 4+). Touche un élément pour voir sa fiche.'),
      h('div', { class: 'chips gap-s' },
        h('button', { class: 'chip on', id: 'v1', onclick: ev => { view = 'm'; sw(ev.target); } }, 'Ma mémoire'),
        h('button', { class: 'chip', id: 'v2', onclick: ev => { view = 'c'; sw(ev.target); } }, 'Les familles')),
      h('div', { class: 'gap' }, holder),
      h('button', { class: 'btn primary big-btn gap', onclick: () => go('review') }, 'Réviser mes points faibles')));
    function sw(btn) { $('#v1').classList.remove('on'); $('#v2').classList.remove('on'); btn.classList.add('on'); draw(); }
    draw();
  };

  /* ================= MULTIJOUEUR LOCAL ================= */
  const PCOL = ['#38bdf8', '#f97316', '#22c55e', '#e052ff'];
  let MP = null;
  let cfgMulti = { n: 2, sec: 60, max: 54, mode: 'mix', susp: 10, names: [] };
  screens.multi = function () {
    const c = cfgMulti; c.names[0] = c.names[0] || S.name;
    const out = h('div');
    function chips(items, cur, set) {
      return h('div', { class: 'chips' }, items.map(it => h('button', { class: 'chip' + (it[0] === cur ? ' on' : ''), onclick: () => { set(it[0]); draw(); } }, it[1])));
    }
    function draw() {
      fill(out,
        h('h3', null, 'Joueurs'), chips([[2, '2'], [3, '3'], [4, '4']], c.n, v => { c.n = v; }),
        Array.from({ length: c.n }, (_, i) => h('div', { class: 'pl' }, h('div', { class: 'ava', style: { '--c': PCOL[i] } }, (c.names[i] || String(i + 1)).charAt(0).toUpperCase()),
          h('input', { class: 'txt', maxlength: 14, placeholder: 'Joueur ' + (i + 1), value: c.names[i] || '', oninput: ev => { c.names[i] = ev.target.value; } }))),
        h('h3', { class: 'gap' }, 'Durée de chaque manche'), chips([[60, '1 min'], [120, '2 min'], [180, '3 min'], [300, '5 min']], c.sec, v => { c.sec = v; }),
        h('h3', { class: 'gap' }, 'Contenu'), chips(Object.keys(MODES).map(k => [k, MODES[k].name]), c.mode, v => { c.mode = v; }),
        h('h3', { class: 'gap' }, 'Éléments'), chips([[18, '1–18'], [36, '1–36'], [54, '1–54'], [86, '1–86'], [118, '1–118']], c.max, v => { c.max = v; }),
        h('h3', { class: 'gap' }, 'Suspense avant le verdict'), chips([[5, '5 s'], [10, '10 s'], [15, '15 s']], c.susp, v => { c.susp = v; }),
        h('button', { class: 'btn primary big-btn gap', onclick: startMulti }, 'Commencer'));
    }
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Multijoueur local'),
      h('div', { class: 'muted small' }, 'Chacun joue sa manche chronométrée avec les mêmes questions, à tour de rôle sur cet appareil. Celui qui a le plus de bonnes réponses gagne.'), out));
    draw();
  };
  function startMulti() {
    const c = cfgMulti;
    MP = {
      seed: (Date.now() & 0xffffffff) >>> 0, sec: c.sec, max: c.max, mode: c.mode, susp: c.susp, turn: 0,
      players: Array.from({ length: c.n }, (_, i) => ({ name: (c.names[i] || '').trim() || ('Joueur ' + (i + 1)), color: PCOL[i], ok: 0, ko: 0, score: 0, done: false }))
    };
    go('mturn');
  }
  screens.mturn = function () {
    if (!MP) return go('multi');
    const p = MP.players[MP.turn];
    app.append(h('div', { class: 'wrap center' },
      h('div', { class: 'muted gap' }, 'Manche ' + (MP.turn + 1) + ' / ' + MP.players.length),
      h('div', { class: 'row gap', style: { 'justify-content': 'center' } }, h('div', { class: 'ava', style: { '--c': p.color, width: '110px', height: '110px', 'font-size': '3rem' } }, p.name.charAt(0).toUpperCase())),
      h('h1', { class: 'gap' }, 'À ' + p.name + ' de jouer !'),
      h('div', { class: 'muted' }, 'Passe l’appareil. ' + fmt(MP.sec) + ' pour répondre au maximum de questions.'),
      h('button', { class: 'btn primary big-btn gap', onclick: () => go('mplay') }, 'Je suis prêt')));
  };
  screens.mplay = function () {
    if (!MP) return go('multi');
    const p = MP.players[MP.turn];
    runSession({
      rng: P.mulberry32(MP.seed), pool: poolFor(MP.max), types: MODES[MP.mode].types, typed: false,
      seconds: MP.sec, penalty: 3, scoring: true,
      onEnd: R => {
        p.ok = R.ok; p.ko = R.ko; p.score = R.score; p.done = true; commit(R);
        MP.turn++;
        if (MP.turn < MP.players.length) go('mturn'); else go('msuspense');
      }
    });
  };
  screens.msuspense = function () {
    if (!MP) return go('multi');
    let n = MP.susp, dead = false;
    const num = h('div', { class: 'num' }, n), box = h('div', { class: 'suspense' }, h('h2', null, 'Et le gagnant est…'), num,
      h('div', { class: 'muted' }, 'Les résultats arrivent…'));
    app.append(h('div', { class: 'wrap' }, box));
    cleanup = () => { dead = true; };
    (function step() {
      if (dead) return;
      fx.drum();
      if (n <= 3) box.classList.add('fast');
      if (n === 0) return go('mpodium');
      num.textContent = n; n--; setTimeout(step, 1000);
    })();
  };
  screens.mpodium = function () {
    if (!MP) return go('multi');
    const ps = MP.players.slice().sort((a, b) => b.ok - a.ok || a.ko - b.ko || b.score - a.score);
    const top = ps[0], winners = ps.filter(p => p.ok === top.ok && p.ko === top.ko);
    const medal = ['1', '2', '3', '4'];
    const rows = ps.map((p, i) => {
      const win = winners.includes(p);
      return h('div', { class: 'prow' + (win ? ' win' : '') }, h('div', { class: 'pos' }, win ? '1' : medal[i]),
        h('div', { class: 'ava sm', style: { '--c': p.color } }, p.name.charAt(0).toUpperCase()), h('b', null, p.name),
        h('div', { class: 'sc' }, h('b', null, p.ok), ' bonnes', h('div', { class: 'small muted' }, p.ko + ' erreurs · ' + p.score + ' pts')));
    });
    app.append(h('div', { class: 'wrap center' },
      h('h1', null, winners.length > 1 ? 'Égalité parfaite !' : top.name + ' gagne !'),
      h('div', { class: 'podium' }, rows),
      h('div', { class: 'row gap wrap-r' },
        h('button', { class: 'btn primary grow', onclick: () => { MP.seed = (Date.now() & 0xffffffff) >>> 0; MP.turn = 0; MP.players.forEach(p => { p.ok = p.ko = p.score = 0; }); go('mturn'); } }, 'Revanche'),
        h('button', { class: 'btn grow', onclick: () => go('home') }, 'Menu'))));
    let k = rows.length - 1;
    (function reveal() {
      if (k < 0) { confetti(); fx.win(); return; }
      rows[k].classList.add('show'); fx.drum(); k--; setTimeout(reveal, 900);
    })();
  };

  /* ================= PROFIL, RANGS, SKINS ================= */
  const ACH = [
    ['1', 'Première partie', () => S.st.games >= 1], ['Ap', '3 niveaux terminés', () => LV.filter((_, i) => S.lv[i] > 0).length >= 3],
    ['Ma', 'Tous les niveaux', () => LV.every((_, i) => S.lv[i] > 0)], ['3★', '5 niveaux en 3 étoiles', () => LV.filter((_, i) => S.lv[i] === 3).length >= 5],
    ['x10', 'Série de 10 bonnes réponses', () => S.st.combo >= 10], ['3 j', '3 jours de suite', () => streakNow() >= 3], ['7 j', '7 jours de suite', () => streakNow() >= 7],
    ['Br', 'Rang Bronze', () => S.best >= 1], ['Or', 'Rang Or', () => S.best >= 3], ['Ex', 'Rang Expert', () => S.best >= 5],
    ['50', '50 éléments maîtrisés', () => mastered() >= 50], ['118', 'Tableau par cœur (118)', () => mastered() >= 118]
  ];
  function setPhoto(file) {
    if (!file) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const s = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
      S.photo = c.toDataURL('image/jpeg', 0.82); save(); URL.revokeObjectURL(url); render('profile');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Image illisible'); };
    img.src = url;
  }
  function skinCard(sk) {
    const ok = skinUnlocked(sk);
    return h('button', { class: 'skin' + (S.skin === sk.id ? ' on' : '') + (ok ? '' : ' locked'),
      style: { '--sbg': 'linear-gradient(160deg,' + sk.bg1 + ',' + sk.bg2 + ')', '--sa': sk.accent, '--sr': sk.radius >= 50 ? '50%' : Math.min(sk.radius, 10) + 'px' },
      onclick: () => { if (!ok) return toast('Atteins le rang ' + RANKS[sk.unlock].name + ' pour le débloquer'); S.skin = sk.id; save(); applySkin(); render('profile'); } },
    h('div', { class: 'sw' }, h('i'), h('i', { style: { opacity: 0.6 } }), h('i', { style: { opacity: 0.3 } })),
    h('b', null, sk.name), h('div', { class: 'small', style: { opacity: 0.7 } }, ok ? (S.skin === sk.id ? 'Actif' : 'Choisir') : 'Rang ' + RANKS[sk.unlock].name));
  }
  screens.profile = function () {
    const ri = rankIdx();
    const nameInp = h('input', { class: 'txt', maxlength: 16, value: S.name, onchange: ev => { S.name = ev.target.value.trim() || 'Joueur'; save(); toast('Pseudo enregistré'); } });
    const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: ev => setPhoto(ev.target.files[0]) });
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Profil'),
      h('div', { class: 'card center' }, avatar('', ri), h('div', { class: 'gap-s' }, badge(ri)),
        h('div', { class: 'row gap', style: { 'justify-content': 'center' } },
          h('button', { class: 'btn small', onclick: () => file.click() }, 'Changer la photo'),
          S.photo ? h('button', { class: 'btn small', onclick: () => { S.photo = null; save(); render('profile'); } }, 'Retirer') : null, file),
        h('div', { class: 'gap' }, nameInp),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', null, plv(S.xp)), 'niveau'), h('div', { class: 'stat' }, h('b', null, S.rp), 'RP'),
          h('div', { class: 'stat' }, h('b', null, mastered()), 'maîtrisés'), h('div', { class: 'stat' }, h('b', null, S.st.games), 'parties'))),
      h('h2', { class: 'gap' }, 'Les rangs'),
      h('div', { class: 'ladder' }, RANKS.map((r, i) => h('div', { class: 'rung' + (i === ri ? ' me' : ''), style: { '--c': r.color } },
        badge(i), h('span', { class: 'grow muted small' }, r.min + ' RP' + (i === ri ? ' · ton rang' : '')),
        h('span', { class: 'small' }, S.best >= i ? 'skin débloqué' : 'verrouillé')))),
      h('h2', { class: 'gap' }, 'Skins'),
      h('div', { class: 'muted small' }, 'Un skin se débloque à chaque rang atteint. Crée aussi le tien !'),
      h('div', { class: 'skins gap-s' }, allSkins().map(skinCard)),
      h('div', { class: 'row gap wrap-r' },
        h('button', { class: 'btn primary grow', onclick: () => go('creator') }, 'Créer un skin'),
        h('button', { class: 'btn grow', onclick: importSkin }, 'Importer un code')),
      h('h2', { class: 'gap' }, 'Succès'),
      h('div', null, ACH.map(a => h('div', { class: 'ach' + (a[2]() ? ' on' : '') }, h('span', { class: 'ic' }, a[0]), h('span', null, a[1]))))));
  };
  function importSkin() {
    dialog({ title: 'Importer un skin', text: 'Colle le code d’un skin partagé par un ami.', input: 'area', ok: 'Importer' }).then(code => {
      if (!code || !code.trim()) return;
      try {
        const sk = cleanSkin(JSON.parse(decodeURIComponent(escape(atob(code.trim())))));
        if (S.cs.length >= 8) return toast('8 skins personnalisés maximum');
        S.cs.push(sk); S.skin = sk.id; save(); applySkin(); render('profile'); toast('Skin « ' + sk.name + ' » importé');
      } catch (e) { toast('Code invalide'); }
    });
  }
  screens.creator = function () {
    const base = curSkin();
    const d = { name: 'Mon skin', bg1: base.bg1, bg2: base.bg2, accent: base.accent, tile: base.tile, radius: base.radius, glow: base.glow, font: base.font, mono: !!base.mono };
    const pv = h('div', { class: 'preview' }, h('div', { class: 'pv' }));
    function paint() {
      const el = pv; el.style.background = 'linear-gradient(160deg,' + d.bg1 + ',' + d.bg2 + ')';
      el.style.setProperty('--accent', d.accent); el.style.setProperty('--tile', d.tile);
      el.style.setProperty('--radius', d.radius >= 50 ? '50%' : d.radius + 'px'); el.style.setProperty('--glow', d.glow + 'px'); el.style.fontFamily = FONTS[d.font];
      const g = el.firstChild; g.replaceChildren();
      ['H', 'He', 'Li', 'C', 'O', 'Fe'].forEach((s, i) => {
        const cat = [3, 8, 0, 5, 5, 2][i], cols = Object.keys(CATS);
        g.append(h('div', { class: 'cell', style: { '--c': d.mono ? d.accent : CATS[cols[cat]].color, background: 'color-mix(in srgb,var(--c) 30%,' + d.tile + ')', 'border-color': 'var(--c)' } }, h('span', { class: 's' }, s)));
      });
    }
    const inp = (k, label, type, extra) => h('label', null, label, h('input', Object.assign({ type: type, value: d[k], oninput: ev => { d[k] = type === 'range' ? +ev.target.value : ev.target.value; paint(); } }, extra || {})));
    app.append(h('div', { class: 'wrap' }, backBtn('profile', 'Profil'), h('h1', null, 'Créer un skin'), pv,
      h('div', { class: 'creator gap' },
        inp('name', 'Nom', 'text', { maxlength: 16 }), inp('bg1', 'Fond (haut)', 'color'), inp('bg2', 'Fond (bas)', 'color'),
        inp('accent', 'Couleur d’accent', 'color'), inp('tile', 'Couleur des cases', 'color'),
        inp('radius', 'Arrondi des cases', 'range', { min: 0, max: 50 }), inp('glow', 'Halo lumineux', 'range', { min: 0, max: 24 }),
        h('label', null, 'Police', h('select', { onchange: ev => { d.font = ev.target.value; paint(); } },
          ['sans', 'mono', 'serif'].map(f => h('option', { value: f, selected: d.font === f ? true : null }, { sans: 'Moderne', mono: 'Code', serif: 'Classique' }[f])))),
        h('label', { class: 'switch', style: 'border:0' }, 'Une seule couleur (accent) pour toutes les cases',
          h('input', { type: 'checkbox', checked: d.mono ? true : null, onchange: ev => { d.mono = ev.target.checked; paint(); } }))),
      h('div', { class: 'row gap wrap-r' },
        h('button', { class: 'btn primary grow', onclick: () => {
          if (S.cs.length >= 8) return toast('8 skins personnalisés maximum');
          const sk = cleanSkin(d); S.cs.push(sk); S.skin = sk.id; save(); applySkin(); toast('Skin enregistré et activé'); go('profile');
        } }, 'Enregistrer'),
        h('button', { class: 'btn grow', onclick: () => {
          const code = btoa(unescape(encodeURIComponent(JSON.stringify(d))));
          const manual = () => dialog({ title: 'Copie ce code', text: 'Envoie-le à tes amis : ils pourront l’importer.', input: 'area', value: code, readonly: true, ok: 'Fermer', cancel: false });
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => toast('Code copié !'), manual);
          else manual();
        } }, 'Copier le code'))));
    paint();
  };

  /* ================= EN LIGNE (bientôt) ================= */
  screens.online = function () {
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'En ligne'),
      h('div', { class: 'card center' }, h('h2', null, 'Prochaine mise à jour'), h('div', { class: 'muted' }, 'Le mode en ligne arrive. Ton rang et tes skins seront conservés.')),
      h('div', { class: 'card gap' }, h('h3', null, 'Au programme'),
        h('div', null, 'Duels en ligne et classement par rangs'), h('div', { class: 'gap-s' }, 'Top mondial'),
        h('div', { class: 'gap-s' }, 'Concours mondial'), h('div', { class: 'gap-s' }, 'Concours du meilleur skin (utilise le créateur de skins dès maintenant !)')),
      h('div', { class: 'ladder gap' }, RANKS.map((r, i) => h('div', { class: 'rung', style: { '--c': r.color } }, badge(i), h('span', { class: 'muted small' }, 'dès ' + r.min + ' RP')))),
      h('div', { class: 'card gap center' }, h('div', { class: 'muted small' }, 'Ton meilleur score local'),
        h('div', { class: 'bigscore', style: { 'font-size': '2.6rem' } }, Math.max.apply(null, [0].concat(Object.keys(S.hs).map(k => S.hs[k])))))));
  };

  /* ================= RÉGLAGES ================= */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  screens.settings = function () {
    const sw = (label, key) => h('label', { class: 'switch' }, h('span', null, label),
      h('input', { type: 'checkbox', checked: S.prefs[key] ? true : null, onchange: ev => { S.prefs[key] = ev.target.checked; save(); } }));
    app.append(h('div', { class: 'wrap' }, backBtn(), h('h1', null, 'Réglages'),
      h('div', { class: 'card' }, sw('Sons', 'sound'), sw('Vibrations', 'vibrate'), sw('Saisie libre par défaut (mode Nommer)', 'typed')),
      installEvt ? h('button', { class: 'btn primary big-btn gap', onclick: () => { installEvt.prompt(); } }, 'Installer l’application') : null,
      h('div', { class: 'card gap' }, h('h3', null, 'Données'), h('div', { class: 'muted small' }, 'Tout est enregistré sur cet appareil.'),
        h('button', { class: 'btn gap-s', onclick: () => {
          dialog({ title: 'Tout effacer ?', text: 'Rang, niveaux, skins et mémoire seront perdus. Cette action est définitive.', ok: 'Tout effacer', danger: true })
            .then(ok => { if (ok) { S = DEF(); save(); applySkin(); toast('Progression réinitialisée'); go('home'); } });
        } }, 'Réinitialiser la progression')),
      h('div', { class: 'muted small center gap' }, 'Periodik v' + VERSION + ' · gratuit, sans achat intégré.')));
  };

  /* ================= Démarrage ================= */
  applySkin();
  history.replaceState({ n: 'home' }, '');
  render('home');
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* hors-ligne indisponible */ }));
  }
  window.__periodik = { get S() { return S; }, go: go, screens: screens }; // utile pour les tests
})();
