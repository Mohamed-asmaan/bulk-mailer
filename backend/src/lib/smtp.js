const nodemailer = require("nodemailer");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function createSmtpTransport(smtpUser, smtpPass) {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" || secureEnv === "1"
      ? true
      : secureEnv === "false" || secureEnv === "0"
        ? false
        : port === 465;
  const familyEnv = Number.parseInt(process.env.SMTP_FAMILY || "4", 10);
  const family = familyEnv === 6 || familyEnv === 0 ? familyEnv : 4;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    family,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: Number.parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || "30000", 10),
    greetingTimeout: Number.parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || "30000", 10),
    socketTimeout: Number.parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || "60000", 10),
    tls: { rejectUnauthorized: false },
  });
}

module.exports = { sleep, withTimeout, createSmtpTransport };
