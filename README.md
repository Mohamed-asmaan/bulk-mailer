# bulk-mailer

Compose a message, upload an Excel file with emails in column **A**, and send bulk mail through [Express](https://expressjs.com/) + [Nodemailer](https://nodemailer.com/). SMTP credentials are loaded from MongoDB.

| | Link |
|--|------|
| **Repo** | [github.com/Mohamed-asmaan/bulk-mailer](https://github.com/Mohamed-asmaan/bulk-mailer) |
| **Frontend** | [bulk-mailer-seven-mu.vercel.app](https://bulk-mailer-seven-mu.vercel.app/) |
| **API** | [bulk-mailer-production-c860.up.railway.app](https://bulk-mailer-production-c860.up.railway.app) |

## Stack

| Part | Technologies |
|------|----------------|
| [frontend/](frontend/README.md) | React (Vite), Tailwind v4, Axios, SheetJS |
| [backend/](backend/README.md) | Express, Mongoose, Nodemailer |

## Prerequisites

Node.js **18+**, a **MongoDB** database (Atlas ok), Excel with addresses in column **A**.

## Quick start

1. **[Backend](backend/README.md)** — `cd backend && npm install && npm start` (default [http://localhost:5000](http://localhost:5000)).
2. **[Frontend](frontend/README.md)** — `cd frontend && npm install && npm run dev`.

Details, env vars, and deploy steps live in each folder’s README.

**Production hardening**, Railway/Vercel/Atlas checklists: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## License

See `frontend/package.json` and `backend/package.json`.
