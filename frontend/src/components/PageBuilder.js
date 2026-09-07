"use client";

import React, { useState } from 'react';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import CulinarySection from './sections/CulinarySection';
import ReservationsSection from './sections/ReservationsSection';
import GallerySection from './sections/GallerySection';
import GoogleReviewsSection from './sections/GoogleReviewsSection';
import NewsletterSection from './sections/NewsletterSection';
import SvgIcon from './SvgIcon';
import { showSuccess } from '../lib/swal';
import { rewriteLegacyBlogLinks } from '../lib/blog-links';

export default function PageBuilder({ sections = [], fallbackContent = '' }) {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    if (!fallbackContent) return null;
    return (
      <div className="container blog-content-layout no-sidebar" style={{ paddingBlock: '60px' }}>
        <div className="blog-main-content" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <article className="post-content-inner">
            <div className="luxury-divider" style={{ width: '60px', height: '2px', background: '#c5a059', margin: '20px auto 40px' }}></div>
            <div className="post-main-content" style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: rewriteLegacyBlogLinks(fallbackContent) }} />
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="page-builder-render">
      {sections.map((sec, index) => {
        if (sec.enabled === false) return null;
        return <RenderBlock key={sec.id || sec.key || index} sec={sec} index={index} />;
      })}
    </div>
  );
}

