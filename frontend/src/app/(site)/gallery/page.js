import { cmsFetch } from '@/lib/cms';
import GalleryExperience from '@/components/gallery/GalleryExperience';

export default async function GalleryPage() {
  const galleries = await cmsFetch('/galleries', { query: { view: 'photo-gallery' } });
  const dataAvailable = Array.isArray(galleries);
  return <GalleryExperience galleries={dataAvailable ? galleries : []} dataAvailable={dataAvailable} />;
}
