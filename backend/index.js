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
const PORT = Number(process.env.PORT) || 5000;

const DEFAULT_FRONTEND_ORIGINS = [
  "https://bulk-mailer-seven-mu.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const ALLOWED_ORIGINS = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_FRONTEND_ORIGINS;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, ALLOWED_ORIGINS.includes(origin));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204,
};

// Express 5 / path-to-regexp v8+: do not use app.options('*', …) — it crashes at startup.
// `cors()` handles OPTIONS preflight for matching requests.
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

mongoose.connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err?.message || err);
  });

app.post("/sendmail", async (req, res) => {

  const msg = req.body.msg;
  const emailList = req.body.emailList;

  try {

    const userdata = await mongoose.connection.db
      .collection("bulkmail")
      .findOne({});

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      service: "gmail",
      auth: {
        user: userdata.user,
        pass: userdata.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    for (let i = 0; i < emailList.length; i++) {

      await transporter.sendMail({
        from: userdata.user,
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});