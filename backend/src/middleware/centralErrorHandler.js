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

module.exports = { centralErrorHandler };
