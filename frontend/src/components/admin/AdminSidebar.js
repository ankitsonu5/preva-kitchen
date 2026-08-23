'use client';

import Link from 'next/link';
import {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  FileText,
  FolderTree,
  GalleryHorizontalEnd,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListTree,
  LogOut,
  MenuSquare,
  Settings,
  ShoppingCart,
  Tags,
  Sparkles,
  UtensilsCrossed,
  Users,
  X
} from 'lucide-react';

const groups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'dashboard' },
      { label: 'Posts', href: '/admin/content?type=POST', icon: BookOpen, permission: 'content' },
      { label: 'Pages', href: '/admin/content?type=PAGE', icon: FileText, permission: 'pages' },
      { label: 'Categories', href: '/admin/categories', icon: FolderTree, permission: 'taxonomies' },
      { label: 'Tags', href: '/admin/tags', icon: Tags, permission: 'taxonomies' },
      { label: 'Media Library', href: '/admin/media', icon: Images, permission: 'media' },
      { label: 'Galleries', href: '/admin/galleries', icon: GalleryHorizontalEnd, permission: 'galleries' },
      { label: 'Services', href: '/admin/services', icon: Sparkles, permission: 'services' },
      { label: 'Ordering', href: '/admin/ordering-platforms', icon: ShoppingCart, permission: 'ordering' },
      { label: 'Food Menu', href: '/admin/food-menu', icon: ListTree, permission: 'menus' },
      { label: 'Dish Details Pages', href: '/admin/menu-details', icon: UtensilsCrossed, permission: 'menus' },
    ]
  },
  {
    label: 'Appearance',
    items: [
      { label: 'Menus', href: '/admin/menus', icon: MenuSquare, permission: 'menus' },
      { label: 'Site Sections', href: '/admin/sections', icon: LayoutGrid, permission: 'sections' }
    ]
  },
  {
    label: 'Online ordering',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, permission: 'orders' }
    ]
  },
  {
    label: 'Hiring',
    items: [
      { label: 'Hiring Dashboard', href: '/admin/careers', icon: ChartNoAxesCombined, permission: 'careers' },
      { label: 'Career Jobs', href: '/admin/career-jobs', icon: BriefcaseBusiness, permission: 'careers' },
      { label: 'Career Applications', href: '/admin/career-applications', icon: Inbox, permission: 'careers' }
    ]
  },
  {
    label: 'Inbox',
    items: [
      { label: 'Contacts', href: '/admin/inbox?kind=contacts', icon: Inbox, permission: 'inbox' },
      { label: 'Reservations', href: '/admin/inbox?kind=reservations', icon: ListTree, permission: 'inbox' },
      { label: 'Orders', href: '/admin/inbox?kind=orders', icon: FileText, permission: 'inbox' },
      { label: 'Guest List', href: '/admin/inbox?kind=guest-list', icon: CircleUserRound, permission: 'inbox' }
    ]
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users, permission: 'users' },
      { label: 'Activity Logs', href: '/admin/activity-logs', icon: Activity, permission: 'logs' },
      { label: 'Settings', href: '/admin/settings', icon: Settings, permission: 'settings' }
    ]
  }
];

function isActive(itemHref, pathname, search) {
  const [targetPath, targetSearch = ''] = itemHref.split('?');
  if (targetPath === '/admin') return pathname === '/admin';
  if (pathname !== targetPath) return false;
  if (!targetSearch) return true;
  return new URLSearchParams(search).toString().includes(targetSearch);
}

export default function AdminSidebar({
  user,
  pathname,
  search,
  permissions,
  badges = {},
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
  onNavigate,
  onLogout
}) {
  const getBadgeCount = (href) => {
    if (href === '/admin/orders' || href === '/admin/inbox?kind=orders') return badges.openOrders || badges.activeOrders || 0;
    if (href === '/admin/inbox?kind=contacts') return badges.newContacts || badges.unreadEnquiries || 0;
    if (href === '/admin/inbox?kind=reservations') return badges.newReservations || 0;
    if (href === '/admin/career-applications') return badges.careerApps || 0;
    return 0;
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <button className="icon-button sidebar-mobile-close" type="button" onClick={onMobileClose} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Admin navigation">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.permission || permissions[item.permission]);
          if (!visibleItems.length) return null;
          return (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-group-label">{group.label}</div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, pathname, search);
                const badgeCount = getBadgeCount(item.href);
                const isOrdersBadge = item.href === '/admin/orders';

                return (
                  <Link
                    className={`sidebar-link ${active ? 'active' : ''}`}
                    href={item.href}
                    key={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={() => { onNavigate(item.href); onMobileClose(); }}
                    style={{ position: 'relative' }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {badgeCount > 0 && (
                      <span
                        className="sidebar-badge-pill"
                        style={{
                          marginLeft: 'auto',
                          background: isOrdersBadge ? '#e53935' : 'linear-gradient(135deg, #F5DF97 0%, #C9A34E 100%)',
                          color: isOrdersBadge ? '#fff' : '#0c0803',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          lineHeight: '1.2',
                          letterSpacing: '0.3px',
                          boxShadow: isOrdersBadge ? '0 0 10px rgba(229, 57, 53, 0.6)' : '0 0 8px rgba(201, 163, 78, 0.4)'
                        }}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{user.email?.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-copy">
            <strong>{user.email?.split('@')[0]}</strong>
            <span>{user.role?.replace('_', ' ')}</span>
          </div>
          <button className="icon-button sidebar-logout" type="button" onClick={onLogout} aria-label="Log out" title="Log out">
            <LogOut size={17} />
          </button>
        </div>
        <button className="sidebar-collapse" type="button" onClick={onCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          <span>Collapse sidebar</span>
        </button>
      </div>
    </aside>
  );
}
