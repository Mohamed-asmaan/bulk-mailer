import axios from "axios";
import { API_BASE, API_TIMEOUT_MS } from "../config";

const TOKEN_KEY = "bulkmail.adminToken";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage errors (private mode) */
  }
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function adminLogin(username, password) {
  return axios.post(
    `${API_BASE}/admin/login`,
    { username, password },
    { timeout: API_TIMEOUT_MS },
  );
}

export function adminMe(token) {
  return axios.get(`${API_BASE}/admin/me`, {
    timeout: API_TIMEOUT_MS,
    headers: authHeader(token),
  });
}

export function adminStatus() {
  return axios.get(`${API_BASE}/admin/status`, { timeout: API_TIMEOUT_MS });
}

export function fetchHistory(token, { limit = 50, skip = 0 } = {}) {
  return axios.get(`${API_BASE}/history`, {
    timeout: API_TIMEOUT_MS,
    headers: authHeader(token),
    params: { limit, skip },
  });
}
