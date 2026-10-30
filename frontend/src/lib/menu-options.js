import { FALLBACK_PRODUCTS, OFFICIAL_MENU_ADDITIONS } from '@/data/fallbackMenu';

const WING_IMAGE_DIRECTORY = '/asset/prevaclub/wp-content/uploads/2026/08';

export const MENU_CUSTOMIZATIONS = {
  'preva-wings': {
    basePriceCents: 1650,
    groups: [
      {
        queryKey: 'seasoning',
        label: 'Add seasoning',
        defaultOptionId: 'none',
        priceDisplay: 'addon',
        options: [
          { id: 'none', label: 'No Extra Seasoning', priceCents: 0 },
          { id: 'cajun', label: 'Cajun', priceCents: 100 },
          { id: 'lemon-pepper', label: 'Lemon Pepper', priceCents: 100 },
          { id: 'jerk-seasoning', label: 'Jerk Seasoning', priceCents: 100 },
          { id: 'garlic-herb', label: 'Garlic Herb', priceCents: 100 },
          { id: 'preva-blend', label: 'House PREVA Blend', priceCents: 100 }
        ]
      }
    ],
    isWings: true
  },
  'preva-quesadillas': {
    basePriceCents: 1800,
    productName: 'Preva Quesadillas',
    description: 'Melted cheese and peppers grilled in a flour tortilla. Served with house dipping sauce.',
    routeBasePath: '/menu/preva-quesadilla',
    showSelector: false,
    groups: [
      {
        queryKey: 'style',
        label: 'Choose your style',
        defaultOptionId: 'chicken',
        priceDisplay: 'total',
        options: [
          { id: 'chicken', routeSlug: 'chicken-quesadillas', productName: 'Chicken Quesadilla', label: 'Chicken Quesadilla', priceCents: 0, image: `${WING_IMAGE_DIRECTORY}/PrevaQuesadilla-768x768.webp` },
          { id: 'steak', routeSlug: 'steak-quesadilla', productName: 'Steak Quesadilla', label: 'Steak Quesadilla', priceCents: 100, image: `${WING_IMAGE_DIRECTORY}/Steak-Quesadilla.webp` },
          { id: 'shrimp', routeSlug: 'shrimp-quesadillas', productName: 'Shrimp Quesadilla', label: 'Shrimp Quesadilla', priceCents: 100, image: `${WING_IMAGE_DIRECTORY}/Shrimp-Quesadillas.webp` },
          {
            id: 'lobster',
            routeSlug: 'lobster-quesadillas',
            productName: 'Lobster Quesadilla',
            label: 'Lobster Quesadilla',
            priceCents: 400,
            image: `${WING_IMAGE_DIRECTORY}/Quesadilla-Menu-Generic.jpg`,
            imageAlt: 'PREVA quesadilla served with salsa and greens'
          }
        ]
      }
    ]
  },
  'preva-double-smash-burger': {
    basePriceCents: 1149,
    productName: 'PREVA Burger',
    description: 'Double beef patties with American cheese and thousand island dressing.',
    routeBasePath: '/menu/preva-double-smash-burger',
    groups: [
      {
        queryKey: 'upgrade',
        label: 'Make it deluxe',
        defaultOptionId: 'classic',
        priceDisplay: 'addon',
        options: [
          { id: 'classic', routeSlug: 'classic', productName: 'PREVA Burger', label: 'PREVA Burger', priceCents: 0 },
          { id: 'deluxe', routeSlug: 'deluxe', productName: 'PREVA Burger Deluxe', label: 'Deluxe', priceCents: 299 }
        ]
      }
    ]
  },
  'rasta-pasta': {
    basePriceCents: 2200,
    productName: 'Rasta Pasta',
    description: 'Creamy Caribbean-style pasta with bell peppers and house jerk seasoning.',
    routeBasePath: '/menu/rasta-pasta',
    groups: [
      {
        queryKey: 'protein',
        label: 'PROTEIN OPTIONS',
        defaultOptionId: 'none',
        priceDisplay: 'addon',
        options: [
          { id: 'none', routeSlug: 'no-extra-protein', label: 'No Extra Protein', priceCents: 0 },
          { id: 'chicken', routeSlug: 'chicken', label: 'Chicken', productNameSuffix: 'with Chicken', priceCents: 500 },
          { id: 'shrimp', routeSlug: 'shrimp', label: 'Shrimp', productNameSuffix: 'with Shrimp', priceCents: 600 },
          { id: 'steak', routeSlug: 'steak', label: 'Steak', productNameSuffix: 'with Steak', priceCents: 700 },
          { id: 'lobster', routeSlug: 'lobster', label: 'Lobster', productNameSuffix: 'with Lobster', priceCents: 1200 }
        ]
      }
    ]
  },
  tacos: {
    basePriceCents: 1600,
    productName: 'Tacos',
    description: 'Seasoned tacos topped with fresh slaw and house sauce.',
    routeBasePath: '/menu/tacos',
    routeProductSlug: 'chicken-tacos',
    showSelector: false,
    groups: [
      {
        queryKey: 'style',
        label: 'Choose your style',
        defaultOptionId: 'chicken',
        priceDisplay: 'total',
        options: [
          { id: 'chicken', routeSlug: 'chicken-tacos', productName: 'Chicken Tacos', label: 'Chicken Tacos', priceCents: 0, image: `${WING_IMAGE_DIRECTORY}/Chicken-Tacos-1.webp` },
          { id: 'steak', routeSlug: 'steak-tacos', productName: 'Steak Tacos', label: 'Steak Tacos', priceCents: 0, image: `${WING_IMAGE_DIRECTORY}/SteakTacos-768x768.webp` },
          { id: 'shrimp', routeSlug: 'shrimp-tacos', productName: 'Shrimp Tacos', label: 'Shrimp Tacos', priceCents: 0, image: `${WING_IMAGE_DIRECTORY}/ShrimpTacos-768x768.webp` },
          { id: 'ground-beef', routeSlug: 'ground-beef-tacos', productName: 'Ground Beef Tacos', label: 'Ground Beef Tacos', priceCents: 0, image: `${WING_IMAGE_DIRECTORY}/PREVA-Taco.webp` }
        ]
      }
    ]
  }
};

