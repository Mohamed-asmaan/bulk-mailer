const RENDER_API_ORIGIN = "https://bulk-mailer-ehdq.onrender.com";

/** Dev: vite proxy → localhost:5000. Prod: VITE_API_URL or Render default. */
export const API_BASE = import.meta.env.DEV
  ? ""
  : (
      import.meta.env.VITE_API_URL ||
      (import.meta.env.PROD ? RENDER_API_ORIGIN : "http://localhost:5000")
    ).replace(/\/$/, "");

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 180000;
