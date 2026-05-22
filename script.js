/* ============================================================
   Aa OS — Portfolio runtime
   Window manager, boot sequence, terminal, agent crew, dock.
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE_BP = 760;

  /* ---------- App registry ---------- */
  var APPS = {
    about:    { title: 'About — Aa Reyes', icon: 'i',  tpl: 'tpl-about',    w: 580, h: 600 },
    projects: { title: 'Projects',         icon: '▤', tpl: 'tpl-projects', w: 860, h: 580 },
    terminal: { title: 'Terminal',         icon: '$', tpl: 'tpl-terminal', w: 640, h: 420 },
    agents:   { title: 'Agent Crew',       icon: '◇', tpl: 'tpl-agents',   w: 900, h: 620 },
    stack:    { title: 'Tech Stack',       icon: '▦', tpl: 'tpl-stack',    w: 680, h: 540 },
    contact:  { title: 'Contact',          icon: '@', tpl: 'tpl-contact',  w: 600, h: 480 },
    game:     { title: 'Glyph Quest',      icon: '✦', tpl: 'tpl-game',     w: 524, h: 446 }
  };
  var PROJECT_IDS = ['aasaas', 'wwe', 'content', 'rarr', 'lcl', 'hscode'];

  /* ---------- Helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function tpl(id) { return document.getElementById(id).content.cloneNode(true); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  var BOOT_LINES = [
    'Aa OS 2.0  ·  boot sequence',
    '<span class="ok">[ ok ]</span>  mounting /projects  (6 systems)',
    '<span class="ok">[ ok ]</span>  loading agent crew  (16 specialists)',
    '<span class="ok">[ ok ]</span>  establishing remote-work uplink  ·  UTC+8',
    '<span class="ok">[ ok ]</span>  ready.'
  ];

  function runBoot(done) {
    var boot = document.getElementById('boot');
    var log = document.getElementById('bootLog');
    var skipped = false;

    function finish() {
      if (skipped) return;
      skipped = true;
      boot.classList.add('hidden');
      setTimeout(function () { boot.style.display = 'none'; }, 650);
      done();
    }
    boot.addEventListener('click', finish);

    if (REDUCED) { log.innerHTML = BOOT_LINES.join('\n'); setTimeout(finish, 400); return; }

    var i = 0;
    (function next() {
      if (skipped) return;
      if (i < BOOT_LINES.length) {
        log.innerHTML += (i ? '\n' : '') + BOOT_LINES[i];
        i++;
        setTimeout(next, 270);
      } else {
        setTimeout(finish, 620);
      }
    })();
  }

  /* ============================================================
     CLOCK
     ============================================================ */
  function startClock() {
    var el = document.getElementById('clock');
    function tick() {
      var d = new Date();
      var h = d.getHours(), m = d.getMinutes();
      el.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    tick();
    setInterval(tick, 20000);
  }

  /* ============================================================
     WINDOW MANAGER
     ============================================================ */
  var openWins = {};       // id -> { el, body }
  var zTop = 100;
  var cascade = 0;

  function setMenubarApp(name) {
    document.getElementById('menubarApp').textContent = name || 'Finder';
  }

  function updateDock() {
    document.querySelectorAll('.dock__item').forEach(function (b) {
      b.classList.toggle('running', !!openWins[b.getAttribute('data-app')]);
    });
  }

  function focusWin(id) {
    var w = openWins[id];
    if (!w) return;
    zTop++;
    w.el.style.zIndex = zTop;
    Object.keys(openWins).forEach(function (k) {
      openWins[k].el.classList.toggle('focused', k === id);
    });
    setMenubarApp(APPS[id].title.split(' — ')[0]);
  }

  function openApp(id) {
    var app = APPS[id];
    if (!app) return;

    if (openWins[id]) {
      openWins[id].el.classList.remove('minimized');
      focusWin(id);
      return openWins[id];
    }

    var area = document.getElementById('windows');
    var availW = area.clientWidth, availH = area.clientHeight;
    var w = Math.min(app.w, availW - 24);
    var h = Math.min(app.h, availH - 24);
    var x = clamp(Math.round((availW - w) / 2) - 80 + cascade, 12, Math.max(12, availW - w - 12));
    var y = clamp(Math.round((availH - h) / 2) - 30 + cascade, 10, Math.max(10, availH - h - 12));
    cascade = (cascade + 28) % 140;

    var el = document.createElement('section');
    el.className = 'win';
    el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;';
    el.innerHTML =
      '<div class="win__bar">' +
        '<div class="win__lights">' +
          '<button class="win__light win__light--close" data-act="close" aria-label="Close"><span>×</span></button>' +
          '<button class="win__light win__light--min" data-act="min" aria-label="Minimize"><span>–</span></button>' +
          '<button class="win__light win__light--max" data-act="max" aria-label="Maximize"><span>+</span></button>' +
        '</div>' +
        '<div class="win__title">' + escapeHtml(app.title) +
          ' <span class="win__icon">' + escapeHtml(app.icon) + '_</span></div>' +
      '</div>' +
      '<div class="win__body"></div>';

    var body = $('.win__body', el);
    body.appendChild(tpl(app.tpl));
    area.appendChild(el);
    openWins[id] = { el: el, body: body };

    /* window controls */
    $('.win__lights', el).addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.stopPropagation();
      var act = btn.getAttribute('data-act');
      if (act === 'close') closeApp(id);
      else if (act === 'min') { el.classList.add('minimized'); }
      else if (act === 'max') { el.classList.toggle('maximized'); }
    });
    el.addEventListener('pointerdown', function () { focusWin(id); }, true);
    makeDraggable(el, $('.win__bar', el));

    initContent(id, body);
    focusWin(id);
    updateDock();
    hideTip();
    return openWins[id];
  }

  function closeApp(id) {
    var w = openWins[id];
    if (!w) return;
    w.el.remove();
    delete openWins[id];
    updateDock();
    var keys = Object.keys(openWins);
    setMenubarApp(keys.length ? APPS[keys[keys.length - 1]].title.split(' — ')[0] : 'Finder');
  }

  function makeDraggable(win, handle) {
    var sx, sy, ox, oy, dragging = false;
    handle.addEventListener('pointerdown', function (e) {
      if (e.target.closest('[data-act]')) return;
      if (win.classList.contains('maximized')) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = win.offsetLeft; oy = win.offsetTop;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var area = document.getElementById('windows');
      var nl = ox + (e.clientX - sx);
      var nt = oy + (e.clientY - sy);
      nl = clamp(nl, -(win.offsetWidth - 130), area.clientWidth - 110);
      nt = clamp(nt, 0, area.clientHeight - 44);
      win.style.left = nl + 'px';
      win.style.top = nt + 'px';
    });
    function end() { dragging = false; }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  /* ============================================================
     CONTENT INITIALISERS
     ============================================================ */
  function initContent(id, root) {
    if (id === 'about') {
      animateCounters(root);
      var b = $('[data-open]', root);
      if (b) b.addEventListener('click', function () { openApp(b.getAttribute('data-open')); });
    } else if (id === 'projects') {
      initFinder(root);
    } else if (id === 'terminal') {
      initTerminal(root);
    } else if (id === 'agents') {
      renderCrew(root);
    } else if (id === 'game') {
      if (window.GlyphQuest) window.GlyphQuest.mount(root);
    }
  }

  /* ---------- Counters ---------- */
  function animateCounters(root) {
    root.querySelectorAll('.metric__num').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (REDUCED) { el.textContent = target + suffix; return; }
      var dur = 1400, start = null;
      requestAnimationFrame(function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
      });
    });
  }

  /* ---------- Finder / projects ---------- */
  function selectProject(root, pid) {
    root.querySelectorAll('.finder__item').forEach(function (it) {
      it.classList.toggle('active', it.getAttribute('data-proj') === pid);
    });
    root.querySelectorAll('.proj').forEach(function (p) {
      p.hidden = p.getAttribute('data-proj') !== pid;
    });
    var det = $('.finder__detail', root);
    if (det) det.scrollTop = 0;
  }
  function initFinder(root) {
    root.querySelectorAll('.finder__item').forEach(function (it) {
      it.addEventListener('click', function () {
        selectProject(root, it.getAttribute('data-proj'));
      });
    });
    selectProject(root, 'aasaas');
  }

  /* ============================================================
     TERMINAL
     ============================================================ */
  function initTerminal(root) {
    var out = $('.term__out', root);
    var input = $('.term__input', root);

    function print(html) { out.innerHTML += html + '\n'; out.scrollTop = out.scrollHeight; }

    print('<span class="ac">Aa OS</span> terminal — type <span class="cmd">help</span> to begin.');
    print('<span class="dim">try: about · projects · ls projects · open wwe · agents</span>\n');

    var COMMANDS = {
      help: function () {
        print('<span class="ac">available commands</span>');
        print('  <span class="cmd">about</span>       open the About window');
        print('  <span class="cmd">projects</span>    open the Projects browser');
        print('  <span class="cmd">agents</span>      open the 16-agent crew');
        print('  <span class="cmd">stack</span>       open the tech stack');
        print('  <span class="cmd">contact</span>     open contact + CV');
        print('  <span class="cmd">ls</span> [projects]   list apps or projects');
        print('  <span class="cmd">open</span> &lt;name&gt;     open an app or a project');
        print('  <span class="cmd">whoami</span>      who is Aa Reyes');
        print('  <span class="cmd">skills</span>      core tech stack');
        print('  <span class="cmd">neofetch</span>    system info');
        print('  <span class="cmd">date</span> · <span class="cmd">clear</span>');
      },
      whoami: function () {
        print('<span class="ac">Aa Reyes</span> — AI-Augmented Software Engineer, Manila PH (UTC+8).');
        print('7+ yrs full-stack. Solo-builder of production SaaS. Agentic-AI specialist.');
        print('Runs a one-person software studio powered by a 16-agent Claude Code crew.');
      },
      ls: function (arg) {
        if (arg === 'projects') {
          print('<span class="ac2">projects/</span>  ' + PROJECT_IDS.join('  '));
        } else {
          print('<span class="ac2">apps/</span>  about  projects  agents  stack  contact');
          print('<span class="dim">tip: "ls projects" to list the projects</span>');
        }
      },
      open: function (arg) {
        if (!arg) { print('<span class="err">usage: open &lt;name&gt;</span>'); return; }
        if (APPS[arg]) { openApp(arg); print('opening <span class="cmd">' + arg + '</span>…'); }
        else if (PROJECT_IDS.indexOf(arg) > -1) {
          var w = openApp('projects');
          selectProject(w.body, arg);
          print('opening project <span class="cmd">' + arg + '</span>…');
        } else { print('<span class="err">not found: ' + escapeHtml(arg) + '</span>'); }
      },
      skills: function () {
        print('<span class="ac">backend</span>   C# .NET Core 9 · ASP.NET Core · Node.js · Apollo · GraphQL');
        print('<span class="ac">frontend</span>  Angular 20 · React 18/19 · TypeScript · Vite · Tailwind');
        print('<span class="ac">data</span>      PostgreSQL 16 · Prisma · EF Core · row-level security');
        print('<span class="ac">ai</span>        Claude Code · multi-agent orchestration · MCP');
      },
      neofetch: function () {
        print('<span class="ac">    Aa//OS    </span>  <span class="cmd">Aa Reyes</span>@portfolio');
        print('<span class="ac">  ▟▛  ▜▙   </span>  ' + '-'.repeat(22));
        print('<span class="ac">  ▜▙  ▟▛   </span>  OS:     Aa OS 2.0');
        print('<span class="ac">    ////    </span>  Role:   Full-Stack / Agentic SWE');
        print('               Uptime: 7+ years');
        print('               Shell:  Claude Code · 16-agent crew');
        print('               Host:   Manila, PH · UTC+8 · remote');
      },
      date: function () { print(new Date().toString()); },
      clear: function () { out.innerHTML = ''; },
      sudo: function (arg) {
        if (arg === 'hire-me') {
          print('<span class="ok">access granted.</span> opening contact…');
          openApp('contact');
        } else {
          print('<span class="dim">nice try. (the only privileged command is: sudo hire-me)</span>');
        }
      }
    };
    COMMANDS.about = function () { openApp('about'); print('opening About…'); };
    COMMANDS.projects = function () { openApp('projects'); print('opening Projects…'); };
    COMMANDS.agents = function () { openApp('agents'); print('opening Agent Crew…'); };
    COMMANDS.stack = function () { openApp('stack'); print('opening Tech Stack…'); };
    COMMANDS.contact = function () { openApp('contact'); print('opening Contact…'); };

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var raw = input.value.trim();
      input.value = '';
      print('<span class="term__ps" style="color:#56d98a">aa@portfolio<b style="color:#6b6e80">:</b>~$</span> <span class="cmd">' + escapeHtml(raw) + '</span>');
      if (!raw) return;
      var parts = raw.split(/\s+/);
      var cmd = parts[0].toLowerCase();
      var arg = (parts[1] || '').toLowerCase();
      if (COMMANDS[cmd]) COMMANDS[cmd](arg);
      else print('<span class="err">command not found: ' + escapeHtml(cmd) + '</span> — type <span class="cmd">help</span>');
    });
    setTimeout(function () { input.focus(); }, 60);
    root.addEventListener('click', function () { input.focus(); });
  }

  /* ============================================================
     AGENT CREW
     ============================================================ */
  var MODELS = {
    Opus:   { color: '#ff8159', note: 'deep reasoning' },
    Sonnet: { color: '#7c8bff', note: 'fast implementation' },
    Haiku:  { color: '#56d98a', note: 'lightweight & quick' }
  };
  var ORCH = {
    id: 'orchestrator', name: 'orchestrator', role: 'Coordinator', model: 'Opus',
    access: 'Delegates only',
    desc: 'The primary session agent. It reads project context, plans the work, and ' +
          'delegates every task to the right specialist. By design it coordinates and ' +
          'reviews — it never writes implementation code directly.'
  };
  var TIERS = [
    { label: 'Implementation', agents: [
      { id: 'frontend-dev', name: 'frontend-dev', role: 'UI engineering', model: 'Sonnet', access: 'Read / Write', desc: 'Builds Angular / React components, services, routing and state.' },
      { id: 'backend-dev', name: 'backend-dev', role: 'API engineering', model: 'Sonnet', access: 'Read / Write', desc: 'Builds ASP.NET Core controllers, domain services, DTOs and middleware.' },
      { id: 'database-dev', name: 'database-dev', role: 'Data layer', model: 'Sonnet', access: 'Read / Write', desc: 'Owns PostgreSQL schema, EF Core / Prisma migrations and query optimization.' },
      { id: 'deploy-ops', name: 'deploy-ops', role: 'Deployment', model: 'Sonnet', access: 'Read / Write', desc: 'Handles the Ubuntu VPS, nginx, systemd, CI/CD pipelines and SSL.' },
      { id: 'deploy-auditor', name: 'deploy-auditor', role: 'Infra safety', model: 'Sonnet', access: 'Read / Write', desc: 'Runs DevOps audits and deploy-readiness and infrastructure safety checks.' },
      { id: 'ui-tester', name: 'ui-tester', role: 'E2E testing', model: 'Sonnet', access: 'Read / Write', desc: 'Drives Playwright end-to-end tests against real user flows.' }
    ]},
    { label: 'Planning', agents: [
      { id: 'planner', name: 'planner', role: 'Implementation plans', model: 'Opus', access: 'Read-only', desc: 'Produces structured, phased, risk-aware implementation plans before any code.' },
      { id: 'architect', name: 'architect', role: 'System design', model: 'Opus', access: 'Read-only', desc: 'Makes system-design decisions, writes ADRs and weighs trade-offs.' }
    ]},
    { label: 'Quality', agents: [
      { id: 'security-auditor', name: 'security-auditor', role: 'Security review', model: 'Opus', access: 'Read-only', desc: 'Scans for vulnerabilities, detects committed secrets, runs OWASP review. Reports, never edits.' },
      { id: 'code-reviewer', name: 'code-reviewer', role: 'Code review', model: 'Sonnet', access: 'Read-only', desc: 'Checks code quality and pattern compliance before merge. Read-only by design.' }
    ]},
    { label: 'Utility', agents: [
      { id: 'tdd-guide', name: 'tdd-guide', role: 'Test-first flow', model: 'Sonnet', access: 'Read / Write', desc: 'Runs the TDD loop — RED, then GREEN, then REFACTOR.' },
      { id: 'build-fixer', name: 'build-fixer', role: 'Build repair', model: 'Sonnet', access: 'Read / Write', desc: 'A fast compile-fix loop that resolves build errors quickly.' },
      { id: 'refactor-cleaner', name: 'refactor-cleaner', role: 'Cleanup', model: 'Sonnet', access: 'Read / Write', desc: 'Detects dead code and removes it safely.' },
      { id: 'doc-updater', name: 'doc-updater', role: 'Doc sync', model: 'Haiku', access: 'Read / Write', desc: 'Keeps documentation in sync after code changes — runs on Haiku, cheap to call often.' }
    ]}
  ];

  function renderCrew(root) {
    var all = { orchestrator: ORCH };
    TIERS.forEach(function (t) { t.agents.forEach(function (a) { all[a.id] = a; }); });

    var orchHost = $('.js-orch', root);
    var tiersHost = $('.js-tiers', root);
    var detailHost = $('.js-detail', root);
    if (!orchHost || !tiersHost || !detailHost) return;

    orchHost.innerHTML =
      '<div class="orch-card agent" data-agent="orchestrator">' +
        '<div class="agent__name" style="justify-content:center">' +
          '<span class="agent__dot" style="background:' + MODELS.Opus.color + '"></span>@orchestrator</div>' +
        '<div class="agent__role">Coordinates &amp; delegates — never implements directly</div>' +
      '</div>';

    var html = '';
    TIERS.forEach(function (tier) {
      html += '<div class="tier"><div class="tier__label">' + tier.label + '</div><div class="tier__col">';
      tier.agents.forEach(function (a) {
        html +=
          '<div class="agent" data-agent="' + a.id + '" tabindex="0" role="button">' +
            '<div class="agent__name"><span class="agent__dot" style="background:' + MODELS[a.model].color + '"></span>' + a.name + '</div>' +
            '<div class="agent__role">' + a.role + '</div>' +
            '<div class="agent__model">' + a.model + '</div>' +
          '</div>';
      });
      html += '</div></div>';
    });
    tiersHost.innerHTML = html;

    function renderDetail(id) {
      var a = all[id]; if (!a) return;
      var m = MODELS[a.model];
      detailHost.innerHTML =
        '<div class="detail__top"><span class="detail__dot" style="background:' + m.color + '"></span>' +
        '<span class="detail__name">@' + a.name + '</span></div>' +
        '<div class="detail__role">' + a.role + '</div>' +
        '<p class="detail__desc">' + a.desc + '</p>' +
        '<div class="detail__row"><span>Model</span><strong>' + a.model + ' · ' + m.note + '</strong></div>' +
        '<div class="detail__row"><span>Access</span><strong>' + a.access + '</strong></div>' +
        '<p class="detail__hint">Click another agent to explore the crew.</p>';
    }
    function select(id) {
      root.querySelectorAll('.agent').forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-agent') === id);
      });
      renderDetail(id);
    }
    root.querySelectorAll('.agent').forEach(function (card) {
      var id = card.getAttribute('data-agent');
      card.addEventListener('click', function () { select(id); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); }
      });
    });
    select('orchestrator');
  }

  /* ============================================================
     STACKED / PLAIN VIEW
     ============================================================ */
  var stackedBuilt = false;
  var STACK_ORDER = [
    { id: 'about',    label: 'About' },
    { id: 'projects', label: 'Projects' },
    { id: 'agents',   label: 'Agentic Workflow' },
    { id: 'stack',    label: 'Tech Stack' },
    { id: 'contact',  label: 'Contact' }
  ];

  function buildStacked() {
    if (stackedBuilt) return;
    var host = document.getElementById('stackedBody');
    STACK_ORDER.forEach(function (item) {
      var card = document.createElement('section');
      card.className = 'stacked__card';
      card.innerHTML = '<div class="stacked__card-title">' + item.label + '</div>';
      var body = document.createElement('div');
      body.appendChild(tpl(APPS[item.id].tpl));
      card.appendChild(body);
      host.appendChild(card);
      initContent(item.id, body);
    });
    stackedBuilt = true;
  }

  function showStacked(withBack) {
    buildStacked();
    document.body.classList.add('is-stacked');
    document.getElementById('menubar').hidden = true;
    document.getElementById('desktop').hidden = true;
    document.getElementById('dock').hidden = true;
    var st = document.getElementById('stacked');
    st.hidden = false;
    document.getElementById('stackedBack').hidden = !withBack;
    window.scrollTo(0, 0);
  }
  function hideStacked() {
    document.body.classList.remove('is-stacked');
    document.getElementById('menubar').hidden = false;
    document.getElementById('desktop').hidden = false;
    document.getElementById('dock').hidden = false;
    document.getElementById('stacked').hidden = true;
  }

  /* ============================================================
     MISC WIRING
     ============================================================ */
  function hideTip() {
    var tip = document.getElementById('desktopTip');
    if (tip) tip.classList.add('hidden');
  }

  function wireLaunchers() {
    document.querySelectorAll('[data-app]').forEach(function (btn) {
      btn.addEventListener('click', function () { openApp(btn.getAttribute('data-app')); });
    });
    document.getElementById('plainViewBtn').addEventListener('click', function () {
      showStacked(true);
    });
    document.getElementById('stackedBack').addEventListener('click', hideStacked);
  }

  /* ============================================================
     INIT
     ============================================================ */
  function start() {
    if (window.innerWidth < MOBILE_BP) {
      showStacked(false);
      return;
    }
    startClock();
    wireLaunchers();
    openApp('about');
    setTimeout(hideTip, 9000);
  }

  runBoot(start);
})();

/* ---------- Project screenshot lightbox ---------- */
(function () {
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<img alt="Screenshot enlarged" />';
  document.body.appendChild(lb);
  lb.addEventListener('click', function () { lb.classList.remove('open'); });
  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('.proj__shots img') : null;
    if (!img) return;
    lb.firstChild.src = img.src;
    lb.classList.add('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') lb.classList.remove('open');
  });
})();
