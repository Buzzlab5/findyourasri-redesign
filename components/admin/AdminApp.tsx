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
};
type Profile = Row & {
  answers: Record<string, Answer>;
  followups: { kind: string; text: string }[];
  source: Record<string, string>;
};
type FileRow = { path: string; name: string; size: number; category: string; url: string | null };

class SignInError extends Error {}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const megabytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const isImage = (name: string) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
const ref = (id: string) => `ASRI-${id.slice(0, 8).toUpperCase()}`;

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
  const config = useRef<Config | null>(null);
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
    if (s.expires - 60_000 > Date.now()) return s.access;
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

  async function loadList() {
    try {
      const data = await admin('admin-list');
      setRows(data.profiles as Row[]);
      setMessage('');
    } catch (e) {
      if (e instanceof SignInError) signOut(e.message);
      else setMessage('The list did not load. Try again in a moment.');
    }
  }

  async function loadDetail(id: string) {
    setDetail(null);
    try {
      const data = await admin('admin-get', { id });
      setDetail({ profile: data.profile as Profile, files: data.files as FileRow[] });
      setMessage('');
    } catch (e) {
      if (e instanceof SignInError) signOut(e.message);
      else setMessage('That profile did not load. Go back and try again.');
    }
  }

  // Start: read the project's sign-in address from the function, and pick up a saved session.
  useEffect(() => {
    let live = true;
    (async () => {
      if (!API) {
        setMessage('This page is not connected yet.');
        setPhase('out');
        return;
      }
      try {
        const { data } = await post({ action: 'config' });
        if (!data.url || !data.anonKey) {
          setMessage('The server has not been updated for this page yet.');
          setPhase('out');
          return;
        }
        config.current = data as Config;
        setReady(true);
        const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Session | null;
        if (saved && live) {
          remember(saved);
          setPhase('in');
          await loadList();
        } else if (live) setPhase('out');
      } catch {
        if (live) {
          setMessage('Could not reach the server. Check your connection and reload.');
          setPhase('out');
        }
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on load
  }, []);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the profile named in the address
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
    if (!rows) return [];
    return q
      ? rows.filter((r) => [r.business_name, r.contact_name, r.contact_email, r.country ?? '', r.sector ?? ''].some((x) => x.toLowerCase().includes(q)))
      : rows;
  }, [rows, query]);

  function open(id: string) {
    history.pushState(null, '', `#${id}`);
    setSelected(id);
  }
  function back() {
    history.pushState(null, '', window.location.pathname + window.location.search);
    setSelected('');
    setDetail(null);
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
          <label className="field">
            <span className="field__label">Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
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
      <span className="ad__muted">{email}</span>
      <button type="button" className="ad__link" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );

  if (selected) {
    return (
      <div className="tone-cream ad">
        {top}
        <button type="button" className="ad__link ad__back" onClick={back}>
          All profiles
        </button>
        {message ? <p className="ad__error" role="alert">{message}</p> : null}
        {detail ? <Detail profile={detail.profile} files={detail.files} onCopy={copyText} copied={copied} /> : message ? null : <p className="ad__muted">Loading…</p>}
      </div>
    );
  }

  return (
    <div className="tone-cream ad">
      {top}
      <div className="ad__head">
        <h1 className="ad__h1">Client profiles</h1>
        <label className="ad__search">
          <span className="ad__sr">Search profiles</span>
          <input type="search" placeholder="Search by business, name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {message ? <p className="ad__error" role="alert">{message}</p> : null}
      {rows === null ? (
        message ? null : <p className="ad__muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="ad__empty">No profiles yet. They appear here as soon as a client sends the form.</p>
      ) : (
        <>
          <p className="ad__muted ad__count">
            {shown.length} of {rows.length} {rows.length === 1 ? 'profile' : 'profiles'}
          </p>
          <div className="ad__scroll">
            <table className="ad__table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Sector</th>
                  <th>Services wanted</th>
                  <th>Budget</th>
                  <th>Files</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} onClick={() => open(r.id)}>
                    <td>
                      <a href={`#${r.id}`} className="ad__name" onClick={(e) => e.stopPropagation()}>
                        {r.business_name}
                      </a>
                    </td>
                    <td>
                      {r.contact_name}
                      <span className="ad__sub">{r.contact_email}</span>
                    </td>
                    <td>{(r.sector ?? '').split(' (')[0] || '-'}</td>
                    <td>
                      {r.services.slice(0, 2).join(', ') || '-'}
                      {r.services.length > 2 ? <span className="ad__sub">+{r.services.length - 2} more</span> : null}
                    </td>
                    <td>{r.budget ?? '-'}</td>
                    <td>{r.client_files?.[0]?.count ?? 0}</td>
                    <td>{date(r.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length === 0 ? <p className="ad__empty">Nothing matches that search.</p> : null}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- one profile */

const KIND: Record<string, string> = { setup: 'Set up', check: 'Check', note: 'Note' };

function Detail({ profile, files, onCopy, copied }: { profile: Profile; files: FileRow[]; onCopy: () => void; copied: string }) {
  const answers = profile.answers ?? {};
  const phone = typeof answers.contact_phone === 'string' ? answers.contact_phone : '';
  const wa = phone.replace(/\D/g, '');

  const known = new Set(Object.keys(fields));
  const extra = Object.entries(answers).filter(([k, v]) => !known.has(k) && hasValue(v as Answer));
  const categories = [...new Set(files.map((f) => f.category))];

  return (
    <article className="ad__detail">
      <h1 className="ad__h1">{profile.business_name}</h1>
      <p className="ad__muted">
        Received {date(profile.submitted_at)} from {profile.contact_name}. Reference {ref(profile.id)}.
      </p>
      <div className="ad__actions">
        <a className="pill pill--outline" href={`mailto:${profile.contact_email}`}>
          Email {profile.contact_email}
        </a>
        {wa ? (
          <a className="pill pill--outline" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        ) : null}
        <button type="button" className="pill pill--outline" onClick={onCopy}>
          Copy as text
        </button>
        {copied ? <span className="ad__muted" role="status">{copied}</span> : null}
      </div>

      {profile.followups?.length ? (
        <section className="ad__block">
          <h2 className="ad__h2">Team follow-ups</h2>
          <ul className="ad__todo">
            {profile.followups.map((f, i) => (
              <li key={i}>
                <span className={`ad__tag ad__tag--${f.kind}`}>{KIND[f.kind] ?? 'Note'}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.map((s) => {
        const rows = s.fields.filter((f) => f.type !== 'file' && hasValue(answers[f.id] as Answer));
        if (!rows.length) return null;
        return (
          <section className="ad__block" key={s.id}>
            <h2 className="ad__h2">{s.title}</h2>
            <dl className="ad__qa">
              {rows.map((f) => (
                <div key={f.id}>
                  <dt>{f.label}</dt>
                  <dd>
                    {f.id === 'colors' ? <Swatches value={String(answers[f.id])} /> : <Text value={formatAnswer(f, answers[f.id] as Answer)} />}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      {extra.length ? (
        <section className="ad__block">
          <h2 className="ad__h2">Other answers</h2>
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
        </section>
      ) : null}

      <section className="ad__block">
        <h2 className="ad__h2">Files</h2>
        {files.length === 0 ? (
          <p className="ad__muted">No files were uploaded. Any links the client pasted are in the answers above.</p>
        ) : (
          categories.map((c) => (
            <div key={c} className="ad__cat">
              <h3 className="ad__h3">{c}</h3>
              <ul className="ad__files">
                {files
                  .filter((f) => f.category === c)
                  .map((f) => (
                    <li key={f.path}>
                      {f.url && isImage(f.name) ? <img src={f.url} alt="" className="ad__thumb" loading="lazy" /> : <span className="ad__thumb ad__thumb--blank" aria-hidden="true" />}
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
            </div>
          ))
        )}
        {files.length ? <p className="ad__muted ad__note">File links open for one hour. Reload the page for fresh ones.</p> : null}
      </section>

      {Object.keys(profile.source ?? {}).length ? (
        <p className="ad__muted ad__note">Came from {Object.entries(profile.source).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}.</p>
      ) : null}
    </article>
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
