const config = require("../config");

const LOOSE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_CHARS = 250;

function validateSendMailBody(req, res, next) {
  const { msg, emailList, subject } = req.body ?? {};
  const errors = [];

  if (typeof msg !== "string") {
    errors.push("`msg` must be a string");
  } else {
    const trimmed = msg.trim();
    if (!trimmed.length) {
      errors.push("`msg` cannot be empty");
    } else if (trimmed.length > config.MAX_MESSAGE_CHARS) {
      errors.push(`\`msg\` exceeds max length (${config.MAX_MESSAGE_CHARS})`);
    }
  }

  let normalizedSubject = "";
  if (subject !== undefined && subject !== null) {
    if (typeof subject !== "string") {
      errors.push("`subject` must be a string");
    } else {
      normalizedSubject = subject.trim();
      if (normalizedSubject.length > MAX_SUBJECT_CHARS) {
        errors.push(`\`subject\` exceeds max length (${MAX_SUBJECT_CHARS})`);
      }
    }
  }

  if (!Array.isArray(emailList)) {
    errors.push("`emailList` must be an array");
  } else if (emailList.length === 0) {
    errors.push("`emailList` must have at least one address");
  } else if (emailList.length > config.MAX_RECIPIENTS) {
    errors.push(`Too many recipients (max ${config.MAX_RECIPIENTS})`);
  } else {
    for (let i = 0; i < emailList.length; i++) {
      const e = emailList[i];
      if (typeof e !== "string" || !LOOSE_EMAIL.test(e.trim())) {
        errors.push(`Invalid email at index ${i}`);
        break;
      }
    }
  }

  if (errors.length) {
    console.warn("[sendmail] validation failed:", errors.join("; "));
    return res.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: errors.join("; "),
    });
  }

  req._validated = {
    msg: String(msg).trim(),
    subject: normalizedSubject,
    emailList: emailList.map((e) => String(e).trim()),
  };
  return next();
}

module.exports = { validateSendMailBody, MAX_SUBJECT_CHARS };
