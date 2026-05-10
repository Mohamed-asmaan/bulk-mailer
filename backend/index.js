const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("WORKING");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("RUNNING ON", PORT);
});
