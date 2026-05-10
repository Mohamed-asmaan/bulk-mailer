const MONGO_URI_ENV_KEYS = ["MONGODB_URI", "DATABASE_URL", "MONGO_URL", "MONGODB_URL"];

function mongoEnvStatus(key) {
  const raw = process.env[key];
  if (raw === undefined) return "missing";
  if (!String(raw).trim()) return "empty";
  return "set";
}

function resolveMongoUri() {
  for (const key of MONGO_URI_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return { uri: value, key };
  }
  return { uri: "", key: null };
}

function buildAllowedOrigins() {
  return [
    "https://bulk-mailer-seven-mu.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(process.env.FRONTEND_ORIGINS?.split(",")
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter(Boolean) ?? []),
  ];
}

function buildCorsOptions(allowedOrigins) {
  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      console.warn("Blocked by CORS:", origin);
      return callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 204,
  };
}

const parsedRailwayPort = Number.parseInt(process.env.PORT, 10);

module.exports = {
  MONGO_URI_ENV_KEYS,
  mongoEnvStatus,
  resolveMongoUri,
  LISTEN_PORT:
    Number.isFinite(parsedRailwayPort) && parsedRailwayPort > 0 ? parsedRailwayPort : 5000,
  parsedRailwayPort,
  trustProxyHops: Number.parseInt(process.env.TRUST_PROXY_HOPS || "1", 10) || 1,
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "512kb",
  MAX_MESSAGE_CHARS: Number.parseInt(process.env.MAX_MESSAGE_CHARS || "100000", 10) || 100000,
  MAX_RECIPIENTS: Number.parseInt(process.env.MAX_RECIPIENTS || "500", 10) || 500,
  SMTP_PER_MESSAGE_TIMEOUT_MS:
    Number.parseInt(process.env.SMTP_PER_MESSAGE_TIMEOUT_MS || "90000", 10) || 90000,
  SMTP_SEND_GAP_MS: Number.parseInt(process.env.SMTP_SEND_GAP_MS || "200", 10) || 0,
  mongoServerSelectionMs: Number.parseInt(process.env.MONGO_SERVER_SELECTION_MS || "45000", 10),
  smtpVerifyTimeoutMs: Number.parseInt(process.env.SMTP_VERIFY_TIMEOUT_MS || "15000", 10),
  sendmailRateWindowMs: Number.parseInt(
    process.env.SENDMAIL_RATE_WINDOW_MS || String(15 * 60 * 1000),
    10,
  ),
  sendmailRateMax: Number.parseInt(process.env.SENDMAIL_RATE_MAX || "30", 10),
  get allowedOrigins() {
    return buildAllowedOrigins();
  },
  get corsOptions() {
    return buildCorsOptions(buildAllowedOrigins());
  },
};
