# Frontend (Bulk Mail)

React + Vite UI: message editor, `.xlsx` / `.xls` upload (first sheet, column **A** as emails), `POST /sendmail` via Axios.

## Production URLs

| | URL |
|--|-----|
| **This UI (Vercel)** | [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/) |
| **API (Railway)** | `https://bulk-mailer-production-c860.up.railway.app` (no trailing slash) |

MongoDB credentials are configured on the **backend** (`MONGODB_URI` + `bulkmail` collection); the browser never talks to MongoDB directly.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173 — API defaults to http://localhost:5000
npm run build    # output: dist/
npm run preview  # test production bundle locally
```

## Environment

- Copy [.env.example](.env.example) to `.env` for local overrides.
- **`VITE_API_URL`** — API origin, **no trailing slash**. Dev without `.env`: `http://localhost:5000`.
- Production builds load [`.env.production`](.env.production), which sets `VITE_API_URL` to the Railway API above. Override in Vercel → Environment Variables if the API host changes.

## Deploy (Vercel)

- **Root Directory:** `frontend` (optional if build command cd’s here).
- **Build:** `npm install && npm run build`
- **`VITE_API_URL`:** Optional if `.env.production` matches your API; set in the dashboard to override without code changes.

## Excel

First sheet; cells in column **A** are treated as recipient addresses.
