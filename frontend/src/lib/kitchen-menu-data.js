// Complete database of Preva Kitchen Menu items with authentic high-res images, categories, dietary tags, and delivery links.

export const KITCHEN_MENU_ITEMS = [
  {
    name: "Preva Wings",
    slug: "preva-wings",
    category: "Preva Wings",
    price: "$16.50",
    description: "PREVA's signature crispy jumbo wings, tossed in your choice of house sauce — honey hot, buffalo, BBQ, sweet chili, garlic parmesan, lemon pepper or jerk.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp",
    tags: ["chef special", "crispy", "contains gluten"],
    allergens: ["gluten"],
    pairings: ["Fries", "Preva Quesadillas", "House Salad"]
  },
  {
    name: "Preva Wings Chilli",
    slug: "preva-wings-chilli",
    category: "Preva Wings",
    price: "$16.50",
    description: "Wings coated in sweet chili sauce with a mild, bright finish.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaWingsChilli-768x768.webp",
    tags: ["sweet & spicy", "crispy"],
    allergens: ["gluten"],
    pairings: ["Fries", "Rice & Peas"]
  },
  {
    name: "Honey Hot",
    slug: "honey-hot",
    category: "Preva Wings",
    price: "$16.50",
    description: "Crispy jumbo wings tossed in hot honey — sweet heat with a sticky glaze.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/hot_honey_wings.webp",
    tags: ["spicy", "hot honey", "popular"],
    allergens: ["gluten"],
    pairings: ["Mac & Cheese", "Fries"]
  },
  {
    name: "Buffalo",
    slug: "buffalo",
    category: "Preva Wings",
    price: "$16.50",
    description: "Classic buffalo wings in tangy cayenne sauce, served with ranch.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/buffalo_wings.webp",
    tags: ["spicy", "tangy"],
    allergens: ["gluten", "dairy"],
    pairings: ["Fries", "House Salad"]
  },
  {
    name: "BBQ",
    slug: "bbq",
    category: "Preva Wings",
    price: "$16.50",
    description: "Smoky barbecue wings, slow-glazed and finished on the grill.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/bbq_wings_preva.webp",
    tags: ["smoky", "glazed"],
    allergens: ["gluten"],
    pairings: ["Mac & Cheese", "Collard Greens with Turkey Meat"]
  },
  {
    name: "Garlic Parmesan",
    slug: "garlic-parmesan",
    category: "Preva Wings",
    price: "$16.50",
    description: "Wings tossed in garlic butter and finished with shaved parmesan.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Garlic-Parmesan.webp",
    tags: ["savory", "contains dairy"],
    allergens: ["dairy", "gluten"],
    pairings: ["Fries", "Preva Quesadillas"]
  },
  {
    name: "Lemon Pepper",
    slug: "lemon-pepper",
    category: "Preva Wings",
    price: "$16.50",
    description: "Crisp wings seasoned with cracked black pepper and fresh lemon zest.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Lemon-Pepper.webp",
    tags: ["zesty", "crispy"],
    allergens: ["gluten"],
    pairings: ["Fries", "Fried Plantains"]
  },
  {
    name: "Jerk",
    slug: "jerk",
    category: "Preva Wings",
    price: "$16.50",
    description: "Caribbean jerk wings marinated in house spice and grilled hot.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Jerk-wings.webp",
    tags: ["spicy", "caribbean", "jerk spice"],
    allergens: ["gluten"],
    pairings: ["Rice & Peas", "Fried Plantains"]
  },
  {
    name: "Preva Double Smash Burger",
    slug: "preva-double-smash-burger",
    category: "Preva Burger",
    price: "$11.49",
    description: "Two smash patties, two slices of American cheese, thousand island, served with fries.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaDoubleSmashBurger-768x768.webp",
    tags: ["smash burger", "popular", "served with fries"],
    allergens: ["gluten", "dairy"],
    pairings: ["Mac & Cheese", "Buffalo Wings"]
  },
  {
    name: "Preva Quesadillas",
    slug: "preva-quesadillas",
    category: "Quesadillas",
    price: "$17.49",
    description: "Flour tortilla grilled with melted cheese, house seasoning and your choice of chicken or beef, served with sour cream and salsa.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaQuesadilla-768x768.webp",
    tags: ["cheese", "contains dairy", "contains gluten"],
    allergens: ["gluten", "dairy"],
    pairings: ["House Salad", "Preva Wings"]
  },
  {
    name: "Chicken Quesadillas",
    slug: "chicken-quesadillas",
    category: "Quesadillas",
    price: "$17.49",
    description: "Seasoned chicken and melted cheese grilled in a flour tortilla, served with sour cream and salsa.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Chicken-Tacos.webp",
    tags: ["seasoned chicken", "contains dairy"],
    allergens: ["gluten", "dairy"],
    pairings: ["Fries", "Rice & Peas"]
  },
  {
    name: "Steak Quesadilla",
    slug: "steak-quesadilla",
    category: "Quesadillas",
    price: "$18.50",
    description: "Grilled steak, melted cheese, peppers and onions, served with sour cream and salsa.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Steak-Quesadilla.webp",
    tags: ["grilled steak", "peppers & onions"],
    allergens: ["gluten", "dairy"],
    pairings: ["House Salad", "Preva Lobster"]
  },
  {
    name: "Shrimp Quesadillas",
    slug: "shrimp-quesadillas",
    category: "Quesadillas",
    price: "$18.50",
    description: "Seasoned shrimp, melted cheese, peppers and onions, served with sour cream and salsa.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Shrimp-Quesadillas.webp",
    tags: ["seafood", "seasoned shrimp"],
    allergens: ["gluten", "dairy", "shellfish"],
    pairings: ["House Salad", "Fried Plantains"]
  },
  {
    name: "Beef Quesadillas",
    slug: "beef-quesadillas",
    category: "Quesadillas",
    price: "$16.50",
    description: "Seasoned beef and melted cheese grilled in a flour tortilla, served with sour cream and salsa.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Beef-Quesadillas.webp",
    tags: ["seasoned beef", "crispy tortilla"],
    allergens: ["gluten", "dairy"],
    pairings: ["Fries", "Preva Wings"]
  },
  {
    name: "Veggie Quesadilla",
    slug: "veggie-quesadilla",
    category: "Quesadillas",
    price: "$14.49",
    description: "Grilled peppers, onions and melted cheese in a flour tortilla, served with sour cream and salsa.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Veggie-Quesadilla.webp",
    tags: ["vegetarian", "grilled veggies"],
    allergens: ["gluten", "dairy"],
    pairings: ["House Salad", "Steamed Cabbage"]
  },
  {
    name: "Shrimp Tacos",
    slug: "shrimp-tacos",
    category: "Tacos",
    price: "$17.50",
    description: "Seasoned shrimp tacos topped with fresh slaw and house sauce.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/ShrimpTacos-768x768.webp",
    tags: ["seafood", "fresh slaw", "house sauce"],
    allergens: ["shellfish", "gluten"],
    pairings: ["Rice & Peas", "Fried Plantains"]
  },
  {
    name: "Steak Tacos",
    slug: "steak-tacos",
    category: "Tacos",
    price: "$17.50",
    description: "Seasoned steak tacos topped with fresh slaw and house sauce.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/SteakTacos-768x768.webp",
    tags: ["grilled steak", "fresh slaw"],
    allergens: ["gluten"],
    pairings: ["Fries", "Mac & Cheese"]
  },
  {
    name: "Chicken Tacos",
    slug: "chicken-tacos",
    category: "Tacos",
    price: "$16.50",
    description: "Seasoned chicken tacos topped with fresh slaw and house sauce.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Chicken-Tacos-1.webp",
    tags: ["seasoned chicken", "fresh slaw"],
    allergens: ["gluten"],
    pairings: ["Fries", "House Salad"]
  },
  {
    name: "Preva Catfish",
    slug: "preva-catfish",
    category: "Preva Bites",
    price: "$15.50",
    description: "Seasoned fried catfish bites served hot and crispy with house remoulade.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaCatfish-768x768.webp",
    tags: ["seafood", "crispy", "southern style"],
    allergens: ["fish", "gluten"],
    pairings: ["Collard Greens with Turkey Meat", "Fries", "Mac & Cheese"]
  },
  {
    name: "Preva Lobster",
    slug: "preva-lobster",
    category: "Preva Bites",
    price: "$21.50",
    description: "Tender lobster bites fried golden and served with warm clarified lemon butter.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaLobster-768x768.webp",
    tags: ["premium seafood", "butter sear", "chef special"],
    allergens: ["shellfish", "dairy", "gluten"],
    pairings: ["Rasta Pasta", "Preva Lamb Chops"]
  },
  {
    name: "Preva Steak Bites",
    slug: "preva-steak-bites",
    category: "Preva Bites",
    price: "$19.50",
    description: "Seasoned steak bites grilled to perfection and finished with garlic herb butter.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaSteakBites-768x768.webp",
    tags: ["prime steak", "garlic butter"],
    allergens: ["dairy"],
    pairings: ["Mac & Cheese", "Preva Yams"]
  },
  {
    name: "Veggie Pasta",
    slug: "veggie-pasta",
    category: "Pasta",
    price: "$16.50",
    description: "Creamy pasta with sautéed bell peppers, sweet onions, and seasonal garden vegetables.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Veggie-Pasta-768x614.webp",
    tags: ["vegetarian", "creamy", "contains dairy"],
    allergens: ["gluten", "dairy"],
    pairings: ["House Salad", "Steamed Cabbage"]
  },
  {
    name: "Rasta Pasta",
    slug: "rasta-pasta",
    category: "Pasta",
    price: "$22.00",
    description: "Creamy Caribbean-style pasta with bell peppers and house jerk seasoning. Choose your protein when you order.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Rasta-Pasta.webp",
    tags: ["spicy", "caribbean", "contains gluten", "contains dairy"],
    allergens: ["gluten", "dairy"],
    pairings: ["Preva Quesadillas", "Chicken Quesadillas", "Steak Quesadilla"]
  },
  {
    name: "House Salad",
    slug: "house-salad",
    category: "Salads",
    price: "$8.29",
    description: "Crisp mixed greens with vine-ripened tomato, red onion and cool cucumber with house vinaigrette.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/house-salad.webp",
    tags: ["fresh", "vegetarian", "gluten-free"],
    allergens: [],
    pairings: ["Preva Lamb Chops", "Preva Wings"]
  },
  {
    name: "Preva Lamb Chops",
    slug: "preva-lamb-chops",
    category: "Entrées",
    price: "$33.50",
    description: "Grilled lamb chops seasoned with PREVA house spices and served with choice of sides.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/prevaLamb-768x768.webp",
    tags: ["signature entrée", "prime lamb", "chef choice"],
    allergens: [],
    pairings: ["Mac & Cheese", "Collard Greens with Turkey Meat", "Preva Yams"]
  },
  {
    name: "Catfish Bites with Fries",
    slug: "catfish-bites-with-fries",
    category: "Entrées",
    price: "$26.50",
    description: "A full plate of seasoned crispy catfish bites served with seasoned fries and house slaw.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Catfish-Bites-with-Fries.webp",
    tags: ["platter", "crispy fish", "fries included"],
    allergens: ["fish", "gluten"],
    pairings: ["Mac & Cheese", "Collard Greens with Turkey Meat"]
  },
  {
    name: "Preva Mac and Cheese",
    slug: "preva-mac-and-cheese",
    category: "Sides",
    price: "$7.50",
    description: "Baked macaroni in a rich, five-blend artisan cheese sauce with golden crust.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaMac-768x768.webp",
    tags: ["comfort food", "five-cheese", "contains dairy"],
    allergens: ["dairy", "gluten"],
    pairings: ["Preva Lamb Chops", "Preva Wings"]
  },
  {
    name: "Collard Greens with Turkey Meat",
    slug: "collard-greens-with-turkey-meat",
    category: "Sides",
    price: "$7.50",
    description: "Slow-simmered collard greens cooked with seasoned smoked turkey meat.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaGreens-768x768.webp",
    tags: ["southern classic", "smoked turkey"],
    allergens: [],
    pairings: ["Preva Lamb Chops", "Catfish Bites"]
  },
  {
    name: "Preva Yams",
    slug: "preva-yams",
    category: "Sides",
    price: "$7.50",
    description: "Candied yams baked soft in a warm brown sugar and cinnamon glaze.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/PrevaYams-768x768.webp",
    tags: ["sweet side", "candied glaze"],
    allergens: ["dairy"],
    pairings: ["Mac & Cheese", "Preva Lamb Chops"]
  },
  {
    name: "Fries",
    slug: "fries",
    category: "Sides",
    price: "$6.50",
    description: "Golden seasoned fries, fried crisp to order with house seasoning.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Fries.webp",
    tags: ["crispy", "classic"],
    allergens: ["gluten"],
    pairings: ["Preva Double Smash Burger", "Preva Wings"]
  },
  {
    name: "Rice & Peas",
    slug: "rice-peas",
    category: "Sides",
    price: "$5.50",
    description: "Authentic Caribbean rice simmered with kidney beans, coconut milk, and fresh thyme.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Rice-and-Peas.webp",
    tags: ["caribbean", "coconut rice"],
    allergens: [],
    pairings: ["Jerk Wings", "Rasta Pasta"]
  },
  {
    name: "Fried Plantains",
    slug: "fried-plantains",
    category: "Sides",
    price: "$6.50",
    description: "Sweet ripe plantains fried golden and caramelized at the edges.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Fried-Plantains.webp",
    tags: ["sweet", "caribbean favorite"],
    allergens: [],
    pairings: ["Rasta Pasta", "Jerk Wings"]
  },
  {
    name: "Steamed Cabbage",
    slug: "steamed-cabbage",
    category: "Sides",
    price: "$5.50",
    description: "Lightly seasoned tender cabbage sautéed with carrots and sweet bell peppers.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/Steamed-Cabbage.webp",
    tags: ["healthy", "vegan"],
    allergens: [],
    pairings: ["Veggie Pasta", "Rice & Peas"]
  },
  {
    name: "Red Wine Poached Pear",
    slug: "red-wine-poached-pear",
    category: "Dessert",
    price: "$11.50",
    description: "Ripe pear gently poached in spiced red wine with cinnamon, star anise, and vanilla cream.",
    image: "/asset/prevaclub/wp-content/uploads/2026/08/red-wine-poached-pear.webp",
    tags: ["signature dessert", "wine poached"],
    allergens: ["dairy"],
    pairings: ["Preva Lamb Chops", "Rasta Pasta"]
  }
];

