# bulk-mailer

A small MERN-style app (**Bulk Mail**) for composing a message, loading recipient emails from an Excel file (first column, header `A`), and sending mail through a Node backend that reads SMTP credentials from MongoDB.

**Live frontend (Vercel):** [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/)

## What’s inside

| Area | Stack |
|------|--------|
| Frontend | React (Vite), Tailwind CSS v4, Axios, SheetJS (`xlsx`) |
| Backend | Express, Nodemailer, Mongoose, CORS |

## Prerequisites

- Node.js 18+ recommended  
- MongoDB (Atlas or self-hosted) with a collection document that includes your Gmail (or other SMTP) `user` and `pass` fields used by the server  
- Excel file with email addresses in column A  

## Quick start

### Backend

From `backend/`:

```bash
npm install
npm start
```

Locally the API listens on port **5000** by default (`http://localhost:5000`). On **Railway**, the platform sets `PORT`; the server uses `process.env.PORT` when present. The `POST /sendmail` route expects JSON: `{ "msg": string, "emailList": string[] }`.

### Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build (frontend)

```bash
cd frontend
npm run build
npm run preview
```

Serve the `frontend/dist` output with any static host (this project’s UI is deployed at [bulk-mailer-seven-mu.vercel.app](https://bulk-mailer-seven-mu.vercel.app/)).

### Vercel (frontend)

1. Build command: `cd frontend && npm install && npm run build` (or set the project **Root Directory** to `frontend` and use `npm run build`).
2. Add an environment variable **`VITE_API_URL`** = your public Railway (or other) API origin, **no trailing slash**, e.g. `https://your-service.up.railway.app`. Vite bakes this in at build time, then redeploy.
3. Copy `frontend/.env.example` to `frontend/.env` locally if you want the same override during `npm run dev`.

### Railway (backend)

1. Set the service **root directory** to `backend` (or run `npm start` from the folder that contains `package.json` and `index.js`).
2. Under **Variables**, add **`MONGODB_URI`** with your full MongoDB connection string (same value you would put in `backend/.env`). Railway does **not** read `backend/.env` from the repo — the container only sees variables you define here. If `MONGODB_URI` is missing, the process exits and you will see that message in the logs.
3. **`npm warn config production Use --omit=dev instead`** is an npm notice, not a crash; it does not stop the app.

## Configuration notes

- **MongoDB**: Copy `backend/.env.example` to `backend/.env` for local development. On Railway, set the **`MONGODB_URI`** variable in the dashboard. Never commit `.env`.
- **SMTP**: Gmail often requires an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled.  
- **CORS**: The backend enables CORS broadly for local dev; tighten `origin` for production.  

## Excel format

The first sheet’s first column (`A`) is read as a list of recipient addresses. Empty cells may be included depending on file content; clean your sheet before sending.

## Scripts reference

| Command | Where | Purpose |
|---------|--------|---------|
| `npm run dev` | `frontend/` | Vite dev server |
| `npm run build` | `frontend/` | Production bundle |
| `npm run preview` | `frontend/` | Preview production build |
| `npm start` | `backend/` | Run Express server |

## License

See package metadata in `frontend/package.json` and `backend/package.json` unless the repository specifies otherwise.
