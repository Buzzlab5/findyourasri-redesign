'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import {
  answersAsText,
  fields,
  formatAnswer,
  hasValue,
  makeGetter,
  sections,
  type Answer,
} from '@/lib/client-profile/schema';

import './admin.css';

/**
 * The team's view of every submitted client profile, at /admin/.
 *
 * The site is a static export, so this page holds no data. It signs in with a
 * Supabase Auth account (email and password, created in the dashboard), then
 * asks the client-profile Edge Function for the list and for each profile. The
 * function checks the token and the ADMIN_EMAILS list on every request, so
 * nothing here is the lock: it only shows what the function agrees to send.
 */

const API = process.env.NEXT_PUBLIC_CLIENT_PROFILE_API ?? '';
const STORE = 'asri-admin-session';
const CONFIG_STORE = 'asri-admin-config';
const LAYOUT_STORE = 'asri-admin-layout';
const SEEN_STORE = 'asri-admin-seen';
/** A profile opened in the last 20 minutes is shown again at once. Its file links last an hour. */
const DETAIL_TTL = 20 * 60_000;
/** Coming back to the list shows it as it was, and refreshes it quietly if it is older than this. */
const LIST_TTL = 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Config = { url: string; anonKey: string };
type Session = { access: string; refresh: string; expires: number; email: string };
type Row = {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  country: string | null;
  sector: string | null;
  services: string[];
  budget: string | null;
  submitted_at: string;
  client_files: { count: number }[];
  followups?: { kind: string; text: string }[];
};
type Profile = Row & {
  answers: Record<string, Answer>;
  followups: { kind: string; text: string }[];
  source: Record<string, string>;
};
type FileRow = { path: string; name: string; size: number; category: string; field?: string | null; url: string | null; thumb?: string | null };
type Detail = { profile: Profile; files: FileRow[] };

/** For files saved before the field was recorded: the question their category most likely came from. */
const CATEGORY_FIELD: Record<string, string> = {
  'Brand guidelines': 'guidelines_file',
  Logo: 'logo_files',
  Photos: 'photo_upload',
  Renderings: 'renders_upload',
  'Menu or price list': 'other_upload',
  'Press kit': 'other_upload',
  Other: 'other_upload',
};
const fieldOf = (f: FileRow) => f.field || CATEGORY_FIELD[f.category] || '';

class SignInError extends Error {}

/** The clock, read outside the component body (it is only ever used in event handlers and loaders). */
const now = () => Date.now();

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const megabytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const isImage = (name: string) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
const ref = (id: string) => `ASRI-${id.slice(0, 8).toUpperCase()}`;

const filesOf = (r: Row) => r.client_files?.[0]?.count ?? 0;
const setupOf = (r: Row) => (r.followups ?? []).filter((f) => f.kind === 'setup').length;
const sectorOf = (r: Row) => (r.sector ?? '').split(' (')[0];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

