"use client";

/**
 * A private, interactive pitch. The site is a static export, so the login is the encryption: the content and its
 * photographs sit in public/pitch-data/<slug>/ as AES-GCM ciphertext, keyed by the pitch password (PBKDF2-SHA256).
 * Nothing is readable until the password is entered here; the key is kept for the browser session only.
 *
 * The reader ticks what they want (our pick is ticked to start), the picks are kept in their browser, and "Send
 * our picks" opens WhatsApp or email with the list, and posts it to a database endpoint when the pitch names one.
 * The content is written and encrypted outside this repo (new-business/proposals/mongolia/web/ in Asri's folder).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./pitch.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Meta = {
  v: number;
  kdf: string;
  rounds: number;
  salt: string;
  cipher: string;
};
type C = any;

const b64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
const toB64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

async function deriveKey(pw: string, meta: Meta) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pw),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64(meta.salt),
      iterations: meta.rounds,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"],
  );
}

async function open(key: CryptoKey, buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b.slice(0, 12) },
    key,
    b.slice(12),
  );
}

const ICON: Record<string, string> = {
  film: "M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4",
  camera: "M4 8h4l2-2h4l2 2h4v10H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  phone: "M8 3h8v18H8zM11 18h2",
  mountain: "M3 19l6-10 4 6 3-4 5 8z",
  clapper: "M4 9h16v10H4zM4 9l3-4h13l-3 4M9 5l-2 4M14 5l-2 4",
  people:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M21 19c0-2.5-2-4-4-4.5",
};
const Icon = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="pi-icon">
    <path d={ICON[name] ?? ""} />
  </svg>
);

/* ------------------------------------------------------------------ shared pieces */
type Ctx = {
  urls: Record<string, string>;
  picks: Set<string>;
  toggle: (id: string) => void;
};
const PitchCtx = createContext<Ctx>({
  urls: {},
  picks: new Set(),
  toggle: () => {},
});

function Img({
  id,
  alt = "",
  pos = "50% 50%",
  className = "",
}: {
  id: string;
  alt?: string;
  pos?: string;
  className?: string;
}) {
  const { urls } = useContext(PitchCtx);
  return (
    <div className={`pi-ph ${className}`}>
      {urls[id] ? (
        <img src={urls[id]} alt={alt} style={{ objectPosition: pos }} />
      ) : (
        <span className="pi-ph-wait" />
      )}
    </div>
  );
}

type LoadFilm = (
  f: string,
  bytes: number,
  onPct: (n: number) => void,
) => Promise<string>;

/* The film is encrypted like the photographs, so it is fetched and decrypted only when the reader presses play.
   Phones get the 720p file, everything else the 1080p one. */
function Film({ v, load }: { v: C; load: LoadFilm }) {
  const { urls } = useContext(PitchCtx);
  const [src, setSrc] = useState("");
  const [pct, setPct] = useState(-1);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const start = async () => {
    if (pct >= 0) return;
    setPct(0);
    setFailed(false);
    const small =
      window.matchMedia("(max-width: 900px)").matches ||
      Boolean((navigator as any).connection?.saveData);
    const f = (small && v.files["720"]) || v.files["1080"];
    try {
      setSrc(await load(f.f, f.bytes, setPct));
    } catch {
      setFailed(true);
      setPct(-1);
    }
  };

  // play as soon as the file is ready; if the browser wants another tap, the controls are there
  useEffect(() => {
    if (src && ref.current) ref.current.play().catch(() => {});
  }, [src]);
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src],
  );

  if (src)
    return (
      <video
        ref={ref}
        className="pi-film-v"
        controls
        playsInline
        poster={urls[v.poster]}
        src={src}
      />
    );
  return (
    <div className="pi-film-wait">
      <Img id={v.poster} pos="50% 50%" alt="" />
      <button
        type="button"
        className="pi-play"
        onClick={start}
        disabled={pct >= 0}
        aria-label={`Play ${v.caption.toLowerCase()}`}
      >
        <span className="pi-play-ring" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
        <span className="pi-play-t">
          {pct >= 0
            ? `Opening the film · ${pct}%`
            : failed
              ? "The film did not load. Try again"
              : `${v.title} · ${v.length}`}
        </span>
      </button>
    </div>
  );
}

