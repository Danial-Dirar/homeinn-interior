# Admin panel — design

Written 2026-10-13. It supersedes the scope split in
`2026-09-14-admin-shell-and-enquiries-design.md`: that spec's three phases
(shell + enquiries, content editing, furniture and client logos) are built
together. Everything that spec decided still holds unless this one says
otherwise.

Muhammad, 2026-10-12, before going offline:

> "ekta admin panel banate thak, jekhane message dekhte pabo, oije 'Contact
> Us' e keu kisu likhle, and shudhu tai na, aro ja ja ase … domain/admins e
> shob accessible hobe … ja ja lagbe shob dish admin panel e"

He asked not to be asked anything, so every open choice below is a ruling,
listed at the end.

## Where it lives

`/admins` on the web origin, outside the `[locale]` tree. `/admin` redirects
there, so the older spec's address still works.

- **The middleware** skips `admins` and `admin`, so next-intl never prefixes
  them.
- **robots.txt** disallows `/admins` and `/admin`.
- **Admin pages are `noindex`.**
- **The chrome is English only.** Content fields are bilingual, side by side.

## How the browser talks to the API

Directly, with `credentials: "include"`, as the 2026-09-14 spec decided. One
module, `lib/admin/api.ts`, owns every authenticated request:

- On a `401`, it calls `POST /api/auth/refresh` once and retries once.
- Concurrent 401s share one refresh.
- When the refresh fails, it goes to `/admins/login?next=<path>`.

The panel renders a skeleton until `GET /api/auth/me` answers. No data leaks
before that: every figure comes from a guarded call.

## API changes

| Change | Why |
| --- | --- |
| **Login throttle:** 10 attempts per 15 minutes per IP. The limit is read from `LOGIN_THROTTLE_LIMIT` at request time. | Blocking finding #1 of the 2026-09-14 spec. |
| `app.set("trust proxy", TRUST_PROXY ?? "loopback")` | The site will sit behind a local tunnel. Without this, every visitor shares the tunnel's IP, so per-IP limits collapse into one bucket. |
| **Admin read surface:** `GET /api/admin/summary`, `GET /api/admin/:resource` and `GET /api/admin/:resource/:id`, all JWT-guarded. | The public reads return published rows only, and by slug. An editor needs drafts too, and needs them by id with every relation included. A single registry drives all twelve resources. |
| Write routes for **furniture** (`/products`), **client logos** (`/client-logos`), **corporate clients** and **residential clients** (`/clients/corporate`, `/clients/residential`). | Phase 1C-3 of the old spec. |
| **Leads:** `?status=` filter, the service included in each row, `GET /leads/:id`, and `DELETE /leads/:id` (admin only). | The inbox and the detail view, plus a way to clear spam. |
| `PATCH /media/:id` for alt text, and `?q=` search on `GET /media`. | Alt text is required on upload and must stay correctable. |
| **Accounts:** `POST /api/auth/password` to change your own password; `GET/POST/PATCH/DELETE /api/users` (admin only). Deleting yourself or the last admin is refused. | There is no other way to rotate the seeded password or add a second person. |
| `pnpm admin:password <email>` | The script the old spec required, for the seeded account that `update: {}` will never touch. |
| **Email on a new lead**, through nodemailer. Off unless `SMTP_*` and `LEAD_NOTIFY_TO` are set. A failure to send is logged and never fails the lead. | The old spec's notification, unchanged. |
| **Revalidation:** after every successful write, the API posts the affected cache tags to the web app's `POST /api/revalidate`, using a shared secret. It is off unless `WEB_REVALIDATE_URL` and `REVALIDATE_SECRET` are set. | Without it, an edit takes up to five minutes (the fetch cache) to appear. |
| **Nullable optional fields** in the write schemas: cover, photo, logo, price, year and the like accept `null`. A project's location may be empty. | An editor must be able to remove a cover or a price. The seeded villas have no location, and must stay editable. |

## The panel

