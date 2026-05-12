# Frontend (Bulk Mail)

React + Vite UI: **subject + message editor**, `.xlsx` / `.xls` upload (first sheet, column **A** as emails), `POST /sendmail` via Axios. Inline success/failure banners (no native `alert`), and an admin **History** view backed by `POST /admin/login` + `GET /history`.

## Production URLs

| | URL |
|--|-----|
| **This UI (Vercel)** | [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/) |
| **API (Render)** | `https://bulk-mailer-ehdq.onrender.com` (no trailing slash) |

MongoDB credentials are configured on the **backend** (`MONGODB_URI` + `bulkmail` collection); the browser never talks to MongoDB directly.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173 — same-origin `/sendmail` proxies to backend :5000 (see vite.config.js)
npm run build    # output: dist/
npm run preview  # test production bundle locally
```

## Environment

- Copy [.env.example](.env.example) to `.env` for local overrides.
- **`VITE_API_URL`** — API origin, **no trailing slash**. Dev without `.env`: `http://localhost:5000`.
- Production builds load [`.env.production`](.env.production), which sets `VITE_API_URL` to the Render API above. Override in Vercel → Environment Variables if the API host changes.

## Deploy (Vercel)

- **Root Directory:** `frontend` (optional if build command cd’s here).
- **Build:** `npm install && npm run build`
- **`VITE_API_URL`:** Use `https://bulk-mailer-ehdq.onrender.com` (no slash) — set in Project → Settings → Env *or* keep [`.env.production`](.env.production); redeploy after changes.

## Excel

First sheet; cells in column **A** are treated as recipient addresses.

## Admin / history

- Click **History** in the top-right nav. If you are not signed in, a login modal asks for the admin username/password configured on the backend (`ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars).
- On success the API returns a short-lived bearer token stored in `localStorage` under `bulkmail.adminToken`. The token is sent on `GET /history` and `GET /admin/me`.
- History shows the latest 50 sends (subject, status, sent/total count, provider, timestamp, recipient preview, and any error).
