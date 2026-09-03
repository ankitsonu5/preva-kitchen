"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SvgIcon from './SvgIcon';
import MenuSelectionModal from './MenuSelectionModal';

const ORIGINAL_HEADER_MENU = [
  { title: 'Menu',         url: '/menu',                 openInNewTab: false, visible: true },
  { title: 'Reservations', url: '/#prv-reservations',    openInNewTab: false, visible: true },
  { title: 'Blog',         url: '/blog',                 openInNewTab: false, visible: true },
  { title: 'Careers',      url: '/careers',              openInNewTab: false, visible: true },
  { title: 'Contact Us',   url: '/contact',              openInNewTab: false, visible: true },
];

const ORIGINAL_HEADER_SETTINGS = {
  siteTitle: 'PREVA KITCHEN',
  siteLogo: '/asset/preva-logo.png',
  phone: '(313) 286-3586',
  announcementText: 'Preva Kitchen — Fresh flavor, made in Redford',
  announcementSecondary: 'Dine In • Pickup • Delivery • Catering',
  headerCtaText: 'Order Online',
  headerCtaUrl: '#preva-order'
};

function includeOrderNavigation(items) {
  // Always enforce the user's exact preferred header navigation items
  return [
    { title: 'Menu',         url: '/menu',                 openInNewTab: false, visible: true },
    { title: 'Reservations', url: '/#prv-reservations',    openInNewTab: false, visible: true },
    { title: 'Blog',         url: '/blog',                 openInNewTab: false, visible: true },
    { title: 'Careers',      url: '/careers',              openInNewTab: false, visible: true },
    { title: 'Contact Us',   url: '/contact',              openInNewTab: false, visible: true },
  ];
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSticky, setIsSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [settings, setSettings] = useState(ORIGINAL_HEADER_SETTINGS);

  useEffect(() => {
    window.openOurSelectionModal = () => setIsSelectionModalOpen(true);
    return () => {
      delete window.openOurSelectionModal;
    };
  }, []);

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

    if (href === '#our-selection') {
      setIsSelectionModalOpen(true);
      return;
    }

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

  const [menuItems, setMenuItems] = useState(ORIGINAL_HEADER_MENU);

  // The header uses imperative navigation for its mixed page/anchor links.
  // Prefetching the page portion keeps those clicks as fast as a Next <Link>.
  useEffect(() => {
    const paths = new Set([
      '/', '/preva-kitchen', '/preva-kitchen-menu', '/menu', '/blog', '/careers', '/contact',
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
    <>
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
                style={{ display: 'none', fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '1.5rem', fontWeight: 900, color: '#c5a059', letterSpacing: '4px', textTransform: 'uppercase' }}
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
                <a
                  href={`tel:${(settings.phone || '').replace(/\D/g, '')}`}
                  className="nav-call-link"
                  aria-label={`Call Preva Kitchen at ${settings.phone || '(313) 286-3586'}`}
                  title={`Call ${settings.phone || '(313) 286-3586'}`}
                  onClick={handleLinkClick}
                >
                  <span className="nav-phone-icon" aria-hidden="true"><SvgIcon name="phone" size={20} /></span>
                </a>
              </li>
              <li className="nav-cart-cta">
                <a href="/checkout" className="nav-cart-link" aria-label="View cart" title="View cart" onClick={handleLinkClick}>
                  <span className="nav-cart-icon" aria-hidden="true"><SvgIcon name="cart" size={20} /></span>
                </a>
              </li>
              <li className="nav-order-cta">
                <a href="/menu" className="preva-order-trigger" onClick={handleLinkClick}>
                  {settings.headerCtaText || 'ORDER ONLINE'}
                </a>
              </li>
              <li className="nav-selection-cta">
                <a
                  href="#our-selection"
                  className="preva-order-trigger preva-selection-trigger"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick();
                    setIsSelectionModalOpen(true);
                  }}
                  title="View Preva Menu Card"
                >
                  VIEW MENU
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

      {/* Our Selection Menu Modal */}
      <MenuSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
      />
    </>
  );
}
