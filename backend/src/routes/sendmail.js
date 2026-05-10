const rateLimit = require("express-rate-limit");
const config = require("../config");
const { credentialsDb } = require("../lib/mongo");
const { createSmtpTransport, withTimeout, sleep } = require("../lib/smtp");
const { validateSendMailBody } = require("../middleware/validateSendMail");

const sendMailLimiter = rateLimit({
  windowMs: config.sendmailRateWindowMs,
  max: config.sendmailRateMax,
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
        config.SMTP_PER_MESSAGE_TIMEOUT_MS,
        `sendMail:${to}`,
      );
      if (config.SMTP_SEND_GAP_MS > 0 && i < emailList.length - 1) {
        await sleep(config.SMTP_SEND_GAP_MS);
      }
    }
    console.log("[sendmail] success", emailList.length, "sent");
    return res.status(200).json({ ok: true, sent: emailList.length });
  } catch (err) {
    console.error("[sendmail] SMTP failure:", err?.message || err, err?.code);
    next(err);
  }
}

function registerSendmailRoutes(app) {
  app.post(
    "/sendmail",
    sendMailLimiter,
    validateSendMailBody,
    (req, res, next) => Promise.resolve(sendMailHandler(req, res, next)).catch(next),
  );
}

module.exports = { registerSendmailRoutes };
