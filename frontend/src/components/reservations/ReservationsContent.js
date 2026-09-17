"use client";

import { useState } from 'react';
import { Calendar, Users, Cake, Sparkles, MapPin, Clock, Phone, Check, ArrowRight } from 'lucide-react';
import { showError, showSuccess, showWarning } from '@/lib/swal';
import {
  PageShell,
  PageHero,
  Section,
  SectionHeading,
  Container,
  Card,
  FaqItem,
  FormCard,
  PrimaryButton,
  SecondaryButton,
  inputStyle,
  textareaStyle,
  labelStyle,
  COLORS,
  fontFamily
} from '@/components/site-page/PageKit';

const API = '/api';
const EMPTY_FORM = {
  name: '', phone: '', email: '', guests: '2', date: '', time: '', occasion: '', notes: '', hp_field: ''
};

const faqs = [
  {
    question: 'Do you take walk-ins?',
    answer: 'Yes — walk-ins are always welcome. Reserving ahead just guarantees your table is ready when your party arrives, which we recommend for Friday and Saturday evenings.'
  },
  {
    question: 'How far in advance should I book?',
    answer: 'For a party of 2-6, a day or two ahead is usually plenty. For groups of 8 or more, or for a holiday and special-occasion date, please reach out at least a week in advance.'
  },
  {
    question: 'Is there a deposit for large parties?',
    answer: 'Groups of 15+ or private dining bookings may require a deposit to hold the date. Our team will let you know when confirming your request by phone.'
  },
  {
    question: 'Can I request a specific table or seating area?',
    answer: 'Add it in the notes field and we will do our best to accommodate — just know seating is confirmed the day of based on availability.'
  },
  {
    question: 'What if I need to cancel or change my reservation?',
    answer: 'Call us at (313) 286-3586 as soon as you know your plans have changed, so we can free up the table for another guest.'
  }
];

