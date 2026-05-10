# Backend (Bulk Mail)

Express API: **`POST /sendmail`** with JSON `{ "msg": string, "emailList": string[] }`. Reads SMTP `user` / `pass` from MongoDB collection **`bulkmail`** (MongoDB via **`MONGODB_URI`** on Railway or `backend/.env` locally). **`GET /health`** returns plain `ok` (quick check that the service is reachable).

**Deployed API:** [https://bulk-mailer-production-c860.up.railway.app](https://bulk-mailer-production-c860.up.railway.app) — used by the Vercel app [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/).

## Scripts

```bash
npm install
npm start      # listens on PORT (Railway) or 5000 locally
```

## CORS

**`cors`** runs **before** `express.json()` and routes. **`origin`** includes production Vercel plus local dev; **`credentials: false`** (this API doesn’t rely on cookies) for fewer mobile/Safari preflight failures. **`allowedHeaders`** includes **`Content-Type`** for JSON. Debug: **`app.use(cors())`**.

**`PORT`:** `process.env.PORT || 5000` (**Railway** sets **`PORT`**). **`app.listen`** uses **`0.0.0.0`**.

Vercel: **`VITE_API_URL=https://bulk-mailer-production-c860.up.railway.app`** or **`frontend/.env.production`**, then redeploy.

If Network shows **no response headers** for **`sendmail`**, confirm **two** entries exist (**`OPTIONS`** then **`POST`**) and open **`GET /health`** in the device browser — if that fails, the container isn’t serving Node yet.

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
