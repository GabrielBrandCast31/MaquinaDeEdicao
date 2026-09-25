import {DEFAULT_STYLE, STYLE_SCHEMA} from './schemas.mjs';

const isColor = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** Deep-merges `value` onto `fallback` following the schema, clamping numbers and validating enums/colors. */
const fit = (schema, value, fallback) => {
  if (schema.anyOf) {
    if (value === null) return null;
    const alt = schema.anyOf.find((s) => s.type !== 'null');
    return alt.enum.includes(value) ? value : fallback;
  }
  switch (schema.type) {
    case 'object': {
      const out = {};
      for (const [k, s] of Object.entries(schema.properties)) out[k] = fit(s, value?.[k], fallback?.[k]);
      return out;
    }
    case 'array':
      return Array.isArray(value) ? value.filter((x) => typeof x === 'string') : fallback ?? [];
    case 'number': {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      const m = /\[(-?[0-9.]+)\.\.(-?[0-9.]+)\]$/.exec(schema.description ?? '');
      return m ? Math.min(Number(m[2]), Math.max(Number(m[1]), n)) : n;
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : fallback;
    case 'string':
      if (schema.enum) return schema.enum.includes(value) ? value : fallback;
      if (/hex #RRGGBB/.test(schema.description ?? '')) return isColor(value) ? value.toUpperCase() : fallback;
      return typeof value === 'string' ? value : fallback;
    default:
      return value ?? fallback;
  }
};

export const sanitizeStyle = (style) => fit(STYLE_SCHEMA, style ?? {}, DEFAULT_STYLE);

export const sanitizePlan = (plan, wordCount) => {
  const idx = (n) => Number.isInteger(n) && n >= 0 && n < wordCount;
  const p = plan ?? {};
  return {
    subject: {fx: clamp01(p.subject?.fx, 0.5), fy: clamp01(p.subject?.fy, 0.38)},
    dropWords: (p.dropWords ?? []).filter((d) => idx(d.from) && idx(d.to) && d.to >= d.from),
    emphasis: (p.emphasis ?? []).filter((e) => idx(e.w)),
    callouts: (p.callouts ?? []).filter((c) => idx(c.w) && c.text).map((c) => ({...c, durationSec: Math.min(5, Math.max(0.6, Number(c.durationSec) || 1.5))})),
    sfx: (p.sfx ?? []).filter((s) => idx(s.w)),
    notes: String(p.notes ?? ''),
  };
};

const clamp01 = (v, d) => (Number.isFinite(Number(v)) ? Math.min(1, Math.max(0, Number(v))) : d);
