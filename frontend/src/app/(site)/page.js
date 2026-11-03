import { pageMetadata } from '@/lib/seo';
import { cmsFetch } from '@/lib/cms';
import HomeContent from '@/components/home/HomeContent';

export const metadata = pageMetadata({
  title: 'Preva Kitchen | Restaurant in Redford Township, MI',
  titleIncludesBrand: true,
  description: 'Wings, lamb chops, Rasta pasta & Caribbean comfort food in Redford Township, MI. Dine in Tue–Sun, order pickup & delivery online. Call (313) 286-3586.',
  path: '/',
  // Website logo on a dark 1200x630 card, for link previews of the home page.
  image: '/asset/preva-kitchen-og.png',
  keywords: [
    'Preva Kitchen Redford Township',
    'restaurant Redford Township MI',
    'food pickup Redford MI',
    'food delivery Redford MI',
    'Redford Township dining'
  ]
});

export default async function HomePage() {
  // Use the same public menu queries as /menu without development fallback data.
  const [products, categories, homePage, galleries] = await Promise.all([
    cmsFetch('/shop/products', { query: { summary: true } }),
    cmsFetch('/shop/categories'),
    cmsFetch('/pages/home'),
    cmsFetch('/galleries')
  ]);
  const menuProducts = Array.isArray(products) ? products : [];
  const menuCategories = Array.isArray(categories) ? categories : [];
  const homeGallery = Array.isArray(galleries)
    ? galleries.find((gallery) => gallery.homeGallery && gallery.status === 'PUBLISHED')
    : null;
  const galleryImages = homeGallery?.images?.length >= 5
    ? homeGallery.images.slice(0, 5).map((image) => ({
        src: image.url,
        caption: image.caption || image.alt || ''
      }))
    : undefined;
  return (
    <HomeContent
      menuProducts={menuProducts}
      menuCategories={menuCategories}
      cmsPage={homePage}
      galleryImages={galleryImages}
    />
  );
}
