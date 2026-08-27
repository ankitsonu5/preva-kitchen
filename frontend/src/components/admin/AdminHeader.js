'use client';

import Link from 'next/link';
import { ChevronDown, ExternalLink, LogOut, Menu, Search, Settings, Home, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const labelMap = {
  admin: 'Dashboard',
  content: 'Content',
  edit: 'Editor',
  categories: 'Categories',
  tags: 'Tags',
  media: 'Media Library',
  galleries: 'Galleries',
  menus: 'Menus',
  sections: 'Site Sections',
  inbox: 'Inbox',
  users: 'Users',
  'activity-logs': 'Activity Logs',
  settings: 'Settings',
  careers: 'Hiring Dashboard',
  'career-jobs': 'Career Jobs',
  'career-applications': 'Career Applications',
  profile: 'Account Security'
};

export default function AdminHeader({ user, pathname, onMobileOpen, onLogout }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prevakitchen.com';
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const crumbs = pathname.split('/').filter(Boolean).map((part) => labelMap[part] || part);

  return (
    <header className="admin-topbar">
      <div className="topbar-main">
        <div className="topbar-left">
          <button className="icon-button mobile-menu-button" type="button" onClick={onMobileOpen} aria-label="Open navigation">
            <Menu size={16} />
          </button>

          <Link href="/admin" className="wp-admin-brand-link">
            <Home size={15} />
            <span>Preva Kitchen</span>
          </Link>

          <a className="wp-admin-visit-link" href={siteUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} />
            <span>Visit Site</span>
          </a>

          <div className="admin-search">
            <Search size={14} />
            <input ref={searchRef} aria-label="Search dashboard" placeholder="Search..." />
            <kbd>/</kbd>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="header-popover">
            <button className="profile-trigger" type="button" onClick={() => setProfileOpen(!profileOpen)} aria-label="Open profile menu">
              <span className="profile-greeting">Howdy, <strong>{user.email?.split('@')[0]}</strong></span>
              <span className="avatar">{user.email?.charAt(0).toUpperCase()}</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
            {profileOpen && (
              <div className="popover-panel profile-panel">
                <div className="profile-summary">
                  <span className="avatar avatar-large">{user.email?.charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{user.email}</strong>
                    <span>{user.role?.replace('_', ' ')}</span>
                  </div>
                </div>
                <Link href="/admin/profile" onClick={() => setProfileOpen(false)}><User size={14} /><span>Change password</span></Link>
                {user.role !== 'CAREERS_MANAGER' && <Link href="/admin/settings" onClick={() => setProfileOpen(false)}><Settings size={14} /><span>Site settings</span></Link>}
                <button type="button" onClick={() => { setProfileOpen(false); onLogout(); }}>
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="topbar-breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => <span key={`${crumb}-${index}`}>{index > 0 && <i>/</i>}{crumb}</span>)}
      </div>
    </header>
  );
}
