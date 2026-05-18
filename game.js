/* ============================================================
   Glyph Quest — an original turn-based mini-RPG for Aa OS
   Self-contained. No assets, no dependencies, no licensed IP.
   Creatures, names, world and art are all original.
   Save state persists in localStorage (per browser).
   ============================================================ */
window.GlyphQuest = (function () {
  'use strict';

  var SAVE_KEY = 'glyphquest.save.v1';
  var TILE = 30, COLS = 16, ROWS = 12;
  var W = COLS * TILE, H = ROWS * TILE;

  /* ---------- Data ---------- */
  var SPECIES = {
    pyrip:    { name: 'Pyrip',    type: 'ember', color: '#ff7a4d', shape: 'flame',
      hp: 30, atk: 13, def: 9,  spd: 13, moves: [{ name: 'Singe', type: 'ember', power: 5 }, { name: 'Tackle', type: 'none', power: 4 }] },
    drizlet:  { name: 'Drizlet',  type: 'tide',  color: '#56b7ff', shape: 'orb',
      hp: 33, atk: 11, def: 11, spd: 11, moves: [{ name: 'Splash', type: 'tide', power: 5 }, { name: 'Tackle', type: 'none', power: 4 }] },
    thistle:  { name: 'Thistle',  type: 'thorn', color: '#7bd66a', shape: 'spike',
      hp: 35, atk: 12, def: 12, spd: 9,  moves: [{ name: 'Vine Whip', type: 'thorn', power: 5 }, { name: 'Tackle', type: 'none', power: 4 }] },
    cindux:   { name: 'Cindux',   type: 'ember', color: '#ff9d3a', shape: 'crystal',
      hp: 36, atk: 15, def: 11, spd: 13, moves: [{ name: 'Ember', type: 'ember', power: 6 }, { name: 'Bite', type: 'none', power: 5 }] },
    wavorn:   { name: 'Wavorn',   type: 'tide',  color: '#4d8bff', shape: 'arc',
      hp: 40, atk: 13, def: 14, spd: 11, moves: [{ name: 'Tide Crash', type: 'tide', power: 6 }, { name: 'Bite', type: 'none', power: 5 }] },
    bramblux: { name: 'Bramblux', type: 'thorn', color: '#8be06a', shape: 'star',
      hp: 42, atk: 14, def: 15, spd: 9,  moves: [{ name: 'Bramble', type: 'thorn', power: 6 }, { name: 'Bite', type: 'none', power: 5 }] }
  };
  var STARTERS = ['pyrip', 'drizlet', 'thistle'];
  var WILD_POOL = ['pyrip', 'drizlet', 'thistle', 'cindux', 'wavorn', 'bramblux'];
  var TYPE_COLOR = { ember: '#ff7a4d', tide: '#56b7ff', thorn: '#7bd66a', none: '#9a9db0' };

  /* ---------- Map  (#=tree ~=water r=rock .=ground g=tall grass f=flower P=start) ---------- */
  var MAP = [
    '################',
    '#..f....g.g....#',
    '#.......ggg...~#',
    '#.r.....ggg...~#',
    '#....f...g....~#',
    '#..P.........~~#',
    '#.....rr.......#',
    '#..g........f..#',
    '#.ggg....rr....#',
    '#.ggg..f.......#',
    '#..g........f..#',
    '################'
  ];
  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return '#';
    return MAP[y][x];
  }
  function walkable(x, y) {
    var t = tileAt(x, y);
    return t === '.' || t === 'g' || t === 'f' || t === 'P';
  }
  var START = (function () {
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (MAP[y][x] === 'P') return { x: x, y: y };
    return { x: 3, y: 5 };
  })();

  /* ---------- Glyph factory ---------- */
  function recalc(g) {
    var s = SPECIES[g.id];
    g.maxHp = s.hp + (g.level - 1) * 4;
    g.atk = s.atk + Math.floor(s.atk * 0.12 * (g.level - 1));
    g.def = s.def + Math.floor(s.def * 0.12 * (g.level - 1));
    g.spd = s.spd + Math.floor(s.spd * 0.12 * (g.level - 1));
  }
  function makeGlyph(id, level) {
    var s = SPECIES[id];
    var g = { id: id, name: s.name, type: s.type, color: s.color, shape: s.shape,
      level: level, xp: 0, moves: s.moves };
    recalc(g);
    g.hp = g.maxHp;
    return g;
  }
  function xpToNext(level) { return 14 + level * 9; }
  function gainXp(g, amount) {
    var msgs = [];
    g.xp += amount;
    while (g.level < 25 && g.xp >= xpToNext(g.level)) {
      g.xp -= xpToNext(g.level);
      g.level++;
      var oldMax = g.maxHp;
      recalc(g);
      g.hp += g.maxHp - oldMax;
      msgs.push(g.name + ' grew to Level ' + g.level + '!');
    }
    return msgs;
  }

  /* ---------- Battle math ---------- */
  function typeMult(mt, dt) {
    if (mt === 'none') return 1;
    if ((mt === 'ember' && dt === 'thorn') || (mt === 'thorn' && dt === 'tide') || (mt === 'tide' && dt === 'ember')) return 1.6;
    if ((mt === 'thorn' && dt === 'ember') || (mt === 'tide' && dt === 'thorn') || (mt === 'ember' && dt === 'tide')) return 0.625;
    return 1;
  }
  function calcDamage(atk, def, move) {
    var ratio = atk.atk / def.def;
    var tm = typeMult(move.type, def.type);
    var rand = 0.85 + Math.random() * 0.15;
    return Math.max(1, Math.floor(move.power * 2.2 * ratio * tm * rand));
  }
  function aiChoose(wild, target) {
    var best = wild.moves[0], bestScore = -1;
    wild.moves.forEach(function (m) {
      var sc = m.power * typeMult(m.type, target.type) + Math.random();
      if (sc > bestScore) { bestScore = sc; best = m; }
    });
    return best;
  }

  /* ============================================================
     STATE
     ============================================================ */
  var state, canvas, ctx, raf, keyHandler, mountedRoot;

  function freshState() {
    return {
      scene: 'title', titleSel: 0,
      starterSel: 0,
      player: { x: START.x, y: START.y, facing: 'down' },
      party: [], activeIndex: 0, steps: 0,
      notice: null, battle: null, flash: 0
    };
  }

  /* ---------- Save / load ---------- */
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, player: state.player, steps: state.steps, activeIndex: state.activeIndex,
        party: state.party.map(function (g) { return { id: g.id, level: g.level, xp: g.xp, hp: g.hp }; })
      }));
    } catch (e) {}
  }
  function loadGame() {
    try {
      var d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d || !d.party || !d.party.length) return false;
      state.player = d.player;
      state.steps = d.steps || 0;
      state.activeIndex = d.activeIndex || 0;
      state.party = d.party.map(function (p) {
        var g = makeGlyph(p.id, p.level);
        g.xp = p.xp || 0;
        g.hp = Math.max(0, Math.min(g.maxHp, p.hp));
        return g;
      });
      if (!state.party.some(function (g) { return g.hp > 0; })) state.party.forEach(function (g) { g.hp = g.maxHp; });
      return true;
    } catch (e) { return false; }
  }

  function active() { return state.party[state.activeIndex]; }
  function healAll() { state.party.forEach(function (g) { g.hp = g.maxHp; }); }

  /* ============================================================
     FLOW
     ============================================================ */
  function startNewGame() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    state.party = []; state.activeIndex = 0; state.steps = 0;
    state.player = { x: START.x, y: START.y, facing: 'down' };
    state.scene = 'starter'; state.starterSel = 0;
  }
  function chooseStarter() {
    state.party = [makeGlyph(STARTERS[state.starterSel], 5)];
    state.activeIndex = 0;
    state.scene = 'overworld';
    state.notice = 'Welcome! Walk into the dark TALL GRASS to find wild glyphs. Step home (your start tile) to heal.';
    saveGame();
  }

  function tryMove(dx, dy) {
    if (state.notice) { state.notice = null; return; }
    var p = state.player;
    p.facing = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
    var nx = p.x + dx, ny = p.y + dy;
    if (!walkable(nx, ny)) return;
    p.x = nx; p.y = ny; state.steps++;
    if (tileAt(nx, ny) === 'P') {
      var hurt = state.party.some(function (g) { return g.hp < g.maxHp; });
      if (hurt) { healAll(); state.notice = 'Home base — your glyphs are fully healed!'; }
    }
    if (tileAt(nx, ny) === 'g' && Math.random() < 0.16) startEncounter();
    saveGame();
  }

  function startEncounter() {
    var id = WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)];
    var lvl = 2 + Math.floor(Math.random() * 4);
    var wild = makeGlyph(id, lvl);
    state.battle = { wild: wild, mode: 'text', selMain: 0, selMove: 0, log: [], then: null, anim: 0 };
    state.scene = 'battle';
    say(['A wild ' + wild.name + ' (Lv ' + wild.level + ') appeared!'], function () { state.battle.mode = 'menu'; });
  }

  function say(msgs, then) {
    var b = state.battle;
    b.log = msgs.slice();
    b.then = then || null;
    b.mode = 'text';
  }

  function endBattle() { state.battle = null; state.scene = 'overworld'; saveGame(); }

  function strike(atk, def, move, prefix, msgs) {
    msgs.push(prefix + atk.name + ' used ' + move.name + '!');
    var dmg = calcDamage(atk, def, move);
    def.hp = Math.max(0, def.hp - dmg);
    var tm = typeMult(move.type, def.type);
    if (tm > 1.1) msgs.push("It's super effective!");
    else if (tm < 0.9) msgs.push('It was not very effective…');
  }

  function playerMove(idx) {
    var b = state.battle, me = active(), wild = b.wild;
    var move = me.moves[idx];
    var wildMove = aiChoose(wild, me);
    var msgs = [];
    if (me.spd >= wild.spd) {
      strike(me, wild, move, '', msgs);
      if (wild.hp > 0) strike(wild, me, wildMove, 'Wild ', msgs);
    } else {
      strike(wild, me, wildMove, 'Wild ', msgs);
      if (me.hp > 0) strike(me, wild, move, '', msgs);
    }
    say(msgs, resolveTurn);
  }

  function resolveTurn() {
    var b = state.battle, me = active(), wild = b.wild;
    if (wild.hp <= 0) {
      var gx = 6 + wild.level * 5;
      var msgs = ['Wild ' + wild.name + ' fainted!', me.name + ' gained ' + gx + ' XP!'];
      msgs = msgs.concat(gainXp(me, gx));
      say(msgs, endBattle);
    } else if (me.hp <= 0) {
      faint();
    } else {
      b.mode = 'menu'; b.selMain = 0;
    }
  }

  function faint() {
    var me = active();
    var msgs = [me.name + ' fainted!'];
    var next = -1;
    for (var i = 0; i < state.party.length; i++) if (state.party[i].hp > 0) { next = i; break; }
    if (next >= 0) {
      say(msgs.concat(['Go, ' + state.party[next].name + '!']), function () {
        state.activeIndex = next; state.battle.mode = 'menu'; state.battle.selMain = 0;
      });
    } else {
      say(msgs.concat(['All your glyphs fainted!', 'You retreated home to recover.']), function () {
        healAll();
        state.player = { x: START.x, y: START.y, facing: 'down' };
        endBattle();
      });
    }
  }

  function tryCatch() {
    var b = state.battle, wild = b.wild;
    if (state.party.length >= 6) { say(['Your party is full (6)!'], function () { b.mode = 'menu'; }); return; }
    var chance = 0.4 + 0.5 * (1 - wild.hp / wild.maxHp) - wild.level * 0.015;
    chance = Math.max(0.12, Math.min(0.95, chance));
    if (Math.random() < chance) {
      state.party.push(wild);
      say(['You tossed a Core…', 'Gotcha! Wild ' + wild.name + ' joined your party!'], endBattle);
    } else {
      var me = active();
      var wm = aiChoose(wild, me);
      var msgs = ['You tossed a Core…', 'Wild ' + wild.name + ' broke free!'];
      strike(wild, me, wm, 'Wild ', msgs);
      say(msgs, function () { if (me.hp <= 0) faint(); else { b.mode = 'menu'; b.selMain = 0; } });
    }
  }

  /* ============================================================
     INPUT
     ============================================================ */
  function onKey(e) {
    var win = mountedRoot && mountedRoot.closest ? mountedRoot.closest('.win') : null;
    if (win && (!win.classList.contains('focused') || win.classList.contains('minimized'))) return;
    var k = e.key;
    var up = k === 'ArrowUp' || k === 'w' || k === 'W';
    var down = k === 'ArrowDown' || k === 's' || k === 'S';
    var left = k === 'ArrowLeft' || k === 'a' || k === 'A';
    var right = k === 'ArrowRight' || k === 'd' || k === 'D';
    var ok = k === 'z' || k === 'Z' || k === 'Enter' || k === ' ';
    var back = k === 'x' || k === 'X' || k === 'Escape';
    if (!(up || down || left || right || ok || back)) return;
    e.preventDefault();

    if (state.scene === 'title') {
      var opts = hasSave() ? 2 : 1;
      if (up) state.titleSel = (state.titleSel + opts - 1) % opts;
      if (down) state.titleSel = (state.titleSel + 1) % opts;
      if (ok) {
        if (hasSave() && state.titleSel === 0) { if (loadGame()) state.scene = 'overworld'; }
        else startNewGame();
      }
    } else if (state.scene === 'starter') {
      if (left) state.starterSel = (state.starterSel + 2) % 3;
      if (right) state.starterSel = (state.starterSel + 1) % 3;
      if (ok) chooseStarter();
    } else if (state.scene === 'overworld') {
      if (state.notice) { if (ok || back) state.notice = null; return; }
      if (up) tryMove(0, -1);
      else if (down) tryMove(0, 1);
      else if (left) tryMove(-1, 0);
      else if (right) tryMove(1, 0);
    } else if (state.scene === 'battle') {
      var b = state.battle;
      if (b.mode === 'text') {
        if (ok) {
          b.log.shift();
          if (b.log.length === 0) { var t = b.then; b.then = null; b.mode = 'menu'; if (t) t(); }
        }
      } else if (b.mode === 'menu') {
        if (up) b.selMain = (b.selMain + 2) % 3;
        if (down) b.selMain = (b.selMain + 1) % 3;
        if (ok) {
          if (b.selMain === 0) { b.mode = 'moves'; b.selMove = 0; }
          else if (b.selMain === 1) tryCatch();
          else say(['Got away safely!'], endBattle);
        }
      } else if (b.mode === 'moves') {
        var n = active().moves.length + 1;
        if (up) b.selMove = (b.selMove + n - 1) % n;
        if (down) b.selMove = (b.selMove + 1) % n;
        if (back) b.mode = 'menu';
        if (ok) {
          if (b.selMove === active().moves.length) b.mode = 'menu';
          else playerMove(b.selMove);
        }
      }
    }
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(str, x, y, size, color, align) {
    ctx.font = '700 ' + (size || 13) + "px 'JetBrains Mono', monospace";
    ctx.fillStyle = color || '#e9eaf0';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }
  function wrap(str, x, y, maxW, lh, size, color) {
    ctx.font = '700 ' + size + "px 'JetBrains Mono', monospace";
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var words = str.split(' '), line = '', yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = words[i]; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawGlyph(g, cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    var col = g.color, dark = shade(col, -40);
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath();
    var s = g.shape, i, a;
    if (s === 'orb') { ctx.arc(0, 0, r, 0, 7); }
    else if (s === 'flame') {
      ctx.moveTo(0, -r * 1.15);
      ctx.quadraticCurveTo(r, -r * 0.2, r * 0.75, r * 0.5);
      ctx.quadraticCurveTo(r * 0.4, r, 0, r);
      ctx.quadraticCurveTo(-r * 0.4, r, -r * 0.75, r * 0.5);
      ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r * 1.15);
    } else if (s === 'spike') {
      for (i = 0; i < 12; i++) { a = i / 12 * Math.PI * 2; var rr = i % 2 ? r * 0.72 : r * 1.1; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath();
    } else if (s === 'crystal') {
      ctx.moveTo(0, -r * 1.15); ctx.lineTo(r * 0.8, -r * 0.15); ctx.lineTo(r * 0.45, r * 1.1);
      ctx.lineTo(-r * 0.45, r * 1.1); ctx.lineTo(-r * 0.8, -r * 0.15); ctx.closePath();
    } else if (s === 'arc') {
      ctx.arc(0, 0, r, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.arc(0, r * 0.35, r * 0.62, Math.PI * 0.85, Math.PI * 0.15, true);
      ctx.closePath();
    } else if (s === 'star') {
      for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i / 10 * Math.PI * 2; var R = i % 2 ? r * 0.5 : r * 1.12; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R, Math.sin(a) * R); }
      ctx.closePath();
    } else { ctx.arc(0, 0, r, 0, 7); }
    ctx.fill(); ctx.stroke();
    /* eyes */
    var ey = -r * 0.1, ex = r * 0.34, er = r * 0.2;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-ex, ey, er, 0, 7); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
    ctx.fillStyle = '#10121a';
    ctx.beginPath(); ctx.arc(-ex, ey, er * 0.5, 0, 7); ctx.arc(ex, ey, er * 0.5, 0, 7); ctx.fill();
    ctx.restore();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function hpBar(x, y, w, ratio) {
    ctx.fillStyle = '#10121a'; rrect(x, y, w, 9, 4); ctx.fill();
    var col = ratio > 0.5 ? '#56d98a' : ratio > 0.22 ? '#febc2e' : '#ff5f57';
    ctx.fillStyle = col; rrect(x + 1.5, y + 1.5, Math.max(0, (w - 3) * ratio), 6, 3); ctx.fill();
  }

  /* ---------- scenes ---------- */
  function drawTitle() {
    bg();
    ctx.textAlign = 'center';
    var grad = ctx.createLinearGradient(W / 2 - 130, 0, W / 2 + 130, 0);
    grad.addColorStop(0, '#ff8159'); grad.addColorStop(1, '#7c8bff');
    ctx.font = "700 42px 'Space Grotesk','JetBrains Mono',monospace";
    ctx.fillStyle = grad; ctx.fillText('GLYPH QUEST', W / 2, 118);
    text('an Aa OS mini-RPG', W / 2, 142, 12, '#9a9db0', 'center');
    drawGlyph(makeGlyph('cindux', 5), W / 2 - 70, 200, 26);
    drawGlyph(makeGlyph('wavorn', 5), W / 2, 206, 28);
    drawGlyph(makeGlyph('bramblux', 5), W / 2 + 70, 200, 26);
    var opts = hasSave() ? ['Continue', 'New Game'] : ['New Game'];
    for (var i = 0; i < opts.length; i++) {
      var y = 256 + i * 34, sel = i === state.titleSel;
      ctx.fillStyle = sel ? 'rgba(255,129,89,0.16)' : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = sel ? '#ff8159' : 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
      rrect(W / 2 - 90, y - 19, 180, 28, 8); ctx.fill(); ctx.stroke();
      text((sel ? '> ' : '  ') + opts[i], W / 2, y, 14, sel ? '#fff' : '#9a9db0', 'center');
    }
    text('Arrows move · Z select · X back', W / 2, H - 18, 10, '#6b6e80', 'center');
  }

  function drawStarter() {
    bg();
    text('CHOOSE YOUR FIRST GLYPH', W / 2, 56, 16, '#e9eaf0', 'center');
    for (var i = 0; i < 3; i++) {
      var sp = SPECIES[STARTERS[i]], cx = W / 2 + (i - 1) * 138, sel = i === state.starterSel;
      ctx.fillStyle = sel ? 'rgba(255,129,89,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = sel ? '#ff8159' : 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
      rrect(cx - 60, 84, 120, 168, 12); ctx.fill(); ctx.stroke();
      drawGlyph(makeGlyph(STARTERS[i], 5), cx, 150, 34);
      text(sp.name, cx, 212, 14, sel ? '#fff' : '#c5c7d4', 'center');
      text(sp.type.toUpperCase(), cx, 232, 10, TYPE_COLOR[sp.type], 'center');
    }
    text('Ember › Thorn › Tide › Ember', W / 2, 290, 11, '#9a9db0', 'center');
    text('Arrows choose · Z confirm', W / 2, H - 18, 10, '#6b6e80', 'center');
  }

  function drawOverworld() {
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var t = MAP[y][x], px = x * TILE, py = y * TILE;
      ctx.fillStyle = '#1d3a2a';
      ctx.fillRect(px, py, TILE, TILE);
      if (t === 'g') {
        ctx.fillStyle = '#27543a'; ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = '#163024'; ctx.lineWidth = 2;
        for (var b = 0; b < 3; b++) { ctx.beginPath(); ctx.moveTo(px + 7 + b * 8, py + 24); ctx.lineTo(px + 7 + b * 8, py + 13); ctx.stroke(); }
      } else if (t === '#') {
        ctx.fillStyle = '#0f1f17'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#2f5f3e'; ctx.beginPath(); ctx.arc(px + 15, py + 13, 11, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a2a1c'; ctx.fillRect(px + 12, py + 18, 6, 10);
      } else if (t === '~') {
        ctx.fillStyle = '#1c4b6e'; ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = '#2f6f96'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px + 15, py + 16, 7, 0.2, 2.9); ctx.stroke();
      } else if (t === 'r') {
        ctx.fillStyle = '#3b3f4d'; ctx.beginPath(); ctx.arc(px + 15, py + 17, 10, 0, 7); ctx.fill();
      } else if (t === 'f') {
        ctx.fillStyle = '#ff8159'; ctx.beginPath(); ctx.arc(px + 15, py + 15, 4, 0, 7); ctx.fill();
      } else if (t === 'P') {
        ctx.strokeStyle = '#56d98a'; ctx.lineWidth = 2; ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
        text('H', px + 15, py + 20, 11, '#56d98a', 'center');
      }
    }
    /* player */
    var p = state.player, cx = p.x * TILE + 15, cy = p.y * TILE + 15;
    ctx.fillStyle = '#ff8159'; ctx.strokeStyle = '#1a0e08'; ctx.lineWidth = 2;
    rrect(cx - 9, cy - 10, 18, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    var fx = p.facing === 'left' ? -3 : p.facing === 'right' ? 3 : 0;
    ctx.beginPath(); ctx.arc(cx - 4 + fx, cy - 2, 2.4, 0, 7); ctx.arc(cx + 4 + fx, cy - 2, 2.4, 0, 7); ctx.fill();
    /* hud */
    ctx.fillStyle = 'rgba(10,11,16,0.82)'; ctx.fillRect(0, 0, W, 22);
    text('GLYPH QUEST', 8, 15, 11, '#ff8159');
    text('Party ' + state.party.length + '/6   Steps ' + state.steps, W - 8, 15, 11, '#9a9db0', 'right');
    if (state.notice) {
      ctx.fillStyle = 'rgba(7,8,12,0.92)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#14161f'; ctx.strokeStyle = '#ff8159'; ctx.lineWidth = 2;
      rrect(30, H / 2 - 54, W - 60, 108, 12); ctx.fill(); ctx.stroke();
      wrap(state.notice, 48, H / 2 - 20, W - 96, 20, 13, '#e9eaf0');
      text('Z to continue', W / 2, H / 2 + 40, 10, '#6b6e80', 'center');
    }
  }

  function drawBattle() {
    var b = state.battle, me = active(), wild = b.wild;
    /* arena */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#241b2e'); g.addColorStop(1, '#12141d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(124,139,255,0.13)';
    ctx.beginPath(); ctx.ellipse(348, 168, 64, 18, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(128, 262, 72, 20, 0, 0, 7); ctx.fill();
    drawGlyph(wild, 348, 140, 32);
    drawGlyph(me, 128, 232, 38);
    /* wild info */
    infoBox(20, 26, wild, false);
    /* my info */
    infoBox(W - 232, 168, me, true);
    /* bottom box */
    ctx.fillStyle = '#0d0f16'; ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
    rrect(8, 268, W - 16, 84, 10); ctx.fill(); ctx.stroke();
    if (b.mode === 'text') {
      wrap(b.log[0] || '', 24, 298, W - 150, 20, 13, '#e9eaf0');
      if ((b.anim | 0) % 60 < 40) text('▾', W - 30, 340, 14, '#ff8159');
    } else if (b.mode === 'menu') {
      text('What will ' + me.name + ' do?', 24, 298, 13, '#9a9db0');
      var items = ['Fight', 'Catch', 'Run'];
      for (var i = 0; i < 3; i++) menuRow(W - 168, 286 + i * 20, items[i], i === b.selMain);
    } else if (b.mode === 'moves') {
      var moves = me.moves;
      for (var j = 0; j < moves.length; j++) {
        var sel = j === b.selMove;
        menuRow(24, 292 + j * 22, moves[j].name, sel);
        text(moves[j].type.toUpperCase() + ' · PWR ' + moves[j].power, 250, 292 + j * 22, 11, TYPE_COLOR[moves[j].type]);
      }
      menuRow(24, 292 + moves.length * 22, 'Back', b.selMove === moves.length);
    }
  }
  function menuRow(x, y, label, sel) {
    if (sel) { ctx.fillStyle = '#ff8159'; text('>', x - 12, y, 13, '#ff8159'); }
    text(label, x, y, 13, sel ? '#fff' : '#9a9db0');
  }
  function infoBox(x, y, glyph, mine) {
    ctx.fillStyle = 'rgba(13,15,22,0.92)'; ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
    rrect(x, y, 212, 50, 9); ctx.fill(); ctx.stroke();
    text(glyph.name, x + 12, y + 20, 13, '#e9eaf0');
    text('Lv' + glyph.level, x + 170, y + 20, 12, '#9a9db0');
    text(glyph.type.toUpperCase(), x + 12, y + 42, 9, TYPE_COLOR[glyph.type]);
    hpBar(x + 56, y + 32, 144, glyph.hp / glyph.maxHp);
    if (mine) text(glyph.hp + '/' + glyph.maxHp, x + 170, y + 42, 9, '#9a9db0');
  }

  function bg() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#12141d'); g.addColorStop(1, '#07080c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ============================================================
     LOOP
     ============================================================ */
  function frame() {
    if (!canvas || !canvas.isConnected) { stop(); return; }
    raf = requestAnimationFrame(frame);
    if (canvas.offsetParent === null) return;
    if (state.battle) state.battle.anim++;
    ctx.clearRect(0, 0, W, H);
    if (state.scene === 'title') drawTitle();
    else if (state.scene === 'starter') drawStarter();
    else if (state.scene === 'overworld') drawOverworld();
    else if (state.scene === 'battle') drawBattle();
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
  }

  /* ============================================================
     MOUNT
     ============================================================ */
  function mount(root) {
    stop();
    mountedRoot = root;
    canvas = root.querySelector('.game__canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    state = freshState();
    state.titleSel = 0;
    keyHandler = onKey;
    document.addEventListener('keydown', keyHandler);
    raf = requestAnimationFrame(frame);
  }

  return { mount: mount };
})();