function Box({ id }: { id: string }) {
  const { picks } = useContext(PitchCtx);
  return (
    <span
      className={`pi-box${picks.has(id) ? " on" : ""}`}
      aria-hidden="true"
    />
  );
}

function Item({ o }: { o: any }) {
  const { picks, toggle } = useContext(PitchCtx);
  return (
    <li>
      <button
        type="button"
        className={`pi-item${picks.has(o.id) ? " on" : ""}`}
        aria-pressed={picks.has(o.id)}
        onClick={() => toggle(o.id)}
      >
        <Box id={o.id} />
        <span className="pi-item-body">
          <span className="pi-item-t">
            {o.t}
            {o.film ? <span className="pi-chip">Strong on film</span> : null}
          </span>
          <span className="pi-meta">{o.meta}</span>
          <span className="pi-item-x">{o.text}</span>
          {o.who ? (
            <span className="pi-who">
              <b>Who you meet</b> {o.who}
            </span>
          ) : null}
          {o.note ? <span className="pi-nb">{o.note}</span> : null}
        </span>
      </button>
    </li>
  );
}

function Band({
  id,
  kick,
  title,
  sub,
  pos = "50% 50%",
}: {
  id: string;
  kick: string;
  title: string;
  sub?: string;
  pos?: string;
}) {
  return (
    <header className="pi-band">
      <Img id={id} pos={pos} className="pi-band-ph" />
      <div className="pi-band-t">
        <p className="pi-kick">{kick}</p>
        <h2>{title}</h2>
        {sub ? <p className="pi-band-sub">{sub}</p> : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ the lock */
function Lock({
  onOpen,
  error,
  busy,
}: {
  onOpen: (pw: string) => void;
  error: string;
  busy: boolean;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="pi-lock">
      <form
        className="pi-lock-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (pw) onOpen(pw);
        }}
      >
        <img src="/img/asri-white.png" alt="Asri" className="pi-lock-mark" />
        <p className="pi-kick">A private pitch</p>
        <h1>Enter your password</h1>
        <p className="pi-lock-lede">
          We sent it to you with the link. The pitch opens on this device only.
        </p>
        <label htmlFor="pi-pw" className="pi-vh">
          Password
        </label>
        <input
          id="pi-pw"
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        <button type="submit" disabled={busy || !pw}>
          {busy ? "Opening" : "Open the pitch"}
        </button>
        {error ? (
          <p className="pi-err" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ the app */
export default function PitchApp({ slug }: { slug: string }) {
  const base = `/pitch-data/${slug}`;
  const sessionKey = `asri-pitch-${slug}-key`;
  const picksKey = `asri-pitch-${slug}-picks`;

  const [content, setContent] = useState<C | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const keyRef = useRef<CryptoKey | null>(null);

  const unlock = useCallback(
    async (key: CryptoKey) => {
      const buf = await fetch(`${base}/payload.bin`).then((r) =>
        r.arrayBuffer(),
      );
      const plain = await open(key, buf);
      const c = JSON.parse(new TextDecoder().decode(plain));
      keyRef.current = key;
      setContent(c);
      try {
        const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
        sessionStorage.setItem(sessionKey, toB64(raw));
      } catch {
        /* storage may be blocked; the reader enters the password again next time */
      }
    },
    [base, sessionKey],
  );

  const onPassword = useCallback(
    async (pw: string) => {
      setBusy(true);
      setError("");
      try {
        const meta: Meta = await fetch(`${base}/meta.json`).then((r) =>
          r.json(),
        );
        const key = await deriveKey(pw, meta);
        await unlock(key);
      } catch {
        setError(
          "That password did not open the pitch. Check it and try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [base, unlock],
  );

  // a reload in the same session opens straight away
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(sessionKey);
    } catch {
      raw = null;
    }
    if (!raw) return;
    crypto.subtle
      .importKey("raw", b64(raw), "AES-GCM", true, ["decrypt"])
      .then(unlock)
      .catch(() => {
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {
          /* ignore */
        }
      });
  }, [sessionKey, unlock]);

  // decrypt the photographs, the cover first
  useEffect(() => {
    if (!content || !keyRef.current) return;
    const key = keyRef.current;
    const order: string[] = [];
    const seen = new Set<string>();
    const walk = (o: unknown) => {
      if (typeof o === "string") {
        if (content.images[o] && !seen.has(o)) {
          seen.add(o);
          order.push(o);
        }
      } else if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") Object.values(o).forEach(walk);
    };
    walk({
      a: content.hero,
      b: content.video,
      c: content.overture,
      d: content,
    });
    let cancelled = false;
    const made: string[] = [];
    (async () => {
      const queue = [...order];
      const worker = async () => {
        while (queue.length && !cancelled) {
          const id = queue.shift() as string;
          try {
            const ref = content.images[id];
            const buf = await fetch(`${base}/${ref.f}`).then((r) =>
              r.arrayBuffer(),
            );
            const plain = await open(key, buf);
            const url = URL.createObjectURL(
              new Blob([plain], {
                type: id === "logo_sm" ? "image/png" : "image/jpeg",
              }),
            );
            made.push(url);
            if (!cancelled) setUrls((u) => ({ ...u, [id]: url }));
          } catch {
            /* a missing frame leaves its placeholder */
          }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
    })();
    return () => {
      cancelled = true;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [content, base]);

  const loadFilm = useCallback<LoadFilm>(
    async (f, bytes, onPct) => {
      const key = keyRef.current;
      if (!key) throw new Error("locked");
      const r = await fetch(`${base}/${f}`);
      if (!r.ok || !r.body) throw new Error(`film ${r.status}`);
      const reader = r.body.getReader();
      const parts: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.length;
        onPct(Math.min(99, Math.round((got * 100) / bytes)));
      }
      const buf = new Uint8Array(got);
      let at = 0;
      for (const part of parts) {
        buf.set(part, at);
        at += part.length;
      }
      const plain = await open(key, buf.buffer);
      return URL.createObjectURL(new Blob([plain], { type: "video/mp4" }));
    },
    [base],
  );

  if (!content) return <Lock onOpen={onPassword} error={error} busy={busy} />;
  return (
    <Pitch
      c={content}
      urls={urls}
      picksKey={picksKey}
      slug={slug}
      loadFilm={loadFilm}
    />
  );
}

/* ------------------------------------------------------------------ the pitch */
const SINGLE: Record<string, string> = {
  "length-": "length",
  "venue-": "venue",
  "sky-": "sky",
};
const groupOf = (id: string) =>
  Object.entries(SINGLE).find(([p]) => id.startsWith(p))?.[1];

function Pitch({
  c,
  urls,
  picksKey,
  slug,
  loadFilm,
}: {
  c: C;
  urls: Record<string, string>;
  picksKey: string;
  slug: string;
  loadFilm: LoadFilm;
}) {
  const [picks, setPicks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(picksKey);
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      /* first visit, or storage blocked: our pick stands */
    }
    return new Set(c.pick);
  });
  const [drawer, setDrawer] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState("");

  const save = (next: Set<string>) => {
    setPicks(next);
    try {
      localStorage.setItem(picksKey, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: string) => {
    const next = new Set(picks);
    const g = groupOf(id);
    if (g) {
      const prefix = Object.entries(SINGLE).find(([, v]) => v === g)![0];
      [...next]
        .filter((x) => x.startsWith(prefix))
        .forEach((x) => next.delete(x));
      next.add(id);
    } else if (next.has(id)) next.delete(id);
    else next.add(id);
    save(next);
  };

  const img = (id?: string) => (id ? urls[id] : undefined);

  // every option, for the send panel
  const all = useMemo(() => {
    const groups: [string, any[]][] = [
      ["Regions", [...c.regions, ...c.length]],
      ["The launch night", [...c.venues.items, ...c.venues.sky]],
      ["The Gobi", c.gobi.exp],
      ["Central Mongolia", c.central.exp],
      ["Ulaanbaatar", c.ub.exp],
      ["Where you stay", c.stays.flatMap((b: any) => b.opts)],
      ["Getting around", c.move.items],
      ["The production", c.prod.items],
    ];
    return groups;
  }, [c]);
  const chosen = all
    .map(
      ([g, items]) =>
        [g, items.filter((o: any) => picks.has(o.id))] as [string, any[]],
    )
    .filter(([, i]) => i.length);
  const count = chosen.reduce((n, [, i]) => n + i.length, 0);

  const message = () => {
    const lines = [
      `${c.client}: ${c.title}. Our picks${name ? `, from ${name}` : ""}:`,
      "",
    ];
    chosen.forEach(([g, items]) => {
      lines.push(`${g}: ${items.map((o: any) => o.t).join("; ")}`);
    });
    if (note) lines.push("", note);
    return lines.join("\n");
  };

  const post = async () => {
    if (!c.contact.endpoint) return;
    try {
      await fetch(c.contact.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          pitch: slug,
          client: c.client,
          name,
          note,
          picks: [...picks],
          at: new Date().toISOString(),
        }),
      });
      setSent("Saved. We have your picks.");
    } catch {
      setSent("Not saved: please send them on WhatsApp instead.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message());
      setSent("Copied.");
    } catch {
      setSent("Copy did not work here: select the list above instead.");
    }
  };

  const h = c.hero;
  const L = c.launch;
  return (
    <PitchCtx.Provider value={{ urls, picks, toggle }}>
      <div className="pi">
        {/* cover */}
        <section className="pi-cover">
          <Img
            id={h.img}
            pos="50% 70%"
            className="pi-cover-ph"
            alt="Dunes in the Gobi at golden hour"
          />
          <div className="pi-cover-t">
            <div className="pi-lockup">
              <img src="/img/asri-white.png" alt="Asri" />
              <i />
              {img(h.logo) ? (
                <img src={img(h.logo)} alt="San Marzano" className="pi-sm" />
              ) : (
                <span className="pi-sm" />
              )}
            </div>
            <h1>{h.title}</h1>
            <p className="pi-cover-sub">{h.sub}</p>
            <p className="pi-kick">{h.prep}</p>
          </div>
          <p className="pi-cover-foot">
            {h.foot}
            <br />
            <span>{h.by}</span>
          </p>
        </section>

        {/* the film */}
        <section className="pi-film">
          <p className="pi-kick">{c.video.caption}</p>
          {c.video.files ? (
            <Film v={c.video} load={loadFilm} />
          ) : (
            <div className="pi-film-wait">
              <Img id={c.video.poster} pos="50% 50%" />
              <p>{c.video.note}</p>
            </div>
          )}
          {c.video.files && c.video.credit ? (
            <p className="pi-film-cap">{c.video.credit}</p>
          ) : null}
        </section>

        {/* overture */}
        <section className="pi-sec pi-dark">
          <p className="pi-kick">{c.overture.kick}</p>
          <h2 className="pi-h">
            {c.overture.title} <em>{c.overture.g}</em>
          </h2>
          <p className="pi-lede">
            {c.overture.lede} <b>{c.overture.b}</b>
          </p>
          <div className="pi-mosaic">
            {c.overture.imgs.map((id: string, i: number) => (
              <Img key={id} id={id} className={`m${i}`} />
            ))}
          </div>
        </section>

        {/* the launch */}
        <section className="pi-sec pi-dark pi-launchv">
          <Band id={L.band} kick={L.kick} title={L.title} sub={L.sub} />
          <p className="pi-lede">
            {L.lede} <b>{L.b}</b>
          </p>
          <div className="pi-two">
            <div>
              <p className="pi-kick sm">The wine at every table</p>
              <ol className="pi-tables">
                {L.tables.map(([n, t, w, d]: string[]) => (
                  <li key={n}>
                    <span className="n">{n}</span>
                    <div>
                      <b>{t}</b>
                      <span className="pi-meta">{w}</span>
                      <p>{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <figure className="pi-fig">
              <Img id={L.img} />
              <figcaption>{L.imgcap}</figcaption>
            </figure>
          </div>
          <p className="pi-kick sm">What you take home</p>
          <ul className="pi-home">
            {L.home.map(([i, t, d]: string[]) => (
              <li key={t}>
                <Icon name={i} />
                <div>
                  <b>{t}</b>
                  <span>{d}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* how it works */}
        <section className="pi-sec pi-light">
          <p className="pi-kick">How it works</p>
          <h2 className="pi-h">
            {c.how.title} <em>{c.how.g}</em>
          </h2>
          <p className="pi-lede">{c.how.lede}</p>
          <ol className="pi-steps">
            {c.how.steps.map(([t, d]: string[], i: number) => (
              <li key={t}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ol>
          <div className="pi-stats">
            {c.how.stats.map(([a, b]: string[]) => (
              <div key={b}>
                <b>{a}</b>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </section>

        {/* our pick */}
        <section className="pi-sec pi-light">
          <p className="pi-kick">Our pick</p>
          <h2 className="pi-h">
            {c.pickPage.title} <em>{c.pickPage.g}</em>
          </h2>
          <p className="pi-lede">{c.pickPage.lede}</p>
          <div className="pi-two">
            <ol className="pi-days">
              {c.pickPage.days.map(([d, k, r, w]: string[]) => (
                <li key={d}>
                  <span className="d">{d}</span>
                  <span className={`r ${k}`}>{r}</span>
                  <span className="w">{w}</span>
                </li>
              ))}
            </ol>
            <div className="pi-why">
              <p className="pi-kick sm">Why this pick</p>
              {c.pickPage.why.map(([b, t]: string[]) => (
                <p key={b}>
                  <b>{b}</b> {t}
                </p>
              ))}
              <p className="pi-datenote">{c.pickPage.datenote}</p>
              <button
                type="button"
                className="pi-btn ghost"
                onClick={() => save(new Set(c.pick))}
              >
                Reset to our pick
              </button>
            </div>
          </div>
        </section>

        {/* choice 01: regions and the map */}
        <section className="pi-sec pi-light">
          <p className="pi-kick">Choice 01</p>
          <h2 className="pi-h">
            Choose Your <em>Regions.</em>
          </h2>
          <p className="pi-lede">
            Two regions and the capital fit six days. Take all three, or keep it
            to the Gobi and Ulaanbaatar for five.
          </p>
          <div className="pi-mapgrid">
            <div className="pi-mapcol">
              <div className="pi-map">
                <Img
                  id={c.map.img}
                  alt="Relief map of central and southern Mongolia"
                />
                <div
                  className="pi-map-ov"
                  dangerouslySetInnerHTML={{ __html: c.map.svg }}
                />
              </div>
              <p className="pi-mapnote">{c.map.note}</p>
            </div>
            <div className="pi-side">
              <ul className="pi-grid3">
                {c.regions.map((o: any) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={`pi-item pi-region ${o.c}${picks.has(o.id) ? " on" : ""}`}
                      aria-pressed={picks.has(o.id)}
                      onClick={() => toggle(o.id)}
                    >
                      <Box id={o.id} />
                      <span className="pi-item-body">
                        <span className="pi-meta">{o.k}</span>
                        <span className="pi-item-t big">{o.t}</span>
                        <span className="pi-item-x">{o.d}</span>
                        <span className="pi-meta">{o.m}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="pi-seg" role="group" aria-label="How long">
                {c.length.map((o: any) => (
                  <button
                    key={o.id}
                    type="button"
                    className={picks.has(o.id) ? "on" : ""}
                    aria-pressed={picks.has(o.id)}
                    onClick={() => toggle(o.id)}
                  >
                    <b>{o.t}</b>
                    <span>{o.d}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* June */}
        <section className="pi-sec pi-light">
          <Band
            id={c.june.img}
            kick="The season"
            title="June in Mongolia"
            sub="Green steppe, long light, dark skies"
            pos="50% 60%"
          />
          <p className="pi-lede">{c.june.lede}</p>
          <div className="pi-tablewrap">
            <table className="pi-clim">
              <thead>
                <tr>
                  <th>June averages</th>
                  <th>Day</th>
                  <th>Night</th>
                  <th>Rain</th>
                  <th>What it means</th>
                </tr>
              </thead>
              <tbody>
                {c.june.rows.map((r: string[]) => (
                  <tr key={r[0]}>
                    <th>{r[0]}</th>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td>{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="pi-facts">
            {c.june.facts.map(([b, t]: string[]) => (
              <li key={b}>
                <b>{b}</b>
                {t}
              </li>
            ))}
          </ul>
          <p className="pi-src">{c.june.note}</p>
        </section>

        {/* the Gobi */}
        <section className="pi-open">
          <Img id={c.gobi.open.img} pos="50% 40%" className="pi-open-ph" />
          <div className="pi-open-t">
            <p className="pi-kick">{c.gobi.open.kick}</p>
            <h2>{c.gobi.open.title}</h2>
            <div className="pi-two">
              <p className="big">{c.gobi.open.big}</p>
              <p>{c.gobi.open.text}</p>
            </div>
          </div>
        </section>
        <Places
          places={c.gobi.places}
          imgs={c.gobi.place_imgs}
          title="Six Landscapes"
          kick="The Gobi · places"
        />
        <section className="pi-sec pi-light">
          <Band
            id={c.gobi.band}
            kick="Choice 03 · the Gobi"
            title="Adventure"
            sub="With a soft landing"
            pos="50% 45%"
          />
          <p className="pi-hint">Tap to tick or untick.</p>
          <ul className="pi-menu">
            {c.gobi.exp.map((o: any) => (
              <Item key={o.id} o={o} />
            ))}
          </ul>
        </section>

        {/* choice 02: the launch night */}
        <section className="pi-sec pi-dark pi-night">
          <Img id={c.venues.img} pos="50% 30%" className="pi-night-ph" />
          <div className="pi-night-t">
            <p className="pi-kick">Choice 02 · the signature moment</p>
            <h2 className="pi-h">The Launch Night.</h2>
            <p className="pi-lede">{c.venues.lede}</p>
            <ul className="pi-venues">
              {c.venues.items.map((o: any) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`pi-venue${picks.has(o.id) ? " on" : ""}`}
                    aria-pressed={picks.has(o.id)}
                    onClick={() => toggle(o.id)}
                  >
                    <span
                      className={`pi-radio${picks.has(o.id) ? " on" : ""}`}
                    />
                    <span className="v">
                      <b>{o.t}</b>
                      <span className="pi-meta">{o.w}</span>
                    </span>
                    <span className="why">{o.why}</span>
                    <span className="hard">{o.hard}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div
              className="pi-seg dark"
              role="group"
              aria-label="Stars or moonlight"
            >
              {c.venues.sky.map((o: any) => (
                <button
                  key={o.id}
                  type="button"
                  className={picks.has(o.id) ? "on" : ""}
                  aria-pressed={picks.has(o.id)}
                  onClick={() => toggle(o.id)}
                >
                  <b>{o.t}</b>
                  <span>{o.d}</span>
                </button>
              ))}
            </div>
            <ol className="pi-moon" aria-label="The moon in June 2028">
              {c.venues.moon.map(([d, k]: [number, string]) => (
                <li key={d} className={k}>
                  <i />
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Central Mongolia */}
        <Places
          places={c.central.places}
          imgs={c.central.place_imgs}
          title="Central Mongolia"
          kick="Region 02 · Övörkhangai · Bulgan · Töv"
          band={c.central.band}
        />
        <section className="pi-sec pi-light">
          <Band
            id={c.central.exp_band}
            kick="Choice 03 · Central Mongolia"
            title="Living Alongside"
            sub="The herders"
            pos="50% 40%"
          />
          <ul className="pi-menu">
            {c.central.exp.map((o: any) => (
              <Item key={o.id} o={o} />
            ))}
          </ul>
          <div className="pi-strip">
            {c.central.people.map((id: string) => (
              <Img key={id} id={id} pos="50% 30%" />
            ))}
          </div>
        </section>

        {/* Ulaanbaatar */}
        <section className="pi-sec pi-light">
          <Band
            id={c.ub.band}
            kick="Choice 03 · Ulaanbaatar"
            title="Ulaanbaatar"
            sub="The capital at either end of the trip"
            pos="50% 30%"
          />
          <ul className="pi-menu">
            {c.ub.exp.map((o: any) => (
              <Item key={o.id} o={o} />
            ))}
          </ul>
        </section>

        {/* choice 04: stays */}
        <section className="pi-sec pi-light">
          <p className="pi-kick">Choice 04</p>
          <h2 className="pi-h">
            Where You <em>Stay.</em>
          </h2>
          <p className="pi-lede">
            A base in each region. Pick the main stay, and we hold a reserve for
            crew and overflow.
          </p>
          {c.stays.map((b: any) => (
            <div className="pi-base" key={b.k}>
              <div className="pi-base-h">
                <span className="pi-meta">{b.k}</span>
                <h3>{b.title}</h3>
              </div>
              <ul>
                {b.opts.map((o: any) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={`pi-item slim${picks.has(o.id) ? " on" : ""}`}
                      aria-pressed={picks.has(o.id)}
                      onClick={() => toggle(o.id)}
                    >
                      <Box id={o.id} />
                      <span className="pi-item-body">
                        <span className="pi-item-t">
                          {o.t} <span className="pi-role">{o.role}</span>
                        </span>
                        {o.d ? <span className="pi-item-x">{o.d}</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="pi-base-ims">
                {b.imgs.map((id: string) => (
                  <Img key={id} id={id} />
                ))}
              </div>
            </div>
          ))}
          <p className="pi-src">
            Room counts from public listings, approximate. Lodge photographs are
            the lodges’ own.
          </p>
        </section>

        {/* getting around */}
        <section className="pi-sec pi-light">
          <Band
            id={c.move.band}
            kick="Logistics"
            title="Getting Around"
            sub="Plane for distance, car for adventure, helicopter for the hero shot"
            pos="50% 45%"
          />
          <ul className="pi-menu">
            {c.move.items.map((o: any) => (
              <Item key={o.id} o={o} />
            ))}
          </ul>
          <p className="pi-pattern">
            <b>One possible pattern</b> {c.move.pattern}
          </p>
        </section>

        {/* choice 05: the production */}
        <section className="pi-sec pi-dark">
          <Band
            id={c.prod.band}
            kick="Choice 05 · Asri"
            title="The Production"
            sub="What we film, photograph and deliver"
            pos="50% 55%"
          />
          <ul className="pi-menu">
            {c.prod.items.map((o: any) => (
              <Item key={o.id} o={o} />
            ))}
          </ul>
          <p className="pi-src">{c.prod.note}</p>
        </section>

        {/* routes */}
        <section className="pi-sec pi-light">
          <p className="pi-kick">Putting it together</p>
          <h2 className="pi-h">
            Two Sample <em>Routes.</em>
          </h2>
          <div className="pi-two">
            {c.routes.map((r: any) => (
              <div key={r.t} className="pi-route">
                <h3>{r.t}</h3>
                <p>{r.d}</p>
                <ol className="pi-days">
                  {r.days.map((d: any) => (
                    <li key={d.n}>
                      <span className="d">{d.n}</span>
                      <span className={`r ${d.c}`}>{d.r}</span>
                      <span className="w">{d.w}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <p className="pi-src">{c.routesNote}</p>
        </section>

        {/* before we fix dates, and the close */}
        <section className="pi-sec pi-dark">
          <p className="pi-kick">Before we fix dates</p>
          <h2 className="pi-h">What to Settle Early.</h2>
          <div className="pi-tablewrap">
            <table className="pi-notes">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>What we know</th>
                  <th>What we do</th>
                </tr>
              </thead>
              <tbody>
                {c.notes.map((r: string[]) => (
                  <tr key={r[0]}>
                    <th>{r[0]}</th>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pi-partner">
            <p className="pi-kick sm">Our partner in Mongolia</p>
            <span className="pi-ss">
              <b>{c.mark}</b>
            </span>
            <p>{c.partner}</p>
          </div>
        </section>
        <section className="pi-close">
          <Img id={c.close.img} pos="50% 55%" className="pi-close-ph" />
          <div className="pi-close-t">
            <div className="pi-lockup">
              <img src="/img/asri-white.png" alt="Asri" />
              <i />
              {img(h.logo) ? (
                <img src={img(h.logo)} alt="San Marzano" className="pi-sm" />
              ) : (
                <span className="pi-sm" />
              )}
            </div>
            <h2>{c.close.title}</h2>
            <p className="pi-with">With</p>
            <span className="pi-ss">
              <b>{c.mark}</b>
            </span>
            <p className="pi-close-lines">{c.close.lines.join(" · ")}</p>
          </div>
        </section>
        <p className="pi-credits">{c.close.credits}</p>

        {/* the send bar and panel */}
        <div className="pi-bar">
          <span>
            <b>{count}</b> picked
          </span>
          <button
            type="button"
            className="pi-btn"
            onClick={() => setDrawer(true)}
          >
            Review and send<span className="pi-wide"> our picks</span>
          </button>
        </div>
        {drawer ? (
          <div
            className="pi-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your picks"
          >
            <div className="pi-drawer-box">
              <button
                type="button"
                className="pi-x"
                onClick={() => setDrawer(false)}
                aria-label="Close"
              >
                ×
              </button>
              <p className="pi-kick">Your picks</p>
              <h2>Tick, and We Cost It.</h2>
              <div className="pi-chosen">
                {chosen.map(([g, items]) => (
                  <div key={g}>
                    <b>{g}</b>
                    <p>{items.map((o: any) => o.t).join(" · ")}</p>
                  </div>
                ))}
              </div>
              <label htmlFor="pi-name">Your name</label>
              <input
                id="pi-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="So we know who chose"
              />
              <label htmlFor="pi-note">Anything else</label>
              <textarea
                id="pi-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Dates, guest numbers, the wine you are launching"
              />
              <div className="pi-send">
                <a
                  className="pi-btn"
                  href={`https://wa.me/${c.contact.whatsapp}?text=${encodeURIComponent(message())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={post}
                >
                  Send on WhatsApp
                </a>
                {c.contact.email ? (
                  <a
                    className="pi-btn ghost"
                    href={`mailto:${c.contact.email}?subject=${encodeURIComponent(`${c.client}: ${c.title}, our picks`)}&body=${encodeURIComponent(message())}`}
                    onClick={post}
                  >
                    Send by email
                  </a>
                ) : null}
                <button type="button" className="pi-btn ghost" onClick={copy}>
                  Copy the list
                </button>
              </div>
              <p className="pi-fine">
                WhatsApp: +1 757 296 2109 (Brandon). Your picks stay saved on
                this device.
              </p>
              {sent ? <p className="pi-sent">{sent}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </PitchCtx.Provider>
  );
}

function Places({
  places,
  imgs,
  title,
  kick,
  band,
}: {
  places: any[];
  imgs: string[];
  title: string;
  kick: string;
  band?: string;
}) {
  return (
    <section className="pi-sec pi-light">
      {band ? <Img id={band} pos="50% 55%" className="pi-places-ph" /> : null}
      <p className="pi-kick">{kick}</p>
      <h2 className="pi-h">{title}</h2>
      <ul className="pi-places">
        {places.map((p) => (
          <li key={p.t}>
            <span className="loc">{p.loc}</span>
            <b>{p.t}</b>
            <span className="pi-meta">{p.meta}</span>
            <p>{p.text}</p>
            {p.note ? <span className="pi-nb">{p.note}</span> : null}
          </li>
        ))}
      </ul>
      <div className="pi-strip">
        {imgs.map((id) => (
          <Img key={id} id={id} />
        ))}
      </div>
    </section>
  );
}
