const path = require("path");

// Load backend/.env even when the process cwd is the repo root (Railway / monorepo).
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

function resolveMongoUri() {
  const keys = ["MONGODB_URI", "DATABASE_URL", "MONGO_URL", "MONGODB_URL"];
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return { uri: value, key };
  }
  return { uri: "", key: null };
}

const { uri: mongoUri, key: mongoEnvKey } = resolveMongoUri();
if (!mongoUri) {
  console.error(
    "No MongoDB connection string found. Set one of these in Railway → Service → Variables (exact names): " +
      "MONGODB_URI, DATABASE_URL, MONGO_URL, or MONGODB_URL. " +
      "Local: copy backend/.env.example to backend/.env and set MONGODB_URI."
  );
  process.exit(1);
}

console.log(`Using MongoDB from environment variable: ${mongoEnvKey}`);

mongoose.connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err?.message || err);
  });

app.post("/sendmail", async (req, res) => {

  const msg = req.body.msg;
  const emailList = req.body.emailList;

  try {

    const userdata = await mongoose.connection.db
      .collection("bulkmail")
      .findOne({});

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      service: "gmail",
      auth: {
        user: userdata.user,
        pass: userdata.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    for (let i = 0; i < emailList.length; i++) {

      await transporter.sendMail({
        from: userdata.user,
        to: emailList[i],
        subject: "Bulk mail",
        text: msg,
      });

    }

    res.send(true);

  } catch (err) {

    console.log(err);
    res.send(false);

  }

});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});