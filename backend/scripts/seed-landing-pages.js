/**
 * Seed 52 Event & Venue Landing Pages into MongoDB.
 *
 * Each page is a CMS 'content' document with type: 'PAGE' and status: 'PUBLISHED'.
 * The existing [slug]/page.js + /api/pages/:slug route renders them automatically.
 *
 * Safe to re-run — upserts by slug.
 *
 * Usage:  node scripts/seed-landing-pages.js
 */
import './env.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || undefined);
const col = db.collection('content');

/* ─── Index ─────────────────────────────────────────────────────────────── */
try {
  await col.createIndex({ slug: 1 }, { unique: true, sparse: true });
} catch { /* already exists */ }

/* ─── Helper ─────────────────────────────────────────────────────────────── */
async function upsertPage(doc) {
  const now = new Date();
  await col.updateOne(
    { slug: doc.slug },
    {
      $set: { ...doc, updatedAt: now },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );
}

/**
 * Build a full page document with rich PageBuilder sections.
 * @param {object} cfg
 */
function page({
  slug,
  title,
  metaTitle,
  metaDesc,
  category,         // e.g. "Life Events"
  tag,              // inquiry dropdown value in contact form
  heroImage,
  heroHeadline,
  heroSubhead,
  ctaLabel,
  ctaUrl,
  description,
  features = [],   // bullet list of venue features
  formSource,
}) {
  const cta = ctaUrl || `/contact?inquiry=${tag}&source=${slug}`;
  return {
    type: 'PAGE',
    status: 'PUBLISHED',
    slug,
    title,
    name: title,
    metaTitle: metaTitle || `${title} | Preva Club & Kitchen`,
    metaDescription: metaDesc,
    seoTitle: metaTitle || `${title} | Preva Club & Kitchen`,
    seoDescription: metaDesc,
    featuredImage: heroImage,
    ogImage: heroImage,
    canonicalUrl: `https://prevaclub.com/${slug}`,
    landingCategory: category,
    sections: [
      /* ── 1. Banner / Hero ── */
      {
        id: `${slug}-hero`,
        type: 'banner',
        enabled: true,
        data: {
          image: heroImage,
          headline: heroHeadline,
          subhead: heroSubhead,
          overlay: 0.62,
          align: 'center',
          ctaLabel: ctaLabel || 'Book This Event',
          ctaUrl: cta,
          ctaStyle: 'gold',
        }
      },
      /* ── 2. Text / Description ── */
      {
        id: `${slug}-desc`,
        type: 'text',
        enabled: true,
        data: {
          html: `<p style="font-size:1.15rem;line-height:1.85;color:#ccc;max-width:820px;margin:0 auto;">${description}</p>`
        }
      },
      /* ── 3. Feature bullets (columns) ── */
      ...(features.length > 0 ? [{
        id: `${slug}-features`,
        type: 'columns',
        enabled: true,
        data: {
          cols: features.map(f => ({
            icon: f.icon || '✦',
            heading: f.heading,
            body: f.body
          }))
        }
      }] : []),
      /* ── 4. CTA Strip ── */
      {
        id: `${slug}-cta`,
        type: 'cta',
        enabled: true,
        data: {
          headline: `Ready to Book Your ${title}?`,
          subhead: 'Contact us and we\'ll confirm availability within 2 hours.',
          ctaLabel: ctaLabel || 'Get In Touch',
          ctaUrl: cta,
          theme: 'dark'
        }
      }
    ],
    content: `<p>${description}</p>`,
    formSource: formSource || slug,
    noIndex: false,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGES — Curated Unsplash photos per category
   ═══════════════════════════════════════════════════════════════════════════ */
const IMG = {
  wedding:       'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80',
  engagement:    'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1400&q=80',
  quince:        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1400&q=80',
  birthday:      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=80',
  baby_shower:   'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=1400&q=80',
  graduation:    'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?auto=format&fit=crop&w=1400&q=80',
  anniversary:   'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80',
  repast:        'https://images.unsplash.com/photo-1585384023462-475978a56a73?auto=format&fit=crop&w=1400&q=80',
  cultural:      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1400&q=80',
  prom:          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80',
  corporate:     'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80',
  meeting:       'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80',
  catering:      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80',
  teambuilding:  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80',
  networking:    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80',
  launch:        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1400&q=80',
  nonprofit:     'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1400&q=80',
  vendor:        'https://images.unsplash.com/photo-1472653431158-6364773b2a56?auto=format&fit=crop&w=1400&q=80',
  community:     'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1400&q=80',
  nightclub:     'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=80',
  vip:           'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1400&q=80',
  promoter:      'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?auto=format&fit=crop&w=1400&q=80',
  theme_night:   'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1400&q=80',
  holiday:       'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&w=1400&q=80',
  buyout:        'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=1400&q=80',
  patio:         'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80',
  cookout:       'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80',
  food_truck:    'https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=1400&q=80',
  sports:        'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?auto=format&fit=crop&w=1400&q=80',
  sunday_fun:    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80',
  car_show:      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80',
  group:         'https://images.unsplash.com/photo-1529543544282-ea669407fca3?auto=format&fit=crop&w=1400&q=80',
  rewards:       'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1400&q=80',
  rebook:        'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=80',
  vendor_net:    'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80',
  corporate_acc: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80',
  referral:      'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80',
};

/* ═══════════════════════════════════════════════════════════════════════════
   SET A — LIFE EVENTS & CELEBRATIONS (Pages 1–10)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[Set A] Life Events & Celebrations...');

const setA = [
  page({
    slug: 'weddings',
    title: 'Wedding Receptions',
    metaTitle: 'Wedding Venue in Redford MI | Preva Club & Kitchen',
    metaDesc: 'Host your wedding reception at Preva Club & Kitchen in Redford, MI. Full-venue receptions for up to 700 guests with in-house catering, bar, and patio ceremony options.',
    category: 'Life Events',
    tag: 'wedding',
    heroImage: IMG.wedding,
    heroHeadline: 'YOUR PERFECT WEDDING RECEPTION',
    heroSubhead: 'Full-venue receptions for up to 700 guests · In-house catering · Patio ceremony options',
    ctaLabel: 'Request a Venue Tour',
    description: 'Preva Club & Kitchen offers an unmatched wedding reception experience in Metro Detroit. With capacity for up to 700 guests, a full-service in-house kitchen, premium bar service, 16 VIP booths, and a stunning 4,400 sq ft outdoor patio — your wedding day becomes truly unforgettable. Our dedicated events team handles every detail, from the ceremony setup to the last dance.',
    features: [
      { icon: '👥', heading: '700 Guest Capacity', body: 'Full venue receptions, seated or cocktail style' },
      { icon: '🍽', heading: 'In-House Catering', body: 'Custom wedding menus crafted by our culinary team' },
      { icon: '🥂', heading: 'Premium Bar Service', body: 'Open bar packages, signature cocktails & bottle service' },
      { icon: '🌿', heading: '4,400 Sq Ft Patio', body: 'Outdoor ceremony & reception space, day or night' },
    ],
    formSource: 'wedding-landing',
  }),

  page({
    slug: 'engagement-parties',
    title: 'Engagement & Bridal Showers',
    metaTitle: 'Engagement Party Venue Redford MI | Preva Club & Kitchen',
    metaDesc: 'Celebrate your engagement or bridal shower at Preva in Redford MI. Elegant half-venue bookings with plated dinners, bridal shower packages, and rehearsal dinners.',
    category: 'Life Events',
    tag: 'engagement',
    heroImage: IMG.engagement,
    heroHeadline: 'CELEBRATE YOUR LOVE STORY',
    heroSubhead: 'Elegant engagement parties · Bridal showers · Rehearsal dinners',
    ctaLabel: 'Plan Your Engagement Party',
    description: 'From intimate bridal showers to lavish engagement celebrations, Preva Club & Kitchen creates the perfect backdrop. Our half-venue bookings offer the ideal space for 50–200 guests, complete with custom décor options, plated dinner service, and dedicated event staff. Let us help you celebrate this milestone in style.',
    features: [
      { icon: '💍', heading: 'Half-Venue Bookings', body: 'Perfect for 50–200 guests, day or evening' },
      { icon: '🌸', heading: 'Bridal Shower Packages', body: 'Custom menus, décor themes, and mimosa packages' },
      { icon: '🎉', heading: 'Rehearsal Dinners', body: 'Elegant plated dinners for the night before' },
      { icon: '📸', heading: 'Photo-Ready Spaces', body: 'Beautifully lit venue perfect for lasting memories' },
    ],
    formSource: 'engagement-landing',
  }),

  page({
    slug: 'quinceañeras-sweet-16s',
    title: 'Quinceañeras & Sweet 16s',
    metaTitle: 'Quinceañera & Sweet 16 Venue Redford MI | Preva Club',
    metaDesc: 'Grand Quinceañera and Sweet 16 celebrations at Preva Club in Redford MI. Dance floor, stage lighting, DJ packages, and dressing rooms for the perfect celebration.',
    category: 'Life Events',
    tag: 'quince',
    heroImage: IMG.quince,
    heroHeadline: 'HER NIGHT TO SHINE',
    heroSubhead: 'Grand entrance packages · Dance floor · Stage lighting · DJ ready',
    ctaLabel: 'Reserve Your Celebration',
    description: 'Make her Quinceañera or Sweet 16 the event of a lifetime at Preva Club & Kitchen. We offer grand entrance packages with dramatic stage lighting, a professional dance floor, DJ-ready sound system, dressing rooms, and custom catering — everything needed for a celebration that everyone will remember for years to come.',
    features: [
      { icon: '👑', heading: 'Grand Entrance Setup', body: 'Dramatic stage, lighting, and red carpet arrival' },
      { icon: '🎵', heading: 'DJ-Ready Sound', body: 'Professional sound system, DJ booth & dance floor' },
      { icon: '💄', heading: 'Dressing Rooms', body: 'Private prep spaces for the guest of honor' },
      { icon: '🎂', heading: 'Custom Catering', body: 'Buffet, plated, or family-style — your choice' },
    ],
    formSource: 'quince-landing',
  }),

  page({
    slug: 'birthday-parties',
    title: 'Birthday Parties & VIP Booths',
    metaTitle: 'Birthday Party Venue Redford MI | VIP Birthday Booths | Preva Club',
    metaDesc: 'VIP birthday party packages at Preva Club in Redford MI. Bottle service, reserved VIP booths, free-entry birthday nights, and full birthday packages.',
    category: 'Life Events',
    tag: 'birthday',
    heroImage: IMG.birthday,
    heroHeadline: 'MAKE YOUR BIRTHDAY LEGENDARY',
    heroSubhead: 'VIP booth packages · Bottle service · Free-entry birthday nights',
    ctaLabel: 'Book a Birthday Booth',
    description: 'Your birthday deserves the VIP treatment at Preva Club & Kitchen. Choose from our exclusive VIP booth packages with dedicated bottle service, priority entry, and personal hostess. Whether you want an intimate dinner birthday or a full nightclub takeover, we have the perfect package for your celebration.',
    features: [
      { icon: '🥂', heading: 'Bottle Service', body: 'Premium bottles, mixers, and dedicated booth hostess' },
      { icon: '🎂', heading: 'Birthday Perks', body: 'Free entry for birthday guest on select nights' },
      { icon: '📸', heading: 'Photo Booth Access', body: 'Complimentary photo ops with birthday setup' },
      { icon: '🎵', heading: 'DJ Shoutout', body: 'Special birthday announcement from our resident DJ' },
    ],
    formSource: 'birthday-landing',
  }),

  page({
    slug: 'baby-showers',
    title: 'Baby Showers & Gender Reveals',
    metaTitle: 'Baby Shower Venue Redford MI | Gender Reveal Party | Preva Club',
    metaDesc: 'Bright, elegant baby shower and gender reveal parties at Preva Club in Redford MI. Buffet catering, décor access, and reveal-moment staging.',
    category: 'Life Events',
    tag: 'baby-shower',
    heroImage: IMG.baby_shower,
    heroHeadline: 'CELEBRATE THE NEW ARRIVAL',
    heroSubhead: 'Daytime elegance · Buffet catering · Décor access · Reveal staging',
    ctaLabel: 'Check Your Date',
    description: 'Preva Club & Kitchen transforms into a bright, beautiful celebration space for your baby shower or gender reveal. Our daytime event packages include full buffet catering, venue décor access, reveal-moment staging, and a dedicated event coordinator — making your special announcement perfect in every way.',
    features: [
      { icon: '🌟', heading: 'Daytime Packages', body: 'Morning and afternoon slots available 7 days/week' },
      { icon: '🍽', heading: 'Buffet Catering', body: 'Full service buffet with custom menu selections' },
      { icon: '🎈', heading: 'Décor Access', body: 'Balloon arches, table settings, and reveal staging' },
      { icon: '📍', heading: 'Indoor Setting', body: 'Climate-controlled, beautifully lit indoor space' },
    ],
    formSource: 'babyshower-landing',
  }),

  page({
    slug: 'graduation-parties',
    title: 'Graduation Parties',
    metaTitle: 'Graduation Party Venue Redford MI | Preva Club & Kitchen',
    metaDesc: 'Celebrate graduation at Preva Club in Redford MI. High school and college grad parties with patio, DJ, and catered buffet tiers for every budget.',
    category: 'Life Events',
    tag: 'graduation',
    heroImage: IMG.graduation,
    heroHeadline: 'CELEBRATE THE ACHIEVEMENT',
    heroSubhead: 'Grad party packages · Indoor & outdoor · DJ & catering tiers',
    ctaLabel: 'Get a Grad Party Quote',
    description: 'Mark the milestone with a graduation party at Preva Club & Kitchen. We offer tailored packages for high school and college graduates — from intimate dinners for 30 to full venue celebrations for 300+. With our outdoor patio, DJ-ready sound system, and catering packages for every budget, your grad will feel like a star.',
    features: [
      { icon: '🎓', heading: 'Grad Party Packages', body: 'High school and college packages starting at any size' },
      { icon: '🌿', heading: 'Patio Access', body: 'Indoor + outdoor combo for summer grad parties' },
      { icon: '🎵', heading: 'DJ Entertainment', body: 'DJ packages available for evening celebrations' },
      { icon: '🍽', heading: 'Buffet Tiers', body: 'Catered buffet options for every group and budget' },
    ],
    formSource: 'graduation-landing',
  }),

  page({
    slug: 'anniversaries-vow-renewals',
    title: 'Anniversaries & Vow Renewals',
    metaTitle: 'Anniversary Party Venue Redford MI | Vow Renewals | Preva Club',
    metaDesc: 'Intimate anniversary dinners and vow renewal events at Preva Club in Redford MI. Dinner-style events with plated or buffet service for any milestone.',
    category: 'Life Events',
    tag: 'anniversary',
    heroImage: IMG.anniversary,
    heroHeadline: 'HONOR YOUR LOVE STORY',
    heroSubhead: 'Intimate anniversary dinners · Vow renewals · Plated & buffet service',
    ctaLabel: 'Plan Your Anniversary',
    description: 'Whether celebrating your 5th or 50th anniversary, Preva Club & Kitchen creates the perfect intimate setting for your milestone. Our anniversary and vow renewal packages feature dinner-style events with plated or buffet service, premium bar packages, personalized décor touches, and dedicated staff to make every moment feel special.',
    features: [
      { icon: '💑', heading: 'Intimate Settings', body: 'Private dining and semi-private areas available' },
      { icon: '🕯', heading: 'Elegant Ambiance', body: 'Candlelit, romantic atmosphere for your occasion' },
      { icon: '🍷', heading: 'Wine & Bar Packages', body: 'Curated wine lists and signature cocktail options' },
      { icon: '🎶', heading: 'Live Music Options', body: 'Live pianist, jazz duo, or DJ available to book' },
    ],
    formSource: 'anniversary-landing',
  }),

  page({
    slug: 'repast-venue',
    title: 'Repast & Celebration of Life',
    metaTitle: 'Repast Venue Redford MI | Celebration of Life | Preva Club',
    metaDesc: 'Respectful, warm repast and celebration of life gatherings at Preva Club in Redford MI. Same-week bookings with hot buffet, coffee service, and private room.',
    category: 'Life Events',
    tag: 'repast',
    heroImage: IMG.repast,
    heroHeadline: 'HONORING A LIFE WELL LIVED',
    heroSubhead: 'Respectful & warm · Same-week bookings · Hot buffet · Private room',
    ctaLabel: 'Request Repast Availability',
    description: 'Preva Club & Kitchen understands the importance of gathering together to honor a loved one. Our repast and celebration of life packages provide a warm, respectful space with same-week availability, hot buffet service, coffee and beverage service, and private room options — so your family can focus on what matters most.',
    features: [
      { icon: '🕊', heading: 'Same-Week Bookings', body: 'Flexible availability with short-notice scheduling' },
      { icon: '🍽', heading: 'Hot Buffet Service', body: 'Full hot buffet with comfort food selections' },
      { icon: '☕', heading: 'Coffee & Beverage', body: 'Coffee, tea, lemonade, and soft drink service' },
      { icon: '🔒', heading: 'Private Room', body: 'Separate, private gathering space for your family' },
    ],
    formSource: 'repast-landing',
  }),

  page({
    slug: 'cultural-weddings',
    title: 'Cultural & South Asian Weddings',
    metaTitle: 'South Asian Wedding Venue Redford MI | Sangeet Mehndi Nikah | Preva Club',
    metaDesc: 'Cultural and South Asian wedding events at Preva Club in Redford MI. Sangeet, Mehndi, Nikah, and cultural receptions with outside cuisine and décor flexibility.',
    category: 'Life Events',
    tag: 'cultural-wedding',
    heroImage: IMG.cultural,
    heroHeadline: 'YOUR CULTURE. YOUR CELEBRATION.',
    heroSubhead: 'Sangeet · Mehndi · Nikah · Outside cuisine welcome · Décor flexibility',
    ctaLabel: 'Discuss Your Cultural Event',
    description: 'Preva Club & Kitchen welcomes cultural and South Asian wedding celebrations with open arms. We offer full flexibility for outside cuisine providers, outside décor vendors, and cultural ceremony setups — including Sangeet nights, Mehndi ceremonies, Nikah ceremonies, and grand reception parties. Our 700-person capacity and flexible floor plan adapt to any cultural tradition.',
    features: [
      { icon: '🎊', heading: 'Sangeet & Mehndi', body: 'Dance floor, lighting, and entertainment setup included' },
      { icon: '🕌', heading: 'Nikah Ceremonies', body: 'Ceremony space adaptable to Islamic and cultural traditions' },
      { icon: '🍛', heading: 'Outside Cuisine OK', body: 'Bring your preferred cultural caterer or restaurant' },
      { icon: '🎨', heading: 'Décor Flexibility', body: 'Bring your own decorators, floral, and setup teams' },
    ],
    formSource: 'cultural-wedding-landing',
  }),

  page({
    slug: 'prom-homecoming',
    title: 'Prom & Homecoming Groups',
    metaTitle: 'Prom & Homecoming Venue Redford MI | After-Prom Party | Preva Club',
    metaDesc: 'Prom and homecoming group packages at Preva Club in Redford MI. Pre-prom photo setups, group dinners, after-prom packages, and lock-in options.',
    category: 'Life Events',
    tag: 'prom',
    heroImage: IMG.prom,
    heroHeadline: 'THE NIGHT YOU\'LL NEVER FORGET',
    heroSubhead: 'Pre-prom photos · Group dinners · After-prom lock-in options',
    ctaLabel: 'Book Your Prom Group',
    description: 'Make prom season unforgettable with Preva Club & Kitchen. We offer complete prom and homecoming packages including pre-prom photo staging, group dinner reservations, and after-prom lock-in options. Perfect for school groups, friend groups, and party buses arriving together — our team handles everything so you can just enjoy the night.',
    features: [
      { icon: '📸', heading: 'Pre-Prom Photos', body: 'Professional backdrop and lighting for group photos' },
      { icon: '🍽', heading: 'Group Dinners', body: 'Prix fixe dinner menus for prom groups of all sizes' },
      { icon: '🎵', heading: 'After-Prom Lock-In', body: 'Private after-prom events with DJ and entertainment' },
      { icon: '🚌', heading: 'Party Bus Friendly', body: 'Group arrival coordination for buses and limos' },
    ],
    formSource: 'prom-landing',
  }),
];

for (const p of setA) await upsertPage(p);
console.log(`  ✓ ${setA.length} Life Events pages seeded`);

/* ═══════════════════════════════════════════════════════════════════════════
   SET B — CORPORATE & BUSINESS (Pages 11–19)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[Set B] Corporate & Business...');

const setB = [
  page({
    slug: 'corporate-events',
    title: 'Corporate Events & Holiday Parties',
    metaTitle: 'Corporate Event Venue Redford MI | Holiday Party | Preva Club',
    metaDesc: 'Corporate events and company holiday parties at Preva Club in Redford MI. Events for 40–700 employees with AV, catering, and premium entertainment options.',
    category: 'Corporate',
    tag: 'corporate',
    heroImage: IMG.corporate,
    heroHeadline: 'MEET BY DAY. CELEBRATE BY NIGHT.',
    heroSubhead: 'Company parties · Award nights · Holiday events · 40–700 employees',
    ctaLabel: 'Request a Corporate Proposal',
    description: 'Preva Club & Kitchen is Metro Detroit\'s premier corporate event venue. From company award nights and appreciation events to holiday parties and team celebrations — we handle everything. With capacity for 40–700 employees, full AV capabilities, in-house catering, and optional DJ entertainment, your corporate event will be anything but ordinary.',
    features: [
      { icon: '🏢', heading: 'Corporate Packages', body: 'Customizable packages for teams of all sizes' },
      { icon: '📽', heading: 'Full AV Setup', body: 'Projectors, screens, microphones, and DJ systems' },
      { icon: '🍽', heading: 'Catered Menus', body: 'Corporate catering with plated, buffet, or stations' },
      { icon: '🎊', heading: 'Holiday Themes', body: 'Themed décor and entertainment for seasonal events' },
    ],
    formSource: 'corporate-landing',
  }),

  page({
    slug: 'meeting-space-redford',
    title: 'Meetings, Training & Off-Sites',
    metaTitle: 'Meeting Space Redford MI | Training Room | Day Rental | Preva Club',
    metaDesc: 'Daytime meeting and training room rental at Preva Club in Redford MI. Big screens, WiFi, AV equipment, and catered breaks for corporate off-sites.',
    category: 'Corporate',
    tag: 'meeting',
    heroImage: IMG.meeting,
    heroHeadline: 'WHERE BUSINESS GETS DONE',
    heroSubhead: 'Meeting rooms · Training sessions · Off-sites · WiFi & AV included',
    ctaLabel: 'Book a Day Rental',
    description: 'Need a professional meeting space in Metro Detroit? Preva Club & Kitchen offers daytime meeting and training room rentals with full AV equipment, high-speed WiFi, big screens, and catered break service. Perfect for corporate off-sites, training sessions, board meetings, and strategy days — all in a premium venue setting.',
    features: [
      { icon: '📡', heading: 'High-Speed WiFi', body: 'Business-grade internet throughout the venue' },
      { icon: '📺', heading: 'AV & Big Screens', body: 'Projectors, large screens, and presentation systems' },
      { icon: '☕', heading: 'Catered Breaks', body: 'Coffee, breakfast, and lunch break catering available' },
      { icon: '🕐', heading: 'Flexible Hours', body: 'Half-day and full-day rental options available' },
    ],
    formSource: 'meeting-landing',
  }),

  page({
    slug: 'corporate-catering',
    title: 'Corporate Catering & Office Lunch',
    metaTitle: 'Corporate Catering Redford MI | Office Lunch Delivery | Preva Kitchen',
    metaDesc: 'Drop-off and full-service corporate catering from Preva Kitchen in Redford MI. Office lunches, training catering, job site delivery, and event catering.',
    category: 'Corporate',
    tag: 'catering',
    heroImage: IMG.catering,
    heroHeadline: 'ELEVATE YOUR OFFICE LUNCH',
    heroSubhead: 'Drop-off catering · Full-service events · Office lunch · Job sites',
    ctaLabel: 'Order Corporate Catering',
    description: 'Preva Kitchen brings restaurant-quality food directly to your office, job site, or corporate event. Our corporate catering service includes drop-off boxed lunches, full-service buffet catering with setup and breakdown, and custom menu planning. From daily office lunches to quarterly all-hands meetings — we\'ve got you covered.',
    features: [
      { icon: '🚗', heading: 'Drop-Off Delivery', body: 'Boxed lunches and drop-off catering for any group size' },
      { icon: '👨‍🍳', heading: 'Full-Service Catering', body: 'Setup, service, and breakdown included' },
      { icon: '📋', heading: 'Custom Menus', body: 'Menu planning tailored to your team and dietary needs' },
      { icon: '💼', heading: 'Job Site Delivery', body: 'Construction sites, warehouses, and remote locations' },
    ],
    formSource: 'catering-landing',
  }),

  page({
    slug: 'team-building-events',
    title: 'Team Building & Company Cookouts',
    metaTitle: 'Team Building Venue Redford MI | Company Cookout | Outdoor Events',
    metaDesc: 'Team building and company cookout events at Preva Club in Redford MI. Patio cookouts, outdoor games, team challenges, and grill station setups.',
    category: 'Corporate',
    tag: 'team-building',
    heroImage: IMG.teambuilding,
    heroHeadline: 'BUILD YOUR TEAM. OWN THE PATIO.',
    heroSubhead: 'Cookouts · Outdoor games · Team challenges · 4,400 sq ft patio',
    ctaLabel: 'Plan a Team Day',
    description: 'Strengthen your team with an unforgettable company cookout or team building day at Preva Club & Kitchen. Our 4,400 sq ft outdoor patio is perfect for company cookouts with grill stations, outdoor games, and team-building activities. After the games, move inside for dinner and drinks in our premium venue.',
    features: [
      { icon: '🔥', heading: 'Patio Cookouts', body: 'Grill stations, BBQ menus, and outdoor buffet setups' },
      { icon: '🏆', heading: 'Team Activities', body: 'Customizable team-building games and challenges' },
      { icon: '🌿', heading: 'Outdoor Space', body: '4,400 sq ft patio with indoor/outdoor combo option' },
      { icon: '🍻', heading: 'Bar Packages', body: 'Beer, wine, and cocktail packages for your team' },
    ],
    formSource: 'teambuilding-landing',
  }),

  page({
    slug: 'networking-events',
    title: 'Networking Mixers & Happy Hour',
    metaTitle: 'Networking Event Venue Redford MI | Happy Hour | Business Mixer | Preva',
    metaDesc: 'After-work networking mixers and happy hour events at Preva Club in Redford MI. Chamber events, industry meetups, and business mixers with reserved bar zones.',
    category: 'Corporate',
    tag: 'networking',
    heroImage: IMG.networking,
    heroHeadline: 'NETWORK IN STYLE',
    heroSubhead: 'After-work mixers · Chamber events · Industry meetups · Bar zones',
    ctaLabel: 'Host Your Mixer',
    description: 'Preva Club & Kitchen is the ideal venue for professional networking events and business mixers in Metro Detroit. We offer reserved bar zones, customizable floor arrangements, and premium drink packages — perfect for chamber of commerce events, industry meetups, after-work happy hours, and business association gatherings.',
    features: [
      { icon: '🤝', heading: 'Mixer Packages', body: 'Hourly drink packages and appetizer platters' },
      { icon: '🍸', heading: 'Reserved Bar Zones', body: 'Dedicated bar sections for your networking group' },
      { icon: '📊', heading: 'Presentation Ready', body: 'Screen and mic available for brief presentations' },
      { icon: '🏙', heading: 'Metro Detroit Access', body: 'Easy access from Detroit, Dearborn, and surrounding areas' },
    ],
    formSource: 'networking-landing',
  }),

  page({
    slug: 'brand-activations',
    title: 'Product Launches & Brand Activations',
    metaTitle: 'Brand Activation Venue Redford MI | Product Launch | Preva Club',
    metaDesc: 'Product launches and brand activations at Preva Club in Redford MI. LED screens, sampling zones, step-and-repeat, and social content capture setups.',
    category: 'Corporate',
    tag: 'brand-activation',
    heroImage: IMG.launch,
    heroHeadline: 'LAUNCH YOUR BRAND IN STYLE',
    heroSubhead: 'LED screens · Sampling zones · Step-and-repeat · Content creation',
    ctaLabel: 'Launch at Preva',
    description: 'Make your product launch or brand activation an event people talk about. Preva Club & Kitchen offers a premium venue setting with LED screen capabilities, sampling zones, step-and-repeat backdrops, and professional lighting — everything needed to showcase your brand and capture high-quality social media content.',
    features: [
      { icon: '📺', heading: 'LED Screens', body: 'Large LED displays for brand visuals and video content' },
      { icon: '🎯', heading: 'Sampling Zones', body: 'Dedicated product sampling and demonstration areas' },
      { icon: '📸', heading: 'Step & Repeat', body: 'Branded backdrop for media and influencer photos' },
      { icon: '📱', heading: 'Content Capture', body: 'Social media-optimized spaces for digital campaigns' },
    ],
    formSource: 'brandactivation-landing',
  }),

  page({
    slug: 'fundraiser-venue',
    title: 'Nonprofit Galas & Fundraisers',
    metaTitle: 'Fundraiser Venue Redford MI | Nonprofit Gala | Charity Event | Preva Club',
    metaDesc: 'Nonprofit galas and charity fundraisers at Preva Club in Redford MI. Banquet-seated galas, silent auctions, community fundraisers with nonprofit pricing.',
    category: 'Corporate',
    tag: 'fundraiser',
    heroImage: IMG.nonprofit,
    heroHeadline: 'MAKE AN IMPACT IN STYLE',
    heroSubhead: 'Nonprofit galas · Silent auctions · Fundraiser nights · Special pricing',
    ctaLabel: 'Request Nonprofit Pricing',
    description: 'Preva Club & Kitchen proudly supports nonprofit organizations and charitable causes with special venue pricing and event packages. Whether hosting a formal gala, silent auction, community fundraiser, or charity dinner — our team will help you maximize your impact while keeping costs manageable.',
    features: [
      { icon: '❤️', heading: 'Nonprofit Pricing', body: 'Special rates for registered nonprofit organizations' },
      { icon: '🎰', heading: 'Silent Auction Space', body: 'Dedicated tables and display areas for auction items' },
      { icon: '🎤', heading: 'Stage & Podium', body: 'Stage setup for speakers, awards, and presentations' },
      { icon: '🍽', heading: 'Gala Catering', body: 'Banquet-style plated dinner or buffet options' },
    ],
    formSource: 'fundraiser-landing',
  }),

  page({
    slug: 'vendor-events',
    title: 'Vendor Markets & Pop-Up Expos',
    metaTitle: 'Vendor Market Venue Redford MI | Pop-Up Expo | Small Business | Preva',
    metaDesc: 'Vendor markets and pop-up expos at Preva Club in Redford MI. Table and booth rentals for vendor markets, expos, and small business pop-ups.',
    category: 'Corporate',
    tag: 'vendor',
    heroImage: IMG.vendor,
    heroHeadline: 'SELL. CONNECT. GROW.',
    heroSubhead: 'Vendor tables · Booth rentals · Pop-up expos · Small business ready',
    ctaLabel: 'Reserve a Vendor Table',
    description: 'Preva Club & Kitchen is an ideal venue for vendor markets, pop-up expos, and small business showcases in Metro Detroit. We offer flexible table and booth rentals with prime foot traffic access, allowing local vendors, entrepreneurs, and small businesses to showcase and sell their products in a premium setting.',
    features: [
      { icon: '🛍', heading: 'Table & Booth Rentals', body: '6ft and 8ft vendor table options with chairs' },
      { icon: '🚶', heading: 'High Foot Traffic', body: 'Promoted events with local marketing support' },
      { icon: '💡', heading: 'Power Access', body: 'Electrical outlets available for powered displays' },
      { icon: '📍', heading: 'Indoor & Outdoor', body: 'Patio and indoor vendor space available' },
    ],
    formSource: 'vendor-landing',
  }),

  page({
    slug: 'community-rentals',
    title: 'Job Fairs, Church & Community Rentals',
    metaTitle: 'Community Event Venue Redford MI | Church Rental | Job Fair | Preva Club',
    metaDesc: 'Weekday community event rentals at Preva Club in Redford MI. Job fairs, church services, banquets, community programs, and civic events.',
    category: 'Corporate',
    tag: 'community',
    heroImage: IMG.community,
    heroHeadline: 'SERVING THE COMMUNITY',
    heroSubhead: 'Job fairs · Church services · Banquets · Community programs',
    ctaLabel: 'Check Weekday Rates',
    description: 'Preva Club & Kitchen is committed to serving the Metro Detroit community with affordable weekday venue rental options. We welcome job fairs, church services, civic organizations, community programs, and nonprofit banquets. Our flexible space and competitive weekday pricing make premium event hosting accessible to all.',
    features: [
      { icon: '💼', heading: 'Job Fair Setup', body: 'Tables, booths, and open floor plan for employers' },
      { icon: '⛪', heading: 'Church Services', body: 'Audio system, chairs, and stage available' },
      { icon: '🤲', heading: 'Community Programs', body: 'Civic meetings, workshops, and educational events' },
      { icon: '💰', heading: 'Weekday Rates', body: 'Discounted pricing Monday through Thursday' },
    ],
    formSource: 'community-landing',
  }),
];

for (const p of setB) await upsertPage(p);
console.log(`  ✓ ${setB.length} Corporate pages seeded`);

/* ═══════════════════════════════════════════════════════════════════════════
   SET C — ENTERTAINMENT (Pages 20–27)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[Set C] Entertainment...');

const setC = [
  page({
    slug: 'karaoke-nights',
    title: 'Karaoke Nights at Preva',
    metaTitle: 'Karaoke Night Redford MI | Preva Club & Kitchen',
    metaDesc: 'Karaoke nights at Preva Club in Redford MI. Private karaoke rooms, group karaoke packages, and open-mic karaoke nights with full bar service.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.theme_night,
    heroHeadline: 'YOUR STAGE. YOUR NIGHT.',
    heroSubhead: 'Private karaoke · Group packages · Full bar service',
    ctaLabel: 'Book Karaoke Night',
    description: 'Grab the mic and own the night at Preva Club & Kitchen. Our karaoke nights bring high energy and unforgettable fun — whether you\'re booking a private group session or joining an open-mic karaoke event. Full bar service, premium sound system, and an electric crowd make every performance legendary.',
    features: [
      { icon: '🎤', heading: 'Premium Sound', body: 'Professional karaoke system with thousands of songs' },
      { icon: '🍸', heading: 'Full Bar Service', body: 'Cocktails, shots, and bottle service available' },
      { icon: '👥', heading: 'Group Packages', body: 'Private group bookings with reserved sections' },
      { icon: '📅', heading: 'Recurring Nights', body: 'Check our weekly lineup for karaoke night schedule' },
    ],
    formSource: 'karaoke-landing',
  }),

  page({
    slug: 'comedy-nights',
    title: 'Comedy Nights & Live Entertainment',
    metaTitle: 'Comedy Night Venue Redford MI | Live Comedy | Preva Club',
    metaDesc: 'Comedy nights and live entertainment at Preva Club in Redford MI. Stand-up comedy shows, open-mic comedy, and live performance nights.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.theme_night,
    heroHeadline: 'LAUGH. DRINK. REPEAT.',
    heroSubhead: 'Stand-up comedy · Live entertainment · Open-mic nights',
    ctaLabel: 'See Comedy Lineup',
    description: 'Preva Club & Kitchen hosts some of Metro Detroit\'s best comedy nights and live entertainment events. From professional stand-up comedy shows to open-mic comedy nights, our stage and intimate venue setting create the perfect atmosphere for laughter and live performance. Full dinner and bar service available throughout the show.',
    features: [
      { icon: '🎭', heading: 'Live Comedy Shows', body: 'Professional stand-up comedians and live performers' },
      { icon: '🎙', heading: 'Open Mic Nights', body: 'Anyone can take the stage on open mic nights' },
      { icon: '🍽', heading: 'Dinner & Show', body: 'Full dinner menu available during performances' },
      { icon: '🎟', heading: 'Ticketed Events', body: 'Reserve your seats for premium comedy shows' },
    ],
    formSource: 'comedy-landing',
  }),

  page({
    slug: 'open-mic-nights',
    title: 'Open Mic Nights',
    metaTitle: 'Open Mic Night Redford MI | Preva Club & Kitchen',
    metaDesc: 'Open mic nights at Preva Club in Redford MI. Poetry, spoken word, music, and comedy. Sign up to perform or come enjoy local talent with drinks.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.promoter,
    heroHeadline: 'YOUR VOICE. YOUR STAGE.',
    heroSubhead: 'Poetry · Spoken word · Music · Comedy · All welcome',
    ctaLabel: 'Sign Up to Perform',
    description: 'Preva Club & Kitchen\'s open mic nights celebrate local talent from across Metro Detroit. Whether you\'re a poet, musician, comedian, or spoken word artist — our stage is your platform. Come perform for a supportive crowd in a premium venue, or just enjoy drinks and local talent in a relaxed, electric atmosphere.',
    features: [
      { icon: '🎵', heading: 'All Art Forms', body: 'Music, poetry, comedy, spoken word, all welcome' },
      { icon: '🎤', heading: 'Stage & Sound', body: 'Professional sound system with monitoring' },
      { icon: '🥃', heading: 'Bar Service', body: 'Full bar and kitchen menu available all night' },
      { icon: '📝', heading: 'Easy Sign-Up', body: 'Arrive early to sign up for your time slot' },
    ],
    formSource: 'openmic-landing',
  }),

  page({
    slug: 'live-music-venue',
    title: 'Live Music Venue & DJ Events',
    metaTitle: 'Live Music Venue Redford MI | DJ Events | Preva Club',
    metaDesc: 'Live music and DJ events at Preva Club in Redford MI. Local bands, touring artists, celebrity DJs, and resident DJ nights every weekend.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.nightclub,
    heroHeadline: 'FEEL THE MUSIC. LIVE.',
    heroSubhead: 'Live bands · Celebrity DJs · Resident DJ nights · Premium sound',
    ctaLabel: 'See Upcoming Events',
    description: 'Preva Club & Kitchen features a world-class sound and lighting system for live music events and DJ performances. From local bands and touring artists to celebrity DJ appearances and our own resident DJs — our venue transforms into Metro Detroit\'s premier live entertainment destination every weekend.',
    features: [
      { icon: '🔊', heading: 'World-Class Sound', body: 'State-of-the-art speaker system and acoustics' },
      { icon: '💡', heading: 'Premium Lighting', body: 'Full LED and moving light rig for maximum impact' },
      { icon: '🎸', heading: 'Live Bands', body: 'Stage setup for full bands with backline available' },
      { icon: '🎧', heading: 'Celebrity DJs', body: 'National and celebrity DJ bookings year-round' },
    ],
    formSource: 'livemusic-landing',
  }),

  page({
    slug: 'trivia-nights',
    title: 'Trivia Nights & Game Events',
    metaTitle: 'Trivia Night Redford MI | Bar Games | Preva Club & Kitchen',
    metaDesc: 'Trivia nights and bar game events at Preva Club in Redford MI. Weekly trivia, team competitions, and prizes with full bar and kitchen service.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.sports,
    heroHeadline: 'TEST YOUR KNOWLEDGE. WIN BIG.',
    heroSubhead: 'Weekly trivia · Team competitions · Prizes · Full bar open',
    ctaLabel: 'Join Trivia Night',
    description: 'Join Preva Club & Kitchen for one of Metro Detroit\'s most competitive and entertaining trivia nights. Form your team, compete for prizes, and enjoy full bar and kitchen service throughout the night. Our trivia host keeps the energy high and the questions challenging — perfect for date nights, friend groups, and company team outings.',
    features: [
      { icon: '🏆', heading: 'Weekly Prizes', body: 'Gift cards, bar tabs, and exclusive Preva prizes' },
      { icon: '👥', heading: 'Team Format', body: 'Teams of 2–8 compete across multiple rounds' },
      { icon: '🎙', heading: 'Live Host', body: 'Entertaining trivia host keeps the energy alive' },
      { icon: '🍺', heading: 'Full Bar & Kitchen', body: 'Full menu and bar service throughout the night' },
    ],
    formSource: 'trivia-landing',
  }),

  page({
    slug: 'ladies-night',
    title: 'Ladies Night & Girls Night Out',
    metaTitle: 'Ladies Night Redford MI | Girls Night Out | Preva Club',
    metaDesc: 'Ladies night and girls night out at Preva Club in Redford MI. Drink specials, VIP booth packages, free entry, and the best nightlife experience in Metro Detroit.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.vip,
    heroHeadline: 'THE GIRLS DESERVE THE BEST.',
    heroSubhead: 'Drink specials · VIP booths · Free entry · Premier nightlife',
    ctaLabel: 'Plan Girls Night',
    description: 'Preva Club & Kitchen is the premier destination for ladies\' night and girls\' night out in Metro Detroit. Enjoy exclusive drink specials, VIP booth packages, priority entry, and an electrifying atmosphere every week. Whether celebrating a birthday, bachelorette, or just treating yourselves — Preva delivers the ultimate girls\' night experience.',
    features: [
      { icon: '👸', heading: 'Ladies Night Specials', body: 'Discounted drinks and special cocktail menus' },
      { icon: '💎', heading: 'VIP Booth Packages', body: 'Reserve a booth with bottle service and hostess' },
      { icon: '🚪', heading: 'Priority Entry', body: 'Skip the line with girls\' night group reservations' },
      { icon: '📸', heading: 'Photo Moments', body: 'Instagrammable spaces throughout the venue' },
    ],
    formSource: 'ladies-night-landing',
  }),

  page({
    slug: 'dance-nights',
    title: 'Dance Nights & Dance Classes',
    metaTitle: 'Dance Night Redford MI | Dance Classes | Social Dancing | Preva Club',
    metaDesc: 'Dance nights and social dance events at Preva Club in Redford MI. Salsa nights, hip-hop dance events, and themed dance nights with full bar service.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.prom,
    heroHeadline: 'MOVE. GROOVE. REPEAT.',
    heroSubhead: 'Themed dance nights · Social dancing · Dance floor always open',
    ctaLabel: 'See Dance Events',
    description: 'Preva Club & Kitchen\'s premium dance floor and sound system create the ultimate dancing experience in Metro Detroit. We host themed dance nights including salsa nights, hip-hop socials, R&B nights, and more — with professional instructors available for pre-event classes. Full bar service keeps the energy going all night.',
    features: [
      { icon: '💃', heading: 'Themed Dance Nights', body: 'Salsa, hip-hop, R&B, and themed social dances' },
      { icon: '🎵', heading: 'Premium Dance Floor', body: 'Hardwood dance floor with optimal sound and lighting' },
      { icon: '👨‍🏫', heading: 'Dance Classes', body: 'Pre-event beginner dance lessons available' },
      { icon: '🍹', heading: 'Full Bar Service', body: 'Cocktails, shots, and bottle service all night' },
    ],
    formSource: 'dance-landing',
  }),

  page({
    slug: 'themed-events',
    title: 'Themed Events & Costume Nights',
    metaTitle: 'Themed Events Redford MI | Costume Night | Theme Party | Preva Club',
    metaDesc: 'Themed events and costume nights at Preva Club in Redford MI. All-white parties, masquerade balls, Halloween events, and custom theme nights.',
    category: 'Entertainment',
    tag: 'entertainment',
    heroImage: IMG.holiday,
    heroHeadline: 'DRESS UP. SHOW OUT.',
    heroSubhead: 'All-white parties · Masquerade · Halloween · Custom themes',
    ctaLabel: 'See Theme Night Schedule',
    description: 'Preva Club & Kitchen throws Metro Detroit\'s most unforgettable themed events. From all-white parties and masquerade balls to Halloween costume extravaganzas and custom theme nights — our team goes all out on décor, entertainment, and atmosphere. Get in costume and get ready for an experience unlike anything else in the city.',
    features: [
      { icon: '🎭', heading: 'Professional Décor', body: 'Full venue transformation with professional theming' },
      { icon: '🎃', heading: 'Seasonal Events', body: 'Halloween, NYE, Mardi Gras, and seasonal specials' },
      { icon: '🤍', heading: 'All-White Parties', body: 'Premier all-white parties with strict dress code' },
      { icon: '🏆', heading: 'Costume Contests', body: 'Prizes for best costume on themed nights' },
    ],
    formSource: 'themed-events-landing',
  }),
];

for (const p of setC) await upsertPage(p);
console.log(`  ✓ ${setC.length} Entertainment pages seeded`);

/* ═══════════════════════════════════════════════════════════════════════════
   SET D — DAYTIME & OUTDOOR (Pages 28–34)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[Set D] Daytime & Outdoor...');

const setD = [
  page({
    slug: 'day-party-venue',
    title: 'Patio Day Parties & Brunch',
    metaTitle: 'Day Party Venue Redford MI | Brunch Party | Patio Events | Preva Club',
    metaDesc: 'Saturday and Sunday day parties and brunch events at Preva Club in Redford MI. DJ, brunch menu, bottomless drink tiers, and 4,400 sq ft outdoor patio.',
    category: 'Daytime',
    tag: 'day-party',
    heroImage: IMG.patio,
    heroHeadline: 'SUNLIGHT IS REVENUE TOO.',
    heroSubhead: 'Patio day parties · Brunch menu · DJ · Bottomless drink tiers',
    ctaLabel: 'Get on the Day Party List',
    description: 'Preva Club & Kitchen\'s 4,400 sq ft outdoor patio is Metro Detroit\'s premier day party destination. Every Saturday and Sunday, our patio comes alive with DJ entertainment, a full brunch menu, and bottomless drink packages. Whether you\'re partying with 20 or 200, our day party experience is unmatched.',
    features: [
      { icon: '☀️', heading: '4,400 Sq Ft Patio', body: 'Massive outdoor patio with shade structures' },
      { icon: '🥂', heading: 'Bottomless Options', body: 'Bottomless mimosas, brunch cocktail tiers available' },
      { icon: '🎵', heading: 'Day Party DJs', body: 'Resident DJs spinning vibes from noon to close' },
      { icon: '🍳', heading: 'Brunch Menu', body: 'Full brunch and lunch menu served all afternoon' },
    ],
    formSource: 'dayparty-landing',
  }),

  page({
    slug: 'outdoor-events',
    title: 'Outdoor Cookouts & Tent Events',
    metaTitle: 'Outdoor Event Venue Redford MI | Cookout | Tent Event | Preva Club',
    metaDesc: 'Outdoor cookouts and tented patio events at Preva Club in Redford MI. Family reunions, church picnics, and tented outdoor events with buffet service.',
    category: 'Daytime',
    tag: 'outdoor',
    heroImage: IMG.cookout,
    heroHeadline: 'TAKE THE PARTY OUTSIDE.',
    heroSubhead: 'Cookouts · Church picnics · Tent setups · Buffet service',
    ctaLabel: 'Reserve the Patio',
    description: 'Preva Club & Kitchen\'s outdoor patio is ideal for cookouts, family reunions, church picnics, and tented outdoor events. Our team provides full grill setup, buffet service, seating arrangements, and tent options — making outdoor entertaining effortless and enjoyable for groups of all sizes.',
    features: [
      { icon: '🔥', heading: 'Grill Setup', body: 'Professional grills and cookout equipment provided' },
      { icon: '⛺', heading: 'Tent Options', body: 'Shade tents available for daytime outdoor events' },
      { icon: '🍖', heading: 'BBQ Catering', body: 'Full BBQ buffet with sides, drinks, and desserts' },
      { icon: '🌳', heading: 'Natural Setting', body: 'Beautifully landscaped outdoor event space' },
    ],
    formSource: 'outdoor-landing',
  }),

  page({
    slug: 'lot-events',
    title: 'Food Truck Rally & Lot Festivals',
    metaTitle: 'Food Truck Rally Venue Redford MI | Lot Festival | Preva Club',
    metaDesc: 'Parking lot festivals, food truck rallies, and outdoor market days at Preva Club in Redford MI. Vendor spots, lots for events, and festival setup available.',
    category: 'Daytime',
    tag: 'lot-event',
    heroImage: IMG.food_truck,
    heroHeadline: 'FESTIVALS THAT FILL THE LOT.',
    heroSubhead: 'Food truck rallies · Lot festivals · Vendor spots · Outdoor markets',
    ctaLabel: 'Apply for a Lot Spot',
    description: 'Preva Club & Kitchen\'s expansive parking lot is perfect for food truck rallies, outdoor market festivals, and community events. We offer vendor spot rentals with power access, promotion support, and on-site security — making us Metro Detroit\'s ideal destination for outdoor food and market events.',
    features: [
      { icon: '🚚', heading: 'Food Truck Spots', body: 'Generator hookup and water access for food trucks' },
      { icon: '🛒', heading: 'Vendor Markets', body: 'Outdoor vendor spots for markets and pop-up events' },
      { icon: '🔒', heading: 'On-Site Security', body: 'Professional security for all lot events' },
      { icon: '📣', heading: 'Event Promotion', body: 'Marketing support through Preva social and email' },
    ],
    formSource: 'lot-events-landing',
  }),

  page({
    slug: 'sports-bar-redford',
    title: 'Sports Watch Parties & Fight Nights',
    metaTitle: 'Sports Bar Redford MI | Fight Night | Game Watch Party | Preva Club',
    metaDesc: 'Sports watch parties and fight nights at Preva Club in Redford MI. Big-screen game days, PPV fight nights, and playoff parties with wings and pitcher deals.',
    category: 'Daytime',
    tag: 'sports',
    heroImage: IMG.sports,
    heroHeadline: 'THE GAME IS BETTER AT PREVA.',
    heroSubhead: 'Big-screen game days · PPV fight nights · Wings & pitchers',
    ctaLabel: 'Reserve a Game-Day Table',
    description: 'Preva Club & Kitchen is Metro Detroit\'s premier sports watch party destination. From NFL Sunday playoffs and NBA Finals to PPV boxing and UFC fight nights — we bring the game to you on our big screens with premium sound, ice-cold pitchers, and Preva\'s legendary wings. Reserve your game-day table and bring your crew.',
    features: [
      { icon: '📺', heading: 'Big Screen Setup', body: 'Multiple large screens positioned throughout the venue' },
      { icon: '🥊', heading: 'PPV Fight Nights', body: 'All major boxing and UFC PPV events broadcast live' },
      { icon: '🍗', heading: 'Wings & Pitchers', body: 'Game-day specials on wings, pitchers, and snacks' },
      { icon: '🎰', heading: 'VIP Tables', body: 'Reserve your premium viewing table in advance' },
    ],
    formSource: 'sports-landing',
  }),

  page({
    slug: 'sunday-funday',
    title: 'Sunday Funday & Family Days',
    metaTitle: 'Sunday Funday Redford MI | Family Day | Kid-Friendly | Preva Club',
    metaDesc: 'Sunday Funday and family-friendly events at Preva Club in Redford MI. Early-Sunday family hours with kid-friendly patio, food specials, and open seating.',
    category: 'Daytime',
    tag: 'sunday-funday',
    heroImage: IMG.sunday_fun,
    heroHeadline: 'SUNDAYS WERE MADE FOR FUN.',
    heroSubhead: 'Family hours · Kid-friendly patio · Food specials · Open seating',
    ctaLabel: 'See Sunday Hours',
    description: 'Preva Club & Kitchen transforms Sunday mornings and afternoons into family time with our Sunday Funday events. Early Sunday family hours feature kid-friendly patio access, food specials, and a relaxed open-seating environment. Later in the afternoon, as the family crowd winds down, the day party energy takes over.',
    features: [
      { icon: '👨‍👩‍👧', heading: 'Family Hours', body: 'Early Sunday slots perfect for all ages' },
      { icon: '🌿', heading: 'Patio Seating', body: 'Open outdoor seating on our 4,400 sq ft patio' },
      { icon: '🍔', heading: 'Food Specials', body: 'Sunday food specials on our full kitchen menu' },
      { icon: '☀️', heading: 'All Day Fun', body: 'Transitions from family time to day party vibe' },
    ],
    formSource: 'sunday-funday-landing',
  }),

  page({
    slug: 'car-shows-bike-nights',
    title: 'Car Shows & Bike Nights',
    metaTitle: 'Car Show Venue Redford MI | Bike Night | Auto Events | Preva Club',
    metaDesc: 'Car shows and bike nights at Preva Club in Redford MI. Recurring lot takeovers for car clubs, bike nights, and motorsport meetups with full bar service.',
    category: 'Daytime',
    tag: 'car-show',
    heroImage: IMG.car_show,
    heroHeadline: 'REV IT UP AT PREVA.',
    heroSubhead: 'Car club takeovers · Bike nights · Motorsport meetups · Lot available',
    ctaLabel: 'Bring Your Club',
    description: 'Preva Club & Kitchen\'s lot is a gathering point for Metro Detroit\'s car culture. We host recurring car shows, bike nights, and motorsport club meetups in our spacious lot — with access to our full bar and kitchen inside. Whether you\'re a classic car club, import crew, or motorcycle club, our venue accommodates your style.',
    features: [
      { icon: '🚗', heading: 'Car Club Takeovers', body: 'Full lot available for organized car shows' },
      { icon: '🏍', heading: 'Bike Nights', body: 'Recurring motorcycle club and bike night events' },
      { icon: '🍺', heading: 'Bar Access', body: 'Full bar and kitchen open to all attendees' },
      { icon: '📸', heading: 'Show Setup', body: 'Cones, staging, and signage setup available' },
    ],
    formSource: 'carshow-landing',
  }),

  page({
    slug: 'group-outings',
    title: 'Field Trips, Reunions & Group Outings',
    metaTitle: 'Group Outing Venue Redford MI | Family Reunion | Class Reunion | Preva',
    metaDesc: 'Group outings, class reunions, and family reunions at Preva Club in Redford MI. Bus groups, org outings, pre-set menus, and reserved zones for groups.',
    category: 'Daytime',
    tag: 'group-outing',
    heroImage: IMG.group,
    heroHeadline: 'BRING YOUR WHOLE CREW.',
    heroSubhead: 'Family reunions · Class reunions · Bus groups · Reserved zones',
    ctaLabel: 'Book a Group Outing',
    description: 'Preva Club & Kitchen makes group outings effortless. Whether you\'re planning a family reunion, class reunion, church bus outing, or organizational group event — our team handles the logistics. Reserved zones, pre-set group menus, and dedicated event coordinators ensure your group enjoys a seamless experience from arrival to departure.',
    features: [
      { icon: '👨‍👩‍👧‍👦', heading: 'Family Reunions', body: 'Reserved sections with custom family reunion setups' },
      { icon: '🎓', heading: 'Class Reunions', body: 'Perfect setting for high school and college reunions' },
      { icon: '🚌', heading: 'Bus Group Ready', body: 'Ample parking and coordination for charter buses' },
      { icon: '📋', heading: 'Pre-Set Menus', body: 'Group menu packages with catering and bar service' },
    ],
    formSource: 'groupouting-landing',
  }),
];

for (const p of setD) await upsertPage(p);
console.log(`  ✓ ${setD.length} Daytime & Outdoor pages seeded`);

/* ═══════════════════════════════════════════════════════════════════════════
   SET E — FOOD & BEVERAGE FOCUSED (Pages 35–41)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[Set E] Food & Beverage...');

const setE = [
  page({
    slug: 'private-dining',
    title: 'Private Dining & Chef\'s Table',
    metaTitle: 'Private Dining Redford MI | Chef\'s Table | Preva Kitchen',
    metaDesc: 'Private dining and Chef\'s Table experiences at Preva Kitchen in Redford MI. Exclusive multi-course dinners, chef-curated menus, and private room reservations.',
    category: 'Food & Beverage',
    tag: 'dining',
    heroImage: IMG.catering,
    heroHeadline: 'DINE IN TOTAL PRIVACY.',
    heroSubhead: 'Chef\'s table · Multi-course menus · Private room · Premium experience',
    ctaLabel: 'Reserve Private Dining',
    description: 'Preva Kitchen elevates private dining to an art form. Our private dining experiences feature chef-curated multi-course menus, sommelier-guided wine pairings, and an exclusive private room setting. Perfect for anniversary dinners, business dinners, proposal evenings, and special celebrations that demand the very best.',
    features: [
      { icon: '👨‍🍳', heading: 'Chef\'s Curation', body: 'Custom multi-course menus designed by our executive chef' },
      { icon: '🍷', heading: 'Wine Pairings', body: 'Curated wine selections for each course' },
      { icon: '🔒', heading: 'Private Room', body: 'Exclusively yours for the evening — no shared spaces' },
      { icon: '💐', heading: 'Special Occasions', body: 'Proposals, anniversaries, and milestone celebrations' },
    ],
    formSource: 'privatedining-landing',
  }),

  page({
    slug: 'bottle-service',
    title: 'Bottle Service & VIP Packages',
    metaTitle: 'Bottle Service Redford MI | VIP Packages | Preva Club',
    metaDesc: 'Premium bottle service and VIP packages at Preva Club in Redford MI. 16 VIP booths, premium spirits, hostess service, and priority entry.',
    category: 'Food & Beverage',
    tag: 'vip',
    heroImage: IMG.vip,
    heroHeadline: 'THE VIP TREATMENT. EVERY TIME.',
    heroSubhead: '16 VIP booths · Premium bottles · Hostess service · Priority entry',
    ctaLabel: 'Reserve a VIP Booth',
    description: 'Experience the full VIP treatment at Preva Club & Kitchen with our premium bottle service packages. Choose from 16 exclusive VIP booths with your own dedicated hostess, premium bottle selections, mixers and ice, and priority entry for your entire group. The ultimate way to celebrate any occasion.',
    features: [
      { icon: '🥂', heading: '16 VIP Booths', body: 'Private booths with comfortable seating for groups' },
      { icon: '🍾', heading: 'Premium Spirits', body: 'Top-shelf bottles from leading brands worldwide' },
      { icon: '👸', heading: 'Dedicated Hostess', body: 'Personal hostess for bottle service and assistance' },
      { icon: '🚪', heading: 'Priority Entry', body: 'Skip the line with VIP booth reservation' },
    ],
    formSource: 'bottleservice-landing',
  }),

  page({
    slug: 'happy-hour',
    title: 'Happy Hour & After-Work Drinks',
    metaTitle: 'Happy Hour Redford MI | After-Work Bar | Preva Club & Kitchen',
    metaDesc: 'Happy hour and after-work drinks at Preva Club in Redford MI. Daily drink specials, appetizer deals, and a relaxed bar atmosphere perfect for unwinding.',
    category: 'Food & Beverage',
    tag: 'dining',
    heroImage: IMG.networking,
    heroHeadline: 'HAPPY HOUR JUST GOT HAPPIER.',
    heroSubhead: 'Daily drink specials · Appetizer deals · Relaxed bar vibes',
    ctaLabel: 'See Happy Hour Specials',
    description: 'Wind down after work at Preva Club & Kitchen with our daily happy hour specials. Enjoy discounted cocktails, beer and wine specials, and appetizer deals in a relaxed but upscale atmosphere. Whether flying solo, with coworkers, or meeting friends — happy hour at Preva is the perfect way to transition from work to play.',
    features: [
      { icon: '🍸', heading: 'Cocktail Specials', body: 'Discounted signature cocktails during happy hour' },
      { icon: '🍺', heading: 'Beer & Wine Deals', body: 'Draft beer, wine by the glass, and pitcher specials' },
      { icon: '🥗', heading: 'Appetizer Menu', body: 'Half-price appetizers during happy hour windows' },
      { icon: '🕔', heading: 'Daily Hours', body: 'Happy hour available weekdays — check current times' },
    ],
    formSource: 'happyhour-landing',
  }),

  page({
    slug: 'bar-packages',
    title: 'Bar Packages & Open Bar Events',
    metaTitle: 'Open Bar Packages Redford MI | Event Bar Service | Preva Club',
    metaDesc: 'Open bar packages and event bar service at Preva Club in Redford MI. Custom bar packages for weddings, corporate events, and private parties.',
    category: 'Food & Beverage',
    tag: 'bar',
    heroImage: IMG.vip,
    heroHeadline: 'OPEN BAR. OPEN POSSIBILITIES.',
    heroSubhead: 'Custom bar packages · Open bar · Beer & wine · Full premium bar',
    ctaLabel: 'Get Bar Package Pricing',
    description: 'Preva Club & Kitchen offers flexible bar packages for events of all sizes. From beer and wine packages to full premium open bar service — our bar team crafts the perfect beverage experience for your event. Custom cocktail menus, signature drinks, and professional bartenders make every event special.',
    features: [
      { icon: '🍾', heading: 'Open Bar Options', body: 'Beer/wine, standard, and premium open bar tiers' },
      { icon: '🍹', heading: 'Custom Cocktails', body: 'Signature cocktail menus designed for your event' },
      { icon: '🧑‍🍳', heading: 'Pro Bartenders', body: 'Experienced, certified bartenders for your event' },
      { icon: '💰', heading: 'Per-Hour Pricing', body: 'Flexible per-hour or flat-rate bar package options' },
    ],
    formSource: 'bar-packages-landing',
  }),

  page({
    slug: 'buffet-catering',
    title: 'Buffet Catering & Full-Service Events',
    metaTitle: 'Buffet Catering Redford MI | Full-Service Catering | Preva Kitchen',
    metaDesc: 'Buffet catering and full-service event catering from Preva Kitchen in Redford MI. Hot buffets, carving stations, dessert displays, and full event service.',
    category: 'Food & Beverage',
    tag: 'catering',
    heroImage: IMG.catering,
    heroHeadline: 'CATERING THAT WOW\'S EVERY GUEST.',
    heroSubhead: 'Hot buffets · Carving stations · Dessert displays · Full service',
    ctaLabel: 'Get Catering Quote',
    description: 'Preva Kitchen\'s catering service brings chef-driven quality to your event — wherever it is. From elaborate hot buffets and carving stations to passed appetizers, dessert displays, and full plated dinner service, our catering team handles every detail. On-site events at Preva or off-site delivery, we\'ve got you covered.',
    features: [
      { icon: '🍖', heading: 'Hot Buffets', body: 'Full hot buffet setup with chafing dishes and service' },
      { icon: '🔪', heading: 'Carving Stations', body: 'Live carving stations with prime meats and roasts' },
      { icon: '🎂', heading: 'Dessert Displays', body: 'Elegant dessert tables and sweet station setups' },
      { icon: '👨‍🍳', heading: 'On-Site Chefs', body: 'Culinary team on-site for full-service events' },
    ],
    formSource: 'catering-buffet-landing',
  }),

  page({
    slug: 'hookah-lounge',
    title: 'Hookah Lounge & Shisha Experience',
    metaTitle: 'Hookah Lounge Redford MI | Shisha Bar | Preva Club & Kitchen',
    metaDesc: 'Premium hookah lounge and shisha experience at Preva Club in Redford MI. Premium shisha flavors, VIP lounge seating, and full bar service.',
    category: 'Food & Beverage',
    tag: 'hookah',
    heroImage: IMG.vip,
    heroHeadline: 'SIT BACK. SMOKE. RELAX.',
    heroSubhead: 'Premium shisha · VIP lounge · Full bar · Relaxed luxury vibes',
    ctaLabel: 'Reserve Hookah Table',
    description: 'Preva Club & Kitchen\'s hookah lounge offers a premium shisha experience in a luxurious lounge setting. Choose from an extensive selection of premium shisha flavors, relax in our VIP lounge seating, and enjoy full bar and kitchen service. The perfect combination of relaxation and nightlife energy.',
    features: [
      { icon: '💨', heading: 'Premium Shisha', body: 'Extensive selection of premium shisha flavor blends' },
      { icon: '🛋', heading: 'VIP Lounge Seating', body: 'Plush lounge seating in a premium atmosphere' },
      { icon: '🍸', heading: 'Full Bar Service', body: 'Cocktails, shots, and bottle service at your table' },
      { icon: '🌙', heading: 'Evening & Night', body: 'Available evenings through late night on weekends' },
    ],
    formSource: 'hookah-landing',
  }),

  page({
    slug: 'brunch-reservations',
    title: 'Brunch Reservations at Preva Kitchen',
    metaTitle: 'Brunch Redford MI | Weekend Brunch Reservations | Preva Kitchen',
    metaDesc: 'Weekend brunch reservations at Preva Kitchen in Redford MI. Chef-driven brunch menu, bottomless mimosas, and patio brunch seating.',
    category: 'Food & Beverage',
    tag: 'dining',
    heroImage: IMG.sunday_fun,
    heroHeadline: 'BRUNCH IS A LIFESTYLE.',
    heroSubhead: 'Chef-driven brunch · Bottomless mimosas · Patio seating',
    ctaLabel: 'Book Your Brunch Table',
    description: 'Preva Kitchen\'s weekend brunch is the perfect blend of luxury dining and laid-back vibes. Our chef-driven brunch menu features both classic and creative dishes, complemented by bottomless mimosa packages and our signature brunch cocktails. Enjoy your meal indoors or on our beautiful 4,400 sq ft outdoor patio.',
    features: [
      { icon: '🥂', heading: 'Bottomless Mimosas', body: 'Bottomless mimosa packages on weekends' },
      { icon: '🍳', heading: 'Chef Brunch Menu', body: 'Creative and classic brunch dishes from our kitchen' },
      { icon: '🌿', heading: 'Patio Dining', body: 'Beautiful outdoor patio seating on sunny days' },
      { icon: '👥', heading: 'Group Brunch', body: 'Large group brunch reservations welcome' },
    ],
    formSource: 'brunch-landing',
  }),
];

for (const p of setE) await upsertPage(p);
console.log(`  ✓ ${setE.length} Food & Beverage pages seeded`);

/* ═══════════════════════════════════════════════════════════════════════════
   SET F — NIGHTLIFE PROGRAMMING (Pages 42–47)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[Set F] Nightlife Programming...');

const setF = [
  page({
    slug: 'nightclub',
    title: 'Friday & Saturday Nightclub',
    metaTitle: 'Nightclub Redford MI | Detroit Nightlife | Preva Club',
    metaDesc: 'Upscale Friday and Star-Studded Saturday nightclub at Preva Club in Redford MI. Top DJs, VIP booths, bottle service, and ticket tiers for every night.',
    category: 'Nightlife',
    tag: 'nightclub',
    heroImage: IMG.nightclub,
    heroHeadline: 'DETROIT\'S MOST EXCLUSIVE NIGHTCLUB.',
    heroSubhead: 'Top DJs · VIP booths · Bottle service · Premium nightlife',
    ctaLabel: 'Get on the List',
    description: 'Preva Club & Kitchen is Metro Detroit\'s most exclusive nightlife destination. Every Friday and Saturday night, our venue transforms into a world-class nightclub experience featuring top-tier DJs, a packed dance floor, 16 VIP booths with bottle service, and an electric atmosphere unlike anywhere else in the city. Get on the list and experience it for yourself.',
    features: [
      { icon: '🎧', heading: 'Top-Tier DJs', body: 'Resident and celebrity DJs every Friday and Saturday' },
      { icon: '💡', heading: 'Premium Lighting', body: 'State-of-the-art LED and moving light production' },
      { icon: '🥂', heading: '16 VIP Booths', body: 'Exclusive booths with bottle service and hostess' },
      { icon: '🚪', heading: 'Ticket Tiers', body: 'General, VIP, and premium entry options available' },
    ],
    formSource: 'nightclub-landing',
  }),

  page({
    slug: 'vip-booths',
    title: 'VIP Booths & Bottle Service',
    metaTitle: 'VIP Booths Redford MI | Bottle Service | Preva Nightclub',
    metaDesc: 'Reserve a VIP booth at Preva Club in Redford MI. 16 private VIP booths with bottle packages, hostess service, and priority entry every weekend.',
    category: 'Nightlife',
    tag: 'vip',
    heroImage: IMG.vip,
    heroHeadline: 'YOUR BOOTH. YOUR NIGHT.',
    heroSubhead: '16 private VIP booths · Bottle packages · Priority entry',
    ctaLabel: 'Reserve a VIP Booth',
    description: 'Preva Club & Kitchen\'s 16 exclusive VIP booths are the most sought-after seats in Metro Detroit nightlife. Each booth includes premium bottle selections, a dedicated hostess, mixers and ice, and priority entry for your entire group. Reserve your booth in advance — they sell out every weekend.',
    features: [
      { icon: '🏆', heading: '16 Private Booths', body: 'Exclusive booth seating for groups of 4–12' },
      { icon: '🍾', heading: 'Bottle Packages', body: 'Curated bottle packages at every price point' },
      { icon: '👸', heading: 'Hostess Service', body: 'Personal hostess dedicated to your booth all night' },
      { icon: '⚡', heading: 'Priority Entry', body: 'Your entire group enters before the general crowd' },
    ],
    formSource: 'vip-booths-landing',
  }),

  page({
    slug: 'promoters',
    title: 'Promoter & Event Host Program',
    metaTitle: 'Become a Promoter at Preva Club Redford MI | Event Host Program',
    metaDesc: 'Join the Preva Club promoter and event host program in Redford MI. Date holds, door splits, and marketing support for promoters and event hosts.',
    category: 'Nightlife',
    tag: 'promoter',
    heroImage: IMG.promoter,
    heroHeadline: 'PROMOTE AT PREVA. EARN BIG.',
    heroSubhead: 'Date holds · Door splits · Marketing support · Apply today',
    ctaLabel: 'Apply as a Promoter',
    description: 'Are you a nightlife promoter or event host in Metro Detroit? Preva Club & Kitchen is looking for talented promoters to partner with. Our promoter program offers date holds, door split arrangements, marketing support through our social media channels, and full venue access for your events. Apply today and start building your brand at Preva.',
    features: [
      { icon: '📅', heading: 'Date Holds', body: 'Reserve dates exclusively for your events' },
      { icon: '💰', heading: 'Door Splits', body: 'Competitive door split arrangements available' },
      { icon: '📱', heading: 'Marketing Support', body: 'Social media promotion through Preva\'s channels' },
      { icon: '🤝', heading: 'Partnership', body: 'Long-term promoter partnership opportunities' },
    ],
    formSource: 'promoter-landing',
  }),

  page({
    slug: 'theme-nights',
    title: 'Weeknight Theme Nights',
    metaTitle: 'Theme Nights Redford MI | College Night | Ladies Night | Preva Club',
    metaDesc: 'Weeknight theme nights at Preva Club in Redford MI. College night, ladies night, karaoke, Latin night, and rotating weekly programming.',
    category: 'Nightlife',
    tag: 'theme-night',
    heroImage: IMG.theme_night,
    heroHeadline: 'EVERY NIGHT HAS A VIBE.',
    heroSubhead: 'College night · Ladies night · Latin nights · Weekly rotation',
    ctaLabel: 'See the Weekly Lineup',
    description: 'Preva Club & Kitchen\'s weeknight theme nights bring the energy every night of the week. Our rotating weekly lineup features College Night, Ladies\' Night, Latin Night, Karaoke Night, and more — each with its own atmosphere, specials, and entertainment. Check our current weekly schedule and come out for your favorite night.',
    features: [
      { icon: '🎓', heading: 'College Night', body: 'Student ID drink specials and DJ entertainment' },
      { icon: '👸', heading: 'Ladies Night', body: 'Ladies drink specials and priority entry perks' },
      { icon: '💃', heading: 'Latin Night', body: 'Salsa, bachata, and reggaeton with live DJ' },
      { icon: '🎤', heading: 'Karaoke Night', body: 'Open mic karaoke with full bar service' },
    ],
    formSource: 'theme-nights-landing',
  }),

  page({
    slug: 'holiday-events',
    title: 'Holiday & Seasonal Nights',
    metaTitle: 'Holiday Events Redford MI | NYE Party | Halloween Night | Preva Club',
    metaDesc: 'Holiday and seasonal events at Preva Club in Redford MI. NYE, Halloween, Thanksgiving Eve, Memorial Day, and Juneteenth ticketed events.',
    category: 'Nightlife',
    tag: 'holiday',
    heroImage: IMG.holiday,
    heroHeadline: 'HOLIDAYS ARE BIGGER AT PREVA.',
    heroSubhead: 'NYE · Halloween · Thanksgiving Eve · Juneteenth · Premium events',
    ctaLabel: 'Buy Holiday Tickets',
    description: 'Preva Club & Kitchen throws Metro Detroit\'s most memorable holiday events. From our legendary New Year\'s Eve countdown and Halloween costume party to Thanksgiving Eve celebrations, Memorial Day Weekend parties, and Juneteenth events — every major holiday gets the full Preva treatment with premium production, entertainment, and VIP experiences.',
    features: [
      { icon: '🎆', heading: 'New Year\'s Eve', body: 'Legendary NYE countdown with premium packages' },
      { icon: '🎃', heading: 'Halloween Night', body: 'Costume contest, themed décor, and prize giveaways' },
      { icon: '🙏', heading: 'Thanksgiving Eve', body: 'The biggest party night before the holiday' },
      { icon: '✊', heading: 'Juneteenth', body: 'Meaningful celebration with entertainment and culture' },
    ],
    formSource: 'holiday-events-landing',
  }),

  page({
    slug: 'venue-buyout',
    title: 'Full Venue Buyout',
    metaTitle: 'Full Venue Buyout Redford MI | Exclusive Venue Rental | Preva Club',
    metaDesc: 'Exclusive full venue buyout at Preva Club in Redford MI. The entire club, kitchen, patio, and lot for one host — the ultimate exclusive event experience.',
    category: 'Nightlife',
    tag: 'buyout',
    heroImage: IMG.buyout,
    heroHeadline: 'OWN THE WHOLE VENUE.',
    heroSubhead: 'Full club · Kitchen · Patio · Lot — exclusively yours',
    ctaLabel: 'Request a Buyout Quote',
    description: 'The ultimate Preva experience: rent the entire venue exclusively for your event. A full venue buyout at Preva Club & Kitchen gives you exclusive access to the entire club, Preva Kitchen, the 4,400 sq ft outdoor patio, and the parking lot — for one host, one night. Perfect for major corporate events, celebrity parties, music video productions, and large private celebrations.',
    features: [
      { icon: '🏰', heading: 'Entire Venue', body: 'Full club, kitchen, patio, and lot exclusively yours' },
      { icon: '🎬', heading: 'Production Ready', body: 'Available for film, video, and photo productions' },
      { icon: '👑', heading: '700+ Capacity', body: 'Host up to 700+ guests in complete exclusivity' },
      { icon: '🎪', heading: 'Custom Everything', body: 'Custom branding, décor, catering, and entertainment' },
    ],
    formSource: 'venue-buyout-landing',
  }),
];

for (const p of setF) await upsertPage(p);
console.log(`  ✓ ${setF.length} Nightlife pages seeded`);

/* ═══════════════════════════════════════════════════════════════════════════
   SET G — REPEAT, LOYALTY & PARTNERS (Pages 48–52)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n[Set G] Repeat, Loyalty & Partners...');

const setG = [
  page({
    slug: 'rewards',
    title: 'Preva Rewards & Guest List',
    metaTitle: 'Preva Rewards Program | Guest List Sign-Up | Preva Club',
    metaDesc: 'Join the Preva Rewards & Guest List in Redford MI. Free birthday entry, drink perks, and early event access for loyalty members.',
    category: 'Loyalty',
    tag: 'rewards',
    heroImage: IMG.rewards,
    heroHeadline: 'OWN THE GUEST. REBOOK WITHOUT ASKING.',
    heroSubhead: 'Free birthday entry · Drink perks · Early access · Loyalty rewards',
    ctaLabel: 'Join Preva Rewards',
    description: 'Preva Rewards is our loyalty program that keeps you connected to the best events, perks, and experiences at Preva Club & Kitchen. Members enjoy free birthday entry, exclusive drink perks, early access to major events, and priority booking for VIP booths. Sign up today and join Detroit\'s most exclusive loyalty community.',
    features: [
      { icon: '🎂', heading: 'Free Birthday Entry', body: 'Complimentary entry on your birthday weekend' },
      { icon: '🥃', heading: 'Drink Perks', body: 'Member drink specials and periodic drink credits' },
      { icon: '⚡', heading: 'Early Access', body: 'Priority access to event announcements and ticket sales' },
      { icon: '👑', heading: 'VIP Priority', body: 'Priority booking window for VIP booth reservations' },
    ],
    formSource: 'rewards-landing',
  }),

  page({
    slug: 'book-again',
    title: 'Returning Host Rebooking Portal',
    metaTitle: 'Rebook Your Event at Preva Club | Returning Host | Preva Redford MI',
    metaDesc: 'One-click rebooking for hosts and companies who have already held an event at Preva Club in Redford MI. Skip the process — just pick your date.',
    category: 'Loyalty',
    tag: 'rebook',
    heroImage: IMG.rebook,
    heroHeadline: 'YOU\'VE BEEN HERE. COME BACK.',
    heroSubhead: 'One-click rebook · Pick your date · Same terms · Faster confirmation',
    ctaLabel: 'Book Again',
    description: 'Already hosted an event at Preva Club & Kitchen? Coming back is even easier. Our returning host rebooking portal lets you lock in your next date quickly — with the same event preferences, terms, and Preva team that made your first event a success. Just tell us your preferred date and we\'ll handle the rest.',
    features: [
      { icon: '🔄', heading: 'Fast Rebooking', body: 'Skip the questionnaire — we already know your preferences' },
      { icon: '📅', heading: 'Date Flexibility', body: 'Multiple date options to fit your schedule' },
      { icon: '💼', heading: 'Same Team', body: 'Work with the same event coordinator from last time' },
      { icon: '💰', heading: 'Returning Client Rates', body: 'Special pricing for returning hosts and companies' },
    ],
    formSource: 'rebook-landing',
  }),

  page({
    slug: 'preferred-vendors',
    title: 'Preferred Vendor & Planner Network',
    metaTitle: 'Preva Preferred Vendor Network | DJs Photographers Planners | Redford MI',
    metaDesc: 'Join the Preva Preferred Vendor Network in Redford MI. Referral partnerships for event planners, DJs, photographers, decorators, and bakeries.',
    category: 'Loyalty',
    tag: 'vendor-network',
    heroImage: IMG.vendor_net,
    heroHeadline: 'GROW YOUR BUSINESS WITH PREVA.',
    heroSubhead: 'Vendor referrals · Partnership listings · Preferred vendor status',
    ctaLabel: 'Join the Vendor Network',
    description: 'Are you an event planner, DJ, photographer, decorator, or baker in Metro Detroit? Join the Preva Preferred Vendor Network and receive referrals from our team to the hundreds of event clients we serve each year. Preferred vendor listing, active referrals, and co-marketing opportunities — apply to join our network today.',
    features: [
      { icon: '🤝', heading: 'Active Referrals', body: 'Direct referrals from Preva to our event clients' },
      { icon: '📋', heading: 'Vendor Listing', body: 'Listed on our preferred vendor directory' },
      { icon: '📣', heading: 'Co-Marketing', body: 'Featured in Preva social media and email campaigns' },
      { icon: '🎪', heading: 'All Vendor Types', body: 'DJs, photographers, decorators, bakeries, planners' },
    ],
    formSource: 'vendor-network-landing',
  }),

  page({
    slug: 'corporate-accounts',
    title: 'Corporate Annual Account',
    metaTitle: 'Corporate Annual Account | House Account | Volume Pricing | Preva Club',
    metaDesc: 'Corporate annual accounts and house accounts at Preva Club in Redford MI. Volume pricing for companies booking recurring events and catering.',
    category: 'Loyalty',
    tag: 'corporate-account',
    heroImage: IMG.corporate_acc,
    heroHeadline: 'YOUR COMPANY DESERVES A HOUSE ACCOUNT.',
    heroSubhead: 'House accounts · Volume pricing · Recurring bookings · Priority service',
    ctaLabel: 'Open a House Account',
    description: 'For companies and organizations that book events at Preva Club & Kitchen regularly, our Corporate Annual Account program offers significant advantages. Enjoy volume pricing, priority booking windows, dedicated account management, invoicing capabilities, and exclusive corporate member rates on all bookings throughout the year.',
    features: [
      { icon: '📊', heading: 'Volume Pricing', body: 'Discounted rates for multiple annual bookings' },
      { icon: '📋', heading: 'Invoicing', body: 'Net-30 invoicing and corporate billing options' },
      { icon: '👔', heading: 'Account Manager', body: 'Dedicated account manager for all bookings' },
      { icon: '⚡', heading: 'Priority Access', body: 'First access to premium dates before public release' },
    ],
    formSource: 'corporate-accounts-landing',
  }),

  page({
    slug: 'referrals',
    title: 'Refer a Host & Earn',
    metaTitle: 'Preva Referral Program | Refer & Earn | Preva Club Redford MI',
    metaDesc: 'Earn referral credit at Preva Club in Redford MI. Refer guests and staff who send qualified event bookings to Preva and earn rewards.',
    category: 'Loyalty',
    tag: 'referral',
    heroImage: IMG.referral,
    heroHeadline: 'SHARE PREVA. EARN REWARDS.',
    heroSubhead: 'Refer a host · Earn credits · Share the experience · Win together',
    ctaLabel: 'Refer and Earn',
    description: 'Love your experience at Preva Club & Kitchen? Share it and get rewarded. Our Refer a Host & Earn program gives you referral credit every time someone you refer books a qualified event at Preva. The more you share, the more you earn — in bar credits, event discounts, and exclusive Preva perks.',
    features: [
      { icon: '💬', heading: 'Share Your Link', body: 'Get your personal referral link to share with friends' },
      { icon: '💰', heading: 'Earn Credits', body: 'Bar credits and event discounts for qualified referrals' },
      { icon: '🎁', heading: 'Bonus Rewards', body: 'Bonus rewards for multiple referrals per quarter' },
      { icon: '📱', heading: 'Track Progress', body: 'Monitor your referrals and earnings in real time' },
    ],
    formSource: 'referrals-landing',
  }),
];

for (const p of setG) await upsertPage(p);
console.log(`  ✓ ${setG.length} Loyalty & Partner pages seeded`);

/* ─── Summary ─────────────────────────────────────────────────────────────── */
const total = setA.length + setB.length + setC.length + setD.length + setE.length + setF.length + setG.length;
console.log(`\n✅ All done! ${total} landing pages seeded into MongoDB.\n`);
console.log('Pages are live at:');
console.log('  /weddings, /engagement-parties, /birthday-parties ...');
console.log('  /corporate-events, /meeting-space-redford ...');
console.log('  /nightclub, /vip-booths, /venue-buyout ...');
console.log('  /rewards, /referrals, /preferred-vendors ...\n');

await client.close();
