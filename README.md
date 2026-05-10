# bulk-mailer

A small MERN-style app (**Bulk Mail**) for composing a message, loading recipient emails from an Excel file (first column, header `A`), and sending mail through a Node backend that reads SMTP credentials from MongoDB.

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

The API listens on port **5000** by default (`http://localhost:5000`). The `POST /sendmail` route expects JSON: `{ "msg": string, "emailList": string[] }`.

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

Serve the `frontend/dist` output with any static host. Point the frontend at your deployed API URL when you move off `localhost` (today the client posts to `http://localhost:5000/sendmail`; update that URL for real deployments).

## Configuration notes

- **MongoDB**: Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` to your Atlas (or other) connection string. The server exits on startup if this variable is missing. Never commit `.env`.  
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
