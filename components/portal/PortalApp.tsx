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
type Ask = { n: string; title: string; says: string; stop: string; open: boolean; waiting: string[] };
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
  asks: Ask[];
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

function Page({ c }: { c: Payload }) {
  const openAsks = c.asks.filter((a) => a.open).length;
  return (
    <div className="po">
      <section className="po-cover">
        <div className="po-in">
          <p className="po-kick">{c.client} and Asri</p>
          <h1 className="po-title">{c.cover.title}</h1>
          <p className="po-lede">{c.cover.lede}</p>
          <p className="po-stamp">
            <span className="po-live" aria-hidden="true" />
            Updated {c.built_human}
            <span className="po-dot">·</span>
            {c.cover.stamp}
          </p>
        </div>
      </section>

      <section className="po-sec">
        <div className="po-in">
          <Head n="01" s={c.sections['01']} />
          <div className="po-tiles">
            {c.headline.tiles.map((t) => (
              <div className="po-tile" key={t.what}>
                <span className="po-big">{t.big}</span>
                <span className="po-what">{t.what}</span>
                <span className="po-note">{t.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="po-sec">
        <div className="po-in">
          <Head n="02" s={c.sections['02']} />
          <div className="po-cards">
            {c.package.map((p) => (
              <div className="po-card" key={p.what}>
                <span className="po-card-big">{p.big}</span>
                <span className="po-card-what">{p.what}</span>
                <span className="po-note">{p.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="po-sec">
        <div className="po-in">
          <Head n="03" s={c.sections['03']} />
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
        </div>
      </section>

      <section className="po-sec po-cream">
        <div className="po-in">
          <Head n="04" s={c.sections['04']} />
          <ol className="po-phases">
            {c.countdown.map((p) => (
              <li key={p.n}>
                <span className="po-phase-n">{p.n}</span>
                <div>
                  <h3>{p.phase}</h3>
                  <p className="po-phase-when">{p.when}</p>
                  <p className="po-phase-does">{p.does}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="po-quote">{c.example}</p>
        </div>
      </section>

      <section className="po-sec">
        <div className="po-in">
          <Head
            n="05"
            s={c.sections['05']}
            title={`${c.sections['05'].title}: ${openAsks} of ${c.asks.length} still open`}
          />
          <ul className="po-asks">
            {c.asks.map((a) => (
              <li key={a.n} className={a.open ? '' : 'po-ask-done'}>
                <span className="po-ask-n">{a.open ? a.n : '✓'}</span>
                <div>
                  <h3>{a.title}</h3>
                  <p>{a.says}</p>
                  {a.open ? (
                    <>
                      <p className="po-stop">{a.stop}</p>
                      {a.waiting.length > 1 ? (
                        <p className="po-note">Still missing: {a.waiting.join(', ')}.</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="po-note">Answered. Thank you.</p>
                  )}
                </div>
                <span className={a.open ? 'po-pill po-pill-gold' : 'po-pill'}>{a.open ? 'Open' : 'Done'}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="po-sec">
        <div className="po-in">
          <Head n="06" s={c.sections['06']} />
          <ul className="po-layers">
            {c.traction.map((t) => (
              <li key={t.layer}>
                <div>
                  <h3>{t.layer}</h3>
                  <p className="po-note">{t.counts}</p>
                </div>
                <p className={t.readable ? 'po-read' : 'po-unread'}>
                  {t.readable ? 'Readable now' : t.blocked}
                </p>
              </li>
            ))}
          </ul>
          <p className="po-quote">{c.numbers_rule}</p>
        </div>
      </section>

      <section className="po-sec">
        <div className="po-in">
          <Head n="07" s={c.sections['07']} />
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
        </div>
      </section>

      <section className="po-sec">
        <div className="po-in">
          <Head n="08" s={c.sections['08']} />
          <ul className="po-open">
            {c.open.map((o) => (
              <li key={o.title}>
                <h3>{o.title}</h3>
                <p>{o.says}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

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

  return content ? <Page c={content} /> : <Lock onOpen={onPassword} error={error} busy={busy} />;
}
