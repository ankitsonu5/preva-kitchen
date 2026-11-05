import { describe, expect, it } from 'vitest';
import {
  getDefaultAboutParagraphs,
  getDefaultFaqs,
  getDishPairingNames,
  splitAboutLinks
} from '../../src/lib/dish-detail-content.js';

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

  it('uses admin-saved pairings in generated about copy and FAQs', () => {
    const dish = {
      name: 'Test Dish',
      category: 'Sides',
      pairings: ['Kitchen Special', 'Preva Wings']
    };

    expect(getDishPairingNames(dish)).toEqual(dish.pairings);
    expect(getDefaultAboutParagraphs(dish).at(-1)).toContain('Kitchen Special, Preva Wings');
    expect(getDefaultFaqs(dish).at(-1).a).toContain('Kitchen Special, Preva Wings');
  });
});