const MENU_CUSTOMIZATION_ALIASES = {
  'chicken-quesadillas': 'preva-quesadillas',
  'steak-quesadilla': 'preva-quesadillas',
  'shrimp-quesadillas': 'preva-quesadillas',
  'lobster-quesadillas': 'preva-quesadillas',
  'chicken-tacos': 'tacos',
  'steak-tacos': 'tacos',
  'shrimp-tacos': 'tacos',
  'ground-beef-tacos': 'tacos'
};

export const MENU_PRICE_OVERRIDES = {
  'preva-catfish': 1400,
  'catfish-bites': 1400,
  'preva-lobster': 2000,
  'lobster-bites': 2000,
  'preva-steak-bites': 1800,
  'steak-bites': 1800,
  'honey-hot': 1500,
  buffalo: 1500,
  bbq: 1500,
  'sweet-chili': 1500,
  'preva-wings-chilli': 1500,
  'garlic-parmesan': 1600,
  'lemon-pepper': 1500,
  jerk: 1600,
  'chicken-quesadillas': 1800,
  'steak-quesadilla': 1900,
  'shrimp-quesadillas': 1900,
  'lobster-quesadillas': 2200,
  'shrimp-tacos': 1600,
  'steak-tacos': 1600,
  'chicken-tacos': 1600,
  'ground-beef-tacos': 1600,
  'lamb-chops': 3200,
  'preva-lamb-chops': 3200,
  'mac-and-cheese': 600,
  'preva-mac-and-cheese': 600,
  'collard-greens-turkey': 600,
  'collard-greens-with-turkey-meat': 600,
  yams: 600,
  'preva-yams': 600,
  fries: 500
};

export const MENU_IMAGE_UNAVAILABLE = new Set();
const REMOVED_MENU_PRODUCT_SLUGS = new Set(['eggrolls']);
const WING_PRODUCT_SLUGS = new Set([
  'preva-wings',
  'preva-wings-chilli',
  'honey-hot',
  'buffalo',
  'bbq',
  'garlic-parmesan',
  'lemon-pepper',
  'jerk'
]);
const WING_SEASONING_GROUP = MENU_CUSTOMIZATIONS['preva-wings'].groups[0];

export function isRemovedMenuProduct(slug) {
  return REMOVED_MENU_PRODUCT_SLUGS.has(slug);
}

export function getMenuDisplayName(name, slug) {
  if (typeof name !== 'string') return name;
  if (slug === 'preva-double-smash-burger') return 'PREVA Burger';
  if (/^preva burger(?:\s|$)/i.test(name)) return name;
  return name.replace(/^preva\s+/i, '');
}

export function withoutRemovedMenuProducts(products) {
  return Array.isArray(products)
    ? products.filter((product) => !isRemovedMenuProduct(product?.slug))
    : [];
}

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

