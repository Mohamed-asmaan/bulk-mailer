const path = require("path");

// Load backend/.env even when the process cwd is the repo root (Railway / monorepo).
require("dotenv").config({ path: path.join(__dirname, ".env") });

if (process.env.RAILWAY_SERVICE_NAME || process.env.RAILWAY_PROJECT_NAME) {
  console.log(
    "Railway:",
    `service=${process.env.RAILWAY_SERVICE_NAME || "?"}`,
    `environment=${process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || "?"}`,
    `project=${process.env.RAILWAY_PROJECT_NAME || "?"}`
  );
}

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();

const parsedRailwayPort = Number.parseInt(process.env.PORT, 10);
const LISTEN_PORT =
  Number.isFinite(parsedRailwayPort) && parsedRailwayPort > 0 ? parsedRailwayPort : 5000;

const corsOptions = {
  origin: [
    "https://bulk-mailer-seven-mu.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.use(express.json());

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

const { uri: mongoUri, key: mongoEnvKey } = resolveMongoUri();
if (!mongoUri) {
  const flags = MONGO_URI_ENV_KEYS.map((k) => `${k}=${mongoEnvStatus(k)}`).join(", ");
  console.error(
    "No MongoDB connection string found. Set one of these on the **same** Railway service that runs this deploy (Variables tab), exact names: " +
      "MONGODB_URI, DATABASE_URL, MONGO_URL, or MONGODB_URL. Click ✓ to save, then Redeploy. " +
      "Local: copy backend/.env.example to backend/.env and set MONGODB_URI."
  );
  console.error(`Diagnostics (values hidden): ${flags}`);
  console.error('Hint: "missing" = variable not set for this service. "empty" = name exists but value is blank.');
  process.exit(1);
}

console.log(`Using MongoDB from environment variable: ${mongoEnvKey}`);

function credentialsDb() {
  const override = process.env.MONGO_DB_NAME?.trim();
  if (override) {
    return mongoose.connection.useDb(override).db;
  }
  return mongoose.connection.db;
}

mongoose.connect(mongoUri)
  .then(() => {
    const defaultName = mongoose.connection.db?.databaseName;
    console.log(
      `MongoDB connected — default DB from URI: "${defaultName || "?"}"`,
      process.env.MONGO_DB_NAME?.trim()
        ? `; credentials read from override MONGO_DB_NAME="${process.env.MONGO_DB_NAME.trim()}"`
        : "",
    );
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err?.message || err);
  });

app.get("/health", (_req, res) => {
  res.type("text").send("ok");
});

app.post("/sendmail", async (req, res) => {

  const msg = req.body.msg;
  const emailList = req.body.emailList;

  try {

    const userdata = await credentialsDb().collection("bulkmail").findOne({});

    if (!userdata || typeof userdata.user !== "string" || typeof userdata.pass !== "string") {
      console.error(
        "SMTP credentials missing: expected one document in `bulkmail` with string fields `user` and `pass` " +
          `(DB: URI default${process.env.MONGO_DB_NAME?.trim() ? ` overridden by MONGO_DB_NAME="${process.env.MONGO_DB_NAME.trim()}"` : ""}).`,
      );
      return res.send(false);
    }

    const smtpUser = userdata.user.trim();
    const smtpPass = userdata.pass.replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    for (let i = 0; i < emailList.length; i++) {

      await transporter.sendMail({
        from: smtpUser,
        to: emailList[i],
        subject: "Bulk mail",
        text: msg,
      });

    }

    res.send(true);

  } catch (err) {

    console.log(err);
    res.send(false);

  }

});

app.listen(LISTEN_PORT, "0.0.0.0", () => {
  const usedFallback = !(
    Number.isFinite(parsedRailwayPort) && parsedRailwayPort > 0
  );
  console.log(
    `HTTP listening on 0.0.0.0:${LISTEN_PORT} (process.env.PORT=${JSON.stringify(process.env.PORT)}${usedFallback ? "; using fallback 5000" : ""})`,
  );
});