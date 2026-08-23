import Link from 'next/link';

const ORDER_ITEMS = Array.from({ length: 4 }).flatMap((_, index) => [
  { label: 'ORDER NOW', type: 'action', key: `order-${index}` },
  { label: 'PREVA KITCHEN', type: 'brand', key: `brand-${index}` }
]);

function MarqueeGroup({ duplicate = false }) {
  return (
    <span className="pk-order-marquee-group" aria-hidden={duplicate || undefined}>
      {ORDER_ITEMS.map((item) => (
        <span className={`pk-order-marquee-item pk-order-marquee-item--${item.type}`} key={item.key}>
          <span className="pk-order-marquee-label">{item.label}</span>
          <span className="pk-order-marquee-spark" aria-hidden="true">✦</span>
        </span>
      ))}
    </span>
  );
}

export default function OrderNowMarquee() {
  return (
    <aside className="pk-order-marquee" aria-label="Order from Preva Kitchen">
      <Link href="/shop" className="pk-order-marquee-link">
        <span className="screen-reader-text">Order from Preva Kitchen online</span>
        <span className="pk-order-marquee-track">
          <MarqueeGroup />
          <MarqueeGroup duplicate />
        </span>
      </Link>
    </aside>
  );
}
