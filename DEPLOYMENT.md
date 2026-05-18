# Deployment

This site auto-deploys to a VPS via GitHub Actions. On every push to `main`,
`.github/workflows/deploy.yml` rsyncs the static files to the server over SSH.

It's plain static files — **no build step**. The workflow just copies files;
nginx serves them.

## Overview

1. (One-time) Generate an SSH deploy key and add it to the VPS.
2. (One-time) Add 4–5 secrets to the GitHub repo.
3. (One-time) Prepare the deploy directory on the VPS.
4. (One-time, after you own a domain) Configure nginx + SSL.
5. From then on: **push to `main` → the site updates automatically.**

---

## 1. Create an SSH deploy key

Generate a key pair dedicated to deployment (don't reuse a personal key):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
```

This creates `deploy_key` (private) and `deploy_key.pub` (public).
Both are git-ignored — never commit them.

Add the **public** key to the VPS deploy user:

```bash
ssh-copy-id -i deploy_key.pub <user>@<vps-host>
# or manually append deploy_key.pub to ~/.ssh/authorized_keys on the VPS
```

## 2. Add GitHub repo secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value | Required |
|---|---|---|
| `VPS_HOST` | VPS IP address or hostname | yes |
| `VPS_USER` | SSH username used for deploys | yes |
| `VPS_SSH_KEY` | Full contents of the **private** `deploy_key` file | yes |
| `VPS_DEPLOY_PATH` | Absolute web-root path, e.g. `/var/www/portfolio` | yes |
| `VPS_SSH_PORT` | SSH port — set only if it is not `22` | optional |

> The workflow runs `rsync --delete`, so `VPS_DEPLOY_PATH` must be a directory
> used **only** for this site. Never point it at a home folder or a shared path.

## 3. Prepare the VPS

```bash
sudo mkdir -p /var/www/portfolio
sudo chown -R <user>:<user> /var/www/portfolio   # <user> = VPS_USER, so rsync needs no sudo
```

## 4. nginx + domain + SSL  (after you've bought a domain)

1. Point the domain's DNS **A record** at the VPS IP.
2. Copy `deploy/nginx.conf.example` to the VPS, replace `YOUR_DOMAIN`, then:
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/portfolio
   sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. Add HTTPS with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
   ```

## Triggering a deploy

- **Automatic** — push to `main`.
- **Manual** — repo → **Actions** → "Deploy to VPS" → **Run workflow**.

The very first run (before secrets exist) fails on purpose with a message
listing the missing secrets — that is expected.

## Before the domain is ready

You can deploy and verify immediately — set the secrets, push, and the files
land in `VPS_DEPLOY_PATH`. Point nginx's default site at that path, or just
confirm the files arrived, then wire the real domain later.

## Note: the workflow file needs the `workflow` token scope

Adding or editing files under `.github/workflows/` and pushing them requires a
GitHub token with the `workflow` scope. If a push is rejected for this reason:

```bash
gh auth refresh -h github.com -s workflow
```

Complete the browser prompt, then push again.