| Route | What |
| --- | --- |
| `/admins/login` | Email and password. Shows the 401 and 429 messages in plain words. |
| `/admins` | **Overview.** It says, as a sentence, how many enquiries are waiting, then lists the latest five. Below that, links into each content area. No stat tiles (Muhammad has rejected the big-number look). |
| `/admins/enquiries` | **Inbox.** Status tabs, with "New" first; paginated. |
| `/admins/enquiries/[id]` | **One enquiry.** The whole message, with call, WhatsApp and email links. Status and notes can be edited. Deleting is admin only. |
| `/admins/[resource]` | **A content list.** Thumbnail, title, Published / Draft / Featured, and order. |
| `/admins/[resource]/new` and `/admins/[resource]/[id]` | **The editor**, generated from a field registry. |
| `/admins/media` | **The library.** Upload with alt text in both languages, edit alt text, delete. Deleting an image that is in use shows the API's 409 message. |
| `/admins/settings` | **Contact details, social links and the headline figures.** |
| `/admins/users` | **Accounts** (admins only). |
| `/admins/account` | **Change your own password.** |

### One field engine, not twelve forms

`lib/admin/resources.ts` describes each resource:

- its endpoints, its list columns and its title
- its fields, each a `{ name, label, kind, bilingual?, required?, help? }`

The field kinds:

| Kind | Notes |
| --- | --- |
| `text`, `textarea`, `number` | |
| `richtext` | Tiptap. The toolbar offers only what `sanitizeRichText` allows. |
| `boolean`, `select` | |
| `relation` | Options come from another resource. |
| `icon` | Chosen from the site's icon map. |
| `media` | A picker over the library, with upload. |
| `gallery` | An ordered list of media. |
| `money` | Entered in taka, sent as poisha. |
| `tags`, `date`, `url` | |

One `ResourceForm` renders any of them. One `toPayload` turns form values into
the API's shape:

- bilingual pairs become `xEn` / `xBn`
- media becomes an id
- an empty optional field becomes `null`

That is where the tests concentrate.

The resources:

- Projects
- Services
- Working areas
- Furniture
- Hero
- Testimonials
- Team
- Certifications
- Client logos
- Corporate clients
- Residential clients
- Blog

Residential clients carry a privacy note: names never reach the public site
unless "publicly listed" is ticked.

### Look

The panel uses the site's own tokens: cream ground, charcoal text, the brand
orange for primary actions. Headings are in Righteous and the body in Geist,
in one calm, light layout. A sidebar is grouped by job: Inbox, Work, Home page,
Company, Journal, Library, Site. On a phone the sidebar becomes a sheet.

## Testing

**API e2e:**

- every new route, unauthenticated (401) and editor-versus-admin (403 on
  deletes)
- the eleventh login inside the window gets a 429
- the lead status filter
- deleting yourself or the last admin is refused
- a password change takes effect

**API unit:**

- a mailer failure never fails a lead
- the revalidation path-to-tag map, which never fires on a GET or on the public
  lead form

**Web unit:**

- `adminFetch`: refresh once, a single shared refresh, redirect on failure
- `toPayload`
- the login form's error messages, and that it never puts the password in the
  URL
- the inbox filter
- the generated form, against the registry
- `/api/revalidate`: refuses a wrong secret, and only revalidates known tags

**Browser:** log in, read an enquiry, change its status, edit a project, upload
an image. Then axe on the login screen, the overview, the inbox and an editor.

## What Muhammad must supply before going live

| What | Why |
| --- | --- |
| `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, or `pnpm admin:password` after deploy | Blocking finding #2 of the old spec: the default password is public on GitHub. |
| A Gmail app password, as `SMTP_*` and `LEAD_NOTIFY_TO` | For enquiry emails. |
| The domain | For `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`, and same-site cookies (`homeinn-interior.com` and `api.homeinn-interior.com`). |
| `REVALIDATE_SECRET`, set on both apps, and `WEB_REVALIDATE_URL` on the API | For instant updates. |

## Rulings (made without asking, as instructed)

1. **`/admins`, not the older `/admin`.** Muhammad wrote "domain/admins".
   `/admin` redirects.
2. **All three old phases in one build.** He asked for "ja ja lagbe shob".
3. **A generic admin read surface** rather than an admin route per controller.
   It keeps the twelve resources in one tested registry.
4. **API-to-web revalidation with a shared secret.** The browser cannot hold a
   secret, and the web server cannot see the API's cookies.
5. **SEO overrides** (`Seo` rows) are not editable yet. Every page already has
   generated metadata, so this is deferred.
6. **No password reset by email, and no second factor.** These were out of
   scope in the old spec and still are; `admin:password` covers a lost
   password.
