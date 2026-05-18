# Aa OS — Portfolio of Aa Reyes

An interactive portfolio built as a **simulated desktop operating system**. It boots up,
has draggable windows, a working terminal, a dock, and apps for each part of the portfolio.
Inspired by henryheffernan.com — the medium (an agentic dev environment) is the message.

Vanilla HTML/CSS/JS — **no framework, no build step.**

## Files

- `index.html` — page shell + window-content `<template>` blocks (all the copy lives here)
- `styles.css` — OS chrome (desktop, windows, dock, boot) + content styling
- `script.js` — window manager, boot sequence, terminal command parser, agent crew, mobile view
- `game.js` — Glyph Quest, the built-in turn-based mini-RPG

## The apps

- **About** — bio, animated metrics, at-a-glance facts
- **Projects** — a Finder-style browser: Aa-SaaS Studio, WWE System, Content Pipeline (the venture), RARR Platform (flagship), plus earlier wins
- **Agent Crew** — interactive 16-agent Claude Code orchestration diagram
- **Terminal** — a real command line: `help`, `ls projects`, `open wwe`, `whoami`, `neofetch`, `sudo hire-me`…
- **Tech Stack** — the toolkit, grouped
- **Contact** — email, GitHub, LinkedIn, CV

## View it locally

Open `index.html` in a browser — no server needed. For a local server:
```bash
cd ~/projects/career/portfolio
python -m http.server 8000   # then visit http://localhost:8000
```

## How it adapts

- **Desktop** (≥760px) — the full Aa OS: boot, draggable windows, dock.
- **Mobile** (<760px) — automatically becomes a clean stacked, scrollable layout.
- **"Plain view"** button (top-right) — switches the desktop to the same stacked layout, for
  recruiters who'd rather skim than click around.

## Before you publish — edit these

1. **Contact links** — in `index.html`, search `EDIT CONTACT LINKS` (inside
   `<template id="tpl-contact">`) and replace the email, GitHub, and LinkedIn URLs.
   The email is currently your work address — consider a personal one for job hunting.
2. **CV** — drop your CV into this folder as `Aa-Reyes-CV.pdf` (PDF beats `.docx` for web).
3. **Agent count** — the site says "16-agent crew" to match your CV. Your latest vault note
   (`projects/rarr-platform/claude-code-agent-architecture.md`) says 15 per repo. Pick one
   number and keep it consistent across CV, portfolio, and interviews.

## Deployment

This repo auto-deploys to a VPS via GitHub Actions — every push to `main` rsyncs
the site to the server over SSH (`.github/workflows/deploy.yml`). One-time setup
(SSH deploy key, repo secrets, nginx, SSL) is documented in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

No build step — it's plain static files.

## Notes

- Dark theme, responsive, respects `prefers-reduced-motion` (boot + animations shorten).
- Boot sequence is click-to-skip.
- Fonts load from Google Fonts; everything else is self-contained.
