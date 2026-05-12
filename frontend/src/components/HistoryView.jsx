import { useCallback, useEffect, useState } from "react";
import { fetchHistory } from "../api/admin";
import { formatApiError } from "../api/sendmail";

const STATUS_BADGES = {
  success: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  partial: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  failed: "bg-rose-500/15 text-rose-200 border-rose-400/30",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function HistoryView({ token, onUnauthorized, authChecked, onBack }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    fetchHistory(token, { limit: 50 })
      .then((res) => {
        if (res.data?.ok) {
          setItems(Array.isArray(res.data.items) ? res.data.items : []);
          setTotal(Number(res.data.total) || 0);
        } else {
          setError("Unexpected response while loading history.");
        }
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          onUnauthorized?.();
          return;
        }
        setError(formatApiError(err));
      })
      .finally(() => setLoading(false));
  }, [token, onUnauthorized]);

  useEffect(() => {
    if (!authChecked || !token) return undefined;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [authChecked, token, load]);

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-4 sm:p-8 md:p-12 flex flex-col gap-4 sm:gap-6 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Sent email history
          </h2>
          <p className="text-white/60 text-sm mt-1">
            {total > 0
              ? `Showing ${items.length} of ${total} records (latest first).`
              : "No records yet."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading || !token}
            className="text-sm rounded-full border border-white/20 text-white/80 hover:text-white px-4 py-2 transition disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-sm rounded-full bg-white/10 hover:bg-white/15 text-white px-4 py-2 transition"
            >
              ← Back to compose
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="text-white/60 text-sm">Loading history…</div>
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <div className="text-white/60 text-sm border border-dashed border-white/15 rounded-2xl px-6 py-10 text-center">
          No sent emails yet. Once you send a campaign it will appear here.
        </div>
      ) : null}

      <ul className="flex flex-col gap-3 sm:gap-4 overflow-y-auto pr-1">
        {items.map((item) => {
          const id = item._id || `${item.createdAt}-${item.recipientsTotal}`;
          const isOpen = expanded.has(id);
          const badge = STATUS_BADGES[item.status] || "bg-white/10 text-white border-white/20";
          return (
            <li
              key={id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-base sm:text-lg truncate">
                    {item.subject?.trim() || "(no subject)"}
                  </p>
                  <p className="text-white/50 text-xs sm:text-sm mt-0.5">
                    {formatDate(item.createdAt)} • {item.provider || "smtp"}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border ${badge}`}>
                  {item.status} · {item.sentCount}/{item.totalCount}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                <Stat label="Recipients" value={item.recipientsTotal} />
                <Stat label="Sent" value={item.sentCount} />
                <Stat label="Body length" value={`${item.bodyLength ?? 0} chars`} />
                <Stat label="From" value={item.fromUser || "—"} />
              </div>

              {item.errorMessage ? (
                <p className="text-rose-200 text-xs sm:text-sm bg-rose-500/10 border border-rose-400/30 rounded-xl px-3 py-2 break-words">
                  {item.errorCode ? <strong>[{item.errorCode}]</strong> : null} {item.errorMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => toggle(id)}
                className="self-start text-xs sm:text-sm text-cyan-200 hover:text-cyan-100"
              >
                {isOpen ? "Hide recipients" : `Show recipients (${item.recipientsTotal})`}
              </button>

              {isOpen ? (
                <div className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white/80 max-h-48 overflow-y-auto">
                  {(item.recipientsPreview || []).length === 0 ? (
                    <span className="text-white/50">No recipients recorded.</span>
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      {(item.recipientsPreview || []).map((r, idx) => (
                        <li key={`${id}-${idx}`} className="truncate">
                          {r}
                        </li>
                      ))}
                      {item.recipientsTotal > (item.recipientsPreview || []).length ? (
                        <li className="text-white/50">
                          … +
                          {item.recipientsTotal - (item.recipientsPreview || []).length} more
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
      <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wide">{label}</p>
      <p className="text-white font-medium truncate">{value}</p>
    </div>
  );
}