const SLUG_ALIASES = {
  'honey-hot-wings': 'honey-hot',
  'buffalo-wings': 'buffalo',
  'bbq-wings': 'bbq',
  'garlic-parmesan-wings': 'garlic-parmesan',
  'lemon-pepper-wings': 'lemon-pepper',
  'jerk-wings': 'jerk',
  'preva-quesadilla': 'preva-quesadillas',
  'catfish-bites': 'preva-catfish',
  'lobster-bites': 'preva-lobster',
  'steak-bites': 'preva-steak-bites',
  'preva-lamb': 'preva-lamb-chops',
  'lamb-chops': 'preva-lamb-chops',
  'preva-mac': 'preva-mac-and-cheese',
  'mac-and-cheese': 'preva-mac-and-cheese',
  'preva-greens': 'collard-greens-with-turkey-meat',
  'collard-greens': 'collard-greens-with-turkey-meat',
  'yams': 'preva-yams',
  'rice-and-peas': 'rice-peas',
  'plantains': 'fried-plantains'
};

export function getAllDishes() {
  return KITCHEN_MENU_ITEMS;
}

export function getDishBySlug(slug) {
  if (!slug) return null;
  const cleanSlug = String(slug).toLowerCase().replace(/^\/|\/$/g, '').trim();
  
  // 1. Direct slug match
  let dish = KITCHEN_MENU_ITEMS.find(item => item.slug.toLowerCase() === cleanSlug);
  if (dish) return dish;

  // 2. Direct alias match
  const aliasTarget = SLUG_ALIASES[cleanSlug];
  if (aliasTarget) {
    dish = KITCHEN_MENU_ITEMS.find(item => item.slug.toLowerCase() === aliasTarget);
    if (dish) return dish;
  }

  // 3. Fuzzy/name match
  dish = KITCHEN_MENU_ITEMS.find(item => {
    const itemClean = item.slug.toLowerCase();
    const nameClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchClean = cleanSlug.replace(/[^a-z0-9]/g, '');
    return itemClean === cleanSlug || nameClean === searchClean || searchClean.includes(nameClean) || nameClean.includes(searchClean);
  });
  return dish || null;
}

