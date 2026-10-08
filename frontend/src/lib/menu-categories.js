// Shared menu-category helpers: used by the /menu filter bar, the home category
// cards, dish breadcrumbs, the sitemap and the /menu/category/[slug] landing pages.

// High-definition circular category images matching live Preva Kitchen menu
export const CATEGORY_IMAGES = {
  'All': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'Preva Wings': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'Preva Burger': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaBurger-768x768.webp',
  'Quesadillas': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaQuesadilla-768x768.webp',
  'Tacos': '/asset/prevaclub/wp-content/uploads/2026/08/ShrimpTacos-768x768.webp',
  'Preva Bites': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaCatfish-768x768.webp',
  'Pasta': '/asset/home-reference/signature-dishes/Rasta-Pasta.webp',
  'Salads': '/asset/prevaclub/wp-content/uploads/2026/08/house-salad.webp',
  'Entrées': '/asset/prevaclub/wp-content/uploads/2026/08/prevaLamb-768x768.webp',
  'Entrees': '/asset/prevaclub/wp-content/uploads/2026/08/prevaLamb-768x768.webp',
  'Sides': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaMac-768x768.webp',
  'Dessert': '/asset/prevaclub/wp-content/uploads/2026/08/red-wine-poached-pear.webp'
};

export const CANONICAL_CATEGORIES = [
  'Preva Wings',
  'Preva Burger',
  'Quesadillas',
  'Tacos',
  'Preva Bites',
  'Pasta',
  'Salads',
  'Entrées',
  'Sides',
  'Dessert'
];

export function normalizeCategoryName(name) {
  if (!name) return 'Other';
  const clean = String(name).trim();
  if (/^entr[eé]es$/i.test(clean)) return 'Entrées';
  if (/^wings$/i.test(clean)) return 'Preva Wings';
  if (/^burger(s)?$/i.test(clean)) return 'Preva Burger';
  if (/^bites$/i.test(clean)) return 'Preva Bites';
  if (/^pasta$/i.test(clean)) return 'Pasta';
  if (/^salads?$/i.test(clean)) return 'Salads';
  if (/^desserts?$/i.test(clean)) return 'Dessert';
  if (/^sides?$/i.test(clean)) return 'Sides';
  if (/^quesadillas?$/i.test(clean)) return 'Quesadillas';
  if (/^tacos?$/i.test(clean)) return 'Tacos';
  return clean;
}

// "Preva Wings" -> "wings", "Entrées" -> "entrees". A leading "Preva " is dropped
// so URLs carry the search keyword (/menu/category/wings), not the brand.
export function categorySlug(name) {
  return normalizeCategoryName(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^preva\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function categoryPath(name) {
  return `/menu/category/${categorySlug(name)}`;
}

// Page copy per canonical category. `noun` completes "our ___" in sentences;
// `heading` is the H1; `blurb` is the opening paragraph. Items on the page are
// listed from live menu data, so no dish names or prices are hard-coded here.
export const CATEGORY_COPY = {
  'Preva Wings': {
    heading: 'Wings in Redford Township, MI',
    noun: 'wings',
    blurb: 'Crispy jumbo wings tossed in house sauces, made fresh to order at Preva Kitchen. Pick a flavor, add a side, and order for pickup or delivery, or enjoy them at our table.'
  },
  'Preva Burger': {
    heading: 'Burgers in Redford Township, MI',
    noun: 'burgers',
    blurb: 'Burgers from the Preva Kitchen menu in Redford Township, available for pickup, delivery and dine-in.'
  },
  'Quesadillas': {
    heading: 'Quesadillas in Redford Township, MI',
    noun: 'quesadillas',
    blurb: 'Golden grilled tortillas layered with melted cheese and house seasoning. Choose your filling and order for pickup or delivery in Redford Township.'
  },
  'Tacos': {
    heading: 'Tacos in Redford Township, MI',
    noun: 'tacos',
    blurb: 'Warm tortillas filled with seasoned proteins, fresh slaw and house sauce. Order tacos for pickup or delivery from Preva Kitchen.'
  },
  'Preva Bites': {
    heading: 'Seafood and Steak Bites in Redford Township, MI',
    noun: 'bites',
    blurb: 'Crispy, tender and seasoned the Preva way. These shareable bites are made fresh to order for pickup, delivery or the table.'
  },
  'Pasta': {
    heading: 'Pasta in Redford Township, MI',
    noun: 'pasta dishes',
    blurb: 'Caribbean-style pasta with house seasoning, made fresh in our Redford Township kitchen. Choose your protein and order for pickup or delivery.'
  },
  'Salads': {
    heading: 'Salads in Redford Township, MI',
    noun: 'salads',
    blurb: 'Salads from the Preva Kitchen menu in Redford Township, available for pickup, delivery and dine-in.'
  },
  'Entrées': {
    heading: 'Entrées in Redford Township, MI',
    noun: 'entrées',
    blurb: 'Chef-driven plates for a full dinner from the Preva Kitchen menu. Dine in, or order for pickup and delivery in Redford Township.'
  },
  'Sides': {
    heading: 'Sides in Redford Township, MI',
    noun: 'sides',
    blurb: 'Comfort-food sides to round out any order from the Preva Kitchen menu in Redford Township.'
  },
  'Dessert': {
    heading: 'Desserts in Redford Township, MI',
    noun: 'desserts',
    blurb: 'Finish your meal with a dessert from Preva Kitchen in Redford Township.'
  }
};

export function categoryCopy(name) {
  const key = normalizeCategoryName(name);
  return (
    CATEGORY_COPY[key] || {
      heading: `${key} in Redford Township, MI`,
      noun: key.toLowerCase(),
      blurb: `${key} from the Preva Kitchen menu in Redford Township, Michigan, available for pickup, delivery and dine-in.`
    }
  );
}
