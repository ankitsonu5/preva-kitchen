"use client";

import { useState } from 'react';
import Swal from 'sweetalert2';
import { RESERVATION_GUEST_OPTIONS } from '@/lib/reservation-options';
import { ArrowRight, CalendarDays, Clock3, Mail, Phone, Sparkles, User, UsersRound } from 'lucide-react';

const BOOKING_PURPOSES = [
  'Birthday', 'Anniversary', 'Date Night', 'Family Dinner',
  'Business Meal', 'Celebration', 'Just Because', 'Other'
];

// The "Make A Reservation" form. Shared by the home page and /reservations so
// both show (and submit) exactly the same booking form.
export default function BookingSection() {
  const [booking, setBooking] = useState({ name: '', email: '', phone: '', purpose: '', date: '', time: '', guests: '2', hp_field: '' });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  // "Other" in the purpose dropdown reveals this free-text field instead of
  // replacing the dropdown outright — keeps a category for the common cases
  // without losing the ability to type something specific.
  const [purposeOther, setPurposeOther] = useState('');

  const updateBooking = (field) => (event) => {
    setBooking((current) => ({ ...current, [field]: event.target.value }));
  };

  const swalBase = {
    background: '#1a0d10',
    color: '#f6f2ec',
    confirmButtonColor: '#d5a44f',
    iconColor: '#d5a44f',
    customClass: {
      popup:  'swal-preva-popup',
      title:  'swal-preva-title',
      htmlContainer: 'swal-preva-body',
      confirmButton: 'swal-preva-btn',
    },
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    const effectivePurpose = (booking.purpose === 'Other' ? purposeOther : booking.purpose).trim();
    if (!booking.name.trim()) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Name required', text: 'Please enter your name.' });
      return;
    }
    if (!booking.phone.trim()) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Phone required', text: 'Please enter your phone number.' });
      return;
    }
    if (!booking.email.trim()) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Email required', text: 'Please enter your email address so we can send your confirmation.' });
      return;
    }
    if (!effectivePurpose) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Booking purpose required', text: 'Please tell us the purpose of your reservation.' });
      return;
    }
    if (!booking.date || !booking.time) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Date & Time required', text: 'Please select a date and time.' });
      return;
    }

    setBookingSubmitting(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: booking.name.trim(),
          email: booking.email.trim(),
          phone: booking.phone.trim(),
          occasion: effectivePurpose,
          date: booking.date,
          time: booking.time,
          guests: Number(booking.guests),
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          hp_field: booking.hp_field
        })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || result?.error || 'Unable to send your reservation request.');
      }
    } catch (error) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: 'Could not send request',
        text: error?.message || 'Please try again or call us directly.'
      });
      return;
    } finally {
      setBookingSubmitting(false);
    }

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
    const dateFormatted = new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: `Thank you, ${booking.name}! 🎉`,
      html: `
        <div style="text-align:left; line-height:1.7; font-size:0.95rem; color:#e8ddd6; font-family: var(--font-roboto), Arial, sans-serif;">
          <p style="margin:0 0 12px;">Your reservation request has been received!</p>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0; width:80px;">📅 Date</td><td>${dateFormatted}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">🕐 Time</td><td>${escapeHtml(booking.time)}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">👥 Guests</td><td>${escapeHtml(booking.guests)} ${Number(booking.guests) === 1 ? 'Person' : 'People'}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">✨ Purpose</td><td>${escapeHtml(effectivePurpose)}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">📞 Phone</td><td>${escapeHtml(booking.phone)}</td></tr>
          </table>
          <p style="margin:14px 0 0; font-size:0.84rem; color:#b0a8a2;">We'll call you to confirm. See you soon!</p>
        </div>
      `,
      confirmButtonText: 'Done ✓',
      width: '460px',
    });
    setBooking({ name: '', email: '', phone: '', purpose: '', date: '', time: '', guests: '2', hp_field: '' });
    setPurposeOther('');
  };


  return (
      <section className="pk-ref-booking" id="prv-reservations" aria-labelledby="pk-ref-booking-title">
        <div className="pk-ref-wrap">
          <div className="pk-ref-booking-card pk-ref-booking-card--split">
            {/* Left Column — Form */}
            <div className="pk-ref-booking-split-left">
              <div className="pk-ref-booking-intro">
                <div className="pk-ref-booking-copy">
                  <p className="pk-ref-script">Book Your Table</p>
                  <h2 id="pk-ref-booking-title">Make A Reservation</h2>
                  <p>Plan ahead and enjoy a relaxed dining experience. Fill in your details below and we&apos;ll confirm your table.</p>
                </div>
              </div>

              <form className="pk-ref-booking-form-split" onSubmit={submitBooking}>
                <input
                  type="text"
                  name="hp_field"
                  value={booking.hp_field}
                  onChange={(e) => setBooking((current) => ({ ...current, hp_field: e.target.value }))}
                  tabIndex="-1"
                  autoComplete="off"
                  aria-hidden="true"
                  data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" style={{ display: 'none' }}
                />
                <div className="pk-ref-booking-contact-row">
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><User size={12} /> Your Name</span>
                    <input
                      className="pk-ref-booking-input"
                      type="text"
                      placeholder="e.g. John Smith"
                      value={booking.name}
                      onChange={updateBooking('name')}
                      aria-label="Your name"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><Phone size={12} /> Phone Number</span>
                    <input
                      className="pk-ref-booking-input"
                      type="tel"
                      placeholder="e.g. (313) 000-0000"
                      value={booking.phone}
                      onChange={updateBooking('phone')}
                      aria-label="Phone number"
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>

                <div className="pk-ref-booking-group">
                  <span className="pk-ref-booking-label"><Mail size={12} /> Email Address</span>
                  <input
                    className="pk-ref-booking-input"
                    type="email"
                    placeholder="e.g. contact@example.com"
                    value={booking.email}
                    onChange={updateBooking('email')}
                    aria-label="Email address"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="pk-ref-booking-group">
                  <span className="pk-ref-booking-label"><Sparkles size={12} /> Booking Purpose</span>
                  <select
                    className="pk-ref-booking-input"
                    value={booking.purpose}
                    onChange={updateBooking('purpose')}
                    aria-label="Booking purpose"
                    required
                  >
                    <option value="">Select a purpose</option>
                    {BOOKING_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {booking.purpose === 'Other' && (
                    <input
                      className="pk-ref-booking-input"
                      type="text"
                      style={{ marginTop: '8px' }}
                      placeholder="Tell us the occasion"
                      value={purposeOther}
                      onChange={(event) => setPurposeOther(event.target.value)}
                      aria-label="Describe booking purpose"
                      maxLength={80}
                      required
                    />
                  )}
                </div>

                <div className="pk-ref-booking-row-split">
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><CalendarDays size={12} /> Date</span>
                    <input
                      className="pk-ref-booking-input"
                      type="date"
                      value={booking.date}
                      onChange={updateBooking('date')}
                      aria-label="Reservation date"
                    />
                  </div>
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><Clock3 size={12} /> Time</span>
                    <select className="pk-ref-booking-input" value={booking.time} onChange={updateBooking('time')} aria-label="Reservation time">
                      <option value="">Select Time</option>
                      {['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'].map((time) => <option key={time}>{time}</option>)}
                    </select>
                  </div>
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><UsersRound size={12} /> Guests</span>
                    <select className="pk-ref-booking-input" value={booking.guests} onChange={updateBooking('guests')} aria-label="Number of guests">
                      {RESERVATION_GUEST_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g} {g === 1 ? 'Person' : 'People'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="pk-ref-button pk-ref-button--gold pk-ref-booking-submit" style={{ width: '100%', marginTop: '4px' }} disabled={bookingSubmitting}>
                  {bookingSubmitting ? 'Sending Request...' : 'Find A Table'} <ArrowRight size={16} />
                </button>
              </form>
            </div>

            {/* Right Column — Luxury Atmosphere Visual */}
            <div className="pk-ref-booking-split-right">
              <div className="pk-ref-booking-media">
                <img
                  src="/asset/reservation-dining.jpg?v=diverse-neighborhood-dining-v2"
                  alt="Guests enjoying dinner together at Preva Kitchen in Redford Township"
                  className="pk-ref-booking-img"
                />
                <div className="pk-ref-booking-media-overlay" />
                <div className="pk-ref-booking-media-badge">
                  <span className="pk-ref-booking-badge-tag">REDFORD, MI · PREVA KITCHEN</span>
                  <span className="pk-ref-booking-badge-title">Dinner &amp; Warm Hospitality</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
