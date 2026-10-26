/**
 * The back end of /client-profile/ and /admin/. The site is a static export, so
 * it has no server of its own: the form and the admin page call this function,
 * which is the only thing that touches the client_* tables and the
 * client-brand-assets bucket.
 *
 * Actions, all POST with a JSON body. Public (the client's form):
 *   upload-url  { action, draftId, name, size }
 *               -> { path, signedUrl, apikey }   (the browser PUTs the file there)
 *   submit      { action, draftId, answers, followups, files, source, website, turnstile }
 *               -> { ok: true, ref }
 *   config      { action } -> { url, anonKey }   (what the admin page needs to sign in)
 * Admin only (Authorization: Bearer <access token of a signed-in admin>):
 *   admin-list  { action } -> { profiles }
 *   admin-get   { action, id } -> { profile, files }   (files carry a download link for an hour)
 *
 * Deploy without JWT verification, because the client's browser sends no key:
 *   supabase functions deploy client-profile --no-verify-jwt
 * The admin actions check the token themselves and then the ADMIN_EMAILS list.
 * Abuse of the public actions is handled here: origin allow-list, per-IP rate
 * limits, a honeypot, an extension allow-list, a size cap, and Cloudflare
 * Turnstile when TURNSTILE_SECRET_KEY is set.
 *
 * Secrets (Edge Functions > Secrets, or supabase secrets set ...):
 *   ADMIN_EMAILS          comma-separated emails allowed into /admin/. Empty means nobody.
 *   ALLOWED_ORIGINS       comma-separated; defaults to the live site and localhost
 *   TURNSTILE_SECRET_KEY  optional: turns on the Turnstile check on submit
 *   NOTIFY_WEBHOOK_URL    optional: Slack-compatible incoming webhook, posted to when a profile arrives
 *   ADMIN_URL             optional: the /admin/ address, added to that message as a link
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

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
      // Which upload question it was added under, so the admin page can show it in place.
      field: KEY.test(str(f.field, 60)) ? str(f.field, 60) : null,
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
    consent: true,
    source,
  });
  if (profileError) throw profileError;

  if (fileRows.length) {
    let { error: filesError } = await db.from('client_files').insert(fileRows);
    if (filesError && /field/i.test(filesError.message ?? '')) {
      // The `field` column has not been added yet (run the SQL for it): save without it rather than fail the client.
      ({ error: filesError } = await db.from('client_files').insert(fileRows.map(({ field: _field, ...rest }) => rest)));
    }
    if (filesError) {
      await db.from('client_profiles').delete().eq('id', draftId);
      throw filesError;
    }
  }

  await notify(draftId, businessName, contactName, contactEmail, fileRows.length).catch((e) => console.error('notify failed', e));
  return json(req, 200, { ok: true, ref: refFor(draftId) });
}

const refFor = (id: string) => `ASRI-${id.slice(0, 8).toUpperCase()}`;

async function notify(id: string, business: string, contact: string, email: string, files: number) {
  const url = Deno.env.get('NOTIFY_WEBHOOK_URL');
  if (!url) return;
  const admin = Deno.env.get('ADMIN_URL');
  const link = admin ? ` ${admin.replace(/\/+$/, '')}/#${id}` : '';
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `New client profile: ${business}. ${contact} (${email}), ${files} file${files === 1 ? '' : 's'}.${link}`,
    }),
  });
}

/* --------------------------------------------------------------------- admin */

