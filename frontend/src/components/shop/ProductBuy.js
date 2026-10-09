import { getDeliveryLinks } from '@/lib/kitchen-menu-data';
import OrderWayTiles from '@/components/shop/OrderWayTiles';

/**
 * "Order your way" tiles on the dish page. Ordering happens on the delivery
 * partner's app (or by phone for pickup), so there is no cart on this site.
 */
export default function ProductBuy({ product }) {
  const defaults = getDeliveryLinks(product.slug);
  const preferItemLink = (custom, fallback, marker) => {
    if (custom && custom.includes(marker)) return custom;
    if (fallback && fallback.includes(marker)) return fallback;
    return custom || fallback;
  };
  // A dish's own item link (set in Admin > Food Menu) opens that dish on the
  // delivery app; the restaurant-wide store page is only the fallback.
  const links = {
    ...defaults,
    ubereats: preferItemLink(product.uberEatsUrl, defaults.ubereats, 'modctx='),
    doordash: product.doorDashUrl || defaults.doordash,
    grubhub: preferItemLink(product.grubhubUrl, defaults.grubhub, '/menu-item/')
  };
  return (
    <section className="ps-way" aria-label={`Order ${product.name}`}>
      <h2 className="ps-way__title"><span>Order your way</span></h2>
      <OrderWayTiles links={links} subject={product.name} />
    </section>
  );
}
