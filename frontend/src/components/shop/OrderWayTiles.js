import { ShoppingBag } from 'lucide-react';

const DoorDashIcon = () => (
  <svg width="34" height="22" viewBox="0 0 34 22" fill="none" aria-hidden="true">
    <path d="M31.4 4.7C29.5 1.6 26.1 0 22.4 0H3.6C1.6 0 .6 2.3 2 3.7l1.7 1.6c.7.7 1.7 1 2.7 1h15.8c3 0 4.6 3.3 2.6 5.6-1 1.1-2.4 1.8-3.9 1.8H8.4c-2 0-3 2.3-1.6 3.7l1.6 1.6c.7.7 1.7 1 2.7 1h9c4.6 0 8.8-2.7 10.7-6.9 1.2-2.7 1-5.8-.4-8.4z" fill="#ff3008" />
  </svg>
);

const GrubhubIcon = () => (
  <svg width="26" height="24" viewBox="0 0 26 24" fill="none" aria-hidden="true">
    <path d="M13 0 1 7.5V24h24V7.5L13 0z" fill="#f63440" />
    <rect x="7" y="11" width="2.6" height="8" rx="1.3" fill="#fff" />
    <rect x="11.7" y="9" width="2.6" height="10" rx="1.3" fill="#fff" />
    <rect x="16.4" y="11" width="2.6" height="8" rx="1.3" fill="#fff" />
  </svg>
);

/**
 * Uber Eats / DoorDash / Grubhub / Pickup tiles. Ordering happens on the
 * delivery partner's app (or by phone for pickup), so there is no cart here.
 * `subject` is the dish or restaurant name used in the accessible labels.
 */
export default function OrderWayTiles({ links, subject }) {
  const tiles = [
    { name: 'Uber Eats', href: links.ubereats, mark: <span className="ps-way__uber">Uber<b>Eats</b></span> },
    { name: 'DoorDash', href: links.doordash, mark: <DoorDashIcon />, label: 'DoorDash' },
    { name: 'Grubhub', href: links.grubhub, mark: <GrubhubIcon />, label: 'Grubhub' },
    { name: 'Pickup', href: links.pickup, mark: <ShoppingBag size={26} color="#c5a059" aria-hidden="true" />, label: 'Pickup', external: false }
  ];

  return (
    <div className="ps-way__grid">
      {tiles.map((tile) => (
        <a
          key={tile.name}
          className="ps-way__tile"
          href={tile.href}
          {...(tile.external === false ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          aria-label={tile.name === 'Pickup' ? `Call to order ${subject} for pickup` : `Order ${subject} on ${tile.name}`}
        >
          <span className="ps-way__mark">{tile.mark}</span>
          {tile.label && <span className="ps-way__name">{tile.label}</span>}
          <span className="ps-way__cta">Buy Now</span>
        </a>
      ))}
    </div>
  );
}
