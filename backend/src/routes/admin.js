const rateLimit = require("express-rate-limit");
const { login, requireAdmin, adminConfigured } = require("../lib/adminAuth");
const { listEmailHistory } = require("../lib/history");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn("[rate-limit] /admin/login from", req.ip);
    res.status(429).json({
      ok: false,
      code: "RATE_LIMIT",
      message: "Too many login attempts — try again later.",
    });
  },
});

function registerAdminRoutes(app) {
  app.get("/admin/status", (_req, res) => {
    res.json({ ok: true, configured: adminConfigured() });
  });

  app.post("/admin/login", loginLimiter, (req, res, next) => {
    try {
      const { username, password } = req.body ?? {};
      if (typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "`username` and `password` are required.",
        });
      }
      const { token, expiresAt } = login(username, password);
      console.log("[admin] login ok", username);
      return res.json({ ok: true, token, expiresAt });
    } catch (err) {
      if (err?.code === "ADMIN_BAD_CREDENTIALS") {
        console.warn("[admin] login failed from", req.ip);
      }
      return next(err);
    }
  });

  app.get("/admin/me", requireAdmin, (req, res) => {
    const payload = req._admin || {};
    res.json({ ok: true, username: payload.sub, expiresAt: payload.exp });
  });

  app.get("/history", requireAdmin, async (req, res, next) => {
    try {
      const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 50;
      const skip = req.query.skip ? Number.parseInt(req.query.skip, 10) : 0;
      const result = await listEmailHistory({ limit, skip });
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerAdminRoutes };
