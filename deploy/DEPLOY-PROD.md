# Production deploy — gira-scrumlord behind a Cloudflare tunnel

The whole app on one Docker host, exposed only through a `cloudflared` tunnel
(no published ports). Reference deploy: `gira.garridinsi.dev` on a Hetzner box.

## Topology

```
browser ──HTTPS──▶ Cloudflare edge ──▶ cloudflared (container) ──▶ web:8080 (nginx)
                                                                     ├─ SPA (static)
                                                                     └─ /api ─▶ api:3000
                                          postgres · scrumlord · sauron (internal only)
```

## Prerequisites

- Docker + Compose v2 on the host.
- A Cloudflare account that manages the zone (`garridinsi.dev`).
- For email: Google Workspace **SMTP relay** with the host's egress IP allowlisted
  (Admin console → Apps → Google Workspace → Gmail → Routing → SMTP relay service),
  sending as `noreply@<domain>`. No password needed.

## 1. Get the code + config

```bash
git clone https://github.com/garridinsi/gira-scrumlord.git
cd gira-scrumlord/deploy
cp .env.prod.example .env          # then edit: SESSION_SECRET, POSTGRES_PASSWORD, APP_URL, MAIL_FROM
#   SESSION_SECRET:  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 2. Create the Cloudflare tunnel (one-time)

Run `cloudflared` (installed on the host, or `docker run` the image). Authorize the
zone once in a browser, create the tunnel, and let it write the DNS record:

```bash
cloudflared tunnel login                                  # opens a URL → authorize garridinsi.dev
cloudflared tunnel create gira-scrumlord                  # prints <UUID>, writes ~/.cloudflared/<UUID>.json
cloudflared tunnel route dns gira-scrumlord gira.garridinsi.dev   # creates the CNAME in Cloudflare

# wire the tunnel into the stack:
mkdir -p cloudflared
cp ~/.cloudflared/<UUID>.json cloudflared/
cp cloudflared/config.example.yml cloudflared/config.yml  # then set tunnel: <UUID> and credentials-file
```

## 3. Bring it up

```bash
docker compose -f docker-compose.prod.yml up -d --build   # builds images, migrates, starts everything
```

## 4. Create the superadmin

```bash
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm --filter @gira/db exec tsx prisma/make-admin.ts info@enekogarrido.com
```

Then open `https://gira.garridinsi.dev`, enter that email, and click the magic link.

## Operations

- **Health:** `docker compose -f docker-compose.prod.yml exec api wget -qO- http://localhost:3000/health`
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f api cloudflared`
- **Update:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`
- **Backup:** `docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U gira gira | gzip > gira-$(date +%F).sql.gz`
- The API refuses to boot in production with a placeholder `SESSION_SECRET`; cookies
  are `Secure` (TLS terminates at Cloudflare). Keep `ALLOW_PRIVATE_WEBHOOKS=false`.
