const express = require("express");
const cors = require("cors");
const config = require("./config");
const { registerHealthRoutes } = require("./routes/health");
const { registerSendmailRoutes } = require("./routes/sendmail");
const { registerAdminRoutes } = require("./routes/admin");

function createApp(serverStartedAt) {
  const app = express();
  app.set("trust proxy", config.trustProxyHops);

  const corsMiddleware = cors(config.corsOptions);
  app.use(corsMiddleware);
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
      console.log("[cors] preflight", req.path, "origin=", req.headers.origin);
      return res.sendStatus(204);
    }
    return next();
  });

  app.use(express.json({ limit: config.jsonBodyLimit }));

  registerHealthRoutes(app, serverStartedAt);
  registerSendmailRoutes(app);
  registerAdminRoutes(app);

  return app;
}

module.exports = { createApp };
