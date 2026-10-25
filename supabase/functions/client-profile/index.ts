/**
 * The back end of /client-profile/. The site is a static export, so the form
 * has no server of its own: it calls this function, which is the only thing
 * that touches the client_* tables and the client-brand-assets bucket.
 *
 * Two actions, both POST with a JSON body:
 *   upload-url  { action, draftId, name, size }
 *               -> { path, signedUrl, apikey }   (the browser PUTs the file there)
 *   submit      { action, draftId, answers, followups, files, source, website, turnstile }
 *               -> { ok: true, ref }
 *
 * Deploy without JWT verification, because the browser sends no key:
 *   supabase functions deploy client-profile --no-verify-jwt
 * Abuse is handled here instead: origin allow-list, per-IP rate limits, a
 * honeypot, an extension allow-list, a size cap, and Cloudflare Turnstile when
 * TURNSTILE_SECRET_KEY is set.
 *
 * Secrets (supabase secrets set ...), all optional:
 *   ALLOWED_ORIGINS       comma-separated; defaults to the live site and localhost
 *   TURNSTILE_SECRET_KEY  turns on the Turnstile check on submit
 *   NOTIFY_WEBHOOK_URL    Slack-compatible incoming webhook, posted to when a profile arrives
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID
 *                         together turn on the Google sync: each submitted profile gets a
 *                         folder in that Drive folder, with a Google Doc of the answers and
 *                         a copy of the uploaded files. All four, or none.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

// Supabase's edge runtime keeps a request's background work alive after the response is sent.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const BUCKET = 'client-brand-assets';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // keep in step with the bucket limit
const MAX_FILES = 40;
const MAX_BODY_BYTES = 400_000;
const UPLOADS_PER_HOUR = 80;
const SUBMITS_PER_HOUR = 6;

const EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'tif', 'tiff', 'heic',
  'ai', 'eps', 'psd', 'indd', 'sketch', 'fig',
  'zip', 'doc', 'docx', 'ppt', 'pptx', 'key', 'pages', 'xls', 'xlsx', 'numbers', 'csv', 'txt',
  'ttf', 'otf', 'woff', 'woff2', 'mp4', 'mov',
]);
const CATEGORIES = new Set(['Logo', 'Brand guidelines', 'Photos', 'Renderings', 'Menu or price list', 'Press kit', 'Other']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY = /^[A-Za-z0-9_]{1,60}$/; // field ids such as url_Instagram have capitals

const ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') ??
  'https://findyourasri.com,https://www.findyourasri.com,https://findyourasri.netlify.app,http://localhost:3000'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

class Fail extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

/** True when this caller has used up `max` requests of this kind in the last hour. Otherwise records one. */
async function rateLimited(ipHash: string, kind: string, max: number) {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error } = await db
    .from('client_profile_hits')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('kind', kind)
    .gte('at', since);
  if (error) throw error;
  if ((count ?? 0) >= max) return true;
  const { error: insertError } = await db.from('client_profile_hits').insert({ ip_hash: ipHash, kind });
  if (insertError) throw insertError;
  return false;
}

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function profileExists(id: string) {
  const { data, error } = await db.from('client_profiles').select('id').eq('id', id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/* ---------------------------------------------------------------- upload-url */

async function uploadUrl(req: Request, body: Record<string, unknown>, ipHash: string) {
  const draftId = str(body.draftId, 40);
  if (!UUID.test(draftId)) throw new Fail(400, 'bad_draft');

  const name = str(body.name, 255);
  const size = Number(body.size);
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  if (!EXTENSIONS.has(ext)) throw new Fail(400, 'file_type');
  if (!Number.isFinite(size) || size <= 0) throw new Fail(400, 'bad_size');
  if (size > MAX_FILE_BYTES) throw new Fail(413, 'file_too_large');

  if (await rateLimited(ipHash, 'upload', UPLOADS_PER_HOUR)) throw new Fail(429, 'rate_limited');
  if (await profileExists(draftId)) throw new Fail(409, 'already_submitted');

  const { data: existing, error: listError } = await db.storage.from(BUCKET).list(draftId, { limit: MAX_FILES + 1 });
  if (listError) throw listError;
  if ((existing?.length ?? 0) >= MAX_FILES) throw new Fail(400, 'too_many_files');

  // Storage keys stay plain: letters, digits, dot, dash, underscore.
  const base = name
    .slice(0, name.length - ext.length - 1)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'file';
  const path = `${draftId}/${crypto.randomUUID()}-${base}.${ext}`;

  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error('no signed url');

  return json(req, 200, {
    path,
    signedUrl: data.signedUrl,
    // The storage gateway wants an apikey on the PUT. The anon key is public by design.
    apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  });
}

/* -------------------------------------------------------------------- submit */

/** Only the shapes the form produces: strings, booleans, string lists, and {url, notes} rows. */
function cleanAnswers(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Fail(400, 'bad_answers');
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!KEY.test(key)) continue;
    if (typeof value === 'string') out[key] = value.slice(0, 5000);
    else if (typeof value === 'boolean') out[key] = value;
    else if (Array.isArray(value)) {
      out[key] = value.slice(0, 20).map((item) =>
        typeof item === 'string'
          ? item.slice(0, 200)
          : { url: str((item as Record<string, unknown>)?.url, 500), notes: str((item as Record<string, unknown>)?.notes, 1000) },
      );
    }
  }
  return out;
}

