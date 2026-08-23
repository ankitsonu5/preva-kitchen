import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cmsFetch } from '@/lib/cms';
import { ShopProvider } from '@/components/shop/ShopProvider';
import { ProductCard } from '@/components/shop/ProductGrid';
import ProductBuy from '@/components/shop/ProductBuy';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await cmsFetch(`/shop/products/${encodeURIComponent(slug)}`);
  if (!data?.product) return { title: 'Item not found' };
  return {
    title: data.product.name,
    description: data.product.description,
    alternates: { canonical: `/shop/${encodeURIComponent(slug)}` }
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const data = await cmsFetch(`/shop/products/${encodeURIComponent(slug)}`);
  if (!data?.product) notFound();

  const { product, related } = data;

  const specs = [
    product.servings ? ['Serves', product.servings] : null,
    product.calories ? ['Calories', String(product.calories)] : null,
    ['Category', product.category],
    ['Availability', product.available ? 'On today’s menu' : 'Sold out']
  ].filter(Boolean);

  return (
    <ShopProvider>
      <div className="ps">
        <div className="ps-wrap">
          <nav className="ps-crumbs">
            <Link href="/shop">Order online</Link> <span>/</span>
            <Link href="/shop">{product.category}</Link> <span>/</span>
            <span>{product.name}</span>
          </nav>

          <div className="ps-pdp">
            <div className="ps-pdp__shot">
              {product.image ? (
                <img src={product.image} alt={product.name} />
              ) : (
                <div className="ps-noshot"><span>Preva</span></div>
              )}
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
                      Delivery runs across Redford and the surrounding neighbourhoods.
                    </p>
                  </div>
                </details>
                <details>
                  <summary>Allergens</summary>
                  <div className="ps-acc__body">
                    <p>
                      Tell us in the notes if you have an allergy and the kitchen will call you back before
                      it starts cooking. Our fryers are shared, so we cannot guarantee a gluten-free fry.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {related?.length > 0 && (
            <section className="ps-sec" style={{ borderTop: '1px solid var(--ps-line)' }}>
              <div className="ps-shead">
                <div>
                  <span className="ps-kicker">Goes well with</span>
                  <h2 className="ps-h2">More {product.category}</h2>
                </div>
                <Link href="/shop" className="ps-more">Full menu</Link>
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
