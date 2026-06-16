/* ============================================================
   Aa OS — Portfolio runtime
   Window manager, boot sequence, terminal, agent crew, dock.
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE_BP = 760;

  // Apps Script endpoint for the Send-me-a-message form
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxl7hz7vw7VBMhZvG0WVbytSdMyHJQATIKnTFSwwSDlIDn3s591V0kTDhRJ-SeVdwJ1ng/exec';

  /* ---------- App registry ---------- */
  var APPS = {
    about:    { title: 'About — Aa Reyes', icon: 'i',  tpl: 'tpl-about',    w: 580, h: 600 },
    projects: { title: 'Projects',         icon: '▤', tpl: 'tpl-projects', w: 860, h: 580 },
    terminal: { title: 'Terminal',         icon: '$', tpl: 'tpl-terminal', w: 640, h: 420 },
    agents:   { title: 'Agent Crew',       icon: '◇', tpl: 'tpl-agents',   w: 980, h: 660 },
    stack:    { title: 'Tech Stack',       icon: '▦', tpl: 'tpl-stack',    w: 680, h: 540 },
    contact:  { title: 'Contact',          icon: '@', tpl: 'tpl-contact',  w: 640, h: 680 },
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
      // Quick-contact buttons: desktop -> open Contact window; stacked/mobile -> #msgform anchor scrolls
      root.querySelectorAll('.about__quick-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          if (document.body.classList.contains('is-stacked')) return;
          e.preventDefault();
          openApp('contact');
          setTimeout(function () {
            var msg = document.querySelector('.win .msgform');
            if (msg) msg.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        });
      });
    } else if (id === 'projects') {
      initFinder(root);
    } else if (id === 'terminal') {
      initTerminal(root);
    } else if (id === 'agents') {
      renderCrew(root);
    } else if (id === 'contact') {
      initContactForm(root);
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
  // Per-project crews (tabs at the top of the Agent Crew window)
  var CREWS = {
    rarr: {
      label: 'RARR Platform',
      lead: 'My employer-platform crew — orchestrator-coordinator pattern, tier-matched models (Opus for reasoning, Sonnet for build, Haiku for docs). <strong>Click any agent.</strong>',
      orchestrator: {
        id: 'rarr-orchestrator', name: 'orchestrator', tagline: 'Coordinates & delegates — never implements directly',
        role: 'Coordinator', model: 'Opus', access: 'Delegates only',
        desc: 'The primary session agent. Reads project context, plans the work, and delegates every task to the right specialist. By design it coordinates and reviews — it never writes implementation code directly.'
      },
      tiers: [
        { label: 'Implementation', agents: [
          { id: 'rarr-frontend-dev', name: 'frontend-dev', role: 'UI engineering', model: 'Sonnet', access: 'Read / Write', desc: 'Builds Angular / React components, services, routing and state.' },
          { id: 'rarr-backend-dev', name: 'backend-dev', role: 'API engineering', model: 'Sonnet', access: 'Read / Write', desc: 'Builds ASP.NET Core controllers, domain services, DTOs and middleware.' },
          { id: 'rarr-database-dev', name: 'database-dev', role: 'Data layer', model: 'Sonnet', access: 'Read / Write', desc: 'Owns PostgreSQL schema, EF Core / Prisma migrations and query optimization.' },
          { id: 'rarr-deploy-ops', name: 'deploy-ops', role: 'Deployment', model: 'Sonnet', access: 'Read / Write', desc: 'Handles the Ubuntu VPS, nginx, systemd, CI/CD pipelines and SSL.' },
          { id: 'rarr-deploy-auditor', name: 'deploy-auditor', role: 'Infra safety', model: 'Sonnet', access: 'Read / Write', desc: 'Runs DevOps audits and deploy-readiness and infrastructure safety checks.' },
          { id: 'rarr-ui-tester', name: 'ui-tester', role: 'E2E testing', model: 'Sonnet', access: 'Read / Write', desc: 'Drives Playwright end-to-end tests against real user flows.' }
        ]},
        { label: 'Planning', agents: [
          { id: 'rarr-planner', name: 'planner', role: 'Implementation plans', model: 'Opus', access: 'Read-only', desc: 'Produces structured, phased, risk-aware implementation plans before any code.' },
          { id: 'rarr-architect', name: 'architect', role: 'System design', model: 'Opus', access: 'Read-only', desc: 'Makes system-design decisions, writes ADRs and weighs trade-offs.' }
        ]},
        { label: 'Quality', agents: [
          { id: 'rarr-security-auditor', name: 'security-auditor', role: 'Security review', model: 'Opus', access: 'Read-only', desc: 'Scans for vulnerabilities, detects committed secrets, runs OWASP review. Reports, never edits.' },
          { id: 'rarr-code-reviewer', name: 'code-reviewer', role: 'Code review', model: 'Sonnet', access: 'Read-only', desc: 'Checks code quality and pattern compliance before merge. Read-only by design.' }
        ]},
        { label: 'Utility', agents: [
          { id: 'rarr-tdd-guide', name: 'tdd-guide', role: 'Test-first flow', model: 'Sonnet', access: 'Read / Write', desc: 'Runs the TDD loop — RED, then GREEN, then REFACTOR.' },
          { id: 'rarr-build-fixer', name: 'build-fixer', role: 'Build repair', model: 'Sonnet', access: 'Read / Write', desc: 'A fast compile-fix loop that resolves build errors quickly.' },
          { id: 'rarr-refactor-cleaner', name: 'refactor-cleaner', role: 'Cleanup', model: 'Sonnet', access: 'Read / Write', desc: 'Detects dead code and removes it safely.' },
          { id: 'rarr-doc-updater', name: 'doc-updater', role: 'Doc sync', model: 'Haiku', access: 'Read / Write', desc: 'Keeps documentation in sync after code changes — runs on Haiku, cheap to call often.' }
        ]}
      ]
    },
    aasaas: {
      label: 'Aa-SaaS Studio',
      lead: 'My vertical-SaaS studio crew — engineering, multi-tenant modules, marketing, business and quality routed through one orchestrator. Domain specialists for PH payroll and dental ops sit alongside platform engineers. <strong>Click any agent.</strong>',
      orchestrator: {
        id: 'aas-orchestrator', name: 'orchestrator', tagline: 'Reads the plan, picks the agent, sequences and parallelizes',
        role: 'Coordinator', model: 'Opus', access: 'Delegates only',
        desc: "Reads the build plan, decides which Tier-A agent does what, sequences the work, parallelizes where possible. Invoked when a task spans multiple agents or when it isn't obvious which specialist owns it."
      },
      tiers: [
        { label: 'Planning', agents: [
          { id: 'aas-planner', name: 'planner', role: 'Planning gate', model: 'Opus', access: 'Read-only', desc: 'Planning gate for the Aa Studio platform. Validates a feature request into a locked Karpathy-format brief, then produces the phased implementation plan.' },
          { id: 'aas-solution-architect', name: 'solution-architect', role: 'Tenant onboarding', model: 'Opus', access: 'Read / Write', desc: 'Ingests discovery interview transcripts and produces draft tenant.yaml configs. Invoked after a kickoff with a prospective or new tenant.' }
        ]},
        { label: 'Engineering & Modules', agents: [
          { id: 'aas-platform-engineer', name: 'platform-engineer', role: 'Platform core', model: 'Sonnet', access: 'Read / Write', desc: 'Owns Layer 1 (platform-core) — tenancy, RLS, JWT, RBAC, audit logging, workflow engine, notification infrastructure.' },
          { id: 'aas-module-engineer', name: 'module-engineer', role: 'Module dev', model: 'Sonnet', access: 'Read / Write', desc: 'Generic builder for any Layer-2 module. Reads the module template + domain notes, then scaffolds or extends a module.' },
          { id: 'aas-data-migrator', name: 'data-migrator', role: 'Data ETL', model: 'Sonnet', access: 'Read / Write', desc: 'Schema inference + ETL for messy client data dumps. Invoked during tenant onboarding when bringing existing data into the platform.' },
          { id: 'aas-devops-deployer', name: 'devops-deployer', role: 'Deploy workflow', model: 'Sonnet', access: 'Read / Write', desc: 'Owns the deploy workflow — GitHub Actions runs tests then SSHes to the VPS on every push to main.' },
          { id: 'aas-template-maintainer', name: 'template-maintainer', role: 'Template guard', model: 'Sonnet', access: 'Read / Write', desc: 'Reviews every tenant customization request. Decides whether it solves in config, generalizes into the module, or gets declined. Enforces the cardinal rule.' },
          { id: 'aas-payroll-specialist', name: 'payroll-specialist', role: 'PH payroll expert', model: 'Opus', access: 'Read / Write', desc: 'Domain expert for Philippine payroll — BIR withholding brackets, SSS, PhilHealth, Pag-IBIG, payslip formats, 13th-month rules.' },
          { id: 'aas-dental-specialist', name: 'dental-specialist', role: 'Dental ops expert', model: 'Opus', access: 'Read / Write', desc: 'Domain expert for Philippine dental clinic operations — patient flows, common procedures, HMO partner dynamics, recall best practices.' },
          { id: 'aas-tenant-simulator', name: 'tenant-simulator', role: 'UX simulation', model: 'Sonnet', access: 'Read / Write', desc: 'Persona-driven UX simulator. Acts like a Filipino SME owner using the platform, giving client-style feedback. Surfaces "huh?" moments code tests would miss.' }
        ]},
        { label: 'Marketing & Business', agents: [
          { id: 'aas-business-adviser', name: 'business-adviser', role: 'Business strategy', model: 'Opus', access: 'Read / Write', desc: 'Strategic business adviser. Turns shipped product into customer benefits, selling points, positioning, packaging and go-to-market moves.' },
          { id: 'aas-revenue-strategist', name: 'revenue-strategist', role: 'Pricing & offer', model: 'Sonnet', access: 'Read / Write', desc: 'Owns the canonical product offer — pricing, tiers, feature-to-tier mapping, value props, marketing copy, sales talk-tracks.' },
          { id: 'aas-ads-strategist', name: 'ads-strategist', role: 'Ad campaigns', model: 'Sonnet', access: 'Read / Write', desc: 'Paid-ads strategist (Meta first). Plans campaign structure, audiences, budgets, objectives and A/B angles targeting PH salon owners.' },
          { id: 'aas-ads-analyst', name: 'ads-analyst', role: 'Ad performance', model: 'Sonnet', access: 'Read / Write', desc: 'Paid-ads + funnel performance analyst. Reads campaign and analytics data, diagnoses what is working, recommends kill/scale.' },
          { id: 'aas-creative-producer', name: 'creative-producer', role: 'Creative briefs', model: 'Sonnet', access: 'Read / Write', desc: 'Visual creative for marketing — image and video creative briefs and generation prompts for on-brand social posts and ads.' },
          { id: 'aas-creative-analyst', name: 'creative-analyst', role: 'Creative testing', model: 'Sonnet', access: 'Read / Write', desc: 'Creative-performance analyst. Judges which creatives/hooks/captions/visuals are working and feeds patterns back to producer.' },
          { id: 'aas-social-marketer', name: 'social-marketer', role: 'Organic content', model: 'Sonnet', access: 'Read / Write', desc: 'Organic social + content marketer. Plans the content calendar and drafts Facebook/Instagram posts in the brand voice.' },
          { id: 'aas-onboarding-coach', name: 'onboarding-coach', role: 'User onboarding', model: 'Sonnet', access: 'Read / Write', desc: 'Drafts welcome sequences, training material, in-app tutorials and go-live communication per tenant.' }
        ]},
        { label: 'Quality & Docs', agents: [
          { id: 'aas-verifier', name: 'verifier', role: 'Pre-merge review', model: 'Sonnet', access: 'Read-only', desc: 'Final-check reviewer for code, schemas, migrations and tenant configs before merge or deploy. Enforces the platform contract.' },
          { id: 'aas-module-tester', name: 'module-tester', role: 'E2E behaviour', model: 'Sonnet', access: 'Read / Write', desc: 'Functional tester for any Layer-2 module. Drives the live GraphQL surface and the running web UI through happy paths and cardinal failures.' },
          { id: 'aas-module-docs-writer', name: 'module-docs-writer', role: 'User docs', model: 'Sonnet', access: 'Read / Write', desc: "Authors per-module user guides for tenant operators. Tier-aware — every section is labelled with its tier so lower-tier readers see what they're missing." }
        ]}
      ]
    },
    powerplatform: {
      label: 'PowerPlatform',
      lead: 'My Power Automate flow-building crew — strict planning gate, read-only review, scoped-write builder that never deletes. Compact but tightly guard-railed. <strong>Click any agent.</strong>',
      orchestrator: {
        id: 'pp-orchestrator', name: 'orchestrator', tagline: 'Reads context, runs the planner gate, delegates',
        role: 'Coordinator', model: 'Opus', access: 'Delegates',
        desc: 'Coordinator — reads project context, runs the planner gate, and delegates to specialist agents. Every session acts as the orchestrator by protocol.'
      },
      tiers: [
        { label: 'Planning', agents: [
          { id: 'pp-planner', name: 'planner', role: 'Planning gate', model: 'Opus', access: 'Read-only', desc: 'Planning gate. Validates a rough request into a locked Karpathy-format brief, then produces the phased implementation plan. The orchestrator routes here BEFORE any flow is created, updated, or toggled.' }
        ]},
        { label: 'Flow Build', agents: [
          { id: 'pp-flow-builder', name: 'flow-builder', role: 'Flow build', model: 'Sonnet', access: 'Scoped Write', desc: 'Builds and edits Power Automate flows and the SharePoint lists they depend on. Scoped-write — creates/updates/validates/tests flows but never deletes.' },
          { id: 'pp-flow-analyzer', name: 'flow-analyzer', role: 'Flow diagnostics', model: 'Sonnet', access: 'Read-only', desc: 'Read-only diagnostics and discovery for Power Automate flows and their data. Understands existing flows, finds run failures, maps SharePoint/Excel data.' }
        ]},
        { label: 'Quality', agents: [
          { id: 'pp-reviewer', name: 'reviewer', role: 'Brief & flow review', model: 'Sonnet', access: 'Read-only', desc: 'Reviews a locked brief or a flow change for correctness, safety and parity with the reference monolith. Flags issues, never fixes them directly.' }
        ]},
        { label: 'Utility', agents: [
          { id: 'pp-eod-logger', name: 'eod-logger', role: 'End-of-day log', model: 'Sonnet', access: 'Read / Write (append)', desc: "Produces the itemized end-of-day task log in the user's Excel-log format. Read + append only — never deletes." }
        ]}
      ]
    }
  };

  function renderCrew(root) {
    var tabsHost = root.querySelector('.js-tabs');
    if (!tabsHost) return;
    var keys = Object.keys(CREWS);
    tabsHost.innerHTML = keys.map(function (k) {
      return '<button class="crew__tab" type="button" data-crew="' + k + '">' + CREWS[k].label + '</button>';
    }).join('');
    tabsHost.querySelectorAll('.crew__tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderCrewBody(root, btn.getAttribute('data-crew'));
      });
    });
    renderCrewBody(root, keys[0]);
  }

  function renderCrewBody(root, crewKey) {
    var crew = CREWS[crewKey];
    if (!crew) return;

    root.querySelectorAll('.crew__tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-crew') === crewKey);
    });

    var leadHost = root.querySelector('.js-lead');
    if (leadHost) leadHost.innerHTML = crew.lead;

    var all = {};
    all[crew.orchestrator.id] = crew.orchestrator;
    crew.tiers.forEach(function (t) { t.agents.forEach(function (a) { all[a.id] = a; }); });

    var orchHost = root.querySelector('.js-orch');
    if (orchHost) {
      orchHost.innerHTML =
        '<div class="orch-card agent" data-agent="' + crew.orchestrator.id + '">' +
          '<div class="agent__name" style="justify-content:center">' +
            '<span class="agent__dot" style="background:' + MODELS[crew.orchestrator.model].color + '"></span>@' + crew.orchestrator.name + '</div>' +
          '<div class="agent__role">' + crew.orchestrator.tagline + '</div>' +
        '</div>';
    }

    var tiersHost = root.querySelector('.js-tiers');
    if (tiersHost) {
      tiersHost.style.gridTemplateColumns = 'repeat(' + crew.tiers.length + ', 1fr)';
      var html = '';
      crew.tiers.forEach(function (tier) {
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
    }

    var detailHost = root.querySelector('.js-detail');
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
    select(crew.orchestrator.id);
  }

  /* ============================================================
     CONTACT FORM (POSTs to Apps Script -> Gmail)
     ============================================================ */
  function initContactForm(root) {
    var form = root.querySelector('.msgform__form');
    if (!form) return;
    var status = form.querySelector('.msgform__status');
    var submitBtn = form.querySelector('.msgform__submit');
    var origLabel = submitBtn.textContent;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.busy === '1') return;

      var name = (form.elements['name'].value || '').trim();
      var email = (form.elements['email'].value || '').trim();
      var message = (form.elements['message'].value || '').trim();

      if (!name || !email || !message) { setStatus(status, 'Please fill all fields.', false); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus(status, 'Please enter a valid email.', false); return; }

      var data = new URLSearchParams();
      data.append('name', name);
      data.append('email', email);
      data.append('message', message);
      data.append('_hp', form.elements['_hp'].value || '');

      form.dataset.busy = '1';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      setStatus(status, '', null);

      fetch(APPS_SCRIPT_URL, { method: 'POST', body: data })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.success) {
            form.reset();
            setStatus(status, "Thanks — your message landed in my inbox. I'll reply soon.", true);
          } else {
            throw new Error((j && j.error) || 'Send failed');
          }
        })
        .catch(function () {
          setStatus(status, 'Send failed. Email aajreyes1996@gmail.com directly?', false);
        })
        .then(function () {
          form.dataset.busy = '';
          submitBtn.disabled = false;
          submitBtn.textContent = origLabel;
        });
    });
  }

  function setStatus(el, msg, ok) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'msgform__status' + (ok === true ? ' msgform__status--ok' : ok === false ? ' msgform__status--err' : '');
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
    openApp('contact');  // open first so About ends up focused on top
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
