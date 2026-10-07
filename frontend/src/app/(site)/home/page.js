// Render the same homepage at /home without changing the browser URL.
// The canonical URL remains `/` so search engines do not index duplicate pages.
export { metadata } from '../page';
export { default } from '@/components/home/HomeContent';
