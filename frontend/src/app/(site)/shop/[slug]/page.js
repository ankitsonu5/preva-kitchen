import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cmsFetch } from '@/lib/cms';
import { ShopProvider } from '@/components/shop/ShopProvider';
import { ProductCard } from '@/components/shop/ProductGrid';
import ProductBuy from '@/components/shop/ProductBuy';
import {
  getDefaultAboutTitle,
  getDishFaqs,
  parseAboutContent,
  isWingFlavorPage,
  getCrossCategoryPairings
} from '@/lib/dish-detail-content';
import { pageMetadata, truncateAtWord } from '@/lib/seo';
import { dishImage } from '@/lib/dish-images';
import { getOrderingStatus } from '@/lib/kitchen-hours';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getFallbackProduct, getFallbackRelated } from '@/data/fallbackMenu';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await cmsFetch(`/shop/products/${encodeURIComponent(slug)}`);
  const product = data?.product || getFallbackProduct(slug);
  if (!product) return { title: 'Item not found' };
  const description = product.description
    ? `${product.description} Order ${product.name} from Preva Kitchen for pickup or delivery in Redford Township, MI.`
    : `Order ${product.name} from Preva Kitchen for pickup or delivery in Redford Township, MI.`;

  return pageMetadata({
    title: `${product.name} in Redford, MI`,
    description: truncateAtWord(description, 155),
    path: `/menu/${encodeURIComponent(slug)}`,
    image: dishImage(product),
    // Dish photos are square, not 1200x630 - do not declare the wrong size.
    imageSize: null,
    type: 'website',
    keywords: [
      product.name,
      product.category,
      ...(Array.isArray(product.tags) ? product.tags : []),
      `${product.name} Redford MI`,
      'Preva Kitchen menu'
    ].filter(Boolean)
  });
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const data = await cmsFetch(`/shop/products/${encodeURIComponent(slug)}`);
  const product = data?.product || getFallbackProduct(slug);
  if (!product) notFound();

  const related = data?.related?.length > 0 ? data.related : getFallbackRelated(product);
  const aboutTitle = product.aboutTitle || getDefaultAboutTitle(product);
  const aboutParagraphs = parseAboutContent(product.aboutContent, product);
  const faqs = getDishFaqs(product);
  const linksBackToWingsHub = isWingFlavorPage(product);
  const crossCategoryPairings = getCrossCategoryPairings(product);
  const siteOrigin = getCanonicalOrigin();
  const productUrl = `${siteOrigin}/menu/${encodeURIComponent(slug)}`;
  const photo = dishImage(product);
  const photoUrl = photo.startsWith('http') ? photo : `${siteOrigin}${photo}`;
  const categoryPath = product.category ? `/menu#cat-${String(product.category).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '/menu';
  const priceText = (Number(product.priceCents) / 100).toFixed(2);

  const detailSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: photoUrl,
        url: productUrl,
        brand: { '@type': 'Brand', name: 'Preva Kitchen' },
        category: product.category,
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'USD',
          price: (Number(product.priceCents) / 100).toFixed(2),
          availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Restaurant', name: 'Preva Kitchen' }
        }
      },
      {
        '@type': 'MenuItem',
        name: product.name,
        description: product.description,
        image: photoUrl,
        url: productUrl,
        offers: {
          '@type': 'Offer',
          price: priceText,
          priceCurrency: 'USD'
        }
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a }
        }))
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Menu', url: '/menu' },
        ...(product.category ? [{ name: product.category, url: categoryPath }] : []),
        { name: product.name, url: `/menu/${encodeURIComponent(slug)}` }
      ], siteOrigin)
    ]
  };
  const detailSchemaJson = JSON.stringify(detailSchema).replace(/</g, '\\u003c');

  const specs = [
    product.servings ? ['Serves', product.servings] : null,
    product.calories ? ['Calories', String(product.calories)] : null,
    ['Category', product.category],
    ['Availability', product.available ? getOrderingStatus().label : 'Sold out'],
    Array.isArray(product.allergens) && product.allergens.length > 0
      ? ['Contains', product.allergens.map((a) => a[0].toUpperCase() + a.slice(1)).join(', ')]
      : null
  ].filter(Boolean);

  return (
    <ShopProvider>
      <div className="ps">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: detailSchemaJson }}
        />
        <div className="ps-wrap">
          <nav className="ps-crumbs">
            <Link href="/">Home</Link> <span>/</span>
            <Link href="/menu">Menu</Link> <span>/</span>
            {product.category && (
              <>
                <Link href={categoryPath}>{product.category}</Link> <span>/</span>
              </>
            )}
            <span>{product.name}</span>
          </nav>

          <div className="ps-pdp">
            <div className="ps-pdp__shot">
              <img
                src={photo}
                alt={`${product.name} at Preva Kitchen, Redford Township MI`}
              />
            </div>

            <div className="ps-pdp__info">
              <div>
                <span className="ps-kicker">{product.category}</span>
                <h1 className="ps-h1" style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>{product.name}</h1>
              </div>

              <p className="ps-price ps-price--lg">{product.price}</p>

              {product.description && <p className="ps-lede">{product.description}</p>}

              <dl className="ps-specs">
                {specs.map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <ProductBuy product={product} />

              <div className="ps-acc">
                <details open>
                  <summary>Pickup and delivery</summary>
                  <div className="ps-acc__body">
                    <p>
                      Pickup from 13090 Inkster Rd, Redford Township — usually ready in about 25 minutes.
                      Delivery runs across Redford and the surrounding neighborhoods.
                    </p>
                  </div>
                </details>
                <details>
                  <summary>Dine in or order for a group</summary>
                  <div className="ps-acc__body">
                    <p>
                      Prefer to eat the {product.name} at the table? <Link href="/reservations">Book a table</Link> at
                      Preva Kitchen. Feeding a crowd? <Link href="/catering">Order it by the tray</Link> for your
                      next event.
                    </p>
                  </div>
                </details>
                <details>
                  <summary>Allergens</summary>
                  <div className="ps-acc__body">
                    {Array.isArray(product.allergens) && product.allergens.length > 0 && (
                      <p>
                        <strong>Contains:</strong> {product.allergens.map((a) => a[0].toUpperCase() + a.slice(1)).join(', ')}.
                      </p>
                    )}
                    <p>
                      Tell us in the notes if you have an allergy and the kitchen will call you back before
                      it starts cooking. Our fryers are shared, so we cannot guarantee a gluten-free fry.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <section className="ps-dish-about" aria-labelledby="dish-about-title">
            <span className="ps-detail-kicker">About</span>
            <h2 id="dish-about-title" className="ps-detail-title">{aboutTitle}</h2>
            <div className="ps-detail-rule" aria-hidden="true" />
            <div className="ps-dish-about__copy">
              {aboutParagraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
              {linksBackToWingsHub && (
                <p>
                  The {product.name} is part of our{' '}
                  <Link href="/menu/preva-wings">full wings lineup</Link> — seven house sauces, all made to
                  order in Redford, MI.
                </p>
              )}
            </div>
          </section>

          {crossCategoryPairings.length > 0 && (
            <section className="ps-dish-about" aria-labelledby="pairings-title">
              <span className="ps-detail-kicker">Pairs well with</span>
              <h2 id="pairings-title" className="ps-detail-title">Complete the Plate</h2>
              <div className="ps-detail-rule" aria-hidden="true" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {crossCategoryPairings.map((item) => (
                  <Link key={item.slug} href={`/menu/${item.slug}`} className="ps-chip">
                    {item.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="ps-dish-faq" aria-labelledby="dish-faq-title">
            <span className="ps-detail-kicker">FAQ</span>
            <h2 id="dish-faq-title" className="ps-detail-title">Questions about the {product.name}</h2>
            <div className="ps-detail-rule" aria-hidden="true" />
            <div className="ps-dish-faq__list">
              {faqs.map((faq, index) => (
                <details key={`${faq.q}-${index}`} name={`dish-faq-${product.slug}`} open={index === 0}>
                  <summary>
                    <span>{faq.q}</span>
                    <i aria-hidden="true">+</i>
                  </summary>
                  <div className="ps-dish-faq__answer"><p>{faq.a}</p></div>
                </details>
              ))}
            </div>
          </section>

          {related?.length > 0 && (
            <section className="ps-sec" style={{ borderTop: '1px solid var(--ps-line)' }}>
              <div className="ps-shead">
                <div>
                  <span className="ps-kicker">Goes well with</span>
                  <h2 className="ps-h2">More {product.category}</h2>
                </div>
                <Link href="/menu" className="ps-more">Full menu</Link>
              </div>
              <div className="ps-grid">
                {related.map((item) => <ProductCard product={item} key={item.id} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </ShopProvider>
  );
}
