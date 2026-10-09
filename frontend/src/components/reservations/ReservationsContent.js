"use client";

import { Calendar, Users, Cake, Sparkles, MapPin, Clock, Phone } from 'lucide-react';
import BookingSection from '@/components/home/BookingSection';
import {
  PageShell,
  PageHero,
  Section,
  SectionHeading,
  Container,
  Card,
  FaqItem,
  PrimaryButton,
  SecondaryButton,
  COLORS,
  fontFamily
} from '@/components/site-page/PageKit';

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

      {/* Same booking form as the home page */}
      <div id="reserve-form" className="pk-ref-home">
        <BookingSection />
      </div>

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
