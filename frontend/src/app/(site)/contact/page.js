"use client";

import { useState } from 'react';
import Link from 'next/link';
import SvgIcon from '../../../components/SvgIcon';
import { showError, showSuccess, showWarning } from '../../../lib/swal';
import { Phone, Clock, MapPin, Sparkles, Utensils, Calendar, Mail, ArrowRight, Check, MessageSquare } from 'lucide-react';

const API = '/api';
const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', inquiry: 'general',
  eventDate: '', guests: '', message: '', consent: false
};

const contactOptions = [
  {
    number: '01',
    icon: Calendar,
    title: 'Table Reservations',
    body: 'Planning dinner, a date night, or celebrating a milestone? Send a request and our team will confirm your table.',
    href: '/preva-kitchen#reservations',
    cta: 'Reserve a table'
  },
  {
    number: '02',
    icon: Utensils,
    title: 'Catering & Private Dining',
    body: 'Custom party trays, corporate lunches, and celebration feasts prepared fresh for your guests.',
    href: '/menu',
    cta: 'Explore catering menu'
  },
  {
    number: '03',
    icon: Phone,
    title: 'Order Support & Inquiries',
    body: 'Need assistance with an active pickup or online order? Calling the kitchen directly is always fastest.',
    href: 'tel:+13132863586',
    cta: 'Call (313) 286-3586'
  }
];

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.firstName || !form.email || !form.message || !form.consent) {
      setError('Please complete the required fields and accept the contact notice.');
      showWarning('Complete required fields', 'Add your name, email and message, then accept the contact notice.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: [form.firstName, form.lastName].filter(Boolean).join(' '),
        email: form.email,
        phone: form.phone,
        subject: form.inquiry,
        message: form.message,
        formSource: 'Preva Kitchen Contact Page',
        pageUrl: window.location.href
      };
      const response = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Message could not be sent');
      setSuccess(true);
      setForm(EMPTY_FORM);
      showSuccess('Message received', 'Thanks for reaching out. Our kitchen team will be in touch shortly.');
    } catch (submitError) {
      console.error(submitError);
      setError('We could not send your message. Please call (313) 286-3586 or try again.');
      showError('Message not sent', 'Please try again or call the kitchen at (313) 286-3586.');
    } finally {
      setSubmitting(false);
    }
  };

  const showEventFields = ['reservation', 'group-dining', 'catering'].includes(form.inquiry);

  return (
    <main style={{ background: '#070507', color: '#f5f1e8', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* ── 1. HERO SECTION ── */}
      <section
        style={{
          position: 'relative',
          padding: '140px 0 80px',
          background: 'radial-gradient(ellipse at 15% 25%, rgba(213, 164, 79, 0.1) 0%, transparent 60%), #090709',
          borderBottom: '1px solid rgba(213, 164, 79, 0.2)'
        }}
      >
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 'clamp(32px, 5vw, 64px)',
              alignItems: 'center'
            }}
          >
            {/* Left Hero Copy */}
            <div>
              {/* Eyebrow */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#c5a059',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: '16px'
                }}
              >
                <Sparkles size={15} />
                <span>PREVA KITCHEN · REDFORD, MICHIGAN</span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontFamily: 'var(--font-roboto), Arial, sans-serif',
                  fontSize: 'clamp(2.6rem, 4.6vw, 4.2rem)',
                  lineHeight: 1.1,
                  color: '#fff',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  margin: '0 0 16px 0',
                  textTransform: 'uppercase'
                }}
              >
                Talk to the <br />
                <span style={{ color: '#c5a059', fontStyle: 'italic', textTransform: 'none' }}>Kitchen.</span>
              </h1>

              {/* Sparkles Ornament */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  color: '#c5a059'
                }}
                aria-hidden="true"
              >
                <i style={{ width: '42px', height: '1px', background: 'currentColor' }} />
                <Sparkles size={16} />
                <i style={{ width: '42px', height: '1px', background: 'currentColor' }} />
              </div>

              {/* Subtitle */}
              <p style={{ fontSize: '1.02rem', lineHeight: 1.8, color: '#aaa398', margin: '0 0 32px 0', maxWidth: '540px' }}>
                Reservations, catering orders, menu questions or feedback—tell us what you need and our team will get right back to you.
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <a
                  href="tel:+13132863586"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    height: '52px',
                    padding: '0 32px',
                    background: 'linear-gradient(135deg, #a6133b, #761024)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: '999px',
                    textDecoration: 'none',
                    boxShadow: '0 10px 28px rgba(166, 19, 59, 0.35)',
                    transition: 'transform 0.2s ease, background 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #bd1b49, #8f0e2d)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #a6133b, #761024)'; }}
                >
                  <Phone size={16} /> Call (313) 286-3586
                </a>

                <Link
                  href="/menu"
                  style={{
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
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c5a059'; e.currentTarget.style.background = 'rgba(213, 164, 79, 0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.4)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                >
                  Order Online <ArrowRight size={15} />
                </Link>
              </div>

              {/* Meta info */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', color: '#999', fontSize: '0.86rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="#c5a059" /> Tue–Sun · 5pm–10pm
                </span>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Preva+Kitchen,+13090+Inkster+Rd,+Redford+Township,+MI+48239,+United+States"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c5a059', textDecoration: 'none' }}
                >
                  <MapPin size={16} color="#c5a059" /> 13090 Inkster Rd, Redford Township, MI 48239
                </a>
              </div>
            </div>

            {/* Right Hero Location Map */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: '440px',
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
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    minHeight: '440px',
                    border: 0,
                    display: 'block'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. THREE CONTACT PILLARS ── */}
      <section style={{ padding: '80px 0', background: '#090709', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '24px'
            }}
          >
            {contactOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <article
                  key={option.number}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '32px 28px',
                    borderRadius: '16px',
                    background: 'linear-gradient(145deg, #120e11 0%, #0d090c 100%)',
                    border: '1px solid rgba(213, 164, 79, 0.22)',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
                    transition: 'transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.6)';
                    e.currentTarget.style.boxShadow = '0 22px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(213, 164, 79, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.22)';
                    e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.4)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(213, 164, 79, 0.12)',
                        border: '1px solid rgba(213, 164, 79, 0.35)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#c5a059'
                      }}
                    >
                      <IconComponent size={22} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '2rem', color: 'rgba(213, 164, 79, 0.25)', fontWeight: 600 }}>
                      {option.number}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-roboto), Arial, sans-serif',
                      fontSize: '1.35rem',
                      color: '#fff',
                      margin: '0 0 12px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {option.title}
                  </h3>

                  <p style={{ color: '#aaa', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 24px', flexGrow: 1 }}>
                    {option.body}
                  </p>

                  <Link
                    href={option.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#c5a059',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      marginTop: 'auto',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#c5a059'; }}
                  >
                    {option.cta} <ArrowRight size={15} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. MAIN FORM & LOCATION DETAILS ── */}
      <section style={{ padding: '90px 0 120px', background: 'radial-gradient(circle at 80% 50%, rgba(213, 164, 79, 0.06), transparent 40%), #060406' }}>
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 'clamp(36px, 5vw, 80px)',
              alignItems: 'start'
            }}
          >
            {/* Left Location & Hours Info */}
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#c5a059', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '14px' }}>
                <MapPin size={14} /> VISIT PREVA KITCHEN
              </span>

              <h2
                style={{
                  fontFamily: 'var(--font-roboto), Arial, sans-serif',
                  fontSize: 'clamp(2.2rem, 3.8vw, 3.4rem)',
                  color: '#fff',
                  lineHeight: 1.1,
                  margin: '0 0 32px',
                  textTransform: 'uppercase'
                }}
              >
                Come Hungry. <br />
                <span style={{ color: '#c5a059', fontStyle: 'italic', textTransform: 'none' }}>Leave Happy.</span>
              </h2>

              <div style={{ display: 'grid', gap: '22px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '28px' }}>
                {/* Detail 1: Address */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(213, 164, 79, 0.1)', display: 'grid', placeItems: 'center', color: '#c5a059' }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#c5a059', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                      LOCATION &amp; PARKING
                    </span>
                    <p style={{ margin: 0, color: '#d5d0c8', fontSize: '0.94rem', lineHeight: 1.6 }}>
                      Preva Kitchen<br />13090 Inkster Rd<br />Redford Township, MI 48239, United States
                    </p>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Preva+Kitchen,+13090+Inkster+Rd,+Redford+Township,+MI+48239,+United+States"
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#c5a059', fontSize: '0.82rem', fontWeight: 700, marginTop: '8px', textDecoration: 'none' }}
                    >
                      Get Directions <ArrowRight size={13} />
                    </a>
                  </div>
                </div>

                {/* Detail 2: Hours */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(213, 164, 79, 0.1)', display: 'grid', placeItems: 'center', color: '#c5a059' }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#c5a059', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                      SERVICE HOURS
                    </span>
                    <p style={{ margin: 0, color: '#d5d0c8', fontSize: '0.94rem', lineHeight: 1.6 }}>
                      Tuesday – Sunday: <strong>5:00 PM – 10:00 PM</strong><br />
                      <small style={{ color: '#888' }}>Monday: Closed for private prep</small>
                    </p>
                  </div>
                </div>

                {/* Detail 3: Phone & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(213, 164, 79, 0.1)', display: 'grid', placeItems: 'center', color: '#c5a059' }}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#c5a059', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                      DIRECT CONTACT
                    </span>
                    <p style={{ margin: 0, color: '#d5d0c8', fontSize: '0.94rem', lineHeight: 1.6 }}>
                      Phone: <a href="tel:+13132863586" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>(313) 286-3586</a><br />
                      Email: <a href="mailto:info@prevaclub.com" style={{ color: '#c5a059', textDecoration: 'none' }}>info@prevaclub.com</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Contact Form Card */}
            <div
              style={{
                background: 'linear-gradient(145deg, #140f13 0%, #0d090c 100%)',
                border: '1px solid rgba(213, 164, 79, 0.28)',
                borderRadius: '20px',
                padding: 'clamp(28px, 4vw, 44px)',
                boxShadow: '0 30px 90px rgba(0, 0, 0, 0.6)',
                position: 'relative'
              }}
            >
              <div style={{ paddingBottom: '24px', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ color: '#c5a059', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  SEND A MESSAGE
                </span>
                <h3 style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '1.85rem', color: '#fff', margin: '0 0 6px', textTransform: 'uppercase' }}>
                  How can we help?
                </h3>
                <p style={{ margin: 0, color: '#999', fontSize: '0.9rem' }}>
                  Complete the form below and our kitchen team will reply promptly.
                </p>
              </div>

              {success ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.15)', border: '1px solid #c5a059', color: '#c5a059', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                    <Check size={32} />
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '1.6rem', color: '#fff', margin: '0 0 10px' }}>
                    Message Received
                  </h4>
                  <p style={{ color: '#aaa', fontSize: '0.94rem', marginBottom: '24px' }}>
                    Thank you for reaching out. Our kitchen team will be in touch shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    style={{
                      height: '46px',
                      padding: '0 28px',
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, #a6133b, #761024)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} style={{ display: 'grid', gap: '18px' }} noValidate>
                  {error && (
                    <div style={{ padding: '12px 16px', background: 'rgba(230, 90, 90, 0.12)', border: '1px solid rgba(230, 90, 90, 0.4)', borderRadius: '8px', color: '#ffb2b2', fontSize: '0.85rem' }}>
                      {error}
                    </div>
                  )}

                  {/* Name Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                        First Name <span style={{ color: '#c5a059' }}>*</span>
                      </label>
                      <input
                        name="firstName"
                        value={form.firstName}
                        onChange={update}
                        required
                        style={{
                          width: '100%',
                          height: '48px',
                          padding: '0 16px',
                          background: '#090709',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-roboto), Arial, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                        Last Name
                      </label>
                      <input
                        name="lastName"
                        value={form.lastName}
                        onChange={update}
                        style={{
                          width: '100%',
                          height: '48px',
                          padding: '0 16px',
                          background: '#090709',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-roboto), Arial, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                        Email Address <span style={{ color: '#c5a059' }}>*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={update}
                        required
                        style={{
                          width: '100%',
                          height: '48px',
                          padding: '0 16px',
                          background: '#090709',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-roboto), Arial, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={update}
                        style={{
                          width: '100%',
                          height: '48px',
                          padding: '0 16px',
                          background: '#090709',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-roboto), Arial, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Inquiry Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                      Inquiry Topic <span style={{ color: '#c5a059' }}>*</span>
                    </label>
                    <select
                      name="inquiry"
                      value={form.inquiry}
                      onChange={update}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 16px',
                        background: '#090709',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-roboto), Arial, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="general">General Question</option>
                      <option value="reservation">Table Reservation</option>
                      <option value="group-dining">Group Dining / Special Event</option>
                      <option value="catering">Catering &amp; Party Trays</option>
                      <option value="order-support">Online Order Support</option>
                      <option value="menu">Menu / Dietary Inquiry</option>
                      <option value="career">Careers &amp; Employment</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                      Your Message <span style={{ color: '#c5a059' }}>*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={4}
                      placeholder="Tell us how we can assist you..."
                      value={form.message}
                      onChange={update}
                      required
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: '#090709',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-roboto), Arial, sans-serif',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: '110px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      name="consent"
                      id="contact-consent"
                      checked={form.consent}
                      onChange={update}
                      style={{ width: '18px', height: '18px', accentColor: '#a6133b', cursor: 'pointer' }}
                    />
                    <label htmlFor="contact-consent" style={{ color: '#999', fontSize: '0.82rem', cursor: 'pointer' }}>
                      I agree that Preva Kitchen may contact me regarding this request.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: '100%',
                      height: '52px',
                      background: 'linear-gradient(135deg, #a6133b, #761024)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '999px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: submitting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 28px rgba(166, 19, 59, 0.35)',
                      transition: 'transform 0.2s ease, background 0.2s ease',
                      marginTop: '8px'
                    }}
                    onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #bd1b49, #8f0e2d)'; } }}
                    onMouseLeave={(e) => { if (!submitting) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #a6133b, #761024)'; } }}
                  >
                    <span>{submitting ? 'Sending to Kitchen...' : 'Send to the Kitchen'}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
