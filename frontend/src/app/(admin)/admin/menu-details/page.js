'use client';

import { useEffect, useState } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  ExternalLink, 
  Upload, 
  Save, 
  Trash2, 
  Check, 
  Sparkles, 
  HelpCircle, 
  ShoppingBag,
  ArrowRight,
  Eye
} from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { PageHeader, LoadingSkeleton } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';
import { KITCHEN_MENU_ITEMS } from '@/lib/kitchen-menu-data';
import { getDefaultAboutTitle, getDefaultFaqs } from '@/lib/dish-detail-content';

const categories = [
  'Preva Wings',
  'Preva Burger',
  'Quesadillas',
  'Tacos',
  'Preva Bites',
  'Pasta',
  'Salads',
  'Entrées',
  'Sides',
  'Dessert',
  'Others'
];

const blankTemplate = {
  id: '',
  name: '',
  slug: '',
  price: '',
  category: 'Preva Wings',
  description: '',
  aboutTitle: '',
  aboutContent: '',
  image: '',
  tags: '',
  pairings: '',
  uberEatsUrl: '',
  doorDashUrl: '',
  grubhubUrl: '',
  faqs: [
    { q: '', a: '' }
  ],
  available: true,
  featured: false,
  sortOrder: 10
};

export default function DishDetailsTemplateManager() {
  const [menuList, setMenuList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('new');
  const [form, setForm] = useState(blankTemplate);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load all dishes from backend or fallback to authentic static list
  async function loadDishes() {
    setLoading(true);
    let items = [];
    try {
      const res = await api('/admin/menu-items');
      if (res.ok) {
        items = await res.json();
      }
    } catch (e) {
      console.error(e);
    }

    if (!items || items.length === 0) {
      // Use fallback static items
      items = KITCHEN_MENU_ITEMS.map((item, idx) => ({
        id: `static-${idx}`,
        ...item,
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags,
        pairings: Array.isArray(item.pairings) ? item.pairings.join(', ') : item.pairings
      }));
    }

    setMenuList(items);
    setLoading(false);
  }

  useEffect(() => {
    loadDishes();
  }, []);

  function selectDish(dish) {
    setSelectedId(dish.id || dish.slug);
    setForm({
      id: dish.id && !String(dish.id).startsWith('static-') ? dish.id : '',
      name: dish.name || '',
      slug: dish.slug || (dish.name ? dish.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''),
      price: dish.price || '',
      category: dish.category || 'Preva Wings',
      description: dish.description || '',
      aboutTitle: dish.aboutTitle || getDefaultAboutTitle(dish),
      aboutContent: dish.aboutContent || '',
      image: dish.image || '',
      tags: Array.isArray(dish.tags) ? dish.tags.join(', ') : (dish.tags || ''),
      pairings: Array.isArray(dish.pairings) ? dish.pairings.join(', ') : (dish.pairings || ''),
      uberEatsUrl: dish.uberEatsUrl || '',
      doorDashUrl: dish.doorDashUrl || '',
      grubhubUrl: dish.grubhubUrl || '',
      faqs: dish.faqs && dish.faqs.length > 0 ? dish.faqs : getDefaultFaqs(dish),
      available: dish.available !== false,
      featured: Boolean(dish.featured),
      sortOrder: dish.sortOrder || 10
    });
    setSaveSuccess(false);
  }

  function handleNewTemplate() {
    setSelectedId('new');
    setForm(blankTemplate);
    setSaveSuccess(false);
  }

  function change(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      if (name === 'name' && (!prev.id || selectedId === 'new')) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return updated;
    });
  }

  // FAQ builder handlers
  function addFaq() {
    setForm(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { q: 'New Question?', a: 'Answer about this dish...' }]
    }));
  }

  function updateFaq(index, field, value) {
    setForm(prev => {
      const faqs = [...(prev.faqs || [])];
      faqs[index] = { ...faqs[index], [field]: value };
      return { ...prev, faqs };
    });
  }

  function removeFaq(index) {
    setForm(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return alert('Image must be smaller than 5MB.');

    setUploading(true);
    const data = new FormData();
    data.append('files', file);
    const response = await api('/admin/media/upload', { method: 'POST', body: data });
    if (response.ok) {
      const uploaded = await response.json();
      setForm(prev => ({ ...prev, image: uploaded[0]?.url || prev.image }));
    } else {
      alert((await response.json().catch(() => null))?.message || 'Image upload failed.');
    }
    setUploading(false);
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 10,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
      pairings: typeof form.pairings === 'string' ? form.pairings.split(',').map(p => p.trim()).filter(Boolean) : form.pairings
    };

    const isEdit = Boolean(form.id);
    const url = isEdit ? `/admin/menu-items/${form.id}` : '/admin/menu-items';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await api(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const saved = await response.json();
        setForm(prev => ({ ...prev, id: saved.id || prev.id }));
        setSaveSuccess(true);
        await loadDishes();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.message || 'Could not save dish details template.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving.');
    }
    setSaving(false);
  }

  const publicUrlSlug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dish';
  const tagList = typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : (form.tags || []);
  const pairingList = typeof form.pairings === 'string' ? form.pairings.split(',').map(p => p.trim()).filter(Boolean) : (form.pairings || []);

  return (
    <Shell>
      <PageHeader
        eyebrow="Dynamic Template Builder"
        title="Dish Details Page Manager"
        description="Select any dish from the menu to customize its luxury detail template, FAQs, live images, delivery channels, and SEO tags."
        icon={UtensilsCrossed}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handleNewTemplate}>
              <Plus size={15} /> Add New Dish Template
            </button>
            <a
              href={`/menu/${publicUrlSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Eye size={15} /> View Public Page ↗
            </a>
          </div>
        }
      />

      {/* Selector Ribbon */}
      <div className="panel" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Select Dish to Edit:
          </label>
          <select
            className="input"
            style={{ maxWidth: '340px', margin: 0 }}
            value={selectedId}
            onChange={(e) => {
              if (e.target.value === 'new') {
                handleNewTemplate();
              } else {
                const found = menuList.find(m => (m.id || m.slug) === e.target.value);
                if (found) selectDish(found);
              }
            }}
          >
            <option value="new">+ Create Brand New Dish Template...</option>
            {menuList.map((item, idx) => (
              <option key={item.id || idx} value={item.id || item.slug}>
                {item.name} ({item.category}) — {item.price}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
            Live Page Route:
          </span>
          <code style={{ fontSize: '12px', background: 'rgba(201, 163, 78, 0.1)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(201, 163, 78, 0.25)' }}>
            /menu/{publicUrlSlug}
          </code>
        </div>
      </div>

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={6} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* LEFT: Complete Template Form */}
          <form onSubmit={handleSave} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                Template Content &amp; Details
              </h3>
              {saveSuccess && (
                <span style={{ color: '#06c167', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Check size={16} /> Saved &amp; Live on Website!
                </span>
              )}
            </div>

            <div className="form-grid">
              <label className="field field-span">
                Dish Title (Heading 1) *
                <input className="input" name="name" value={form.name} onChange={change} required placeholder="e.g. Rasta Pasta" />
              </label>

              <label className="field">
                URL Slug (/menu/slug) *
                <input className="input" name="slug" value={form.slug} onChange={change} required placeholder="e.g. rasta-pasta" />
              </label>

              <label className="field">
                Price *
                <input className="input" name="price" value={form.price} onChange={change} required placeholder="e.g. $22.00" />
              </label>

              <label className="field">
                Category Eyebrow *
                <select className="input" name="category" value={form.category} onChange={change}>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Sort Order
                <input className="input" type="number" name="sortOrder" value={form.sortOrder} onChange={change} />
              </label>

              <label className="field field-span">
                Description &amp; Chef Notes *
                <textarea className="input" name="description" value={form.description} onChange={change} rows="3" placeholder="Describe the flavors, preparation, ingredients, choice of protein..." />
              </label>

              <div className="field field-span" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                  Shop Detail Page — About Section
                </span>
                <label className="field" style={{ marginBottom: '10px' }}>
                  About Heading
                  <input className="input" name="aboutTitle" value={form.aboutTitle} onChange={change} placeholder="e.g. About Honey Hot Wings — Sweet Heat, Made in Redford, MI" />
                </label>
                <label className="field">
                  About Content
                  <textarea
                    className="input"
                    name="aboutContent"
                    value={form.aboutContent}
                    onChange={change}
                    rows="8"
                    placeholder="Write the About copy here. Leave a blank line between paragraphs."
                  />
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                    Separate paragraphs with a blank line. If empty, the shop page generates dish-specific content automatically.
                  </span>
                </label>
              </div>

              {/* Photo Input & Live Upload */}
              <div className="field field-span">
                <label>Dish Visual (High-Resolution Image)</label>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '4px' }}>
                  {form.image && (
                    <img
                      src={form.image}
                      alt="Preview"
                      style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <input className="input" name="image" value={form.image} onChange={change} placeholder="Paste live WebP image URL..." style={{ marginBottom: 0 }} />
                    <label className="btn btn-secondary" style={{ display: 'inline-flex', width: 'fit-content', cursor: 'pointer', gap: '8px', margin: 0, padding: '7px 12px' }}>
                      <Upload size={14} />
                      {uploading ? 'Uploading...' : 'Upload Image File'}
                      <input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Dietary & Characteristic Tags */}
              <label className="field field-span">
                Dietary &amp; Highlight Tags (comma separated)
                <input className="input" name="tags" value={form.tags} onChange={change} placeholder="e.g. spicy, contains gluten, contains dairy, chef special, gluten-free" />
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  Pills displayed prominently on the detail page next to the price.
                </span>
              </label>

              {/* Chef Recommendations / Pairings */}
              <label className="field field-span">
                Suggested Pairings (comma separated dish names)
                <input className="input" name="pairings" value={form.pairings} onChange={change} placeholder="e.g. Preva Quesadillas, Mac & Cheese, House Salad" />
              </label>

              {/* Delivery Platform Custom Links */}
              <div className="field field-span" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                  Delivery Channels (Auto-generated by default if left blank)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input className="input" name="uberEatsUrl" value={form.uberEatsUrl} onChange={change} placeholder="Custom Uber Eats Link..." />
                  <input className="input" name="doorDashUrl" value={form.doorDashUrl} onChange={change} placeholder="Custom DoorDash Link..." />
                  <input className="input" name="grubhubUrl" value={form.grubhubUrl} onChange={change} placeholder="Custom Grubhub Link..." style={{ gridColumn: 'span 2' }} />
                </div>
              </div>

              {/* FAQ Builder */}
              <div className="field field-span" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                    Dish FAQ Accordions ({form.faqs?.length || 0})
                  </span>
                  <button type="button" className="btn btn-secondary" onClick={addFaq} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    <Plus size={13} /> Add FAQ Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(form.faqs || []).map((faq, idx) => (
                    <div key={idx} style={{ padding: '12px', background: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <input
                          className="input"
                          value={faq.q}
                          onChange={(e) => updateFaq(idx, 'q', e.target.value)}
                          placeholder="Question..."
                          style={{ margin: 0, fontWeight: 600 }}
                        />
                        <button type="button" className="icon-button" onClick={() => removeFaq(idx)} title="Delete FAQ" style={{ color: 'var(--danger)' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <textarea
                        className="input"
                        value={faq.a}
                        onChange={(e) => updateFaq(idx, 'a', e.target.value)}
                        rows="2"
                        placeholder="Answer..."
                        style={{ margin: 0, fontSize: '12px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Switches */}
              <div className="field field-span" style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" name="available" checked={form.available} onChange={change} />
                  Publicly Available &amp; Searchable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" name="featured" checked={Boolean(form.featured)} onChange={change} />
                  Featured Chef Special
                </label>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button
                type="submit"
                className="btn"
                disabled={saving || uploading}
                style={{ minWidth: '180px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Save size={15} />
                {saving ? 'Publishing Template...' : 'Save & Publish Details Page'}
              </button>
            </div>
          </form>

          {/* RIGHT: Live Luxury Template Mockup Preview */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <div className="panel" style={{ background: '#080809', border: '1px solid rgba(201, 163, 78, 0.3)', padding: '24px', borderRadius: '18px', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  ✨ Live Details Page Mockup
                </span>
                <span style={{ fontSize: '11px', color: '#888' }}>
                  Responsive Luxury Template
                </span>
              </div>

              {/* Breadcrumb Preview */}
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '14px' }}>
                Home ✦ Menu ✦ {form.category} ✦ <span style={{ color: '#fff', fontWeight: 600 }}>{form.name}</span>
              </div>

              {/* 2-Column Mockup Card */}
              <div style={{ background: '#111114', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', padding: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '10px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {form.image ? (
                      <img src={form.image} alt={form.name || 'Preview'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#666', gap: '4px' }}>
                        <span style={{ fontSize: '24px' }}>📷</span>
                        <span>Upload Photo</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#c9a34e', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{form.category}</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 900, color: form.name ? '#fff' : '#777', margin: '2px 0 4px' }}>
                      {form.name || 'Your Dish Title'}
                    </h4>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#c9a34e', marginBottom: '6px' }}>
                      {form.price || '$0.00'}
                    </div>
                    
                    {/* Tags preview */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {tagList.length > 0 ? (
                        tagList.slice(0, 3).map((t, i) => (
                          <span key={i} style={{ fontSize: '9px', background: 'rgba(201, 163, 78, 0.12)', color: '#fae39b', padding: '2px 6px', borderRadius: '999px', border: '1px solid rgba(201, 163, 78, 0.25)' }}>
                            {t}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '9px', color: '#666' }}>No tags yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: form.description ? '#aaa' : '#666', margin: '12px 0 14px', lineHeight: 1.5 }}>
                  {form.description || 'Dish description and chef notes will appear here in real-time...'}
                </p>

                {/* Delivery preview grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#06c167', fontWeight: 800 }}>Uber Eats</span>
                    <span style={{ color: '#fae39b' }}>Buy Now →</span>
                  </div>
                  <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ff3008', fontWeight: 800 }}>DoorDash</span>
                    <span style={{ color: '#fae39b' }}>Buy Now →</span>
                  </div>
                </div>
              </div>

              {/* FAQ Mockup */}
              <div style={{ background: '#111114', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#c9a34e', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Frequently Asked Questions ({form.faqs?.filter(f => f.q || f.a).length || 0})
                </span>
                {(form.faqs?.filter(f => f.q || f.a).length > 0 ? form.faqs.filter(f => f.q || f.a) : [{ q: `What is this dish at Preva Kitchen?`, a: 'Add your custom FAQs on the left to see them appear here.' }]).slice(0, 2).map((faq, i) => (
                  <div key={i} style={{ fontSize: '10px', padding: '6px 0', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <b style={{ color: '#fff' }}>Q: {faq.q}</b>
                    <p style={{ color: '#888', margin: '2px 0 0' }}>A: {faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
