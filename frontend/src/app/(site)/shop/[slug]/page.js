import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cmsFetch, cmsFetchWithStatus } from '@/lib/cms';
import { ProductCard } from '@/components/shop/ProductGrid';
import ProductBuy from '@/components/shop/ProductBuy';
import {
  getDefaultAboutTitle,
  getDishFaqs,
  getDishDisplayName,
  getDishMetaDescription,
  withDishArticle,
  isPluralName,
  parseAboutContent,
  splitAboutLinks,
  isWingFlavorPage,
  getCrossCategoryPairings
} from '@/lib/dish-detail-content';
import { withCanonicalSlugs } from '@/lib/legacy-dish-slugs';
import { pageMetadata } from '@/lib/seo';
import { dishImage } from '@/lib/dish-images';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getFallbackProduct, getFallbackRelated } from '@/data/fallbackMenu';
import { categoryPath as menuCategoryPath } from '@/lib/menu-categories';
import { money } from '@/lib/money';
import MenuCustomizer from '@/components/shop/MenuCustomizer';
import MenuProductBreadcrumbName from '@/components/shop/MenuProductBreadcrumbName';
import {
  getMenuCustomization,
  getMenuDisplayName,
  getMenuOptionImage,
  getMenuProductDescription,
  getMenuProductName,
  getMenuPriceCents,
  getProductMenuPriceCents,
  isRemovedMenuProduct,
  MENU_IMAGE_UNAVAILABLE,
  normalizeMenuSelection
} from '@/lib/menu-options';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }) {
  const [{ slug }, query = {}] = await Promise.all([params, searchParams]);
  if (isRemovedMenuProduct(slug)) notFound();
  const response = await cmsFetchWithStatus(`/shop/products/${encodeURIComponent(slug)}`);
  if (!response.ok && process.env.NODE_ENV === 'production') notFound();
  const data = response.data;
  if (process.env.NODE_ENV === 'production' && !data?.product) notFound();
  const product = data?.product || getFallbackProduct(slug);
  if (!product) return { title: 'Item not found' };
  const config = getMenuCustomization(product.slug, product);
  const selection = config ? normalizeMenuSelection(config, query, product.slug) : {};
  const productName = getMenuDisplayName(getMenuProductName(config, selection) || product.name);
  const displayProduct = { ...product, name: productName };
  const description = product.seoDescription || getDishMetaDescription({
    ...displayProduct,
    description: getMenuProductDescription(product)
  });
  const image = MENU_IMAGE_UNAVAILABLE.has(product.slug)
    ? undefined
    : getMenuOptionImage(product, config, selection, dishImage(product));

  return pageMetadata({
    title: product.seoTitle || `${productName} in Redford, MI`,
    titleIncludesBrand: Boolean(product.seoTitle),
    description,
    path: `/menu/${encodeURIComponent(product.slug || slug)}`,
    image,
    // Dish photos are square, not 1200x630 - do not declare the wrong size.
    imageSize: null,
    type: 'website',
    keywords: [
      productName,
      product.category,
      ...(Array.isArray(product.tags) ? product.tags : []),
      `${productName} Redford MI`,
      'Preva Kitchen menu'
    ].filter(Boolean)
  });
}

