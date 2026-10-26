'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type DragEvent } from 'react';

import { Arrow } from '@/components/Arrow';
import {
  answersAsText,
  CHAPTERS,
  collectAnswers,
  emptyFor,
  fields,
  followUps,
  formatAnswer,
  guessCategory,
  hasValue,
  isVisible,
  KIT_EXTENSIONS,
  KIT_MAX_BYTES,
  KIT_MAX_FILES,
  makeGetter,
  sections,
  type Answer,
  type Field,
  type Getter,
  type KitCategory,
  type RefRow,
  type Section,
} from '@/lib/client-profile/schema';
import { site } from '@/lib/site';
import { readUtm, track } from '@/lib/track';

import ColorsField from './ColorsField';
import PhoneField from './PhoneField';

import './client-profile.css';

/**
 * The client profile intake, at /client-profile/ (hidden: noindex, never linked).
 *
 * The site is a static export, so there is no server here. The browser talks
 * to one Supabase Edge Function (supabase/functions/client-profile) set in
 * NEXT_PUBLIC_CLIENT_PROFILE_API: it hands out signed upload URLs for files
 * and stores the submitted profile. Until a client presses send,
 * everything is a draft that lives in this browser's localStorage.
 */

const API = process.env.NEXT_PUBLIC_CLIENT_PROFILE_API ?? '';
const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const STORE = 'asri-client-profile-v3';
const THEME_STORE = 'asri-form-theme';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type KitFile = {
  key: string;
  /** The upload question this file was added under. */
  field: string;
  name: string;
  size: number;
  category: KitCategory;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  path?: string;
  error?: string;
};
type Saved = {
  a: Record<string, Answer>;
  step: number;
  visited: number[];
  draftId: string;
  files: Pick<KitFile, 'key' | 'field' | 'name' | 'size' | 'category' | 'path'>[];
};
type Errors = Record<string, string>;

const MESSAGES: Record<string, string> = {
  file_type: "That kind of file can't be uploaded here. Add a link to a folder instead.",
  file_too_large: 'That file is over 50 MB. Add a link to a folder instead.',
  too_many_files: 'That is the most files we can take here. Put the rest in a folder and add the link.',
  rate_limited: 'Too many requests from this connection. Wait a little and try again.',
  already_submitted: 'This profile was already sent.',
  file_missing: 'One of the files did not finish uploading. Remove it and add it again.',
  captcha: 'The security check did not pass. Reload the page and try again.',
  config: 'This form is not connected yet.',
};

class ApiError extends Error {}

async function api(body: Record<string, unknown>) {
  if (!API) throw new ApiError('config');
  let res: Response;
  try {
    res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError('network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'server');
  return data as Record<string, string>;
}

/** PUT to a signed upload URL the way Supabase Storage expects it, with progress. */
function putFile(url: string, apikey: string, file: File, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (apikey) xhr.setRequestHeader('apikey', apikey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError('server')));
    xhr.onerror = () => reject(new ApiError('network'));
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    xhr.send(body);
  });
}

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');
const megabytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Ties the last two words with a no-break space, so a paragraph never ends on one word alone. */
const nw = (text: string) => text.replace(/ ([^ ]+)$/, '\u00a0$1');

function normalizeUrl(value: string) {
  const v = value.trim();
  return v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
}

