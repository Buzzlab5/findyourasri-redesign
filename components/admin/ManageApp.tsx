'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminError, adminCall, API, clearSession, readSession } from './adminSession';

import './admin.css';

/**
 * /admin/manage/: delete client profiles for good. Pick one or several, read what will go, type DELETE.
 * The function removes the profile's answers, its file rows and every file in its storage folder.
 */

type Row = {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  submitted_at: string;
  client_files?: { count: number }[];
};

const CONFIRM_WORD = 'DELETE';
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const ref = (id: string) => `ASRI-${id.slice(0, 8).toUpperCase()}`;
const filesOf = (r: Row) => r.client_files?.[0]?.count ?? 0;

export default function ManageApp() {
  const [phase, setPhase] = useState<'loading' | 'out' | 'ready'>('loading');
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ profiles: number; files: number; failed: string[] } | null>(null);
  const box = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const data = await adminCall('admin-list');
      setRows(data.profiles as Row[]);
      setMessage('');
    } catch (e) {
      if (e instanceof AdminError && (e.status === 401 || e.status === 403)) {
        setMessage(e.message);
        setPhase('out');
      } else setMessage(e instanceof AdminError ? e.message : 'The list did not load. Try again in a moment.');
    }
  }

  useEffect(() => {
    if (!API || !readSession()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- decides the first screen once, on load
      setPhase('out');
      return;
    }
    setPhase('ready');
    load();
  }, []);

  // Escape closes the question, unless a delete is running.
  useEffect(() => {
    if (!asking) return;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setAsking(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [asking, busy]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || [r.business_name, r.contact_name, r.contact_email, ref(r.id)].some((x) => x.toLowerCase().includes(q)));
  }, [rows, query]);

  const chosen = (rows ?? []).filter((r) => picked.includes(r.id));
  const chosenFiles = chosen.reduce((n, r) => n + filesOf(r), 0);
  const allShownPicked = shown.length > 0 && shown.every((r) => picked.includes(r.id));

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setPicked(allShownPicked ? picked.filter((id) => !shown.some((r) => r.id === id)) : [...new Set([...picked, ...shown.map((r) => r.id)])]);

  function ask(ids: string[]) {
    setPicked(ids);
    setTyped('');
    setResult(null);
    setAsking(true);
  }

  async function confirmDelete() {
    if (typed !== CONFIRM_WORD || busy) return;
    setBusy(true);
    let profiles = 0;
    let files = 0;
    const failed: string[] = [];
    // One at a time, so a failure stops nothing else and every outcome is known.
    for (const r of chosen) {
      try {
        const data = await adminCall('admin-delete', { id: r.id, expect: r.business_name });
        profiles += 1;
        files += Number(data.files ?? 0);
        setRows((list) => (list ?? []).filter((x) => x.id !== r.id));
        setPicked((p) => p.filter((x) => x !== r.id));
      } catch (e) {
        failed.push(`${r.business_name}: ${e instanceof AdminError ? e.message : 'could not be deleted'}`);
        if (e instanceof AdminError && (e.status === 401 || e.status === 403)) break;
      }
    }
    setBusy(false);
    setAsking(false);
    setResult({ profiles, files, failed });
  }

  if (phase === 'loading') {
    return (
      <div className="tone-cream tm">
        <p className="tm__muted">Loading…</p>
      </div>
    );
  }

  if (phase === 'out') {
    return (
      <div className="tone-cream tm">
        <div className="tm__login">
          <h1 className="tm__h1">Sign in first</h1>
          <p className="tm__muted">{message || 'This page uses the sign-in from the team page.'}</p>
          <Link href="/admin/" className="pill pill--ink" onClick={clearSession}>
            Go to the team page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tone-cream tm tm--wide">
      <div className="tm__top">
        <Link href="/admin/" className="tm__link">
          Back to profiles
        </Link>
        <span className="tm__muted">{readSession()?.email}</span>
      </div>

      <div className="tm__head">
        <div>
          <h1 className="tm__h1">Manage profiles</h1>
          <span className="tm__muted">{rows === null ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'profile' : 'profiles'}`}</span>
        </div>
      </div>

      <p className="tm-warn">
        Deleting removes the profile, all of its answers and every file the client uploaded. It cannot be undone. Use it for test data,
        or when a client asks to be removed.
      </p>

      {message ? <p className="tm__error" role="alert">{message}</p> : null}

      {result ? (
        <div className={`tm-result${result.failed.length ? ' tm-result--bad' : ''}`} role="status">
          <b>
            Deleted {result.profiles} {result.profiles === 1 ? 'profile' : 'profiles'} and {result.files} {result.files === 1 ? 'file' : 'files'}.
          </b>
          {result.failed.length ? (
            <ul>
              {result.failed.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="tm-tools">
        <label className="tm__search">
          <span className="tm__sr">Search profiles</span>
          <input type="search" placeholder="Search by business, name, email or reference" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {rows === null ? null : rows.length === 0 ? (
        <p className="tm__empty">No profiles. Nothing to delete.</p>
      ) : (
        <div className="tm-manage">
          <div className="tm-manage__head">
            <label className="tm-check">
              <input type="checkbox" checked={allShownPicked} onChange={toggleAll} aria-label="Select all shown" />
              <span aria-hidden="true" />
            </label>
            <span>Business</span>
            <span>Reference</span>
            <span>Received</span>
            <span>Files</span>
            <span />
          </div>
          {shown.map((r) => (
            <div className={`tm-manage__row${picked.includes(r.id) ? ' is-picked' : ''}`} key={r.id}>
              <label className="tm-check">
                <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.business_name}`} />
                <span aria-hidden="true" />
              </label>
              <span className="tm-manage__who">
                <b>{r.business_name}</b>
                <small>{r.contact_name} &middot; {r.contact_email}</small>
              </span>
              <span className="tm-manage__ref">{ref(r.id)}</span>
              <span>{date(r.submitted_at)}</span>
              <span>{filesOf(r)}</span>
              <button type="button" className="tm-danger tm-danger--quiet" onClick={() => ask([r.id])}>
                Delete&hellip;
              </button>
            </div>
          ))}
          {shown.length === 0 ? <p className="tm__empty">Nothing matches that.</p> : null}
        </div>
      )}

      {picked.length > 0 && !asking ? (
        <div className="tm-bar" role="region" aria-label="Selected profiles">
          <span>
            <b>{picked.length}</b> selected
          </span>
          <button type="button" className="tm__link" onClick={() => setPicked([])}>
            Clear selection
          </button>
          <button type="button" className="tm-danger" onClick={() => ask(picked)}>
            Delete {picked.length} {picked.length === 1 ? 'profile' : 'profiles'}&hellip;
          </button>
        </div>
      ) : null}

      {asking ? (
        <div className="tm-modal" role="dialog" aria-modal="true" aria-labelledby="tm-modal-title">
          <div className="tm-modal__box">
            <h2 className="tm__h2" id="tm-modal-title">
              Delete {chosen.length} {chosen.length === 1 ? 'profile' : 'profiles'} for good?
            </h2>
            <ul className="tm-modal__list">
              {chosen.map((r) => (
                <li key={r.id}>
                  <b>{r.business_name}</b>
                  <small>
                    {ref(r.id)} &middot; {filesOf(r)} {filesOf(r) === 1 ? 'file' : 'files'}
                  </small>
                </li>
              ))}
            </ul>
            <p className="tm__muted">
              This removes their answers and {chosenFiles} uploaded {chosenFiles === 1 ? 'file' : 'files'} from the database and from storage. There is no
              way to get them back.
            </p>
            <label className="tm-modal__field">
              <span>
                Type <b>{CONFIRM_WORD}</b> to confirm
              </span>
              <input ref={box} type="text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy} />
            </label>
            <div className="tm-modal__actions">
              <button type="button" className="pill pill--outline" onClick={() => setAsking(false)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="tm-danger" onClick={confirmDelete} disabled={typed !== CONFIRM_WORD || busy}>
                {busy ? 'Deleting…' : 'Delete for good'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
