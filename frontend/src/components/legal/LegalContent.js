import { FileText } from 'lucide-react';
import { PageShell, PageHero, Section, COLORS, fontFamily } from '@/components/site-page/PageKit';

/**
 * Shared prose layout for the legal / policy pages (privacy policy, terms,
 * accessibility). Keeps typography and spacing consistent without repeating
 * the same markup three times.
 */
export default function LegalContent({ eyebrow, title, subtitle, updated, sections }) {
  return (
    <PageShell>
      <PageHero eyebrow={eyebrow} eyebrowIcon={FileText} title={title} subtitle={subtitle}>
        {updated ? (
          <p style={{ color: COLORS.textFaint, fontSize: '0.85rem', margin: 0 }}>Last updated: {updated}</p>
        ) : null}
      </PageHero>

      <Section bg={COLORS.bgDeep} padding="80px 0 120px" borderBottom={false}>
        <div style={{ maxWidth: '780px', display: 'grid', gap: '44px' }}>
          {sections.map((section) => (
            <div key={section.heading}>
              <h2
                style={{
                  fontFamily,
                  fontSize: '1.5rem',
                  color: '#fff',
                  margin: '0 0 16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.01em'
                }}
              >
                {section.heading}
              </h2>
              <div style={{ display: 'grid', gap: '14px' }}>
                {section.body.map((item, idx) =>
                  Array.isArray(item) ? (
                    <ul key={idx} style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '8px' }}>
                      {item.map((li) => (
                        <li key={li} style={{ color: COLORS.textMuted, fontSize: '0.96rem', lineHeight: 1.75 }}>{li}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={idx} style={{ margin: 0, color: COLORS.textMuted, fontSize: '0.96rem', lineHeight: 1.8 }}>{item}</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
