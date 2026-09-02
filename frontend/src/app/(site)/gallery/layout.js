import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Food & Dining Gallery',
  description: 'Explore signature dishes, culinary presentation and the dining experience at Preva Kitchen in Redford Township, Michigan.',
  path: '/gallery',
  keywords: ['Preva Kitchen photos', 'Redford restaurant gallery', 'Preva food gallery']
});

export default function GalleryLayout({ children }) {
  return children;
}
