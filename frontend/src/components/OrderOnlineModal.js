"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import SvgIcon from './SvgIcon';

const API = '/api';
const MODES = ['pickup', 'delivery'];
const FALLBACK_PLATFORMS = [
  {
    id: 'fallback-doordash',
    providerKey: 'doordash',
    name: 'DOORDASH',
    availability: 'BOTH',
    description: 'Pickup + Delivery',
    url: 'https://www.doordash.com/store/preva-kitchen-redford-43388119/',
    logo: 'doordash',
    isActive: true,
  },
  {
    id: 'fallback-uber-eats',
    providerKey: 'uber-eats',
    name: 'UBER EATS',
    availability: 'BOTH',
    description: 'Pickup + Delivery',
    url: 'https://www.ubereats.com/search?q=Preva%20Kitchen%20Redford',
    logo: 'uber-eats',
    isActive: true,
  },
  {
    id: 'fallback-toast',
    providerKey: 'toast',
    name: 'TOAST',
    availability: 'BOTH',
    description: 'Pickup + Delivery',
    url: '/menu',
    logo: 'toast',
    isActive: true,
  },
  {
    id: 'fallback-grubhub',
    providerKey: 'grubhub',
    name: 'GRUBHUB',
    availability: 'BOTH',
    description: 'Pickup + Delivery',
    url: 'https://www.grubhub.com/delivery/mi-redford',
    logo: 'grubhub',
    isActive: true,
  },
  {
    id: 'fallback-call',
    providerKey: 'call-to-order',
    name: 'CALL TO ORDER',
    availability: 'PICKUP',
    description: 'Carryout / Pickup',
    url: 'tel:+13132863586',
    logo: 'call',
    isActive: true,
  },
];

