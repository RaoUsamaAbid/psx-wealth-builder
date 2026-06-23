/**
 * Typed API client. By default requests go to the same origin via `/api`
 * (the Vite dev proxy locally, the nginx proxy in the web Docker image). When
 * `VITE_API_URL` is set at build time (e.g. the SPA on Vercel + the API on
 * Render), requests go directly to that absolute API origin instead.
 *
 * The bearer token is held in module scope and set by the auth store.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach bearer token (default true)
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;

  // With an absolute API base the routes are at its root; otherwise use the
  // same-origin `/api` proxy prefix.
  const url = API_BASE ? `${API_BASE}${path}` : `/api${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    let message = `request failed (${res.status})`;
    if (data && typeof data === 'object' && 'error' in data) {
      message = String((data as { error: unknown }).error);
    }
    throw new ApiError(res.status, message);
  }
  return data as T;
}
