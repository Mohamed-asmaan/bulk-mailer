const { credentialsDb } = require("./mongo");

const HISTORY_COLLECTION = "email_history";
const PREVIEW_RECIPIENTS = 25;
const MAX_BODY_PREVIEW = 4000;

function historyCollection() {
  return credentialsDb().collection(HISTORY_COLLECTION);
}

function clipString(value, max) {
  const s = String(value ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…[truncated ${s.length - max} chars]`;
}

async function recordEmailHistory({
  subject,
  body,
  recipients,
  status,
  sentCount,
  totalCount,
  provider,
  errorMessage,
  errorCode,
  fromUser,
  startedAt,
}) {
  const recipientsList = Array.isArray(recipients) ? recipients : [];
  const doc = {
    subject: String(subject || "").slice(0, 500),
    body: clipString(body, MAX_BODY_PREVIEW),
    bodyLength: typeof body === "string" ? body.length : 0,
    recipientsPreview: recipientsList.slice(0, PREVIEW_RECIPIENTS),
    recipientsTotal: recipientsList.length,
    sentCount: Number.isFinite(sentCount) ? sentCount : 0,
    totalCount: Number.isFinite(totalCount) ? totalCount : recipientsList.length,
    status,
    provider: provider || null,
    fromUser: fromUser
      ? String(fromUser).replace(/(^.).*(@.*$)/, "$1***$2")
      : null,
    errorMessage: errorMessage ? String(errorMessage).slice(0, 1000) : null,
    errorCode: errorCode ? String(errorCode).slice(0, 100) : null,
    startedAt: startedAt ? new Date(startedAt) : null,
    createdAt: new Date(),
  };
  try {
    await historyCollection().insertOne(doc);
  } catch (err) {
    console.error("[history] insert failed:", err?.message || err);
  }
}

async function listEmailHistory({ limit = 50, skip = 0 } = {}) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const cappedSkip = Math.max(Number(skip) || 0, 0);
  const cursor = historyCollection()
    .find({}, { projection: { body: 0 } })
    .sort({ createdAt: -1 })
    .skip(cappedSkip)
    .limit(cappedLimit);
  const items = await cursor.toArray();
  const total = await historyCollection().estimatedDocumentCount();
  return { items, total, limit: cappedLimit, skip: cappedSkip };
}

module.exports = { recordEmailHistory, listEmailHistory, HISTORY_COLLECTION };
