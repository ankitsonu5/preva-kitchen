import { permanentRedirect } from 'next/navigation';

export default function LegacyCategoryPage() {
  permanentRedirect('/blog');
}