const ADMINS = (Deno.env.get('ADMIN_EMAILS') ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// A token that checked out is remembered for a few minutes (or until it expires), so the admin page's next
// requests skip the round trip to the sign-in service. The list of admin emails is still checked every time.
const verified = new Map<string, { email: string; until: number }>();

function tokenExpiry(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/** Who is calling: the signed-in person behind the token, and only if they are on the admin list. */
async function requireAdmin(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Fail(401, 'sign_in');
  if (!ADMINS.length) throw new Fail(403, 'admin_not_configured');

  let email = verified.get(token)?.until ?? 0 > Date.now() ? verified.get(token)!.email : '';
  if (!email) {
    const { data, error } = await db.auth.getUser(token);
    email = data?.user?.email?.toLowerCase() ?? '';
    if (error || !email) throw new Fail(401, 'sign_in');
    if (verified.size > 50) verified.clear();
    verified.set(token, { email, until: Math.min(Date.now() + 5 * 60_000, tokenExpiry(token) || 0) });
  }
  if (!ADMINS.includes(email)) throw new Fail(403, 'not_admin');
  return email;
}

async function adminList(req: Request) {
  // The token check and the read run together: a refused caller is rejected before anything is returned.
  const [, { data, error }] = await Promise.all([
    requireAdmin(req),
    db
      .from('client_profiles')
      .select('id,business_name,contact_name,contact_email,country,sector,services,budget,status,submitted_at,client_files(count)')
      .order('submitted_at', { ascending: false })
      .limit(500),
  ]);
  if (error) throw error;
  return json(req, 200, { profiles: data });
}

const IMAGE = /\.(png|jpe?g|webp|gif)$/i;

async function adminGet(req: Request, body: Record<string, unknown>) {
  const id = str(body.id, 40);
  if (!UUID.test(id)) {
    await requireAdmin(req);
    throw new Fail(400, 'bad_id');
  }
  const [, profileRes, filesRes] = await Promise.all([
    requireAdmin(req),
    db.from('client_profiles').select('*').eq('id', id).maybeSingle(),
    db.from('client_files').select('*').eq('profile_id', id).order('created_at'),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) throw new Fail(404, 'not_found');
  const files = ((filesRes.data ?? []) as { path: string; name: string; size: number; category: string; field?: string | null; created_at: string }[]).map(
    ({ path, name, size, category, field, created_at }) => ({ path, name, size, category, field: field ?? null, created_at }),
  );

  // One link per file to open it, and for images a second, small one for the thumbnail, so the page does not
  // download every full-size photo just to draw a 56 pixel square. If resizing is unavailable the page uses the
  // full link instead.
  const bucket = db.storage.from(BUCKET);
  const [urls, thumbs] = await Promise.all([
    files.length ? bucket.createSignedUrls(files.map((f) => f.path), 3600).then((r) => r.data ?? []) : Promise.resolve([]),
    Promise.all(
      files.map((f) =>
        IMAGE.test(f.name)
          ? bucket
              .createSignedUrl(f.path, 3600, { transform: { width: 160, height: 160, resize: 'cover', quality: 70 } })
              .then((r) => r.data?.signedUrl ?? null)
              .catch(() => null)
          : Promise.resolve(null),
      ),
    ),
  ]);
  const byPath = new Map(urls.map((u: { path: string; signedUrl: string }) => [u.path, u.signedUrl]));
  return json(req, 200, {
    profile: profileRes.data,
    files: files.map((f, i) => ({ ...f, url: byPath.get(f.path) ?? null, thumb: thumbs[i] })),
  });
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

    if (body.action === 'upload-url' || body.action === 'submit') {
      // Housekeeping: the rate-limit table only needs the last day. Not run for the admin page, which should stay quick.
      db.from('client_profile_hits').delete().lt('at', new Date(Date.now() - 86_400_000).toISOString()).then(() => {});
    }

    if (body.action === 'upload-url') return await uploadUrl(req, body, ipHash);
    if (body.action === 'submit') return await submit(req, body, ipHash, ip);
    if (body.action === 'config') {
      // Both are public by design: the project address and its anon key, which the admin page signs in with.
      return json(req, 200, { url: Deno.env.get('SUPABASE_URL') ?? '', anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' });
    }
    if (body.action === 'admin-list') return await adminList(req);
    if (body.action === 'admin-get') return await adminGet(req, body);
    throw new Fail(400, 'bad_action');
  } catch (e) {
    if (e instanceof Fail) return json(req, e.status, { error: e.code });
    console.error('client-profile error', e);
    return json(req, 500, { error: 'server' });
  }
});
