'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { leadSectors, sectors, type LeadSector } from '@/lib/content';
import { site } from '@/lib/site';
import { readUtm, track, UTM_KEYS } from '@/lib/track';
import { Arrow } from '@/components/Arrow';

/**
 * The one Netlify form, named "contact", with identical fields everywhere so
 * the deploy detects a single form (public/__forms.html declares it).
 *
 * With JavaScript it posts with fetch, pushes generate_lead on a 200 and moves
 * on to /thank-you/. Without it, the browser posts the same fields and Netlify
 * sends the visitor to the same page.
 */

type Status = 'idle' | 'sending' | 'failed';
type Errors = Partial<Record<'name' | 'email', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ?sector= may carry a page slug (operators) or a lead value (operator). */
function toLead(value: string | null): LeadSector | '' {
  if (!value) return '';
  const hit = sectors.find((s) => s.slug === value || s.lead === value);
  return hit ? hit.lead : '';
}

export default function ContactForm({
  sector = '',
  service = '',
  vertical = '',
  lockSector = false,
  emailLabel = 'Work email',
  companyLabel = 'Company or organisation',
}: {
  sector?: LeadSector | '';
  service?: string;
  vertical?: string;
  /** Hidden pages report their own sector, so the field is hidden there. */
  lockSector?: boolean;
  emailLabel?: string;
  companyLabel?: string;
}) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [chosen, setChosen] = useState<LeadSector | ''>(sector);
  const [serviceValue, setServiceValue] = useState(service);
  const [page, setPage] = useState('');
  const [utm, setUtm] = useState<ReturnType<typeof readUtm>>({});
  const started = useRef(false);

  // Presets from the query string, and the campaign values from the landing
  // page. Read after hydration so the static HTML stays the same for everyone.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- one-off sync from the URL */
    if (!lockSector && !sector) setChosen(toLead(query.get('sector')));
    if (!service && query.get('service')) setServiceValue(query.get('service')!);
    setPage(window.location.pathname);
    setUtm(readUtm());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lockSector, sector, service]);

  const onFocus = () => {
    if (started.current) return;
    started.current = true;
    track('form_start', { form_id: 'contact' });
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const next: Errors = {};
    if (!String(data.get('name') ?? '').trim()) next.name = 'Enter your name.';
    if (!EMAIL.test(String(data.get('email') ?? '').trim()))
      next.email = 'Enter a work email so we can reply.';
    setErrors(next);
    if (Object.keys(next).length) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setStatus('sending');
    try {
      const body = new URLSearchParams(data as unknown as Record<string, string>).toString();
      const res = await fetch('/__forms.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error(String(res.status));

      track('generate_lead', {
        form_id: 'contact',
        sector: String(data.get('sector') ?? ''),
        lead_source: utm.utm_source ?? 'direct',
        vertical: vertical || undefined,
      });
      router.push('/thank-you/');
    } catch {
      setStatus('failed');
    }
  }

  const invalid = (key: keyof Errors) => (errors[key] ? true : undefined);

  return (
    <form
      id="form"
      className="form"
      name="contact"
      method="POST"
      action="/thank-you/"
      data-netlify="true"
      netlify-honeypot="bot-field"
      noValidate={hydrated}
      onSubmit={onSubmit}
      onFocus={onFocus}
    >
      <input type="hidden" name="form-name" value="contact" />
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="service" value={serviceValue} />
      <input type="hidden" name="vertical" value={vertical} />
      {UTM_KEYS.map((key) => (
        <input key={key} type="hidden" name={key} value={utm[key] ?? ''} />
      ))}
      <p className="form__trap" aria-hidden="true">
        <label>
          Leave this empty <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      <div className="form__row">
        <Field label="Name" error={errors.name}>
          <input name="name" type="text" autoComplete="name" required aria-invalid={invalid('name')} />
        </Field>
        <Field label={emailLabel} error={errors.email}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={invalid('email')}
          />
        </Field>
      </div>
      <Field label={companyLabel}>
        <input name="company" type="text" autoComplete="organization" />
      </Field>
      {lockSector ? (
        <input type="hidden" name="sector" value={chosen} />
      ) : (
        <Field label="Sector">
          <select
            name="sector"
            value={chosen}
            onChange={(e) => setChosen(e.target.value as LeadSector | '')}
          >
            <option value="">Choose one</option>
            {leadSectors.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Message" optional>
        <textarea name="message" rows={4} placeholder="The number that matters most this quarter" />
      </Field>

      <div className="form__send">
        <button
          type="submit"
          className="pill pill--ink"
          disabled={status === 'sending'}
          aria-live="polite"
        >
          {status === 'sending' ? 'Sending…' : 'Send'}
          {status !== 'sending' && (
            <span className="pill__arrow" aria-hidden="true">
              <Arrow />
            </span>
          )}
        </button>
      </div>
      <p className="form__fine">
        We use these details to reply to you. <Link href="/privacy/">Privacy notice.</Link>
      </p>

      {status === 'failed' && (
        <p className="form__failed" role="alert">
          That did not send. Try again, or write to{' '}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  error,
  optional,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactElement;
}) {
  return (
    <label className={`field${error ? ' is-invalid' : ''}`}>
      <span className="field__label">
        {label}
        {optional && <span className="field__optional">optional</span>}
      </span>
      {children}
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