const UBER_STORE_PATH = 'https://www.order.store/in/store/preva-kitchen/dFUjbYXiSHWMrDLYDL9KxA';
const UBER_STORE_UUID = '7455236d-85e2-4875-8cac-32d80cbf4ac4';
const UBER_SECTION_UUID = 'eeff3983-4d45-5edd-b2ea-a81b04243540';
const GRUBHUB_STORE_PATH = 'https://www.grubhub.com/restaurant/preva-kitchen-13090-inkster-rd-redford/14507288';

// IDs are taken from the canonical prevaclub.com dish pages. Flavour pages
// intentionally share the Preva Wings customizer because Uber/Grubhub sell
// those flavours as choices on one product, not as separate products.
const DELIVERY_ITEM_IDS = {
  'preva-wings': ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  'preva-wings-chilli': ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  'honey-hot': ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  buffalo: ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  bbq: ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  'garlic-parmesan': ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  'lemon-pepper': ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  jerk: ['503f4470-e4db-57bb-a18d-88b67fd0c7d1', 'd05663d0-ab46-5067-be26-e5504fc96538', '355696049736'],
  'preva-double-smash-burger': ['7ba35e6d-f67c-5cdf-97ff-557e3fa0793f', 'd0a8afb8-dd5c-515f-ba37-75cf476186ce', '355696049704'],
  'chicken-quesadillas': ['816140c7-1ec8-57dc-897a-4e6a92bb79a5', 'edcc57e7-4f5a-5045-bae3-4b96875ed9a1', '355696049744'],
  'steak-quesadilla': ['816140c7-1ec8-57dc-897a-4e6a92bb79a5', 'a754f256-4f76-5522-b5be-2f50a7774cc6', '355696049696'],
  'shrimp-quesadillas': ['816140c7-1ec8-57dc-897a-4e6a92bb79a5', '38901da1-3510-5606-92fc-576743ed63a8', '355696049720'],
  'shrimp-tacos': ['3909cb31-889f-5876-8d4d-ae3f12c5e2a4', 'd2f7eab6-738b-5009-88ae-4eb1f73744f9', '355289983504'],
  'steak-tacos': ['3909cb31-889f-5876-8d4d-ae3f12c5e2a4', '0e4f58cc-13d3-5359-9382-d97637185251', '355696049712'],
  'chicken-tacos': ['3909cb31-889f-5876-8d4d-ae3f12c5e2a4', '307c8b81-44ff-5413-94ee-98302519dc66', '355696049752'],
  'preva-catfish': ['9b902254-3741-52de-bd88-958f21bf1db9', '3828de3e-1b95-5395-b705-53f5fee32719', '355289983480'],
  'preva-lobster': ['9b902254-3741-52de-bd88-958f21bf1db9', 'feef50a4-8aa8-55c7-be3c-03c565241d77', '355289983616'],
  'lobster-bites': ['9b902254-3741-52de-bd88-958f21bf1db9', 'feef50a4-8aa8-55c7-be3c-03c565241d77', '355289983616'],
  'preva-steak-bites': ['9b902254-3741-52de-bd88-958f21bf1db9', '1671b1f3-99f6-5300-91ce-cc4710a9539a', '355289983520'],
  'steak-bites': ['9b902254-3741-52de-bd88-958f21bf1db9', '1671b1f3-99f6-5300-91ce-cc4710a9539a', '355289983520'],
  'veggie-pasta': ['e577fa80-c0ae-5df1-a5cf-d82e8a3a1324', 'e0f8cf5c-3d67-54c6-874e-75bc23f1d746', ''],
  'rasta-pasta': ['e577fa80-c0ae-5df1-a5cf-d82e8a3a1324', '53ae9272-8d56-5447-b42e-2a65bee8bf35', ''],
  'preva-lamb-chops': ['2fb0da82-15b9-5e5d-92bb-509bb9081cde', '8e9d60f1-e097-5b4b-aad3-52291a8ca537', '355289983592'],
  'lamb-chops': ['2fb0da82-15b9-5e5d-92bb-509bb9081cde', '8e9d60f1-e097-5b4b-aad3-52291a8ca537', '355289983592'],
  'preva-mac-and-cheese': ['da30ce3e-03b8-5435-8cc8-fe59beb91e9f', '02d66484-598d-5e1b-9ffd-3a3d910155e0', '355289983624'],
  'mac-and-cheese': ['da30ce3e-03b8-5435-8cc8-fe59beb91e9f', '02d66484-598d-5e1b-9ffd-3a3d910155e0', '355289983624'],
  'preva-yams': ['da30ce3e-03b8-5435-8cc8-fe59beb91e9f', '448207f7-2e09-5006-bd27-491917fbec3d', '355289983552'],
  yams: ['da30ce3e-03b8-5435-8cc8-fe59beb91e9f', '448207f7-2e09-5006-bd27-491917fbec3d', '355289983552']
};

