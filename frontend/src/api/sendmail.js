import axios from "axios";
import { API_BASE, API_TIMEOUT_MS } from "../config";

export function postSendmail(msg, emailList) {
  return axios.post(`${API_BASE}/sendmail`, { msg, emailList }, { timeout: API_TIMEOUT_MS });
}

export function sendSuccess(data) {
  return data === true || (data && typeof data === "object" && data.ok === true);
}

export function formatApiError(err) {
  const isNetwork =
    err.code === "ERR_NETWORK" || err.message?.toLowerCase().includes("network");
  if (isNetwork) {
    return "Cannot reach API (check CORS, Render deploy, or your connection).";
  }
  const body = err.response?.data;
  const msg =
    (body && typeof body === "object" && (body.message || body.error)) ||
    err.response?.statusText ||
    err.message ||
    "unknown";
  const code = body?.code ? ` [${body.code}]` : "";
  return `Request failed${code}: ${msg}`;
}