function RenderBlock({ sec, index }) {
  const type = sec.type;
  const d = sec.data || {};

  // Predefined Restaurant Sections
  if (type === 'hero') return <HeroSection visible={true} headline={d.headline} subhead={d.subhead} supporting={d.supportingText} slides={d.slides} />;
  if (type === 'about') return <AboutSection visible={true} eyebrow={d.eyebrow} title={d.title} description={d.description} image={d.image} />;
  if (type === 'dining' || type === 'culinary') return <CulinarySection visible={true} />;
  if (type === 'kitchen') return null; // Homepage only — uses GSAP pin, not suitable for dynamic pages
  // Legacy nightlife blocks are intentionally hidden: this site is now Preva Kitchen only.
  if (type === 'nightlife') return null;
  if (type === 'reservations') return <ReservationsSection visible={true} />;
  if (type === 'gallery') {
    if (d.images && Array.isArray(d.images)) return <GalleryBlock data={d} />;
    return <GallerySection visible={true} />;
  }
  if (type === 'testimonials') return <GoogleReviewsSection visible={true} />;
  if (type === 'newsletter') return <NewsletterSection />;

  // General Layout & Content Blocks
  switch (type) {
    case 'container':
      return <ContainerBlock data={d} />;
    case 'text':
      return <TextBlock data={d} />;
    case 'image':
      return <ImageBlock data={d} />;
    case 'gallery_text':
      return <GalleryTextBlock data={d} />;
    case 'video':
      return <VideoBlock data={d} />;
    case 'columns':
      return <ColumnsBlock data={d} />;
    case 'divider':
      return <DividerBlock data={d} />;
    case 'banner':
      return <BannerBlock data={d} />;
    case 'cta':
      return <CTABlock data={d} />;
    case 'button':
      return <ButtonBlock data={d} />;
    case 'accordion':
      return <AccordionBlock data={d} />;
    case 'tabs':
      return <TabsBlock data={d} />;
    case 'icon_boxes':
      return <IconBoxesBlock data={d} />;
    case 'stats':
      return <StatsBlock data={d} />;
    case 'map':
      return <MapBlock data={d} />;
    case 'social':
      return <SocialBlock data={d} />;
    case 'shortcode':
      return <ShortcodeBlock data={d} />;
    case 'pricing':
      return <PricingBlock data={d} />;
    case 'team':
      return <TeamBlock data={d} />;
    case 'custom_html':
      return <CustomHtmlBlock data={d} title={sec.title} />;
    case 'grid':
      return <GridBlock data={d} />;
    case 'form':
      return <FormBlock data={d} />;
    default:
      return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   Block Renderers
───────────────────────────────────────────────────────────── */

function ContainerBlock({ data }) {
  const bgType = data.bgType || 'dark';
  const bgColor = data.bgColor || '#0a0a0a';
  const bgImage = data.bgImage || '';
  const padding = data.padding === 'large' ? '100px 20px' : data.padding === 'small' ? '40px 20px' : '70px 20px';

  let bgStyle = { backgroundColor: bgColor };
  if (bgType === 'dark') bgStyle = { backgroundColor: '#0c0a09' };
  if (bgType === 'gold') bgStyle = { background: 'linear-gradient(135deg, #1c1917 0%, #2a2215 100%)', borderTop: '1px solid rgba(197,160,89,0.3)', borderBottom: '1px solid rgba(197,160,89,0.3)' };
  if (bgType === 'image' && bgImage) bgStyle = { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };

  return (
    <section style={{ padding, ...bgStyle, position: 'relative' }}>
      <div style={{ maxWidth: data.layout === 'full' ? '100%' : '1200px', margin: '0 auto', padding: '0 15px' }}>
        {data.html && <div dangerouslySetInnerHTML={{ __html: data.html }} />}
      </div>
    </section>
  );
}

function TextBlock({ data }) {
  const Tag = data.headingTag || 'h2';
  const align = data.headingAlign || 'center';
  const contentAlign = data.contentAlign || 'center';
  const content = data.content || data.html || '';

  return (
    <section style={{ padding: '60px 20px', background: '#0a0a0a' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: contentAlign }}>
        {data.heading && (
          <Tag style={{ color: '#fff', fontSize: Tag === 'h1' ? '2.8rem' : Tag === 'h2' ? '2.2rem' : '1.6rem', textAlign: align, marginBottom: '24px', fontWeight: 'bold' }}>
            {data.heading}
          </Tag>
        )}
        {content && (
          <div style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>
    </section>
  );
}

function ImageBlock({ data }) {
  if (!data.src) return null;
  const align = data.align || 'center';
  const widthMap = { small: '400px', medium: '700px', full: '100%' };

  return (
    <section style={{ padding: '40px 20px', textAlign: align }}>
      <div style={{ maxWidth: widthMap[data.width] || '900px', margin: '0 auto' }}>
        {data.link ? (
          <a href={data.link} target={data.linkTarget || '_self'}>
            <img src={data.src} alt={data.alt || ''} style={{ width: '100%', borderRadius: `${data.borderRadius || 8}px`, objectFit: 'cover' }} />
          </a>
        ) : (
          <img src={data.src} alt={data.alt || ''} style={{ width: '100%', borderRadius: `${data.borderRadius || 8}px`, objectFit: 'cover' }} />
        )}
        {data.caption && <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '8px', textAlign: 'center' }}>{data.caption}</p>}
      </div>
    </section>
  );
}

function GalleryBlock({ data }) {
  const images = data.images || [];
  const cols = data.columns || 3;
  const gap = data.gap || 10;

  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}>
          {images.map((img, i) => (
            <div key={i} style={{ borderRadius: `${data.borderRadius || 6}px`, overflow: 'hidden', height: '260px' }}>
              <img src={img.src} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryTextBlock({ data }) {
  const isLeft = data.layout === 'image-left';
  return (
    <section style={{ padding: '70px 20px', background: '#0e0c0a' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isLeft ? 'row' : 'row-reverse', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: `1 1 ${data.imageWidth || '45'}%`, minWidth: '300px' }}>
          {data.imageSrc && <img src={data.imageSrc} alt={data.imageAlt || ''} style={{ width: '100%', borderRadius: `${data.borderRadius || 8}px`, objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: '1 1 45%', minWidth: '300px', color: '#ccc', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: data.content || '' }} />
      </div>
    </section>
  );
}

function VideoBlock({ data }) {
  if (!data.url) return null;
  const isYouTube = data.type === 'youtube' || data.url.includes('youtube') || data.url.includes('youtu.be');

  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', aspectRatio: data.aspectRatio || '16/9', overflow: 'hidden', borderRadius: '12px', background: '#000' }}>
        {isYouTube ? (
          <iframe
            src={data.url.replace('watch?v=', 'embed/')}
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={data.url} controls={data.controls !== false} autoPlay={data.autoplay} loop={data.loop} muted={data.muted} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
    </section>
  );
}

function ColumnsBlock({ data }) {
  if (Array.isArray(data.cols) && data.cols.length > 0) {
    return (
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {data.cols.map((column, index) => (
            <article key={column.heading || index} style={{ background: '#12100e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
              {column.icon && <div style={{ color: '#c5a059', fontSize: '2rem', marginBottom: '14px' }}>{column.icon}</div>}
              <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: '0 0 10px' }}>{column.heading}</h3>
              <p style={{ color: '#aaa', lineHeight: '1.65', margin: 0 }}>{column.body}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const leftW = data.leftWidth || '50';
  const rightW = 100 - Number(leftW);

  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: data.gap === 'large' ? '60px' : data.gap === 'small' ? '16px' : '32px', flexWrap: data.stackOnMobile !== false ? 'wrap' : 'nowrap' }}>
        <div style={{ flex: `1 1 ${leftW}%`, minWidth: '280px', color: '#ccc' }} dangerouslySetInnerHTML={{ __html: data.leftContent || '' }} />
        <div style={{ flex: `1 1 ${rightW}%`, minWidth: '280px', color: '#ccc' }} dangerouslySetInnerHTML={{ __html: data.rightContent || '' }} />
      </div>
    </section>
  );
}

function DividerBlock({ data }) {
  const height = data.height || 60;
  return (
    <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {data.showLine && (
        <div style={{ width: `${data.lineWidth || 60}%`, height: '1px', background: data.lineColor || 'rgba(197,160,89,0.3)' }} />
      )}
    </div>
  );
}

function BannerBlock({ data }) {
  const align = data.align || 'center';
  const bgType = data.bgType || 'gold';
  const heading = data.heading || data.headline || '';
  const subtext = data.subtext || data.subhead || '';

  let bg = 'linear-gradient(135deg, #c5a059 0%, #9e7b39 100%)';
  if (bgType === 'dark') bg = '#12100e';
  if (bgType === 'solid') bg = data.bgColor || '#c5a059';
  if (data.image) bg = `linear-gradient(rgba(0,0,0,${data.overlay ?? 0.62}), rgba(0,0,0,${data.overlay ?? 0.62})), url(${data.image}) center/cover`;

  return (
    <section style={{ padding: data.padding === 'small' ? '40px 20px' : '80px 20px', background: bg, textAlign: align, color: data.textColor || '#fff' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 'bold', margin: '0 0 16px' }}>{heading}</h2>
        {subtext && <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>{subtext}</p>}
        {data.ctaLabel && (
          <a href={data.ctaUrl || '#'} className="button button-gold" style={{ display: 'inline-block', marginTop: '18px', padding: '14px 32px', background: '#c5a059', color: '#080808', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
            {data.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function CTABlock({ data }) {
  const heading = data.heading || data.headline || '';
  const subtext = data.subtext || data.subhead || '';
  const label = data.btnLabel || data.ctaLabel || '';
  const url = data.btnUrl || data.ctaUrl || '#';
  return (
    <section style={{ padding: '80px 20px', background: data.bgType === 'gold' ? 'linear-gradient(135deg, #1c1917 0%, #2a2215 100%)' : '#0a0a0a', textAlign: data.align || 'center' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '16px' }}>{heading}</h2>
        {subtext && <p style={{ color: '#aaa', fontSize: '1.1rem', marginBottom: '30px' }}>{subtext}</p>}
        {label && (
          <a href={url} className="button button-gold" style={{ display: 'inline-block', padding: '14px 36px', background: 'linear-gradient(135deg, #c5a059 0%, #9e7b39 100%)', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
            {label}
          </a>
        )}
      </div>
    </section>
  );
}

function ButtonBlock({ data }) {
  return (
    <div style={{ textAlign: data.align || 'center', padding: '20px' }}>
      <a href={data.url || '#'} target={data.target || '_self'} style={{ display: 'inline-block', padding: data.size === 'large' ? '16px 40px' : data.size === 'small' ? '8px 20px' : '12px 28px', background: data.style === 'outline' ? 'transparent' : 'linear-gradient(135deg, #c5a059 0%, #9e7b39 100%)', color: '#fff', border: data.style === 'outline' ? '2px solid #c5a059' : 'none', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
        {data.label || 'Click Here'}
      </a>
    </div>
  );
}

function AccordionBlock({ data }) {
  const [openIdx, setOpenIdx] = useState(null);
  const items = data.items || [];

  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {data.heading && <h2 style={{ color: '#fff', fontSize: '2rem', textAlign: 'center', marginBottom: '32px' }}>{data.heading}</h2>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: '#12100e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ width: '100%', padding: '18px 20px', background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{item.question}</span>
                <span style={{ color: '#c5a059', fontSize: '1.4rem' }}>{openIdx === i ? '−' : '+'}</span>
              </button>
              {openIdx === i && (
                <div style={{ padding: '0 20px 20px', color: '#aaa', fontSize: '1rem', lineHeight: '1.6' }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TabsBlock({ data }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = data.tabs || [];

  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '30px', overflowX: 'auto' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{ padding: '14px 24px', background: 'none', border: 'none', borderBottom: activeTab === i ? '2px solid #c5a059' : '2px solid transparent', color: activeTab === i ? '#c5a059' : '#888', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        {tabs[activeTab] && (
          <div style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: tabs[activeTab].content }} />
        )}
      </div>
    </section>
  );
}

function IconBoxesBlock({ data }) {
  const items = data.items || [];
  const cols = data.columns || 3;

  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '24px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: '#12100e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{item.icon}</div>
            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '10px' }}>{item.title}</h3>
            <p style={{ color: '#aaa', fontSize: '0.95rem', margin: 0 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsBlock({ data }) {
  const items = data.items || [];
  return (
    <section style={{ padding: '70px 20px', background: 'linear-gradient(135deg, #161412 0%, #0a0a0a 100%)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {data.heading && <h2 style={{ color: '#fff', fontSize: '2rem', textAlign: 'center', marginBottom: '40px' }}>{data.heading}</h2>}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: '30px', textAlign: 'center' }}>
          {items.map((st, i) => (
            <div key={i}>
              <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#c5a059', marginBottom: '6px' }}>{st.number}</div>
              <div style={{ color: '#aaa', fontSize: '1rem' }}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MapBlock({ data }) {
  if (!data.mapUrl) return null;
  return (
    <section style={{ padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', overflow: 'hidden', borderRadius: `${data.borderRadius || 10}px` }}>
        <iframe src={data.mapUrl} style={{ width: '100%', height: `${data.height || 400}px`, border: 0 }} allowFullScreen loading="lazy" />
      </div>
    </section>
  );
}

function SocialBlock({ data }) {
  const items = data.items || [];
  return (
    <section style={{ padding: '40px 20px', textAlign: data.align || 'center' }}>
      {data.heading && <h3 style={{ color: '#fff', marginBottom: '20px' }}>{data.heading}</h3>}
      <div style={{ display: 'flex', gap: '16px', justifyContent: data.align === 'left' ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
        {items.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ padding: '10px 20px', background: '#1a1816', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)', borderRadius: '30px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
            {s.platform?.toUpperCase()}
          </a>
        ))}
      </div>
    </section>
  );
}

function ShortcodeBlock({ data }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
      {/* Shortcode placeholder */}
    </div>
  );
}

function PricingBlock({ data }) {
  const items = data.items || [];
  return (
    <section style={{ padding: '80px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {data.heading && <h2 style={{ color: '#fff', fontSize: '2.2rem', textAlign: 'center', marginBottom: '50px' }}>{data.heading}</h2>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', alignItems: 'stretch' }}>
          {items.map((plan, i) => (
            <div key={i} style={{ background: '#12100e', border: plan.highlight ? '2px solid #c5a059' : '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '36px 28px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {plan.highlight && <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#c5a059', color: '#000', padding: '4px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>POPULAR</span>}
              <h3 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '16px' }}>{plan.name}</h3>
              <div style={{ fontSize: '2.6rem', fontWeight: 'bold', color: '#c5a059', marginBottom: '24px' }}>
                {plan.price} <span style={{ fontSize: '1rem', color: '#888', fontWeight: 'normal' }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px', flex: 1, color: '#ccc', lineHeight: '2' }}>
                {(plan.features || []).map((f, fi) => <li key={fi}><SvgIcon name="check" size={15} /> {f}</li>)}
              </ul>
              {plan.btnLabel && (
                <a href={plan.btnUrl || '#'} style={{ display: 'block', textAlign: 'center', padding: '12px 24px', background: plan.highlight ? '#c5a059' : 'transparent', color: plan.highlight ? '#000' : '#c5a059', border: '1px solid #c5a059', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                  {plan.btnLabel}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamBlock({ data }) {
  const items = data.items || [];
  return (
    <section style={{ padding: '80px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {data.heading && <h2 style={{ color: '#fff', fontSize: '2.2rem', textAlign: 'center', marginBottom: '50px' }}>{data.heading}</h2>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
          {items.map((m, i) => (
            <div key={i} style={{ background: '#12100e', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {m.photo && <img src={m.photo} alt={m.name} style={{ width: '100%', height: '280px', objectFit: 'cover' }} />}
              <div style={{ padding: '20px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: '0 0 4px' }}>{m.name}</h3>
                <p style={{ color: '#c5a059', fontSize: '0.9rem', margin: '0 0 12px' }}>{m.role}</p>
                {m.bio && <p style={{ color: '#aaa', fontSize: '0.9rem', margin: 0 }}>{m.bio}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomHtmlBlock({ data }) {
  if (!data.html) return null;
  return (
    <section style={{ padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: data.html }} />
    </section>
  );
}

function GridBlock({ data }) {
  const items = data.items || [];
  const cols = data.columns || 3;
  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '24px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: '#12100e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '24px' }}>
            {item.icon && <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{item.icon}</div>}
            <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ color: '#aaa', fontSize: '0.95rem', margin: 0 }}>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormBlock({ data }) {
  const fields = data.fields || [];
  return (
    <section style={{ padding: '60px 20px', background: '#0e0c0a' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', background: '#161412', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        {data.formTitle && <h2 style={{ color: '#fff', fontSize: '1.8rem', textAlign: 'center', marginBottom: '8px' }}>{data.formTitle}</h2>}
        {data.formDesc && <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '30px' }}>{data.formDesc}</p>}
        <form onSubmit={(e) => { e.preventDefault(); showSuccess('Enquiry received', 'Thanks for contacting Preva Kitchen. Our team will follow up shortly.'); e.currentTarget.reset(); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {fields.map((f) => (
              <div key={f.id || f.label}>
                <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontSize: '0.9rem' }}>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea rows={4} placeholder={f.placeholder} required={f.required} style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }} />
                ) : (
                  <input type={f.type || 'text'} placeholder={f.placeholder} required={f.required} style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }} />
                )}
              </div>
            ))}
            <button type="submit" style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #c5a059 0%, #9e7b39 100%)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
              {data.submitLabel || 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
