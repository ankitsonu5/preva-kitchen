"use client";

/**
 * Shared presentational primitives for the "content page" pattern used by
 * newer public pages (reservations, catering, about, legal pages). Mirrors
 * the visual language already established in ContactContent.js — dark
 * ground, gold accent, maroon gradient CTA — so new pages read as part of
 * the same site instead of introducing a new style.
 */

export const COLORS = {
  bg: '#070507',
  bgAlt: '#090709',
  bgDeep: '#060406',
  card: 'linear-gradient(145deg, #140f13 0%, #0d090c 100%)',
  cardAlt: 'linear-gradient(145deg, #120e11 0%, #0d090c 100%)',
  text: '#f5f1e8',
  textMuted: '#d5d0c8',
  textDim: '#aaa398',
  textFaint: '#999',
  gold: '#c5a059',
  goldBorder: 'rgba(213, 164, 79, 0.28)',
  maroonGradient: 'linear-gradient(135deg, #a6133b, #761024)',
  maroonGradientHover: 'linear-gradient(135deg, #bd1b49, #8f0e2d)'
};

export const fontFamily = 'var(--font-roboto), Arial, sans-serif';

export function PageShell({ children }) {
  return (
    <main style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', overflowX: 'hidden' }}>
      {children}
    </main>
  );
}

export function Container({ children, style }) {
  return (
    <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px', ...style }}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, icon: Icon, style }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        color: COLORS.gold,
        fontSize: '0.78rem',
        fontWeight: 800,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        marginBottom: '16px',
        ...style
      }}
    >
      {Icon ? <Icon size={15} /> : null}
      <span>{children}</span>
    </div>
  );
}

export function PageHero({ eyebrow, eyebrowIcon, title, titleAccent, subtitle, children }) {
  return (
    <section
      style={{
        position: 'relative',
        padding: '140px 0 80px',
        background: 'radial-gradient(ellipse at 15% 25%, rgba(213, 164, 79, 0.1) 0%, transparent 60%), #090709',
        borderBottom: '1px solid rgba(213, 164, 79, 0.2)'
      }}
    >
      <Container>
        <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
        <h1
          style={{
            fontFamily,
            fontSize: 'clamp(2.4rem, 4.4vw, 3.9rem)',
            lineHeight: 1.12,
            color: '#fff',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            margin: '0 0 20px 0',
            textTransform: 'uppercase',
            maxWidth: '900px'
          }}
        >
          {title} {titleAccent ? <span style={{ color: COLORS.gold, fontStyle: 'italic', textTransform: 'none' }}>{titleAccent}</span> : null}
        </h1>
        {subtitle ? (
          <p style={{ fontSize: '1.02rem', lineHeight: 1.8, color: COLORS.textDim, margin: '0 0 28px 0', maxWidth: '640px' }}>
            {subtitle}
          </p>
        ) : null}
        {children}
      </Container>
    </section>
  );
}

