# Hosting Home Inn on the Mac

Home Inn runs on the hosting MacBook alongside its other sites, using that
machine's setup in `~/Development/Hosting` (its `README.md` and `HANDOUT.md` are
the authority for the shared parts: Cloudflare Tunnel → Caddy → launchd).

```
homeinn.xyz, www  ─┐                       ┌─▶ 127.0.0.1:3200  homeinn-web  (next start)
api.homeinn.xyz   ─┴─▶ tunnel ─▶ Caddy :8080 ┴─▶ 127.0.0.1:4200  homeinn-api  (node dist/main.js)
                                                     │
                                         Postgres 18 (Homebrew) localhost:5433 / homeinn
```

## Pieces

| Here | What it does |
| --- | --- |
| `deploy/host-build.sh` | Installs the locked dependencies, applies migrations, builds types, API and web. Run by `hosting deploy homeinn`. |
| `deploy/start-api.sh`, `deploy/start-web.sh` | launchd entry points. Each loads the repo-root `.env` and binds to loopback. |

The checkout is `~/Development/Hosting/sites/homeinn`. Its `.env` (never
committed) holds the production values. `.env.example` lists every variable.
For this host:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `postgresql://<mac user>@localhost:5433/homeinn?schema=public` (Homebrew `postgresql@18` on 5433; another Postgres already holds 5432) |
| `HOST`, `PORT` | `127.0.0.1`, `4200` |
| `WEB_PORT` | `3200` |
| `API_INTERNAL_URL` | `http://127.0.0.1:4200/api` |
| `NEXT_PUBLIC_API_URL` | `https://api.homeinn.xyz/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://homeinn.xyz` |
| `PUBLIC_MEDIA_BASE_URL` | `https://api.homeinn.xyz/media` |
| `WEB_ORIGIN` | `https://homeinn.xyz,https://www.homeinn.xyz` |
| `UPLOAD_DIR` | an absolute path under the checkout, e.g. `.../sites/homeinn/uploads` |
| `NODE_ENV` | `production` (secure cookies) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REVALIDATE_SECRET` | long random strings (`openssl rand -hex 32`) |
| `WEB_REVALIDATE_URL` | `http://127.0.0.1:3200/api/revalidate` |
| `NODE_BIN_DIR` | `/opt/homebrew/opt/node@24/bin`: Home Inn's own Node (pnpm 11 needs ≥ 22.13; the host's shared Node is older and serves the other sites) |
| `SMTP_*`, `LEAD_NOTIFY_TO` | optional, for enquiry emails |

`NEXT_PUBLIC_*` are fixed when the site is built: change them, then deploy.

## Deploying an update

Push to `main` from the desktop, then run either:

- on the Mac: `hosting deploy homeinn`
- from the desktop: `ssh mac 'bash ~/Development/Hosting/scripts/hosting.sh deploy homeinn'`

The deploy fast-forwards the checkout and runs `deploy/host-build.sh`. It
then restarts the API, then the site, and checks both.

## DNS (once)

The domain's nameservers must be Cloudflare's. Then add these records in
the `homeinn.xyz` zone, all **proxied** (orange cloud):

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `@` | `<tunnel id>.cfargotunnel.com` |
| CNAME | `www` | same |
| CNAME | `api` | same |

The tunnel id is in the Mac's `~/Development/Hosting/cloudflared/config.yml`.
