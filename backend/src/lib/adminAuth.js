const crypto = require("crypto");

const DEFAULT_TTL_HOURS = 8;

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

function getSessionSecret() {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const creds = getAdminCredentials();
  if (!creds) return null;
  return `${creds.username}:${creds.password}:bulkmail-session-secret`;
}

function getSessionTtlMs() {
  const hours =
    Number.parseInt(process.env.ADMIN_SESSION_TTL_HOURS || `${DEFAULT_TTL_HOURS}`, 10) ||
    DEFAULT_TTL_HOURS;
  return Math.max(1, hours) * 60 * 60 * 1000;
}

function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token, secret) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload?.exp === "number" && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function timingSafeEqualStrings(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // Still do a comparison to mask length-based timing.
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function login(username, password) {
  const creds = getAdminCredentials();
  const secret = getSessionSecret();
  if (!creds || !secret) {
    const err = new Error(
      "Admin auth is not configured on the server (set ADMIN_USERNAME and ADMIN_PASSWORD).",
    );
    err.code = "ADMIN_NOT_CONFIGURED";
    err.status = 503;
    throw err;
  }
  if (
    !timingSafeEqualStrings(username || "", creds.username) ||
    !timingSafeEqualStrings(password || "", creds.password)
  ) {
    const err = new Error("Invalid username or password.");
    err.code = "ADMIN_BAD_CREDENTIALS";
    err.status = 401;
    throw err;
  }
  const ttlMs = getSessionTtlMs();
  const exp = Date.now() + ttlMs;
  const token = signToken({ sub: creds.username, exp }, secret);
  return { token, expiresAt: exp };
}

function getTokenFromRequest(req) {
  const header = req.get("authorization") || req.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function requireAdmin(req, res, next) {
  const secret = getSessionSecret();
  if (!secret) {
    return res.status(503).json({
      ok: false,
      code: "ADMIN_NOT_CONFIGURED",
      message:
        "Admin auth is not configured on the server (set ADMIN_USERNAME and ADMIN_PASSWORD).",
    });
  }
  const token = getTokenFromRequest(req);
  if (!token) {
    return res
      .status(401)
      .json({ ok: false, code: "AUTH_REQUIRED", message: "Missing bearer token." });
  }
  const payload = verifyToken(token, secret);
  if (!payload) {
    return res
      .status(401)
      .json({ ok: false, code: "AUTH_INVALID", message: "Session expired or invalid." });
  }
  req._admin = payload;
  next();
}

function adminConfigured() {
  return !!getAdminCredentials();
}

module.exports = { login, requireAdmin, adminConfigured };
