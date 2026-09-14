# Admin shell and enquiries — design

Phase 1C-1. Written 2026-09-14.

## The problem

The site is about to be self-hosted on a real domain, and the contact form
works. Enquiries land in the `Lead` table and nobody can read them. There is no
admin interface of any kind: `apps/web/app` contains only the public marketing
routes, and its middleware is pure next-intl.

What already exists is more than it first appears. The API's authentication was
built in Phase 1A and is sound — argon2id hashing, httpOnly cookies, a 15-minute
access token, a 7-day refresh token that rotates on every use, and revocation of
every token for a user on logout. `GET /api/leads` and `PATCH /api/leads/:id`
are already behind `JwtGuard`. Eleven other content areas already have guarded
write routes.

So this is not "build authentication". The lock and key are fitted. This builds
the door.

## Scope

**In:** a login screen, a session that survives a page reload, route protection,
an enquiry inbox, an enquiry detail view with status and internal notes, and an
email to the company when an enquiry arrives.

**Out, deliberately:** content editing (Phase 1C-2), write routes for furniture
and client logos (Phase 1C-3), password reset, and any second factor. Admin
accounts are seeded; there will be one or two of them.

## A security gap this uncovered

`POST /api/auth/login` has no rate limit. `ThrottlerModule` is registered, but
it is not installed as an `APP_GUARD`, so it only applies where a controller
writes `@UseGuards(ThrottlerGuard)` — which today is the public lead form alone.
Login can be attempted as fast as the network allows.

argon2 makes each guess expensive, which raises the attacker's cost but is not a
defence on its own. **This must be closed before the site is reachable from the
internet**, and it is part of this phase rather than a follow-up.

The fix is narrow: throttle `POST /api/auth/login` to **10 attempts per 15
minutes per IP**. That is generous for someone who mistypes a password and
useless for a guessing attack. Installing the throttler globally would be the
broader fix, but it changes the behaviour of every existing route at once and
belongs in its own change with its own testing.

## Where the admin lives

`/admin`, outside the `[locale]` tree.

The admin is English-only — the content it edits is bilingual, but the buttons
around it need not be, and translating an interface two people will use doubles
the work for no reader. Locale-prefixing it would also make every admin URL
carry a language that means nothing there.

Two consequences:

- **Middleware.** Its matcher currently catches everything except Next
  internals, so `/admin` would be redirected to `/en/admin`. `admin` joins the
  exclusion list.
- **robots.txt.** It already disallows `/en/admin` and `/bn/admin`, written
  before the location was settled. `/admin` is added. The old entries stay —
  they cost nothing and cover anything already crawled.

Routes:

| Route | Purpose |
|---|---|
| `/admin/login` | email + password |
| `/admin` | the inbox — enquiries, newest and unread first |
| `/admin/enquiries/[id]` | one enquiry, its status and notes |

## How the browser talks to the API

Directly, with `credentials: "include"`, the way the public lead form already
does.

`main.ts` records why the lead form posts straight from the browser: the
throttler is per-IP, so routing submissions through Next.js would collapse every
visitor onto a single budget. The same reasoning applies to login — proxied
login attempts would share one rate-limit bucket, and an attacker could exhaust
it to lock the real staff out. Talking directly keeps per-IP limits meaningful.

CORS is already configured for this: `credentials: true` with an origin
allowlist read from `WEB_ORIGIN`.

**This requires the site and the API to be same-site in production** — for
example `homeinnbd.com` and `api.homeinnbd.com` — so that `sameSite: lax`
cookies are sent. One domain, self-hosted, satisfies this naturally. It is a
genuine constraint on hosting and is recorded here so it is not discovered
later.

### The consequence: a first-paint flash

Cookies set on `api.<domain>` are not sent to `<domain>`, so the Next.js server
cannot see them and cannot check authentication before rendering. Admin pages
therefore render a skeleton, ask `GET /api/auth/me`, and redirect to the login
screen if that fails.

A logged-out visitor briefly sees an empty admin frame. **No data leaks**: every
figure on those screens comes from a guarded API call that returns 401. The cost
is cosmetic.

