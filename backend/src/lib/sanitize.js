import sanitizeHtml from 'sanitize-html';

/* ══════════════════════════════════════════════════════════════════════════
   Every value that arrives from a browser passes through here before it goes
   anywhere near the database or a template.
   ══════════════════════════════════════════════════════════════════════════ */

export const cleanText = (value, max = 500) => String(value ?? '').trim().slice(0, max);

export const cleanEmail = (value) => cleanText(value, 254).toLowerCase();

export const cleanBool = (value, fallback = false) => {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
};

export const cleanInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

/** Only http(s) links and telephone numbers may be stored as ordering URLs. */
export const cleanOrderUrl = (value) => {
  const url = cleanText(value, 2000);
  return /^(https?:\/\/|tel:\+?[0-9]{7,15}$)/i.test(url) ? url : '';
};

export const normalizeOrderAvailability = (value) => {
  const availability = cleanText(value, 20).toUpperCase();
  return ['PICKUP', 'DELIVERY', 'BOTH'].includes(availability) ? availability : 'BOTH';
};

/**
 * Rich text written in the admin is rendered with dangerouslySetInnerHTML on
 * the public site, so it is sanitised on the way in rather than on the way out.
 * Sanitising on write means a stored payload can never be rendered raw by a
 * template that forgets to escape it.
 */
export const publicHtml = (value) =>
  sanitizeHtml(value || '', {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'video', 'source', 'iframe', 'figure', 'figcaption'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'id', 'style'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      video: ['src', 'controls', 'poster', 'width', 'height'],
      source: ['src', 'type'],
      iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center|justify)$/]
      }
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}) }
      })
    }
  });

/* ══════════════════════════════════════════════════════════════════════════
   Money
   ─────────────────────────────────────────────────────────────────────────
   Every amount in the shop is an integer number of cents. 0.1 + 0.2 is
   0.30000000000000004 in JavaScript; on one order that is invisible, across a
   few thousand it becomes a reconciliation problem that takes a day to trace.
   ══════════════════════════════════════════════════════════════════════════ */

export function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

/** Parse "12.99", "$12.99" or 12.99 into 1299. */
export function parseMoney(input) {
  if (typeof input === 'number') return Math.round(input * 100);
  const cleaned = String(input ?? '').replace(/[^0-9.-]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Tax is rounded once at the order level, not per line — per-line rounding
 *  drifts a cent or two on larger orders and stops matching Stripe. */
export function taxOn(subtotalCents, rate) {
  return Math.round(subtotalCents * (rate || 0));
}
