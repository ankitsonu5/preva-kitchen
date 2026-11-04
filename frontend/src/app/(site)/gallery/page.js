import { cmsFetch } from '@/lib/cms';
import GalleryExperience from '@/components/gallery/GalleryExperience';
import { menuProductsOrFallback } from '@/lib/menu-data';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  const menuItems = await cmsFetch('/menu-items');
  const dataAvailable = Array.isArray(menuItems);
  const galleryItems = dataAvailable ? menuProductsOrFallback(menuItems) : [];
  return <GalleryExperience menuItems={galleryItems} dataAvailable={dataAvailable} />;
}