function cleanFollowups(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 60).flatMap((item) => {
    const kind = str((item as Record<string, unknown>)?.kind, 10);
    const text = str((item as Record<string, unknown>)?.text, 400);
    return ['setup', 'check', 'note'].includes(kind) && text ? [{ kind, text }] : [];
  });
}

/** The readable copy of the answers the browser builds (labels and values), as plain strings only. */
function cleanSummary(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).flatMap((section) => {
    const s = section as Record<string, unknown>;
    const title = str(s?.title, 120);
    const rows = Array.isArray(s?.rows)
      ? (s.rows as unknown[]).slice(0, 80).flatMap((row) => {
          const r = row as Record<string, unknown>;
          const label = str(r?.label, 300);
          const value = str(r?.value, 5000);
          return label && value ? [{ label, value }] : [];
        })
      : [];
    return title && rows.length ? [{ title, rows }] : [];
  });
}

async function verifyTurnstile(token: string, ip: string) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return;
  if (!token) throw new Fail(400, 'captcha');
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const result = await res.json().catch(() => ({}));
  if (!result.success) throw new Fail(400, 'captcha');
}

async function submit(req: Request, body: Record<string, unknown>, ipHash: string, ip: string) {
  // Bots fill every field. A silent success tells them nothing.
  if (str(body.website, 100)) return json(req, 200, { ok: true, ref: 'ASRI-0000' });

  const draftId = str(body.draftId, 40);
  if (!UUID.test(draftId)) throw new Fail(400, 'bad_draft');

  const answers = cleanAnswers(body.answers);
  const businessName = str(answers.biz_name, 200);
  const contactName = str(answers.contact_name, 200);
  const contactEmail = str(answers.contact_email, 200);
  if (!businessName || !contactName) throw new Fail(400, 'missing_fields');
  if (!EMAIL.test(contactEmail)) throw new Fail(400, 'bad_email');
  if (answers.consent !== true) throw new Fail(400, 'consent');

  if (await rateLimited(ipHash, 'submit', SUBMITS_PER_HOUR)) throw new Fail(429, 'rate_limited');
  await verifyTurnstile(str(body.turnstile, 4000), ip);

  // A repeat submit of the same draft (a double click, a retry after a slow
  // response) must not create a second profile.
  if (await profileExists(draftId)) return json(req, 200, { ok: true, ref: refFor(draftId) });

  // Every listed file has to be in storage, under this draft's folder.
  const requested = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
  const { data: stored, error: listError } = await db.storage.from(BUCKET).list(draftId, { limit: 200 });
  if (listError) throw listError;
  const sizes = new Map((stored ?? []).map((o) => [`${draftId}/${o.name}`, Number(o.metadata?.size ?? 0)]));
  const fileRows = requested.map((raw) => {
    const f = raw as Record<string, unknown>;
    const path = str(f.path, 400);
    if (!path.startsWith(`${draftId}/`) || !sizes.has(path)) throw new Fail(400, 'file_missing');
    const category = str(f.category, 40);
    return {
      profile_id: draftId,
      path,
      name: str(f.name, 255) || path.split('/').pop()!,
      size: sizes.get(path) ?? 0,
      category: CATEGORIES.has(category) ? category : 'Other',
    };
  });

  const services = Array.isArray(answers.services) ? (answers.services as unknown[]).filter((s) => typeof s === 'string') : [];
  // Where the visitor came from: page and UTM values, as short strings.
  const rawSource = body.source && typeof body.source === 'object' ? (body.source as Record<string, unknown>) : {};
  const source = Object.fromEntries(
    Object.entries(rawSource)
      .filter(([key]) => KEY.test(key))
      .slice(0, 12)
      .map(([key, value]) => [key, str(value, 200)]),
  );

  const { error: profileError } = await db.from('client_profiles').insert({
    id: draftId,
    business_name: businessName,
    contact_name: contactName,
    contact_email: contactEmail,
    country: str(answers.country, 100) || null,
    sector: str(answers.sector, 200) || null,
    services,
    budget: str(answers.budget, 100) || null,
    answers,
    followups: cleanFollowups(body.followups),
    summary: cleanSummary(body.summary),
    consent: true,
    source,
  });
  if (profileError) throw profileError;

  if (fileRows.length) {
    const { error: filesError } = await db.from('client_files').insert(fileRows);
    if (filesError) {
      await db.from('client_profiles').delete().eq('id', draftId);
      throw filesError;
    }
  }

  // The response does not wait for Google. With the sync on, the team is told once the Doc exists.
  const after = googleOn()
    ? syncToGoogle(draftId)
    : notify(businessName, contactName, contactEmail, fileRows.length);
  EdgeRuntime.waitUntil(after.catch((e) => console.error('after-submit work failed', e)));
  return json(req, 200, { ok: true, ref: refFor(draftId) });
}

