import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

/**
 * One Mongo connection for the whole platform — site, admin and API all run in
 * the same Next process now, so they share a single pool.
 *
 * Included: Built-in in-memory fallback store so if local MongoDB is not running
 * (ECONNREFUSED), the app automatically uses in-memory DB populated with Preva Kitchen menu
 * items & default admin user (admin@prevaclub.com / Preva#Redford2026) without crashing.
 */

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/preva';

// NOTE: Do NOT read process.env at module evaluation time — in ESM, all
// imports are hoisted before the module body, so dotenv.config() in server.js
// has NOT run yet when this module is first evaluated. Read lazily instead.
function getMongoUri() {
  return process.env.MONGODB_URI || process.env.DATABASE_URL || DEFAULT_URI;
}
function getMongoDatabase() {
  return process.env.MONGODB_DB || undefined;
}

// Keep these exports for callers that log the URI (e.g. health checks).
export const mongoUri = () => getMongoUri();
export const mongoDatabase = () => getMongoDatabase();

const globalForMongo = globalThis;

// Full Preva Kitchen & Lounge menu matching official printed menu card
const INITIAL_FALLBACK_DATA = {
  menuItems: [
    {
      _id: new ObjectId('6699a0000000000000000001'),
      name: "Preva Wings",
      slug: "preva-wings",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "PREVA's signature crispy jumbo wings, tossed in your choice of house sauce — honey hot, buffalo, BBQ, sweet chili, garlic parmesan, lemon pepper or jerk.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaWings-768x768.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "Signature",
      sortOrder: 1
    },
    {
      _id: new ObjectId('6699a0000000000000000002'),
      name: "Preva Wings Chilli",
      slug: "preva-wings-chilli",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "Wings coated in sweet chili sauce with a mild, bright finish.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaWingsChilli-768x768.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "",
      sortOrder: 2
    },
    {
      _id: new ObjectId('6699a0000000000000000003'),
      name: "Honey Hot",
      slug: "honey-hot",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "Crispy jumbo wings tossed in hot honey — sweet heat with a sticky glaze.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/hot_honey_wings.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "",
      sortOrder: 3
    },
    {
      _id: new ObjectId('6699a0000000000000000004'),
      name: "Buffalo",
      slug: "buffalo",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "Classic buffalo wings in tangy cayenne sauce, served with ranch.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/buffalo_wings.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "",
      sortOrder: 4
    },
    {
      _id: new ObjectId('6699a0000000000000000005'),
      name: "BBQ",
      slug: "bbq",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "Smoky barbecue wings, slow-glazed and finished on the grill.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/bbq_wings_preva.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "",
      sortOrder: 5
    },
    {
      _id: new ObjectId('6699a0000000000000000006'),
      name: "Garlic Parmesan",
      slug: "garlic-parmesan",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "Wings tossed in garlic butter and finished with shaved parmesan.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Garlic-Parmesan.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "",
      sortOrder: 6
    },
    {
      _id: new ObjectId('6699a0000000000000000007'),
      name: "Lemon Pepper",
      slug: "lemon-pepper",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "Crisp wings seasoned with cracked black pepper and fresh lemon zest.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Lemon-Pepper.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 7
    },
    {
      _id: new ObjectId('6699a0000000000000000008'),
      name: "Jerk",
      slug: "jerk",
      category: "Preva Wings",
      price: "$16.50",
      priceCents: 1650,
      description: "Caribbean jerk wings marinated in house spice and grilled hot.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Jerk-wings.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 8
    },
    {
      _id: new ObjectId('6699a0000000000000000009'),
      name: "Preva Burger",
      slug: "preva-burger",
      category: "Preva Burger",
      price: "$15.50",
      priceCents: 1550,
      description: "PREVA's signature cheeseburger — American cheese, lettuce, tomato, red onion and pickles on a toasted bun.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaBurger-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 9
    },
    {
      _id: new ObjectId('6699a0000000000000000010'),
      name: "Preva Double Smash Burger",
      slug: "preva-double-smash-burger",
      category: "Preva Burger",
      price: "$11.49",
      priceCents: 1149,
      description: "Two smash patties, two slices of American cheese, thousand island, served with fries.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaDoubleSmashBurger-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 10
    },
    {
      _id: new ObjectId('6699a0000000000000000011'),
      name: "Preva Quesadillas",
      slug: "preva-quesadillas",
      category: "Quesadillas",
      price: "$17.49",
      priceCents: 1749,
      description: "Flour tortilla grilled with melted cheese, house seasoning and your choice of chicken or beef, served with sour cream and salsa.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaQuesadilla-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 11
    },
    {
      _id: new ObjectId('6699a0000000000000000012'),
      name: "Chicken Quesadillas",
      slug: "chicken-quesadillas",
      category: "Quesadillas",
      price: "$17.49",
      priceCents: 1749,
      description: "Seasoned chicken and melted cheese grilled in a flour tortilla, served with sour cream and salsa.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Chicken-Tacos.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 12
    },
    {
      _id: new ObjectId('6699a0000000000000000013'),
      name: "Steak Quesadilla",
      slug: "steak-quesadilla",
      category: "Quesadillas",
      price: "$18.50",
      priceCents: 1850,
      description: "Grilled steak, melted cheese, peppers and onions, served with sour cream and salsa.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Steak-Quesadilla.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 13
    },
    {
      _id: new ObjectId('6699a0000000000000000014'),
      name: "Shrimp Quesadillas",
      slug: "shrimp-quesadillas",
      category: "Quesadillas",
      price: "$18.50",
      priceCents: 1850,
      description: "Seasoned shrimp, melted cheese, peppers and onions, served with sour cream and salsa.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Shrimp-Quesadillas.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 14
    },
    {
      _id: new ObjectId('6699a0000000000000000015'),
      name: "Beef Quesadillas",
      slug: "beef-quesadillas",
      category: "Quesadillas",
      price: "$16.50",
      priceCents: 1650,
      description: "Seasoned beef and melted cheese grilled in a flour tortilla, served with sour cream and salsa.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Beef-Quesadillas.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 15
    },
    {
      _id: new ObjectId('6699a0000000000000000016'),
      name: "Veggie Quesadilla",
      slug: "veggie-quesadilla",
      category: "Quesadillas",
      price: "$14.49",
      priceCents: 1449,
      description: "Grilled peppers, onions and melted cheese in a flour tortilla, served with sour cream and salsa.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Veggie-Quesadilla.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 16
    },
    {
      _id: new ObjectId('6699a0000000000000000017'),
      name: "Shrimp Tacos",
      slug: "shrimp-tacos",
      category: "Tacos",
      price: "$17.50",
      priceCents: 1750,
      description: "Seasoned shrimp tacos topped with fresh slaw and house sauce.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/ShrimpTacos-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 17
    },
    {
      _id: new ObjectId('6699a0000000000000000018'),
      name: "Steak Tacos",
      slug: "steak-tacos",
      category: "Tacos",
      price: "$17.50",
      priceCents: 1750,
      description: "Seasoned steak tacos topped with fresh slaw and house sauce.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/SteakTacos-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 18
    },
    {
      _id: new ObjectId('6699a0000000000000000019'),
      name: "Chicken Tacos",
      slug: "chicken-tacos",
      category: "Tacos",
      price: "$16.50",
      priceCents: 1650,
      description: "Seasoned chicken tacos topped with fresh slaw and house sauce.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Chicken-Tacos-1.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 19
    },
    {
      _id: new ObjectId('6699a0000000000000000020'),
      name: "Preva Catfish",
      slug: "preva-catfish",
      category: "Preva Bites",
      price: "$15.50",
      priceCents: 1550,
      description: "Seasoned fried catfish bites served hot and crispy.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaCatfish-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 20
    },
    {
      _id: new ObjectId('6699a0000000000000000021'),
      name: "Preva Lobster",
      slug: "preva-lobster",
      category: "Preva Bites",
      price: "$21.50",
      priceCents: 2150,
      description: "Tender lobster bites fried golden and served with house sauce.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaLobster-768x768.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "",
      sortOrder: 21
    },
    {
      _id: new ObjectId('6699a0000000000000000022'),
      name: "Preva Steak Bites",
      slug: "preva-steak-bites",
      category: "Preva Bites",
      price: "$19.50",
      priceCents: 1950,
      description: "Seasoned steak bites grilled and finished with garlic butter.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaSteakBites-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 22
    },
    {
      _id: new ObjectId('6699a0000000000000000023'),
      name: "Veggie Pasta",
      slug: "veggie-pasta",
      category: "Pasta",
      price: "$16.50",
      priceCents: 1650,
      description: "Creamy pasta with sauteed peppers, onions and seasonal vegetables.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Veggie-Pasta-768x614.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 23
    },
    {
      _id: new ObjectId('6699a0000000000000000024'),
      name: "Rasta Pasta",
      slug: "rasta-pasta",
      category: "Pasta",
      price: "$22.00",
      priceCents: 2200,
      description: "Creamy Caribbean-style pasta with bell peppers and house jerk seasoning. Choose your protein when you order.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 24
    },
    {
      _id: new ObjectId('6699a0000000000000000025'),
      name: "House Salad",
      slug: "house-salad",
      category: "Salads",
      price: "$8.29",
      priceCents: 829,
      description: "Crisp mixed greens with tomato, red onion and cucumber.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/house-salad.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 25
    },
    {
      _id: new ObjectId('6699a0000000000000000026'),
      name: "Preva Lamb Chops",
      slug: "preva-lamb-chops",
      category: "Entrées",
      price: "$33.50",
      priceCents: 3350,
      description: "Grilled lamb chops seasoned with PREVA house spices and served with choice of sides.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/prevaLamb-768x768.webp",
      available: true,
      orderable: true,
      featured: true,
      badge: "Luxury Entrée",
      sortOrder: 26
    },
    {
      _id: new ObjectId('6699a0000000000000000027'),
      name: "Catfish Bites with Fries",
      slug: "catfish-bites-with-fries",
      category: "Entrées",
      price: "$26.50",
      priceCents: 2650,
      description: "A full plate of seasoned catfish bites served with a side of fries.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Catfish-Bites-with-Fries.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 27
    },
    {
      _id: new ObjectId('6699a0000000000000000028'),
      name: "Preva Mac and Cheese",
      slug: "preva-mac-and-cheese",
      category: "Sides",
      price: "$7.50",
      priceCents: 750,
      description: "Baked macaroni in a blend of melted cheeses.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaMac-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 28
    },
    {
      _id: new ObjectId('6699a0000000000000000029'),
      name: "Collard Greens with Turkey Meat",
      slug: "collard-greens-with-turkey-meat",
      category: "Sides",
      price: "$7.50",
      priceCents: 750,
      description: "Slow-simmered collard greens cooked with smoked turkey.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaGreens-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 29
    },
    {
      _id: new ObjectId('6699a0000000000000000030'),
      name: "Preva Yams",
      slug: "preva-yams",
      category: "Sides",
      price: "$7.50",
      priceCents: 750,
      description: "Candied yams baked soft in a brown sugar glaze.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/PrevaYams-768x768.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 30
    },
    {
      _id: new ObjectId('6699a0000000000000000031'),
      name: "Fries",
      slug: "fries",
      category: "Sides",
      price: "$6.50",
      priceCents: 650,
      description: "Golden seasoned fries, fried crisp to order.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Fries.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 31
    },
    {
      _id: new ObjectId('6699a0000000000000000032'),
      name: "Rice & Peas",
      slug: "rice-peas",
      category: "Sides",
      price: "$5.50",
      priceCents: 550,
      description: "Caribbean rice simmered with kidney beans and coconut.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Rice-and-Peas.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 32
    },
    {
      _id: new ObjectId('6699a0000000000000000033'),
      name: "Fried Plantains",
      slug: "fried-plantains",
      category: "Sides",
      price: "$6.50",
      priceCents: 650,
      description: "Sweet plantains fried golden and caramelised at the edges.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Fried-Plantains.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 33
    },
    {
      _id: new ObjectId('6699a0000000000000000034'),
      name: "Steamed Cabbage",
      slug: "steamed-cabbage",
      category: "Sides",
      price: "$5.50",
      priceCents: 550,
      description: "Lightly seasoned cabbage steamed until tender.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/Steamed-Cabbage.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 34
    },
    {
      _id: new ObjectId('6699a0000000000000000035'),
      name: "Red Wine Poached Pear",
      slug: "red-wine-poached-pear",
      category: "Dessert",
      price: "$11.50",
      priceCents: 1150,
      description: "Pear gently poached in spiced red wine.",
      image: "https://prevaclub.com/wp-content/uploads/2026/08/red-wine-poached-pear.webp",
      available: true,
      orderable: true,
      featured: false,
      badge: "",
      sortOrder: 35
    }
  ],

  users: [
    {
      _id: new ObjectId('6699a0000000000000000099'),
      email: 'admin@prevaclub.com',
      name: 'Preva Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      passwordHash: bcrypt.hashSync('Preva#Redford2026', 10),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  order: [],
  reservation: [],
  setting: [
    { key: 'siteTitle', value: 'Preva Nightclub & Restaurant' },
    { key: 'siteLogo', value: '/asset/preva-logo.svg' },
    { key: 'shopOrderingEnabled', value: true },
    { key: 'shopPickupEnabled', value: true },
    { key: 'shopDeliveryEnabled', value: true },
    { key: 'shopTaxRate', value: 0.06 },
    { key: 'shopDeliveryFeeCents', value: 499 },
    { key: 'shopFreeDeliveryOverCents', value: 5000 },
    { key: 'shopMinOrderCents', value: 1500 },
    { key: 'shopPickupMinutes', value: 25 },
    { key: 'shopDeliveryMinutes', value: 45 },
    { key: 'shopTipPresets', value: [15, 18, 20] }
  ],
  contentSections: [],
  categories: [
    { name: "Preva Wings", slug: "preva-wings" },
    { name: "Preva Burger", slug: "preva-burger" },
    { name: "Quesadillas", slug: "quesadillas" },
    { name: "Tacos", slug: "tacos" },
    { name: "Preva Bites", slug: "preva-bites" },
    { name: "Pasta", slug: "pasta" },
    { name: "Salads", slug: "salads" },
    { name: "Entrées", slug: "entr-es" },
    { name: "Sides", slug: "sides" },
    { name: "Dessert", slug: "dessert" }
  ],
  media: [
    {
      _id: new ObjectId('6699b0000000000000000001'),
      title: 'Preva Gold Crest Logo',
      filename: 'preva-logo.png',
      url: '/asset/preva-logo.png',
      altText: 'Preva Luxury Nightclub & Kitchen Gold Logo',
      caption: 'Official Preva Gold Brandmark',
      description: 'High-resolution gold crest logo for headers and dark backgrounds.',
      mimeType: 'image/png',
      fileSize: 696740,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000002'),
      title: 'Preva Silver Brandmark',
      filename: 'preva-logo-silver.png',
      url: '/asset/preva-logo-silver.png',
      altText: 'Preva Silver Metallic Logo',
      caption: 'Silver metallic luxury logo',
      description: 'Polished silver logo for editorial and VIP sections.',
      mimeType: 'image/png',
      fileSize: 386916,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000003'),
      title: 'Preva Vector Brandmark SVG',
      filename: 'preva-logo.svg',
      url: '/asset/preva-logo.svg',
      altText: 'Preva Vector Logo',
      caption: 'Vector brandmark',
      description: 'Crisp scalable SVG vector logo.',
      mimeType: 'image/svg+xml',
      fileSize: 1645,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000004'),
      title: 'Preva Double Smash Burger',
      filename: 'Preva-Double-Smash-Burger.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Double-Smash-Burger-768x768.jpg',
      altText: 'Preva Double Smash Burger with melted cheese, thousand island, and seasoned fries',
      caption: 'Signature double smash burger with fries',
      description: 'Two smash patties, two slices of American cheese, thousand island dressing, served with crisp seasoned fries.',
      mimeType: 'image/jpeg',
      fileSize: 185000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000005'),
      title: 'Preva Classic Burger',
      filename: 'Preva-Burger.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Burger-768x768.jpg',
      altText: 'Preva Cheeseburger with fresh lettuce, tomato, and red onion on a toasted brioche bun',
      caption: 'Classic Preva Cheeseburger',
      description: 'Fresh grilled beef patty with American cheese, crisp lettuce, fresh tomato, red onion and pickles.',
      mimeType: 'image/jpeg',
      fileSize: 172000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000006'),
      title: 'Preva Signature Wings',
      filename: 'Preva-Wings.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Wings-768x768.jpg',
      altText: 'Preva Signature Crispy Jumbo Wings',
      caption: 'Crispy jumbo wings tossed in signature house seasoning',
      description: 'Fresh jumbo party wings fried extra crispy and tossed in house seasonings.',
      mimeType: 'image/jpeg',
      fileSize: 198000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000007'),
      title: 'Preva Sweet Chili Wings',
      filename: 'Preva-Wings-Chilli.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Wings-Chilli-768x768.jpg',
      altText: 'Preva Sweet Chili Wings with glazed mild finish',
      caption: 'Wings glazed in sweet chili sauce',
      description: 'Crispy wings coated in a bright sweet and spicy chili glaze.',
      mimeType: 'image/jpeg',
      fileSize: 192000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000008'),
      title: 'Hot Honey Wings',
      filename: 'Hot-Honey-Wings.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Hot-Honey-Wings.jpg',
      altText: 'Hot Honey Jumbo Wings',
      caption: 'Hot honey glazed wings',
      description: 'Crispy wings tossed in pure warm honey with crushed red pepper heat.',
      mimeType: 'image/jpeg',
      fileSize: 165000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000009'),
      title: 'Buffalo Wings',
      filename: 'Buffalo-wings.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Buffalo-wings.jpg',
      altText: 'Classic Tangy Buffalo Wings',
      caption: 'Classic cayenne buffalo wings',
      description: 'Tangy cayenne buffalo glaze served with creamy house ranch.',
      mimeType: 'image/jpeg',
      fileSize: 154000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000010'),
      title: 'Smoky BBQ Wings',
      filename: 'bbq-wings.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/bbq.jpg',
      altText: 'Smoky Barbecue Wings slow-glazed',
      caption: 'Smoky slow-glazed BBQ wings',
      description: 'Slow-simmered rich smoky barbecue sauce charred on the grill.',
      mimeType: 'image/jpeg',
      fileSize: 160000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000011'),
      title: 'Garlic Parmesan Wings',
      filename: 'Garlic-Parmesan.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Garlic-Parmesan.jpg',
      altText: 'Garlic Parmesan Jumbo Wings with fresh herbs',
      caption: 'Garlic butter and aged parmesan wings',
      description: 'Garlic herb butter sauce topped with freshly grated aged parmesan cheese.',
      mimeType: 'image/jpeg',
      fileSize: 175000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000012'),
      title: 'Lemon Pepper Wings',
      filename: 'lemon-paper.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/lemon-paper.jpg',
      altText: 'Lemon Pepper Crispy Wings',
      caption: 'Zesty lemon pepper seasoned wings',
      description: 'Cracked black peppercorn and zesty citrus lemon dry rub.',
      mimeType: 'image/jpeg',
      fileSize: 148000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000013'),
      title: 'Caribbean Jerk Wings',
      filename: 'jerq.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/jerq.jpg',
      altText: 'Caribbean Jerk Marinated Wings',
      caption: 'Authentic Caribbean jerk wings',
      description: 'Marinated in Jamaican pimento, scotch bonnet and island herbs.',
      mimeType: 'image/jpeg',
      fileSize: 162000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000014'),
      title: 'Preva Signature Quesadilla',
      filename: 'Preva-Quesadilla.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Quesadilla-768x768.jpg',
      altText: 'Preva Grilled Quesadilla with sour cream and salsa',
      caption: 'Golden grilled flour tortilla quesadilla',
      description: 'Seasoned filling and melted three-cheese blend with salsa and sour cream.',
      mimeType: 'image/jpeg',
      fileSize: 180000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000015'),
      title: 'Steak Quesadilla',
      filename: 'Steak-Quesadilla.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Steak-Quesadilla-768x615.jpg',
      altText: 'Grilled Steak Quesadilla with sauteed peppers and onions',
      caption: 'Marinated steak quesadilla',
      description: 'Seared steak strips, grilled bell peppers, onions, and melted jack cheese.',
      mimeType: 'image/jpeg',
      fileSize: 168000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000016'),
      title: 'Shrimp Quesadillas',
      filename: 'Shrimp-Quesadillas.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Shrimp-Quesadillas-768x615.jpg',
      altText: 'Seasoned Shrimp Quesadillas',
      caption: 'Wild gulf shrimp quesadillas',
      description: 'Sautéed spiced shrimp with melted cheese inside a toasted tortilla.',
      mimeType: 'image/jpeg',
      fileSize: 170000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000017'),
      title: 'Beef Quesadillas',
      filename: 'Beef-Quesadillas.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/quascode-768x615.jpg',
      altText: 'Seasoned Ground Beef Quesadillas',
      caption: 'Seasoned ground beef quesadillas',
      description: 'Savory spiced beef, melted cheddar jack and cilantro.',
      mimeType: 'image/jpeg',
      fileSize: 165000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000018'),
      title: 'Veggie Quesadilla',
      filename: 'Veggie-Quesadilla.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Veggie-Quesadilla-768x615.jpg',
      altText: 'Garden Veggie Quesadilla',
      caption: 'Grilled bell pepper and onion veggie quesadilla',
      description: 'Fire-roasted bell peppers, red onions, mushrooms and melted cheese.',
      mimeType: 'image/jpeg',
      fileSize: 158000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000019'),
      title: 'Shrimp Tacos',
      filename: 'Shrimp-Tacos.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Shrimp-Tacos-768x768.jpg',
      altText: 'Seasoned Shrimp Tacos with Fresh Slaw and House Crema',
      caption: 'Trio of seasoned shrimp street tacos',
      description: 'Grilled shrimp topped with lime-marinated slaw and house chipotle crema.',
      mimeType: 'image/jpeg',
      fileSize: 190000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000020'),
      title: 'Steak Tacos',
      filename: 'Steak-Tacos.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Steak-Tacos-768x768.jpg',
      altText: 'Carne Asada Steak Tacos',
      caption: 'Grilled steak tacos with fresh cilantro and onion',
      description: 'Tender marinated steak with fresh cilantro, diced onions and salsa.',
      mimeType: 'image/jpeg',
      fileSize: 188000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000021'),
      title: 'Chicken Tacos',
      filename: 'Chicken-Tacos.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Chicken-Tacos-768x615.jpg',
      altText: 'Seasoned Chicken Tacos',
      caption: 'Seasoned grilled chicken tacos',
      description: 'Juicy shredded chicken breast with cabbage slaw and house dressing.',
      mimeType: 'image/jpeg',
      fileSize: 164000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000022'),
      title: 'Crispy Catfish Bites',
      filename: 'Preva-Catfish.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Catfish-768x768.jpg',
      altText: 'Crispy Southern Seasoned Catfish Bites',
      caption: 'Golden fried cornmeal catfish bites',
      description: 'Fresh farm-raised catfish bites in spiced cornmeal batter served with remoulade.',
      mimeType: 'image/jpeg',
      fileSize: 195000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000023'),
      title: 'Golden Lobster Bites',
      filename: 'Preva-Lobster.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Lobster-768x768.jpg',
      altText: 'Lavish Fresh Lobster Bites with Garlic Herb Dip',
      caption: 'Crispy tender Atlantic lobster bites',
      description: 'Succulent Atlantic lobster pieces lightly battered and fried golden.',
      mimeType: 'image/jpeg',
      fileSize: 205000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000024'),
      title: 'Seared Steak Bites',
      filename: 'Preva-Steak-Bites.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Steak-Bites-768x768.jpg',
      altText: 'Prime Seared Steak Bites with Sautéed Peppers',
      caption: 'Cast iron seared beef tenderloin bites',
      description: 'Prime steak bites seared hot with garlic butter, sweet bell peppers and onions.',
      mimeType: 'image/jpeg',
      fileSize: 198000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000025'),
      title: 'Creamy Rasta Pasta',
      filename: 'Rasta-Pasta.webp',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp',
      altText: 'Creamy Caribbean Jerk Rasta Pasta with Bell Peppers',
      caption: 'Signature Caribbean Jerk Penne Pasta',
      description: 'Penne pasta tossed in rich parmesan jerk cream sauce with tri-color sweet peppers.',
      mimeType: 'image/webp',
      fileSize: 175000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000026'),
      title: 'Garden Veggie Pasta',
      filename: 'Veggie-Pasta.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Veggie-Pasta-768x615.jpg',
      altText: 'Seasonal Vegetable Penne Pasta',
      caption: 'Creamy garlic parmesan veggie pasta',
      description: 'Tender seasonal broccoli, asparagus, and bell peppers in a light herb sauce.',
      mimeType: 'image/jpeg',
      fileSize: 160000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000027'),
      title: 'Gourmet Lamb Chops',
      filename: 'preva-Lamb.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/preva-Lamb-768x768.jpg',
      altText: 'Rosemary Grilled Lamb Chops with Luxury Finish',
      caption: 'Prime rosemary grilled lamb chops',
      description: 'Four marinated lamb chops grilled over open flame and served with house sides.',
      mimeType: 'image/jpeg',
      fileSize: 220000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000028'),
      title: 'Catfish Bites with Seasoned Fries',
      filename: 'Catfish-Bites-with-Fries.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Catfish-Bites-with-Fries-768x615.jpg',
      altText: 'Full Plate Catfish Basket with Crispy Seasoned Fries',
      caption: 'Catfish and seasoned fries dinner basket',
      description: 'Generous portion of fried catfish nuggets over golden seasoned fries.',
      mimeType: 'image/jpeg',
      fileSize: 182000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000029'),
      title: 'Baked Mac & Cheese',
      filename: 'Preva-Mac.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Mac-768x768.jpg',
      altText: 'Southern Style Baked Five-Cheese Macaroni',
      caption: 'Baked five-cheese macaroni casserole',
      description: 'Cavatappi pasta baked in sharp cheddar, gouda, Monterey jack and cream.',
      mimeType: 'image/jpeg',
      fileSize: 190000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000030'),
      title: 'Slow-Simmered Collard Greens',
      filename: 'Preva-Greens.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Greens-768x768.jpg',
      altText: 'Southern Collard Greens with Smoked Turkey',
      caption: 'Slow-simmered collard greens with smoked turkey',
      description: 'Fresh collard greens slow-braised with smoked turkey wings and savory broth.',
      mimeType: 'image/jpeg',
      fileSize: 185000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000031'),
      title: 'Candied Yams',
      filename: 'Preva-Yams.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/08/Preva-Yams-768x768.jpg',
      altText: 'Sweet Candied Yams with Brown Sugar Glaze',
      caption: 'Brown sugar and cinnamon candied yams',
      description: 'Sweet yams baked tender in a rich brown sugar, vanilla and butter sauce.',
      mimeType: 'image/jpeg',
      fileSize: 178000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000032'),
      title: 'Seasoned French Fries',
      filename: 'Fries.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Fries.jpg',
      altText: 'Golden Crisp Seasoned Fries',
      caption: 'Crisp seasoned fries basket',
      description: 'Fresh cut potatoes fried extra crispy with Preva signature fry seasoning.',
      mimeType: 'image/jpeg',
      fileSize: 145000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000033'),
      title: 'Caribbean Rice & Peas',
      filename: 'Rice-Peas.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Rice-Peas-768x615.jpg',
      altText: 'Authentic Caribbean Coconut Rice & Red Kidney Peas',
      caption: 'Coconut simmered rice and kidney peas',
      description: 'Long grain rice simmered with coconut milk, thyme, scotch bonnet and kidney beans.',
      mimeType: 'image/jpeg',
      fileSize: 155000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000034'),
      title: 'Golden Fried Sweet Plantains',
      filename: 'Fried-Plantains.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Fried-Plantains-768x615.jpg',
      altText: 'Caramelized Sweet Fried Plantains',
      caption: 'Sweet fried ripe plantain slices',
      description: 'Ripe maduro plantains sliced thick and fried until golden brown and caramelized.',
      mimeType: 'image/jpeg',
      fileSize: 160000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000035'),
      title: 'Steamed Butter Cabbage',
      filename: 'Steamed-Cabbage.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Steamed-Cabbage-768x615.jpg',
      altText: 'Tender Steamed Seasoned Cabbage',
      caption: 'Seasoned steamed island cabbage',
      description: 'Crisp-tender cabbage sautéed with carrots, bell peppers, garlic and island spices.',
      mimeType: 'image/jpeg',
      fileSize: 150000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000036'),
      title: 'Red Wine Poached Pear',
      filename: 'Red-Wine-Poached-Pear.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/07/Red-Wine-Poached-Pear-768x615.jpg',
      altText: 'Spiced Red Wine Poached Pear Dessert',
      caption: 'Elegant red wine poached Bosc pear',
      description: 'Bosc pear simmered in cabernet sauvignon, cinnamon sticks, star anise and vanilla.',
      mimeType: 'image/jpeg',
      fileSize: 165000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000037'),
      title: 'Fresh Garden House Salad',
      filename: 'house-salad.jpg',
      url: 'https://prevaclub.com/wp-content/uploads/2026/05/house-salad-1-1-768x768.jpg',
      altText: 'Crisp Mixed Greens Salad with Cucumbers and Tomatoes',
      caption: 'Fresh house garden salad bowl',
      description: 'Mixed baby greens, heirloom cherry tomatoes, sliced cucumbers, and house vinaigrette.',
      mimeType: 'image/jpeg',
      fileSize: 170000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000038'),
      title: 'Editorial Lamb Tower Showcase',
      filename: 'lamb-editorial-showcase.jpg',
      url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=80',
      altText: 'Lavish Lamb Tower Editorial Showcase',
      caption: 'Editorial culinary hero image',
      description: 'Featured high-end plating of grilled lamb chops with fresh garden rosemary.',
      mimeType: 'image/jpeg',
      fileSize: 240000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000039'),
      title: 'Editorial Lobster Bites Showcase',
      filename: 'lobster-editorial-showcase.jpg',
      url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=900&q=80',
      altText: 'Fresh Seared Lobster Bites Platter',
      caption: 'Editorial seafood plating',
      description: 'Golden Atlantic lobster bites seared in garlic herb butter with a bright lemon finish.',
      mimeType: 'image/jpeg',
      fileSize: 235000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000040'),
      title: 'Editorial Steak Bites Showcase',
      filename: 'steak-editorial-showcase.jpg',
      url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      altText: 'Seared Prime Steak Bites Platter',
      caption: 'Cast iron steak bites showcase',
      description: 'Prime steak bites sautéed with sweet peppers, onions, and mushrooms.',
      mimeType: 'image/jpeg',
      fileSize: 228000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000041'),
      title: 'Preva Luxury Lounge & Atmosphere',
      filename: 'preva-luxury-atmosphere.jpg',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      altText: 'Preva Luxury Dining Room and Lounge',
      caption: 'Warm luxury dining and lounge setting',
      description: 'Exclusive ambient lighting, refined booths and table settings.',
      mimeType: 'image/jpeg',
      fileSize: 310000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000042'),
      title: 'Preva Nightclub VIP Section',
      filename: 'preva-vip-nightclub.jpg',
      url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=1200&q=80',
      altText: 'Preva Nightclub High-Energy VIP Booths and Lighting',
      caption: 'High-energy VIP bottle service nightlife',
      description: 'State of the art sound system, LED lighting and private VIP booths.',
      mimeType: 'image/jpeg',
      fileSize: 325000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699b0000000000000000043'),
      title: 'Preva Signature Craft Cocktails',
      filename: 'preva-craft-cocktails.jpg',
      url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
      altText: 'Preva Handcrafted Luxury Cocktail',
      caption: 'Artisanal craft cocktail at the bar',
      description: 'Top-shelf spirits, handcrafted syrups and exotic garnishes.',
      mimeType: 'image/jpeg',
      fileSize: 295000,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  orderingPlatforms: [
    {
      _id: new ObjectId('6699c0000000000000000001'),
      name: 'DoorDash',
      providerKey: 'doordash',
      description: 'Pickup + Delivery',
      availability: 'BOTH',
      url: 'https://www.doordash.com/store/preva-kitchen-redford-43388119/',
      logo: 'https://cdn.simpleicons.org/doordash/white',
      isActive: true,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699c0000000000000000002'),
      name: 'Uber Eats',
      providerKey: 'uber-eats',
      description: 'Pickup + Delivery',
      availability: 'BOTH',
      url: 'https://www.ubereats.com/search?q=Preva%20Kitchen%20Redford',
      logo: 'https://cdn.simpleicons.org/ubereats',
      isActive: true,
      sortOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699c0000000000000000003'),
      name: 'Toast',
      providerKey: 'toast',
      description: 'Pickup + Delivery',
      availability: 'BOTH',
      url: '/shop',
      logo: '',
      isActive: true,
      sortOrder: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699c0000000000000000004'),
      name: 'Grubhub',
      providerKey: 'grubhub',
      description: 'Pickup + Delivery',
      availability: 'BOTH',
      url: 'https://www.grubhub.com/delivery/mi-redford',
      logo: '',
      isActive: true,
      sortOrder: 4,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('6699c0000000000000000005'),
      name: 'Call to Order',
      providerKey: 'call-to-order',
      description: 'Carryout / Pickup',
      availability: 'PICKUP',
      url: 'tel:+13132863586',
      logo: '',
      isActive: true,
      sortOrder: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  counters: [{ key: 'order', value: 1000 }],
  order: []
};

// In-Memory Collection Helper
class InMemoryCollection {
  constructor(name) {
    this.name = name;
    if (!globalForMongo.__prevaStore) globalForMongo.__prevaStore = {};
    if (!globalForMongo.__prevaStore[name]) {
      globalForMongo.__prevaStore[name] = INITIAL_FALLBACK_DATA[name] ? [...INITIAL_FALLBACK_DATA[name]] : [];
    }
    this.store = globalForMongo.__prevaStore[name];
  }

  /**
   * Read a possibly-nested path such as "payment.status", because several
   * queries in the app filter on dotted keys and a flat lookup silently
   * returns undefined for all of them.
   */
  _read(doc, path) {
    if (!path.includes('.')) return doc?.[path];
    return path.split('.').reduce((value, part) => (value == null ? undefined : value[part]), doc);
  }

  /**
   * Compare two values where either side may be an ObjectId.
   *
   * This is the whole reason the previous version broke checkout. ObjectIds are
   * objects, so `===` compares references and two ObjectIds wrapping the same
   * hex string are never equal. Everything below normalises through toString().
   */
  _eq(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (typeof a === 'object' || typeof b === 'object') return String(a) === String(b);
    return false;
  }

  _matchesOperators(actual, expression) {
    for (const [operator, expected] of Object.entries(expression)) {
      switch (operator) {
        case '$eq':
          if (!this._eq(actual, expected)) return false;
          break;
        case '$ne':
          if (this._eq(actual, expected)) return false;
          break;
        case '$in':
          if (!Array.isArray(expected) || !expected.some((one) => this._eq(actual, one))) return false;
          break;
        case '$nin':
          if (Array.isArray(expected) && expected.some((one) => this._eq(actual, one))) return false;
          break;
        case '$gt':
          if (!(actual > expected)) return false;
          break;
        case '$gte':
          if (!(actual >= expected)) return false;
          break;
        case '$lt':
          if (!(actual < expected)) return false;
          break;
        case '$lte':
          if (!(actual <= expected)) return false;
          break;
        case '$exists':
          if (expected ? actual === undefined : actual !== undefined) return false;
          break;
        case '$regex': {
          const pattern = expected instanceof RegExp ? expected : new RegExp(expected, expression.$options || '');
          if (!pattern.test(actual == null ? '' : String(actual))) return false;
          break;
        }
        case '$options':
          break; // consumed by $regex above
        default:
          // An operator we do not implement must not silently match everything.
          return false;
      }
    }
    return true;
  }

  /** True when `expression` is an operator object like { $in: [...] }. */
  _isOperatorExpression(expression) {
    return (
      expression !== null &&
      typeof expression === 'object' &&
      !Array.isArray(expression) &&
      !(expression instanceof Date) &&
      !(expression instanceof RegExp) &&
      typeof expression._bsontype !== 'string' && // an ObjectId is a value, not an expression
      Object.keys(expression).some((key) => key.startsWith('$'))
    );
  }

  _matches(doc, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;

    for (const [key, expected] of Object.entries(filter)) {
      if (key === '$or' || key === '$and' || key === '$nor') {
        const clauses = Array.isArray(expected) ? expected : [];
        const results = clauses.map((clause) => this._matches(doc, clause));
        if (key === '$or' && !results.some(Boolean)) return false;
        if (key === '$and' && !results.every(Boolean)) return false;
        if (key === '$nor' && results.some(Boolean)) return false;
        continue;
      }

      const actual = this._read(doc, key);

      if (this._isOperatorExpression(expected)) {
        if (!this._matchesOperators(actual, expected)) return false;
        continue;
      }

      if (expected instanceof RegExp) {
        if (!expected.test(actual == null ? '' : String(actual))) return false;
        continue;
      }

      // Mongo matches a scalar against an array field if the array contains it.
      if (Array.isArray(actual) && !Array.isArray(expected)) {
        if (!actual.some((one) => this._eq(one, expected))) return false;
        continue;
      }

      if (!this._eq(actual, expected)) return false;
    }

    return true;
  }

  /**
   * Sort across every key in the spec, not just the first one.
   *
   * The menu is ordered by `{ category: 1, sortOrder: 1, name: 1 }`; honouring
   * only `category` left items inside a category in insertion order. The old
   * comparator also never returned 0, which is an inconsistent comparator and
   * can make V8 throw on larger arrays.
   */
  _compare(a, b, sortObj) {
    for (const [key, direction] of Object.entries(sortObj)) {
      const dir = direction === -1 ? -1 : 1;
      const left = this._read(a, key);
      const right = this._read(b, key);
      if (left === right) continue;
      if (left === undefined || left === null) return 1;
      if (right === undefined || right === null) return -1;
      if (left < right) return -1 * dir;
      if (left > right) return 1 * dir;
    }
    return 0;
  }

  find(filter = {}) {
    const results = this.store.filter((doc) => this._matches(doc, filter));

    const cursor = (rows) => ({
      sort: (sortObj = {}) => cursor([...rows].sort((a, b) => this._compare(a, b, sortObj))),
      skip: (n) => cursor(rows.slice(Number(n) || 0)),
      limit: (n) => cursor(rows.slice(0, Number(n) || 0)),
      toArray: async () => rows
    });

    return cursor(results);
  }

  async findOne(filter = {}) {
    return this.store.find((doc) => this._matches(doc, filter)) || null;
  }

  async insertOne(doc) {
    const _id = doc._id || new ObjectId();
    const newDoc = { ...doc, _id };

    // Unique indexes must actually reject duplicates here. The Stripe webhook
    // relies on a duplicate-key error (code 11000) to detect a replayed event;
    // without it the same event is processed every time Stripe retries.
    for (const index of this._uniqueIndexes()) {
      const probe = {};
      for (const field of index) probe[field] = this._read(newDoc, field);
      if (Object.values(probe).every((value) => value === undefined)) continue;
      if (this.store.some((existing) => this._matches(existing, probe))) {
        const error = new Error(`E11000 duplicate key error collection: ${this.name}`);
        error.code = 11000;
        throw error;
      }
    }

    this.store.push(newDoc);
    return { insertedId: _id };
  }

  _uniqueIndexes() {
    if (!globalForMongo.__prevaIndexes) globalForMongo.__prevaIndexes = {};
    return globalForMongo.__prevaIndexes[this.name] || [];
  }

  /** Write a possibly-dotted path, creating intermediate objects. Mongo's
      $set treats 'payment.status' as a nested write; Object.assign treated it
      as a literal key named "payment.status", which left webhook updates
      (payment.status, payment.paymentIntentId, …) invisible in dev mode. */
  _write(doc, path, value) {
    const parts = path.split('.');
    let target = doc;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index];
      if (target[key] == null || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    }
    target[parts[parts.length - 1]] = value;
  }

  async updateOne(filter, update, options = {}) {
    let doc = this.store.find((d) => this._matches(d, filter));
    if (!doc && options.upsert) {
      doc = { _id: new ObjectId(), ...(filter.key ? { key: filter.key } : {}), ...(filter.slug ? { slug: filter.slug } : {}) };
      this.store.push(doc);
    }
    if (doc && update.$set) {
      for (const [key, value] of Object.entries(update.$set)) this._write(doc, key, value);
    }
    if (doc && update.$unset) {
      for (const key of Object.keys(update.$unset)) this._write(doc, key, undefined);
    }
    return { matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
  }

  async findOneAndUpdate(filter, update, options = {}) {
    let doc = this.store.find((d) => this._matches(d, filter));
    if (!doc && options.upsert) {
      doc = { _id: new ObjectId(), key: filter.key || 'order', value: 1000 };
      this.store.push(doc);
    }
    if (doc && update.$inc && update.$inc.value) {
      doc.value = (doc.value || 1000) + update.$inc.value;
    }
    return { value: doc };
  }

  async deleteOne(filter) {
    const idx = this.store.findIndex((d) => this._matches(d, filter));
    if (idx !== -1) {
      this.store.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async countDocuments(filter = {}) {
    return this.store.filter((d) => this._matches(d, filter)).length;
  }

  aggregate(pipeline = []) {
    let results = [...this.store];
    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter((d) => this._matches(d, stage.$match));
      }
      if (stage.$group) {
        const groupField = typeof stage.$group._id === 'string' && stage.$group._id.startsWith('$')
          ? stage.$group._id.slice(1)
          : stage.$group._id;
        const groups = {};
        for (const doc of results) {
          const key = doc[groupField] || 'Others';
          if (!groups[key]) {
            groups[key] = { _id: key, count: 0, image: doc.image || '' };
          }
          groups[key].count += 1;
        }
        results = Object.values(groups);
      }
      if (stage.$sort) {
        const sortKey = Object.keys(stage.$sort)[0];
        if (sortKey) {
          const dir = stage.$sort[sortKey] === -1 ? -1 : 1;
          results.sort((a, b) => ((a[sortKey] || '') > (b[sortKey] || '') ? dir : -dir));
        }
      }
    }
    return {
      toArray: async () => results
    };
  }

  async createIndex(keys = {}, options = {}) {
    if (options.unique) {
      if (!globalForMongo.__prevaIndexes) globalForMongo.__prevaIndexes = {};
      const list = globalForMongo.__prevaIndexes[this.name] || [];
      const fields = Object.keys(keys);
      if (!list.some((existing) => existing.join(',') === fields.join(','))) list.push(fields);
      globalForMongo.__prevaIndexes[this.name] = list;
    }
    return options.name || 'in_memory_index';
  }
}

function createClient() {
  const uri = getMongoUri();
  const isAtlas = uri.includes('mongodb+srv://');
  return new MongoClient(uri, {
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 20),
    minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
    // Atlas needs longer to do DNS SRV lookup + TLS on cold start.
    // 2 s was too aggressive — bump to 15 s for Atlas, keep 3 s for local.
    serverSelectionTimeoutMS: isAtlas ? 15000 : 3000,
    connectTimeoutMS: isAtlas ? 15000 : 3000,
    socketTimeoutMS: 30000
  });
}

export async function connectDatabase({ ensureIndexes = true } = {}) {
  if (globalForMongo.__prevaDb) return globalForMongo.__prevaDb;

  if (!globalForMongo.__prevaConnecting) {
    globalForMongo.__prevaConnecting = (async () => {
      try {
        const client = globalForMongo.__prevaClient || createClient();
        globalForMongo.__prevaClient = client;
        await client.connect();
        const database = client.db(getMongoDatabase());
        if (ensureIndexes) await createIndexes(database);
        globalForMongo.__prevaDb = database;
        return database;
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`MongoDB connection failed: ${error.message}`, { cause: error });
        }
        console.warn(`[db] MongoDB connection notice (${error.message}). Using built-in in-memory database store.`);
        globalForMongo.__prevaFallback = true;
        globalForMongo.__prevaDb = {
          collection: (name) => new InMemoryCollection(name)
        };
        // The fallback needs the same unique indexes as the real database, or
        // the Stripe webhook's replay protection silently does nothing here.
        if (ensureIndexes) await createIndexes(globalForMongo.__prevaDb);
        return globalForMongo.__prevaDb;
      }
    })();
  }

  return globalForMongo.__prevaConnecting;
}

export async function col(name) {
  const database = await connectDatabase();
  return database.collection(name);
}

export function asObjectId(value) {
  if (!value || !ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

export function serializeDocument(document) {
  if (!document || typeof document !== 'object') return document;
  const converted = { ...document };
  if (converted._id) {
    converted.id = converted._id.toString();
    delete converted._id;
  }
  return converted;
}

export const serialize = serializeDocument;

export function redactMongoUri(uri = getMongoUri()) {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return uri.replace(/:[^:@/]+@/, ':***@');
  }
}

export async function createIndexes(db) {
  const indexes = [
    ['users', { email: 1 }, { unique: true, name: 'users_email_unique' }],
    ['menuItems', { slug: 1 }, { unique: true, sparse: true, name: 'menu_items_slug_unique' }],

    /* ── payments ──────────────────────────────────────────────────────────
       The webhook detects a replayed Stripe event by inserting the event id
       and catching the duplicate-key error. Without a unique index that
       insert always succeeds, so every retry Stripe makes is treated as a new
       event — refunds get applied twice and paid orders get rewritten. This
       index is what makes that handler correct, not an optimisation. */
    ['stripeEvent', { eventId: 1 }, { unique: true, name: 'stripe_event_id_unique' }],

    // Every order lookup goes through one of these three.
    ['order', { orderNumber: 1 }, { unique: true, name: 'order_number_unique' }],
    ['order', { checkoutAttemptId: 1 }, { unique: true, sparse: true, name: 'order_checkout_attempt_unique' }],
    ['order', { stripeSessionId: 1 }, { sparse: true, name: 'order_stripe_session' }],
    ['order', { 'payment.paymentIntentId': 1 }, { sparse: true, name: 'order_payment_intent' }],
    ['order', { status: 1, createdAt: -1 }, { name: 'order_status_created' }],

    ['careerApplications', { status: 1, createdAt: -1 }, { name: 'career_status_created' }],
    ['careerApplications', { role: 1, createdAt: -1 }, { name: 'career_role_created' }],
    ['careerApplications', { email: 1 }, { name: 'career_email' }],
    ['careerApplications', { responseDueAt: 1, status: 1 }, { name: 'career_response_due' }],
    ['careerApplications', { 'interview.scheduledAt': 1 }, { name: 'career_interview_date' }],
    ['counters', { key: 1 }, { unique: true, name: 'counters_key_unique' }]
  ];

  for (const [collection, keys, options] of indexes) {
    try {
      if (db.collection) await db.collection(collection).createIndex(keys, options);
    } catch {
      // index exists
    }
  }
}

export async function nextOrderNumber() {
  const counters = await col('counters');
  const result = await counters.findOneAndUpdate(
    { key: 'order' },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const value = result?.value?.value ?? result?.value ?? 1001;
  return Number(typeof value === 'object' ? value.value : value);
}
