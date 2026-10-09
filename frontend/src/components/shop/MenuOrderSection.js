import OrderWayTiles from '@/components/shop/OrderWayTiles';
import { getDeliveryLinks } from '@/lib/kitchen-menu-data';

/** Closing "Ready to order?" card at the end of the menu page. */
export default function MenuOrderSection() {
  const links = getDeliveryLinks('menu');

  return (
    <section className="ps-order-card" aria-labelledby="menu-order-title">
      <h2 id="menu-order-title" className="ps-order-card__title">Ready to order?</h2>
      <p className="ps-order-card__sub">Delivery, pickup, or call the kitchen directly.</p>
      <div className="ps-way">
        <h3 className="ps-way__title"><span>Order your way</span></h3>
        <OrderWayTiles links={links} subject="Preva Kitchen" />
      </div>
    </section>
  );
}