export function Section({ id, bg, borderBottom, padding = '80px 0', children, style }) {
  return (
    <section
      id={id}
      style={{
        padding,
        background: bg || COLORS.bgAlt,
        borderBottom: borderBottom !== false ? '1px solid rgba(255, 255, 255, 0.05)' : undefined,
        ...style
      }}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({ eyebrow, eyebrowIcon, title, titleAccent, align = 'left', description }) {
  return (
    <div style={{ textAlign: align, marginBottom: '44px', maxWidth: align === 'center' ? '720px' : '820px', marginLeft: align === 'center' ? 'auto' : undefined, marginRight: align === 'center' ? 'auto' : undefined }}>
      {eyebrow ? <Eyebrow icon={eyebrowIcon} style={{ justifyContent: align === 'center' ? 'center' : 'flex-start' }}>{eyebrow}</Eyebrow> : null}
      <h2
        style={{
          fontFamily,
          fontSize: 'clamp(2rem, 3.4vw, 2.9rem)',
          color: '#fff',
          lineHeight: 1.14,
          margin: '0 0 14px',
          textTransform: 'uppercase'
        }}
      >
        {title} {titleAccent ? <span style={{ color: COLORS.gold, fontStyle: 'italic', textTransform: 'none' }}>{titleAccent}</span> : null}
      </h2>
      {description ? <p style={{ color: COLORS.textDim, fontSize: '1rem', lineHeight: 1.75, margin: 0 }}>{description}</p> : null}
    </div>
  );
}

export function PrimaryButton({ href, onClick, type = 'button', disabled, children, icon: Icon, style, as }) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    height: '52px',
    padding: '0 32px',
    background: COLORS.maroonGradient,
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderRadius: '999px',
    textDecoration: 'none',
    border: 'none',
    cursor: disabled ? 'wait' : 'pointer',
    boxShadow: '0 10px 28px rgba(166, 19, 59, 0.35)',
    transition: 'transform 0.2s ease, background 0.2s ease',
    ...style
  };
  const handlers = {
    onMouseEnter: (e) => { if (disabled) return; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = COLORS.maroonGradientHover; },
    onMouseLeave: (e) => { if (disabled) return; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = COLORS.maroonGradient; }
  };
  if (href) {
    const isInternal = href.startsWith('/') || href.startsWith('#');
    if (isInternal) {
      return (
        <a href={href} style={baseStyle} {...handlers}>
          {children} {Icon ? <Icon size={16} /> : null}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" style={baseStyle} {...handlers}>
        {children} {Icon ? <Icon size={16} /> : null}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={baseStyle} {...handlers}>
      {children} {Icon ? <Icon size={16} /> : null}
    </button>
  );
}

export function SecondaryButton({ href, onClick, children, icon: Icon, style }) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '52px',
    padding: '0 28px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(213, 164, 79, 0.4)',
    color: '#e8e2d8',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    borderRadius: '999px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    ...style
  };
  const handlers = {
    onMouseEnter: (e) => { e.currentTarget.style.borderColor = COLORS.gold; e.currentTarget.style.background = 'rgba(213, 164, 79, 0.08)'; },
    onMouseLeave: (e) => { e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.4)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }
  };
  if (href) {
    return (
      <a href={href} style={baseStyle} {...handlers}>
        {children} {Icon ? <Icon size={15} /> : null}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={baseStyle} {...handlers}>
      {children} {Icon ? <Icon size={15} /> : null}
    </button>
  );
}

export function Card({ children, style }) {
  return (
    <article
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 28px',
        borderRadius: '16px',
        background: COLORS.cardAlt,
        border: '1px solid rgba(213, 164, 79, 0.22)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
        ...style
      }}
    >
      {children}
    </article>
  );
}

export function FaqItem({ question, answer }) {
  return (
    <div
      style={{
        padding: '26px 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <h3 style={{ fontFamily, fontSize: '1.1rem', color: '#fff', margin: '0 0 10px', fontWeight: 600 }}>{question}</h3>
      <p style={{ margin: 0, color: COLORS.textDim, fontSize: '0.95rem', lineHeight: 1.75 }}>{answer}</p>
    </div>
  );
}

export const inputStyle = {
  width: '100%',
  height: '48px',
  padding: '0 16px',
  background: '#090709',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.9rem',
  fontFamily,
  outline: 'none',
  boxSizing: 'border-box'
};

export const textareaStyle = {
  ...inputStyle,
  height: 'auto',
  minHeight: '110px',
  padding: '14px 16px',
  resize: 'vertical'
};

export const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 800,
  color: '#bbb',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '6px'
};

export function FormCard({ eyebrow, title, description, children }) {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.goldBorder}`,
        borderRadius: '20px',
        padding: 'clamp(28px, 4vw, 44px)',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.6)',
        position: 'relative'
      }}
    >
      {(eyebrow || title || description) && (
        <div style={{ paddingBottom: '24px', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {eyebrow ? (
            <span style={{ color: COLORS.gold, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              {eyebrow}
            </span>
          ) : null}
          {title ? <h3 style={{ fontFamily, fontSize: '1.85rem', color: '#fff', margin: '0 0 6px', textTransform: 'uppercase' }}>{title}</h3> : null}
          {description ? <p style={{ margin: 0, color: '#999', fontSize: '0.9rem' }}>{description}</p> : null}
        </div>
      )}
      {children}
    </div>
  );
}
