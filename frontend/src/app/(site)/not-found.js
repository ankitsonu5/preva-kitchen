import NotFoundContent from '@/components/site-page/NotFoundContent';

// A 404 has no canonical destination and must never be indexed — but it
// should still be followed so Google can find the real pages linked below.
export const metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true }
};

export default function NotFound() {
  return <NotFoundContent />;
}