const refFor = (id: string) => `ASRI-${id.slice(0, 8).toUpperCase()}`;

async function notify(business: string, contact: string, email: string, files: number, docUrl?: string | null) {
  const url = Deno.env.get('NOTIFY_WEBHOOK_URL');
  if (!url) return;
  const link = docUrl ? ` ${docUrl}` : '';
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `New client profile: ${business}. ${contact} (${email}), ${files} file${files === 1 ? '' : 's'}.${link}`,
    }),
  });
}

/* -------------------------------------------------------------- google sync */

const G = {
  clientId: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
  clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
  refreshToken: Deno.env.get('GOOGLE_REFRESH_TOKEN') ?? '',
  parent: Deno.env.get('GOOGLE_DRIVE_FOLDER_ID') ?? '',
};
const googleOn = () => Boolean(G.clientId && G.clientSecret && G.refreshToken && G.parent);

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

type DriveItem = { id: string; webViewLink: string };

async function googleJson(res: Response, what: string) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${what}: ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function googleToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: G.clientId,
      client_secret: G.clientSecret,
      refresh_token: G.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await googleJson(res, 'google sign-in');
  if (!data.access_token) throw new Error('google sign-in: no access token');
  return data.access_token as string;
}

async function createFolder(token: string, name: string, parent: string): Promise<DriveItem> {
  const res = await fetch(`${DRIVE}/files?fields=id,webViewLink&supportsAllDrives=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  });
  return googleJson(res, 'create folder');
}

/** Copies one stored file into a Drive folder. Files are at most 50 MB and go one at a time, so each is held in memory briefly. */
async function copyToDrive(token: string, file: { path: string; name: string }, folderId: string): Promise<DriveItem> {
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(file.path, 600);
  if (error || !data) throw error ?? new Error('no download url');
  const source = await fetch(data.signedUrl);
  if (!source.ok) throw new Error(`read ${file.name}: ${source.status}`);
  const bytes = await source.arrayBuffer();

  const start = await fetch(`${UPLOAD}/files?uploadType=resumable&fields=id,webViewLink&supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(bytes.byteLength),
    },
    body: JSON.stringify({ name: file.name, parents: [folderId] }),
  });
  if (!start.ok) throw new Error(`start upload ${file.name}: ${start.status} ${(await start.text()).slice(0, 200)}`);
  const session = start.headers.get('location');
  if (!session) throw new Error(`start upload ${file.name}: no upload address`);
  const put = await fetch(session, { method: 'PUT', body: bytes });
  return googleJson(put, `upload ${file.name}`);
}

