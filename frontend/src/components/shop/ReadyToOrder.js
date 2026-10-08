import { getDeliveryLinks } from '@/lib/kitchen-menu-data';

export default function ReadyToOrder() {
  const links = getDeliveryLinks('menu');
  const platforms = [
    { name: 'Uber Eats', href: links.ubereats },
    { name: 'DoorDash', href: links.doordash },
    { name: 'Grubhub', href: links.grubhub }
  ];

  return (
    <section className="ps-private-banner" aria-labelledby="ready-to-order">
      <div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase' }}>
          PICKUP & DELIVERY
        </span>
        <h2 id="ready-to-order" className="ps-private-banner__title" style={{ marginTop: 6 }}>
          Ready to order?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14.5px', marginTop: 4 }}>
          Order Preva Kitchen for delivery through your favorite app, or call us for direct pickup.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {platforms.map((platform) => (
          <a
            key={platform.name}
            href={platform.href}
            target="_blank"
            rel="noopener noreferrer"
            className="ps-btn ps-btn--gold"
            style={{ padding: '0 24px' }}
          >
            {platform.name}
          </a>
        ))}
        <a href={links.pickup} className="ps-btn ps-btn--ghost" style={{ padding: '0 24px' }}>
          Call for Pickup
        </a>
      </div>
    </section>
  );
}
