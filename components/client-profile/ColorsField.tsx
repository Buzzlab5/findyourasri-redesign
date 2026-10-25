'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Brand colours: any number of swatches, each picked with the browser's own
 * colour picker (which includes an eyedropper in Chrome and Edge) or typed as a
 * HEX code. The answer stays one string, "#0C0A08, #C9A063", so it reads the
 * same in the database and in the team's documents.
 */

const MAX = 8;
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalize(value: string): string | null {
  const m = HEX.exec(value.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${h.toUpperCase()}`;
}

const parse = (value: string) => value.split(/[,\s]+/).flatMap((token) => normalize(token) ?? []);

export default function ColorsField({
  id,
  label,
  help,
  value,
  sub,
  onChange,
}: {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  value: string;
  sub?: boolean;
  onChange: (value: string) => void;
}) {
  const colors = parse(value);
  const [fresh, setFresh] = useState(-1);
  const emit = (list: string[]) => onChange(list.join(', '));

  return (
    <fieldset className={`cp-q${sub ? ' cp-sub' : ''}`} data-field={id}>
      <legend className="cp-q__label">{label}</legend>
      {help ? <span className="cp-help">{help}</span> : null}
      <div className="cp-colors">
        {colors.map((color, i) => (
          <ColorRow
            key={i}
            color={color}
            index={i}
            autoOpen={i === fresh}
            onChange={(next) => emit(colors.map((c, j) => (j === i ? next : c)))}
            onRemove={() => emit(colors.filter((_, j) => j !== i))}
          />
        ))}
        {colors.length < MAX ? (
          <button
            type="button"
            className="pill pill--outline cp-colors__add"
            onClick={() => {
              setFresh(colors.length);
              emit([...colors, '#C9A063']);
            }}
          >
            {colors.length ? 'Add another colour' : 'Add a colour'}
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}

function ColorRow({
  color,
  index,
  autoOpen,
  onChange,
  onRemove,
}: {
  color: string;
  index: number;
  autoOpen: boolean;
  onChange: (color: string) => void;
  onRemove: () => void;
}) {
  // While the HEX box is being typed in, it shows what was typed, not the cleaned-up value.
  const [draft, setDraft] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  // A colour that was just added opens its picker straight away.
  useEffect(() => {
    if (!autoOpen) return;
    try {
      picker.current?.showPicker();
    } catch {
      // Without a recent click the browser refuses; the swatch is still there to press.
    }
  }, [autoOpen]);

  return (
    <div className="cp-color">
      <input ref={picker} type="color" className="cp-color__swatch" aria-label={`Colour ${index + 1}`} value={color.toLowerCase()} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      <input
        type="text"
        className="cp-color__hex"
        aria-label={`HEX code for colour ${index + 1}`}
        spellCheck={false}
        autoComplete="off"
        maxLength={7}
        value={draft ?? color}
        onChange={(e) => {
          setDraft(e.target.value);
          const next = normalize(e.target.value);
          if (next) onChange(next);
        }}
        onBlur={() => setDraft(null)}
      />
      <button type="button" className="cp-kit__remove" onClick={onRemove} aria-label={`Remove colour ${index + 1}`}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
