# Backend (Bulk Mail)

Express API: **`POST /sendmail`** with JSON `{ "msg": string, "emailList": string[] }`. Reads SMTP `user` / `pass` from MongoDB collection **`bulkmail`** (MongoDB via **`MONGODB_URI`** on Railway or `backend/.env` locally). **`GET /health`** returns plain `ok` (quick check that the service is reachable).

**Deployed API:** [https://bulk-mailer-production-c860.up.railway.app](https://bulk-mailer-production-c860.up.railway.app) — used by the Vercel app [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/).

## Scripts

```bash
npm install
npm start      # listens on PORT (Railway) or 5000 locally
```

## CORS

CORS uses the **`cors`** middleware: origins in **`ALLOWED_ORIGINS`** (built from **`FRONTEND_ORIGINS`** or defaults) plus any **`https://*.vercel.app`** host so production and previews work. **`OPTIONS`** is handled by that library (**204**). If you still see a missing **`Access-Control-Allow-Origin`** in the browser, the response often did **not** come from Node (Railway gateway error)—check **`GET /health`** and deploy logs.

If **`FRONTEND_ORIGINS`** would parse empty, defaults are kept. Startup logs show **`CORS allow-list (...)`**.

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
