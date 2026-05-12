# bulk-mailer

Compose a **subject + message**, upload an Excel file with emails in column **A**, and send bulk mail through [Express](https://expressjs.com/) + [Nodemailer](https://nodemailer.com/). Each send is persisted in MongoDB (`email_history`) and viewable through an admin-only **History** page (HMAC-signed bearer-token login). SMTP credentials are loaded from MongoDB — never committed to the repo.

| | Live link |
|--|------|
| **Try it (Frontend)** | [bulk-mailer-seven-mu.vercel.app](https://bulk-mailer-seven-mu.vercel.app/) |
| **API (Render)** | [bulk-mailer-ehdq.onrender.com](https://bulk-mailer-ehdq.onrender.com) |
| **Repo** | [github.com/Mohamed-asmaan/bulk-mailer](https://github.com/Mohamed-asmaan/bulk-mailer) |

## Stack

| Part | Technologies |
|------|----------------|
| [frontend/](frontend/README.md) | React (Vite), Tailwind v4, Axios, SheetJS |
| [backend/](backend/README.md) | Express, Mongoose, Nodemailer, Resend (optional fallback) |

## Features

- **Compose** — subject, body, and Excel-driven recipient list with inline success/failure banners.
- **Send** — `POST /sendmail` runs nodemailer (or Resend if the saved API key starts with `re_`), with per-message timeout and rate limiting.
- **Persist** — every send writes a row to MongoDB collection `email_history` (subject, body preview, recipients preview, status, sent count, provider, error).
- **Admin** — `POST /admin/login` (HMAC bearer token, configurable TTL) + `GET /history` (paginated, newest first). Frontend shows an inline login modal and a history view with per-record details.
- **Health** — `GET /health` (text `ok`) and `GET /health/diagnostics` (JSON, with optional gated SMTP verify).

## Prerequisites

Node.js **18+**, a **MongoDB** database (Atlas ok), Excel with addresses in column **A**.

## Quick start

1. **[Backend](backend/README.md)** — `cd backend && npm install && npm start` (default [http://localhost:5000](http://localhost:5000)).
2. **[Frontend](frontend/README.md)** — `cd frontend && npm install && npm run dev`.

Details, env vars, and deploy steps live in each folder’s README.

**Production hardening**, Render/Vercel/Atlas checklists: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## Secrets

No SMTP password, MongoDB URI, or Gmail credentials are stored in this repo. `.env` files are gitignored; only `.env.example` placeholders are tracked. The browser never receives credentials — SMTP `user`/`pass` are read by the backend from MongoDB (collection `bulkmail`) and the database URI is supplied at runtime via the host’s environment variables (Render / local `.env`).

## License

See `frontend/package.json` and `backend/package.json`.
