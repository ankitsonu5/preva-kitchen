export default function ProductTags({ tags }) {
  const items = Array.isArray(tags)
    ? tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : typeof tags === 'string'
      ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [];

  if (!items.length) return null;

  return (
    <div className="ps-product-tags" aria-label="Dish highlights">
      {items.map((tag) => <span className="ps-chip" key={tag}>{tag}</span>)}
    </div>
  );
}
