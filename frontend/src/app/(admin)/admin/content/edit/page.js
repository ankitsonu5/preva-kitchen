'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Shell from '@/components/admin/Shell';
import { LoadingSkeleton, PageHeader } from '@/components/admin/AdminUI';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { api } from '@/lib/admin-api';
import { BookOpen, FileText, Eye, ChevronDown, ChevronRight } from 'lucide-react';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function editorSlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/* ─── Section Block Template Registry ─────────────────────────────────────── */
const SECTION_TEMPLATES = [
  /* ─ Layout ─ */
  { type: 'container', title: 'Container', icon: '⬛', desc: 'Boxed or full-width wrapper with background & padding', category: 'Layout',
    defaultData: { layout: 'boxed', bgType: 'dark', bgColor: '#0a0a0a', bgImage: '', padding: 'standard' } },
  { type: 'columns', title: 'Two Columns', icon: '◫', desc: 'Left + right column layout with custom content each side', category: 'Layout',
    defaultData: { gap: 'medium', leftWidth: '50', leftContent: '<p>Left column content here.</p>', rightContent: '<p>Right column content here.</p>', stackOnMobile: true } },
  { type: 'divider', title: 'Spacer / Divider', icon: '—', desc: 'Visual separator line or empty spacer with height control', category: 'Layout',
    defaultData: { height: 60, showLine: true, lineColor: 'rgba(201,168,76,0.3)', lineStyle: 'solid', lineWidth: 60 } },

  /* ─ Text & Content ─ */
  { type: 'text', title: 'Rich Text', icon: '📝', desc: 'Heading + paragraph with full HTML formatting support', category: 'Content',
    defaultData: { heading: 'Section Heading', headingTag: 'h2', headingAlign: 'center', content: '<p>Write your content here. Full HTML is supported.</p>', contentAlign: 'center' } },
  { type: 'banner', title: 'Banner', icon: '🎨', desc: 'Full-width color or image banner with headline & subtitle', category: 'Content',
    defaultData: { heading: 'Big Announcement Here', subtext: 'Supporting subtitle or description text.', bgType: 'gold', bgColor: '#c9a84c', bgImage: '', textColor: '#fff', align: 'center', padding: 'large' } },
  { type: 'button', title: 'Button', icon: '🔘', desc: 'Standalone CTA button with label, URL and style', category: 'Content',
    defaultData: { label: 'Click Here', url: '#', target: '_self', style: 'gold', size: 'medium', align: 'center' } },
  { type: 'cta', title: 'Call to Action', icon: '🚀', desc: 'Headline + description + CTA button block', category: 'Content',
    defaultData: { heading: 'Ready to Get Started?', subtext: 'Join us for an unforgettable experience.', btnLabel: 'Book Now', btnUrl: '#', btnStyle: 'gold', bgType: 'dark', align: 'center' } },

  /* ─ Media ─ */
  { type: 'image', title: 'Image', icon: '🖼', desc: 'Single image with caption, alt text and optional link', category: 'Media',
    defaultData: { src: '', alt: '', caption: '', link: '', linkTarget: '_self', width: 'full', align: 'center', borderRadius: 8 } },
  { type: 'video', title: 'Video Embed', icon: '▶', desc: 'YouTube, Vimeo or direct MP4 video embed', category: 'Media',
    defaultData: { url: '', type: 'youtube', autoplay: false, muted: false, loop: false, controls: true, aspectRatio: '16/9' } },
  { type: 'gallery', title: 'Image Gallery', icon: '🖼', desc: 'Responsive image grid from URLs or media library', category: 'Media',
    defaultData: { columns: 3, gap: 10, images: [
      { src: '', alt: 'Gallery image 1', caption: '' },
      { src: '', alt: 'Gallery image 2', caption: '' },
      { src: '', alt: 'Gallery image 3', caption: '' }
    ], borderRadius: 6, lightbox: true } },
  { type: 'gallery_text', title: 'Gallery + Text', icon: '🖼💬', desc: 'Image or gallery on one side, text content on other', category: 'Media',
    defaultData: { imageSrc: '', imageAlt: '', layout: 'image-left', content: '<h3>Section Heading</h3><p>Add your text content here alongside the image.</p>', imageWidth: '50', gap: 'medium', borderRadius: 8 } },

  /* ─ Interactive ─ */
  { type: 'accordion', title: 'Accordion / FAQ', icon: '➕', desc: 'Collapsible question & answer panels (FAQ style)', category: 'Interactive',
    defaultData: { heading: 'Frequently Asked Questions', items: [
      { question: 'What are your hours?', answer: 'We are open Tuesday-Sunday from 11am to 2am.' },
      { question: 'Do you accept reservations?', answer: 'Yes, we accept reservations for dining and VIP tables.' },
      { question: 'Is there a dress code?', answer: 'Smart casual to upscale attire is required for evening hours.' }
    ] } },
  { type: 'tabs', title: 'Tabbed Content', icon: '📂', desc: 'Content organized in switchable tabs', category: 'Interactive',
    defaultData: { tabs: [
      { label: 'Tab 1', content: '<p>Content for the first tab goes here.</p>' },
      { label: 'Tab 2', content: '<p>Content for the second tab goes here.</p>' },
      { label: 'Tab 3', content: '<p>Content for the third tab goes here.</p>' }
    ] } },
  { type: 'shortcode', title: 'Shortcode', icon: '[]', desc: 'Execute a registered shortcode on the frontend', category: 'Interactive',
    defaultData: { code: '[contact-form]', note: 'Shortcodes must be registered in the frontend code.' } },

  /* ─ Data Display ─ */
  { type: 'icon_boxes', title: 'Icon Boxes', icon: '🔲', desc: 'Grid of icon + title + description feature cards', category: 'Data',
    defaultData: { columns: 3, items: [
      { icon: '🌟', title: 'Feature One', desc: 'Short description of this amazing feature.' },
      { icon: '📦', title: 'Feature Two', desc: 'Short description of this amazing feature.' },
      { icon: '⚡', title: 'Feature Three', desc: 'Short description of this amazing feature.' }
    ] } },
  { type: 'stats', title: 'Stats / Counter', icon: '📊', desc: 'Number stats with labels e.g. 500+ guests, 4.9 stars', category: 'Data',
    defaultData: { heading: '', items: [
      { number: '500+', label: 'Happy Guests', icon: '👥' },
      { number: '4.9★', label: 'Star Rating', icon: '⭐' },
      { number: '10+', label: 'Years Open', icon: '🎉' },
      { number: '50+', label: 'Menu Items', icon: '🍽' }
    ] } },
  { type: 'pricing', title: 'Pricing Table', icon: '💳', desc: 'Pricing cards with features list and CTA button', category: 'Data',
    defaultData: { heading: 'Our Packages', items: [
      { name: 'Standard', price: '$99', period: 'night', features: ['2 VIP Seats', 'Welcome Bottle', 'Priority Entry'], btnLabel: 'Book Now', btnUrl: '#', highlight: false },
      { name: 'Premium', price: '$199', period: 'night', features: ['4 VIP Seats', '2 Bottles', 'Host Service', 'Priority Entry'], btnLabel: 'Book Now', btnUrl: '#', highlight: true },
      { name: 'Elite', price: '$399', period: 'night', features: ['8 VIP Seats', '4 Bottles', 'Personal Host', 'Red Carpet'], btnLabel: 'Contact Us', btnUrl: '#', highlight: false }
    ] } },
  { type: 'team', title: 'Team Members', icon: '👥', desc: 'Staff profile cards with photo, name, role & bio', category: 'Data',
    defaultData: { heading: 'Meet the Team', columns: 3, items: [
      { name: 'Chef Marcus', role: 'Executive Chef', photo: '', bio: 'Award-winning chef with 15 years of culinary expertise.', social: { instagram: '', twitter: '' } },
      { name: 'DJ Kronos', role: 'Resident DJ', photo: '', bio: 'High-energy sets that keep the dance floor alive all night.', social: { instagram: '', twitter: '' } }
    ] } },

  /* ─ Embed ─ */
  { type: 'map', title: 'Map Embed', icon: '🗺', desc: 'Google Maps or custom map iframe embed', category: 'Embed',
    defaultData: { mapUrl: 'https://www.google.com/maps?q=Detroit,MI&output=embed', height: 400, borderRadius: 10 } },
  { type: 'social', title: 'Social Links', icon: '🔗', desc: 'Social media icon buttons with links', category: 'Embed',
    defaultData: { heading: 'Follow Us', align: 'center', items: [
      { platform: 'instagram', url: 'https://instagram.com/', label: 'Instagram' },
      { platform: 'facebook', url: 'https://facebook.com/', label: 'Facebook' },
      { platform: 'twitter', url: 'https://twitter.com/', label: 'Twitter' }
    ] } },

  /* ─ Custom ─ */
  { type: 'custom_html', title: 'Custom HTML', icon: '⌨', desc: 'Raw HTML, CSS, JS, YouTube iframe or any embed code', category: 'Custom',
    defaultData: { html: '<!-- Paste your HTML / embed code here -->\n<div class="custom-block">\n  <p>Hello World</p>\n</div>' } },
  { type: 'grid', title: 'Grid Layout', icon: '⚏', desc: '1–4 column responsive grid with editable card items', category: 'Layout',
    defaultData: { columns: 3, items: [
      { icon: '🍽️', title: 'Item Title', description: 'Short description for this grid card.' },
      { icon: '🥂', title: 'Item Title', description: 'Short description for this grid card.' },
      { icon: '🎵', title: 'Item Title', description: 'Short description for this grid card.' }
    ] } },
  { type: 'form', title: 'Custom Form', icon: '📋', desc: 'Form builder with custom field types and submit action', category: 'Interactive',
    defaultData: { formTitle: 'Contact Us', formDesc: 'Fill in the form below and we will get back to you shortly.', submitLabel: 'Send Message',
      fields: [
        { id: 'f1', type: 'text', label: 'Your Name', placeholder: 'John Doe', required: true },
        { id: 'f2', type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
        { id: 'f3', type: 'textarea', label: 'Message', placeholder: 'Write your message…', required: false }
      ] } },

  /* ─ Restaurant (predefined) ─ */
  { type: 'hero', title: 'Hero Banner', icon: '🖼', desc: 'Main headline, subtitle & background slides', category: 'Restaurant' },
  { type: 'about', title: 'About Section', icon: 'i', desc: 'Brand intro, story & feature image', category: 'Restaurant' },
  { type: 'kitchen', title: 'Culinary Showcase', icon: '🍳', desc: 'Dish showcase & chef signature items', category: 'Restaurant' },
  { type: 'food_menu_grid', title: 'Food Menu Grid', icon: '🥘', desc: 'Full interactive food & drink menu', category: 'Restaurant' },
  { type: 'nightlife', title: 'Nightlife Section', icon: '🎉', desc: 'VIP bottle service & DJ announcements', category: 'Restaurant' },
  { type: 'reservations', title: 'Reservation Form', icon: '📅', desc: 'Dining & VIP booth booking form', category: 'Restaurant' },
  { type: 'testimonials', title: 'Google Reviews', icon: '⭐', desc: 'Live Google Business reviews carousel', category: 'Restaurant' },
  { type: 'newsletter', title: 'VIP Newsletter', icon: '✉', desc: 'Exclusive club subscription card', category: 'Restaurant' },
  { type: 'contact', title: 'Contact & Map', icon: '📍', desc: 'Address, hours & inquiry form', category: 'Restaurant' },
  { type: 'posts_grid', title: 'Blog Posts Grid', icon: '📰', desc: 'Grid of latest news & blog articles', category: 'Restaurant' }
];

/* ─── Default data factory ─────────────────────────────────────────────────── */
function defaultDataFor(type) {
  const tpl = SECTION_TEMPLATES.find(t => t.type === type);
  return tpl?.defaultData ? JSON.parse(JSON.stringify(tpl.defaultData)) : {};
}

/* ─── Shared mini-styles for SectionEditor ─────────────────────────────────── */
const editorWrap = { paddingTop: 0, marginTop: 0 };
const editorH4 = { margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.03em' };
const grid2 = { display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 14px', alignItems: 'center' };
const lbl = { fontSize: 12, color: '#b0b8c4', fontWeight: 500, userSelect: 'none' };
const inp = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 7, padding: '7px 11px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' };
/* colorScheme:'dark' fixes browser native dropdown option text visibility */
const sel = { background: '#13131f', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 7, padding: '7px 11px', color: '#fff', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark', cursor: 'pointer' };
const mkTab = (active) => ({ padding: '8px 18px', fontSize: '0.79rem', fontWeight: active ? 600 : 400, color: active ? 'var(--gold)' : '#888', background: active ? 'rgba(201,168,76,0.07)' : 'transparent', border: 'none', borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, cursor: 'pointer', transition: 'all 140ms', letterSpacing: '0.02em', whiteSpace: 'nowrap' });
const TYPE_COLORS = {
  container: '#6366f1', grid: '#0ea5e9', form: '#10b981', custom_html: '#f59e0b',
  hero: '#ec4899', about: '#8b5cf6', kitchen: '#f97316', food_menu_grid: '#84cc16',
  nightlife: '#a855f7', reservations: '#06b6d4', testimonials: '#f43f5e',
  newsletter: '#eab308', contact: '#14b8a6', posts_grid: '#64748b',
  text: '#3b82f6', banner: '#f43f5e', button: '#eab308', cta: '#f97316',
  image: '#06b6d4', video: '#a855f7', gallery: '#ec4899', gallery_text: '#8b5cf6',
  columns: '#0ea5e9', divider: '#6b7280', accordion: '#10b981', tabs: '#6366f1',
  shortcode: '#f59e0b', icon_boxes: '#84cc16', stats: '#f97316', pricing: '#ec4899',
  team: '#06b6d4', map: '#14b8a6', social: '#3b82f6'
};

/* ─── Inline Section Settings Editor (Elementor-style tabbed panel) ─────────── */
function SectionEditor({ sec, onChange }) {
  const [tab, setTab] = useState('Style');
  const d = sec.data || {};
  const update = (key, val) => onChange({ ...sec, data: { ...d, [key]: val } });

  const TabBar = ({ tabs }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16, overflowX: 'auto' }}>
      {tabs.map(t => <button key={t} type="button" onClick={() => setTab(t)} style={mkTab(tab === t)}>{t}</button>)}
    </div>
  );
  const CtrlGroup = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 9 }}>{label}</div>
      {children}
    </div>
  );

  /* ── Container Block ── */
  if (sec.type === 'container') {
    return (
      <div style={editorWrap}>
        <TabBar tabs={['Style', 'Layout', 'Advanced']} />

        {tab === 'Style' && (
          <CtrlGroup label="Background">
            <div style={grid2}>
              <label style={lbl}>Type</label>
              <select style={sel} value={d.bgType || 'dark'} onChange={e => update('bgType', e.target.value)}>
                <option value="dark">Dark Glass</option>
                <option value="gold">Gold Gradient</option>
                <option value="solid">Solid Color</option>
                <option value="image">Background Image</option>
                <option value="transparent">Transparent</option>
              </select>
              {d.bgType === 'solid' && (<>
                <label style={lbl}>Color</label>
                <input type="color" value={d.bgColor || '#0a0a0a'} onChange={e => update('bgColor', e.target.value)}
                  style={{ height: 36, width: '100%', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, background: 'none', cursor: 'pointer' }} />
              </>)}
              {d.bgType === 'image' && (<>
                <label style={lbl}>Image URL</label>
                <input style={inp} value={d.bgImage || ''} onChange={e => update('bgImage', e.target.value)} placeholder="https://..." />
              </>)}
            </div>
          </CtrlGroup>
        )}

        {tab === 'Layout' && (
          <>
            <CtrlGroup label="Width">
              <div style={grid2}>
                <label style={lbl}>Container</label>
                <select style={sel} value={d.layout || 'boxed'} onChange={e => update('layout', e.target.value)}>
                  <option value="boxed">Boxed (max-width 1200px)</option>
                  <option value="fullwidth">Full Width</option>
                </select>
              </div>
            </CtrlGroup>
            <CtrlGroup label="Spacing">
              <div style={grid2}>
                <label style={lbl}>Padding</label>
                <select style={sel} value={d.padding || 'standard'} onChange={e => update('padding', e.target.value)}>
                  <option value="compact">Compact (2rem top/bottom)</option>
                  <option value="standard">Standard (4rem top/bottom)</option>
                  <option value="spacious">Spacious (7rem top/bottom)</option>
                </select>
              </div>
            </CtrlGroup>
          </>
        )}

        {tab === 'Advanced' && (
          <CtrlGroup label="Custom Attributes">
            <div style={grid2}>
              <label style={lbl}>CSS Class</label>
              <input style={inp} value={d.cssClass || ''} onChange={e => update('cssClass', e.target.value)} placeholder="custom-class-name" />
              <label style={lbl}>Element ID</label>
              <input style={inp} value={d.elementId || ''} onChange={e => update('elementId', e.target.value)} placeholder="section-anchor-id" />
            </div>
          </CtrlGroup>
        )}
      </div>
    );
  }

  /* ── Grid Block ── */
  if (sec.type === 'grid') {
    const items = d.items || [];
    const setData = (patch) => onChange({ ...sec, data: { ...d, ...patch } });
    const updateItem = (idx, key, val) => { const next = [...items]; next[idx] = { ...next[idx], [key]: val }; setData({ items: next }); };
    const addItem = () => setData({ items: [...items, { id: 'gi' + Date.now(), icon: '✦', title: 'New Item', description: 'Description here.' }] });
    const removeItem = (idx) => setData({ items: items.filter((_, i) => i !== idx) });

    return (
      <div style={editorWrap}>
        <TabBar tabs={['Content', 'Layout']} />

        {tab === 'Content' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input style={{ ...inp, width: 54, textAlign: 'center', padding: '6px 4px' }} value={item.icon || ''} onChange={e => updateItem(idx, 'icon', e.target.value)} placeholder="Icon" />
                    <input style={{ ...inp, flex: 1 }} value={item.title || ''} onChange={e => updateItem(idx, 'title', e.target.value)} placeholder="Card title" />
                    <button type="button" className="btn btn-action-delete" onClick={() => removeItem(idx)}>✕</button>
                  </div>
                  <textarea style={{ ...inp, width: '100%', minHeight: 56, resize: 'vertical' }} value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Card description…" />
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={addItem}>+ Add Card</button>
          </>
        )}

        {tab === 'Layout' && (
          <CtrlGroup label="Grid Columns">
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => onChange({ ...sec, data: { ...d, columns: n } })}
                  style={{ flex: 1, height: 42, borderRadius: 8, border: '1px solid', borderColor: (d.columns || 3) === n ? 'var(--gold)' : 'rgba(255,255,255,0.15)', background: (d.columns || 3) === n ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.04)', color: (d.columns || 3) === n ? 'var(--gold)' : '#aaa', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>{n}</button>
              ))}
            </div>
          </CtrlGroup>
        )}
      </div>
    );
  }

  /* ── Form Builder ── */
  if (sec.type === 'form') {
    const fields = d.fields || [];
    const setData = (patch) => onChange({ ...sec, data: { ...d, ...patch } });
    const updateField = (idx, key, val) => { const next = [...fields]; next[idx] = { ...next[idx], [key]: val }; setData({ fields: next }); };
    const addField = () => setData({ fields: [...fields, { id: 'fld' + Date.now(), type: 'text', label: 'Field Label', placeholder: '', required: false }] });
    const removeField = (idx) => setData({ fields: fields.filter((_, i) => i !== idx) });

    return (
      <div style={editorWrap}>
        <TabBar tabs={['Content', 'Fields']} />

        {tab === 'Content' && (
          <div style={grid2}>
            <label style={lbl}>Form Title</label>
            <input style={inp} value={d.formTitle || ''} onChange={e => setData({ formTitle: e.target.value })} placeholder="e.g. Contact Us" />
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, minHeight: 60 }} value={d.formDesc || ''} onChange={e => setData({ formDesc: e.target.value })} placeholder="Short intro above the form…" />
            <label style={lbl}>Submit Button</label>
            <input style={inp} value={d.submitLabel || 'Submit'} onChange={e => setData({ submitLabel: e.target.value })} placeholder="Submit" />
          </div>
        )}

        {tab === 'Fields' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 6, padding: '0 2px', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>TYPE</span>
              <span style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>LABEL</span>
              <span style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>PLACEHOLDER</span>
              <span style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>REQ</span>
              <span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {fields.map((field, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 6, alignItems: 'center' }}>
                  <select style={sel} value={field.type || 'text'} onChange={e => updateField(idx, 'type', e.target.value)}>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown</option>
                    <option value="textarea">Textarea</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                  <input style={inp} value={field.label || ''} onChange={e => updateField(idx, 'label', e.target.value)} placeholder="Label" />
                  <input style={inp} value={field.placeholder || ''} onChange={e => updateField(idx, 'placeholder', e.target.value)} placeholder="Placeholder" />
                  <input type="checkbox" title="Required?" checked={!!field.required} onChange={e => updateField(idx, 'required', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }} />
                  <button type="button" className="btn btn-action-delete" onClick={() => removeField(idx)}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={addField}>+ Add Field</button>
          </>
        )}
      </div>
    );
  }

  /* ── Custom HTML / Embed ── */
  if (sec.type === 'custom_html') {
    return (
      <div style={editorWrap}>
        <p style={{ fontSize: 12, color: '#a1a1aa', margin: '0 0 10px' }}>
          Paste raw HTML, CSS, JavaScript, Google Maps, YouTube iframes or any third-party widget code below.
        </p>
        <textarea
          style={{ ...inp, width: '100%', minHeight: 200, fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: 12.5, resize: 'vertical', lineHeight: 1.6 }}
          value={d.html || ''}
          onChange={e => onChange({ ...sec, data: { ...d, html: e.target.value } })}
          placeholder="<!-- Paste HTML / embed code here -->"
          spellCheck={false}
        />
        <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', margin: '6px 0 0' }}>
          ⚡ This block renders raw HTML on the frontend. Make sure your code is valid.
        </p>
      </div>
    );
  }

  /* ── Rich Text Block ── */
  if (sec.type === 'text') {
    return (
      <div style={editorWrap}>
        <TabBar tabs={['Content', 'Style']} />
        {tab === 'Content' && (
          <div style={grid2}>
            <label style={lbl}>Heading</label>
            <input style={inp} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Section heading..." />
            <label style={lbl}>Heading Tag</label>
            <select style={sel} value={d.headingTag || 'h2'} onChange={e => update('headingTag', e.target.value)}>
              <option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option>
              <option value="h4">H4</option><option value="p">Paragraph</option>
            </select>
            <label style={lbl}>Content (HTML)</label>
            <textarea style={{ ...inp, minHeight: 120, resize: 'vertical', gridColumn: '1/-1' }} value={d.content || ''} onChange={e => update('content', e.target.value)} placeholder="<p>Your content here...</p>" />
          </div>
        )}
        {tab === 'Style' && (
          <div style={grid2}>
            <label style={lbl}>Heading Align</label>
            <select style={sel} value={d.headingAlign || 'center'} onChange={e => update('headingAlign', e.target.value)}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
            <label style={lbl}>Content Align</label>
            <select style={sel} value={d.contentAlign || 'center'} onChange={e => update('contentAlign', e.target.value)}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </div>
        )}
      </div>
    );
  }

  /* ── Image Block ── */
  if (sec.type === 'image') {
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Image URL</label>
          <input style={inp} value={d.src || ''} onChange={e => update('src', e.target.value)} placeholder="https://..." />
          <label style={lbl}>Alt Text</label>
          <input style={inp} value={d.alt || ''} onChange={e => update('alt', e.target.value)} placeholder="Describe the image" />
          <label style={lbl}>Caption</label>
          <input style={inp} value={d.caption || ''} onChange={e => update('caption', e.target.value)} placeholder="Optional caption" />
          <label style={lbl}>Link URL</label>
          <input style={inp} value={d.link || ''} onChange={e => update('link', e.target.value)} placeholder="https://... (optional)" />
          <label style={lbl}>Alignment</label>
          <select style={sel} value={d.align || 'center'} onChange={e => update('align', e.target.value)}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="full">Full Width</option>
          </select>
          <label style={lbl}>Border Radius</label>
          <input style={inp} type="number" min="0" max="50" value={d.borderRadius ?? 8} onChange={e => update('borderRadius', +e.target.value)} />
        </div>
        {d.src && <img src={d.src} alt={d.alt || ''} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: d.borderRadius || 8, marginTop: 12 }} />}
      </div>
    );
  }

  /* ── Gallery Block ── */
  if (sec.type === 'gallery') {
    const images = d.images || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updImg = (i, k, v) => { const a = [...images]; a[i] = { ...a[i], [k]: v }; setData({ images: a }); };
    const addImg = () => setData({ images: [...images, { src: '', alt: '', caption: '' }] });
    const rmImg = i => setData({ images: images.filter((_, idx) => idx !== i) });
    return (
      <div style={editorWrap}>
        <TabBar tabs={['Images', 'Layout']} />
        {tab === 'Images' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
              {images.map((img, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input style={{ ...inp, flex: 2 }} value={img.src || ''} onChange={e => updImg(i, 'src', e.target.value)} placeholder="Image URL" />
                    <input style={{ ...inp, flex: 1 }} value={img.alt || ''} onChange={e => updImg(i, 'alt', e.target.value)} placeholder="Alt" />
                    <button type="button" className="btn btn-action-delete" onClick={() => rmImg(i)}>✕</button>
                  </div>
                  {img.src && <img src={img.src} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 5 }} />}
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={addImg}>+ Add Image</button>
          </>
        )}
        {tab === 'Layout' && (
          <div style={grid2}>
            <label style={lbl}>Columns</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[2,3,4,5].map(n => <button key={n} type="button" onClick={() => setData({ columns: n })} style={{ flex:1, height:36, borderRadius:7, border:'1px solid', borderColor:(d.columns||3)===n?'var(--gold)':'rgba(255,255,255,0.15)', background:(d.columns||3)===n?'rgba(201,168,76,0.18)':'rgba(255,255,255,0.04)', color:(d.columns||3)===n?'var(--gold)':'#aaa', cursor:'pointer', fontWeight:700 }}>{n}</button>)}
            </div>
            <label style={lbl}>Gap (px)</label>
            <input style={inp} type="number" min="0" max="40" value={d.gap ?? 10} onChange={e => setData({ gap: +e.target.value })} />
            <label style={lbl}>Border Radius</label>
            <input style={inp} type="number" min="0" max="30" value={d.borderRadius ?? 6} onChange={e => setData({ borderRadius: +e.target.value })} />
          </div>
        )}
      </div>
    );
  }

  /* ── Gallery + Text Block ── */
  if (sec.type === 'gallery_text') {
    return (
      <div style={editorWrap}>
        <TabBar tabs={['Content', 'Layout']} />
        {tab === 'Content' && (
          <div style={grid2}>
            <label style={lbl}>Image URL</label>
            <input style={inp} value={d.imageSrc || ''} onChange={e => update('imageSrc', e.target.value)} placeholder="https://..." />
            <label style={lbl}>Image Alt</label>
            <input style={inp} value={d.imageAlt || ''} onChange={e => update('imageAlt', e.target.value)} placeholder="Image description" />
            <label style={lbl}>Text Content</label>
            <textarea style={{ ...inp, minHeight: 120, resize: 'vertical', gridColumn: '1/-1' }} value={d.content || ''} onChange={e => update('content', e.target.value)} placeholder="<h3>Heading</h3><p>Your text...</p>" />
          </div>
        )}
        {tab === 'Layout' && (
          <div style={grid2}>
            <label style={lbl}>Layout</label>
            <select style={sel} value={d.layout || 'image-left'} onChange={e => update('layout', e.target.value)}>
              <option value="image-left">Image Left</option>
              <option value="image-right">Image Right</option>
            </select>
            <label style={lbl}>Image Width %</label>
            <input style={inp} type="number" min="30" max="70" value={d.imageWidth || '50'} onChange={e => update('imageWidth', e.target.value)} />
            <label style={lbl}>Border Radius</label>
            <input style={inp} type="number" min="0" max="30" value={d.borderRadius ?? 8} onChange={e => update('borderRadius', +e.target.value)} />
          </div>
        )}
      </div>
    );
  }

  /* ── Video Block ── */
  if (sec.type === 'video') {
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Video URL</label>
          <input style={inp} value={d.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://youtube.com/watch?v=... or .mp4" />
          <label style={lbl}>Type</label>
          <select style={sel} value={d.type || 'youtube'} onChange={e => update('type', e.target.value)}>
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="mp4">Direct MP4</option>
          </select>
          <label style={lbl}>Aspect Ratio</label>
          <select style={sel} value={d.aspectRatio || '16/9'} onChange={e => update('aspectRatio', e.target.value)}>
            <option value="16/9">16:9 (Widescreen)</option>
            <option value="4/3">4:3 (Standard)</option>
            <option value="1/1">1:1 (Square)</option>
            <option value="9/16">9:16 (Portrait)</option>
          </select>
          <label style={lbl}>Autoplay</label>
          <input type="checkbox" checked={!!d.autoplay} onChange={e => update('autoplay', e.target.checked)} style={{ width:18, height:18, accentColor:'var(--gold)', cursor:'pointer' }} />
          <label style={lbl}>Muted</label>
          <input type="checkbox" checked={!!d.muted} onChange={e => update('muted', e.target.checked)} style={{ width:18, height:18, accentColor:'var(--gold)', cursor:'pointer' }} />
          <label style={lbl}>Loop</label>
          <input type="checkbox" checked={!!d.loop} onChange={e => update('loop', e.target.checked)} style={{ width:18, height:18, accentColor:'var(--gold)', cursor:'pointer' }} />
        </div>
      </div>
    );
  }

  /* ── Two Columns Block ── */
  if (sec.type === 'columns') {
    return (
      <div style={editorWrap}>
        <TabBar tabs={['Content', 'Layout']} />
        {tab === 'Content' && (
          <>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>Left Column (HTML)</p>
            <textarea style={{ ...inp, width: '100%', minHeight: 100, resize: 'vertical', marginBottom: 10 }} value={d.leftContent || ''} onChange={e => update('leftContent', e.target.value)} placeholder="<p>Left content...</p>" />
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>Right Column (HTML)</p>
            <textarea style={{ ...inp, width: '100%', minHeight: 100, resize: 'vertical' }} value={d.rightContent || ''} onChange={e => update('rightContent', e.target.value)} placeholder="<p>Right content...</p>" />
          </>
        )}
        {tab === 'Layout' && (
          <div style={grid2}>
            <label style={lbl}>Left Width %</label>
            <input style={inp} type="number" min="20" max="80" value={d.leftWidth || '50'} onChange={e => update('leftWidth', e.target.value)} />
            <label style={lbl}>Gap</label>
            <select style={sel} value={d.gap || 'medium'} onChange={e => update('gap', e.target.value)}>
              <option value="small">Small (16px)</option><option value="medium">Medium (32px)</option><option value="large">Large (60px)</option>
            </select>
            <label style={lbl}>Stack on Mobile</label>
            <input type="checkbox" checked={d.stackOnMobile !== false} onChange={e => update('stackOnMobile', e.target.checked)} style={{ width:18,height:18,accentColor:'var(--gold)',cursor:'pointer' }} />
          </div>
        )}
      </div>
    );
  }

  /* ── Divider / Spacer ── */
  if (sec.type === 'divider') {
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Height (px)</label>
          <input style={inp} type="number" min="4" max="300" value={d.height ?? 60} onChange={e => update('height', +e.target.value)} />
          <label style={lbl}>Show Line</label>
          <input type="checkbox" checked={!!d.showLine} onChange={e => update('showLine', e.target.checked)} style={{ width:18,height:18,accentColor:'var(--gold)',cursor:'pointer' }} />
          {d.showLine && (<>
            <label style={lbl}>Line Color</label>
            <input type="color" value={d.lineColor || '#c9a84c'} onChange={e => update('lineColor', e.target.value)} style={{ height:34, width:'100%', border:'1px solid rgba(255,255,255,0.15)', borderRadius:7, background:'none', cursor:'pointer' }} />
            <label style={lbl}>Line Width %</label>
            <input style={inp} type="number" min="10" max="100" value={d.lineWidth ?? 60} onChange={e => update('lineWidth', +e.target.value)} />
          </>)}
        </div>
      </div>
    );
  }

  /* ── Banner Block ── */
  if (sec.type === 'banner') {
    return (
      <div style={editorWrap}>
        <TabBar tabs={['Content', 'Style']} />
        {tab === 'Content' && (
          <div style={grid2}>
            <label style={lbl}>Heading</label>
            <input style={inp} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Big headline text" />
            <label style={lbl}>Subtext</label>
            <textarea style={{ ...inp, minHeight: 60 }} value={d.subtext || ''} onChange={e => update('subtext', e.target.value)} placeholder="Supporting text..." />
          </div>
        )}
        {tab === 'Style' && (
          <div style={grid2}>
            <label style={lbl}>Background</label>
            <select style={sel} value={d.bgType || 'gold'} onChange={e => update('bgType', e.target.value)}>
              <option value="gold">Gold Gradient</option><option value="dark">Dark</option>
              <option value="solid">Solid Color</option><option value="image">Image</option>
            </select>
            {d.bgType === 'solid' && (<>
              <label style={lbl}>BG Color</label>
              <input type="color" value={d.bgColor || '#c9a84c'} onChange={e => update('bgColor', e.target.value)} style={{ height:34,width:'100%',border:'1px solid rgba(255,255,255,0.15)',borderRadius:7,background:'none',cursor:'pointer' }} />
            </>)}
            {d.bgType === 'image' && (<>
              <label style={lbl}>BG Image URL</label>
              <input style={inp} value={d.bgImage || ''} onChange={e => update('bgImage', e.target.value)} placeholder="https://..." />
            </>)}
            <label style={lbl}>Text Color</label>
            <input type="color" value={d.textColor || '#ffffff'} onChange={e => update('textColor', e.target.value)} style={{ height:34,width:'100%',border:'1px solid rgba(255,255,255,0.15)',borderRadius:7,background:'none',cursor:'pointer' }} />
            <label style={lbl}>Padding</label>
            <select style={sel} value={d.padding || 'large'} onChange={e => update('padding', e.target.value)}>
              <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
            </select>
            <label style={lbl}>Alignment</label>
            <select style={sel} value={d.align || 'center'} onChange={e => update('align', e.target.value)}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </div>
        )}
      </div>
    );
  }

  /* ── CTA Block ── */
  if (sec.type === 'cta') {
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Heading</label>
          <input style={inp} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Ready to join us?" />
          <label style={lbl}>Subtext</label>
          <textarea style={{ ...inp, minHeight: 60 }} value={d.subtext || ''} onChange={e => update('subtext', e.target.value)} placeholder="Supporting description..." />
          <label style={lbl}>Button Label</label>
          <input style={inp} value={d.btnLabel || 'Book Now'} onChange={e => update('btnLabel', e.target.value)} />
          <label style={lbl}>Button URL</label>
          <input style={inp} value={d.btnUrl || '#'} onChange={e => update('btnUrl', e.target.value)} placeholder="https://..." />
          <label style={lbl}>Button Style</label>
          <select style={sel} value={d.btnStyle || 'gold'} onChange={e => update('btnStyle', e.target.value)}>
            <option value="gold">Gold</option><option value="white">White</option><option value="outline">Outline</option>
          </select>
          <label style={lbl}>Background</label>
          <select style={sel} value={d.bgType || 'dark'} onChange={e => update('bgType', e.target.value)}>
            <option value="dark">Dark</option><option value="gold">Gold</option><option value="transparent">Transparent</option>
          </select>
          <label style={lbl}>Alignment</label>
          <select style={sel} value={d.align || 'center'} onChange={e => update('align', e.target.value)}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </div>
      </div>
    );
  }

  /* ── Button Block ── */
  if (sec.type === 'button') {
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Label</label>
          <input style={inp} value={d.label || 'Click Here'} onChange={e => update('label', e.target.value)} />
          <label style={lbl}>URL</label>
          <input style={inp} value={d.url || '#'} onChange={e => update('url', e.target.value)} placeholder="https://..." />
          <label style={lbl}>Open In</label>
          <select style={sel} value={d.target || '_self'} onChange={e => update('target', e.target.value)}>
            <option value="_self">Same Tab</option><option value="_blank">New Tab</option>
          </select>
          <label style={lbl}>Style</label>
          <select style={sel} value={d.style || 'gold'} onChange={e => update('style', e.target.value)}>
            <option value="gold">Gold</option><option value="white">White</option><option value="outline">Outline</option><option value="dark">Dark</option>
          </select>
          <label style={lbl}>Size</label>
          <select style={sel} value={d.size || 'medium'} onChange={e => update('size', e.target.value)}>
            <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
          </select>
          <label style={lbl}>Alignment</label>
          <select style={sel} value={d.align || 'center'} onChange={e => update('align', e.target.value)}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </div>
      </div>
    );
  }

  /* ── Accordion / FAQ ── */
  if (sec.type === 'accordion') {
    const items = d.items || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updItem = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; setData({ items: a }); };
    const addItem = () => setData({ items: [...items, { question: 'New Question?', answer: 'Answer goes here.' }] });
    const rmItem = i => setData({ items: items.filter((_, idx) => idx !== i) });
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Section Heading</label>
          <input style={inp} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="FAQ / Accordion heading" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, maxHeight: 360, overflowY: 'auto' }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input style={{ ...inp, flex: 1 }} value={item.question || ''} onChange={e => updItem(i, 'question', e.target.value)} placeholder="Question" />
                <button type="button" className="btn btn-action-delete" onClick={() => rmItem(i)}>✕</button>
              </div>
              <textarea style={{ ...inp, width: '100%', minHeight: 60, resize: 'vertical' }} value={item.answer || ''} onChange={e => updItem(i, 'answer', e.target.value)} placeholder="Answer..." />
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={addItem}>+ Add Q&A</button>
      </div>
    );
  }

  /* ── Tabs Block ── */
  if (sec.type === 'tabs') {
    const tabs = d.tabs || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updTab = (i, k, v) => { const a = [...tabs]; a[i] = { ...a[i], [k]: v }; setData({ tabs: a }); };
    const addTab = () => setData({ tabs: [...tabs, { label: 'New Tab', content: '<p>Tab content here.</p>' }] });
    const rmTab = i => setData({ tabs: tabs.filter((_, idx) => idx !== i) });
    return (
      <div style={editorWrap}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
          {tabs.map((t, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input style={{ ...inp, flex: 1 }} value={t.label || ''} onChange={e => updTab(i, 'label', e.target.value)} placeholder="Tab Label" />
                <button type="button" className="btn btn-action-delete" onClick={() => rmTab(i)}>✕</button>
              </div>
              <textarea style={{ ...inp, width: '100%', minHeight: 80, resize: 'vertical' }} value={t.content || ''} onChange={e => updTab(i, 'content', e.target.value)} placeholder="<p>Tab content...</p>" />
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={addTab}>+ Add Tab</button>
      </div>
    );
  }

  /* ── Icon Boxes ── */
  if (sec.type === 'icon_boxes') {
    const items = d.items || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updItem = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; setData({ items: a }); };
    return (
      <div style={editorWrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <label style={lbl}>Columns</label>
          {[2,3,4].map(n => <button key={n} type="button" onClick={() => setData({ columns: n })} style={{ width:36, height:36, borderRadius:7, border:'1px solid', borderColor:(d.columns||3)===n?'var(--gold)':'rgba(255,255,255,0.15)', background:(d.columns||3)===n?'rgba(201,168,76,0.18)':'rgba(255,255,255,0.04)', color:(d.columns||3)===n?'var(--gold)':'#aaa', cursor:'pointer', fontWeight:700 }}>{n}</button>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
              <input style={{ ...inp, textAlign: 'center' }} value={item.icon || ''} onChange={e => updItem(i, 'icon', e.target.value)} placeholder="🌟" />
              <input style={inp} value={item.title || ''} onChange={e => updItem(i, 'title', e.target.value)} placeholder="Title" />
              <input style={inp} value={item.desc || ''} onChange={e => updItem(i, 'desc', e.target.value)} placeholder="Description" />
              <button type="button" className="btn btn-action-delete" onClick={() => setData({ items: items.filter((_,idx)=>idx!==i) })}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={() => setData({ items: [...items, { icon: '✨', title: 'New Feature', desc: 'Description.' }] })}>+ Add Box</button>
      </div>
    );
  }

  /* ── Stats Block ── */
  if (sec.type === 'stats') {
    const items = d.items || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updItem = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; setData({ items: a }); };
    return (
      <div style={editorWrap}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ ...lbl, display: 'block', marginBottom: 6 }}>Section Heading (optional)</label>
          <input style={inp} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Our Achievements" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 2fr auto', gap: 6, alignItems: 'center' }}>
              <input style={{ ...inp, textAlign: 'center' }} value={item.icon || ''} onChange={e => updItem(i, 'icon', e.target.value)} placeholder="👥" />
              <input style={inp} value={item.number || ''} onChange={e => updItem(i, 'number', e.target.value)} placeholder="500+" />
              <input style={inp} value={item.label || ''} onChange={e => updItem(i, 'label', e.target.value)} placeholder="Happy Guests" />
              <button type="button" className="btn btn-action-delete" onClick={() => setData({ items: items.filter((_,idx)=>idx!==i) })}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={() => setData({ items: [...items, { icon: '⭐', number: '0+', label: 'New Stat' }] })}>+ Add Stat</button>
      </div>
    );
  }

  /* ── Map Embed ── */
  if (sec.type === 'map') {
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Map Embed URL</label>
          <input style={inp} value={d.mapUrl || ''} onChange={e => update('mapUrl', e.target.value)} placeholder="Google Maps embed URL..." />
          <label style={lbl}>Height (px)</label>
          <input style={inp} type="number" min="200" max="800" value={d.height ?? 400} onChange={e => update('height', +e.target.value)} />
          <label style={lbl}>Border Radius</label>
          <input style={inp} type="number" min="0" max="30" value={d.borderRadius ?? 10} onChange={e => update('borderRadius', +e.target.value)} />
        </div>
      </div>
    );
  }

  /* ── Social Links ── */
  if (sec.type === 'social') {
    const items = d.items || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updItem = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; setData({ items: a }); };
    return (
      <div style={editorWrap}>
        <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 14px', alignItems: 'center' }}>
          <label style={lbl}>Heading</label>
          <input style={inp} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Follow Us" />
          <label style={lbl}>Alignment</label>
          <select style={sel} value={d.align || 'center'} onChange={e => update('align', e.target.value)}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6, alignItems: 'center' }}>
              <select style={sel} value={item.platform || 'instagram'} onChange={e => updItem(i, 'platform', e.target.value)}>
                <option value="instagram">Instagram</option><option value="facebook">Facebook</option>
                <option value="twitter">Twitter / X</option><option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option>
              </select>
              <input style={inp} value={item.url || ''} onChange={e => updItem(i, 'url', e.target.value)} placeholder="https://..." />
              <button type="button" className="btn btn-action-delete" onClick={() => setData({ items: items.filter((_,idx)=>idx!==i) })}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={() => setData({ items: [...items, { platform: 'instagram', url: '', label: 'Instagram' }] })}>+ Add Social Link</button>
      </div>
    );
  }

  /* ── Shortcode ── */
  if (sec.type === 'shortcode') {
    return (
      <div style={editorWrap}>
        <div style={grid2}>
          <label style={lbl}>Shortcode</label>
          <input style={{ ...inp, fontFamily: 'var(--font-roboto), Arial, sans-serif' }} value={d.code || ''} onChange={e => update('code', e.target.value)} placeholder="[contact-form]" />
        </div>
        <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', margin: '10px 0 0' }}>⚡ Shortcodes must be registered in the frontend renderer.</p>
      </div>
    );
  }

  /* ── Pricing Table ── */
  if (sec.type === 'pricing') {
    const items = d.items || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updItem = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; setData({ items: a }); };
    const updFeats = (i, v) => updItem(i, 'features', v.split('\n'));
    return (
      <div style={editorWrap}>
        <input style={{ ...inp, marginBottom: 12 }} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Pricing heading..." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${item.highlight ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                <input style={inp} value={item.name || ''} onChange={e => updItem(i, 'name', e.target.value)} placeholder="Plan name" />
                <input style={inp} value={item.price || ''} onChange={e => updItem(i, 'price', e.target.value)} placeholder="$99" />
                <input style={inp} value={item.period || ''} onChange={e => updItem(i, 'period', e.target.value)} placeholder="/night" />
              </div>
              <textarea style={{ ...inp, width: '100%', minHeight: 80, marginBottom: 8, fontSize: 12 }} value={(item.features || []).join('\n')} onChange={e => updFeats(i, e.target.value)} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input style={{ ...inp, flex: 1 }} value={item.btnLabel || 'Book Now'} onChange={e => updItem(i, 'btnLabel', e.target.value)} placeholder="Button label" />
                <input style={{ ...inp, flex: 1 }} value={item.btnUrl || '#'} onChange={e => updItem(i, 'btnUrl', e.target.value)} placeholder="URL" />
                <label style={{ display:'flex', gap:4, alignItems:'center', fontSize:11, color:'#aaa', whiteSpace:'nowrap' }}>
                  <input type="checkbox" checked={!!item.highlight} onChange={e => updItem(i, 'highlight', e.target.checked)} style={{ accentColor:'var(--gold)' }} /> Featured
                </label>
                <button type="button" className="btn btn-action-delete" onClick={() => setData({ items: items.filter((_,idx)=>idx!==i) })}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={() => setData({ items: [...items, { name: 'New Plan', price: '$0', period: '/mo', features: ['Feature 1'], btnLabel: 'Get Started', btnUrl: '#', highlight: false }] })}>+ Add Plan</button>
      </div>
    );
  }

  /* ── Team Members ── */
  if (sec.type === 'team') {
    const items = d.items || [];
    const setData = patch => onChange({ ...sec, data: { ...d, ...patch } });
    const updItem = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]: v }; setData({ items: a }); };
    return (
      <div style={editorWrap}>
        <input style={{ ...inp, marginBottom: 12 }} value={d.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Section heading..." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginBottom: 8 }}>
                <input style={inp} value={item.name || ''} onChange={e => updItem(i, 'name', e.target.value)} placeholder="Name" />
                <input style={inp} value={item.role || ''} onChange={e => updItem(i, 'role', e.target.value)} placeholder="Role / Title" />
                <button type="button" className="btn btn-action-delete" onClick={() => setData({ items: items.filter((_,idx)=>idx!==i) })}>✕</button>
              </div>
              <input style={{ ...inp, marginBottom: 6 }} value={item.photo || ''} onChange={e => updItem(i, 'photo', e.target.value)} placeholder="Photo URL" />
              <textarea style={{ ...inp, width: '100%', minHeight: 60, resize: 'vertical' }} value={item.bio || ''} onChange={e => updItem(i, 'bio', e.target.value)} placeholder="Short bio..." />
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-action-add" style={{ marginTop: 10, width: '100%' }} onClick={() => setData({ items: [...items, { name: 'New Member', role: 'Role', photo: '', bio: '' }] })}>+ Add Member</button>
      </div>
    );
  }

  /* ── Generic / predefined section types ── */
  return (
    <div style={editorWrap}>
      <div style={grid2}>
        <label style={lbl}>Custom Title</label>
        <input style={inp} value={sec.title || ''} onChange={e => onChange({ ...sec, title: e.target.value })} placeholder="Override section heading" />
      </div>
      <p style={{ fontSize: 12, color: '#a1a1aa', margin: '10px 0 0' }}>
        This is a built-in section block. Configure its content from the{' '}
        <a href="/admin/sections" style={{ color: 'var(--gold)' }}>Sections Manager</a>.
      </p>
    </div>
  );
}

