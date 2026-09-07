'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getUser } from '@/lib/admin-api';

const CAREERS_MANAGER_ROUTES = [
  '/admin/careers',
  '/admin/career-jobs',
  '/admin/career-applications',
  '/admin/profile'
];

function isCareersManagerRoute(pathname) {
  return CAREERS_MANAGER_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function Shell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Safe DOM patch to prevent Browser Extensions & DOM mutations from breaking React reconciliation
    if (typeof window !== 'undefined' && !window.__domPatchApplied) {
      window.__domPatchApplied = true;
      
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function (child) {
        if (child && child.parentNode && child.parentNode !== this) {
          return child.parentNode.removeChild(child);
        }
        try {
          return originalRemoveChild.apply(this, arguments);
        } catch (e) {
          if (child && child.parentNode) {
            return child.parentNode.removeChild(child);
          }
          return child;
        }
      };

      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function (newNode, referenceNode) {
        if (referenceNode && referenceNode.parentNode && referenceNode.parentNode !== this) {
          return this.appendChild(newNode);
        }
        try {
          return originalInsertBefore.apply(this, arguments);
        } catch (e) {
          return this.appendChild(newNode);
        }
      };
    }

    setSearch(window.location.search.slice(1));
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setCollapsed(localStorage.getItem('preva_sidebar_collapsed') === 'true');
    let active = true;

    // Fast safety redirect to login if not authenticated
    const safetyTimer = setTimeout(() => {
      if (active && !user && typeof window !== 'undefined') {
        window.location.replace('/admin/login');
      }
    }, 400);

    getUser()
      .then((activeUser) => {
        if (!active) return;
        clearTimeout(safetyTimer);
        if (!activeUser) {
          if (typeof window !== 'undefined') window.location.replace('/admin/login');
        } else {
          setUser(activeUser);
          if (activeUser.mustChangePassword && pathname !== '/admin/profile') {
            router.replace('/admin/profile?first=1');
          } else if (activeUser.role === 'CAREERS_MANAGER' && !isCareersManagerRoute(pathname)) {
            router.replace('/admin/careers');
          }
        }
      })
      .catch(() => {
        clearTimeout(safetyTimer);
        if (active && typeof window !== 'undefined') {
          window.location.replace('/admin/login');
        }
      });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, [router, pathname]);

  const [badges, setBadges] = useState({});
  const [newOrderToast, setNewOrderToast] = useState(null);

  // Poll for live incoming orders & inbox notifications
  useEffect(() => {
    if (!user) return;
    let active = true;

    const fetchCounts = async () => {
      try {
        const isCareersManager = user.role === 'CAREERS_MANAGER';
        const res = await fetch(isCareersManager ? '/api/admin/careers/dashboard' : '/api/admin/dashboard');
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !data) return;

        if (isCareersManager) {
          setBadges((prev) => ({ ...prev, careerApps: data.counts?.new ?? 0 }));
          return;
        }

        setBadges((prev) => {
          const newOrders = data.activeOrders ?? data.counts?.openOrders ?? 0;
          const prevOrders = prev.activeOrders ?? prev.openOrders ?? 0;

          // If new order arrived, trigger visual alert
          if (newOrders > prevOrders && prevOrders > 0) {
            setNewOrderToast(`🔔 New Order received! Total active: ${newOrders}`);
            setTimeout(() => setNewOrderToast(null), 8000);
          }

          return {
            openOrders: newOrders,
            activeOrders: newOrders,
            newContacts: data.unreadEnquiries ?? data.counts?.newContacts ?? 0,
            newReservations: data.newReservations ?? data.counts?.newReservations ?? 0,
            careerApps: data.careerApps ?? data.counts?.careerApps ?? 0
          };
        });
      } catch (e) {}
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleCollapse = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem('preva_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="admin-auth-loading" aria-live="polite">
        <div className="loader">
          <div className="scene">
            <div className="plate"></div>
            <div className="steam">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="cloche-group">
              <div className="cloche"></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div>
              <div className="wordmark">Preva</div>
              <div className="tagline">Preparing your workspace…</div>
            </div>
            <div className="bar">
              <span></span>
            </div>
            <a
              href="/admin/login"
              style={{
                marginTop: '8px',
                padding: '8px 24px',
                fontSize: '12px',
                color: '#c5a059',
                border: '1px solid rgba(197, 160, 89, 0.4)',
                borderRadius: '20px',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontWeight: 700,
                background: 'rgba(197, 160, 89, 0.08)',
                cursor: 'pointer'
              }}
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  const role = user.role;
  const careersManager = role === 'CAREERS_MANAGER';

  if (careersManager && !isCareersManagerRoute(pathname)) {
    return (
      <div className="admin-auth-loading" aria-live="polite">
        <div className="loader">Opening your Hiring Dashboard…</div>
      </div>
    );
  }

  const permissions = {
    dashboard: !careersManager,
    content: !careersManager,
    media: !careersManager,
    orders: !careersManager,
    careers: role === 'SUPER_ADMIN' || role === 'ADMIN' || careersManager,
    users: role === 'SUPER_ADMIN' || role === 'ADMIN',
    settings: role === 'SUPER_ADMIN' || role === 'ADMIN',
    logs: role === 'SUPER_ADMIN' || role === 'ADMIN',
    sections: role === 'SUPER_ADMIN' || role === 'ADMIN',
    menus: role === 'SUPER_ADMIN' || role === 'ADMIN',
    galleries: role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'EDITOR',
    services: role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'EDITOR',
    ordering: role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'EDITOR',
    taxonomies: role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'EDITOR',
    pages: role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'EDITOR',
    inbox: role === 'SUPER_ADMIN' || role === 'ADMIN'
  };

  return (
    <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminHeader user={user} pathname={pathname} onMobileOpen={() => setMobileMenuOpen(true)} onLogout={handleLogout} />
      <div className="admin-body-container">
        <AdminSidebar
          user={user}
          pathname={pathname}
          search={search}
          permissions={permissions}
          badges={badges}
          collapsed={collapsed}
          mobileOpen={mobileMenuOpen}
          onCollapse={handleCollapse}
          onMobileClose={() => setMobileMenuOpen(false)}
          onNavigate={(href) => setSearch(href.split('?')[1] || '')}
          onLogout={handleLogout}
        />
        {mobileMenuOpen && <button className="mobile-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
        <div className="admin-content-frame">
          {newOrderToast && (
            <div
              style={{
                position: 'fixed',
                top: 20,
                right: 24,
                zIndex: 9999,
                background: 'linear-gradient(135deg, #1f1206 0%, #0d0702 100%)',
                border: '1.5px solid #C9A84C',
                color: '#F5DF97',
                padding: '14px 22px',
                borderRadius: 14,
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(201, 168, 76, 0.35)',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              <span>{newOrderToast}</span>
              <a
                href="/admin/orders"
                style={{
                  background: '#C9A84C',
                  color: '#000',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textDecoration: 'none'
                }}
              >
                View
              </a>
              <button
                type="button"
                onClick={() => setNewOrderToast(null)}
                style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: 16 }}
              >
                ×
              </button>
            </div>
          )}
          <main className="main">{children}</main>
        </div>
      </div>
    </div>
  );
}
