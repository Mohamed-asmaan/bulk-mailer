# Bulk Mailer

A simple MERN app to send the same email to a list of recipients in one click. Drop an Excel sheet, write a subject and message, and hit send.

**Live app:** [bulk-mailer-seven-mu.vercel.app](https://bulk-mailer-seven-mu.vercel.app/)

## What it does

- Compose a subject and message.
- Upload an Excel file containing the recipient list.
- Send to everyone at once and see a clear success / failure summary.
- Keep a history of past sends, viewable from an admin-only page.

## Tech stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Mail:** Nodemailer (with a Resend fallback)
- **Hosting:** Vercel (UI) + Render (API)

## Project layout

| Folder | Description |
|--------|-------------|
| [`frontend/`](frontend/) | React UI |
| [`backend/`](backend/) | Express API |

## Privacy

No credentials, SMTP keys, database URIs, or admin secrets are stored in this repository. All sensitive values are configured on the host at runtime; `.env` files are gitignored. The browser never receives any credentials.
