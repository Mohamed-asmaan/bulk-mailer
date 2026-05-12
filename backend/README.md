# Backend

Express API that powers the Bulk Mailer. It accepts a subject, message, and recipient list from the frontend, sends the email through the configured mail provider, and keeps a record of each send so the admin history view can show past activity.

## Run locally

```bash
npm install
npm start
```

Configuration is supplied through environment variables on the host (or a local `.env`, which is gitignored). No secrets are committed to the repository.
