"use client";

import { useState } from 'react';
import { Utensils, Building2, PartyPopper, MapPinned, Clock3, Sparkles, Phone, Check, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { showError, showSuccess, showWarning } from '@/lib/swal';
import Link from 'next/link';
import {
  PageShell,
  PageHero,
  Section,
  SectionHeading,
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
  name: '', phone: '', email: '', eventDate: '', headcount: '', message: ''
};

/*
 * Tray sizes and pricing below are ILLUSTRATIVE PLACEHOLDERS only — the
 * owner has not yet confirmed real catering prices. Replace these numbers
 * (and add any additional tray/pan options) before treating this page as
 * final. Labeled clearly on-page as "starting at" so nothing reads as a
 * locked-in quote.
 */
const trays = [
  { size: 'Small Tray', feeds: 'Feeds 8-10', price: 'Starting at $60', note: 'Great for office lunches and small gatherings.' },
  { size: 'Medium Tray', feeds: 'Feeds 15-20', price: 'Starting at $110', note: 'A solid choice for birthdays and team events.' },
  { size: 'Large Tray', feeds: 'Feeds 25-30', price: 'Starting at $160', note: 'Built for family parties, repasts and church events.' }
];

const deliveryAreas = ['Redford Township', 'Old Redford', 'Livonia', 'Dearborn Heights', 'Garden City'];

/* Same dishes featured as homepage favorites — good tray/pan candidates for catering. */
const popularDishes = [
  { name: 'Preva Mac & Cheese', slug: 'preva-mac-and-cheese', description: 'Baked macaroni in a rich five-cheese sauce, finished with a golden crust.' },
  { name: 'Preva Lamb Chops', slug: 'preva-lamb-chops', description: 'Grilled lamb chops seasoned with Preva house spices.' },
  { name: 'Preva Steak Bites', slug: 'preva-steak-bites', description: 'Tender steak bites finished with savory garlic herb butter.' },
  { name: 'Sweet Chilli Wings', slug: 'preva-wings-chilli', description: 'Crispy jumbo wings coated in a bright sweet chilli glaze with a gentle kick.' },
  { name: 'Shrimp Tacos', slug: 'shrimp-tacos', description: 'Seasoned shrimp tucked into warm tortillas with fresh slaw and house sauce.' },
  { name: 'Preva Quesadillas', slug: 'preva-quesadillas', description: 'Golden grilled tortilla layered with melted cheese and house seasoning.' }
];

const faqs = [
  {
    question: 'How much notice do you need for catering?',
    answer: 'For small trays, 48 hours is usually enough. For full spreads or events over 30 guests, please give us at least 5-7 days so we can plan prep and delivery.'
  },
  {
    question: 'Do you deliver, or is it pickup only?',
    answer: 'Both — pickup at 13090 Inkster Rd is always available, and we deliver within Redford Township, Old Redford, Livonia, Dearborn Heights and Garden City. Ask about delivery to your area when you enquire.'
  },
  {
    question: 'Can you accommodate dietary requests?',
    answer: 'Yes — let us know about allergies or dietary preferences (halal, no shellfish, vegetarian, etc.) in your enquiry and we will work with you on the menu.'
  },
  {
    question: 'Do you require a deposit for larger orders?',
    answer: 'Larger catering orders and full-event spreads may require a deposit to hold your date. We will confirm this with you directly when finalizing your order.'
  }
];

export default function CateringContent() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.message) {
      setError('Please add your name, email and a short message about your event.');
      showWarning('Complete required fields', 'Add your name, email and a short message, then submit again.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address so we can follow up.');
      showWarning('Check your email address', 'That email address does not look valid.');
      return;
    }

    setSubmitting(true);
    try {
      const detailLines = [
        form.eventDate ? `Event date: ${form.eventDate}` : null,
        form.headcount ? `Headcount: ${form.headcount}` : null,
        '',
        form.message
      ].filter(Boolean).join('\n');

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: 'Catering Enquiry',
        message: detailLines,
        formSource: 'Preva Kitchen Catering Page',
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined
      };
      const response = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Catering enquiry could not be sent');
      setSuccess(true);
      setForm(EMPTY_FORM);
      showSuccess('Enquiry received', 'Thanks! Our kitchen team will follow up about your event shortly.');
    } catch (submitError) {
      console.error(submitError);
      setError('We could not send your enquiry. Please call (313) 286-3586 and we will help directly.');
      showError('Enquiry not sent', 'Please try again or call the kitchen at (313) 286-3586.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Preva Kitchen · Redford, Michigan"
        eyebrowIcon={Sparkles}
        title="Catering & Party Trays in"
        titleAccent="Redford Township, MI"
        subtitle="Wing trays, pasta pans and full spreads catered for office lunches, birthdays, graduations and church events across the Redford area."
      >
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <PrimaryButton href="#catering-form" icon={Utensils}>Get a catering quote</PrimaryButton>
          <SecondaryButton href="tel:+13132863586" icon={Phone}>Call (313) 286-3586</SecondaryButton>
        </div>
      </PageHero>

      {/* Tray sizes & pricing */}
      <Section bg={COLORS.bgDeep}>
        <SectionHeading
          eyebrow="Tray Sizes & Pricing"
          eyebrowIcon={Utensils}
          title="Tray Sizes"
          titleAccent="& Pricing"
          description="Illustrative starting prices — final pricing depends on menu selection and headcount. Ask for an exact quote when you enquire."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '24px' }}>
          {trays.map((tray) => (
            <Card key={tray.size}>
              <h3 style={{ fontFamily, fontSize: '1.25rem', color: '#fff', margin: '0 0 6px', textTransform: 'uppercase' }}>{tray.size}</h3>
              <p style={{ color: COLORS.gold, fontWeight: 700, fontSize: '0.85rem', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tray.feeds}</p>
              <p style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 14px' }}>{tray.price}</p>
              <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{tray.note}</p>
            </Card>
          ))}
        </div>
        <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '18px', maxWidth: '720px' }}>
          Pricing shown is a starting-point estimate pending final confirmation from ownership — call or use the form below for a firm quote on your event.
        </p>
      </Section>

      {/* Office & corporate */}
      <Section bg={COLORS.bgAlt}>
        <SectionHeading eyebrow="Weekday lunches" eyebrowIcon={Building2} title="Office & Corporate" titleAccent="Lunch Catering" description="Feeding a meeting, a shift change or the whole office? We put together tray spreads sized to your headcount, ready for pickup or delivery." />
        <Card style={{ maxWidth: '820px' }}>
          <p style={{ color: COLORS.textMuted, fontSize: '0.96rem', lineHeight: 1.8, margin: 0 }}>
            Send us your headcount, budget and any dietary notes and we&apos;ll put together a spread that works for the room —
            from a simple wing-and-side tray to a full multi-item lunch buffet.
          </p>
        </Card>
      </Section>

      {/* Birthdays / Graduations / Repasts / Church */}
      <Section bg={COLORS.bgDeep}>
        <SectionHeading eyebrow="Every kind of gathering" eyebrowIcon={PartyPopper} title="Birthdays, Graduations," titleAccent="Repasts & Church Events" description="From celebrations to services, we cater comfort food that feeds a crowd without the stress of cooking for a party yourself." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '20px' }}>
          {['Birthday Parties', 'Graduations', 'Repasts', 'Church Events'].map((label) => (
            <div key={label} style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(213, 164, 79, 0.2)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Delivery radius */}
      <Section bg={COLORS.bgAlt}>
        <SectionHeading eyebrow="Delivery Radius" eyebrowIcon={MapPinned} title="Where We" titleAccent="Deliver" description="We cater and deliver across the Redford area. Outside this radius? Ask us — we may still be able to help, or set up pickup instead." />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {deliveryAreas.map((area) => (
            <span
              key={area}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 20px',
                borderRadius: '999px',
                border: `1px solid ${COLORS.goldBorder}`,
                color: COLORS.gold,
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}
            >
              {area}
            </span>
          ))}
        </div>
      </Section>

      {/* Notice needed */}
      <Section bg={COLORS.bgDeep}>
        <SectionHeading eyebrow="Plan ahead" eyebrowIcon={Clock3} title="How Much Notice" titleAccent="Do You Need?" />
        <Card style={{ maxWidth: '820px' }}>
          <p style={{ color: COLORS.textMuted, fontSize: '0.96rem', lineHeight: 1.8, margin: 0 }}>
            Small trays: 48 hours is usually enough. Full spreads or events over 30 guests: please give us 5-7 days so we can plan
            prep, staffing and delivery properly. Need something sooner? Call us — we&apos;ll always try to help.
          </p>
        </Card>
      </Section>

      {/* Popular dishes — cross-link into the full dish pages for tray inspiration */}
      <Section bg={COLORS.bgAlt}>
        <SectionHeading
          eyebrow="Tray inspiration"
          eyebrowIcon={UtensilsCrossed}
          title="Popular Dishes"
          titleAccent="for Your Event"
          description="Not sure what to put on the tray? These are guest favorites from the full menu — click through for details, or mix and match when you enquire."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px', marginBottom: '28px' }}>
          {popularDishes.map((dish) => (
            <Link
              key={dish.slug}
              href={`/menu/${dish.slug}`}
              style={{
                display: 'block',
                padding: '22px',
                borderRadius: '12px',
                border: `1px solid ${COLORS.goldBorder}`,
                background: 'rgba(255,255,255,0.02)',
                textDecoration: 'none'
              }}
            >
              <span style={{ fontFamily, fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'block', marginBottom: '8px' }}>{dish.name}</span>
              <span style={{ color: COLORS.textMuted, fontSize: '0.88rem', lineHeight: 1.6, display: 'block' }}>{dish.description}</span>
            </Link>
          ))}
        </div>
        <SecondaryButton href="/menu" icon={Utensils}>View Full Menu</SecondaryButton>
      </Section>

      {/* Enquiry form */}
      <Section id="catering-form" bg={COLORS.bgAlt} padding="90px 0 100px" borderBottom={false}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'clamp(36px, 5vw, 80px)',
            alignItems: 'start',
            marginBottom: '80px'
          }}
        >
          <div>
            <SectionHeading eyebrow="Tell us about your event" title="Get a" titleAccent="Catering Quote" description="Share your event date and headcount and our kitchen team will follow up with menu options and pricing." />
          </div>
          <FormCard eyebrow="Catering Enquiry" title="Request a Quote" description="We'll respond with menu options and a firm price.">
            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.15)', border: `1px solid ${COLORS.gold}`, color: COLORS.gold, display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                  <Check size={32} />
                </div>
                <h4 style={{ fontFamily, fontSize: '1.6rem', color: '#fff', margin: '0 0 10px' }}>Enquiry Received</h4>
                <p style={{ color: '#aaa', fontSize: '0.94rem', marginBottom: '24px' }}>
                  Thanks for reaching out. Our kitchen team will follow up about your event shortly.
                </p>
                <PrimaryButton onClick={() => setSuccess(false)}>Send Another Enquiry</PrimaryButton>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'grid', gap: '18px' }} noValidate>
                {error && (
                  <div style={{ padding: '12px 16px', background: 'rgba(230, 90, 90, 0.12)', border: '1px solid rgba(230, 90, 90, 0.4)', borderRadius: '8px', color: '#ffb2b2', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                  <div>
                    <label htmlFor="catering-name" style={labelStyle}>Full Name <span style={{ color: COLORS.gold }}>*</span></label>
                    <input id="catering-name" name="name" value={form.name} onChange={update} required style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="catering-phone" style={labelStyle}>Phone Number</label>
                    <input id="catering-phone" type="tel" name="phone" value={form.phone} onChange={update} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label htmlFor="catering-email" style={labelStyle}>Email Address <span style={{ color: COLORS.gold }}>*</span></label>
                  <input id="catering-email" type="email" name="email" value={form.email} onChange={update} required style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                  <div>
                    <label htmlFor="catering-eventDate" style={labelStyle}>Event Date</label>
                    <input id="catering-eventDate" type="date" name="eventDate" value={form.eventDate} onChange={update} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="catering-headcount" style={labelStyle}>Headcount</label>
                    <input id="catering-headcount" type="number" min="1" name="headcount" placeholder="e.g. 25" value={form.headcount} onChange={update} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label htmlFor="catering-message" style={labelStyle}>Tell Us About Your Event <span style={{ color: COLORS.gold }}>*</span></label>
                  <textarea id="catering-message" name="message" rows={4} placeholder="Event type, menu preferences, delivery or pickup..." value={form.message} onChange={update} required style={textareaStyle} />
                </div>
                <PrimaryButton type="submit" disabled={submitting} icon={ArrowRight} style={{ width: '100%', marginTop: '8px' }}>
                  {submitting ? 'Sending Enquiry...' : 'Request Catering Quote'}
                </PrimaryButton>
                <p style={{ margin: 0, color: '#888', fontSize: '0.78rem', textAlign: 'center' }}>
                  Prefer to talk it through? Call <a href="tel:+13132863586" style={{ color: COLORS.gold }}>(313) 286-3586</a>.
                </p>
              </form>
            )}
          </FormCard>
        </div>

        {/* FAQs */}
        <SectionHeading eyebrow="Good to know" title="Catering" titleAccent="FAQs" />
        <div style={{ maxWidth: '820px' }}>
          {faqs.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
