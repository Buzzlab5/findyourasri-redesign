'use client';

/**
 * A private client page: the runsheet, in the client's own words, showing where their engagement actually stands.
 *
 * The site is a static export, so the password IS the encryption: the content sits in public/portal-data/<slug>/
 * as AES-GCM ciphertext keyed from the password (PBKDF2-SHA256). Nothing is readable, by a visitor or a crawler,
 * until the password is entered here, and the key is kept for this browser session only. The same pattern as the
 * private pitches, because this page carries open paperwork and undecided items.
 *
 * The content is built and encrypted outside this repo, from Asri's own record rather than by hand:
 * clients/madonna/plan/portal/ in the Asri folder. Every count on the page is computed there from the files that
 * are the systems of record, so re-running that script and pushing is what updates this page.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import './portal.css';

type Meta = { v: number; kdf: string; rounds: number; salt: string; cipher: string };

type Tile = { big: string; what: string; note: string };
type Filed = { label: string; date: string; state: string };
type Phase = { n: string; phase: string; when: string; does: string };
type Check = {
  n: string;
  title: string;
  need: string;
  unlocks: string;
  open: boolean;
  answer: string;
  in_form: boolean;
};
type Form = {
  url: string;
  button: string;
  minutes: string;
  note: string;
  covers: string[];
  covered: number;
  total: number;
  rest: string[];
};
type Step = { key: string; rail: string; title: string };
type Layer = { layer: string; counts: string; readable: boolean; blocked: string };
type Row = { what: string; when: string; has: string };
type Item = { title: string; says: string };
type Section = { title: string; sub: string };

type Payload = {
  client: string;
  built: string;
  built_human: string;
  headline: { tiles: Tile[] };
  package: Tile[];
  filed: Filed[];
  countdown: Phase[];
  example: string;
  checklist: Check[];
  form: Form;
  steps: Step[];
  heads: { reporting: string; open: string };
  traction: Layer[];
  reporting: Row[];
  open: Item[];
  rights: { logged: number; cleared: number; identifiable: number; sentence: string };
  contact: { name: string; role: string };
  cover: { title: string; lede: string; stamp: string };
  sections: Record<string, Section>;
  numbers_rule: string;
  footer: { provenance: string; privacy: string };
};

const b64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
const toB64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

async function deriveKey(pw: string, meta: Meta) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(meta.salt), iterations: meta.rounds, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  );
}

async function openBlob(key: CryptoKey, buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12));
}

/* ------------------------------------------------------------------ the lock */
function Lock({ onOpen, error, busy }: { onOpen: (pw: string) => void; error: string; busy: boolean }) {
  const [pw, setPw] = useState('');
  return (
    <div className="po-lock">
      <form
        className="po-lock-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (pw) onOpen(pw);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/asri-white.png" alt="Asri" className="po-lock-mark" />
        <p className="po-kick">A private client page</p>
        <h1>Enter your password</h1>
        <p className="po-lock-lede">
          We sent it with the link. The page stays locked until the password is typed in.
        </p>
        <label htmlFor="po-pw" className="po-vh">
          Password
        </label>
        <input
          id="po-pw"
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        <button type="submit" disabled={busy || !pw}>
          {busy ? 'Opening' : 'Open the page'}
        </button>
        {error ? (
          <p className="po-err" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- the sections */
function Head({ n, s, title }: { n: string; s: Section; title?: string }) {
  return (
    <header className="po-head">
      <p className="po-kick">
        <span className="po-num">{n}</span>
        {title ?? s.title}
      </p>
      {s.sub ? <p className="po-sub">{s.sub}</p> : null}
    </header>
  );
}

function Page({ c, ticksKey }: { c: Payload; ticksKey: string }) {
  const [step, setStep] = useState(0);
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const stageRef = useRef<HTMLDivElement | null>(null);
  const first = useRef(true);
  const openItems = c.checklist.filter((a) => a.open).length;
  const key = c.steps[step].key;

  // The client's own ticks. They stay in this browser and reach nobody: the page says so, because a tick that
  // looks like it told us something and did not is worse than no tick at all.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ticksKey);
      if (raw) setTicks(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* storage may be blocked; the list still works, it just does not remember */
    }
  }, []);

  const tick = (n: string) => {
    setTicks((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      try {
        localStorage.setItem(ticksKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Moving a step puts the reader at the top of the new one, but never steals focus on first paint.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    stageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [step]);

  const go = (i: number) => setStep(Math.max(0, Math.min(c.steps.length - 1, i)));

  return (
    <div className="po">
      <header className="po-top">
        <div className="po-in">
          <p className="po-kick">{c.client} and Asri</p>
          <h1 className="po-title">{c.cover.title}</h1>
          <p className="po-stamp">
            <span className="po-live" aria-hidden="true" />
            Updated {c.built_human}
            <span className="po-dot">·</span>
            {c.cover.stamp}
          </p>
          <nav className="po-rail" aria-label="Sections">
            {c.steps.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={i === step ? 'po-rail-on' : i < step ? 'po-rail-done' : ''}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => go(i)}
              >
                <span className="po-rail-n">{i + 1}</span>
                {s.rail}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="po-stage" ref={stageRef}>
        <section className="po-sec" data-step={key}>
          <div className="po-in">
            <Head n={key} s={c.sections[key]} title={key === '06' ? `${c.sections['06'].title}: ${openItems} of ${c.checklist.length} still to do` : undefined} />

            {key === '01' ? (
              <>
                <p className="po-lede po-lede-step">{c.cover.lede}</p>
                <div className="po-tiles">
                  {c.headline.tiles.map((t) => (
                    <div className="po-tile" key={t.what}>
                      <span className="po-big">{t.big}</span>
                      <span className="po-what">{t.what}</span>
                      <span className="po-note">{t.note}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {key === '02' ? (
              <div className="po-cards">
                {c.package.map((x) => (
                  <div className="po-card" key={x.what}>
                    <span className="po-card-big">{x.big}</span>
                    <span className="po-card-what">{x.what}</span>
                    <span className="po-note">{x.note}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {key === '03' ? (
              <ul className="po-list">
                {c.filed.map((f) => (
                  <li key={f.label}>
                    <span className="po-when">{f.date}</span>
                    <span className="po-line">{f.label}</span>
                    <span className={f.state === 'internal' ? 'po-pill' : 'po-pill po-pill-gold'}>
                      {f.state === 'sent' ? 'With you' : f.state === 'ready' ? 'Ready for you' : 'Internal'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {key === '04' ? (
              <>
                <ol className="po-phases">
                  {c.countdown.map((x) => (
                    <li key={x.n}>
                      <span className="po-phase-n">{x.n}</span>
                      <div>
                        <h3>{x.phase}</h3>
                        <p className="po-phase-when">{x.when}</p>
                        <p className="po-phase-does">{x.does}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="po-quote">{c.example}</p>
              </>
            ) : null}

            {key === '05' ? (
              <div className="po-form">
                <p className="po-form-line">
                  It answers <strong>{c.form.covered} of the {c.form.total}</strong> things on your checklist, and
                  it takes {c.form.minutes}.
                </p>
                <a className="po-cta" href={c.form.url} target="_blank" rel="noreferrer">
                  {c.form.button}
                </a>
                <p className="po-note po-form-note">{c.form.note}</p>
                <h3 className="po-subhead">What it asks you</h3>
                <ul className="po-covers">
                  {c.form.covers.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p className="po-quote">
                  The {c.form.rest.length} it does not cover are {c.form.rest.join(' and ')}. Those two go
                  straight to {c.contact.name}, and they are the last two on your checklist.
                </p>
              </div>
            ) : null}

            {key === '06' ? (
              <ul className="po-check">
                {c.checklist.map((a) => {
                  const done = !a.open;
                  const ticked = ticks.has(a.n);
                  return (
                    <li key={a.n} className={done ? 'po-check-done' : ticked ? 'po-check-ticked' : ''}>
                      <button
                        type="button"
                        className="po-box"
                        onClick={() => (done ? undefined : tick(a.n))}
                        disabled={done}
                        aria-pressed={done || ticked}
                        aria-label={done ? `${a.title}: we have this` : `Tick off ${a.title}`}
                      >
                        {done || ticked ? '✓' : a.n}
                      </button>
                      <div>
                        <h3>{a.title}</h3>
                        <p>{a.need}</p>
                        <p className="po-unlocks">
                          <span>Unlocks</span> {a.unlocks}
                        </p>
                        <p className="po-where">
                          {a.in_form ? 'The form on the step before asks this.' : `Not in the form: tell ${c.contact.name}.`}
                        </p>
                        {done ? <p className="po-note">We have this: {a.answer}</p> : null}
                      </div>
                      <span className={done ? 'po-pill po-pill-gold' : 'po-pill'}>{done ? 'We have it' : 'To do'}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {key === '07' ? (
              <>
                <ul className="po-layers">
                  {c.traction.map((t) => (
                    <li key={t.layer}>
                      <div>
                        <h3>{t.layer}</h3>
                        <p className="po-note">{t.counts}</p>
                      </div>
                      <p className={t.readable ? 'po-read' : 'po-unread'}>{t.readable ? 'Readable now' : t.blocked}</p>
                    </li>
                  ))}
                </ul>
                <p className="po-quote">{c.numbers_rule}</p>

                <h3 className="po-subhead">{c.heads.reporting}</h3>
                <ul className="po-list po-list-rows">
                  {c.reporting.map((r) => (
                    <li key={r.what}>
                      <span className="po-when">{r.when}</span>
                      <span className="po-line">
                        <strong>{r.what}.</strong> {r.has}
                      </span>
                    </li>
                  ))}
                </ul>

                <h3 className="po-subhead">{c.heads.open}</h3>
                <ul className="po-open">
                  {c.open.map((o) => (
                    <li key={o.title}>
                      <h3>{o.title}</h3>
                      <p>{o.says}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      </div>

      <nav className="po-nav" aria-label="Move through the page">
        <div className="po-in">
          <button type="button" className="po-back" onClick={() => go(step - 1)} disabled={step === 0}>
            Back
          </button>
          <span className="po-count">
            Step {step + 1} of {c.steps.length}
          </span>
          {step < c.steps.length - 1 ? (
            <button type="button" className="po-next" onClick={() => go(step + 1)}>
              Next: {c.steps[step + 1].rail}
            </button>
          ) : (
            <button type="button" className="po-next" onClick={() => go(0)}>
              Back to the start
            </button>
          )}
        </div>
      </nav>

      <footer className="po-foot">
        <div className="po-in">
          <p>
            <strong>Where these numbers come from.</strong> {c.footer.provenance}
          </p>
          <p>
            Questions, approvals, anything urgent: {c.contact.name}, {c.contact.role}.
          </p>
          <p className="po-note">{c.footer.privacy}</p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------- the app */
export default function PortalApp({ slug }: { slug: string }) {
  const base = `/portal-data/${slug}`;
  const sessionKey = `asri-portal-${slug}-key`;
  const ticksKey = `asri-portal-${slug}-ticks`;

  const [content, setContent] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const keyRef = useRef<CryptoKey | null>(null);

  const unlock = useCallback(
    async (key: CryptoKey) => {
      const buf = await fetch(`${base}/payload.bin`, { cache: 'no-store' }).then((r) => r.arrayBuffer());
      const plain = await openBlob(key, buf);
      keyRef.current = key;
      setContent(JSON.parse(new TextDecoder().decode(plain)) as Payload);
      try {
        const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
        sessionStorage.setItem(sessionKey, toB64(raw));
      } catch {
        /* storage may be blocked; the reader types the password again next time */
      }
    },
    [base, sessionKey],
  );

  const onPassword = useCallback(
    async (pw: string) => {
      setBusy(true);
      setError('');
      try {
        const meta: Meta = await fetch(`${base}/meta.json`, { cache: 'no-store' }).then((r) => r.json());
        const key = await deriveKey(pw, meta);
        await unlock(key);
      } catch {
        setError('That password did not open the page. Check it and try again.');
      } finally {
        setBusy(false);
      }
    },
    [base, unlock],
  );

  // A reload in the same browser session opens straight away, so a refresh shows the newest numbers.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(sessionKey);
    } catch {
      raw = null;
    }
    if (!raw) return;
    crypto.subtle
      .importKey('raw', b64(raw), 'AES-GCM', true, ['decrypt'])
      .then(unlock)
      .catch(() => {
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {
          /* ignore */
        }
      });
  }, [sessionKey, unlock]);

  return content ? (
    <Page c={content} ticksKey={ticksKey} />
  ) : (
    <Lock onOpen={onPassword} error={error} busy={busy} />
  );
}
