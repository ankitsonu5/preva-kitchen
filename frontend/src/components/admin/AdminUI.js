import { ArrowRight, FileQuestion, LoaderCircle } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, actions, icon: Icon }) {
  return (
    <div className="page-header">
      <div className="page-heading-wrap">
        {Icon && <div className="page-icon"><Icon size={21} /></div>}
        <div>
          {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatsCard({ label, value, helper, icon: Icon, tone = 'default', href }) {
  const content = (
    <>
      <div className={`stats-icon tone-${tone}`}>{Icon && <Icon size={19} />}</div>
      <div className="stats-copy"><span>{label}</span><strong>{value ?? '—'}</strong><small>{helper}</small></div>
      {href && <ArrowRight className="stats-arrow" size={16} />}
    </>
  );
  return href ? <a className="stats-card" href={href}>{content}</a> : <div className="stats-card">{content}</div>;
}

export function StatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  return <span className={`status-badge status-${normalized.toLowerCase().replaceAll('_', '-')}`}><i />{normalized.replaceAll('_', ' ')}</span>;
}

export function EmptyState({ icon: Icon = FileQuestion, title = 'Nothing here yet', description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={25} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4, cards = false }) {
  if (cards) return <div className="skeleton-cards">{Array.from({ length: rows }, (_, index) => <div className="skeleton-card" key={index}><span /><b /><i /></div>)}</div>;
  return <div className="skeleton-list" aria-label="Loading">{Array.from({ length: rows }, (_, index) => <div className="skeleton-row" key={index}><span /><span /><span /></div>)}</div>;
}

export function FormSection({ title, description, children, icon: Icon, className = '' }) {
  return (
    <section className={`panel form-section ${className}`}>
      <div className="section-heading">
        {Icon && <span><Icon size={18} /></span>}
        <div><h3>{title}</h3>{description && <p>{description}</p>}</div>
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
}

export function InlineLoader({ label = 'Loading…' }) {
  return <div className="inline-loader"><LoaderCircle size={18} className="spin" />{label}</div>;
}
