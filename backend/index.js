const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend working");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true
  });
});

app.options("/sendmail", (req, res) => {
  console.log("OPTIONS WORKED");
  res.sendStatus(204);
});

app.post("/sendmail", async (req, res) => {

  console.log("POST HIT");
  console.log(req.body);

  return res.json({
    ok: true,
    message: "POST works"
  });

});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER RUNNING ON", PORT);
});
