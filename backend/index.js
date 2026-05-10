const path = require("path");

// Load backend/.env even when the process cwd is the repo root (Railway / monorepo).
require("dotenv").config({ path: path.join(__dirname, ".env") });

if (process.env.RAILWAY_SERVICE_NAME || process.env.RAILWAY_PROJECT_NAME) {
  console.log(
    "[startup] Railway context:",
    `service=${process.env.RAILWAY_SERVICE_NAME || "?"}`,
    `environment=${process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || "?"}`,
    `project=${process.env.RAILWAY_PROJECT_NAME || "?"}`,
  );
}

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
const serverStartedAt = Date.now();

// Railway / reverse proxy: needed so express-rate-limit keys real client IPs (avoids "global" throttling).
app.set("trust proxy", Number.parseInt(process.env.TRUST_PROXY_HOPS || "1", 10) || 1);

const parsedRailwayPort = Number.parseInt(process.env.PORT, 10);
const LISTEN_PORT =
  Number.isFinite(parsedRailwayPort) && parsedRailwayPort > 0 ? parsedRailwayPort : 5000;

const MONGO_URI_ENV_KEYS = ["MONGODB_URI", "DATABASE_URL", "MONGO_URL", "MONGODB_URL"];

const MAX_MESSAGE_CHARS = Number.parseInt(process.env.MAX_MESSAGE_CHARS || "100000", 10) || 100000;
const MAX_RECIPIENTS = Number.parseInt(process.env.MAX_RECIPIENTS || "500", 10) || 500;
const SMTP_PER_MESSAGE_TIMEOUT_MS =
  Number.parseInt(process.env.SMTP_PER_MESSAGE_TIMEOUT_MS || "90000", 10) || 90000;
const SMTP_SEND_GAP_MS = Number.parseInt(process.env.SMTP_SEND_GAP_MS || "200", 10) || 0;

const allowedOrigins = [
  "https://bulk-mailer-seven-mu.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_ORIGINS?.split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean) ?? []),
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked by CORS:", origin);

    return callback(null, false);
  },

  methods: ["GET", "POST", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],

  credentials: true,

  optionsSuccessStatus: 204,
};

// Register /sendmail preflight BEFORE app.use(cors) so OPTIONS runs this stack first (log + CORS headers). Avoid app.options(.*) — can break Express path-to-regexp on some deploys.
app.options(
  "/sendmail",
  (req, _res, next) => {
    console.log("OPTIONS HIT");
    next();
  },
  cors(corsOptions),
);

app.use(cors(corsOptions));

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "512kb" }));

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

const { uri: mongoUri, key: mongoEnvKey } = resolveMongoUri();
if (!mongoUri) {
  const flags = MONGO_URI_ENV_KEYS.map((k) => `${k}=${mongoEnvStatus(k)}`).join(", ");
  console.error(
    "No MongoDB connection string found. Set one of these on the **same** Railway service that runs this deploy (Variables tab), exact names: " +
      "MONGODB_URI, DATABASE_URL, MONGO_URL, or MONGODB_URL. Click ✓ to save, then Redeploy. " +
      "Local: copy backend/.env.example to backend/.env and set MONGODB_URI.",
  );
  console.error(`Diagnostics (values hidden): ${flags}`);
  console.error('Hint: "missing" = variable not set for this service. "empty" = name exists but value is blank.');
  process.exit(1);
}

console.log(`[startup] Using MongoDB env key: ${mongoEnvKey}`);

function credentialsDb() {
  const override = process.env.MONGO_DB_NAME?.trim();
  if (override) {
    return mongoose.connection.useDb(override).db;
  }
  return mongoose.connection.db;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reject if a single async step (e.g. one sendMail) hangs — common source of stalled requests / gateway timeouts. */
function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => {
      const err = new Error(`${label}: exceeded ${ms}ms`);
      err.code = "ETIMEOUT";
      err.status = 504;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

const LOOSE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSendMailBody(req, res, next) {
  const { msg, emailList } = req.body ?? {};
  const errors = [];

  if (typeof msg !== "string") {
    errors.push("`msg` must be a string");
  } else {
    const trimmed = msg.trim();
    if (!trimmed.length) {
      errors.push("`msg` cannot be empty");
    } else if (trimmed.length > MAX_MESSAGE_CHARS) {
      errors.push(`\`msg\` exceeds max length (${MAX_MESSAGE_CHARS})`);
    }
  }

  if (!Array.isArray(emailList)) {
    errors.push("`emailList` must be an array");
  } else if (emailList.length === 0) {
    errors.push("`emailList` must have at least one address");
  } else if (emailList.length > MAX_RECIPIENTS) {
    errors.push(`Too many recipients (max ${MAX_RECIPIENTS})`);
  } else {
    for (let i = 0; i < emailList.length; i++) {
      const e = emailList[i];
      if (typeof e !== "string" || !LOOSE_EMAIL.test(e.trim())) {
        errors.push(`Invalid email at index ${i}`);
        break;
      }
    }
  }

  if (errors.length) {
    console.warn("[sendmail] validation failed:", errors.join("; "));
    return res.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: errors.join("; "),
    });
  }

  req._validated = {
    msg: String(msg).trim(),
    emailList: emailList.map((e) => String(e).trim()),
  };
  return next();
}

