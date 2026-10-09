import { describe, expect, it } from 'vitest';
import { FALLBACK_PRODUCTS } from '../../src/data/fallbackMenu.js';
import { KITCHEN_MENU_ITEMS, getDeliveryLinks } from '../../src/lib/kitchen-menu-data.js';
import { withoutLegacyDuplicates } from '../../src/lib/legacy-dish-slugs.js';

const ITEM_LINK_SLUGS = [
  'preva-wings', 'preva-wings-chilli', 'honey-hot', 'buffalo', 'bbq',
  'garlic-parmesan', 'lemon-pepper', 'jerk',
  'preva-double-smash-burger', 'chicken-quesadillas', 'steak-quesadilla',
  'shrimp-quesadillas', 'shrimp-tacos', 'steak-tacos', 'chicken-tacos',
  'preva-catfish', 'preva-lobster', 'lobster-bites', 'preva-steak-bites',
  'steak-bites', 'veggie-pasta', 'rasta-pasta', 'preva-lamb-chops',
  'lamb-chops', 'preva-mac-and-cheese', 'mac-and-cheese', 'preva-yams', 'yams'
];

describe('canonical menu delivery links', () => {
  it('keeps both static menu sources aligned with all 34 menu items', () => {
    expect(KITCHEN_MENU_ITEMS).toHaveLength(34);
    expect(withoutLegacyDuplicates(FALLBACK_PRODUCTS)).toHaveLength(34);
    expect(FALLBACK_PRODUCTS.map((item) => item.slug).sort()).toEqual(
      KITCHEN_MENU_ITEMS.map((item) => item.slug).sort()
    );
  });

  it.each(ITEM_LINK_SLUGS)('opens %s in an Uber Eats item quick view', (slug) => {
    const url = new URL(getDeliveryLinks(slug).ubereats);
    expect(url.searchParams.get('mod')).toBe('quickView');
    expect(url.searchParams.get('modctx')).toContain('%22itemUuid%22');
  });

  it('maps wing flavour pages to the shared Preva Wings customizer', () => {
    const getContext = (slug) => new URL(getDeliveryLinks(slug).ubereats).searchParams.get('modctx');
    expect(getContext('honey-hot')).toBe(getContext('preva-wings'));
    expect(getContext('jerk')).toBe(getContext('preva-wings'));
  });

  it('uses Grubhub menu-item links where the official source exposes them', () => {
    expect(getDeliveryLinks('preva-wings').grubhub).toContain('/menu-item/355696049736');
    expect(getDeliveryLinks('lobster-bites').grubhub).toContain('/menu-item/355289983616');
  });
});
