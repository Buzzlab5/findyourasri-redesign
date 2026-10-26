/**
 * What /admin/manage/ needs to talk to the function as the signed-in team member. The sign-in itself happens
 * on /admin/ (AdminApp); both pages share the session it keeps in this browser's localStorage.
 */

export const API = process.env.NEXT_PUBLIC_CLIENT_PROFILE_API ?? '';
const SESSION_STORE = 'asri-admin-session';
const CONFIG_STORE = 'asri-admin-config';

export type Session = { access: string; refresh: string; expires: number; email: string };
type Config = { url: string; anonKey: string };

/** Thrown for anything the page should show to the person: a sentence, plus the HTTP status if there was one. */
export class AdminError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

export function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_STORE) ?? 'null') as Session | null;
    return s && s.access && s.refresh ? s : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORE);
  } catch {
    // Nothing to clear.
  }
}

async function post(body: Record<string, unknown>, token?: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function config(): Promise<Config> {
  try {
    const cached = JSON.parse(localStorage.getItem(CONFIG_STORE) ?? 'null') as Config | null;
    if (cached?.url && cached?.anonKey) return cached;
  } catch {
    // Fetched below.
  }
  const { data } = await post({ action: 'config' });
  if (!data.url || !data.anonKey) throw new AdminError('The server is not ready for this page yet.');
  return data as Config;
}

/** A token good for at least another minute, refreshed (and saved) when it is not. */
async function freshToken(): Promise<string> {
  const s = readSession();
  if (!s) throw new AdminError('Sign in to continue.', 401);
  if (s.expires - 60_000 > Date.now()) return s.access;
  const cfg = await config();
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    clearSession();
    throw new AdminError('Your session ended. Sign in again.', 401);
  }
  const next: Session = {
    access: data.access_token,
    refresh: data.refresh_token ?? s.refresh,
    expires: Date.now() + (data.expires_in ?? 3600) * 1000,
    email: data.user?.email ?? s.email,
  };
  try {
    localStorage.setItem(SESSION_STORE, JSON.stringify(next));
  } catch {
    // The next call refreshes again.
  }
  return next.access;
}

/** One admin action. Resolves with the response body, or throws an AdminError with a sentence to show. */
export async function adminCall(action: string, extra: Record<string, unknown> = {}) {
  if (!API) throw new AdminError('This page is not connected yet.');
  const { status, data } = await post({ action, ...extra }, await freshToken());
  if (status === 401) {
    clearSession();
    throw new AdminError('Your session ended. Sign in again.', 401);
  }
  if (status === 403) throw new AdminError('That account is not on the admin list.', 403);
  if (status === 409) throw new AdminError('This profile changed since the page loaded. Reload and try again.', 409);
  if (status === 404) throw new AdminError('That profile no longer exists.', 404);
  if (status >= 400) throw new AdminError('The server could not do that. Try again in a moment.', status);
  return data as Record<string, unknown>;
}