function platformIdentity(platform) {
  return `${platform.providerKey || platform.name || ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function PlatformLogo({ platform }) {
  const identity = platformIdentity(platform);
  const isCall = platform.url?.startsWith('tel:') || identity.includes('call');

  if (isCall) {
    return (
      <div className="po-icon-wrap po-icon-call">
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 3.99c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-.99-1.11z"/>
        </svg>
      </div>
    );
  }

  if (identity.includes('doordash')) {
    return (
      <div className="po-icon-wrap po-icon-doordash">
        <svg viewBox="0 0 24 24" fill="white" width="34" height="34" aria-hidden="true">
          <path d="M23.045 10.687A5.94 5.94 0 0 0 17.522 6H1.5a.75.75 0 0 0-.58.28.75.75 0 0 0-.148.632l2.36 10.02a.75.75 0 0 0 .73.578h3.91a.75.75 0 0 0 .729-.58l1.7-7.227h3.766a3.94 3.94 0 0 1 3.665 2.502 3.938 3.938 0 0 1-.78 4.254.75.75 0 0 0 .532 1.28h3.81a5.938 5.938 0 0 0 4.811-6.752z"/>
        </svg>
      </div>
    );
  }

  if (identity.includes('uber')) {
    return (
      <div className="po-icon-wrap po-icon-ubereats">
        <div className="po-uber-text">
          <span className="po-uber-white">Uber</span>
          <span className="po-uber-green">Eats</span>
        </div>
      </div>
    );
  }

  if (identity.includes('toast')) {
    return (
      <div className="po-icon-wrap po-icon-toast">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" aria-hidden="true">
          <path d="M6 19v-6c-2-1-3-2.5-2.5-4.5.5-3 3.5-4.5 7.5-4.5s7 1.5 7.5 4.5c.5 2-.5 3.5-2.5 4.5v6c0 1.5-1 2.5-2.5 2.5h-5C7 21.5 6 20.5 6 19Z"/>
        </svg>
      </div>
    );
  }

  if (identity.includes('grubhub')) {
    return (
      <div className="po-icon-wrap po-icon-grubhub">
        <span className="po-grubhub-text">GRUBHUB</span>
      </div>
    );
  }

  if (platform.logo && platform.logo.startsWith('http')) {
    return (
      <div className="po-icon-wrap po-icon-custom">
        <img className="po-provider-logo-image" src={platform.logo} alt="" />
      </div>
    );
  }

  return (
    <div className="po-icon-wrap po-icon-custom">
      <span className="po-custom-initials">{platform.name?.charAt(0)?.toUpperCase() || 'P'}</span>
    </div>
  );
}

export default function OrderOnlineModal({ open, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [orderMode, setOrderMode] = useState('pickup');
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    let frame;
    let timer;
    if (open) {
      setMounted(true);
      frame = window.requestAnimationFrame(() => setVisible(true));
    } else if (mounted) {
      setVisible(false);
      timer = window.setTimeout(() => setMounted(false), 240);
    }
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API}/ordering-platforms`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Ordering options could not be loaded.');
        const rows = await response.json();
        setPlatforms(Array.isArray(rows) ? rows.filter((row) => row.isActive === true) : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const visiblePlatforms = useMemo(() => {
    const selected = orderMode.toUpperCase();
    const adminPlatforms = new Map(platforms.map((platform) => [platformIdentity(platform), platform]));
    const defaults = FALLBACK_PLATFORMS.map((fallback) => {
      const key = platformIdentity(fallback);
      const override = adminPlatforms.get(key);
      if (!override) return fallback;
      adminPlatforms.delete(key);
      return {
        ...fallback,
        ...override,
        name: override.name || fallback.name,
        url: override.url || fallback.url,
        description: override.description || fallback.description,
      };
    });
    const resolved = [...defaults, ...adminPlatforms.values()];
    return resolved.filter((platform) => platform.availability === 'BOTH' || platform.availability === selected);
  }, [orderMode, platforms]);

  if (!mounted) return null;

  return (
    <div
      className={`po-modal ${visible ? 'is-open' : 'is-closing'}`}
      id="prevaOrderModal"
      aria-hidden={!open}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="po-backdrop" aria-hidden="true" onMouseDown={onClose} />
      <div className="po-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="poTitle">
        {/* Close Button */}
        <button ref={closeRef} type="button" className="po-close" aria-label="Close" onClick={onClose}>
          <SvgIcon name="close" size={21} />
        </button>

        {/* Modal Header */}
        <div className="po-header">
          <div className="po-heading-copy">
            <h2 className="po-title" id="poTitle">ORDER ONLINE NOW</h2>
            <p className="po-subtitle">Pickup &amp; Delivery: Mon–Fri, 11:00 AM – 3:30 PM</p>
          </div>
          <div className="po-mode-toggle" role="tablist" aria-label="Order type">
            <button
              type="button"
              role="tab"
              aria-selected={orderMode === 'pickup'}
              className={`po-mode-button ${orderMode === 'pickup' ? 'is-active' : ''}`}
              onClick={() => setOrderMode('pickup')}
            >
              Pickup
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={orderMode === 'delivery'}
              className={`po-mode-button ${orderMode === 'delivery' ? 'is-active' : ''}`}
              onClick={() => setOrderMode('delivery')}
            >
              Delivery
            </button>
          </div>
        </div>

        {/* Platforms Grid */}
        <div className={`po-provider-grid is-${orderMode}`} role="tabpanel">
          {visiblePlatforms.map((platform) => {
            const isCall = platform.url?.startsWith('tel:') || platformIdentity(platform).includes('call');
            const isInternal = platform.url?.startsWith('/');
            return (
              <a
                key={platform.id || platform.providerKey}
                href={platform.url}
                className={`po-provider ${isCall ? 'po-call-card' : ''}`}
                data-provider={platform.providerKey}
                target={isCall || isInternal ? undefined : '_blank'}
                rel={isCall || isInternal ? undefined : 'noopener noreferrer'}
                onClick={isInternal ? onClose : undefined}
              >
                <div className="po-provider-icon-box">
                  <PlatformLogo platform={platform} />
                </div>
                <span className="po-provider-name">{platform.name?.toUpperCase()}</span>
                <span className="po-provider-subtitle">{platform.description || 'Pickup + Delivery'}</span>
                <span className="po-provider-cta">
                  {isCall ? '+1 313-286-3586' : 'ORDER NOW'}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
