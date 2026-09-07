import { pageMetadata } from '@/lib/seo';
import ShopContent from '@/components/shop/ShopContent';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Preva Kitchen Menu — Order Online',
  description:
    'View the full Preva Kitchen menu and order wings, burgers, tacos, seafood, pasta, sides and dessert for pickup or delivery in Redford Township, MI.',
  path: '/menu',
  keywords: [
    'Preva Kitchen menu',
    'food delivery Redford MI',
    'restaurant pickup Redford Township',
    'wings burgers seafood Redford'
  ]
});

export default async function ShopPage() {
  return <ShopContent />;
}
