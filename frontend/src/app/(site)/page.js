import { pageMetadata } from '@/lib/seo';
import { cmsFetch } from '@/lib/cms';
import HomeContent from '@/components/home/HomeContent';
import { menuCategoriesOrFallback, menuProductsOrFallback } from '@/lib/menu-data';

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
  // Same source and fallback as /menu, so "Preva Favorites" always matches it.
  const [products, categories] = await Promise.all([
    cmsFetch('/shop/products', { query: { summary: true } }),
    cmsFetch('/shop/categories')
  ]);
  const menuProducts = menuProductsOrFallback(products);
  const menuCategories = menuCategoriesOrFallback(categories);
  return <HomeContent menuProducts={menuProducts} menuCategories={menuCategories} />;
}
