const STYLES = {
  success: {
    container: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    icon: "✅",
  },
  error: {
    container: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    icon: "⚠️",
  },
  info: {
    container: "border-sky-400/30 bg-sky-500/10 text-sky-100",
    icon: "ℹ️",
  },
};

export default function StatusBanner({ status, onDismiss }) {
  if (!status) return null;
  const style = STYLES[status.kind] || STYLES.info;
  return (
    <div
      role={status.kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`flex items-start gap-3 border ${style.container} rounded-2xl px-4 py-3 text-sm sm:text-base`}
    >
      <span className="text-lg sm:text-xl leading-none mt-0.5" aria-hidden>
        {style.icon}
      </span>
      <p className="flex-1 leading-snug break-words">{status.message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="opacity-70 hover:opacity-100 transition text-sm px-2 py-0.5 rounded"
          aria-label="Dismiss"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