function uberItemUrl(dishSlug, subsectionUuid, itemUuid) {
  const context = encodeURIComponent(encodeURIComponent(JSON.stringify({
    storeUuid: UBER_STORE_UUID,
    sectionUuid: UBER_SECTION_UUID,
    subsectionUuid,
    itemUuid,
    showSeeDetailsCTA: true
  })));
  return `${UBER_STORE_PATH}?mod=quickView&modctx=${context}&ps=1&utm_source=prevakitchen&utm_medium=website&utm_campaign=menu_page&utm_content=${encodeURIComponent(dishSlug)}`;
}

export function getDeliveryLinks(dishSlug = 'rasta-pasta') {
  const [subsectionUuid, itemUuid, grubhubItemId] = DELIVERY_ITEM_IDS[dishSlug] || [];
  return {
    ubereats: itemUuid
      ? uberItemUrl(dishSlug, subsectionUuid, itemUuid)
      : `${UBER_STORE_PATH}?utm_source=prevakitchen&utm_medium=website&utm_campaign=menu_page&utm_content=${encodeURIComponent(dishSlug)}`,
    doordash: `https://www.doordash.com/store/preva-kitchen-redford-43388119/107666947/?pickup=true&rwg_token=AE37R_i6mClxnZIQS4kBm8BJCV733mzRGl2vLF0371vhYETHJ__KdRcFTWywB1qBP6BiKOGDs7cE-2P9zF18C-VrubtN7pwBGg%3D%3D&utm_campaign=menu_page&utm_source=prevaclub&utm_medium=website&utm_content=${encodeURIComponent(dishSlug)}`,
    grubhub: grubhubItemId
      ? `${GRUBHUB_STORE_PATH}/menu-item/${grubhubItemId}?menu-item-options=&utm_source=prevakitchen&utm_medium=website&utm_campaign=menu_page&utm_content=${encodeURIComponent(dishSlug)}`
      : `${GRUBHUB_STORE_PATH}?utm_source=prevakitchen&utm_medium=website&utm_campaign=menu_page&utm_content=${encodeURIComponent(dishSlug)}`,
    pickup: `tel:+13132863586`
  };
}

