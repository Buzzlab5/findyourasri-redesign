'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { countries, countryByIso, flag, joinPhone, localeCountry, splitPhone, type Country } from '@/lib/client-profile/countries';

/**
 * A phone number with a searchable country picker. The value stays one string,
 * "+62 812 3456 789", so it reads the same in the database and in the team's
 * documents. The picker starts on the country of the visitor's browser
 * language (Indonesia when that is unknown) and can be searched by country
 * name, calling code or ISO code.
 */
export default function PhoneField({
  id,
  label,
  help,
  placeholder,
  value,
  error,
  sub,
  onChange,
}: {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  placeholder?: string;
  value: string;
  error?: string;
  sub?: boolean;
  onChange: (value: string) => void;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<Country | null>(null);
  const [locale, setLocale] = useState<Country | undefined>();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  // The browser's language is read after hydration so the static HTML is the same for everyone.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the browser language
    setLocale(localeCountry());
  }, []);

  const parsed = splitPhone(value);
  const country = picked ?? parsed.country ?? locale ?? countryByIso('ID')!;
  const national = parsed.national;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q) || c.iso.toLowerCase() === q);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function choose(next: Country) {
    setPicked(next);
    setOpen(false);
    setQuery('');
    onChange(joinPhone(next, national));
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      root.current?.querySelector<HTMLElement>('.cp-phone__code')?.focus();
    }
  }

  const errId = `err_${id}`;
  return (
    <div className={`field cp-field${sub ? ' cp-sub' : ''}${error ? ' is-invalid' : ''}`} data-field={id}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {help ? <span className="cp-help">{help}</span> : null}
      <div className="cp-phone" ref={root}>
        <div className="cp-phone__row">
          <button
            type="button"
            className="cp-phone__code"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-label={`Country code: ${country.name}, +${country.dial}. Change`}
            onClick={() => {
              setOpen((o) => !o);
              setActive(Math.max(0, countries.findIndex((c) => c.iso === country.iso)));
              setQuery('');
            }}
          >
            <span aria-hidden="true">{flag(country.iso)}</span>
            <span>+{country.dial}</span>
            <span className="cp-phone__caret" aria-hidden="true" />
          </button>
          <input
            id={id}
            name={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={placeholder}
            value={national}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            onChange={(e) => onChange(joinPhone(country, e.target.value.replace(/[^\d\s\-()]/g, '')))}
          />
        </div>

        {open ? (
          <div className="cp-phone__pop">
            <input
              ref={search}
              type="search"
              className="cp-phone__search"
              placeholder="Search country or code"
              aria-label="Search countries"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={matches[active] ? `${uid}-${matches[active].iso}` : undefined}
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
            />
            <ul id={listId} role="listbox" ref={list} className="cp-phone__list" aria-label="Countries">
              {matches.length ? (
                matches.map((c, i) => (
                  <li
                    key={c.iso}
                    id={`${uid}-${c.iso}`}
                    role="option"
                    aria-selected={c.iso === country.iso}
                    className={i === active ? 'is-active' : undefined}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => choose(c)}
                  >
                    <span aria-hidden="true">{flag(c.iso)}</span>
                    <span className="cp-phone__name">{c.name}</span>
                    <span className="cp-phone__dial">+{c.dial}</span>
                  </li>
                ))
              ) : (
                <li className="cp-phone__none" role="presentation">
                  No country matches that.
                </li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {error ? (
        <span className="field__error" id={errId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
