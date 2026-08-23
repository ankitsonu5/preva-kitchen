import { ConfirmProvider } from '@/components/admin/ConfirmDialog';

/**
 * Every admin screen reads from the database on load, so none of them can be
 * prerendered at build time. Declaring it here covers the whole section rather
 * than repeating the export in twenty page files — and page files under this
 * tree are client components, which cannot carry route config themselves.
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Dashboard' };

export default function AdminLayout({ children }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
