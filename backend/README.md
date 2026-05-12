# Backend (Bulk Mail)

Express API. Reads SMTP `user` / `pass` from MongoDB collection **`bulkmail`** (MongoDB via **`MONGODB_URI`** on the host, or `backend/.env` locally — `.env` is gitignored and never committed). Persists every send to the **`email_history`** collection.

Routes:

- **`POST /sendmail`** — JSON `{ "subject"?: string, "msg": string, "emailList": string[] }`. `subject` is optional (defaults to `BULK_MAIL_SUBJECT` env or `"Bulk mail"`). Returns `{ ok: true, sent: <number> }`. Each call also writes one row into `email_history` (subject, body preview, recipient preview, status, sent/total counts, provider, error info).
- **`POST /admin/login`** — JSON `{ "username", "password" }`. Returns `{ ok: true, token, expiresAt }` (HMAC-signed session, 8h default). Rate-limited.
- **`GET /admin/me`** — verifies the bearer token. Returns `{ ok: true, username, expiresAt }` or `401`.
- **`GET /admin/status`** — public; reports whether admin login is configured on the server.
- **`GET /history`** — admin-only. Returns paginated rows from `email_history` (newest first; `?limit=50&skip=0`).
- **`GET /health`** returns plain **`ok`** (simple probes).
- **`GET /health/diagnostics`** returns JSON uptime/Mongo thresholds; optional gated SMTP **`verify`** (see **`../DEPLOYMENT.md`**).

**Deployed API:** [https://bulk-mailer-ehdq.onrender.com](https://bulk-mailer-ehdq.onrender.com) — used by the Vercel app [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/).

## Scripts

```bash
npm install
npm start      # listens on PORT (host-injected) or 5000 locally
```

## Ops & CORS / production checklist

Canonical steps and env vars live in **`../DEPLOYMENT.md`** (Render/Vercel/Atlas/Gmail/SMTP).

**Runtime order:** **`cors` → limit-size `express.json` → `GET /health` routes → _(after Mongo connects)_ → `POST /sendmail` → `404` → centralized error middleware → `listen`** on **`process.env.PORT || 5000`** and **`0.0.0.0`**.

CORS **`origin`** is an allow-list (production Vercel URL + localhost Vite ports + optional **`FRONTEND_ORIGINS`**). **`OPTIONS`** preflight is handled by the **`cors`** package (do not use **`app.options('*')`** on Express 5).

If **`sendmail`** shows no CORS headers, confirm **`OPTIONS`** + **`POST`** in DevTools — if **`GET /health`** fails, the host is not accepting traffic yet (**`502`** is often boot/crash/offline, not the browser blocking JSON).

### `502` / upstream connection refused

The host reached your service but nothing accepted TCP on the port it probes — **not** a CORS bug. Typical causes:

1. **Process exited on boot** — e.g. missing **`MONGODB_URI`** → this app calls **`process.exit(1)`** before **`listen()`**. Fix variables on the **same** service → check Deploy logs until you see **`HTTP listening on 0.0.0.0:…`**.
2. **Wrong start / root directory** — service must run **`npm start`** from **`backend/`** (folder that contains **`package.json`** + **`index.js`**).
3. **Port mismatch** — the app listens on **`process.env.PORT`** (preferred, host-injected) or falls back to **5000**. Align the host’s exposed port with what the process logs.

## Environment

Copy [.env.example](.env.example) to `.env`. Never commit `.env` (already gitignored). The example file ships placeholders only — no real credentials.

Set **one** of these with your full MongoDB URI (host dashboard or local `.env`):

| Variable | Notes |
|----------|--------|
| `MONGODB_URI` | Preferred |
| `DATABASE_URL`, `MONGO_URL`, `MONGODB_URL` | Alternatives, same spelling as in Atlas / host docs |

The host does **not** read `.env` from Git; define variables on the **same service** that runs `node index.js`, **save**, then redeploy.

## MongoDB data

Default DB comes from your connection string path.

| Collection | Purpose |
|------------|---------|
| **`bulkmail`** | One document with string fields `user` + `pass` used by Gmail / Nodemailer. **Credentials never reach the browser** — only the backend reads them. |
| **`email_history`** | Auto-created. One document per `POST /sendmail` invocation (subject, body preview, recipient preview/total, sent count, status, provider, timestamp, error). Read by `GET /history`. |

For Gmail with 2FA, use an [App Password](https://support.google.com/accounts/answer/185833).

## Admin auth

`GET /history` is gated by a bearer token. Set these on the host before enabling the admin UI:

| Variable | Required | Notes |
|----------|----------|-------|
| `ADMIN_USERNAME` | ✅ | Picks the login username. |
| `ADMIN_PASSWORD` | ✅ | Strong, random — used only for HMAC-signed sessions. |
| `ADMIN_SESSION_SECRET` | optional | Override the default HMAC secret. |
| `ADMIN_SESSION_TTL_HOURS` | optional | Session lifetime (default `8`). |

If both `ADMIN_USERNAME` and `ADMIN_PASSWORD` are unset, `/admin/login` returns `503 ADMIN_NOT_CONFIGURED` and `/history` is unreachable — by design. The frontend modal explains how to enable it.

## Deploy (Render)

1. Service **root directory:** `backend` (so `npm start` runs this `package.json`).
2. **Build:** `npm install` — **Start:** `npm start`.
3. Variables: **`MONGODB_URI`** (required). Render injects **`PORT`** automatically.
4. Logs to confirm healthy boot: **`[mongo] connected`** and **`[http] listening on 0.0.0.0:…`**.

**Atlas:** allow your host’s egress IPs (often `0.0.0.0/0` for serverless/cloud) under Network Access.

> Prefer an alternative host? The same `npm start` works on Fly, Heroku, Railway, or a VM — set `MONGODB_URI` and expose the port the process logs at boot.

## Troubleshooting

- **`missing` env in logs** → variable not on this service or wrong environment; save variable and redeploy.
- **`Authentication failed`** → wrong DB user/password; URL-encode special characters in the URI password.
- **Timeouts / server selection** → cluster paused, DNS/host typo, or IP allowlist.
