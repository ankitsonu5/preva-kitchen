import { cmsFetch } from '@/lib/cms';
import { FALLBACK_POSTS } from '@/data/fallbackPosts';
import BlogListContent from '@/components/site-page/BlogListContent';

const NON_KITCHEN_COPY = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b|afrobeats|sports bar|happy hour|pre-game|afterpart|party at|dress code/i;

export default async function Blog({ searchParams }) {
  const params = await searchParams;
  const initialPage = Math.max(1, parseInt(params?.page || '1', 10));

  const data = await cmsFetch('/posts', { query: { limit: 100 } });
  const clean = (Array.isArray(data) ? data : []).filter((post) => !NON_KITCHEN_COPY.test(`${post.title || ''} ${post.excerpt || ''} ${(post.categories || []).map((item) => item.category?.name || item.name || '').join(' ')}`));
  const posts = clean.length > 0 ? clean : FALLBACK_POSTS;

  return <BlogListContent posts={posts} initialPage={initialPage} />;
}
