import { API_URL } from './config';

let token = null;
let onExpired = null;

export const setToken = (t) => { token = t; };
export const setOnExpired = (fn) => { onExpired = fn; };

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000); // give up after 15 seconds
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error('Cannot reach the server. Check that the API is running and that API_URL in src/config.js is correct.');
  } finally {
    clearTimeout(timer);
  }

  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    // only a rejected token means the session is over
    if (res.status === 401 && data.code === 'AUTH_REQUIRED' && onExpired) onExpired();
    const err = new Error(data.message || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b === undefined ? {} : b),
  put: (p, b) => request('PUT', p, b === undefined ? {} : b),
  patch: (p, b) => request('PATCH', p, b === undefined ? {} : b),
};
