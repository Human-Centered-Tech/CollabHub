const RAW_BASE = (import.meta.env.VITE_API_URL ?? '').trim();
const BASE = RAW_BASE.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) {
    super(message);
  }
}

function getToken(): string | null {
  return localStorage.getItem('collabhub_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('collabhub_token', token);
  else localStorage.removeItem('collabhub_token');
}

export async function api<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = `${BASE}/api${path}`;
  const res = await fetch(url, { ...init, headers });

  let body: any = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && (body.message || body.error)) ||
      res.statusText;
    throw new ApiError(res.status, String(message), body);
  }
  return body as T;
}
