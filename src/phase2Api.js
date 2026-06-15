const SESSION_KEY = 'mahar_pos_session_v1';

function readLegacyToken() {
  return localStorage.getItem('mahar_pos_token')
    || localStorage.getItem('authToken')
    || localStorage.getItem('token')
    || '';
}

export function getSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (stored?.token) return stored;
  } catch {
    // Ignore invalid browser storage and fall back to legacy token keys.
  }

  const token = readLegacyToken();
  return token ? { token, user: null } : null;
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  if (session?.token) localStorage.setItem('mahar_pos_token', session.token);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('mahar_pos_token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
}

export async function login({ username, password, shopSlug }) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password, shopSlug }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.token) {
    const error = new Error(data?.message || 'Login failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  const session = { token: data.token, user: data.user || null, expiresIn: data.expiresIn || null };
  saveSession(session);
  return session;
}

export async function apiFetch(path, options = {}) {
  const session = getSession();
  const headers = {
    Accept: 'application/json',
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
    ...(options.body !== undefined && typeof options.body !== 'string'
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearSession();
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