export default function ReservationsContent() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [error, setError] = useState('');

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name || !phone || !email) {
      setError('Please add your name, phone number and email address.');
      showWarning('Complete required fields', 'Add your name, phone number and email address, then submit again.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      showWarning('Check your email address', 'That email address does not look valid.');
      return;
    }
    if (!form.date || !form.time) {
      setError('Please select your preferred reservation date and time.');
      showWarning('Date and time required', 'Select your preferred date and time, then submit again.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        phone,
        email,
        guests: Number(form.guests) || 2,
        date: form.date,
        time: form.time,
        occasion: form.occasion,
        notes: form.notes,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        hp_field: form.hp_field
      };
      const response = await fetch(`${API}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'Reservation request could not be sent');
      setReferenceId(data?.referenceId || '');
      setSuccess(true);
      setForm(EMPTY_FORM);
      showSuccess('Request received', 'Your confirmation email is on its way. Our team will contact you if anything else is needed.');
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || 'We could not send your request. Please call (313) 286-3586 and we will book it for you.');
      showError('Request not sent', 'Please try again or call the kitchen at (313) 286-3586.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Preva Kitchen · Redford, Michigan"
        eyebrowIcon={Sparkles}
        title="Book Your Table at"
        titleAccent="Preva Kitchen, Redford Township MI"
        subtitle="Reserve a table for a birthday, a date night or a family dinner. We will email your request details and contact you if anything else is needed."
      >
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <PrimaryButton href="#reserve-form" icon={Calendar}>Reserve a table</PrimaryButton>
          <SecondaryButton href="tel:+13132863586" icon={Phone}>Call (313) 286-3586</SecondaryButton>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', color: COLORS.textFaint, fontSize: '0.86rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color={COLORS.gold} /> Dine-In: Tue–Sun · 5pm–10pm
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} color={COLORS.gold} /> 13090 Inkster Rd, Redford Township, MI 48239
          </span>
        </div>
      </PageHero>

      {/* Reserve Online */}
      <Section id="reserve-form" bg={COLORS.bgDeep} padding="90px 0 100px">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'clamp(36px, 5vw, 80px)',
            alignItems: 'start'
          }}
        >
          <div>
            <SectionHeading
              eyebrow="Takes under a minute"
              eyebrowIcon={Calendar}
              title="Reserve Online in"
              titleAccent="Under a Minute"
              description="Fill in your party size, preferred date and time. We email your request details immediately, and our team follows up if needed."
            />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '14px' }}>
              {[
                'Submitted instantly to our front-of-house team',
                'Confirmation details sent to your email',
                'Same-day and next-day requests welcome — just call if it is urgent'
              ].map((line) => (
                <li key={line} style={{ display: 'flex', gap: '10px', color: COLORS.textMuted, fontSize: '0.95rem', lineHeight: 1.6 }}>
                  <Check size={18} color={COLORS.gold} style={{ flexShrink: 0, marginTop: '2px' }} />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <FormCard eyebrow="Table Request" title="Reserve Your Table" description="Complete the form and we'll email your request details.">
            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.15)', border: `1px solid ${COLORS.gold}`, color: COLORS.gold, display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                  <Check size={32} />
                </div>
                <h4 style={{ fontFamily, fontSize: '1.6rem', color: '#fff', margin: '0 0 10px' }}>Request Received</h4>
                <p style={{ color: '#aaa', fontSize: '0.94rem', marginBottom: '24px' }}>
                  Thanks for reaching out. Check your inbox for your reservation request details. Our team will contact you if anything else is needed.
                </p>
                {referenceId && (
                  <p style={{ color: '#888', fontSize: '0.8rem', margin: '-12px 0 24px' }}>
                    Reference #{referenceId}
                  </p>
                )}
                <PrimaryButton onClick={() => { setSuccess(false); setReferenceId(''); }}>Reserve Another Table</PrimaryButton>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'grid', gap: '18px' }} noValidate>
                <input
                  type="text"
                  name="hp_field"
                  value={form.hp_field}
                  onChange={update}
                  tabIndex="-1"
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />
                {error && (
                  <div style={{ padding: '12px 16px', background: 'rgba(230, 90, 90, 0.12)', border: '1px solid rgba(230, 90, 90, 0.4)', borderRadius: '8px', color: '#ffb2b2', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                  <div>
                    <label htmlFor="reservation-name" style={labelStyle}>Full Name <span style={{ color: COLORS.gold }}>*</span></label>
                    <input id="reservation-name" name="name" value={form.name} onChange={update} autoComplete="name" required style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="reservation-phone" style={labelStyle}>Phone Number <span style={{ color: COLORS.gold }}>*</span></label>
                    <input id="reservation-phone" type="tel" name="phone" value={form.phone} onChange={update} autoComplete="tel" required style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reservation-email" style={labelStyle}>Email Address <span style={{ color: COLORS.gold }}>*</span></label>
                  <input id="reservation-email" type="email" name="email" value={form.email} onChange={update} autoComplete="email" placeholder="you@example.com" required style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '14px' }}>
                  <div>
                    <label htmlFor="reservation-guests" style={labelStyle}>Party Size</label>
                    <select id="reservation-guests" name="guests" value={form.guests} onChange={update} style={inputStyle}>
                      {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => (
                        <option key={n} value={n}>{n} guests</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reservation-date" style={labelStyle}>Date <span style={{ color: COLORS.gold }}>*</span></label>
                    <input id="reservation-date" type="date" name="date" value={form.date} onChange={update} required style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="reservation-time" style={labelStyle}>Time <span style={{ color: COLORS.gold }}>*</span></label>
                    <input id="reservation-time" type="time" name="time" value={form.time} onChange={update} required style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reservation-occasion" style={labelStyle}>Occasion</label>
                  <input id="reservation-occasion" name="occasion" placeholder="Birthday, anniversary, date night..." value={form.occasion} onChange={update} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="reservation-notes" style={labelStyle}>Notes</label>
                  <textarea id="reservation-notes" name="notes" rows={3} placeholder="Seating preference, allergies, anything else we should know..." value={form.notes} onChange={update} style={textareaStyle} />
                </div>

                <PrimaryButton type="submit" disabled={submitting} icon={ArrowRight} style={{ width: '100%', marginTop: '8px' }}>
                  {submitting ? 'Sending Request...' : 'Request Reservation'}
                </PrimaryButton>
                <p style={{ margin: 0, color: '#888', fontSize: '0.78rem', textAlign: 'center' }}>
                  Prefer to talk it through? Call <a href="tel:+13132863586" style={{ color: COLORS.gold }}>(313) 286-3586</a>.
                </p>
              </form>
            )}
          </FormCard>
        </div>
      </Section>

      {/* Birthdays / Date Nights */}
      <Section bg={COLORS.bgAlt}>
        <SectionHeading
          eyebrow="Celebrate with us"
          eyebrowIcon={Cake}
          title="Birthdays, Anniversaries"
          titleAccent="& Date Nights"
          description="Whether it's a milestone birthday, an anniversary dinner or a first date, tell us in the notes field and our team will help set the table right."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
          <Card>
            <h3 style={{ fontFamily, fontSize: '1.2rem', color: '#fff', margin: '0 0 10px', textTransform: 'uppercase' }}>Birthdays</h3>
            <p style={{ color: '#aaa', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>Let us know it&apos;s a birthday and we&apos;ll do what we can to make the evening feel special — mention any details in your reservation notes.</p>
          </Card>
          <Card>
            <h3 style={{ fontFamily, fontSize: '1.2rem', color: '#fff', margin: '0 0 10px', textTransform: 'uppercase' }}>Anniversaries</h3>
            <p style={{ color: '#aaa', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>Celebrating a milestone? Request a quieter table when you book and we&apos;ll do our best to seat you accordingly.</p>
          </Card>
          <Card>
            <h3 style={{ fontFamily, fontSize: '1.2rem', color: '#fff', margin: '0 0 10px', textTransform: 'uppercase' }}>Date Nights</h3>
            <p style={{ color: '#aaa', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>Tuesday through Sunday evenings, 5-10pm — good food, a relaxed room, and a table ready when you are.</p>
          </Card>
        </div>
      </Section>

      {/* Group & Private Dining */}
      <Section bg={COLORS.bgDeep}>
        <SectionHeading
          eyebrow="8 to 30 guests"
          eyebrowIcon={Users}
          title="Group & Private Dining"
          titleAccent="for 8-30 Guests"
          description="Planning a birthday party, a repast, a work celebration or a family reunion? We can accommodate larger parties with advance notice."
        />
        <Card style={{ maxWidth: '820px' }}>
          <p style={{ color: COLORS.textMuted, fontSize: '0.96rem', lineHeight: 1.8, margin: '0 0 18px' }}>
            For groups of 8 or more, call ahead or submit the form above with your headcount in the notes — our team will confirm seating,
            timing, and whether a deposit is needed for your date. Larger private-dining requests (15-30 guests) typically need at least a
            week&apos;s notice.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <PrimaryButton href="tel:+13132863586" icon={Phone}>Call to Plan Your Group</PrimaryButton>
            <SecondaryButton href="/catering">Looking for catering instead?</SecondaryButton>
          </div>
        </Card>
      </Section>

      {/* Where to find us */}
      <Section bg={COLORS.bgAlt}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'clamp(32px, 5vw, 64px)',
            alignItems: 'center'
          }}
        >
          <div>
            <SectionHeading eyebrow="Find us" eyebrowIcon={MapPin} title="Where to" titleAccent="Find Us" />
            <div style={{ display: 'grid', gap: '18px' }}>
              <p style={{ margin: 0, color: COLORS.textMuted, fontSize: '0.98rem', lineHeight: 1.7 }}>
                <strong style={{ color: '#fff' }}>Preva Kitchen</strong><br />
                13090 Inkster Rd<br />
                Redford Township, MI 48239
              </p>
              <p style={{ margin: 0, color: COLORS.textMuted, fontSize: '0.98rem', lineHeight: 1.7 }}>
                <Clock size={16} color={COLORS.gold} style={{ verticalAlign: '-3px', marginRight: '8px' }} />
                Dine-In: Tuesday – Sunday, 5:00 PM – 10:00 PM<br />
                <small style={{ color: '#888' }}>Monday: Closed for dine-in. Pickup &amp; delivery available Monday – Friday, 11:00 AM – 3:30 PM.</small>
              </p>
              <p style={{ margin: 0, color: COLORS.textMuted, fontSize: '0.98rem', lineHeight: 1.7 }}>
                <Phone size={16} color={COLORS.gold} style={{ verticalAlign: '-3px', marginRight: '8px' }} />
                <a href="tel:+13132863586" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>(313) 286-3586</a>
              </p>
            </div>
          </div>
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '360px',
              borderRadius: '18px',
              background: '#111',
              border: '1px solid rgba(213, 164, 79, 0.35)',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75)',
              overflow: 'hidden'
            }}
          >
            <iframe
              title="Preva Kitchen, 13090 Inkster Rd, Redford Township, MI 48239, United States"
              src="https://www.google.com/maps?q=Preva+Kitchen,+13090+Inkster+Rd,+Redford+Township,+MI+48239,+United+States&output=embed"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: '360px', border: 0, display: 'block' }}
            />
          </div>
        </div>
      </Section>

      {/* FAQs */}
      <Section bg={COLORS.bgDeep} padding="80px 0 120px" borderBottom={false}>
        <SectionHeading eyebrow="Good to know" title="Reservation" titleAccent="FAQs" />
        <div style={{ maxWidth: '820px' }}>
          {faqs.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
