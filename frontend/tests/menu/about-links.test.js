import { describe, expect, it } from 'vitest';
import { splitAboutLinks } from '../../src/lib/dish-detail-content.js';

describe('About copy dish links', () => {
  it('turns [label](/menu/slug) markers into links and keeps the surrounding text', () => {
    expect(splitAboutLinks('Pair it with [Preva Yams](/menu/yams) and [Preva Wings](/menu/preva-wings).')).toEqual([
      { text: 'Pair it with ' },
      { text: 'Preva Yams', href: '/menu/yams' },
      { text: ' and ' },
      { text: 'Preva Wings', href: '/menu/preva-wings' },
      { text: '.' }
    ]);
  });

  it('leaves plain paragraphs untouched', () => {
    expect(splitAboutLinks('No links here.')).toEqual([{ text: 'No links here.' }]);
  });

  it('only links internal dish paths', () => {
    const external = 'See [this](https://example.com) or [that](/admin).';
    expect(splitAboutLinks(external)).toEqual([{ text: external }]);
  });
});
