// Tiny fetch wrapper with JWT handling.
const TOKEN_KEY = "bb24market_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, { method = "GET", body = null, token = null } = {}) {
  const headers = {};
  if (body !== null) headers["Content-Type"] = "application/json";
  const t = token !== null ? token : getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error(
      "Can't reach the BB24Market server. Make sure the backend window (started by start.bat) is still open, then try again."
    );
    err.status = 0;
    throw err;
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      (data && (data.detail || data.message)) ||
      (typeof data === "string" && data.length < 300 ? data : "");
    // 502 with no JSON detail = the dev server couldn't reach the backend
    const msg =
      detail ||
      (res.status === 502
        ? "Can't reach the server — the backend doesn't seem to be running. Keep the backend window open and try again."
        : `Request failed (${res.status})`);
    const err = new Error(typeof msg === "string" ? msg : "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const money = (n) =>
  "$" + Number(n || 0).toFixed(2);
