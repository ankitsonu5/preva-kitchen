import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cmsFetch } from '@/lib/cms';
import { ShopProvider } from '@/components/shop/ShopProvider';
import { ProductCard } from '@/components/shop/ProductGrid';
import ReadyToOrder from '@/components/shop/ReadyToOrder';
import { pageMetadata, truncateAtWord } from '@/lib/seo';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateBreadcrumbSchema } from '@/lib/seo-schema';
import { FALLBACK_PRODUCTS } from '@/data/fallbackMenu';
import { withoutLegacyDuplicates } from '@/lib/legacy-dish-slugs';
import {
  CANONICAL_CATEGORIES,
  CATEGORY_IMAGES,
  categoryCopy,
  categoryPath,
  categorySlug,
  normalizeCategoryName
} from '@/lib/menu-categories';

export const dynamic = 'force-dynamic';

async function loadCategory(slug) {
  const data = await cmsFetch('/shop/products');
  const all = withoutLegacyDuplicates(Array.isArray(data) && data.length > 0 ? data : FALLBACK_PRODUCTS);
  const available = all.filter((product) => product.category);
  const items = available.filter((product) => categorySlug(product.category) === slug);
  if (items.length === 0) return null;
  const name = normalizeCategoryName(items[0].category);
  const otherNames = [...new Set(available.map((product) => normalizeCategoryName(product.category)))]
    .filter((other) => categorySlug(other) !== slug)
    .sort((a, b) => {
      const ai = CANONICAL_CATEGORIES.indexOf(a);
      const bi = CANONICAL_CATEGORIES.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  return { name, items, otherNames };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return { title: 'Category not found' };
  const copy = categoryCopy(category.name);
  return pageMetadata({
    title: copy.heading,
    description: truncateAtWord(`${copy.blurb} Order online or call (313) 286-3586.`, 155),
    path: categoryPath(category.name),
    image: CATEGORY_IMAGES[category.name] || undefined,
    imageSize: null
  });
}

export default async function MenuCategoryPage({ params }) {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) notFound();

  const origin = getCanonicalOrigin();
  const copy = categoryCopy(category.name);
  const path = categoryPath(category.name);
  const names = category.items.map((item) => item.name);
  const nameList = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];

  const faqs = [
    {
      q: `What ${copy.noun} does Preva Kitchen serve?`,
      a: `Our ${copy.noun} menu currently includes ${nameList}. Availability can change, so the menu on this page is always the latest.`
    },
    {
      q: `How can I order ${copy.noun} from Preva Kitchen?`,
      a: 'Add items to your order online for pickup or delivery, call (313) 286-3586, or visit us at 13090 Inkster Rd, Redford Township, MI 48239.'
    }
  ];

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${origin}${path}#webpage`,
        url: `${origin}${path}`,
        name: copy.heading,
        description: copy.blurb,
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@id': `${origin}/#restaurant` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: category.items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${origin}/menu/${encodeURIComponent(item.slug)}`,
            name: item.name
          }))
        }
      },
      generateBreadcrumbSchema(
        [
          { name: 'Home', url: '/' },
          { name: 'Menu', url: '/menu' },
          { name: category.name, url: path }
        ],
        origin
      ),
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a }
        }))
      }
    ]
  };

  return (
    <ShopProvider>
      <div className="ps">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\u003c') }}
        />
        <div className="ps-wrap">
          <nav className="ps-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>/</span>
            <Link href="/menu">Menu</Link> <span>/</span>
            <span>{category.name}</span>
          </nav>

          <header className="ps-cat-head">
            <span className="ps-kicker">Preva Kitchen Menu</span>
            <h1 className="ps-h1 ps-cat-head__title">{copy.heading}</h1>
            <div className="ps-cat-head__copy">
              <p>{copy.blurb}</p>
              <p>
                Our {copy.noun} menu: {nameList}. Preva Kitchen is at 13090 Inkster Rd in Redford Township, Michigan.
              </p>
            </div>
          </header>

          <div className="ps-grid">
            {category.items.map((product) => (
              <ProductCard product={product} key={product.id || product._id || product.slug} />
            ))}
          </div>

          <ReadyToOrder />

          <section className="ps-cat-faq" aria-labelledby="category-faq">
            <h2 id="category-faq" className="ps-cat-title">{category.name} questions</h2>
            <div className="ps-detail-rule" aria-hidden="true" />
            <div className="ps-cat-faq__list">
              {faqs.map((faq) => (
                <div key={faq.q} className="ps-cat-faq__item">
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {category.otherNames.length > 0 && (
            <div className="ps-cat-more">
              <h2 className="ps-cat-title">More from the menu</h2>
              <div className="ps-detail-rule" aria-hidden="true" />
              <nav aria-label="More menu categories">
                <ul className="ps-cat-more__list">
                  {category.otherNames.map((other) => (
                    <li key={other}>
                      <Link href={categoryPath(other)}>{other}</Link>
                    </li>
                  ))}
                  <li><Link href="/menu" className="ps-cat-more__all">Full menu</Link></li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
    </ShopProvider>
  );
}
