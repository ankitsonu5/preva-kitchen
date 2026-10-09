import { describe, expect, it } from 'vitest';
import { dropEmptyFaqItems } from '../../src/lib/blog-faq.js';

const item = (q, a) =>
  `<details class="preva-faq-item" name="g"><summary class="preva-faq-question">${q}</summary>${a === null ? '' : `<div class="preva-faq-answer"><p>${a}</p></div>`}</details>`;
const block = (...items) => `<div class="preva-faq-block"><h3 class="preva-faq-title">FAQ</h3>${items.join('')}</div>`;

describe('blog FAQ rendering', () => {
  it('leaves complete FAQ blocks untouched', () => {
    const html = block(item('Q1', 'A1'), item('Q2', 'A2'));
    expect(dropEmptyFaqItems(html)).toBe(html);
  });

  it('drops an item that has no answer markup', () => {
    const out = dropEmptyFaqItems(block(item('Q1', 'A1'), item('Q2', null)));
    expect(out).toContain('Q1');
    expect(out).not.toContain('Q2');
  });

  it('drops an item whose answer is blank', () => {
    const out = dropEmptyFaqItems(block(item('Q1', 'A1'), item('Q2', '&nbsp; <br>')));
    expect(out).not.toContain('Q2');
  });

  it('removes the whole block when no item has an answer', () => {
    expect(dropEmptyFaqItems(`${block(item('Q1', null))}<p>after</p>`)).toBe('<p>after</p>');
  });

  it('ignores posts without a FAQ block', () => {
    expect(dropEmptyFaqItems('<p>plain</p>')).toBe('<p>plain</p>');
  });
});
