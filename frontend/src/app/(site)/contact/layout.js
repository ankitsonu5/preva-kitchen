import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contact Preva Kitchen in Redford Township',
  description: 'Contact Preva Kitchen at 13090 Inkster Rd in Redford Township, MI for dining, pickup, delivery, catering and restaurant enquiries.',
  path: '/contact',
  keywords: ['contact Preva Kitchen', 'Redford Township restaurant', 'Preva Kitchen phone number', '13090 Inkster Road']
});

export default function ContactLayout({ children }) {
  return children;
}