/** "just now", "3 days ago", "2 weeks ago": how long ago, in the biggest unit that fits. */
function ago(iso: string) {
  const mins = Math.max(0, Math.round((now() - Date.parse(iso)) / 60_000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

async function post(body: Record<string, unknown>, token?: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function tokenRequest(cfg: Config, grant: 'password' | 'refresh_token', payload: Record<string, string>): Promise<Session> {
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new SignInError(grant === 'password' ? 'That email and password do not match.' : 'Your session ended. Sign in again.');
  }
  return {
    access: data.access_token,
    refresh: data.refresh_token,
    expires: Date.now() + (data.expires_in ?? 3600) * 1000,
    email: data.user?.email ?? payload.email ?? '',
  };
}

export default function AdminApp() {
  const [phase, setPhase] = useState<'loading' | 'out' | 'in'>('loading');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<{ profile: Profile; files: FileRow[] } | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [layout, setLayout] = useState<'split' | 'list'>('split');
  const [seen, setSeen] = useState<string[]>([]);
  const config = useRef<Config | null>(null);
  const configLoad = useRef<Promise<Config | null> | null>(null);
  const listAt = useRef(0);
  const details = useRef(new Map<string, Detail & { at: number }>());
  const inflight = useRef(new Map<string, Promise<Detail & { at: number }>>());
  const session = useRef<Session | null>(null);

  function remember(next: Session | null) {
    session.current = next;
    setEmail(next?.email ?? '');
    try {
      if (next) localStorage.setItem(STORE, JSON.stringify(next));
      else localStorage.removeItem(STORE);
    } catch {
      // Storage can be blocked; you just sign in again next time.
    }
  }

  function signOut(why = '') {
    remember(null);
    details.current.clear();
    inflight.current.clear();
    listAt.current = 0;
    setRows(null);
    setDetail(null);
    setSelected('');
    setMessage(why);
    setPhase('out');
  }

  /** A token that is good for at least another minute, refreshed when it is not. */
  async function freshToken() {
    const s = session.current;
    if (!s) throw new SignInError('Sign in to continue.');
    if (s.expires - 60_000 > now()) return s.access;
    if (!config.current) await loadConfig();
    if (!config.current) throw new SignInError('Sign in to continue.');
    const next = await tokenRequest(config.current, 'refresh_token', { refresh_token: s.refresh });
    remember({ ...next, email: next.email || s.email });
    return next.access;
  }

  async function admin(action: string, extra: Record<string, unknown> = {}) {
    const { status, data } = await post({ action, ...extra }, await freshToken());
    if (status === 401) throw new SignInError('Your session ended. Sign in again.');
    if (status === 403) {
      throw new SignInError(data.error === 'admin_not_configured' ? 'The admin list has not been set up yet.' : 'That account is not on the admin list.');
    }
    if (status >= 400) throw new Error(data.error ?? 'server');
    return data;
  }

  /** The project's sign-in address, from the function. Asked once, and remembered in this browser for next time. */
  function loadConfig(): Promise<Config | null> {
    if (!configLoad.current) {
      configLoad.current = post({ action: 'config' })
        .then(({ data }) => {
          if (!data.url || !data.anonKey) return null;
          config.current = data as Config;
          setReady(true);
          try {
            localStorage.setItem(CONFIG_STORE, JSON.stringify(data));
          } catch {
            // Fine: it is fetched again next time.
          }
          return config.current;
        })
        .catch(() => null);
    }
    return configLoad.current;
  }

  /** `quiet` refreshes behind the scenes: the list on screen stays, with no flash and no error banner. */
  async function loadList(quiet = false) {
    if (quiet) setRefreshing(true);
    try {
      const data = await admin('admin-list');
      setRows(data.profiles as Row[]);
      listAt.current = now();
      setMessage('');
    } catch (e) {
      if (e instanceof SignInError) signOut(e.message);
      else if (!quiet) setMessage('The list did not load. Try again in a moment.');
    } finally {
      setRefreshing(false);
    }
  }

  /** One profile, from memory when it was opened recently, and never asked for twice at the same time. */
  function fetchDetail(id: string): Promise<Detail & { at: number }> {
    const hit = details.current.get(id);
    if (hit && now() - hit.at < DETAIL_TTL) return Promise.resolve(hit);
    let pending = inflight.current.get(id);
    if (!pending) {
      pending = admin('admin-get', { id })
        .then((data) => {
          const value = { profile: data.profile as Profile, files: data.files as FileRow[], at: now() };
          details.current.set(id, value);
          return value;
        })
        .finally(() => inflight.current.delete(id));
      inflight.current.set(id, pending);
    }
    return pending;
  }

  async function loadDetail(id: string) {
    const hit = details.current.get(id);
    const stillOpen = () => window.location.hash.replace('#', '') === id;
    if (hit && now() - hit.at < DETAIL_TTL) {
      setDetail(hit);
      setMessage('');
      markSeen(id);
      return;
    }
    setDetail(null);
    try {
      const value = await fetchDetail(id);
      if (stillOpen()) {
        setDetail(value);
        setMessage('');
        markSeen(id);
      }
    } catch (e) {
      if (e instanceof SignInError) signOut(e.message);
      else if (stillOpen()) setMessage('That profile did not load. Go back and try again.');
    }
  }

  /** Starts loading a profile while the pointer is still on its row, so the click shows it at once. */
  function prefetch(id: string) {
    fetchDetail(id).catch(() => {});
  }

  // Start: pick up a saved session and show the list straight away. The sign-in address is read from
  // this browser's memory when it is there, so nothing waits on the network for it.
  useEffect(() => {
    let live = true;
    (async () => {
      if (!API) {
        setMessage('This page is not connected yet.');
        setPhase('out');
        return;
      }
      try {
        const cached = JSON.parse(localStorage.getItem(CONFIG_STORE) ?? 'null') as Config | null;
        if (cached?.url && cached?.anonKey) {
          config.current = cached;
          setReady(true);
        }
      } catch {
        // No saved address: it is fetched below.
      }
      const pending = loadConfig();
      let saved: Session | null = null;
      try {
        saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Session | null;
      } catch {
        // No saved session.
      }
      if (saved && live) {
        remember(saved);
        setPhase('in');
        await loadList();
        return;
      }
      if (!config.current && !(await pending) && live) {
        setMessage('The server could not be reached, or has not been updated for this page yet. Reload to try again.');
      }
      if (live) setPhase('out');
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on load
  }, []);

  // This browser's layout choice, and which profiles it has already opened (for the "new" dot).
  useEffect(() => {
    try {
      const chosen = localStorage.getItem(LAYOUT_STORE);
      /* eslint-disable react-hooks/set-state-in-effect -- one-off read of saved preferences */
      if (chosen === 'split' || chosen === 'list') setLayout(chosen);
      const opened = JSON.parse(localStorage.getItem(SEEN_STORE) ?? '[]');
      if (Array.isArray(opened)) setSeen(opened.filter((x) => typeof x === 'string'));
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Defaults: split view, nothing opened yet.
    }
  }, []);

  function chooseLayout(next: 'split' | 'list') {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORE, next);
    } catch {
      // The choice just is not remembered.
    }
  }

  function markSeen(id: string) {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id].slice(-500);
      try {
        localStorage.setItem(SEEN_STORE, JSON.stringify(next));
      } catch {
        // Fine: the dot comes back next visit.
      }
      return next;
    });
  }

  // The address bar's #id is the open profile, so a profile can be linked and the back button works.
  useEffect(() => {
    const read = () => {
      const id = window.location.hash.replace('#', '');
      setSelected(UUID.test(id) ? id : '');
    };
    read();
    window.addEventListener('hashchange', read);
    window.addEventListener('popstate', read);
    return () => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener('popstate', read);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'in' || !selected) return;
    loadDetail(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the chosen profile changes
  }, [phase, selected]);

  async function onSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!config.current) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setMessage('');
    try {
      const next = await tokenRequest(config.current, 'password', {
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      remember(next);
      setPhase('in');
      await loadList();
    } catch (err) {
      setMessage(err instanceof SignInError ? err.message : 'Sign-in did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) => !q || [r.business_name, r.contact_name, r.contact_email, r.country ?? '', r.sector ?? ''].some((x) => x.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  function open(id: string) {
    history.pushState(null, '', `#${id}`);
    setSelected(id);
  }
  function back() {
    history.pushState(null, '', window.location.pathname + window.location.search);
    setSelected('');
    setDetail(null);
    if (now() - listAt.current > LIST_TTL) loadList(true);
  }

  async function copyText() {
    if (!detail) return;
    const { profile, files } = detail;
    const text =
      answersAsText(makeGetter(profile.answers), []) +
      (files.length ? `\nFiles:\n${files.map((f) => `- ${f.name} (${f.category})`).join('\n')}\n` : '');
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied.');
    } catch {
      setCopied('Your browser blocked copying.');
    }
    setTimeout(() => setCopied(''), 3000);
  }

  /* ---------------------------------------------------------------- views */

  if (phase === 'loading') {
    return (
      <div className="tone-cream ad">
        <p className="ad__muted">Loading…</p>
      </div>
    );
  }

  if (phase === 'out') {
    return (
      <div className="tone-cream ad">
        <form className="ad__login" onSubmit={onSignIn}>
          <h1 className="ad__h1">Team sign in</h1>
          <p className="ad__muted">Client profiles are private. Sign in with your Asri team account.</p>
          <label className="field">
            <span className="field__label">Email</span>
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <div className="field">
            <label className="field__label" htmlFor="admin-password">
              Password
            </label>
            <div className="ad-pw">
              <input id="admin-password" name="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" required />
              <button type="button" className="ad-pw__eye" aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw} onClick={() => setShowPw((v) => !v)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPw ? <path d="M4 4l16 16" /> : null}
                </svg>
              </button>
            </div>
          </div>
          {message ? (
            <p className="ad__error" role="alert">
              {message}
            </p>
          ) : null}
          <button type="submit" className="pill pill--ink" disabled={busy || !ready}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  const top = (
    <div className="ad__top">
      <div className="ad-view" role="group" aria-label="Layout">
          <button type="button" aria-pressed={layout === 'split'} onClick={() => chooseLayout('split')}>
            Split view
          </button>
          <button type="button" aria-pressed={layout === 'list'} onClick={() => chooseLayout('list')}>
            List
          </button>
        </div>
      <span className="ad__muted">{email}</span>
      <button type="button" className="ad__link" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );

  const detailEl =
    detail && detail.profile.id === selected ? (
      <Detail profile={detail.profile} files={detail.files} onCopy={copyText} copied={copied} />
    ) : message ? null : (
      <Opening row={rows?.find((r) => r.id === selected)} />
    );

  const head = (
    <div className="ad__head">
      <div>
        <h1 className="ad__h1">Client profiles</h1>
        <span className="ad__muted">
          {rows === null ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'profile' : 'profiles'}`}
        </span>
      </div>
      <div className="ad-tools-top">
        <button type="button" className="ad__link" onClick={() => loadList(true)} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );

  const listPane = (
    <>
      <div className="ad-tools">
        <label className="ad__search">
          <span className="ad__sr">Search profiles</span>
          <input type="search" placeholder="Search by business, name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {rows === null ? (
        message ? null : <p className="ad__muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="ad__empty">No profiles yet. They appear here as soon as a client sends the form.</p>
      ) : shown.length === 0 ? (
        <p className="ad__empty">Nothing matches that.</p>
      ) : (
        <div className={layout === 'split' ? 'ad-compact' : 'ad-rows'}>
          {shown.map((r) => {
            const fresh = !seen.includes(r.id);
            const props = {
              r,
              fresh,
              selected: r.id === selected,
              onOpen: () => open(r.id),
              onHover: () => prefetch(r.id),
            };
            return layout === 'split' ? <CompactRow key={r.id} {...props} /> : <RichRow key={r.id} {...props} />;
          })}
        </div>
      )}
    </>
  );

  if (layout === 'split') {
    return (
      <div className="tone-cream ad ad--wide">
        {top}
        {head}
        {message ? <p className="ad__error" role="alert">{message}</p> : null}
        <div className="ad-split" data-open={selected ? 'true' : 'false'}>
          <div className="ad-split__list">{listPane}</div>
          <div className="ad-split__detail">
            {selected ? (
              <>
                <button type="button" className="ad__link ad-split__back" onClick={back}>
                  All profiles
                </button>
                {detailEl}
              </>
            ) : (
              <p className="ad__empty">Pick a client on the left to read their profile.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="tone-cream ad">
        {top}
        <button type="button" className="ad__link ad__back" onClick={back}>
          All profiles
        </button>
        {message ? <p className="ad__error" role="alert">{message}</p> : null}
        {detailEl}
      </div>
    );
  }

  return (
    <div className="tone-cream ad">
      {top}
      {head}
      {message ? <p className="ad__error" role="alert">{message}</p> : null}
      {listPane}
    </div>
  );
}

/* ---------------------------------------------------------------- list rows */

type RowProps = { r: Row; fresh: boolean; selected: boolean; onOpen: () => void; onHover: () => void };

function TodoPill({ r }: { r: Row }) {
  // Until the function sends follow-ups with the list, say nothing rather than claim there is nothing to do.
  if (!r.followups) return null;
  const n = setupOf(r);
  return <span className={`ad-todo${n ? '' : ' ad-todo--none'}`}>{n ? `${n} to set up` : 'Nothing to set up'}</span>;
}

/** The full-width list row: who, what they want, files, what the team has to do, and how long ago. */
function RichRow({ r, fresh, onOpen, onHover }: RowProps) {
  const files = filesOf(r);
  return (
    <a
      href={`#${r.id}`}
      className="ad-row"
      onClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
      onPointerEnter={onHover}
    >
      <span className="ad-mono" aria-hidden="true">
        {initials(r.business_name)}
      </span>
      <span className="ad-row__who">
        <b>
          {r.business_name}
          {fresh ? <i className="ad-dot" title="Not opened yet" /> : null}
        </b>
        <small>{[sectorOf(r), r.country].filter(Boolean).join(' · ') || 'Sector not given'}</small>
      </span>
      <span className="ad-row__who">
        <b className="ad-row__plain">{r.contact_name}</b>
        <small>{r.contact_email}</small>
      </span>
      <span className="ad-svc">
        {r.services.slice(0, 2).map((x) => (
          <span key={x}>{x.split(' (')[0]}</span>
        ))}
        {r.services.length > 2 ? <span>+{r.services.length - 2}</span> : null}
      </span>
      <span className="ad-row__files">{files ? `${files} file${files === 1 ? '' : 's'}` : 'No files'}</span>
      <span className="ad-row__end">
        <TodoPill r={r} />
        <small>{ago(r.submitted_at)}</small>
      </span>
    </a>
  );
}

/** The narrow row beside an open profile. */
function CompactRow({ r, fresh, selected, onOpen, onHover }: RowProps) {
  const n = setupOf(r);
  return (
    <a
      href={`#${r.id}`}
      className={`ad-item${selected ? ' is-sel' : ''}`}
      aria-current={selected ? 'true' : undefined}
      onClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
      onPointerEnter={onHover}
    >
      <b>
        {fresh ? <i className="ad-dot" title="Not opened yet" /> : null}
        {r.business_name}
      </b>
      <small>
        {[sectorOf(r), ago(r.submitted_at)].filter(Boolean).join(' · ')}
        {n ? <span className="ad-todo ad-todo--small">{n} to set up</span> : null}
      </small>
    </a>
  );
}

/* --------------------------------------------------------------- one profile */

const KIND: Record<string, string> = { setup: 'Set up', check: 'Check', note: 'Note' };

function Detail({ profile, files, onCopy, copied }: { profile: Profile; files: FileRow[]; onCopy: () => void; copied: string }) {
  const answers = profile.answers ?? {};
  const text = (id: string) => (typeof answers[id] === 'string' ? (answers[id] as string) : '');
  const phone = text('contact_phone');
  const wa = phone.replace(/\D/g, '');

  const secs = sections
    .map((s) => ({ s, rows: s.fields.filter((f) => (f.type === 'file' ? files.some((x) => fieldOf(x) === f.id) : hasValue(answers[f.id] as Answer))) }))
    .filter((x) => x.rows.length);
  const known = new Set(Object.keys(fields));
  const extra = Object.entries(answers).filter(([k, v]) => !known.has(k) && hasValue(v as Answer));
  const categories = [...new Set(files.map((f) => f.category))];

  const sector = text('sector') === 'Other' ? text('sector_other') : text('sector').split(' (')[0];
  const where = [text('city'), text('country')].filter(Boolean).join(', ');
  const wants = Array.isArray(answers.services) ? (answers.services as string[]).map((x) => x.split(' (')[0]) : [];
  const colours = text('colors').split(/[,\s]+/).filter((c) => /^#[0-9a-f]{6}$/i.test(c));

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <article className="ad__detail">
      <h1 className="ad__h1">{profile.business_name}</h1>
      <p className="ad__muted">
        Received {date(profile.submitted_at)} from {profile.contact_name}. Reference {ref(profile.id)}.
      </p>
      <div className="ad-reach">
        <a className="ad-reach__item" href={`mailto:${profile.contact_email}`}>
          <span className="ad-reach__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="1.5" />
              <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
            </svg>
          </span>
          <span className="ad-reach__text">
            <b>Send email</b>
            <small>{profile.contact_email}</small>
          </span>
        </a>
        {wa ? (
          <a className="ad-reach__item" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
            <span className="ad-reach__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 19L4 20Z" />
                <path d="M9.2 9.5c.3 2 2.6 4.2 5 4.8" />
              </svg>
            </span>
            <span className="ad-reach__text">
              <b>Message on WhatsApp</b>
              <small>{phone}</small>
            </span>
          </a>
        ) : null}
        <button type="button" className="ad-reach__item ad-reach__item--quiet" onClick={onCopy}>
          <span className="ad-reach__icon" aria-hidden="true">
            {copied === 'Copied.' ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="8" width="12" height="12" rx="1.5" />
                <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
              </svg>
            )}
          </span>
          <span className="ad-reach__text" role="status">
            <b>{copied === 'Copied.' ? 'Copied' : copied ? 'Could not copy' : 'Copy all answers'}</b>
            <small>{copied === 'Copied.' ? 'Ready to paste' : copied ? 'Your browser blocked it' : 'As plain text'}</small>
          </span>
        </button>
      </div>

      <nav className="ad-jump" aria-label="Jump to a section">
        <button type="button" onClick={() => jump('ad-overview')}>
          Overview
        </button>
        {secs.map(({ s }) => (
          <button key={s.id} type="button" onClick={() => jump(`ad-${s.id}`)}>
            {s.title}
          </button>
        ))}
        <button type="button" onClick={() => jump('ad-files')}>
          All files
        </button>
      </nav>

      <section id="ad-overview" className="ad-over">
        <div className="ad-facts">
          <div className="ad-fact">
            <small>Business</small>
            <b>{sector || 'Sector not given'}</b>
            <span>{[text('stage'), where].filter(Boolean).join(' · ') || 'No more detail'}</span>
          </div>
          <div className="ad-fact">
            <small>Wants</small>
            <b>{wants.length ? `${wants.slice(0, 3).join(', ')}${wants.length > 3 ? `, +${wants.length - 3} more` : ''}` : 'Not given'}</b>
            <span>{text('budget') ? `Budget: ${text('budget')}` : 'No budget given'}</span>
          </div>
          <div className="ad-fact">
            <small>Contact</small>
            <b>{[profile.contact_name, text('contact_role')].filter(Boolean).join(', ')}</b>
            <span>{[profile.contact_email, phone].filter(Boolean).join(' · ')}</span>
          </div>
          <div className="ad-fact">
            <small>Brand colours</small>
            {colours.length ? <Swatches value={colours.join(', ')} /> : <b>None given</b>}
          </div>
        </div>

        {profile.followups?.length ? (
          <div className="ad-todo-list">
            <h2 className="ad__h2">Team follow-ups</h2>
            <ul className="ad__todo">
              {profile.followups.map((f, i) => (
                <li key={i}>
                  <span className={`ad__tag ad__tag--${f.kind}`}>{KIND[f.kind] ?? 'Note'}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {secs.map(({ s, rows }) => (
        <details className="ad-sec" id={`ad-${s.id}`} key={s.id} open>
          <summary>
            <h2 className="ad__h2">{s.title}</h2>
            <span className="ad__muted">{rows.length} answer{rows.length === 1 ? '' : 's'}</span>
          </summary>
          <dl className="ad__qa">
            {rows.map((f) => (
              <div key={f.id}>
                <dt>{f.label}</dt>
                <dd>
                  {f.type === 'file' ? (
                    <FileItems files={files.filter((x) => fieldOf(x) === f.id)} />
                  ) : f.id === 'colors' ? (
                    <Swatches value={String(answers[f.id])} />
                  ) : (
                    <Text value={formatAnswer(f, answers[f.id] as Answer)} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ))}

      {extra.length ? (
        <details className="ad-sec" open>
          <summary>
            <h2 className="ad__h2">Other answers</h2>
          </summary>
          <dl className="ad__qa">
            {extra.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>
                  <Text value={Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : `${x.url} ${x.notes}`)).join(', ') : String(v)} />
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      <details className="ad-sec" id="ad-files" open>
        <summary>
          <h2 className="ad__h2">All files</h2>
          <span className="ad__muted">{files.length} file{files.length === 1 ? '' : 's'}</span>
        </summary>
        {files.length === 0 ? (
          <p className="ad__muted">No files were uploaded. Any links the client pasted are in the answers above.</p>
        ) : (
          categories.map((c) => (
            <div key={c} className="ad__cat">
              <h3 className="ad__h3">{c}</h3>
              <FileItems files={files.filter((f) => f.category === c)} />
            </div>
          ))
        )}
        {files.length ? <p className="ad__muted ad__note">File links open for one hour. Reload the page for fresh ones.</p> : null}
      </details>

      {Object.keys(profile.source ?? {}).length ? (
        <p className="ad__muted ad__note">Came from {Object.entries(profile.source).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}.</p>
      ) : null}
    </article>
  );
}

/** What is already known about a profile while the rest of it loads. */
function Opening({ row }: { row?: Row }) {
  return (
    <article className="ad__detail">
      <h1 className="ad__h1">{row?.business_name ?? 'Loading…'}</h1>
      {row ? (
        <p className="ad__muted">
          Received {date(row.submitted_at)} from {row.contact_name}. Reference {ref(row.id)}.
        </p>
      ) : null}
      <p className="ad__muted ad__note" role="status">
        Loading the answers and files…
      </p>
    </article>
  );
}

/** Files as thumbnails (images) or plain names, each linking to the file. */
function FileItems({ files }: { files: FileRow[] }) {
  return (
    <ul className="ad__files">
      {files.map((f) => (
        <li key={f.path}>
          {f.url && isImage(f.name) ? (
            <img
              src={f.thumb ?? f.url}
              alt=""
              className="ad__thumb"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // The small version could not be made: fall back to the full file.
                if (f.url && e.currentTarget.src !== f.url) e.currentTarget.src = f.url;
              }}
            />
          ) : (
            <span className="ad__thumb ad__thumb--blank" aria-hidden="true" />
          )}
          <span className="ad__fname">
            {f.url ? (
              <a href={f.url} target="_blank" rel="noopener noreferrer">
                {f.name}
              </a>
            ) : (
              f.name
            )}
            <span className="ad__sub">{megabytes(f.size)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Plain text, with links made clickable. Never HTML: client answers are shown as text only. */
function Text({ value }: { value: string }) {
  const parts = value.split(/(https?:\/\/[^\s]*[^\s.,;:!?)])/g);
  return (
    <span className="ad__text">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </span>
  );
}

function Swatches({ value }: { value: string }) {
  const colors = value.split(/[,\s]+/).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  if (!colors.length) return <Text value={value} />;
  return (
    <span className="ad__swatches">
      {colors.map((c) => (
        <span className="ad__sw" key={c}>
          <s style={{ background: c }} />
          {c}
        </span>
      ))}
    </span>
  );
}
