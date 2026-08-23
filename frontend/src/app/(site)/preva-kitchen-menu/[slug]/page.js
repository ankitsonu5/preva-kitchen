import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDishBySlug, getDeliveryLinks, KITCHEN_MENU_ITEMS, getAllDishes } from '@/lib/kitchen-menu-data';
import SvgIcon from '@/components/SvgIcon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';

async function fetchDish(slug) {
  if (!slug) return null;
  const clean = String(slug).toLowerCase().replace(/^\/|\/$/g, '').trim();

  // 1. Try to fetch from backend API / MongoDB
  try {
    const res = await fetch(`${API_BASE}/menu-items/${encodeURIComponent(clean)}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const item = await res.json();
      if (item && item.name) {
        return {
          name: item.name,
          slug: item.slug || clean,
          category: item.category || 'Menu Item',
          price: item.price || (item.priceCents ? `$${(item.priceCents / 100).toFixed(2)}` : '$0.00'),
          description: item.description || '',
          image: item.image || '',
          tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()) : []),
          pairings: Array.isArray(item.pairings) ? item.pairings : (typeof item.pairings === 'string' ? item.pairings.split(',').map(p => p.trim()) : []),
          uberEatsUrl: item.uberEatsUrl || '',
          doorDashUrl: item.doorDashUrl || '',
          grubhubUrl: item.grubhubUrl || ''
        };
      }
    }
  } catch (err) {
    // Backend fetch failed, proceed to local dataset
  }

  // 2. Check authentic static dataset
  return getDishBySlug(clean);
}

export async function generateStaticParams() {
  return getAllDishes().map((dish) => ({
    slug: dish.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dish = await fetchDish(slug);
  if (!dish) {
    return { title: 'Menu Item | Preva Kitchen & Lounge' };
  }
  return {
    title: `${dish.name} in Redford, MI | Preva Kitchen`,
    description: `${dish.description || dish.name} Order in Redford Township, MI for pickup or delivery.`,
    alternates: { canonical: `/preva-kitchen-menu/${dish.slug}` },
    openGraph: {
      title: `${dish.name} | Preva Kitchen`,
      description: dish.description,
      images: [dish.image]
    }
  };
}

export default async function DishDetailPage({ params }) {
  const { slug } = await params;
  const dish = await fetchDish(slug);

  if (!dish) {
    notFound();
  }

  const defaultLinks = getDeliveryLinks(dish.slug);
  const deliveryLinks = {
    ubereats: dish.uberEatsUrl || defaultLinks.ubereats,
    doordash: dish.doorDashUrl || defaultLinks.doordash,
    grubhub: dish.grubhubUrl || defaultLinks.grubhub,
    pickup: defaultLinks.pickup
  };
  const pairings = dish.pairings
    ? KITCHEN_MENU_ITEMS.filter(item => dish.pairings.includes(item.name))
    : [];

  const faqs = [
    {
      q: `What is the ${dish.name} at Preva Kitchen & Lounge?`,
      a: `${dish.description} It is part of the ${dish.category} section of the menu at Preva Kitchen & Lounge in Redford Township, MI.`
    },
    {
      q: `How much does the ${dish.name} cost?`,
      a: `The ${dish.name} costs ${dish.price} at Preva Kitchen & Lounge, Redford Township, MI. Prices on third-party delivery apps may vary slightly.`
    },
    {
      q: `Where can I order the ${dish.name} near me?`,
      a: `The ${dish.name} is freshly prepared at Preva Kitchen & Lounge, located at 13090 Inkster Rd, Redford Township, MI 48239. Dine in or call +1 313-286-3586 for fast pickup, or order online for delivery.`
    },
    {
      q: `Can I get the ${dish.name} delivered in Redford Township?`,
      a: `Yes — order the ${dish.name} for delivery through Uber Eats, DoorDash or Grubhub straight from this page, or call +1 313-286-3586 to order pickup from 13090 Inkster Rd, Redford Township, MI.`
    },
    {
      q: `What goes well with the ${dish.name}?`,
      a: `Popular pairings from the Preva Kitchen & Lounge menu include ${dish.pairings ? dish.pairings.join(', ') : 'our signature sides'} — all available on the same order.`
    }
  ];

  return (
    <div className="pk-dish-page-wrapper">
      {/* Background ambient lighting */}
      <div className="pk-dish-bg-ambient" aria-hidden="true"></div>

      <div className="container pk-dish-container">
        {/* Breadcrumb navigation */}
        <nav className="pk-crumbs" aria-label="Breadcrumb">
          <ol>
            <li><Link href="/">Home</Link></li>
            <li className="pk-crumb-sep">✦</li>
            <li><Link href="/preva-kitchen-menu">Menu</Link></li>
            <li className="pk-crumb-sep">✦</li>
            <li><Link href={`/preva-kitchen-menu#${encodeURIComponent(dish.category.toLowerCase())}`}>{dish.category}</Link></li>
            <li className="pk-crumb-sep">✦</li>
            <li className="pk-crumb-active" aria-current="page">{dish.name}</li>
          </ol>
        </nav>

        {/* Main Dish Presentation Card */}
        <article className="pk-dish-showcase">
          <div className="pk-dish-grid">
            {/* Left Column: High-Res Dish Visual */}
            <div className="pk-dish-media-col">
              <div className="pk-dish-media-box">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="pk-dish-main-img"
                  loading="eager"
                />
                <div className="pk-dish-img-badge">
                  <span className="pk-badge-dot"></span>
                  <span>{dish.category}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Dish Info & Order Channels */}
            <div className="pk-dish-info-col">
              <div className="pk-dish-meta-header">
                <span className="pk-dish-eyebrow">{dish.category}</span>
                <h1 className="pk-dish-heading">{dish.name}</h1>
                <div className="pk-dish-price-tag">{dish.price}</div>
              </div>

              {/* Dietary / Characteristic Badges */}
              {dish.tags && dish.tags.length > 0 && (
                <div className="pk-tags-list" aria-label="Dietary and prep tags">
                  {dish.tags.map((tag, idx) => (
                    <span key={idx} className={`pk-tag-pill ${tag.includes('contains') ? 'pk-tag-allergen' : ''}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              <p className="pk-dish-desc">{dish.description}</p>

              {/* Order Your Way Platforms */}
              <div className="pk-order-block">
                <div className="pk-order-label">
                  <span>Order Online or Call</span>
                  <div className="pk-order-line"></div>
                </div>

                <div className="pk-order-channels-grid">
                  {/* Uber Eats */}
                  <a
                    href={deliveryLinks.ubereats}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pk-channel-card pk-card-ubereats"
                    title={`Order ${dish.name} on Uber Eats`}
                  >
                    <div className="pk-channel-brand">
                      <span className="pk-brand-ubergreen">Uber</span>
                      <span className="pk-brand-white">Eats</span>
                    </div>
                    <span className="pk-channel-cta">Buy Now →</span>
                  </a>

                  {/* DoorDash */}
                  <a
                    href={deliveryLinks.doordash}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pk-channel-card pk-card-doordash"
                    title={`Order ${dish.name} on DoorDash`}
                  >
                    <div className="pk-channel-brand">
                      <svg width="22" height="13" viewBox="0 0 40 24" fill="none">
                        <path d="M4 12C4 7 7.5 3 12.5 3H26C28 3 29 4.5 29 6C29 7.5 28 9 26 9H14C12 9 11 10.5 11 12C11 13.5 12 15 14 15H32C34 15 35 16.5 35 18C35 19.5 34 21 32 21H12.5C7.5 21 4 17 4 12Z" fill="#FF3008"/>
                      </svg>
                      <span className="pk-brand-dd">DoorDash</span>
                    </div>
                    <span className="pk-channel-cta">Buy Now →</span>
                  </a>

                  {/* Grubhub */}
                  <a
                    href={deliveryLinks.grubhub}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pk-channel-card pk-card-grubhub"
                    title={`Order ${dish.name} on Grubhub`}
                  >
                    <div className="pk-channel-brand">
                      <svg width="18" height="18" viewBox="0 0 32 30" fill="none">
                        <path d="M16 3L3 13V29H29V13L16 3Z" fill="#FF8000"/>
                        <path d="M11 16V24M16 16V24M21 16V24" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      <span className="pk-brand-gh">Grubhub</span>
                    </div>
                    <span className="pk-channel-cta">Buy Now →</span>
                  </a>

                  {/* Pickup Direct */}
                  <a
                    href={deliveryLinks.pickup}
                    className="pk-channel-card pk-card-pickup"
                    title="Call for direct pickup"
                  >
                    <div className="pk-channel-brand">
                      <span className="pk-pickup-icon"><SvgIcon name="phone" size={20} /></span>
                      <span className="pk-brand-pickup">Pickup (Call)</span>
                    </div>
                    <span className="pk-channel-cta">Call Now →</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Popular Pairings */}
        {pairings.length > 0 && (
          <section className="pk-pairings-section">
            <div className="pk-pairings-header">
              <span className="pk-dish-eyebrow">CHEF RECOMMENDATIONS</span>
              <h2 className="pk-pairings-title">Pairs Well With This Dish</h2>
            </div>
            <div className="pk-pairings-grid">
              {pairings.map((pair, idx) => (
                <Link
                  key={idx}
                  href={`/preva-kitchen-menu/${pair.slug}`}
                  className="pk-pairing-card"
                >
                  <div
                    className="pk-pairing-img"
                    style={{ backgroundImage: `url('${pair.image}')` }}
                  ></div>
                  <div className="pk-pairing-info">
                    <span className="pk-pairing-cat">{pair.category}</span>
                    <h3 className="pk-pairing-name">{pair.name}</h3>
                    <span className="pk-pairing-price">{pair.price}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Accordion Section */}
        <section className="pk-faq-section" aria-label="Frequently asked questions">
          <div className="pk-faq-header">
            <span className="pk-dish-eyebrow">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="pk-faq-title">Questions about the {dish.name}</h2>
          </div>
          <div className="pk-faq-list">
            {faqs.map((faq, idx) => (
              <details key={idx} className="pk-faq-item" open={idx === 0}>
                <summary className="pk-faq-question">
                  <span>{faq.q}</span>
                  <span className="pk-faq-toggle-icon">+</span>
                </summary>
                <div className="pk-faq-answer">
                  <p>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Back to Menu / Reservations Footer Banner */}
        <div className="pk-dish-footer-cta">
          <div className="pk-footer-cta-content">
            <h3>Experience the full Preva Kitchen Menu</h3>
            <p>From sizzling steaks and crispy wings to handcrafted cocktails and late-night vibes.</p>
          </div>
          <div className="pk-footer-cta-buttons">
            <Link href="/preva-kitchen-menu" className="luxe-btn luxe-btn-gold">
              VIEW FULL MENU
            </Link>
            <Link href="/preva-kitchen#reservations" className="luxe-btn luxe-btn-glass">
              RESERVE A TABLE
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
