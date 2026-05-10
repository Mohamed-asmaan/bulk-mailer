const express = require("express");
const cors = require("cors");
const config = require("./config");
const { registerHealthRoutes } = require("./routes/health");
const { registerSendmailRoutes } = require("./routes/sendmail");

function createApp(serverStartedAt) {
  const app = express();
  app.set("trust proxy", config.trustProxyHops);

  app.options(
    "/sendmail",
    (req, _res, next) => {
      console.log("OPTIONS HIT");
      next();
    },
    cors(config.corsOptions),
  );

  app.use(cors(config.corsOptions));
  app.use(express.json({ limit: config.jsonBodyLimit }));

  registerHealthRoutes(app, serverStartedAt);
  registerSendmailRoutes(app);

  return app;
}

module.exports = { createApp };
