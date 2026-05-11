const nodemailer = require("nodemailer");
const dns = require("dns").promises;

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

async function resolveIPv4(host) {
  try {
    const { address } = await dns.lookup(host, { family: 4 });
    return address;
  } catch (err) {
    console.warn(`[smtp] IPv4 lookup for ${host} failed: ${err?.message}`);
    return null;
  }
}

async function createSmtpTransport(smtpUser, smtpPass) {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" || secureEnv === "1"
      ? true
      : secureEnv === "false" || secureEnv === "0"
        ? false
        : port === 465;
  const forceIPv4 = (process.env.SMTP_FAMILY || "4").trim() !== "6";

  // Pre-resolve to IPv4 because nodemailer's DNS path can pick AAAA records on
  // PaaS hosts (e.g. Render free) whose outbound IPv6 is disabled, producing
  // ENETUNREACH on 2404:6800:... The hostname is still used for TLS SNI/EHLO.
  let connectHost = host;
  if (forceIPv4) {
    const ipv4 = await resolveIPv4(host);
    if (ipv4) {
      console.log(`[smtp] using IPv4 ${ipv4} for ${host}`);
      connectHost = ipv4;
    }
  }

  return nodemailer.createTransport({
    host: connectHost,
    port,
    secure,
    requireTLS: !secure,
    name: host,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: Number.parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || "30000", 10),
    greetingTimeout: Number.parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || "30000", 10),
    socketTimeout: Number.parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || "60000", 10),
    tls: {
      servername: host,
      rejectUnauthorized: false,
    },
  });
}

module.exports = { sleep, withTimeout, createSmtpTransport };