function EditContentForm() {
  const q = useSearchParams();
  const router = useRouter();
  const type = q.get('type') === 'PAGE' ? 'PAGE' : 'POST';
  const id = q.get('id');

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    seoTitle: '',
    seoDescription: '',
    ogTitle: '',
    ogDescription: '',
    focusKeyword: '',
    canonicalUrl: '',
    ogImage: '',
    noIndex: false,
    status: 'DRAFT',
    publishedAt: '',
    parentPageId: '',
    sortOrder: 0,
    pageTemplate: 'default',
    categoryIds: [],
    tagIds: [],
    sections: []
  });

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [pages, setPages] = useState([]); // For parent page selection
  const [media, setMedia] = useState([]); // For Media Selector modal
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState('featuredImage'); // 'featuredImage' or 'ogImage'
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [catCollapsed, setCatCollapsed] = useState(false);
  const [tagCollapsed, setTagCollapsed] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [seoCollapsed, setSeoCollapsed] = useState(false);
  const [seoTab, setSeoTab] = useState('general');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(id));
  const [siteOrigin, setSiteOrigin] = useState('https://prevakitchen.com');
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  
  const richEditorRef = useRef(null);

  const fetchMetadata = async () => {
    try {
      const [catsRes, tagsRes, pagesRes, mediaRes] = await Promise.all([
        api('/admin/categories'),
        api('/admin/tags'),
        api('/admin/content?type=PAGE'),
        api('/admin/media')
      ]);

      if (catsRes.ok) setCategories(await catsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setPages(pagesData.filter(p => p.id !== id));
      }
      if (mediaRes.ok) setMedia(await mediaRes.json());
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') setSiteOrigin(window.location.origin);
    fetchMetadata();
    if (!id) return;
    
    setLoading(true);
    api(`/admin/content/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setMessage('Could not load content item.');
          setLoading(false);
          return;
        }
        const row = await res.json();
        setForm({
          title: row.title || '',
          slug: row.slug || '',
          excerpt: row.excerpt || '',
          content: row.content || '',
          featuredImage: row.featuredImage || '',
          seoTitle: row.seoTitle || '',
          seoDescription: row.seoDescription || '',
          ogTitle: row.ogTitle || '',
          ogDescription: row.ogDescription || '',
          focusKeyword: row.focusKeyword || '',
          canonicalUrl: row.canonicalUrl || '',
          ogImage: row.ogImage || '',
          noIndex: Boolean(row.noIndex),
          status: row.status || 'DRAFT',
          publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString().slice(0, 16) : '',
          parentPageId: row.parentPageId || '',
          sortOrder: row.sortOrder || 0,
          pageTemplate: row.pageTemplate || 'default',
          categoryIds: (row.categories || []).map(c => c.category?.id).filter(Boolean),
          tagIds: (row.tags || []).map(t => t.tag?.id).filter(Boolean),
          sections: row.sections || []
        });
        setLoading(false);
      })
      .catch(() => {
        setMessage('Could not load content item.');
        setLoading(false);
      });
  }, [id]);

  const handleChange = (event) => {
    const { name, value, type: fieldType, checked } = event.target;
    if (name === 'slug') setSlugManuallyEdited(true);
    setForm((prev) => ({
      ...prev,
      [name]: fieldType === 'checkbox' ? checked : value,
      ...(name === 'title' && !slugManuallyEdited && !id ? { slug: editorSlug(value) } : {})
    }));
  };

  const handleCheckboxChange = (catId, checked) => {
    setForm(prev => {
      const categoryIds = checked
        ? [...prev.categoryIds, catId]
        : prev.categoryIds.filter(id => id !== catId);
      return { ...prev, categoryIds };
    });
  };

  const handleTagToggle = (tagId, selected) => {
    setForm(prev => {
      const tagIds = selected
        ? [...prev.tagIds, tagId]
        : prev.tagIds.filter(id => id !== tagId);
      return { ...prev, tagIds };
    });
  };

  const openMediaSelector = (targetField) => { setMediaTarget(targetField); setMediaModalOpen(true); };
  const selectMediaItem = (url, alt = '') => {
    if (mediaTarget === 'content') {
      richEditorRef.current?.insertImage(url, alt);
    } else if (mediaTarget === 'featuredImage') {
      setForm(prev => ({
        ...prev,
        featuredImage: url,
        ogImage: url // Automatically set Social (OG) Image to match Featured Image
      }));
    } else {
      setForm(prev => ({ ...prev, [mediaTarget]: url }));
    }
    setMediaModalOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select an image file.');
    if (file.size > 3 * 1024 * 1024) return alert('File size must be under 3MB.');

    setUploadingMedia(true);
    try {
      const res = await api('/admin/media/upload', {
        method: 'POST',
        body: JSON.stringify({ files: [{ name: file.name, type: file.type, size: file.size, data: await fileToDataUrl(file) }] })
      });
      if (res.ok) {
        const uploaded = await res.json();
        const uploadedUrl = Array.isArray(uploaded) ? uploaded[0]?.url : uploaded?.url;
        if (uploadedUrl) {
          setMedia(prev => [Array.isArray(uploaded) ? uploaded[0] : uploaded, ...prev]);
          selectMediaItem(uploadedUrl);
        }
      } else {
        alert('Could not upload file.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  /* ── Section helpers ── */
  const addSection = (tpl) => {
    const newSec = { type: tpl.type, title: tpl.title, enabled: true, data: defaultDataFor(tpl.type) };
    setForm(prev => ({ ...prev, sections: [...(prev.sections || []), newSec] }));
    setShowSectionPicker(false);
  };
  const updateSection = (idx, newSec) => {
    setForm(prev => { const sections = [...(prev.sections || [])]; sections[idx] = newSec; return { ...prev, sections }; });
  };
  const toggleSectionEnabled = (idx) => {
    setForm(prev => { const sections = [...(prev.sections || [])]; sections[idx] = { ...sections[idx], enabled: sections[idx].enabled === false }; return { ...prev, sections }; });
  };
  const moveSectionUp = (idx) => {
    setForm(prev => { const sections = [...(prev.sections || [])]; if (idx === 0) return prev; [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]]; return { ...prev, sections }; });
  };
  const moveSectionDown = (idx) => {
    setForm(prev => { const sections = [...(prev.sections || [])]; if (idx === sections.length - 1) return prev; [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]]; return { ...prev, sections }; });
  };
  const removeSection = (idx) => {
    setForm(prev => ({ ...prev, sections: (prev.sections || []).filter((_, i) => i !== idx) }));
    setExpandedSections(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };
  const toggleExpanded = (idx) => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    const payload = { ...form, type };
    const url = id ? `/admin/content/${id}` : '/admin/content';
    const method = id ? 'PUT' : 'POST';
    
    try {
      const res = await api(url, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setMessage('Saved successfully. Redirecting…');
        setTimeout(() => router.push(`/admin/content?type=${type}`), 600);
      } else {
        const error = await res.json().catch(() => null);
        setMessage(error?.message || 'Could not save content.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Network error, failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async () => {
    setSaving(true);
    setMessage('Saving draft and preparing preview…');
    
    let targetId = id;
    const payload = { ...form, title: form.title || 'Untitled Draft', type };

    try {
      const url = targetId ? `/admin/content/${targetId}` : '/admin/content';
      const method = targetId ? 'PUT' : 'POST';
      const saveRes = await api(url, { method, body: JSON.stringify(payload) });

      if (saveRes.ok) {
        const savedItem = await saveRes.json();
        if (!targetId && savedItem?.id) {
          targetId = savedItem.id;
          router.replace(`/admin/content/edit?id=${savedItem.id}&type=${type}`);
        }

        const tokenRes = await api(`/admin/content/${targetId}/preview-token`, { method: 'POST' });
        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          const origin = (typeof window !== 'undefined' && window.location.origin)
            ? window.location.origin
            : (process.env.NEXT_PUBLIC_SITE_URL || 'https://prevakitchen.com');

          window.open(`${origin}/preview?token=${encodeURIComponent(token)}`, '_blank', 'noopener,noreferrer');
          setMessage('Preview opened in new tab!');
        } else {
          setMessage('Saved, but preview token could not be generated.');
        }
      } else {
        const err = await saveRes.json().catch(() => null);
        setMessage(err?.message || 'Failed to save before previewing.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setMessage('Error opening preview.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <PageHeader
        eyebrow={`${type === 'POST' ? 'Posts' : 'Pages'} / ${id ? 'Edit' : 'New'}`}
        title={id ? `Edit ${type === 'POST' ? 'post' : 'page'}` : `Create ${type === 'POST' ? 'post' : 'page'}`}
        description={id ? 'Refine content, publishing options and search appearance.' : 'Build and publish a new piece of content.'}
        icon={type === 'POST' ? BookOpen : FileText}
        actions={
          <button className="btn btn-secondary" type="button" onClick={openPreview} disabled={saving}>
            <Eye size={15} /> Preview Design
          </button>
        }
      />

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={6} /></div>
      ) : (
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '30px' }} className="editor-layout">
          {/* Main Content Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label>Title</label>
              <input className="input" name="title" value={form.title} onChange={handleChange} required placeholder="Enter title here" />
              
              <label>Slug (optional)</label>
              <input className="input" name="slug" value={form.slug} onChange={handleChange} placeholder="auto-generated-from-title" />
              
              {type === 'POST' && (
                <>
                  <label>Excerpt (Summary)</label>
                  <textarea className="input" name="excerpt" rows="2" value={form.excerpt} onChange={handleChange} placeholder="Brief summary of the story" />
                </>
              )}

              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Content Editor</label>
                <RichTextEditor
                  ref={richEditorRef}
                  value={form.content}
                  required
                  onChange={(content) => setForm(prev => ({ ...prev, content }))}
                  onOpenMedia={() => openMediaSelector('content')}
                />
                <p className="rich-editor-note">
                  Tip: select text and click the quote or link button. Quotes use the same premium gold style on the public blog.
                </p>
              </div>
            </div>

            {/* ── Elementor-style Visual Section Builder Panel ── */}
            {type === 'PAGE' && (
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>⚡ Page Section Builder</h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--ink-dim)' }}>Design, enable &amp; arrange visual section blocks (Elementor / Gutenberg style)</span>
                  </div>
                  <button type="button" className="btn btn-action-add" onClick={() => setShowSectionPicker(v => !v)}>
                    {showSectionPicker ? '× Close' : '+ Add Block'}
                  </button>
                </div>

                {/* Section Add Selector — Elementor-style block picker */}
                {showSectionPicker && (
                  <div style={{ background: 'rgba(15,15,30,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '18px', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '0.88rem', fontWeight: 600 }}>🧩 Choose a Block</h4>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>{SECTION_TEMPLATES.length} blocks available</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                      {SECTION_TEMPLATES.map(tpl => {
                        const tc = TYPE_COLORS[tpl.type] || '#888';
                        return (
                          <button
                            key={tpl.type}
                            type="button"
                            onClick={() => addSection(tpl)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 13px', textAlign: 'left', gap: 5, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.09)`, borderLeft: `3px solid ${tc}`, borderRadius: 9, cursor: 'pointer', transition: 'all 150ms', outline: 'none', width: '100%' }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${tc}14`; e.currentTarget.style.borderColor = tc; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderLeftColor = tc; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%' }}>
                              <span style={{ fontSize: 16, flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: `${tc}22` }}>{tpl.icon || '▪'}</span>
                              <strong style={{ color: '#e5e7eb', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.title}</strong>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.4, width: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{tpl.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Blocks List — Elementor-style block cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(form.sections || []).length > 0 ? (
                    form.sections.map((sec, sIdx) => {
                      const meta = SECTION_TEMPLATES.find(t => t.type === sec.type) || { title: sec.title || sec.type, icon: '▪', desc: 'Custom Block' };
                      const isExpanded = !!expandedSections[sIdx];
                      const isEnabled = sec.enabled !== false;
                      const tc = TYPE_COLORS[sec.type] || '#888';
                      return (
                        <div
                          key={sIdx}
                          style={{
                            background: isEnabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderLeft: `3px solid ${isEnabled ? tc : 'rgba(255,255,255,0.15)'}`,
                            borderRadius: '10px',
                            overflow: 'hidden',
                            opacity: isEnabled ? 1 : 0.55,
                            transition: 'opacity 200ms, border-color 200ms'
                          }}
                        >
                          {/* Block Header Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: 8 }}>
                            {/* Left: drag handle + index + icon + name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <span style={{ color: '#555', fontSize: 14, cursor: 'grab', flexShrink: 0, letterSpacing: '-1px' }}>⠿</span>
                              <span style={{ fontSize: '0.8rem', color: tc, background: `${tc}22`, width: 26, height: 26, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                                {sIdx + 1}
                              </span>
                              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{meta.icon || '▪'}</span>
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ color: '#e5e7eb', fontSize: '0.88rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.title || meta.title}</strong>
                                <code style={{ color: tc, fontSize: '0.69rem', opacity: 0.85 }}>{sec.type}</code>
                              </div>
                            </div>
                            {/* Right: toggle + move + edit + delete */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                              {/* Edit / Close button */}
                              <button type="button" onClick={() => toggleExpanded(sIdx)}
                                style={{ fontSize: 11, padding: '4px 11px', background: isExpanded ? `${tc}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${isExpanded ? tc : 'rgba(255,255,255,0.12)'}`, borderRadius: 6, color: isExpanded ? tc : '#aaa', cursor: 'pointer', fontWeight: 600, transition: 'all 150ms' }}>
                                {isExpanded ? '▲ Close' : '⚙ Edit'}
                              </button>
                              {/* CSS Toggle Switch */}
                              <label title={isEnabled ? 'Disable block' : 'Enable block'}
                                style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                                onClick={(e) => { e.preventDefault(); toggleSectionEnabled(sIdx); }}>
                                <div style={{ width: 38, height: 21, borderRadius: 11, background: isEnabled ? 'var(--gold)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 220ms', flexShrink: 0 }}>
                                  <div style={{ position: 'absolute', top: 3, left: isEnabled ? 18 : 3, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'left 220ms', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
                                </div>
                              </label>
                              <button type="button" className="btn btn-action-arrow" disabled={sIdx === 0} onClick={() => moveSectionUp(sIdx)} style={{ padding: '4px 8px', fontSize: 12 }}>▲</button>
                              <button type="button" className="btn btn-action-arrow" disabled={sIdx === (form.sections || []).length - 1} onClick={() => moveSectionDown(sIdx)} style={{ padding: '4px 8px', fontSize: 12 }}>▼</button>
                              <button type="button" className="btn btn-action-delete" onClick={() => removeSection(sIdx)} style={{ padding: '4px 8px' }}>✕</button>
                            </div>
                          </div>
                          {/* Expanded Elementor-style Settings Panel */}
                          {isExpanded && (
                            <div style={{ borderTop: `1px solid ${tc}33`, background: 'rgba(0,0,0,0.25)' }}>
                              {/* Colored tab-bar top accent */}
                              <div style={{ height: 2, background: `linear-gradient(90deg, ${tc}, transparent)` }} />
                              <div style={{ padding: '14px 16px 16px' }}>
                                <SectionEditor sec={sec} onChange={(newSec) => updateSection(sIdx, newSec)} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ border: '2px dashed rgba(255,255,255,0.07)', padding: '40px 20px', textAlign: 'center', color: '#6b7280', borderRadius: '12px', fontSize: '0.88rem' }}>
                      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>🧩</div>
                      <div style={{ fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>No blocks added yet</div>
                      Click <strong style={{ color: 'var(--gold)' }}>+ Add Block</strong> to insert Container, Grid, Form,<br />Custom HTML or predefined page sections.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Settings Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* ── Rank Math SEO Suite Sidebar Box ── */}
            <div className="panel" style={{ 
              padding: 0, 
              overflow: 'hidden', 
              border: '1px solid rgba(197, 160, 89, 0.35)', 
              borderRadius: '10px',
              background: 'linear-gradient(180deg, rgba(26,24,20,0.85) 0%, rgba(18,17,15,0.95) 100%)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)' 
            }}>
              {/* Header with Live Score Pill & Collapse Toggle */}
              <div 
                onClick={() => setSeoCollapsed(v => !v)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '13px 15px', 
                  cursor: 'pointer', 
                  background: 'linear-gradient(135deg, rgba(197,160,89,0.18) 0%, rgba(30,26,18,0.6) 100%)', 
                  borderBottom: seoCollapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'rgba(197,160,89,0.2)', border: '1px solid rgba(197,160,89,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                    🚀
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      Rank Math SEO
                      <span style={{ fontSize: '0.62rem', background: 'linear-gradient(135deg, #dfc07e, #c6a15b)', color: '#0e0c0a', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>PRO</span>
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Real-time Rank Math Score Pill */}
                  {(() => {
                    const kw = (form.focusKeyword || '').trim().toLowerCase();
                    const title = (form.seoTitle || form.title || '').trim();
                    const desc = (form.seoDescription || form.excerpt || '').trim();
                    const slug = (form.slug || '').trim().toLowerCase();
                    const rawContent = String(form.content || '');
                    const cleanContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    const wordCount = cleanContent ? cleanContent.split(/\s+/).length : 0;

                    let score = 0;
                    if (kw) {
                      score += 10;
                      if (title.toLowerCase().includes(kw)) score += 15;
                      if (title.toLowerCase().startsWith(kw)) score += 5;
                      if (desc.toLowerCase().includes(kw)) score += 15;
                      if (slug.includes(kw.replace(/\s+/g, '-'))) score += 10;
                      if (cleanContent.slice(0, 500).toLowerCase().includes(kw)) score += 10;
                      if ((rawContent.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || []).some(h => h.toLowerCase().includes(kw))) score += 10;
                      if ((rawContent.match(/<img[^>]+alt=["']([^"']*)["'][^>]*>/gi) || []).some(img => img.toLowerCase().includes(kw))) score += 5;
                    }
                    if (title.length >= 35 && title.length <= 60) score += 5;
                    if (desc.length >= 100 && desc.length <= 160) score += 5;
                    if (wordCount >= 300) score += 5;
                    if (wordCount >= 600) score += 5;

                    const scoreColor = score >= 80 ? '#4caf50' : score >= 50 ? '#ffa726' : '#ef5350';
                    const scoreBg = score >= 80 ? 'rgba(76,175,80,0.18)' : score >= 50 ? 'rgba(255,167,38,0.18)' : 'rgba(239,83,80,0.18)';

                    return (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: scoreBg,
                        border: `1px solid ${scoreColor}55`,
                        color: scoreColor,
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        <span>{score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🔴'}</span>
                        <span>{score}/100</span>
                      </div>
                    );
                  })()}
                  <span style={{ color: 'var(--ink-dim)', fontSize: 13, transition: 'transform 200ms', display: 'inline-block', transform: seoCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
                </div>
              </div>

              {!seoCollapsed && (
                <div style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {/* 1-Click Smart Auto-Fill Rank Math Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const siteName = 'Preva Kitchen';
                      const rawTitle = (form.title || 'Page').trim();
                      
                      // 1. Intelligent SEO Title (aim for ~50-58 chars)
                      let bestTitle = rawTitle;
                      if (!rawTitle.toLowerCase().includes('preva')) {
                        if (rawTitle.length + 3 + siteName.length <= 58) {
                          bestTitle = `${rawTitle} | ${siteName}`;
                        } else {
                          bestTitle = rawTitle.slice(0, 56).trim();
                        }
                      } else if (rawTitle.length > 58) {
                        bestTitle = rawTitle.slice(0, 56).trim();
                      }

                      // 2. Intelligent Meta Description (aim for 120-155 chars)
                      const rawContent = String(form.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                      let baseDesc = (form.excerpt || rawContent || '').trim();
                      if (baseDesc.length > 150) {
                        baseDesc = baseDesc.slice(0, 147).trim() + '...';
                      } else if (baseDesc.length < 100) {
                        const addon = ` Enjoy fresh chef-made cuisine, dine-in & takeout at Preva Kitchen in Redford MI.`;
                        baseDesc = (baseDesc + addon).slice(0, 150).trim();
                      }

                      // 3. Intelligent Focus Keyword
                      let bestKw = rawTitle.split(/[:\-|–]/)[0].trim();
                      if (bestKw.length > 30) bestKw = bestKw.slice(0, 30).trim();

                      const effectiveFeaturedImg = form.featuredImage || '';

                      setForm(prev => ({
                        ...prev,
                        seoTitle: bestTitle,
                        seoDescription: baseDesc,
                        focusKeyword: bestKw,
                        ogTitle: bestTitle,
                        ogDescription: baseDesc,
                        ogImage: effectiveFeaturedImg || prev.ogImage || prev.featuredImage || ''
                      }));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, rgba(197,160,89,0.25) 0%, rgba(197,160,89,0.08) 100%)',
                      border: '1px solid rgba(197,160,89,0.5)',
                      color: 'var(--gold)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      transition: 'all 150ms ease'
                    }}
                  >
                    ✨ Auto-Fill SEO (Optimal 100% Score)
                  </button>

                  {/* SEO Sub-Tabs (General / Social / Advanced) */}
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { id: 'general', label: '🔍 General' },
                      { id: 'social', label: '📱 Social' },
                      { id: 'advanced', label: '⚙️ Advanced' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSeoTab(tab.id)}
                        style={{
                          flex: 1,
                          padding: '5px 2px',
                          border: 'none',
                          borderRadius: '4px',
                          background: seoTab === tab.id ? 'linear-gradient(135deg, #dfc07e, #c6a15b)' : 'transparent',
                          color: seoTab === tab.id ? '#0e0c0a' : '#aaa',
                          fontWeight: 700,
                          fontSize: '0.73rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 120ms ease'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* General Tab Content */}
                  {seoTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      {/* Focus Keyword Input & Live Density Badge */}
                      <div>
                        {(() => {
                          const kw = (form.focusKeyword || '').trim().toLowerCase();
                          const rawContent = String(form.content || '');
                          const cleanContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                          const wordCount = cleanContent ? cleanContent.split(/\s+/).length : 0;
                          const kwCount = kw ? (cleanContent.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0;
                          const kwDensity = wordCount > 0 && kwCount > 0 ? ((kwCount * kw.split(/\s+/).length / wordCount) * 100).toFixed(1) : '0.0';

                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gold)', margin: 0 }}>
                                  🎯 Target Focus Keyword
                                </label>
                                {kw && (
                                  <span style={{ fontSize: '0.68rem', color: '#9aa0a6', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                                    Density: <b style={{ color: Number(kwDensity) >= 1 && Number(kwDensity) <= 2.5 ? '#81c784' : '#ffa726' }}>{kwDensity}%</b> ({kwCount}x)
                                  </span>
                                )}
                              </div>
                              <input
                                className="input"
                                name="focusKeyword"
                                value={form.focusKeyword || ''}
                                onChange={handleChange}
                                placeholder="e.g. Rice & Peas"
                                style={{ margin: 0, fontSize: '0.82rem', padding: '7px 10px', background: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.12)' }}
                              />
                            </>
                          );
                        })()}
                      </div>

                      {/* Google Search Result Preview Card */}
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#aaa', marginBottom: '4px', display: 'block' }}>
                          Google Search Result Preview
                        </label>
                        <div style={{ background: '#1c1b18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'var(--font-roboto), Arial, sans-serif' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#c5a059', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '9px', fontWeight: 'bold' }}>P</span>
                            <div style={{ fontSize: '0.68rem', color: '#9aa0a6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {siteOrigin.replace(/^https?:\/\//, '')} › {type === 'POST' ? 'blog › ' : ''}{form.slug || 'slug'}
                            </div>
                          </div>
                          <div style={{ color: '#8ab4f8', fontSize: '0.88rem', fontWeight: 500, margin: '2px 0 3px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {form.seoTitle || form.title || 'Untitled | Preva Kitchen'}
                          </div>
                          <div style={{ color: '#bdc1c6', fontSize: '0.74rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {form.seoDescription || form.excerpt || 'Custom search engine summary snippet...'}
                          </div>
                        </div>
                      </div>

                      {/* SEO Title with Visual Length Meter */}
                      <div>
                        {(() => {
                          const titleLen = (form.seoTitle || '').length;
                          const isOptimal = titleLen >= 35 && titleLen <= 60;
                          const isTooLong = titleLen > 60;
                          const color = isOptimal ? '#4caf50' : isTooLong ? '#ef5350' : titleLen > 0 ? '#ffa726' : '#888';
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', margin: 0 }}>SEO Title</label>
                                <span style={{ fontSize: '0.7rem', color: color, fontWeight: 700 }}>
                                  {titleLen} / 60 chars {isTooLong ? '(Too Long)' : isOptimal ? '(Optimal)' : ''}
                                </span>
                              </div>
                              <input
                                className="input"
                                name="seoTitle"
                                value={form.seoTitle || ''}
                                onChange={handleChange}
                                placeholder={`${form.title || 'Title'} | Preva Kitchen`}
                                style={{ margin: 0, fontSize: '0.82rem', padding: '6px 10px', background: 'rgba(0,0,0,0.35)', borderColor: isTooLong ? '#ef535066' : isOptimal ? '#4caf5066' : 'rgba(255,255,255,0.12)' }}
                              />
                              {/* Progress bar */}
                              <div style={{ height: '3px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.min(100, (titleLen / 60) * 100)}%`,
                                  background: color,
                                  transition: 'width 200ms ease, background 200ms ease'
                                }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Rank Math Snippet Variable Chips */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--gold)', fontWeight: 600 }}>Insert:</span>
                        {[
                          { label: '%title%', val: form.title || 'Title' },
                          { label: '%sep%', val: '|' },
                          { label: '%sitename%', val: 'Preva Kitchen' },
                          { label: '%keyword%', val: form.focusKeyword || '' }
                        ].map((v) => (
                          <button
                            key={v.label}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({
                                ...prev,
                                seoTitle: prev.seoTitle ? `${prev.seoTitle} ${v.val}` : v.val
                              }));
                            }}
                            style={{
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff',
                              fontSize: '0.67rem',
                              cursor: 'pointer'
                            }}
                            title={`Insert ${v.val} into SEO Title`}
                          >
                            + {v.label}
                          </button>
                        ))}
                      </div>

                      {/* Meta Description with Visual Length Meter */}
                      <div>
                        {(() => {
                          const descLen = (form.seoDescription || '').length;
                          const isOptimal = descLen >= 100 && descLen <= 160;
                          const isTooLong = descLen > 160;
                          const color = isOptimal ? '#4caf50' : isTooLong ? '#ef5350' : descLen > 0 ? '#ffa726' : '#888';
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', margin: 0 }}>Meta Description</label>
                                <span style={{ fontSize: '0.7rem', color: color, fontWeight: 700 }}>
                                  {descLen} / 160 chars {isTooLong ? '(Too Long)' : isOptimal ? '(Optimal)' : ''}
                                </span>
                              </div>
                              <textarea
                                className="input"
                                name="seoDescription"
                                rows={2}
                                value={form.seoDescription || ''}
                                onChange={handleChange}
                                placeholder="Meta description for search engines..."
                                style={{ margin: 0, resize: 'vertical', minHeight: '52px', fontSize: '0.8rem', padding: '6px 10px', background: 'rgba(0,0,0,0.35)', borderColor: isTooLong ? '#ef535066' : isOptimal ? '#4caf5066' : 'rgba(255,255,255,0.12)' }}
                              />
                              {/* Progress bar */}
                              <div style={{ height: '3px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.min(100, (descLen / 160) * 100)}%`,
                                  background: color,
                                  transition: 'width 200ms ease, background 200ms ease'
                                }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Comprehensive Rank Math 12-Item Content Analysis Checklist */}
                      {(() => {
                        const kw = (form.focusKeyword || '').trim().toLowerCase();
                        const title = (form.seoTitle || form.title || '').trim();
                        const desc = (form.seoDescription || form.excerpt || '').trim();
                        const slug = (form.slug || '').trim().toLowerCase();
                        const rawContent = String(form.content || '');
                        const cleanContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        const wordCount = cleanContent ? cleanContent.split(/\s+/).length : 0;

                        const checks = [
                          { label: 'Keyword in SEO Title', pass: kw && title.toLowerCase().includes(kw) },
                          { label: 'Keyword in Meta Description', pass: kw && desc.toLowerCase().includes(kw) },
                          { label: 'Keyword in URL Slug', pass: kw && slug.includes(kw.replace(/\s+/g, '-')) },
                          { label: 'Keyword in First Paragraph', pass: kw && cleanContent.slice(0, 400).toLowerCase().includes(kw) },
                          { label: 'Keyword in Subheading (H2/H3)', pass: kw && (rawContent.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || []).some(h => h.toLowerCase().includes(kw)) },
                          { label: 'Keyword in Image Alt Text', pass: kw && (rawContent.match(/<img[^>]+alt=["']([^"']*)["'][^>]*>/gi) || []).some(img => img.toLowerCase().includes(kw)) },
                          { label: `Content Length (${wordCount} words, min 600)`, pass: wordCount >= 600 },
                          { label: 'Internal Links Present', pass: /<a[^>]+href=["'](\/|https?:\/\/(www\.)?prevakitchen\.com)[^"']*["']/i.test(rawContent) },
                          { label: 'External Authoritative Links', pass: /<a[^>]+href=["']https?:\/\/(?!(www\.)?prevakitchen\.com)[^"']+["']/i.test(rawContent) },
                          { label: 'SEO Title Length (35-60 chars)', pass: title.length >= 35 && title.length <= 60 },
                          { label: 'Meta Description Length (100-160 chars)', pass: desc.length >= 100 && desc.length <= 160 }
                        ];

                        const passedCount = checks.filter(c => c.pass).length;

                        return (
                          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '10px 12px', fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gold)' }}>📋 Content SEO Analyzer:</span>
                              <span style={{ fontSize: '0.68rem', color: passedCount >= 8 ? '#81c784' : '#ffa726', fontWeight: 700 }}>
                                {passedCount}/{checks.length} Passed
                              </span>
                            </div>
                            {checks.map((item, idx) => (
                              <div key={idx} style={{ color: item.pass ? '#81c784' : '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{item.pass ? '✓' : '○'}</span>
                                {item.label}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Social Tab Content */}
                  {seoTab === 'social' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', marginBottom: '3px', display: 'block' }}>Social Share Title</label>
                        <input className="input" name="ogTitle" value={form.ogTitle || ''} onChange={handleChange} placeholder={form.seoTitle || form.title || 'Page Title'} style={{ margin: 0, fontSize: '0.82rem', padding: '6px 10px', background: 'rgba(0,0,0,0.35)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', marginBottom: '3px', display: 'block' }}>Social Description</label>
                        <textarea className="input" name="ogDescription" rows={2} value={form.ogDescription || ''} onChange={handleChange} placeholder={form.seoDescription || form.excerpt || 'Social share description'} style={{ margin: 0, fontSize: '0.8rem', padding: '6px 10px', background: 'rgba(0,0,0,0.35)' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', margin: 0 }}>Social (OG) Image</label>
                          <span style={{ fontSize: '0.68rem', color: form.ogImage || form.featuredImage ? '#81c784' : '#888' }}>
                            {form.ogImage && form.ogImage !== form.featuredImage ? 'Custom' : 'Featured Image'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            className="input"
                            name="ogImage"
                            value={form.ogImage || form.featuredImage || ''}
                            onChange={handleChange}
                            placeholder="Same as Featured Image"
                            style={{ margin: 0, flex: 1, fontSize: '0.78rem', padding: '6px 8px', background: 'rgba(0,0,0,0.35)' }}
                          />
                          <button type="button" className="btn" onClick={() => openMediaSelector('ogImage')} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Select</button>
                        </div>
                        {(form.ogImage || form.featuredImage) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', background: 'rgba(0,0,0,0.25)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <img
                              src={form.ogImage || form.featuredImage}
                              alt="Social preview"
                              style={{ width: '36px', height: '24px', objectFit: 'cover', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {form.ogImage && form.ogImage !== form.featuredImage ? 'Custom OG image selected' : '✓ Synced with Featured Image'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Tab Content */}
                  {seoTab === 'advanced' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', marginBottom: '3px', display: 'block' }}>Canonical URL</label>
                        <input className="input" name="canonicalUrl" value={form.canonicalUrl || ''} onChange={handleChange} placeholder={`${siteOrigin}${type === 'POST' ? '/blog' : ''}/${form.slug || 'page-slug'}`} style={{ margin: 0, fontSize: '0.8rem', padding: '6px 10px', background: 'rgba(0,0,0,0.35)' }} />
                        <span style={{ fontSize: '0.7rem', color: '#888', marginTop: '3px', display: 'block' }}>Leave empty for default canonical.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input type="checkbox" id="noIndexCheck" name="noIndex" checked={!!form.noIndex} onChange={handleChange} style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }} />
                        <label htmlFor="noIndexCheck" style={{ margin: 0, cursor: 'pointer', color: '#fff', fontSize: '0.82rem' }}>
                          Exclude page from Google (<code style={{ color: '#ff8ca0' }}>noindex</code>)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Categories & Tags (Only for POST) */}
            {type === 'POST' && (
              <>
                {/* Categories Box */}
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    onClick={() => setCatCollapsed(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', cursor: 'pointer',
                      borderBottom: catCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink)', fontWeight: 600 }}>Categories</h3>
                    <span style={{ color: 'var(--ink-dim)', fontSize: 13, transition: 'transform 200ms', display: 'inline-block', transform: catCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
                  </div>
                  {!catCollapsed && (
                    <div style={{ padding: '14px 18px' }}>
                      <div style={{ marginBottom: 10 }}>
                        <input
                          className="input"
                          style={{ margin: 0, minHeight: 34, fontSize: 12 }}
                          placeholder="Search categories…"
                          value={catSearch}
                          onChange={e => setCatSearch(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                        {categories.length > 0 ? (
                          categories
                            .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                            .map(cat => (
                              <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: 'var(--ink-muted)', userSelect: 'none' }}>
                                <input
                                  type="checkbox"
                                  style={{ width: 15, height: 15, accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
                                  checked={form.categoryIds.includes(cat.id)}
                                  onChange={e => handleCheckboxChange(cat.id, e.target.checked)}
                                />
                                <span style={{ color: form.categoryIds.includes(cat.id) ? 'var(--gold)' : 'var(--ink-muted)' }}>{cat.name}</span>
                              </label>
                            ))
                        ) : (
                          <span style={{ color: 'var(--ink-dim)', fontSize: 12 }}>No categories yet. Add some from Categories page.</span>
                        )}
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <a href="/admin/categories" target="_blank" rel="noopener" style={{ color: 'var(--gold)', fontSize: 12, textDecoration: 'none' }}>+ Add New Category</a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags Box */}
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    onClick={() => setTagCollapsed(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', cursor: 'pointer',
                      borderBottom: tagCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink)', fontWeight: 600 }}>Tags</h3>
                    <span style={{ color: 'var(--ink-dim)', fontSize: 13, transition: 'transform 200ms', display: 'inline-block', transform: tagCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
                  </div>
                  {!tagCollapsed && (
                    <div style={{ padding: '14px 18px' }}>
                      {/* selected tag chips */}
                      {form.tagIds.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {tags.filter(t => form.tagIds.includes(t.id)).map(t => (
                            <span key={t.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '3px 10px 3px 12px',
                              background: 'var(--gold-dim)',
                              border: '1px solid var(--border-gold)',
                              borderRadius: 20,
                              color: 'var(--gold)',
                              fontSize: 12,
                              fontWeight: 500
                            }}>
                              {t.name}
                              <button
                                type="button"
                                onClick={() => handleTagToggle(t.id, false)}
                                style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: '0 2px', lineHeight: 1, fontSize: 14 }}
                              >×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* unselected tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                        {tags.filter(t => !form.tagIds.includes(t.id)).map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleTagToggle(t.id, true)}
                            style={{
                              background: 'var(--bg-surface-2)',
                              color: 'var(--ink-muted)',
                              border: '1px solid var(--border)',
                              borderRadius: 20,
                              padding: '4px 11px',
                              fontSize: 12,
                              cursor: 'pointer',
                              transition: 'all 140ms ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink-muted)'; }}
                          >
                            + {t.name}
                          </button>
                        ))}
                        {tags.length === 0 && <span style={{ color: 'var(--ink-dim)', fontSize: 12 }}>No tags yet.</span>}
                      </div>
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          style={{ margin: 0, minHeight: 34, fontSize: 12, flex: 1 }}
                          placeholder="Add new tag…"
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const name = newTagInput.trim();
                              if (!name) return;
                              const fakeId = 'new-' + Date.now();
                              setTags(prev => [...prev, { id: fakeId, name }]);
                              setForm(prev => ({ ...prev, tagIds: [...prev.tagIds, fakeId] }));
                              setNewTagInput('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ minHeight: 34, padding: '0 14px', fontSize: 12, flexShrink: 0 }}
                          onClick={() => {
                            const name = newTagInput.trim();
                            if (!name) return;
                            const fakeId = 'new-' + Date.now();
                            setTags(prev => [...prev, { id: fakeId, name }]);
                            setForm(prev => ({ ...prev, tagIds: [...prev.tagIds, fakeId] }));
                            setNewTagInput('');
                          }}
                        >Add</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Publish Actions panel */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff', fontSize: '1.1rem' }}>Publish</h3>
              
              <label>Status</label>
              <select className="input" name="status" value={form.status} onChange={handleChange}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>

              {form.status === 'SCHEDULED' && <><label>Publish date & time</label><input className="input" type="datetime-local" name="publishedAt" value={form.publishedAt} onChange={handleChange} required /></>}

              <button className="btn" type="submit" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Saving...' : 'Save Content'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={openPreview} disabled={saving} style={{ width: '100%' }}>
                <Eye size={14} /> Preview Draft Design
              </button>
              {message && <p style={{ marginTop: '10px', fontSize: '0.85rem', color: message.includes('success') ? '#81c784' : '#ff7a7a' }}>{message}</p>}
            </div>

            {/* Featured Image Panel */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff', fontSize: '1.1rem' }}>Featured Image</h3>
              {form.featuredImage ? (
                <div style={{ position: 'relative', aspectRatio: '1.5', background: '#000', borderRadius: '4px', overflow: 'hidden' }}>
                  <img src={form.featuredImage} alt="Featured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button" 
                    onClick={() => setForm(prev => ({ ...prev, featuredImage: '' }))}
                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ border: '2px dashed rgba(255,255,255,0.1)', padding: '20px', borderRadius: '4px', textAlign: 'center', color: '#90a4ae', fontSize: '0.85rem' }}>
                  No featured image set
                </div>
              )}
              <button 
                type="button" 
                className="btn" 
                onClick={() => openMediaSelector('featuredImage')} 
                style={{ 
                  background: 'linear-gradient(135deg, #c9a84c 0%, #a68432 100%)', 
                  color: '#000', 
                  fontWeight: '600', 
                  border: 'none', 
                  width: 'fit-content', 
                  alignSelf: 'center', 
                  padding: '8px 24px',
                  boxShadow: '0 2px 8px rgba(201, 168, 76, 0.3)'
                }}
              >
                Select Image
              </button>
            </div>

            {/* Page Specific Settings (Parent Page, Order, Template) */}
            {type === 'PAGE' && (
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: '0 0 10px', color: '#fff', fontSize: '1.1rem' }}>Page Attributes</h3>
                
                <label>Parent Page</label>
                <select className="input" name="parentPageId" value={form.parentPageId} onChange={handleChange}>
                  <option value="">(no parent)</option>
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>

                <label>Page Template</label>
                <select className="input" name="pageTemplate" value={form.pageTemplate} onChange={handleChange}>
                  <option value="default">Default Template</option>
                  <option value="fullwidth">Full Width Template</option>
                  <option value="landing">Landing Page Template</option>
                </select>

                <label>Sort Order</label>
                <input className="input" type="number" name="sortOrder" value={form.sortOrder} onChange={handleChange} />
              </div>
            )}
          </div>
        </form>
      )}

      {/* Media Selector Overlay Modal */}
      {mediaModalOpen && (
        <div className="modal-overlay" onClick={() => setMediaModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', height: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>🖼 Media Library</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#888' }}>Select an existing image or upload a new one from your computer</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn" style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #a68432 100%)', color: '#000', fontWeight: 'bold', cursor: 'pointer', margin: 0, padding: '7px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {uploadingMedia ? 'Uploading...' : '📁 Upload from Desktop'}
                  <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploadingMedia} style={{ display: 'none' }} />
                </label>
                <button onClick={() => setMediaModalOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', borderRadius: '6px', width: '32px', height: '32px' }}>✕</button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', paddingRight: '4px' }}>
              {media.length > 0 ? (
                media.map(item => (
                  <div 
                    key={item.id || item.url} 
                    className="media-card" 
                    onClick={() => selectMediaItem(item.url, item.altText || item.title || '')}
                    style={{ cursor: 'pointer', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}
                  >
                    <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ fontSize: '1rem', color: '#aaa', marginBottom: '12px' }}>No media files uploaded yet.</p>
                  <label className="btn" style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #a68432 100%)', color: '#000', fontWeight: 'bold', cursor: 'pointer', padding: '8px 20px' }}>
                    📁 Upload First Image from Desktop
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploadingMedia} style={{ display: 'none' }} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export default function EditContent() {
  return (
    <Suspense fallback={<p style={{ color: '#aaa', padding: '20px' }}>Loading editor...</p>}>
      <EditContentForm />
    </Suspense>
  );
}
