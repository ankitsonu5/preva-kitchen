'use client';

import { useState } from 'react';
import { X, Check, Calendar, Users, Clock, Sparkles } from 'lucide-react';
import { showToast, showError } from '@/lib/swal';

const TIME_SLOTS = [
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
];

const OCCASIONS = [
  'Private Dining & Suite',
  'Dinner Table',
  'Family Celebration',
  'Birthday Party',
  'Corporate Dinner / Lunch',
  'Anniversary / Date Night',
  'Exclusive VIP Event'
];

export default function ReservationModal({ isOpen, onClose, initialOccasion = 'Private Dining & Suite' }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState(4);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('7:00 PM');
  const [occasion, setOccasion] = useState(initialOccasion);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showError('Details required', 'Please provide your full name and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          guests: Number(guests) || 2,
          date,
          time,
          occasion: occasion || 'Private Suite',
          notes: notes.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not place reservation.');
      }

      setSuccess(true);
      showToast('Reservation requested successfully!', 'success');
    } catch (err) {
      showError('Booking error', err.message || 'Something went wrong. Please call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #181412 0%, #0E0C0B 100%)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          borderRadius: '20px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          position: 'relative',
          padding: 'clamp(24px, 4vw, 36px)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(201, 168, 76, 0.2)',
          color: '#fff'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close reservation modal"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#aaa',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = 'rgba(201, 168, 76, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#aaa';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <X size={18} />
        </button>

        {!success ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C9A84C', fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                <Sparkles size={14} /> Preva Kitchen & Lounge
              </div>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
                Table & Suite Reservation
              </h2>
              <p style={{ fontSize: '13px', color: '#999', margin: 0, lineHeight: 1.5 }}>
                Reserve private suites, dining tables, or exclusive event spaces at 13090 Inkster Rd, Redford.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
              {/* Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                    FULL NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                    PHONE NUMBER *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. (313) 286-3586"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                  EMAIL ADDRESS (OPTIONAL)
                </label>
                <input
                  type="email"
                  placeholder="e.g. contact@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Date, Time & Guests */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                    DATE *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                    TIME
                  </label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t} style={{ background: '#181412', color: '#fff' }}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                    GUESTS
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((g) => (
                      <option key={g} value={g} style={{ background: '#181412', color: '#fff' }}>
                        {g} {g === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Occasion / Experience */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                  EXPERIENCE / OCCASION
                </label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                >
                  {OCCASIONS.map((occ) => (
                    <option key={occ} value={occ} style={{ background: '#181412', color: '#fff' }}>
                      {occ}
                    </option>
                  ))}
                </select>
              </div>

              {/* Special Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#C9A84C', fontWeight: 700, marginBottom: 5 }}>
                  SPECIAL REQUESTS OR DIETARY PREFERENCES
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell us any special requests, suite seating preference, or celebration details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  height: 48,
                  marginTop: 6,
                  border: 'none',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #F0D080 0%, #C9A84C 100%)',
                  color: '#000',
                  fontSize: '13.5px',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(201, 168, 76, 0.35)',
                  transition: 'opacity 0.2s'
                }}
              >
                {submitting ? 'RESERVE NOW...' : 'CONFIRM RESERVATION →'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 8px 10px' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(201, 168, 76, 0.15)',
                border: '2px solid #C9A84C',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 18px',
                color: '#C9A84C'
              }}
            >
              <Check size={36} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
              Reservation Requested!
            </h3>
            <p style={{ fontSize: '14px', color: '#bbb', lineHeight: 1.6, maxWidth: 380, margin: '0 auto 20px' }}>
              Thank you, <b style={{ color: '#fff' }}>{name}</b>! We received your reservation for <b style={{ color: '#C9A84C' }}>{guests} guests</b> on <b style={{ color: '#C9A84C' }}>{date} at {time}</b>. Our host will confirm via phone shortly.
            </p>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #F0D080 0%, #C9A84C 100%)',
                color: '#000',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  height: 42,
  background: '#110E0D',
  border: '1px solid rgba(201, 168, 76, 0.25)',
  borderRadius: 8,
  color: '#fff',
  fontSize: '13px',
  padding: '0 12px',
  outline: 'none',
  boxSizing: 'border-box'
};
