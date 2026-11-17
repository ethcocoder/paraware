import { storage } from './storage';

const TOKEN_KEY = 'paraware.token';

export function getToken() {
  return storage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) storage.setItem(TOKEN_KEY, token);
  else storage.removeItem(TOKEN_KEY);
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  let response;
  try {
    response = await fetch(`${apiBase}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    const error = new Error('offline');
    error.code = 'offline';
    throw error;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event('paraware:signed-out'));
    }
    const error = new Error(data?.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function assetUrl(url) {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return url;
}
