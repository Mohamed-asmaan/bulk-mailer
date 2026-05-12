import { useEffect, useRef, useState } from "react";
import { adminLogin } from "../api/admin";
import { formatApiError } from "../api/sendmail";

export default function AdminLoginModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const usernameRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter both username and password.");
      return;
    }
    setSubmitting(true);
    setError("");
    adminLogin(username.trim(), password)
      .then((res) => {
        if (res.data?.ok && res.data?.token) {
          onSuccess?.(res.data.token);
        } else {
          setError("Login failed — unexpected response.");
        }
      })
      .catch((err) => {
        setError(formatApiError(err));
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adminLoginTitle"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-[#0b1f3a] border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 text-white"
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h2 id="adminLoginTitle" className="text-xl sm:text-2xl font-bold tracking-tight">
              Admin sign in
            </h2>
            <p className="text-white/60 text-sm mt-1">
              Sign in to view sent email history. Credentials are configured by the server admin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white transition text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 mt-5">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-white/50">Username</span>
            <input
              ref={usernameRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-white/50">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              required
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="text-rose-200 text-sm bg-rose-500/10 border border-rose-400/30 rounded-xl px-3 py-2"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl py-3 transition-transform duration-150 enabled:hover:scale-[1.01] enabled:active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-[11px] sm:text-xs text-white/40 leading-snug">
            On the server, set <code className="text-white/70">ADMIN_USERNAME</code> and{" "}
            <code className="text-white/70">ADMIN_PASSWORD</code> environment variables to enable
            login.
          </p>
        </div>
      </form>
    </div>
  );
}
