# bulk-mailer

**Repository:** [github.com/Mohamed-asmaan/bulk-mailer](https://github.com/Mohamed-asmaan/bulk-mailer)

A small MERN-style app (**Bulk Mail**) for composing a message, loading recipient emails from an Excel file (first column, header `A`), and sending mail through a Node backend that reads SMTP credentials from MongoDB.

## Deployed app

| | URL |
|---|-----|
| **Frontend (Vercel)** | [https://bulk-mailer-seven-mu.vercel.app/](https://bulk-mailer-seven-mu.vercel.app/) |
| **Backend API (Railway)** | [https://bulk-mailer-production-c860.up.railway.app](https://bulk-mailer-production-c860.up.railway.app) |

Local development uses the API on port **5000** (`http://localhost:5000`). Railway injects `PORT` at runtime; the server reads `process.env.PORT` and falls back to **5000** when unset.

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
2. Add **`VITE_API_URL`** = your public API origin, **no trailing slash**. For this project’s Railway service use `https://bulk-mailer-production-c860.up.railway.app`. Vite bakes this in at build time, then redeploy. (If unset at build time, the app falls back to the same Railway origin in production builds; local dev still defaults to `http://localhost:5000`.)
3. Copy `frontend/.env.example` to `frontend/.env` locally if you want the same override during `npm run dev`.

### Railway (backend)

1. Set the service **root directory** to `backend` (or run `npm start` from the folder that contains `package.json` and `index.js`).
2. Open the **same** Railway service that runs this API (e.g. `bulk-mailer-production`), go to **Variables** (not only project-wide settings), and add **`MONGODB_URI`** with your full Atlas (or other) connection string — the same URI you use in `backend/.env` locally. **Name must match exactly:** `MONGODB_URI` (or use one of: `DATABASE_URL`, `MONGO_URL`, `MONGODB_URL`). Railway does **not** load `backend/.env` from Git; if this variable is missing, the app exits and logs *No MongoDB connection string found* in a restart loop.
3. Save variables, then trigger a **redeploy** (or push a commit) so a new deploy picks them up.
4. **`npm warn config production Use --omit=dev instead`** is an npm notice, not a crash; it does not stop the app.

#### If logs say *No MongoDB connection string found*

Railway never reads `backend/.env` from the repo. The server only reads **`process.env`** (Railway **Variables** or a local `.env` file).

1. In [Railway](https://railway.app), open your project → the **backend** service that runs `npm start` / `node index.js`.
2. Open the **Variables** tab and add **`MONGODB_URI`** (exact name) with your full URI, for example from MongoDB Atlas:

   `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/yourdbname?retryWrites=true&w=majority`

   The code also accepts **`DATABASE_URL`**, **`MONGO_URL`**, or **`MONGODB_URL`** if you already use one of those names elsewhere.

3. **Deploy** or **Redeploy** the service. Healthy logs should include **`MongoDB connected`** and **`Server running on port …`** (Railway sets `PORT` automatically; locally it defaults to **5000**).

The backend connects with `mongoose.connect(...)` using the first non-empty value from those variables (see `resolveMongoUri()` in `backend/index.js`).

If the server still exits immediately, check the log line **`Diagnostics (values hidden): …`**: if every name shows **`missing`**, that Railway **service** still does not receive those variables (wrong service tab, typo in the name, or a shared variable not linked to this service). Paste the URI as a normal variable on the backend service if unsure.

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