function validUrl(value: string) {
  try {
    const u = new URL(normalizeUrl(value));
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

export default function ClientProfileApp() {
  const [hydrated, setHydrated] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<number[]>([0]);
  const [files, setFiles] = useState<KitFile[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'failed' | 'done'>('idle');
  const [failure, setFailure] = useState('');
  const [ref, setRef] = useState('');
  const [token, setToken] = useState('');
  const [hint, setHint] = useState('');
  const [copied, setCopied] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  const mbarRef = useRef<HTMLDivElement>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const filesRef = useRef<KitFile[]>([]);
  const started = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Restore the draft after hydration, so the static HTML is the same for everyone.
  useEffect(() => {
    let saved: Partial<Saved> = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    } catch {
      // Storage can be blocked; the form just starts empty.
    }
    /* eslint-disable react-hooks/set-state-in-effect -- one-off restore of the saved draft */
    setDraftId(saved.draftId || crypto.randomUUID());
    setAnswers(saved.a ?? {});
    setStep(Math.min(saved.step ?? 0, sections.length));
    setVisited(saved.visited?.length ? saved.visited : [0]);
    setFiles((saved.files ?? []).filter((f) => f.path).map((f) => ({ ...f, status: 'done' as const, progress: 1 })));
    try {
      // Light unless this browser's visitor chose dark before: the page does not follow the system setting.
      if (localStorage.getItem(THEME_STORE) === 'dark') setTheme('dark');
    } catch {
      // Storage unavailable: stay on the light page.
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Keep the draft in this browser. Only finished uploads are remembered.
  useEffect(() => {
    if (!hydrated || status === 'done') return;
    const t = setTimeout(() => {
      const saved: Saved = {
        a: answers,
        step,
        visited,
        draftId,
        files: files.filter((f) => f.status === 'done').map(({ key, field, name, size, category, path }) => ({ key, field, name, size, category, path })),
      };
      try {
        localStorage.setItem(STORE, JSON.stringify(saved));
        setHint('Saved on this device');
      } catch {
        setHint('');
      }
    }, 300);
    return () => clearTimeout(t);
  }, [hydrated, answers, step, visited, files, draftId, status]);

  // The phone's section list closes when you tap anywhere else.
  useEffect(() => {
    if (!menuOpen) return;
    const away = (e: PointerEvent) => {
      if (!mbarRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [menuOpen]);

  const get = makeGetter(answers);
  const total = sections.length;
  const isReview = step === total;
  const section = sections[Math.min(step, total - 1)];
  const minsLeft = sections.slice(Math.min(step, total)).reduce((n, x) => n + (x.minutes ?? 0), 0);
  const bodyClass = `${theme === 'light' ? 'tone-cream ' : ''}cp__body`;

  function chooseTheme(next: 'light' | 'dark') {
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORE, next);
    } catch {
      // The choice just is not remembered.
    }
  }
  // Files count only while the question they were added under is still showing.
  const done = files.filter((f) => f.status === 'done' && fields[f.field] && isVisible(fields[f.field], get));

  /* ---------- answers ---------- */

  function setAnswer(f: Field, next: Answer) {
    if (!started.current) {
      started.current = true;
      track('form_start', { form_id: 'client_profile' });
    }
    // "None yet" excludes the other platforms, and picking one clears it.
    if (f.id === 'platforms' && Array.isArray(next)) {
      const prev = (answers.platforms as string[] | undefined) ?? [];
      const list = next as string[];
      if (list.includes('None yet') && !prev.includes('None yet')) next = ['None yet'];
      else if (list.length > 1) next = list.filter((x) => x !== 'None yet');
    }
    setAnswers((a) => ({ ...a, [f.id]: next }));
    setErrors((e) => {
      if (!e[f.id]) return e;
      const rest = { ...e };
      delete rest[f.id];
      return rest;
    });
  }

  /* ---------- validation and navigation ---------- */

  function check(s: Section): Errors {
    const found: Errors = {};
    for (const f of s.fields) {
      if (!isVisible(f, get)) continue;
      const x = get(f.id);
      if (f.req && !hasValue(x)) {
        found[f.id] = f.type === 'consent' ? 'Please tick this box to send your profile.' : 'We need this one to get started.';
        continue;
      }
      if (f.type === 'email' && hasValue(x) && !EMAIL.test((x as string).trim())) found[f.id] = 'Enter an email address we can reply to.';
      if (f.type === 'url' && hasValue(x) && !validUrl(x as string)) found[f.id] = 'Enter a full link, like https://example.com.';
      if (f.type === 'tel' && hasValue(x)) {
        const digits = (x as string).replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) found[f.id] = 'Check this number: it looks too short or too long.';
      }
    }
    return found;
  }

  function sectionDone(i: number) {
    const s = sections[i];
    const answered =
      s.fields.some((f) => f.type !== 'consent' && f.type !== 'file' && isVisible(f, get) && hasValue(get(f.id))) ||
      done.some((d) => s.fields.some((f) => f.id === d.field));
    return Boolean(answered) && Object.keys(check(s)).length === 0;
  }

  function go(i: number) {
    const to = Math.max(0, Math.min(sections.length, i));
    setStep(to);
    setVisited((v) => (v.includes(to) ? v : [...v, to]));
    setErrors({});
    setMenuOpen(false);
    requestAnimationFrame(() => {
      // Back to the top of the new section, below the sticky header and progress bar.
      const panel = panelRef.current;
      if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  function focusFirstError(found: Errors) {
    const id = Object.keys(found)[0];
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true });
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isReview) {
      const found = check(section);
      if (Object.keys(found).length) {
        setErrors(found);
        focusFirstError(found);
        return;
      }
      go(step + 1);
      return;
    }

    // Review step: every section has to be complete before it goes.
    for (let i = 0; i < sections.length; i++) {
      const missing = check(sections[i]);
      if (Object.keys(missing).length) {
        go(i);
        requestAnimationFrame(() => {
          setErrors(missing);
          focusFirstError(missing);
        });
        return;
      }
    }
    if (files.some((f) => f.status === 'uploading')) {
      setFailure('Some files are still uploading. Wait for them to finish, then send.');
      setStatus('failed');
      return;
    }
    if (TURNSTILE_KEY && !token) {
      setFailure('Complete the security check above, then send.');
      setStatus('failed');
      return;
    }

    setStatus('sending');
    setFailure('');
    const out = collectAnswers(get);
    for (const f of Object.values(fields)) if (f.type === 'url' && typeof out[f.id] === 'string') out[f.id] = normalizeUrl(out[f.id] as string);
    try {
      const data = await api({
        action: 'submit',
        draftId,
        answers: out,
        followups: followUps(get, done.length),
        files: done.map(({ path, name, category, field }) => ({ path, name, category, field })),
        source: { page: window.location.pathname, ...readUtm() },
        website: honeypot.current?.value ?? '',
        turnstile: token,
      });
      track('generate_lead', { form_id: 'client_profile' });
      try {
        localStorage.removeItem(STORE);
      } catch {
        // Nothing to clear.
      }
      setRef(data.ref ?? '');
      setStatus('done');
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: 'start' }));
    } catch (e) {
      const code = e instanceof ApiError ? e.message : 'server';
      setFailure(MESSAGES[code] ?? 'That did not send. Your answers are still here, so try again in a moment.');
      setStatus('failed');
    }
  }

  /* ---------- uploads ---------- */

  function patchFile(key: string, patch: Partial<KitFile>) {
    setFiles((list) => list.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  function addFiles(list: FileList | File[], f: Field) {
    const incoming = [...list];
    let room = KIT_MAX_FILES - filesRef.current.length;
    for (const file of incoming) {
      const key = crypto.randomUUID();
      const category = f.category && f.category !== 'auto' ? f.category : guessCategory(file.name);
      const base = { key, field: f.id, name: file.name, size: file.size, category, progress: 0 };
      const reject = (error: string) => setFiles((l) => [...l, { ...base, status: 'error', error }]);
      if (!(KIT_EXTENSIONS as readonly string[]).includes(extOf(file.name))) {
        reject(MESSAGES.file_type);
        continue;
      }
      if (file.size > KIT_MAX_BYTES) {
        reject(MESSAGES.file_too_large);
        continue;
      }
      if (room-- <= 0) {
        reject(MESSAGES.too_many_files);
        continue;
      }
      setFiles((l) => [...l, { ...base, status: 'uploading' }]);
      // One at a time: a long list of logos should not open forty connections at once.
      queue.current = queue.current.then(async () => {
        try {
          const grant = await api({ action: 'upload-url', draftId, name: file.name, size: file.size });
          await putFile(grant.signedUrl, grant.apikey, file, (p) => patchFile(key, { progress: p }));
          patchFile(key, { status: 'done', progress: 1, path: grant.path });
        } catch (e) {
          const code = e instanceof ApiError ? e.message : 'server';
          patchFile(key, { status: 'error', error: MESSAGES[code] ?? 'That did not upload. Remove it and try again.' });
        }
      });
    }
  }

  /* ---------- copy ---------- */

  async function copyAnswers() {
    const text = answersAsText(get, done);
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied. Paste it into an email or a note.');
    } catch {
      setCopied('Your browser blocked copying. Select the text in the box below.');
      const box = document.getElementById('cp-copy-box') as HTMLTextAreaElement | null;
      if (box) {
        box.hidden = false;
        box.value = text;
        box.select();
      }
    }
  }

  /* ---------- views ---------- */

  if (status === 'done') {
    return (
      <div className="cp">
        <div className={bodyClass} ref={topRef}>
          <div className="cp__done">
            <h1 className="cp__h2">Thank you</h1>
            <p className="cp__lede">
              Your profile for <strong>{(get('biz_name') as string) || 'your business'}</strong> is with the Asri team. Someone will read it
              and write to {(get('contact_email') as string) || 'you'}.
              {ref ? ` Your reference is ${ref}.` : ''}
            </p>
            <h2 className="cp__h3">What you sent</h2>
            <dl className="cp__sum">
              {sections
                .flatMap((s) => s.fields)
                .filter((f) => ['biz_name', 'contact_name', 'contact_email', 'sector', 'services', 'budget'].includes(f.id) && isVisible(f, get) && hasValue(get(f.id)))
                .map((f) => (
                  <div key={f.id}>
                    <dt>{f.label}</dt>
                    <dd>{formatAnswer(f, get(f.id))}</dd>
                  </div>
                ))}
              <div>
                <dt>Files</dt>
                <dd>
                  {done.length ? `${done.length} file${done.length === 1 ? '' : 's'}` : 'No files'}
                  {hasValue(get('kit_link')) ? ', plus a folder link' : ''}
                </dd>
              </div>
            </dl>
            <div className="cp__actions cp__actions--start">
              <button type="button" className="pill pill--outline" onClick={copyAnswers}>
                Copy my answers
              </button>
              <Link href="/" className="pill pill--ink">
                Back to the site
                <span className="pill__arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
            </div>
            {copied ? <p className="cp__hint" role="status">{copied}</p> : null}
            <textarea id="cp-copy-box" className="cp__copybox" readOnly hidden aria-label="Your answers" />
          </div>
        </div>
      </div>
    );
  }

  const sectionButton = (id: string) => {
    const i = sections.findIndex((x) => x.id === id);
    return (
      <li key={id}>
        <button
          type="button"
          aria-current={i === step ? 'step' : undefined}
          className={visited.includes(i) && sectionDone(i) ? 'is-done' : undefined}
          onClick={() => go(i)}
        >
          <span className="cp__tick" aria-hidden="true">
            {i + 1}
          </span>
          {sections[i].title}
        </button>
      </li>
    );
  };
  const chapters = (
    <>
      {CHAPTERS.map((c) => (
        <div className="cp__chap" key={c.title}>
          <b className="cp__chap-title">{c.title}</b>
          <ol>{c.ids.map(sectionButton)}</ol>
        </div>
      ))}
      <ol className="cp__chap-review">
        <li>
          <button type="button" aria-current={isReview ? 'step' : undefined} onClick={() => go(total)}>
            <span className="cp__tick" aria-hidden="true">
              &rarr;
            </span>
            Review and send
          </button>
        </li>
      </ol>
    </>
  );

  const frac = Math.min(step + 1, total) / total;
  const stepText = isReview ? 'Last step' : `Step ${step + 1} of ${total}`;
  const timeText = isReview ? 'Check it and send' : `About ${minsLeft} minute${minsLeft === 1 ? '' : 's'} left`;

  const themeToggle = (
    <div className="cp__theme" role="group" aria-label="Colour theme">
      <button type="button" aria-pressed={theme === 'light'} onClick={() => chooseTheme('light')}>
        Light
      </button>
      <button type="button" aria-pressed={theme === 'dark'} onClick={() => chooseTheme('dark')}>
        Dark
      </button>
    </div>
  );

  // The visible questions of this section, in order, split into their titled cards.
  const groups: { title?: string; fields: Field[] }[] = [];
  if (!isReview) {
    for (const f of section.fields) {
      if (!isVisible(f, get)) continue;
      const last = groups[groups.length - 1];
      if (last && last.title === f.group) last.fields.push(f);
      else groups.push({ title: f.group, fields: [f] });
    }
  }

  return (
    <div className="cp">
      <div className={bodyClass} ref={topRef}>
        <div className="cp__layout">
          {/* Phones: where you are, always in view, with the full list one tap away. */}
          <div className={`cp__mbar${menuOpen ? ' is-open' : ''}`} ref={mbarRef}>
            <button type="button" className="cp__mbar-btn" aria-expanded={menuOpen} aria-controls="cp-mnav" onClick={() => setMenuOpen((o) => !o)}>
              <span className="cp__tick" aria-hidden="true">
                {isReview ? '\u2192' : step + 1}
              </span>
              <span className="cp__mbar-title">{isReview ? 'Review and send' : section.title}</span>
              <span className="cp__mbar-count">{isReview ? 'Last step' : `${step + 1} of ${total}`}</span>
              <span className="cp__mbar-caret" aria-hidden="true" />
            </button>
            <div className="cp__progress cp__progress--bar" aria-hidden="true">
              <span style={{ width: `${frac * 100}%` }} />
            </div>
            {menuOpen ? (
              <nav id="cp-mnav" className="cp__mnav" aria-label="Sections">
                {chapters}
              </nav>
            ) : null}
          </div>

          <aside className="cp__side">
            <h1 className="cp__title">Client profile</h1>
            <p className="cp__sub">{nw('It takes around 25 to 30 minutes. Your answers are saved on this device as you go, so you can stop and come back.')}</p>
            {themeToggle}
            <div className="cp__sticky">
              <div className="cp__ring">
                <svg viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.5" className="cp__ring-bg" />
                  <circle cx="18" cy="18" r="15.5" className="cp__ring-fg" strokeDasharray={`${frac * 97.4} 97.4`} transform="rotate(-90 18 18)" />
                </svg>
                <div>
                  <b>{stepText}</b>
                  <span>{timeText}</span>
                </div>
              </div>
              <nav className="cp__rail" aria-label="Sections">
                {chapters}
              </nav>
            </div>
          </aside>

          <form className="cp__panel" ref={panelRef} onSubmit={onSubmit} noValidate>
            <div className="cp__scroll">
              {/* Bots fill this. People never see it. */}
              <p className="form__trap" aria-hidden="true">
                <label>
                  Leave this empty <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </p>

              <header className="cp__head">
                <h2 className="cp__h2" ref={headingRef} tabIndex={-1}>
                  {isReview ? 'Review and send' : section.title}
                </h2>
                {!isReview && section.minutes ? <span className="cp__est">About {section.minutes} min</span> : null}
              </header>
              <p className="cp__lede">{nw(isReview ? 'Read it over before it goes. Press Edit beside anything you want to change.' : section.lede)}</p>
              {!isReview && section.note ? <p className="cp__note">{nw(section.note)}</p> : null}

              {isReview
                ? <ReviewView get={get} check={check} done={done} onEdit={go} />
                : groups.map((g, gi) => (
                    <section className="cp-group" key={`${g.title}-${gi}`}>
                      {g.title ? <h3 className="cp-group__title">{g.title}</h3> : null}
                      <div className="cp__fields">
                        {g.fields.map((f) =>
                          f.type === 'file' ? (
                            <FileField
                              key={f.id}
                              f={f}
                              files={files.filter((x) => x.field === f.id)}
                              // eslint-disable-next-line react-hooks/refs -- an event handler: it only runs when files are chosen
                              onAdd={(list) => addFiles(list, f)}
                              onRemove={(key) => setFiles((l) => l.filter((x) => x.key !== key))}
                            />
                          ) : (
                            // eslint-disable-next-line react-hooks/refs -- an event handler: it only runs when an answer changes
                            <FieldView key={f.id} f={f} value={get(f.id) ?? emptyFor(f)} error={errors[f.id]} onChange={(v) => setAnswer(f, v)} />
                          ),
                        )}
                      </div>
                    </section>
                  ))}

              {isReview && TURNSTILE_KEY ? <Captcha onToken={setToken} /> : null}

              {status === 'failed' ? (
                <div className="cp__failed" role="alert">
                  <p>{failure}</p>
                  <p>
                    If it keeps failing, write to <a href={`mailto:${site.email}`}>{site.email}</a>.{' '}
                    <button type="button" className="cp__linkbtn" onClick={copyAnswers}>
                      Copy my answers
                    </button>{' '}
                    to send them by email.
                  </p>
                  {copied ? <p role="status">{copied}</p> : null}
                  <textarea id="cp-copy-box" className="cp__copybox" readOnly hidden aria-label="Your answers" />
                </div>
              ) : null}
            </div>

            <div className="cp__actions">
              <button type="button" className="pill pill--outline" onClick={() => go(step - 1)} disabled={step === 0}>
                Back
              </button>
              <span className="cp__hint" aria-live="polite">
                {hint}
              </span>
              <button type="submit" className="pill pill--ink" disabled={status === 'sending'}>
                {status === 'sending' ? (
                  'Sending…'
                ) : isReview ? (
                  'Send profile'
                ) : step === total - 1 ? (
                  'Review your answers'
                ) : (
                  <>
                    Next<span className="cp__next-to">: {sections[step + 1].title}</span>
                  </>
                )}
                {status !== 'sending' && (
                  <span className="pill__arrow" aria-hidden="true">
                    <Arrow />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ review */

/** Everything answered, section by section, with a way back to each one, before it is sent. */
function ReviewView({
  get,
  check,
  done,
  onEdit,
}: {
  get: Getter;
  check: (s: Section) => Errors;
  done: KitFile[];
  onEdit: (index: number) => void;
}) {
  const problems = sections.map((x, i) => ({ x, i, n: Object.keys(check(x)).length })).filter((p) => p.n > 0);
  return (
    <div className="cp-rev">
      {problems.length ? (
        <div className="cp-rev__todo" role="alert">
          <b>A few answers are still needed</b>
          <ul>
            {problems.map((p) => (
              <li key={p.x.id}>
                <button type="button" className="cp__linkbtn" onClick={() => onEdit(p.i)}>
                  {p.x.title}
                </button>{' '}
                ({p.n} to fill in)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {sections.map((x, i) => {
        const rows = x.fields.filter((f) => f.type !== 'file' && isVisible(f, get) && hasValue(get(f.id)));
        const sent = done.filter((d) => x.fields.some((f) => f.id === d.field));
        if (!rows.length && !sent.length) return null;
        return (
          <section className="cp-group cp-rev__sec" key={x.id}>
            <div className="cp-rev__top">
              <h3 className="cp-group__title">{x.title}</h3>
              <button type="button" className="cp__linkbtn" onClick={() => onEdit(i)}>
                Edit
              </button>
            </div>
            <dl className="cp-rev__list">
              {rows.map((f) => (
                <div key={f.id}>
                  <dt>{f.label}</dt>
                  <dd>{formatAnswer(f, get(f.id))}</dd>
                </div>
              ))}
              {sent.length ? (
                <div>
                  <dt>Files</dt>
                  <dd>{sent.map((d) => d.name).join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

function FieldView({ f, value, error, onChange }: { f: Field; value: Answer; error?: string; onChange: (v: Answer) => void }) {
  const sub = f.show ? ' cp-sub' : '';
  const errId = `err_${f.id}`;
  const err = error ? (
    <span className="field__error" id={errId} role="alert">
      {error}
    </span>
  ) : null;
  const help = f.help ? <span className="cp-help">{nw(f.help)}</span> : null;
  const label = (
    <>
      {nw(f.label)}
      {f.req ? <span className="cp-req">Required</span> : null}
    </>
  );

  if (f.type === 'radio' || f.type === 'checks') {
    const multi = f.type === 'checks';
    const picked = multi ? (value as string[]) : [value as string];
    // A few short options read best as one segmented control, longer ones as tiles, many-of-many as chips.
    const kind = multi ? 'chips' : f.opts!.length <= 4 && f.opts!.every((o) => o.length <= 24) ? 'seg' : 'tiles';
    const pick = (o: string, checked: boolean) => onChange(multi ? (checked ? [...picked, o] : picked.filter((x) => x !== o)) : o);
    return (
      <fieldset className={`cp-q${sub}${error ? ' is-invalid' : ''}`} data-field={f.id} aria-describedby={error ? errId : undefined}>
        <legend className="cp-q__label">{label}</legend>
        {help}
        <div className={`cp-${kind}`}>
          {f.opts!.map((o) => {
            const m = /^(.*?) \((.*)\)$/.exec(o);
            const input = <input type={multi ? 'checkbox' : 'radio'} name={f.id} value={o} checked={picked.includes(o)} onChange={(e) => pick(o, e.target.checked)} />;
            if (kind === 'tiles') {
              return (
                <label className="cp-tile" key={o}>
                  {input}
                  <span className="cp-tile__in">
                    <b>{m ? m[1] : o}</b>
                    {m ? <small>{m[2]}</small> : null}
                  </span>
                </label>
              );
            }
            return (
              <label className={kind === 'seg' ? 'cp-seg__opt' : 'cp-chip'} key={o}>
                {input}
                <span>{o}</span>
              </label>
            );
          })}
        </div>
        {err}
      </fieldset>
    );
  }

  if (f.type === 'consent') {
    return (
      <div className={`cp-q${error ? ' is-invalid' : ''}`} data-field={f.id}>
        <label className="cp-consent">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-invalid={error ? true : undefined} />
          <span>{nw(f.label)}</span>
        </label>
        {err}
      </div>
    );
  }

  if (f.type === 'refs') {
    const rows = [0, 1, 2, 3, 4].map((i) => (value as RefRow[])[i] ?? { url: '', notes: '' });
    const update = (i: number, key: keyof RefRow, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
    return (
      <fieldset className={`cp-q${sub}`} data-field={f.id}>
        <legend className="cp-q__label">{label}</legend>
        {help}
        {rows.map((r, i) => (
          <div className="cp-pair" key={i}>
            <input type="url" aria-label={`Website ${i + 1}`} placeholder={`Website ${i + 1}${i < 3 ? '' : ' (optional)'}`} value={r.url} onChange={(e) => update(i, 'url', e.target.value)} />
            <input type="text" aria-label={`What you like or dislike about website ${i + 1}`} placeholder="What you like or dislike" value={r.notes} onChange={(e) => update(i, 'notes', e.target.value)} />
          </div>
        ))}
      </fieldset>
    );
  }

  if (f.type === 'colors') {
    return <ColorsField id={f.id} label={label} help={help} value={value as string} sub={Boolean(f.show)} onChange={onChange} />;
  }

  if (f.type === 'tel') {
    return <PhoneField id={f.id} label={label} help={f.help} placeholder={f.ph} value={value as string} error={error} sub={Boolean(f.show)} onChange={onChange} />;
  }

  const common = {
    id: f.id,
    name: f.id,
    placeholder: f.ph,
    value: value as string,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errId : undefined,
  };
  return (
    <label className={`field cp-field${sub}${error ? ' is-invalid' : ''}`} data-field={f.id}>
      <span className="field__label">{label}</span>
      {help}
      {f.type === 'textarea' ? (
        <textarea {...common} rows={4} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === 'select' ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose one</option>
          {f.opts!.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input {...common} type={f.type} autoComplete={f.type === 'email' ? 'email' : 'off'} onChange={(e) => onChange(e.target.value)} />
      )}
      {err}
    </label>
  );
}

/* ------------------------------------------------------------------ uploads */

/** One upload question: a drop area and the files added under it. */
function FileField({
  f,
  files,
  onAdd,
  onRemove,
}: {
  f: Field;
  files: KitFile[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (key: string) => void;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) onAdd(e.dataTransfer.files);
  };

  return (
    <fieldset className={`cp-q${f.show ? ' cp-sub' : ''}`} data-field={f.id}>
      <legend className="cp-q__label">{nw(f.label)}</legend>
      {f.help ? <span className="cp-help">{nw(f.help)}</span> : null}
      <div
        className={`cp-kit__drop${over ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <button type="button" className="pill pill--outline" onClick={() => input.current?.click()}>
          Choose files
        </button>
        <span className="cp-kit__or">or drag them here. Up to 50 MB each, for anything larger paste a link.</span>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) onAdd(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {files.length ? (
        <ul className="cp-kit__list" aria-label="Files added">
          {files.map((x) => (
            <li key={x.key} className={`cp-kit__file is-${x.status}`}>
              <span className="cp-kit__name">{x.name}</span>
              <span className="cp-kit__size">{megabytes(x.size)}</span>
              <span className="cp-kit__state" role={x.status === 'error' ? 'alert' : undefined}>
                {x.status === 'uploading' ? `Uploading ${Math.round(x.progress * 100)}%` : x.status === 'done' ? 'Added' : x.error}
              </span>
              <button type="button" className="cp-kit__remove" onClick={() => onRemove(x.key)} aria-label={`Remove ${x.name}`}>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}

/* --------------------------------------------------------------- captcha */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => string;
    };
  }
}

/** Cloudflare Turnstile, only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (cancelled || !box.current || !window.turnstile || box.current.childElementCount) return;
      window.turnstile.render(box.current, { sitekey: TURNSTILE_KEY, callback: onToken, 'expired-callback': () => onToken('') });
    };
    if (window.turnstile) mount();
    else {
      const id = 'cf-turnstile-script';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', mount);
    }
    return () => {
      cancelled = true;
    };
  }, [onToken]);
  return <div ref={box} className="cp__captcha" />;
}
