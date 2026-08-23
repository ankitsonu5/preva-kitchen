"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SvgIcon from './SvgIcon';

const ORIGINAL_HEADER_MENU = [
  { title: 'Home', url: '/', openInNewTab: false, visible: true },
  { title: 'Reservations', url: '/#prv-reservations', openInNewTab: false, visible: true },
  { title: 'Menu', url: '/preva-kitchen-menu', openInNewTab: false, visible: true },
  { title: 'Order', url: '/shop', openInNewTab: false, visible: true },
  { title: 'Gallery', url: '/#gallery', openInNewTab: false, visible: true },
  { title: 'Blog', url: '/blog', openInNewTab: false, visible: true },
  { title: 'Careers', url: '/careers', openInNewTab: false, visible: true },
  { title: 'Contact Us', url: '/contact', openInNewTab: false, visible: true }
];

const ORIGINAL_HEADER_SETTINGS = {
  siteTitle: 'PREVA KITCHEN',
  siteLogo: 'https://prevaclub.com/wp-content/uploads/2024/09/preva-logo.png',
  phone: '(313) 286-3586',
  announcementText: 'Preva Kitchen — Fresh flavor, made in Redford',
  announcementSecondary: 'Dine In • Pickup • Delivery • Catering',
  headerCtaText: 'Order Online',
  headerCtaUrl: '#preva-order'
};

