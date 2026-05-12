const { Resend } = require("resend");
const { createSmtpTransport } = require("./smtp");

const DEFAULT_SUBJECT = process.env.BULK_MAIL_SUBJECT || "Bulk mail";

function redactEmail(email) {
  return String(email).replace(/(^.).*(@.*$)/, "$1***$2");
}

function detectProvider(pass) {
  if (typeof pass !== "string") return "smtp";
  if (pass.startsWith("re_")) return "resend";
  return "smtp";
}

function createResendMailer(fromAddress, apiKey) {
  const resend = new Resend(apiKey);
  console.log(`[mailer] provider=resend from=${redactEmail(fromAddress)}`);
  return {
    provider: "resend",
    async sendOne(to, msg, subject) {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to,
        subject: subject?.trim() || DEFAULT_SUBJECT,
        text: msg,
      });
      if (error) {
        const err = new Error(error.message || "Resend API error");
        err.code = error.name || "RESEND_ERROR";
        err.status = error.statusCode || 502;
        err.responseCode = error.statusCode;
        throw err;
      }
      return data;
    },
    async verify() {
      // Resend has no dedicated verify(); listing API keys exercises the auth path.
      try {
        await resend.apiKeys.list();
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err?.message, code: err?.name };
      }
    },
  };
}

async function createSmtpMailer(user, pass) {
  const transporter = await createSmtpTransport(user, pass);
  console.log(`[mailer] provider=smtp from=${redactEmail(user)}`);
  return {
    provider: "smtp",
    async sendOne(to, msg, subject) {
      return transporter.sendMail({
        from: user,
        to,
        subject: subject?.trim() || DEFAULT_SUBJECT,
        text: msg,
      });
    },
    async verify() {
      return transporter.verify();
    },
  };
}

async function createMailer(user, pass) {
  const provider = detectProvider(pass);
  if (provider === "resend") {
    return createResendMailer(user, pass);
  }
  return createSmtpMailer(user, pass);
}

module.exports = { createMailer, detectProvider };
