import { pageMetadata } from '@/lib/seo';
import { cmsFetch } from '@/lib/cms';
import { FALLBACK_PRODUCTS } from '@/data/fallbackMenu';
import HomeContent from '@/components/home/HomeContent';

export const metadata = pageMetadata({
  title: 'Preva Kitchen | Restaurant in Redford Township, MI',
  titleIncludesBrand: true,
  description: 'Wings, lamb chops, Rasta pasta & Caribbean comfort food in Redford Township, MI. Dine in Tue–Sun, order pickup & delivery online. Call (313) 286-3586.',
  path: '/',
  keywords: [
    'Preva Kitchen Redford Township',
    'restaurant Redford Township MI',
    'food pickup Redford MI',
    'food delivery Redford MI',
    'Redford Township dining'
  ]
});

export default async function HomePage() {
  // Same source and fallback as /menu, so "Preva Favorites" always matches it.
  const products = await cmsFetch('/shop/products');
  const menuProducts = Array.isArray(products) && products.length > 0 ? products : FALLBACK_PRODUCTS;
  return <HomeContent menuProducts={menuProducts} />;
}
