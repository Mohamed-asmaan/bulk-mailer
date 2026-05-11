const dns = require("dns");
const mongoose = require("mongoose");
const config = require("./config");
const { createApp } = require("./app");
const { centralErrorHandler } = require("./middleware/centralErrorHandler");

// Force IPv4-first DNS resolution globally. Some PaaS hosts (Render free)
// disable outbound IPv6, so an AAAA-record connect attempt to smtp.gmail.com
// fails with ENETUNREACH before nodemailer's `family: 4` socket option helps.
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
  console.log("[startup] DNS default result order: ipv4first");
}

if (process.env.RENDER || process.env.RENDER_SERVICE_NAME) {
  console.log(
    "[startup] Render context:",
    `service=${process.env.RENDER_SERVICE_NAME || "?"}`,
    `region=${process.env.RENDER_REGION || "?"}`,
    `instance=${process.env.RENDER_INSTANCE_ID || "?"}`,
  );
}

const { uri: mongoUri, key: mongoEnvKey } = config.resolveMongoUri();
if (!mongoUri) {
  const flags = config.MONGO_URI_ENV_KEYS.map((k) => `${k}=${config.mongoEnvStatus(k)}`).join(", ");
  console.error(
    "No MongoDB connection string found. Set one of these on the **same** host service that runs this deploy (Environment / Variables tab), exact names: " +
      "MONGODB_URI, DATABASE_URL, MONGO_URL, or MONGODB_URL. Save, then redeploy. " +
      "Local: copy backend/.env.example to backend/.env and set MONGODB_URI.",
  );
  console.error(`Diagnostics (values hidden): ${flags}`);
  console.error('Hint: "missing" = variable not set for this service. "empty" = name exists but value is blank.');
  process.exit(1);
}

console.log(`[startup] Using MongoDB env key: ${mongoEnvKey}`);

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[process] uncaughtException:", err);
  process.exit(1);
});

async function bootstrap() {
  const serverStartedAt = Date.now();
  const app = createApp(serverStartedAt);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: config.mongoServerSelectionMs,
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
    res
      .status(404)
      .json({ ok: false, code: "NOT_FOUND", message: `${req.method} ${req.path} not found` });
  });

  app.use(centralErrorHandler);

  app.listen(config.LISTEN_PORT, "0.0.0.0", () => {
    const usedFallback = !(
      Number.isFinite(config.parsedHostPort) && config.parsedHostPort > 0
    );
    console.log(
      `[http] listening on 0.0.0.0:${config.LISTEN_PORT} PORT=${JSON.stringify(process.env.PORT)}${usedFallback ? " (fallback 5000)" : ""}`,
    );
  });
}

bootstrap().catch((err) => {
  console.error("[bootstrap] fatal:", err);
  process.exit(1);
});