/** Drive turns HTML into a formatted Google Doc when asked for the Docs type. */
async function createDoc(token: string, name: string, html: string, folderId: string): Promise<DriveItem> {
  const boundary = `asri-${crypto.randomUUID()}`;
  const meta = { name, mimeType: 'application/vnd.google-apps.document', parents: [folderId] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;
  const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return googleJson(res, 'create doc');
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cell = (t: string) =>
  esc(t)
    .replace(/(https?:\/\/[^\s<]*[^\s<.,;:!?)])/g, (u) => `<a href="${u}">${u}</a>`)
    .replace(/\n/g, '<br>');

type Row = { label: string; value: string };
type SummarySection = { title: string; rows: Row[] };

function profileHtml(
  p: { id: string; business_name: string; contact_name: string; contact_email: string; submitted_at: string },
  followups: { kind: string; text: string }[],
  sections: SummarySection[],
  files: { name: string; category: string; link: string }[],
) {
  const tag = (kind: string) => (kind === 'setup' ? 'Set up' : kind === 'check' ? 'Check' : 'Note');
  const table = (rows: Row[]) =>
    `<table border="1" cellpadding="6" cellspacing="0">${rows
      .map((r) => `<tr><td width="30%"><b>${esc(r.label)}</b></td><td>${cell(r.value)}</td></tr>`)
      .join('')}</table>`;
  return [
    '<html><body>',
    `<h1>Client profile: ${esc(p.business_name)}</h1>`,
    `<p>Received ${esc(p.submitted_at.slice(0, 10))} from ${esc(p.contact_name)} (${esc(p.contact_email)}). Reference ${esc(refFor(p.id))}.</p>`,
    followups.length
      ? `<h2>Team follow-ups</h2><ul>${followups.map((f) => `<li><b>${tag(f.kind)}.</b> ${esc(f.text)}</li>`).join('')}</ul>`
      : '',
    ...sections.map((s) => `<h2>${esc(s.title)}</h2>${table(s.rows)}`),
    files.length
      ? `<h2>Files</h2><ul>${files.map((f) => `<li><a href="${esc(f.link)}">${esc(f.name)}</a> (${esc(f.category)})</li>`).join('')}</ul>`
      : '',
    '</body></html>',
  ].join('');
}

/**
 * Builds the client's Drive folder: the files sorted into one subfolder per
 * category, and a Google Doc of the answers linking to them. Never throws:
 * a failure is written to the profile row for the team to see.
 */
async function syncToGoogle(id: string) {
  const { data: p, error } = await db.from('client_profiles').select('*').eq('id', id).single();
  if (error || !p) throw error ?? new Error('profile not found');
  const { data: fileRows } = await db.from('client_files').select('*').eq('profile_id', id);
  const files = (fileRows ?? []) as { path: string; name: string; category: string }[];

  try {
    const token = await googleToken();
    const folder = await createFolder(token, `${p.business_name} (${String(p.submitted_at).slice(0, 10)})`, G.parent);

    const subfolders = new Map<string, string>();
    const copied: { name: string; category: string; link: string }[] = [];
    for (const f of files) {
      let sub = subfolders.get(f.category);
      if (!sub) {
        sub = (await createFolder(token, f.category, folder.id)).id;
        subfolders.set(f.category, sub);
      }
      const item = await copyToDrive(token, f, sub);
      copied.push({ name: f.name, category: f.category, link: item.webViewLink });
    }

    // Older form builds sent no summary: fall back to the raw answers so the Doc is never empty.
    const summary: SummarySection[] = p.summary?.length
      ? p.summary
      : [{ title: 'Answers', rows: Object.entries(p.answers as Record<string, unknown>).map(([label, value]) => ({ label, value: String(value) })) }];
    const doc = await createDoc(token, `Client profile: ${p.business_name}`, profileHtml(p, p.followups ?? [], summary, copied), folder.id);

    await db
      .from('client_profiles')
      .update({ status: 'synced', google_doc_url: doc.webViewLink, drive_folder_url: folder.webViewLink, synced_at: new Date().toISOString(), sync_error: null })
      .eq('id', id);
    await notify(p.business_name, p.contact_name, p.contact_email, files.length, doc.webViewLink);
  } catch (e) {
    console.error('google sync failed', e);
    await db.from('client_profiles').update({ status: 'sync_failed', sync_error: String(e).slice(0, 500) }).eq('id', id);
    await notify(p.business_name, p.contact_name, p.contact_email, files.length);
  }
}

/* ------------------------------------------------------------------- handler */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method' });

  const origin = req.headers.get('origin') ?? '';
  if (origin && !ORIGINS.includes(origin)) return json(req, 403, { error: 'origin' });

  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) throw new Fail(413, 'too_large');
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Fail(400, 'bad_json');
    }

    const ip = clientIp(req);
    const ipHash = await sha256(`asri-client-profile:${ip}`);

    // Housekeeping: the rate-limit table only needs the last day.
    db.from('client_profile_hits').delete().lt('at', new Date(Date.now() - 86_400_000).toISOString()).then(() => {});

    if (body.action === 'upload-url') return await uploadUrl(req, body, ipHash);
    if (body.action === 'submit') return await submit(req, body, ipHash, ip);
    throw new Fail(400, 'bad_action');
  } catch (e) {
    if (e instanceof Fail) return json(req, e.status, { error: e.code });
    console.error('client-profile error', e);
    return json(req, 500, { error: 'server' });
  }
});