function productPriceCents(product, useListedPrice = false) {
  const listedPrice = () => {
    if (Number.isInteger(product?.priceCents)) return product.priceCents;
    const parsedPrice = Number.parseFloat(String(product?.price || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(parsedPrice) ? Math.round(parsedPrice * 100) : null;
  };
  if (useListedPrice) {
    const price = listedPrice();
    if (price !== null) return price;
    const fallbackPrice = FALLBACK_PRODUCTS.find((item) => item.slug === product?.slug)?.priceCents;
    if (fallbackPrice !== undefined) return fallbackPrice;
  }
  if (MENU_PRICE_OVERRIDES[product?.slug] !== undefined) return MENU_PRICE_OVERRIDES[product.slug];
  const price = listedPrice();
  if (price !== null) return price;
  return FALLBACK_PRODUCTS.find((item) => item.slug === product?.slug)?.priceCents || 0;
}

export function getMenuCustomization(slug, product = null) {
  if (WING_PRODUCT_SLUGS.has(slug) || /wing/i.test(product?.category || '')) {
    return {
      basePriceCents: productPriceCents({ ...product, slug }, true),
      groups: [WING_SEASONING_GROUP],
      isWings: true
    };
  }
  if (slug === 'rasta-pasta' && Array.isArray(product?.optionGroups) && product.optionGroups.length) {
    const defaults = MENU_CUSTOMIZATIONS['rasta-pasta'];
    const fallbackOptions = new Map(defaults.groups[0].options.map((option) => [option.id, option]));
    return {
      ...defaults,
      basePriceCents: productPriceCents({ ...product, slug }, true),
      groups: product.optionGroups.map((group) => ({
        queryKey: group.id,
        label: group.label,
        defaultOptionId: group.options.find((option) => option.id === 'none')?.id || group.options[0]?.id,
        priceDisplay: 'addon',
        options: group.options.map((option) => ({
          ...fallbackOptions.get(option.id),
          id: option.id,
          label: option.label,
          priceCents: Number(option.priceCents) || 0
        }))
      }))
    };
  }
  return MENU_CUSTOMIZATIONS[MENU_CUSTOMIZATION_ALIASES[slug] || slug] || null;
}

export function getMenuProductName(config, selection) {
  if (config?.isWings) return null;
  let productName = config?.productName || null;
  const suffixes = [];
  for (const group of config?.groups || []) {
    const selectedId = selection?.[group.queryKey] || group.defaultOptionId;
    const option = group.options.find((item) => item.id === selectedId);
    if (option?.productName) productName = option.productName;
    if (option?.productNameSuffix) suffixes.push(option.productNameSuffix);
  }
  return productName ? getMenuDisplayName([productName, ...suffixes].join(' ')) : null;
}

export function getMenuRouteOption(slug, routeSlug) {
  const config = getMenuCustomization(slug);
  return config?.groups
    .flatMap((group) => group.options.map((option) => ({ ...option, queryKey: group.queryKey })))
    .find((option) => option.routeSlug === routeSlug) || null;
}

export function getMenuRouteProduct(routeSlug) {
  const entry = Object.entries(MENU_CUSTOMIZATIONS)
    .find(([, config]) => config.routeBasePath?.split('/').at(-1) === routeSlug);
  return entry ? entry[1].routeProductSlug || entry[0] : null;
}

export function normalizeMenuSelection(config, requested = {}, productSlug) {
  return Object.fromEntries(config.groups.map((group) => {
    const raw = firstValue(requested[group.queryKey]);
    const option = group.options.find((item) => item.id === raw);
    const productOption = group.options.find((item) =>
      item.routeSlug === productSlug || item.routeAliases?.includes(productSlug)
    );
    return [group.queryKey, option?.id || productOption?.id || group.defaultOptionId];
  }));
}

export function getMenuPriceCents(config, selection) {
  return config.basePriceCents + config.groups.reduce((total, group) => {
    const selectedId = selection[group.queryKey] || group.defaultOptionId;
    const selectedOption = group.options.find((option) => option.id === selectedId);
    return total + (selectedOption?.priceCents || 0);
  }, 0);
}

export function getProductMenuPriceCents(product) {
  const config = getMenuCustomization(product?.slug, product);
  if (config) {
    return getMenuPriceCents(config, normalizeMenuSelection(config, {}, product.slug));
  }
  return productPriceCents(product);
}

export function getMenuProductDescription(product) {
  return getMenuCustomization(product?.slug, product)?.description || product?.description || '';
}

export function getMenuOptionImage(product, config, selection, fallbackImage) {
  if (MENU_IMAGE_UNAVAILABLE.has(product?.slug) && !product?.image) return null;
  const selectedOptions = (config?.groups || []).map((group) => {
    const selectedId = selection[group.queryKey] || group.defaultOptionId;
    return group.options.find((item) => item.id === selectedId);
  }).filter(Boolean);
  // A selected style that is a different dish (e.g. Steak Tacos picked on
  // Chicken Tacos) shows that dish's photo.
  const otherDish = selectedOptions.find((option) => option.image && option.routeSlug && option.routeSlug !== product?.slug);
  if (otherDish) return otherDish.image;
  // Otherwise match the menu card: the admin image always wins.
  if (product?.image) return product.image;
  if (config?.image) return config.image;
  const optionWithImage = selectedOptions.find((option) => option.image);
  if (optionWithImage) return optionWithImage.image;
  return fallbackImage || null;
}

export function formatMenuOptionPrice(config, group, option, selection) {
  if (group.priceDisplay === 'total') {
    return `$${(getMenuPriceCents(config, { ...selection, [group.queryKey]: option.id }) / 100).toFixed(2)}`;
  }
  const amount = (option.priceCents || 0) / 100;
  return amount > 0 ? `+$${amount.toFixed(2)}` : `$${amount.toFixed(2)}`;
}

export function withOfficialMenuAdditions(products) {
  const list = withoutRemovedMenuProducts(products);
  const present = new Set(list.map((product) => product?.slug).filter(Boolean));
  for (const product of OFFICIAL_MENU_ADDITIONS) {
    if (!present.has(product.slug)) list.push(product);
  }
  return list;
}
