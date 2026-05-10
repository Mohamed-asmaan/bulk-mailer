require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error(
    "Missing MONGODB_URI. Local: copy backend/.env.example to backend/.env. Railway: open the service → Variables → add MONGODB_URI with your Atlas connection string."
  );
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log("connected to db");
  })
  .catch(() => {
    console.log("connection failed to db");
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
  console.log(`Server listening on port ${PORT}`);
});