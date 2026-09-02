import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Preva Kitchen — Restaurant in Redford Township, MI',
  description: 'Discover Preva Kitchen in Redford Township: chef-driven comfort food, signature wings, burgers, seafood, pasta, pickup and delivery.',
  path: '/preva-kitchen',
  keywords: ['Preva Kitchen', 'restaurant Redford Township MI', 'Detroit comfort food', 'Redford food delivery']
});

export default function PrevaKitchenLayout({ children }) {
  return children;
}