export default async function ProductPage({ params, searchParams }) {
  const [{ slug }, query = {}] = await Promise.all([params, searchParams]);
  if (isRemovedMenuProduct(slug)) notFound();
  const [response, publicProducts] = await Promise.all([
    cmsFetchWithStatus(`/shop/products/${encodeURIComponent(slug)}`),
    cmsFetch('/shop/products', { query: { summary: true } })
  ]);
  if (!response.ok && process.env.NODE_ENV === 'production') notFound();
  const data = response.data;
  if (process.env.NODE_ENV === 'production' && !data?.product) notFound();
  const sourceProduct = data?.product || getFallbackProduct(slug);
  if (!sourceProduct) notFound();
  const config = getMenuCustomization(sourceProduct.slug, sourceProduct);
  const initialSelection = config ? normalizeMenuSelection(config, query, sourceProduct.slug) : {};
  const productName = getMenuDisplayName(getMenuProductName(config, initialSelection) || sourceProduct.name);
  const menuPriceCents = config
    ? getMenuPriceCents(config, initialSelection)
    : getProductMenuPriceCents(sourceProduct);
  const product = {
    ...sourceProduct,
    name: productName,
    priceCents: menuPriceCents,
    price: money(menuPriceCents),
    description: getMenuProductDescription(sourceProduct)
  };

  const relatedProducts = data
    ? (Array.isArray(data.related) ? data.related : [])
    : getFallbackRelated(product);
  const related = withCanonicalSlugs(relatedProducts, product.slug);
  const aboutTitle = product.aboutTitle || getDefaultAboutTitle(product);
  const aboutParagraphs = parseAboutContent(product.aboutContent, product);
  const faqs = getDishFaqs(product);
  const displayName = getDishDisplayName(product);
  // Only promise "More <Category>" when every dish listed is from that category.
  const relatedTitle = product.category && related.length > 0 && related.every((item) => item.category === product.category)
    ? `More ${product.category}`
    : 'More from the Menu';
  const linksBackToWingsHub = isWingFlavorPage(product);
  const pairingProducts = Array.isArray(publicProducts)
    ? publicProducts
    : process.env.NODE_ENV === 'production' ? [] : FALLBACK_PRODUCTS;
  const visiblePairingSlugs = new Set(pairingProducts.map((item) => item.slug));
  const crossCategoryPairings = getCrossCategoryPairings(product)
    .filter((pairing) => visiblePairingSlugs.has(pairing.slug));
  const siteOrigin = getCanonicalOrigin();
  const productUrl = `${siteOrigin}/menu/${encodeURIComponent(slug)}`;
  const photo = MENU_IMAGE_UNAVAILABLE.has(product.slug)
    ? null
    : getMenuOptionImage(product, config, initialSelection, dishImage(product));
  const photoUrl = photo ? (photo.startsWith('http') ? photo : `${siteOrigin}${photo}`) : null;
  const categoryPath = product.category ? menuCategoryPath(product.category) : '/menu';
  const priceText = (menuPriceCents / 100).toFixed(2);

  const detailSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: product.name,
        description: product.description,
        ...(photoUrl ? { image: photoUrl } : {}),
        url: productUrl,
        brand: { '@type': 'Brand', name: 'Preva Kitchen' },
        category: product.category,
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'USD',
          price: priceText,
          availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Restaurant', name: 'Preva Kitchen' }
        }
      },
      {
        '@type': 'MenuItem',
        name: product.name,
        description: product.description,
        ...(photoUrl ? { image: photoUrl } : {}),
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

  return (
    <>
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
            {config
              ? <MenuProductBreadcrumbName productName={product.name} />
              : <span>{product.name}</span>}
          </nav>

          <div className={`ps-pdp${config?.isWings ? ' ps-pdp--wings' : ''}`}>
            {config ? (
              <MenuCustomizer
                product={product}
                config={config}
                initialSelection={initialSelection}
              >
                <ProductBuy product={product} />
              </MenuCustomizer>
            ) : (
              <>
                <div className="ps-pdp__shot">
                  {photo ? (
                    <img
                      fetchPriority="high"
                      src={photo}
                      alt={`${product.name} at Preva Kitchen, Redford Township MI`}
                    />
                  ) : (
                    <div className="ps-product-photo-placeholder" role="img" aria-label={`${product.name} photo unavailable`}>
                      Product photo unavailable
                    </div>
                  )}
                </div>

                <div className="ps-pdp__info">
                  <div>
                    <span className="ps-kicker">{product.category}</span>
                    <h1 className="ps-h1" style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>{product.name}</h1>
                  </div>

                  <p className="ps-price ps-price--lg">{money(menuPriceCents)}</p>

                  {product.description && <p className="ps-lede">{product.description}</p>}

                  <ProductBuy product={product} />
                </div>
              </>
            )}
          </div>

          <section className="ps-dish-about" aria-labelledby="dish-about-title">
            <span className="ps-detail-kicker">About</span>
            <h2 id="dish-about-title" className="ps-detail-title">{aboutTitle}</h2>
            <div className="ps-detail-rule" aria-hidden="true" />
            <div className="ps-dish-about__copy">
              {aboutParagraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>
                  {splitAboutLinks(paragraph).map((part, partIndex) => (
                    part.href
                      ? <Link key={partIndex} href={part.href}>{part.text}</Link>
                      : part.text
                  ))}
                </p>
              ))}
              {linksBackToWingsHub && (
                <p>
                  {withDishArticle(displayName, { capitalize: true })} {isPluralName(displayName) ? 'are' : 'is'} part of our{' '}
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
                    {getMenuDisplayName(item.name, item.slug)}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="ps-dish-faq" aria-labelledby="dish-faq-title">
            <span className="ps-detail-kicker">FAQ</span>
            <h2 id="dish-faq-title" className="ps-detail-title">Questions about {withDishArticle(displayName)}</h2>
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
                  <h2 className="ps-h2">{relatedTitle}</h2>
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
    </>
  );
}
