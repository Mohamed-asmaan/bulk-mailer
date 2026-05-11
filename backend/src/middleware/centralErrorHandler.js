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
  const SMTP_NETWORK_CODES = new Set([
    "ESOCKET",
    "ETIMEDOUT",
    "ETIMEOUT",
    "ECONNECTION",
    "ECONNREFUSED",
    "ECONNRESET",
    "EDNS",
    "ENOTFOUND",
  ]);
  if (!explicitStatus && SMTP_NETWORK_CODES.has(String(err.code || "").toUpperCase())) {
    console.error("[smtp] network error", err.code, err.command, err.address, err.port);
    status = 502;
    code = "SMTP_NETWORK";
  }
  const clientSafe =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Server error — check server logs."
      : err.message || "Request failed";
  if (!res.headersSent) {
    res.status(status).json({
      ok: false,
      code,
      message: clientSafe,
    });
  }
}

module.exports = { centralErrorHandler };
