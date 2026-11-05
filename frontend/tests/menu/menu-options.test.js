import { describe, expect, it } from 'vitest';
import {
  getMenuCustomization,
  getMenuDisplayName,
  getMenuOptionImage,
  getMenuPriceCents,
  getMenuProductName,
  getMenuRouteOption,
  getMenuRouteProduct,
  getProductMenuPriceCents,
  isRemovedMenuProduct,
  normalizeMenuSelection,
  withoutRemovedMenuProducts,
  withOfficialMenuAdditions
} from '../../src/lib/menu-options.js';
import { FALLBACK_PRODUCTS } from '../../src/data/fallbackMenu.js';

function priceFor(slug, requested) {
  const config = getMenuCustomization(slug);
  return getMenuPriceCents(config, normalizeMenuSelection(config, requested));
}

describe('official PREVA menu options', () => {
  it('cleans display-only dish prefixes while preserving the official PREVA Burger name', () => {
    expect(getMenuDisplayName('Preva Wings')).toBe('Wings');
    expect(getMenuDisplayName('Preva Wings Chilli')).toBe('Wings Chilli');
    expect(getMenuDisplayName('Preva Quesadillas')).toBe('Quesadillas');
    expect(getMenuDisplayName('PREVA Burger')).toBe('PREVA Burger');
    expect(getMenuDisplayName('PREVA Burger Deluxe')).toBe('PREVA Burger Deluxe');
    expect(getMenuDisplayName('Preva Double Smash Burger', 'preva-double-smash-burger')).toBe('PREVA Burger');
  });

  it('removes display prefixes from every fallback menu item without changing official burger branding', () => {
    for (const product of FALLBACK_PRODUCTS) {
      const displayName = getMenuDisplayName(product.name, product.slug);
      if (product.slug === 'preva-double-smash-burger') {
        expect(displayName).toBe('PREVA Burger');
      } else {
        expect(displayName).not.toMatch(/^preva\s+/i);
      }
    }
  });

  it('adds only seasoning charges to each original Wings product price', () => {
    expect(priceFor('preva-wings')).toBe(1650);
    expect(priceFor('preva-wings', { seasoning: 'cajun' })).toBe(1750);
    expect(priceFor('jerk', { seasoning: 'garlic-herb' })).toBe(1750);
    expect(priceFor('preva-wings', { flavor: 'garlic-parmesan' })).toBe(1650);
  });

  it('supports quesadilla, burger, and pasta options', () => {
    expect(getMenuCustomization('preva-quesadillas').showSelector).toBe(false);
    expect(getMenuCustomization('rasta-pasta').showSelector).not.toBe(false);
    expect(getMenuCustomization('rasta-pasta').groups[0].label).toBe('PROTEIN OPTIONS');
    expect(getMenuCustomization('shrimp-tacos').showSelector).toBe(false);
    expect(priceFor('preva-quesadillas', { style: 'steak' })).toBe(1900);
    expect(getMenuRouteOption('preva-quesadillas', 'chicken-quesadillas').id).toBe('chicken');
    expect(getMenuRouteOption('preva-quesadillas', 'chicken-quesadillas').queryKey).toBe('style');
    expect(getMenuRouteOption('preva-quesadillas', 'steak-quesadilla').id).toBe('steak');
    expect(getMenuProductName(getMenuCustomization('preva-quesadillas'), { style: 'steak' }))
      .toBe('Steak Quesadilla');
    expect(getMenuCustomization('eggrolls')).toBeNull();
    expect(isRemovedMenuProduct('eggrolls')).toBe(true);
    expect(priceFor('preva-double-smash-burger', { upgrade: 'deluxe' })).toBe(1448);
    expect(priceFor('rasta-pasta', { protein: 'chicken' })).toBe(2700);
    expect(priceFor('rasta-pasta', { protein: 'lobster' })).toBe(3400);
  });

  it('uses the persisted Rasta Pasta protein options without changing its base price', () => {
    const config = getMenuCustomization('rasta-pasta', {
      slug: 'rasta-pasta',
      price: '$22.00',
      priceCents: 2200,
      optionGroups: [{
        id: 'protein',
        label: 'PROTEIN OPTIONS',
        type: 'radio',
        required: false,
        maxPick: 1,
        options: [
          { id: 'none', label: 'No Extra Protein', priceCents: 0 },
          { id: 'chicken', label: 'Chicken', priceCents: 500 },
          { id: 'shrimp', label: 'Shrimp', priceCents: 600 },
          { id: 'steak', label: 'Steak', priceCents: 700 },
          { id: 'lobster', label: 'Lobster', priceCents: 1200 }
        ]
      }]
    });

    expect(config.groups[0].label).toBe('PROTEIN OPTIONS');
    expect(config.groups[0].defaultOptionId).toBe('none');
    expect(getMenuPriceCents(config, { protein: 'none' })).toBe(2200);
    expect(getMenuPriceCents(config, { protein: 'chicken' })).toBe(2700);
    expect(getMenuPriceCents(config, { protein: 'shrimp' })).toBe(2800);
    expect(getMenuPriceCents(config, { protein: 'steak' })).toBe(2900);
    expect(getMenuPriceCents(config, { protein: 'lobster' })).toBe(3400);
  });

  it('uses item-specific option groups and prices for any menu item', () => {
    const config = getMenuCustomization('mac-and-cheese', {
      slug: 'mac-and-cheese',
      name: 'Mac & Cheese',
      priceCents: 600,
      optionGroups: [{
        id: 'protein',
        label: 'Protein options',
        defaultOptionId: 'chicken',
        options: [
          { id: 'chicken', label: 'Chicken', priceCents: 400 },
          { id: 'shrimp', label: 'Shrimp', priceCents: 600 }
        ]
      }]
    });

    expect(config.groups[0].queryKey).toBe('protein');
    expect(config.groups[0].defaultOptionId).toBe('chicken');
    expect(getMenuPriceCents(config, normalizeMenuSelection(config))).toBe(1000);
    expect(getMenuPriceCents(config, { protein: 'shrimp' })).toBe(1200);
  });

  it('uses saved prices, names, and descriptions for quesadilla and taco products', () => {
    const products = [
      { id: '6a859bee6c90cff4f8b2ba70', slug: 'chicken-quesadillas', name: 'Updated Chicken Quesadillas', priceCents: 1950 },
      { id: '6a859bee6c90cff4f8b2ba71', slug: 'steak-quesadilla', name: 'Updated Steak Quesadilla', priceCents: 2050 },
      { id: '6a859bee6c90cff4f8b2ba72', slug: 'shrimp-quesadillas', name: 'Updated Shrimp Quesadillas', priceCents: 2050 },
      { id: '6ae334c67f9aec7e22426183', slug: 'lobster-quesadillas', name: 'Updated Lobster Quesadillas', priceCents: 2350 },
      { id: '6a859bee6c90cff4f8b2ba77', slug: 'chicken-tacos', name: 'Updated Chicken Tacos', priceCents: 1600 },
      { id: '6a859bee6c90cff4f8b2ba76', slug: 'steak-tacos', name: 'Updated Steak Tacos', priceCents: 1750 },
      { id: '6a859bee6c90cff4f8b2ba75', slug: 'shrimp-tacos', name: 'Updated Shrimp Tacos', priceCents: 1600 },
      { id: '6ae475b7fc46d34cf75d20cd', slug: 'ground-beef-tacos', name: 'Updated Ground Beef Tacos', priceCents: 1600 }
    ];

    for (const product of products) {
      product.price = `$${(product.priceCents / 100).toFixed(2)}`;
      const config = getMenuCustomization(product.slug, product);
      const selection = normalizeMenuSelection(config, {}, product.slug);

      expect(getMenuProductName(config, selection)).toBe(product.name);
      expect(getProductMenuPriceCents(product)).toBe(product.priceCents);
    }

    const updatedDescription = {
      ...products[0],
      description: 'Updated chicken quesadilla description.'
    };
    expect(getMenuCustomization(updatedDescription.slug, updatedDescription).description)
      .toBe(updatedDescription.description);
    expect(getProductMenuPriceCents({
      id: '6a859bee6c90cff4f8b2ba71',
      slug: 'lamb-chops',
      price: '$33.50',
      priceCents: 3350
    })).toBe(3350);
  });

  it('uses saved names, descriptions, and prices for customized products', () => {
    const pasta = {
      id: '6a859bee6c90cff4f8b2ba80',
      slug: 'rasta-pasta',
      name: 'Updated Pasta Name',
      description: 'Updated pasta description.',
      price: '$24.00',
      priceCents: 2400
    };
    const config = getMenuCustomization(pasta.slug, pasta);
    const selection = normalizeMenuSelection(config, {}, pasta.slug);

    expect(getMenuProductName(config, selection)).toBe(pasta.name);
    expect(config.description).toBe(pasta.description);
    expect(getMenuPriceCents(config, selection)).toBe(pasta.priceCents);

    const burger = {
      id: '6a859bee6c90cff4f8b2ba81',
      slug: 'preva-double-smash-burger',
      name: 'Updated Burger Name',
      description: 'Updated burger description.',
      price: '$12.49',
      priceCents: 1249
    };
    const burgerConfig = getMenuCustomization(burger.slug, burger);
    const burgerSelection = normalizeMenuSelection(burgerConfig, {}, burger.slug);

    expect(getMenuProductName(burgerConfig, burgerSelection)).toBe(burger.name);
    expect(burgerConfig.description).toBe(burger.description);
    expect(getMenuPriceCents(burgerConfig, burgerSelection)).toBe(burger.priceCents);
  });

  it('respects an explicitly empty Rasta Pasta option group list', () => {
    expect(getMenuCustomization('rasta-pasta', {
      slug: 'rasta-pasta',
      priceCents: 2200,
      optionGroups: []
    })).toBeNull();
  });

  it('creates direct variant routes for every menu selector option', () => {
    const products = [
      ['preva-quesadillas', 'preva-quesadilla'],
      ['preva-double-smash-burger', 'preva-double-smash-burger'],
      ['rasta-pasta', 'rasta-pasta'],
      ['chicken-tacos', 'tacos']
    ];

    for (const [productSlug, routeSlug] of products) {
      const config = getMenuCustomization(productSlug);
      expect(config.routeBasePath).toBe(`/menu/${routeSlug}`);
      for (const group of config.groups) {
        for (const option of group.options) {
          expect(option.routeSlug).toBeTruthy();
          expect(getMenuRouteProduct(routeSlug)).toBe(productSlug);
          expect(getMenuRouteOption(productSlug, option.routeSlug).queryKey).toBe(group.queryKey);
        }
        expect(getMenuRouteProduct('preva-wings')).toBeNull();
        expect(getMenuCustomization('preva-wings').routeBasePath).toBeUndefined();
      }
    }
  });

  it('applies shared selectors and variant names to canonical product pages', () => {
    expect(normalizeMenuSelection(getMenuCustomization('preva-quesadillas'), {}, 'steak-quesadilla'))
      .toEqual({ style: 'steak' });
    expect(getMenuProductName(getMenuCustomization('chicken-quesadillas'), { style: 'chicken' }))
      .toBe('Chicken Quesadilla');
    expect(getMenuCustomization('honey-hot')).not.toBe(getMenuCustomization('preva-wings'));
    expect(normalizeMenuSelection(getMenuCustomization('preva-wings'), { seasoning: 'cajun' }, 'preva-wings'))
      .toEqual({ seasoning: 'cajun' });

    const tacoStyles = [
      ['chicken-tacos', 'chicken', 'Chicken Tacos'],
      ['steak-tacos', 'steak', 'Steak Tacos'],
      ['shrimp-tacos', 'shrimp', 'Shrimp Tacos'],
      ['ground-beef-tacos', 'ground-beef', 'Ground Beef Tacos']
    ];
    for (const [slug, style, productName] of tacoStyles) {
      const config = getMenuCustomization(slug);
      const selection = normalizeMenuSelection(config, {}, slug);
      expect(selection).toEqual({ style });
      expect(getMenuProductName(config, selection)).toBe(productName);
      expect(getMenuPriceCents(config, selection)).toBe(1600);
    }
  });

  it('uses official prices for every choice in shared selectors', () => {
    expect(['chicken', 'steak', 'shrimp', 'lobster'].map((style) =>
      priceFor('preva-quesadillas', { style })
    )).toEqual([1800, 1900, 1900, 2200]);
    expect(['preva-wings', 'preva-wings-chilli', 'honey-hot', 'buffalo', 'bbq', 'garlic-parmesan', 'lemon-pepper', 'jerk']
      .map((slug) => getProductMenuPriceCents(FALLBACK_PRODUCTS.find((product) => product.slug === slug))))
      .toEqual(Array(8).fill(1650));
    expect(['cajun', 'lemon-pepper', 'jerk-seasoning', 'garlic-herb', 'preva-blend'].map((seasoning) =>
      priceFor('preva-wings', { seasoning })
    )).toEqual([1750, 1750, 1750, 1750, 1750]);
    expect(['none', 'chicken', 'shrimp', 'steak', 'lobster'].map((protein) =>
      priceFor('rasta-pasta', { protein })
    )).toEqual([2200, 2700, 2800, 2900, 3400]);
  });

  it('updates selected names and verified variant images', () => {
    const wingConfig = getMenuCustomization('preva-wings');
    expect(getMenuProductName(wingConfig, { seasoning: 'cajun' })).toBeNull();
    expect(getMenuProductName(getMenuCustomization('rasta-pasta'), { protein: 'chicken' }))
      .toBe('Rasta Pasta with Chicken');
    expect(getMenuProductName(getMenuCustomization('preva-double-smash-burger'), { upgrade: 'deluxe' }))
      .toBe('PREVA Burger Deluxe');

    const tacoConfig = getMenuCustomization('ground-beef-tacos');
    expect(getMenuOptionImage(
      { slug: 'ground-beef-tacos' },
      tacoConfig,
      { style: 'ground-beef' }
    )).toBe('/asset/prevaclub/wp-content/uploads/2026/08/PREVA-Taco.webp');
  });

  it('uses the original Wings product identity and permits only seasoning customization', () => {
    const wingProducts = FALLBACK_PRODUCTS.filter((product) => /wing/i.test(product.category));
    expect(wingProducts.length).toBeGreaterThan(0);
    expect(wingProducts.find((product) => product.slug === 'preva-wings').optionGroups).toBeUndefined();
    for (const product of wingProducts) {
      const config = getMenuCustomization(product.slug, product);
      expect(config.groups).toHaveLength(1);
      expect(config.groups[0].queryKey).toBe('seasoning');
      expect(config.groups[0].options.map((option) => [option.label, option.priceCents])).toEqual([
        ['No Extra Seasoning', 0],
        ['Cajun', 100],
        ['Lemon Pepper', 100],
        ['Jerk Seasoning', 100],
        ['Garlic Herb', 100],
        ['House PREVA Blend', 100]
      ]);
      expect(getMenuProductName(config, { seasoning: 'cajun' })).toBeNull();
      expect(getMenuOptionImage(product, config, { seasoning: 'cajun' })).toBe(product.image);
      expect(getMenuPriceCents(config, { seasoning: 'cajun' })).toBe(product.priceCents + 100);
    }

    const extraWings = { slug: 'limited-wings', category: 'Wings', name: 'Limited Wings', image: '/limited.webp', priceCents: 2135 };
    const config = getMenuCustomization(extraWings.slug, extraWings);
    expect(getMenuPriceCents(config, { seasoning: 'none' })).toBe(2135);
    expect(getMenuPriceCents(config, { seasoning: 'preva-blend' })).toBe(2235);
    expect(getMenuOptionImage(extraWings, config, { seasoning: 'preva-blend' })).toBe(extraWings.image);
  });

  it('uses official standalone prices and safely defaults invalid query values', () => {
    expect(getProductMenuPriceCents({ slug: 'shrimp-tacos', priceCents: 1750 })).toBe(1600);
    expect(getProductMenuPriceCents({ slug: 'lamb-chops', priceCents: 3350 })).toBe(3200);
    expect(normalizeMenuSelection(getMenuCustomization('rasta-pasta'), { protein: 'invalid' }))
      .toEqual({ protein: 'none' });
  });

  it('keeps official bite, entrée, and side prices simple and selector-free', () => {
    const officialPrices = {
      'preva-catfish': 1400,
      'catfish-bites': 1400,
      'preva-lobster': 2000,
      'lobster-bites': 2000,
      'preva-steak-bites': 1800,
      'steak-bites': 1800,
      'lamb-chops': 3200,
      'preva-lamb-chops': 3200,
      'preva-mac-and-cheese': 600,
      'mac-and-cheese': 600,
      'collard-greens-turkey': 600,
      'collard-greens-with-turkey-meat': 600,
      yams: 600,
      'preva-yams': 600,
      fries: 500
    };
    for (const [slug, priceCents] of Object.entries(officialPrices)) {
      expect(getMenuCustomization(slug)).toBeNull();
      expect(getProductMenuPriceCents({ slug })).toBe(priceCents);
    }
  });

  it('adds newly listed official products without duplicating CMS records', () => {
    const merged = withOfficialMenuAdditions([
      ...FALLBACK_PRODUCTS,
      { slug: 'eggrolls', name: 'Eggrolls' }
    ]);
    expect(merged.filter((product) => product.slug === 'eggrolls')).toHaveLength(0);
    expect(merged.filter((product) => product.slug === 'ground-beef-tacos')).toHaveLength(1);
    expect(withoutRemovedMenuProducts([
      { slug: 'preva-wings' },
      { slug: 'eggrolls' }
    ])).toEqual([{ slug: 'preva-wings' }]);
  });
});
