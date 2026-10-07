// Local, curated photo per dish slug. Used by the menu grid, the dish page and
// the dish page's share image, so a dish never shows a generic or wrong photo.
export const DISH_LOCAL_MAP = {
  'rasta-pasta': '/asset/home-reference/signature-dishes/Rasta-Pasta.webp',
  'veggie-pasta': '/asset/prevaclub/wp-content/uploads/2026/08/Veggie-Pasta-768x614.webp',
  'preva-lamb': '/asset/home-reference/signature-dishes/prevaLamb-600x600.webp',
  'preva-lamb-chops': '/asset/home-reference/signature-dishes/prevaLamb-600x600.webp',
  'lamb-chops': '/asset/home-reference/signature-dishes/prevaLamb-600x600.webp',
  'catfish-bites': '/asset/home-reference/signature-dishes/PrevaCatfish-600x600.webp',
  'preva-catfish': '/asset/home-reference/signature-dishes/PrevaCatfish-600x600.webp',
  'preva-steak-bites': '/asset/home-reference/signature-dishes/PrevaSteakBites-600x600.webp',
  'steak-bites': '/asset/home-reference/signature-dishes/PrevaSteakBites-600x600.webp',
  'preva-lobster': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaLobster-768x768.webp',
  'lobster-bites': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaLobster-768x768.webp',
  'preva-burger': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaBurger-768x768.webp',
  'preva-wings': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'preva-wings-chilli': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWingsChilli-768x768.webp',
  'preva-mac': '/asset/home-reference/signature-dishes/PrevaMac-600x600.webp',
  'preva-mac-and-cheese': '/asset/home-reference/signature-dishes/PrevaMac-600x600.webp',
  'mac-and-cheese': '/asset/home-reference/signature-dishes/PrevaMac-600x600.webp',
  'preva-quesadillas': '/asset/home-reference/signature-dishes/PrevaQuesadilla-600x600.webp',
  'shrimp-tacos': '/asset/home-reference/signature-dishes/ShrimpTacos-600x600.webp'
};

export const FALLBACK_DISH_IMAGE = '/asset/home-reference/signature-dishes/Rasta-Pasta.webp';

export function dishImage(product) {
  return DISH_LOCAL_MAP[product?.slug] || product?.image || FALLBACK_DISH_IMAGE;
}
