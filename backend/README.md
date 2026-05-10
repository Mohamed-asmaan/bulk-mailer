# Backend (Bulk Mail)

Express API: **`POST /sendmail`** with JSON `{ "msg": string, "emailList": string[] }`. Reads SMTP `user` / `pass` from MongoDB collection **`bulkmail`** (MongoDB via **`MONGODB_URI`** on Railway or `backend/.env` locally).

- **`GET /health`** returns plain **`ok`** (simple probes).
- **`GET /health/diagnostics`** returns JSON uptime/Mongo thresholds; optional gated SMTP **`verify`** (see **`../DEPLOYMENT.md`**).

**Deployed API:** [https://bulk-mailer-production-c860.up.railway.app](https://bulk-mailer-production-c860.up.railway.app) — used by the Vercel app [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/).

## Scripts

```bash
npm install
npm start      # listens on PORT (Railway) or 5000 locally
```

## Ops & CORS / production checklist

Canonical steps and env vars live in **`../DEPLOYMENT.md`** (Railway/Vercel/Atlas/Gmail/SMTP).

**Runtime order:** **`cors` → limit-size `express.json` → `GET /health` routes → _(after Mongo connects)_ → `POST /sendmail` → `404` → centralized error middleware → `listen`** on **`process.env.PORT || 5000`** and **`0.0.0.0`**.

CORS **`origin`** is an allow-list (production Vercel URL + localhost Vite ports + optional **`FRONTEND_ORIGINS`**). **`OPTIONS`** preflight is handled by the **`cors`** package (do not use **`app.options('*')`** on Express 5).

If **`sendmail`** shows no CORS headers, confirm **`OPTIONS`** + **`POST`** in DevTools — if **`GET /health`** fails, the Railway service is not accepting traffic yet (**`502`** is often boot/crash/offline, not the browser blocking JSON).

### Railway **`502`** / HTTP logs **`upstream connection refused`**

Railway reached your service but nothing accepted TCP on the port it probes — **not** a CORS bug. Typical causes:

1. **Process exited on boot** — e.g. missing **`MONGODB_URI`** → this app calls **`process.exit(1)`** before **`listen()`**. Fix variables on the **same** service → **Deploy logs** until you see **`HTTP listening on 0.0.0.0:…`**.
2. **Wrong start / root directory** — service must run **`npm start`** from **`backend/`** (folder that contains **`package.json`** + **`index.js`**).
3. **Rare:** Public networking mapped to port **5000** in UI while **`PORT`** differs — the app listens on **`process.env.PORT`** (preferred) or falls back to **5000**. Align **Networking → port** with what the process listens on (check deploy log line above).

## Environment

Copy [.env.example](.env.example) to `.env`. Never commit `.env`.

Set **one** of these with your full MongoDB URI (Railway dashboard or local `.env`):

| Variable | Notes |
|----------|--------|
| `MONGODB_URI` | Preferred |
| `DATABASE_URL`, `MONGO_URL`, `MONGODB_URL` | Alternatives, same spelling as in Atlas / host docs |

Railway does **not** read `.env` from Git; define variables on the **same service** that runs `node index.js`, **save**, then redeploy.

## MongoDB data

Default DB comes from your connection string path. Expected: a document (e.g. one record) in collection **`bulkmail`** with `user` and `pass` used by Gmail / Nodemailer.

For Gmail with 2FA, use an [App Password](https://support.google.com/accounts/answer/185833).

## Deploy (Railway)

1. Service **root:** `backend` (or equivalent so `npm start` runs this `package.json`).
2. Variables: **`MONGODB_URI`** (+ optional `PORT` injected by Railway).
3. Logs: **`MongoDB connected`** and **`Server running on port …`** when healthy.

**Atlas:** allow your host’s egress IPs (often `0.0.0.0/0` for serverless/cloud) under Network Access.

## Troubleshooting

- **`missing` env in logs** → variable not on this service or wrong Railway environment; save variable (✓) and redeploy.
- **`Authentication failed`** → wrong DB user/password; URL‑encode special characters in the URI password.
- **Timeouts / server selection** → cluster paused, DNS/host typo, or IP allowlist.