If the flash becomes annoying, setting the cookie's `domain` to `.<domain>`
would let the Next.js middleware see it and redirect before paint. That is a
small API change, deliberately not taken now: a cookie scoped to the parent
domain is sent to every subdomain, which is a wider blast radius than this phase
needs.

## Session handling

One module, `lib/admin-api.ts`, owns every authenticated request.

- Every call sends `credentials: "include"`.
- On `401`, it calls `POST /api/auth/refresh` **once**, then retries the
  original request once.
- If the refresh also fails, it clears local state and redirects to
  `/admin/login?next=<path>`.
- Concurrent 401s share a single in-flight refresh, so six parallel requests
  cannot rotate the refresh token six times. Rotation invalidates the previous
  token, so racing refreshes would log the user out — this is the subtle bug
  this rule exists to prevent.

Keeping the refresh-once rule in one place is the point. Spread across
components it becomes six slightly different rules.

## The inbox

`GET /api/leads` is already paginated and guarded.

A table: received, name, phone, type, status, source page. Status is a filter,
defaulting to a view that puts `NEW` first — the question the page exists to
answer is "who has not been answered yet".

The detail view shows the whole message, the service asked about, the language
the visitor used, and the page they came from. It puts the phone number behind
`tel:` and WhatsApp links so the reply happens from here rather than after
copying a number into another app. Status and internal notes save through
`PATCH /api/leads/:id`.

`LeadStatus` already models the lifecycle: `NEW → CONTACTED → QUALIFIED →
WON | LOST`.

## Email on a new enquiry

A panel nobody opens is the same as no panel. When a lead is created, the API
emails the company.

**The rule that matters: notification failure must never fail the enquiry.** The
send happens after the row is committed, and its errors are caught and logged.
A visitor who fills in the form gets their confirmation whether or not Gmail is
reachable, and the lead is in the database either way. Getting this backwards —
letting a dead SMTP server reject a customer — would be worse than having no
notification at all.

Nodemailer over Gmail SMTP with an app password. Configuration by environment:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `LEAD_NOTIFY_TO`. When
unset, the sender logs and does nothing, so development and tests need no mail
server.

The email carries the name, phone, type, service and message, and a link to the
enquiry in the admin.

## Testing

- **`adminFetch`** — refreshes once and retries; gives up and redirects when the
  refresh fails; concurrent 401s trigger exactly one refresh.
- **Login throttle** (API e2e) — the eleventh attempt inside the window is
  rejected. Without this test the guard can silently stop working.
- **Notification isolation** (API unit) — when the mailer throws, the lead is
  still created and the request still succeeds.
- **Inbox** — renders rows, filters by status, saves a status change.
- **Login form** — validation, the error shown on bad credentials, and that the
  password never reaches the URL or local storage.
- **Accessibility** — axe on the login screen and the inbox, as every other
  route in this project already does.

## What the user must supply

- A Gmail **app password** for `homeinnbd14@gmail.com` (an ordinary password
  will not work for SMTP).
- The real admin email and a strong password for the seeded account, through
  `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

  **Two traps here, both able to hand the panel to a stranger.**

  The defaults are `admin@homeinnbd.com` and `ChangeMeNow!2026`, and they are
  written in `seed.ts`, which is on GitHub. Deploying without setting these
  means the admin password is published. It has to be set before the site is
  reachable, not after.

  And the seed's admin upsert is `update: {}` — by design, so re-seeding never
  overwrites a live account. The side effect is that setting
  `SEED_ADMIN_PASSWORD` *after* the account exists does nothing, silently. The
  password must be changed deliberately, and the plan needs a way to do it: a
  small `pnpm admin:password` script, since this phase has no password-change
  screen.
- The domain, once bought, so `WEB_ORIGIN` and the cookie settings can be set.

## Open question

Hosting moved from the Linux desktop to a Mac, and the earlier CGNAT finding was
measured on the desktop's connection. If the Mac sits on the same home network,
the same constraint applies and the Cloudflare Tunnel plan stands. Worth
re-measuring on the Mac before assuming either way.
