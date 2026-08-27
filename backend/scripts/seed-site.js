/**
 * Seed ALL website default data into MongoDB Atlas so the admin panel
 * reflects what the site currently shows (hardcoded defaults).
 *
 * Safe to re-run: everything upserts by key or slug.
 *
 * Usage:  node scripts/seed-site.js
 */
import './env.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || undefined);

/* ─── helper ─────────────────────────────────────────────────────────────── */
async function upsertMany(collectionName, docs, keyField = 'key') {
  const col = db.collection(collectionName);
  let count = 0;
  for (const doc of docs) {
    const filter = { [keyField]: doc[keyField] };
    await col.updateOne(
      filter,
      { $set: { ...doc, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    count++;
  }
  console.log(`  ✓ ${count} docs seeded in '${collectionName}'`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. SETTINGS
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[1/5] Settings...');
await upsertMany('setting', [
  { key: 'siteTitle',               value: 'Preva Nightclub & Restaurant' },
  { key: 'siteTagline',             value: "Detroit's Most Exclusive Dining-to-Nightlife Destination" },
  { key: 'siteUrl',                 value: process.env.NEXT_PUBLIC_SITE_URL || 'https://prevakitchen.com' },
  { key: 'contactEmail',            value: 'info@prevaclub.com' },
  { key: 'contactPhone',            value: '' },
  { key: 'contactAddress',          value: 'Detroit, Michigan' },
  { key: 'socialInstagram',         value: 'https://instagram.com/prevaclub' },
  { key: 'shopOrderingEnabled',     value: true },
  { key: 'shopPickupEnabled',       value: true },
  { key: 'shopDeliveryEnabled',     value: true },
  { key: 'shopTaxRate',             value: 0.06 },
  { key: 'shopDeliveryFeeCents',    value: 499 },
  { key: 'shopFreeDeliveryOverCents', value: 5000 },
  { key: 'shopMinOrderCents',       value: 1500 },
  { key: 'shopPickupMinutes',       value: 25 },
  { key: 'shopDeliveryMinutes',     value: 45 },
  { key: 'shopTipPresets',          value: [15, 18, 20] },
  { key: 'shopClosedMessage',       value: 'Online ordering is closed right now. The kitchen reopens at 11am.' }
]);

/* ═══════════════════════════════════════════════════════════════════════════
   2. CONTENT SECTIONS  (what Site Sections in admin reads/writes)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[2/5] Content sections...');
const SECTIONS = [
  {
    key: 'home_hero',
    title: 'Home — Hero',
    visible: true,
    data: {
      headline: "DETROIT'S MOST EXCLUSIVE\nDINING-TO-NIGHTLIFE DESTINATION",
      subhead: "Luxury dining by day. High-energy nightlife by night.\nOne destination. One standard.",
      supportingText: "Chef-driven cuisine, signature cocktails, top-tier DJs, and VIP experiences — all under one roof.",
      videoUrl: '',
      slides: [
        'https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80'
      ]
    }
  },
  {
    key: 'home_about',
    title: 'Home — About',
    visible: true,
    data: {
      eyebrow: 'ABOUT PREVA',
      title: 'The Preva Experience',
      description: "Preva defies convention by seamlessly blending two worlds. By day, we are a sanctuary of culinary excellence, offering a chef-driven menu in an upscale, modern setting.\n\nAs the sun sets, the energy shifts. Preva transforms into Detroit's most exclusive nightlife destination, featuring state-of-the-art sound & lighting and world-class entertainment.",
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80'
    }
  },
  {
    key: 'home_culinary',
    title: 'Home — Culinary',
    visible: true,
    data: {}
  },
  {
    key: 'home_kitchen',
    title: 'Home — Kitchen',
    visible: true,
    data: {
      eyebrow: 'PREVA KITCHEN',
      title: 'Chef-Driven Cuisine',
      description: 'Our culinary team crafts every dish with premium ingredients and bold flavors. From our signature wings to artisan burgers, every bite reflects our commitment to excellence.',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
      ctaLabel: 'View Full Menu',
      ctaUrl: '/preva-kitchen-menu'
    }
  },
  {
    key: 'home_order',
    title: 'Home — Order Online',
    visible: true,
    data: {
      eyebrow: 'ORDER ONLINE',
      title: 'Preva Kitchen, Ready When You Are',
      description: 'Choose pickup or delivery and enjoy Preva Kitchen wherever the day takes you. Browse the direct menu or select your preferred ordering platform.',
      primaryLabel: 'Choose Order Option',
      secondaryLabel: 'View Online Menu',
      image: '/asset/hero/preva-pasta-hero.jpg'
    }
  },
  {
    key: 'home_nightlife',
    title: 'Home — Nightlife',
    visible: true,
    data: {
      eyebrow: 'NIGHTLIFE',
      title: 'Where Detroit Comes Alive',
      description: "As the sun sets, Preva transforms. State-of-the-art sound systems, premium lighting, and top-tier DJs create an atmosphere unlike anywhere else in Detroit. Reserve your VIP table and experience the night.",
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=80',
      ctaLabel: 'Book VIP Table',
      ctaUrl: '#reservations'
    }
  },
  {
    key: 'reservations',
    title: 'Reservations',
    visible: true,
    data: {}
  },
  {
    key: 'gallery',
    title: 'Gallery',
    visible: true,
    data: {}
  },
  {
    key: 'testimonials',
    title: 'Testimonials / Reviews',
    visible: true,
    data: {
      list: [
        {
          id: '1',
          author: 'Marcus T.',
          rating: 5,
          text: 'Best spot in Detroit! The wings are incredible and the nightlife experience is unmatched. VIP bottle service was top tier.',
          date: '2026-06-15'
        },
        {
          id: '2',
          author: 'Jasmine R.',
          rating: 5,
          text: "Came for dinner, stayed for the party. The food quality is restaurant-level and the DJ set was 🔥. Preva does it all perfectly.",
          date: '2026-05-28'
        },
        {
          id: '3',
          author: 'Devon M.',
          rating: 5,
          text: 'Celebrated my birthday here and it was unforgettable. The staff, the food, the atmosphere — 10/10 would recommend.',
          date: '2026-06-02'
        }
      ]
    }
  }
];

await upsertMany('contentSections', SECTIONS);

/* ═══════════════════════════════════════════════════════════════════════════
   3. MENU ITEMS  (Food Menu in admin)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[3/5] Menu items...');
const MENU = [
  {
    "name": "Preva Wings",
    "slug": "preva-wings",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "PREVA's signature crispy jumbo wings, tossed in your choice of house sauce — honey hot, buffalo, BBQ, sweet chili, garlic parmesan, lemon pepper or jerk.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaWings-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "Signature",
    "sortOrder": 1
  },
  {
    "name": "Preva Wings Chilli",
    "slug": "preva-wings-chilli",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Wings coated in sweet chili sauce with a mild, bright finish.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaWingsChilli-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "",
    "sortOrder": 2
  },
  {
    "name": "Honey Hot",
    "slug": "honey-hot",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Crispy jumbo wings tossed in hot honey — sweet heat with a sticky glaze.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/hot_honey_wings.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "",
    "sortOrder": 3
  },
  {
    "name": "Buffalo",
    "slug": "buffalo",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Classic buffalo wings in tangy cayenne sauce, served with ranch.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/buffalo_wings.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "",
    "sortOrder": 4
  },
  {
    "name": "BBQ",
    "slug": "bbq",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Smoky barbecue wings, slow-glazed and finished on the grill.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/bbq_wings_preva.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "",
    "sortOrder": 5
  },
  {
    "name": "Garlic Parmesan",
    "slug": "garlic-parmesan",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Wings tossed in garlic butter and finished with shaved parmesan.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Garlic-Parmesan.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "",
    "sortOrder": 6
  },
  {
    "name": "Lemon Pepper",
    "slug": "lemon-pepper",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Crisp wings seasoned with cracked black pepper and fresh lemon zest.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Lemon-Pepper.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 7
  },
  {
    "name": "Jerk",
    "slug": "jerk",
    "category": "Preva Wings",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Caribbean jerk wings marinated in house spice and grilled hot.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Jerk-wings.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 8
  },
  {
    "name": "Preva Burger",
    "slug": "preva-burger",
    "category": "Preva Burger",
    "price": "$15.50",
    "priceCents": 1550,
    "description": "PREVA's signature cheeseburger — American cheese, lettuce, tomato, red onion and pickles on a toasted bun.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaBurger-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 9
  },
  {
    "name": "Preva Double Smash Burger",
    "slug": "preva-double-smash-burger",
    "category": "Preva Burger",
    "price": "$11.49",
    "priceCents": 1149,
    "description": "Two smash patties, two slices of American cheese, thousand island, served with fries.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaDoubleSmashBurger-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 10
  },
  {
    "name": "Preva Quesadillas",
    "slug": "preva-quesadillas",
    "category": "Quesadillas",
    "price": "$17.49",
    "priceCents": 1749,
    "description": "Flour tortilla grilled with melted cheese, house seasoning and your choice of chicken or beef, served with sour cream and salsa.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaQuesadilla-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 11
  },
  {
    "name": "Chicken Quesadillas",
    "slug": "chicken-quesadillas",
    "category": "Quesadillas",
    "price": "$17.49",
    "priceCents": 1749,
    "description": "Seasoned chicken and melted cheese grilled in a flour tortilla, served with sour cream and salsa.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Chicken-Tacos.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 12
  },
  {
    "name": "Steak Quesadilla",
    "slug": "steak-quesadilla",
    "category": "Quesadillas",
    "price": "$18.50",
    "priceCents": 1850,
    "description": "Grilled steak, melted cheese, peppers and onions, served with sour cream and salsa.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Steak-Quesadilla.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 13
  },
  {
    "name": "Shrimp Quesadillas",
    "slug": "shrimp-quesadillas",
    "category": "Quesadillas",
    "price": "$18.50",
    "priceCents": 1850,
    "description": "Seasoned shrimp, melted cheese, peppers and onions, served with sour cream and salsa.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Shrimp-Quesadillas.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 14
  },
  {
    "name": "Beef Quesadillas",
    "slug": "beef-quesadillas",
    "category": "Quesadillas",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Seasoned beef and melted cheese grilled in a flour tortilla, served with sour cream and salsa.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Beef-Quesadillas.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 15
  },
  {
    "name": "Veggie Quesadilla",
    "slug": "veggie-quesadilla",
    "category": "Quesadillas",
    "price": "$14.49",
    "priceCents": 1449,
    "description": "Grilled peppers, onions and melted cheese in a flour tortilla, served with sour cream and salsa.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Veggie-Quesadilla.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 16
  },
  {
    "name": "Shrimp Tacos",
    "slug": "shrimp-tacos",
    "category": "Tacos",
    "price": "$17.50",
    "priceCents": 1750,
    "description": "Seasoned shrimp tacos topped with fresh slaw and house sauce.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/ShrimpTacos-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 17
  },
  {
    "name": "Steak Tacos",
    "slug": "steak-tacos",
    "category": "Tacos",
    "price": "$17.50",
    "priceCents": 1750,
    "description": "Seasoned steak tacos topped with fresh slaw and house sauce.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/SteakTacos-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 18
  },
  {
    "name": "Chicken Tacos",
    "slug": "chicken-tacos",
    "category": "Tacos",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Seasoned chicken tacos topped with fresh slaw and house sauce.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Chicken-Tacos-1.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 19
  },
  {
    "name": "Preva Catfish",
    "slug": "preva-catfish",
    "category": "Preva Bites",
    "price": "$15.50",
    "priceCents": 1550,
    "description": "Seasoned fried catfish bites served hot and crispy.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaCatfish-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 20
  },
  {
    "name": "Preva Lobster",
    "slug": "preva-lobster",
    "category": "Preva Bites",
    "price": "$21.50",
    "priceCents": 2150,
    "description": "Tender lobster bites fried golden and served with house sauce.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaLobster-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "",
    "sortOrder": 21
  },
  {
    "name": "Preva Steak Bites",
    "slug": "preva-steak-bites",
    "category": "Preva Bites",
    "price": "$19.50",
    "priceCents": 1950,
    "description": "Seasoned steak bites grilled and finished with garlic butter.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaSteakBites-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 22
  },
  {
    "name": "Veggie Pasta",
    "slug": "veggie-pasta",
    "category": "Pasta",
    "price": "$16.50",
    "priceCents": 1650,
    "description": "Creamy pasta with sauteed peppers, onions and seasonal vegetables.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Veggie-Pasta-768x614.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 23
  },
  {
    "name": "Rasta Pasta",
    "slug": "rasta-pasta",
    "category": "Pasta",
    "price": "$22.00",
    "priceCents": 2200,
    "description": "Creamy Caribbean-style pasta with bell peppers and house jerk seasoning. Choose your protein when you order.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 24
  },
  {
    "name": "House Salad",
    "slug": "house-salad",
    "category": "Salads",
    "price": "$8.29",
    "priceCents": 829,
    "description": "Crisp mixed greens with tomato, red onion and cucumber.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/house-salad.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 25
  },
  {
    "name": "Preva Lamb Chops",
    "slug": "preva-lamb-chops",
    "category": "Entrées",
    "price": "$33.50",
    "priceCents": 3350,
    "description": "Grilled lamb chops seasoned with PREVA house spices and served with choice of sides.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/prevaLamb-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": true,
    "badge": "Luxury Entrée",
    "sortOrder": 26
  },
  {
    "name": "Catfish Bites with Fries",
    "slug": "catfish-bites-with-fries",
    "category": "Entrées",
    "price": "$26.50",
    "priceCents": 2650,
    "description": "A full plate of seasoned catfish bites served with a side of fries.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Catfish-Bites-with-Fries.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 27
  },
  {
    "name": "Preva Mac and Cheese",
    "slug": "preva-mac-and-cheese",
    "category": "Sides",
    "price": "$7.50",
    "priceCents": 750,
    "description": "Baked macaroni in a blend of melted cheeses.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaMac-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 28
  },
  {
    "name": "Collard Greens with Turkey Meat",
    "slug": "collard-greens-with-turkey-meat",
    "category": "Sides",
    "price": "$7.50",
    "priceCents": 750,
    "description": "Slow-simmered collard greens cooked with smoked turkey.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaGreens-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 29
  },
  {
    "name": "Preva Yams",
    "slug": "preva-yams",
    "category": "Sides",
    "price": "$7.50",
    "priceCents": 750,
    "description": "Candied yams baked soft in a brown sugar glaze.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/PrevaYams-768x768.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 30
  },
  {
    "name": "Fries",
    "slug": "fries",
    "category": "Sides",
    "price": "$6.50",
    "priceCents": 650,
    "description": "Golden seasoned fries, fried crisp to order.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Fries.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 31
  },
  {
    "name": "Rice & Peas",
    "slug": "rice-peas",
    "category": "Sides",
    "price": "$5.50",
    "priceCents": 550,
    "description": "Caribbean rice simmered with kidney beans and coconut.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Rice-and-Peas.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 32
  },
  {
    "name": "Fried Plantains",
    "slug": "fried-plantains",
    "category": "Sides",
    "price": "$6.50",
    "priceCents": 650,
    "description": "Sweet plantains fried golden and caramelised at the edges.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Fried-Plantains.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 33
  },
  {
    "name": "Steamed Cabbage",
    "slug": "steamed-cabbage",
    "category": "Sides",
    "price": "$5.50",
    "priceCents": 550,
    "description": "Lightly seasoned cabbage steamed until tender.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/Steamed-Cabbage.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 34
  },
  {
    "name": "Red Wine Poached Pear",
    "slug": "red-wine-poached-pear",
    "category": "Dessert",
    "price": "$11.50",
    "priceCents": 1150,
    "description": "Pear gently poached in spiced red wine.",
    "image": "https://prevaclub.com/wp-content/uploads/2026/08/red-wine-poached-pear.webp",
    "available": true,
    "orderable": true,
    "featured": false,
    "badge": "",
    "sortOrder": 35
  }
];

const menuCol = db.collection('menuItems');
try { await menuCol.createIndex({ slug: 1 }, { unique: true, sparse: true }); } catch {}
let menuCount = 0;
for (const item of MENU) {
  const now = new Date();
  await menuCol.updateOne(
    { slug: item.slug },
    { $set: { ...item, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );
  menuCount++;
}
console.log(`  ✓ ${menuCount} menu items seeded`);

/* ═══════════════════════════════════════════════════════════════════════════
   4. GALLERY
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[4/5] Gallery...');
const galleriesCol = db.collection('galleries');
const existingGallery = await galleriesCol.findOne({ slug: 'preva-highlights' });
if (!existingGallery) {
  await galleriesCol.insertOne({
    title: 'Preva Highlights',
    name: 'Preva Highlights',
    slug: 'preva-highlights',
    description: 'A visual tour of Preva Kitchen & Nightclub.',
    status: 'PUBLISHED',
    visible: true,
    images: [
      { url: 'https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg', caption: 'Preva Kitchen Atmosphere', alt: 'Preva Kitchen' },
      { url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', caption: 'Signature Steak Bites', alt: 'Steak Bites' },
      { url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80', caption: 'Wild Lobster Bites', alt: 'Lobster Bites' },
      { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', caption: 'Exclusive Lounge & VIP', alt: 'VIP Lounge' },
      { url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80', caption: 'Vibrant Light & DJ Setups', alt: 'Nightlife' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('  ✓ 1 gallery seeded');
} else {
  // Update existing gallery to add status: PUBLISHED
  await galleriesCol.updateOne(
    { slug: 'preva-highlights' },
    { $set: { status: 'PUBLISHED', visible: true, updatedAt: new Date() } }
  );
  console.log('  ↷ gallery already exists, updated status to PUBLISHED');
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. SERVICES
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[5/5] Services...');
const SERVICES = [
  {
    key: 'vip-table-service',
    slug: 'vip-table-service',
    title: 'VIP Table Service',
    name: 'VIP Table Service',
    excerpt: 'Reserve your exclusive table with dedicated hosts, premium bottle service, and a curated VIP experience.',
    icon: 'Star',
    status: 'PUBLISHED',
    visible: true,
    sortOrder: 1
  },
  {
    key: 'private-events',
    slug: 'private-events',
    title: 'Private Events',
    name: 'Private Events',
    excerpt: 'Host your birthday, corporate event, or celebration in our exclusive private event spaces.',
    icon: 'Calendar',
    status: 'PUBLISHED',
    visible: true,
    sortOrder: 2
  },
  {
    key: 'dining-reservations',
    slug: 'dining-reservations',
    title: 'Dining Reservations',
    name: 'Dining Reservations',
    excerpt: "Book your table at Preva Kitchen and enjoy chef-driven cuisine in Detroit's most upscale setting.",
    icon: 'UtensilsCrossed',
    status: 'PUBLISHED',
    visible: true,
    sortOrder: 3
  },
  {
    key: 'online-ordering',
    slug: 'online-ordering',
    title: 'Online Ordering',
    name: 'Online Ordering',
    excerpt: 'Order Preva Kitchen favorites for pickup or delivery. Fresh, hot, and straight from our kitchen.',
    icon: 'ShoppingBag',
    status: 'PUBLISHED',
    visible: true,
    sortOrder: 4
  }
];
await upsertMany('services', SERVICES, 'slug');

/* ═══════════════════════════════════════════════════════════════════════════
   6. NAVIGATION MENUS
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[6/6] Navigation menus...');
const MENUS = [
  {
    location: 'primary',
    name: 'Primary Navigation',
    items: [
      { title: 'Dining',       label: 'Dining',       url: '/#prv-reservations', target: '_self', openInNewTab: false, visible: true, children: [] },
      { title: 'Nightlife',    label: 'Nightlife',    url: '/#nightlife',        target: '_self', openInNewTab: false, visible: true, children: [] },
      { title: 'Reservations', label: 'Reservations', url: '/#prv-reservations', target: '_self', openInNewTab: false, visible: true, children: [] },
      { title: 'Kitchen',      label: 'Kitchen',      url: '/preva-kitchen',     target: '_self', openInNewTab: false, visible: true, children: [] },
      { title: 'Menu',         label: 'Menu',         url: '/preva-kitchen-menu', target: '_self', openInNewTab: false, visible: true, children: [] },
      { title: 'Blog',         label: 'Blog',         url: '/blog',              target: '_self', openInNewTab: false, visible: true, children: [] },
      { title: 'Careers',      label: 'Careers',      url: '/careers',           target: '_self', openInNewTab: false, visible: true, children: [] },
      { title: 'Contact Us',   label: 'Contact Us',   url: '/contact',           target: '_self', openInNewTab: false, visible: true, children: [] }
    ]
  },
  {
    location: 'footer',
    name: 'Footer Navigation',
    items: [
      { label: 'Preva Kitchen',    url: '/preva-kitchen-menu',     target: '_self', children: [] },
      { label: 'Nightlife',        url: '/nightlife',              target: '_self', children: [] },
      { label: 'Gallery',          url: '/#gallery',               target: '_self', children: [] },
      { label: 'Services',         url: '/services',               target: '_self', children: [] },
      { label: 'Careers',          url: '/careers',                target: '_self', children: [] },
      { label: 'Contact',          url: '/contact',                target: '_self', children: [] },
      { label: 'Privacy Policy',   url: '/privacy',                target: '_self', children: [] }
    ]
  },
  {
    location: 'kitchen-quick',
    name: 'Kitchen Quick Links',
    items: [
      { label: 'Order Online',     url: '/order',                  target: '_self', children: [] },
      { label: 'View Full Menu',   url: '/preva-kitchen-menu',     target: '_self', children: [] },
      { label: 'Reservations',     url: '/#reservations',          target: '_self', children: [] }
    ]
  }
];
await upsertMany('menus', MENUS, 'location');

console.log('\n✅ All done! MongoDB Atlas is now seeded with all website data.\n');
await client.close();
