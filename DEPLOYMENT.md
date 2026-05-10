# Bulk mailer — production deployment

This follows the hardened Express + Vite stack in this repo (see `backend/index.js` and `frontend/src/App.jsx`).

## Detected issues (historical → fixed in code where applicable)

| Issue | Impact | Mitigation applied |
|--------|--------|-------------------|
| `app.listen()` before MongoDB connected | Routes served while DB down; flaky `/sendmail` | `await mongoose.connect()` before registering `/sendmail` and `listen()` |
| 404/error middleware mounted before `/sendmail` | `POST /sendmail` never reached | `/sendmail` registered before 404 and central error handler |
| CORS preflight / origin | Railway or browser oddities | `app.use(cors)` + **`app.options(/.*/, cors)`** (Express 5 cannot use path `'*'`) + explicit allow-list; **403** `CORS_BLOCKED` on bad origin |
| No `trust proxy` on Railway | Rate limit keyed badly; weird client IP behavior | `app.set('trust proxy', …)` |
| No request validation | 500 / odd errors on bad payloads | `validateSendMailBody` → 400 JSON |
| Sequential `sendMail` without timeout | Hung requests → gateway 502/timeouts | `withTimeout()` per message + configurable SMTP timeouts |
| Weak error handling | Unhandled async → process issues | Wrapped async route with `.catch(next)` + central error middleware |
| App password spacing in MongoDB | Rare auth failures | Pass normalized with `.replace(/\s+/g,'')` |
| Wrong Mongo default DB (`test`) when URI has no `/dbname` | No `bulkmail` doc found | Warn on boot; docs + `MONGO_DB_NAME` |
| Frontend only treated `res.data === true` | Broken after JSON `{ ok: true }` success | Accepts `{ ok: true }` + optional `sent` |
| axios default timeout too low for bulk | Client abort while server still sending | `VITE_API_TIMEOUT_MS` (default 180s in code) |

## Railway environment variables checklist

Required:

- **`MONGODB_URI`** — connection string MUST include **`/passkey`** (or your DB name) before `?`, e.g. `...mongodb.net/passkey?appName=...`
- **`PORT`** — usually injected by Railway; do not hardcode duplicate listen ports in Dockerfile

Highly recommended:

- **`MONGO_DB_NAME=passkey`** — if Atlas URI defaults to wrong DB despite path fixes
- **`FRONTEND_ORIGINS`** — add any extra Vercel preview URLs (`https://*.vercel.app` is **not** valid in static list; list each preview origin or rely on prod URL already in code)
- **`NODE_ENV=production`**

Operational / tuning:

- **`SENDMAIL_RATE_MAX`** / **`SENDMAIL_RATE_WINDOW_MS`** — anti-abuse
- **`MAX_RECIPIENTS`**, **`MAX_MESSAGE_CHARS`** — caps
- **`SMTP_PER_MESSAGE_TIMEOUT_MS`**, **`SMTP_SEND_GAP_MS`** — timeouts + Gmail pacing
- **`HEALTH_DIAGNOSTICS_TOKEN`** + request header **`x-health-diagnostics-token`** — optional gated SMTP verify in `/health/diagnostics`
- **`TRUST_PROXY_HOPS`** — `1` typical on Railway

## MongoDB Atlas checklist

1. Cluster running; Network Access allows **Railway outbound IPs** (or `0.0.0.0/0` for development only — tighten for strict prod).
2. Database **`passkey`**, collection **`bulkmail`**, exactly one document shaped as:

   `{ "user": "<email>", "pass": "<Google app password or SMTP secret>" }`

3. `pass` uses **Google App Password** when the mailbox is Gmail / Google Workspace (2FA enabled).
4. Connection string username/password matches a **database user** with read access to `passkey`.

## Gmail / SMTP checklist

1. Sender account has **2-Step Verification** on (consumer Gmail) or equivalent for Workspace.
2. **App password** generated (16 chars, spaces optional — server strips whitespace).
3. For **Workspace** `@customdomain`: still use **`smtp.gmail.com:465`** with that mailbox’s credentials unless you deliberately switch provider.
4. If Google returns **535 / invalid credentials**, rotate app password and update Mongo **`bulkmail.pass`**.
5. For large lists, Gmail may throttle — tune **`SMTP_SEND_GAP_MS`** and reduce batch size (`MAX_RECIPIENTS`) or migrate to a bulk provider (SendGrid, etc.; requires code changes).

## Vercel checklist

1. **`VITE_API_URL`** = `https://bulk-mailer-production-c860.up.railway.app` (no trailing slash), or bake via `.env.production`.
2. Redeploy after env changes — Vite bakes env at **build time**.
3. Optionally set **`VITE_API_TIMEOUT_MS`** (milliseconds) if you routinely send hundreds of mails per click.

## API contract

- **`GET /health`** — returns plain `ok` for simple probes.
- **`GET /health/diagnostics`** — JSON: mongo state, uptime, CORS list, thresholds. SMTP `verify()` only when **`HEALTH_DIAGNOSTICS_TOKEN`** is set server-side **and** the same value is sent in **`x-health-diagnostics-token`**.
- **`POST /sendmail`** — JSON `{ "msg": string, "emailList": string[] }`  
  Success: **`200`** `{ "ok": true, "sent": number }`.  
  Validation: **`400`** `{ ok, code: "VALIDATION_ERROR", message }`.  
  Rate limit: **`429`**. SMTP problems: commonly **`502`**. Timeouts: **`504`**.

## Postman testing

1. `GET {{BASE}}/health` → `200`, body `ok`.
2. `GET {{BASE}}/health/diagnostics` → JSON without secrets.
3. `POST {{BASE}}/sendmail`:
   - **Body** → **raw** → **JSON** (not “none”):

     `{"msg":"hello","emailList":["you@example.com"]}`

   - **Headers:** `Content-Type: application/json`  
   Without this, `express.json()` won’t parse the body and validation returns **400**.

## Frontend testing

1. Local: `frontend` → `npm run dev`, ensure backend `:5000` running (proxy avoids CORS).
2. Prod: open Vercel URL, upload small Excel column A emails, send; watch Network tab for status **200** and JSON body **`ok: true`**.

## Common Railway **502** causes

| Cause | Signal |
|---------|------|
| Process crash on boot | Logs stop before `[http] listening` |
| Mongo never connects | Logs `[mongo] connect failed`; old code exited — now exits before listen |
| Request timeouts / hung SMTP | Logs show `[sendmail] SMTP failure` / `ETIMEOUT`; increase SMTP timeouts or reduce batch |
| Crash after boot | `[process] uncaughtException` |

## Rate-limit suggestion

 Defaults target abuse protection; legitimate high-volume batches should increase **`SENDMAIL_RATE_MAX`** or move sending to a **queue/worker**. Do not expose `HEALTH_DIAGNOSTICS_TOKEN` in the browser client.