function includeOrderNavigation(items) {
  const isLegacyItem = (item) => /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle|guest list|tickets?/i.test(`${item.title || item.label || ''} ${item.url || ''}`);
  items = items.filter((item) => !isLegacyItem(item)).map((item) => ({
    ...item,
    children: Array.isArray(item.children) ? item.children.filter((child) => !isLegacyItem(child)) : item.children
  }));
  const isGalleryItem = (item) => /gallery/i.test(item.title || item.label || '');
  const isCateringItem = (item) => /catering/i.test(item.title || item.label || '');
  const hasGalleryItem = items.some(isGalleryItem);

  // Always expose the homepage gallery in primary navigation, including when
  // an older CMS menu still returns a Catering item.
  items = items
    .filter((item) => !(hasGalleryItem && isCateringItem(item)))
    .map((item) => {
      if (isGalleryItem(item) || (!hasGalleryItem && isCateringItem(item))) {
        return { ...item, title: 'Gallery', label: 'Gallery', url: '/#gallery', openInNewTab: false };
      }
      return item;
    });

  if (!items.some(isGalleryItem)) {
    const galleryItem = { title: 'Gallery', label: 'Gallery', url: '/#gallery', openInNewTab: false, visible: true };
    const blogIndex = items.findIndex((item) => /blog/i.test(item.title || item.label || ''));
    items.splice(blogIndex >= 0 ? blogIndex : items.length, 0, galleryItem);
  }
  const hasOrderItem = items.some((item) =>
    /(^|\s)order(\s|$)/i.test(item.title || item.label || '') || item.url === '/shop'
  );
  if (hasOrderItem) return items;

  const orderItem = ORIGINAL_HEADER_MENU.find((item) => item.title === 'Order');
  const blogIndex = items.findIndex((item) => /blog/i.test(item.title || item.label || ''));
  const nextItems = [...items];
  nextItems.splice(blogIndex >= 0 ? blogIndex : nextItems.length, 0, orderItem);
  return nextItems;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSticky, setIsSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(ORIGINAL_HEADER_SETTINGS);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const handleNavigate = (href) => (e) => {
    e.preventDefault();
    setIsOpen(false);

    if (/^(https?:|mailto:|tel:)/i.test(href)) {
      window.location.href = href;
      return;
    }

    if (href.startsWith('/#') || href.startsWith('#')) {
      const targetId = href.replace(/^\/?#/, '');
      if (pathname === '/') {
        const target = document.getElementById(targetId);
        if (target) {
          if (typeof window !== 'undefined' && window.lenis) {
            window.lenis.scrollTo(target, { offset: -80 });
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      } else {
        router.push(`/#${targetId}`);
        return;
      }
    }

    if (href === '/' && pathname === '/') {
      if (typeof window !== 'undefined' && window.lenis) {
        window.lenis.scrollTo(0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    router.push(href);
  };

  const triggerOrderModal = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.openOrderModal) {
      window.openOrderModal();
    } else {
      router.push('/shop');
    }
    setIsOpen(false);
  };

  const [menuItems, setMenuItems] = useState(ORIGINAL_HEADER_MENU);

  // The header uses imperative navigation for its mixed page/anchor links.
  // Prefetching the page portion keeps those clicks as fast as a Next <Link>.
  useEffect(() => {
    const paths = new Set([
      '/', '/preva-kitchen', '/preva-kitchen-menu', '/shop', '/blog', '/careers', '/contact',
      ...menuItems.map((item) => String(item.url || '').split('#')[0])
    ]);
    for (const path of paths) {
      if (path.startsWith('/')) router.prefetch(path);
    }
  }, [menuItems, router]);

  useEffect(() => {
    async function loadMenu() {
      try {
        const API = '/api';
        const [menuRes, settingsRes] = await Promise.all([fetch(`${API}/menus/primary`), fetch(`${API}/settings`)]);
        if (menuRes.ok) {
          const dynamicMenu = await menuRes.json();
          const dynamicItems = Array.isArray(dynamicMenu) ? dynamicMenu : dynamicMenu?.items;
          if (Array.isArray(dynamicItems) && dynamicItems.length) setMenuItems(includeOrderNavigation(dynamicItems));
        }
        if (settingsRes.ok) {
          const dynamicSettings = await settingsRes.json();
          setSettings((current) => {
            const next = { ...current, ...dynamicSettings };
            if (/night\s*life|night\s*club|\bclub\b|\bvip\b|bottle/i.test(next.announcementText || '')) next.announcementText = current.announcementText;
            if (/night\s*life|night\s*club|\bclub\b|\bvip\b|bottle/i.test(next.announcementSecondary || '')) next.announcementSecondary = current.announcementSecondary;
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to load header menu, using static fallbacks:', err);
      }
    }
    loadMenu();
  }, []);

  return (
    <header id="masthead" className={`site-header ${isSticky ? 'sticky' : ''}`}>
      {/* Top Announcement Bar */}
      <div className="top-announcement-bar">
        <div className="scrolling-content">
          <span className="live-indicator">
            <span className="blink-dot"></span>
          </span>
          <span className="announce-text">
            {settings.announcementText}
          </span>
          <span className="announce-separator"><SvgIcon name="spark" size={14} /></span>
          <span className="announce-text">
            {settings.announcementSecondary}
          </span>
        </div>
      </div>

      <div className="container">
        <div className="site-branding">
          <a href="/" className="site-logo-link" onClick={handleNavigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img
              src="/asset/preva-logo-silver.png"
              alt="Preva Kitchen"
              className="site-logo"
              style={{ display: 'block' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
              }}
            />
            <span
              className="brand-text-logo"
              style={{ display: 'none', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: '#c5a059', letterSpacing: '4px', textTransform: 'uppercase' }}
            >
              PREVA KITCHEN
            </span>
          </a>
        </div>

        <nav
          id="site-navigation"
          className={`main-navigation ${isOpen ? 'open' : ''}`}
          aria-label="Primary Navigation"
        >
          <ul id="primary-menu" className={`primary-menu ${isOpen ? 'open' : ''}`}>
            {menuItems.filter((item) => item.visible !== false).map((item, idx) => (
              <li key={idx} className={item.children?.length ? 'menu-item-has-children' : undefined}>
                <a
                  href={item.url}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  onClick={item.openInNewTab ? handleLinkClick : handleNavigate(item.url)}
                >
                  {item.title}
                </a>
                {item.children?.length ? <ul className="sub-menu">{item.children.filter((child) => child.visible !== false).map((child, childIndex) => <li key={`${child.title}-${childIndex}`}><a href={child.url} target={child.openInNewTab ? '_blank' : undefined} rel={child.openInNewTab ? 'noopener noreferrer' : undefined} onClick={child.openInNewTab ? handleLinkClick : handleNavigate(child.url)}>{child.title}</a></li>)}</ul> : null}
              </li>
            ))}
            <li className="nav-call-cta">
              <a href={`tel:${(settings.phone || '').replace(/\D/g, '')}`} onClick={handleLinkClick}>
                <span className="nav-phone-icon" aria-hidden="true"><SvgIcon name="phone" size={16} /></span>
                <span>{(settings.phone || '').includes('+1') ? settings.phone : `+1 ${(settings.phone || '').replace(/[()]/g, '').trim()}`}</span>
              </a>
            </li>
            <li className="nav-order-cta">
              <a
                href={settings.headerCtaUrl || '#preva-order'}
                className="preva-order-trigger"
                aria-haspopup="dialog"
                aria-controls="prevaOrderModal"
                onClick={triggerOrderModal}
              >
                {settings.headerCtaText || 'ORDER ONLINE'}
              </a>
            </li>
          </ul>
        </nav>

        <button
          className="menu-toggle"
          aria-controls="primary-menu"
          aria-expanded={isOpen ? "true" : "false"}
          type="button"
          onClick={handleToggle}
        >
          <span className="menu-icon"></span>
          <span className="screen-reader-text">Menu</span>
        </button>
      </div>
    </header>
  );
}