function createSmtpTransport(smtpUser, smtpPass) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: Number.parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || "20000", 10),
    greetingTimeout: Number.parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || "20000", 10),
    socketTimeout: Number.parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || "60000", 10),
    // Gmail / some corporate TLS paths: leaving false avoids rare verify failures behind odd CA chains (trade-off: MITM risk).
    tls: { rejectUnauthorized: false },
  });
}

const sendMailLimiter = rateLimit({
  windowMs: Number.parseInt(process.env.SENDMAIL_RATE_WINDOW_MS || String(15 * 60 * 1000), 10),
  max: Number.parseInt(process.env.SENDMAIL_RATE_MAX || "30", 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn("[rate-limit] /sendmail from", req.ip);
    res.status(429).json({
      ok: false,
      code: "RATE_LIMIT",
      message: "Too many send requests — try again later.",
    });
  },
});

app.get("/health", (_req, res) => {
  res.type("text").send("ok");
});

app.get("/health/diagnostics", async (req, res, next) => {
  try {
    const mongo = mongoose.connection;
    const defaultName = mongo.db?.databaseName;
    const payload = {
      ok: true,
      uptimeSeconds: Math.floor((Date.now() - serverStartedAt) / 1000),
      mongo: {
        readyState: mongo.readyState,
        readyLabel: ["disconnected", "connected", "connecting", "disconnecting"][mongo.readyState] ?? "unknown",
        defaultDbFromUri: defaultName ?? null,
        credentialsDb: process.env.MONGO_DB_NAME?.trim() ?? null,
      },
      corsOriginsConfigured: [...allowedOrigins],
      thresholds: {
        maxRecipients: MAX_RECIPIENTS,
        maxMessageChars: MAX_MESSAGE_CHARS,
        smtpPerMessageTimeoutMs: SMTP_PER_MESSAGE_TIMEOUT_MS,
      },
    };

    const token = process.env.HEALTH_DIAGNOSTICS_TOKEN?.trim();
    const sent = req.get("x-health-diagnostics-token");
    if (token && sent === token) {
      const userdata = await credentialsDb().collection("bulkmail").findOne({});
      const hasCreds =
        userdata &&
        typeof userdata.user === "string" &&
        typeof userdata.pass === "string";
      payload.smtpCredentialsInDb = hasCreds
        ? { userHint: String(userdata.user).replace(/(^.).*(@.*$)/, "$1***$2") }
        : { present: false };
      if (hasCreds) {
        const smtpUser = userdata.user.trim();
        const smtpPass = userdata.pass.replace(/\s+/g, "");
        const t0 = Date.now();
        try {
          const transporter = createSmtpTransport(smtpUser, smtpPass);
          await withTimeout(
            transporter.verify(),
            Number.parseInt(process.env.SMTP_VERIFY_TIMEOUT_MS || "15000", 10),
            "transporter.verify",
          );
          payload.smtpVerify = { ok: true, ms: Date.now() - t0 };
        } catch (e) {
          payload.smtpVerify = {
            ok: false,
            ms: Date.now() - t0,
            message: e?.message || String(e),
            code: e?.code,
          };
        }
      }
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

async function sendMailHandler(req, res, next) {
  const { msg, emailList } = req._validated;
  console.log("[sendmail] accepted", emailList.length, "recipients");

  const userdata = await credentialsDb().collection("bulkmail").findOne({});

  if (!userdata || typeof userdata.user !== "string" || typeof userdata.pass !== "string") {
    console.error(
      "[sendmail] missing Mongo creds document — expected collection `bulkmail` with string `user` and `pass` " +
        `(credentials DB=${process.env.MONGO_DB_NAME?.trim() || "default from URI"})`,
    );
    return res.status(503).json({
      ok: false,
      code: "SMTP_CONFIG_MISSING",
      message: "Server email credentials are not configured in MongoDB.",
    });
  }

  const smtpUser = userdata.user.trim();
  const smtpPass = userdata.pass.replace(/\s+/g, "");
  const transporter = createSmtpTransport(smtpUser, smtpPass);

  try {
    for (let i = 0; i < emailList.length; i++) {
      const to = emailList[i];
      await withTimeout(
        transporter.sendMail({
          from: smtpUser,
          to,
          subject: process.env.BULK_MAIL_SUBJECT || "Bulk mail",
          text: msg,
        }),
        SMTP_PER_MESSAGE_TIMEOUT_MS,
        `sendMail:${to}`,
      );
      if (SMTP_SEND_GAP_MS > 0 && i < emailList.length - 1) {
        await sleep(SMTP_SEND_GAP_MS);
      }
    }
    console.log("[sendmail] success", emailList.length, "sent");
    return res.status(200).json({ ok: true, sent: emailList.length });
  } catch (err) {
    console.error("[sendmail] SMTP failure:", err?.message || err, err?.code);
    next(err);
  }
}

// Registered before bootstrap(); HTTP only opens after mongo.connect in bootstrap(), so this route is unreachable until Mongo is ready.
app.post(
  "/sendmail",
  sendMailLimiter,
  validateSendMailBody,
  (req, res, next) => Promise.resolve(sendMailHandler(req, res, next)).catch(next),
);

/** Central Express error middleware — catches async rejections routed via next(err). Prevents stray 502s from unhandled async failures. */
// eslint-disable-next-line no-unused-vars
function centralErrorHandler(err, req, res, _next) {
  console.error("[error]", req.method, req.path, err?.code || "", err?.message || err);
  let status =
    typeof err.status === "number"
      ? err.status
      : typeof err.statusCode === "number"
        ? err.statusCode
        : 500;
  let code = err.code || (status >= 500 ? "INTERNAL" : "ERROR");
  const explicitStatus = typeof err.status === "number" || typeof err.statusCode === "number";
  if (
    !explicitStatus &&
    err.responseCode != null &&
    Number.isFinite(Number(err.responseCode))
  ) {
    console.error("[smtp] responseCode=", err.responseCode, err.command);
    status = 502;
    code = code === "INTERNAL" ? "SMTP_UPSTREAM" : code;
  }
  const clientSafe =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Server error — check Railway logs."
      : err.message || "Request failed";
  if (!res.headersSent) {
    res.status(status).json({
      ok: false,
      code,
      message: clientSafe,
    });
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[process] uncaughtException:", err);
  process.exit(1);
});

async function bootstrap() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: Number.parseInt(process.env.MONGO_SERVER_SELECTION_MS || "45000", 10),
    });
    const defaultName = mongoose.connection.db?.databaseName;
    console.log(
      `[mongo] connected — default DB from URI: "${defaultName || "?"}"` +
        (process.env.MONGO_DB_NAME?.trim()
          ? `; credentials overridden by MONGO_DB_NAME="${process.env.MONGO_DB_NAME.trim()}"`
          : ""),
    );
    if (!process.env.MONGO_DB_NAME?.trim() && defaultName === "test") {
      console.warn(
        '[mongo] WARNING: default database is "test" — if `bulkmail` lives under `passkey`, set .../passkey in the URI or MONGO_DB_NAME=passkey',
      );
    }
  } catch (err) {
    console.error("[mongo] connect failed:", err?.message || err);
    process.exit(1);
  }

  app.use((req, res) => {
    res.status(404).json({ ok: false, code: "NOT_FOUND", message: `${req.method} ${req.path} not found` });
  });

  app.use(centralErrorHandler);

  app.listen(LISTEN_PORT, "0.0.0.0", () => {
    const usedFallback = !(Number.isFinite(parsedRailwayPort) && parsedRailwayPort > 0);
    console.log(
      `[http] listening on 0.0.0.0:${LISTEN_PORT} PORT=${JSON.stringify(process.env.PORT)}${usedFallback ? " (fallback 5000)" : ""}`,
    );
  });
}

bootstrap().catch((err) => {
  console.error("[bootstrap] fatal:", err);
  process.exit(1);
});
