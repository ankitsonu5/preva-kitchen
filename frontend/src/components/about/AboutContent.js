import Link from 'next/link';
import { Sparkles, MapPin, ChefHat, Utensils, Clock, Phone } from 'lucide-react';
import {
  PageShell,
  PageHero,
  Section,
  SectionHeading,
  Card,
  PrimaryButton,
  SecondaryButton,
  COLORS
} from '@/components/site-page/PageKit';

export default function AboutContent() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Preva Kitchen · Redford, Michigan"
        eyebrowIcon={Sparkles}
        title="A Passion for Flavor,"
        titleAccent="A Love for Redford Township"
        subtitle="Preva Kitchen is a chef-driven kitchen on Inkster Rd, cooking comfort food fresh for dine-in, pickup, delivery and catering."
      >
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <PrimaryButton href="/menu" icon={Utensils}>See the menu</PrimaryButton>
          <SecondaryButton href="/reservations" icon={Clock}>Reserve a table</SecondaryButton>
        </div>
      </PageHero>

      {/* Our story */}
      <Section bg={COLORS.bgDeep}>
        <SectionHeading eyebrow="Where it started" eyebrowIcon={MapPin} title="Our Story on" titleAccent="Inkster Rd" />
        <div style={{ maxWidth: '820px', display: 'grid', gap: '18px' }}>
          <p style={{ color: COLORS.textMuted, fontSize: '1rem', lineHeight: 1.85, margin: 0 }}>
            Preva Kitchen sits at 13090 Inkster Rd in Redford Township, cooking comfort food for a neighbourhood that shows up night
            after night. The idea has always been simple: fresh ingredients, real technique, and plates that feel like they were made
            for you specifically — whether you&apos;re dining in, picking up, or feeding a whole party through catering.
          </p>
          <p style={{ color: COLORS.textMuted, fontSize: '1rem', lineHeight: 1.85, margin: 0 }}>
            The menu draws on American comfort food, Southern cooking, seafood and Caribbean flavor — wings, steak bites, pasta,
            burgers and more — built around what the kitchen does best: consistent, satisfying food, every service.
          </p>
        </div>
      </Section>

      {/* Meet the team */}
      <Section bg={COLORS.bgAlt}>
        <SectionHeading eyebrow="Behind the line" eyebrowIcon={ChefHat} title="Meet the" titleAccent="Kitchen Team" />
        <Card style={{ maxWidth: '820px' }}>
          <p style={{ color: COLORS.textMuted, fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
            Our kitchen team preps and cooks every order fresh, service after service. We&apos;re working on introducing the people
            behind the line — real names and photos are coming soon. For now, know that every plate that leaves this kitchen has
            someone&apos;s full attention behind it.
          </p>
        </Card>
      </Section>

      {/* How we cook */}
      <Section bg={COLORS.bgDeep}>
        <SectionHeading eyebrow="Our approach" eyebrowIcon={Utensils} title="How We" titleAccent="Cook" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '24px' }}>
          <Card>
            <h3 style={{ color: '#fff', fontSize: '1.15rem', margin: '0 0 10px', textTransform: 'uppercase' }}>Made Fresh Daily</h3>
            <p style={{ color: '#aaa', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>Every dish is prepped and cooked to order — nothing sits around waiting for a ticket.</p>
          </Card>
          <Card>
            <h3 style={{ color: '#fff', fontSize: '1.15rem', margin: '0 0 10px', textTransform: 'uppercase' }}>Comfort First</h3>
            <p style={{ color: '#aaa', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>American, Southern, seafood and Caribbean influences come together around one goal: food that satisfies.</p>
          </Card>
          <Card>
            <h3 style={{ color: '#fff', fontSize: '1.15rem', margin: '0 0 10px', textTransform: 'uppercase' }}>Built for Every Occasion</h3>
            <p style={{ color: '#aaa', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>Dine-in, pickup, delivery or a full catering spread — the same kitchen, the same standard.</p>
          </Card>
        </div>
      </Section>

      {/* Serving Redford Township etc */}
      <Section bg={COLORS.bgAlt}>
        <SectionHeading
          eyebrow="Our neighbourhood"
          eyebrowIcon={MapPin}
          title="Serving Redford Township,"
          titleAccent="Old Redford & Livonia"
          description="Preva Kitchen is proud to be part of the Redford Township community — and to welcome guests from Old Redford, Livonia and beyond."
        />
      </Section>

      {/* Visit or order */}
      <Section bg={COLORS.bgDeep} padding="80px 0 120px" borderBottom={false}>
        <SectionHeading eyebrow="Come see us" title="Visit or" titleAccent="Order" />
        <Card style={{ maxWidth: '820px' }}>
          <p style={{ color: COLORS.textMuted, fontSize: '0.98rem', lineHeight: 1.8, margin: '0 0 22px' }}>
            <strong style={{ color: '#fff' }}>Preva Kitchen</strong><br />
            13090 Inkster Rd, Redford Township, MI 48239<br />
            Dine-In: Tuesday – Sunday, 5:00 PM – 10:00 PM<br />
            Pickup &amp; Delivery: Monday – Friday, 11:00 AM – 3:30 PM<br />
            <a href="tel:+13132863586" style={{ color: COLORS.gold, textDecoration: 'none' }}>(313) 286-3586</a>
          </p>
          <p style={{ color: COLORS.textMuted, fontSize: '0.98rem', lineHeight: 1.8, margin: '0 0 22px' }}>
            Visit us on Inkster Rd, or{' '}
            <Link href="/contact" style={{ color: COLORS.gold }}>get in touch</Link> for directions, private
            events or any question before you order.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <PrimaryButton href="/menu" icon={Utensils}>Order Online</PrimaryButton>
            <SecondaryButton href="/reservations" icon={Clock}>Reserve a Table</SecondaryButton>
            <SecondaryButton href="tel:+13132863586" icon={Phone}>Call the Kitchen</SecondaryButton>
          </div>
        </Card>
      </Section>
    </PageShell>
  );
}
