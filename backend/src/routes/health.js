const mongoose = require("mongoose");
const config = require("../config");
const { credentialsDb } = require("../lib/mongo");
const { withTimeout } = require("../lib/smtp");
const { createMailer, detectProvider } = require("../lib/mailer");

function registerHealthRoutes(app, serverStartedAt) {
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
          readyLabel:
            ["disconnected", "connected", "connecting", "disconnecting"][mongo.readyState] ??
            "unknown",
          defaultDbFromUri: defaultName ?? null,
          credentialsDb: process.env.MONGO_DB_NAME?.trim() ?? null,
        },
        corsOriginsConfigured: [...config.allowedOrigins],
        thresholds: {
          maxRecipients: config.MAX_RECIPIENTS,
          maxMessageChars: config.MAX_MESSAGE_CHARS,
          smtpPerMessageTimeoutMs: config.SMTP_PER_MESSAGE_TIMEOUT_MS,
        },
      };

      const token = process.env.HEALTH_DIAGNOSTICS_TOKEN?.trim();
      const sent = req.get("x-health-diagnostics-token");
      if (token && sent === token) {
        const userdata = await credentialsDb().collection("bulkmail").findOne({});
        const hasCreds =
          userdata && typeof userdata.user === "string" && typeof userdata.pass === "string";
        payload.smtpCredentialsInDb = hasCreds
          ? { userHint: String(userdata.user).replace(/(^.).*(@.*$)/, "$1***$2") }
          : { present: false };
        if (hasCreds) {
          const mailUser = userdata.user.trim();
          const mailPass = userdata.pass.replace(/\s+/g, "");
          const provider = detectProvider(mailPass);
          payload.mailerProvider = provider;
          const t0 = Date.now();
          try {
            const mailer = await createMailer(mailUser, mailPass);
            const result = await withTimeout(
              mailer.verify(),
              config.smtpVerifyTimeoutMs,
              "mailer.verify",
            );
            payload.mailerVerify = {
              ok: result?.ok !== false,
              ms: Date.now() - t0,
              ...(result && typeof result === "object" ? result : {}),
            };
          } catch (e) {
            payload.mailerVerify = {
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
}

module.exports = { registerHealthRoutes };
