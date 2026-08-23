"use client";

import { useState } from 'react';
import SvgIcon from '../SvgIcon';
import { showError, showSuccess, showWarning } from '../../lib/swal';

const API = '/api';
const TODAY = new Date().toISOString().split('T')[0];

const SERVICE_TYPES = {
  group: { label: 'Group Dining', min: 8, defaultGuests: 10 },
  catering: { label: 'Full-Service Catering', min: 10, defaultGuests: 20 },
  trays: { label: 'Party Trays & Pickup', min: 6, defaultGuests: 12 }
};

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

function formatTime(dateTime) {
  return new Date(dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function ReservationsSection({ activeTab: controlledTab, setActiveTab, visible }) {
  const [localTab, setLocalTab] = useState('dining');
  const activeTab = controlledTab || localTab;
  const [dining, setDining] = useState({ date: '', time: '', guests: 2, seating: 'any', occasion: '', notes: '', name: '', phone: '', email: '' });
  const [event, setEvent] = useState({ service: 'group', date: '', time: '', guests: 10, menu: 'family-style', venue: 'preva', notes: '', name: '', phone: '', email: '' });
  const [diningSubmitting, setDiningSubmitting] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);

  if (visible === false) return null;

  const changeTab = (tab) => {
    setLocalTab(tab);
    setActiveTab?.(tab);
  };
  const setDiningField = (field, value) => setDining((current) => ({ ...current, [field]: value }));
  const setEventField = (field, value) => setEvent((current) => ({ ...current, [field]: value }));

  const validContact = (form) => {
    if (!form.name || !form.phone || !form.email) {
      showWarning('Incomplete Fields', 'Please fill out all required contact fields.');
      return false;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      showWarning('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return false;
    }
    return true;
  };

  const submitDining = async (e) => {
    e.preventDefault();
    if (!dining.date || !dining.time) {
      showWarning('Choose a Date & Time', 'Select when you would like to dine with us.');
      return;
    }
    if (!validContact(dining)) return;

    setDiningSubmitting(true);
    const dateTime = `${dining.date}T${dining.time}:00`;
    const details = [dining.occasion || 'Table reservation', `Seating: ${dining.seating}`, dining.notes ? `Notes: ${dining.notes}` : ''].filter(Boolean).join(' | ');

    try {
      const response = await fetch(`${API}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: dining.name, mobile: dining.phone, email: dining.email, reservationDate: dateTime, guests: dining.guests, occasion: details })
      });
      if (!response.ok) throw new Error('Reservation request failed');
      const requestNumber = `PK-${Math.floor(1000 + Math.random() * 9000)}-TABLE`;
      showSuccess('Table request received', `${requestNumber} · ${formatDate(dining.date)} at ${formatTime(dateTime)} · ${dining.guests} guests. Our team will confirm by phone or email shortly.`);
      setDining({ date: '', time: '', guests: 2, seating: 'any', occasion: '', notes: '', name: '', phone: '', email: '' });
    } catch (error) {
      console.error(error);
      showError('Could Not Submit', 'Please try again or call us at (313) 286-3586.');
    } finally {
      setDiningSubmitting(false);
    }
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    if (!event.date || !event.time || !event.menu) {
      showWarning('Complete Event Details', 'Choose an event date, time and menu style.');
      return;
    }
    if (!validContact(event)) return;

    setEventSubmitting(true);
    const service = SERVICE_TYPES[event.service];
    const dateTime = `${event.date}T${event.time}:00`;
    const details = [service.label, `Menu: ${event.menu}`, `Venue: ${event.venue}`, event.notes ? `Notes: ${event.notes}` : ''].filter(Boolean).join(' | ');

    try {
      const response = await fetch(`${API}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: event.name, mobile: event.phone, email: event.email, reservationDate: dateTime, guests: event.guests, occasion: details })
      });
      if (!response.ok) throw new Error('Event request failed');
      const requestNumber = `PK-${Math.floor(1000 + Math.random() * 9000)}-EVENT`;
      showSuccess('Event request received', `${requestNumber} · ${service.label} · ${formatDate(event.date)} at ${formatTime(dateTime)} · ${event.guests} guests. Our kitchen team will contact you about availability, menu and pricing.`);
      setEvent({ service: 'group', date: '', time: '', guests: 10, menu: 'family-style', venue: 'preva', notes: '', name: '', phone: '', email: '' });
    } catch (error) {
      console.error(error);
      showError('Could Not Submit', 'Please try again or call us at (313) 286-3586.');
    } finally {
      setEventSubmitting(false);
    }
  };

  const chooseService = (service) => {
    const config = SERVICE_TYPES[service];
    setEvent((current) => ({ ...current, service, guests: config.defaultGuests }));
  };

  return (
    <>
      <section id="prv-reservations" className="prv-gate kitchen-reservations">
        <div id="prv-gate" className="prv-gate__body">
          <div className="prv-gate__header">
            <span className="prv-gate__eyebrow">Plan Your Meal</span>
            <h3 className="prv-gate__title home-section-heading">A table for tonight. <em>Food for every gathering.</em></h3>
            <p className="prv-gate__sub">Reserve a table at Preva Kitchen or tell us about a larger meal. From an intimate dinner to office catering, our kitchen team will help shape the right menu.</p>
            <div className="prv-gate__rule" />
          </div>

          <div className="prv-mselect" role="tablist" aria-label="Choose a kitchen service">
            <button type="button" role="tab" aria-selected={activeTab === 'dining'} className={`prv-mselect__dining ${activeTab === 'dining' ? 'is-active' : ''}`} onClick={() => changeTab('dining')}>Reserve a Table</button>
            <button type="button" role="tab" aria-selected={activeTab === 'catering'} className={`prv-mselect__events ${activeTab === 'catering' ? 'is-active' : ''}`} onClick={() => changeTab('catering')}>Catering & Groups</button>
          </div>

          <div className={`prv-split show-${activeTab}`}>
            <div className="prv-divider" aria-hidden="true" />
            <div className="prv-or" aria-hidden="true">OR</div>

            <section className="prv-panel prv-panel--dining" id="prv-panel-dining" aria-label="Table reservation">
              <div className="prv-panel__inner">
                <Progress type="dining" labels={['Visit', 'Guests', 'Confirm']} />
                <div className="prv-badge prv-badge--dining"><span className="prv-badge__dot" /> Dine at Preva</div>
                <h2 className="prv-panel__heading">Reserve Your Table</h2>
                <p className="prv-panel__sub">Fresh comfort food, signature plates and warm hospitality in the heart of Redford.</p>
                <div className="prv-pills">
                  <span className="prv-pill prv-pill--dining">Tue-Sun · Dinner Service</span>
                  <span className="prv-pill prv-pill--dining"><SvgIcon name="location" size={16} /> 13090 Inkster Rd</span>
                </div>

                <form className="prv-form prv-form--dining" onSubmit={submitDining}>
                  <div className="prv-form__title">Reservation Details</div>
                  <div className="prv-row prv-row--2">
                    <Field label="Date" required><input className="prv-input" type="date" min={TODAY} value={dining.date} onChange={(e) => setDiningField('date', e.target.value)} required /></Field>
                    <Field label="Time" required><select className="prv-select" value={dining.time} onChange={(e) => setDiningField('time', e.target.value)} required><option value="">Select time...</option>{['17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'].map((time) => <option key={time} value={time}>{formatTime(`2020-01-01T${time}:00`)}</option>)}</select></Field>
                  </div>
                  <div className="prv-row prv-row--2">
                    <Field label="Guests" required><GuestStepper value={dining.guests} min={1} max={20} onChange={(value) => setDiningField('guests', value)} /></Field>
                    <Field label="Seating Preference"><select className="prv-select" value={dining.seating} onChange={(e) => setDiningField('seating', e.target.value)}><option value="any">Any available</option><option value="indoor booth">Indoor booth</option><option value="dining room">Dining room</option><option value="patio">Patio</option></select></Field>
                  </div>
                  <Field label="Occasion"><select className="prv-select" value={dining.occasion} onChange={(e) => setDiningField('occasion', e.target.value)}><option value="">Just dining</option><option>Birthday</option><option>Anniversary</option><option>Business Dinner</option><option>Family Gathering</option><option>Date Night</option></select></Field>
                  <Field label="Special Requests"><textarea className="prv-textarea" maxLength={300} placeholder="Allergies, dietary needs, accessibility or celebration details..." value={dining.notes} onChange={(e) => setDiningField('notes', e.target.value)} /></Field>
                  <ContactFields data={dining} onChange={setDiningField} />
                  <p className="prv-form-note">Submitting sends a request. Your table is confirmed after our team contacts you.</p>
                  <button className="prv-submit prv-submit--dining" type="submit" disabled={diningSubmitting}>{diningSubmitting ? 'Sending Request...' : 'Request a Table'}</button>
                </form>
              </div>
            </section>

            <section className="prv-panel prv-panel--events" id="prv-panel-events" aria-label="Catering and group dining inquiry">
              <div className="prv-panel__inner">
                <Progress type="events" labels={['Service', 'Menu', 'Quote']} />
                <div className="prv-badge prv-badge--events"><span className="prv-badge__dot" /> Made for Your Gathering</div>
                <h2 className="prv-panel__heading">Catering & Group Dining</h2>
                <p className="prv-panel__sub">Bring Preva Kitchen to birthdays, office lunches, family celebrations and larger tables.</p>
                <div className="prv-pills">
                  <span className="prv-pill prv-pill--events">Flexible group menus</span>
                  <span className="prv-pill prv-pill--events">Pickup · Delivery · Dine-in</span>
                </div>
                <div className="prv-chips" role="radiogroup" aria-label="Service type">
                  {Object.entries(SERVICE_TYPES).map(([key, service]) => <button key={key} type="button" className={`prv-chip prv-chip--events ${event.service === key ? 'is-selected' : ''}`} onClick={() => chooseService(key)}>{service.label}</button>)}
                </div>

                <form className="prv-form prv-form--events" onSubmit={submitEvent}>
                  <div className="prv-form__title">Tell Us About Your Meal</div>
                  <div className="prv-row prv-row--2">
                    <Field label="Event Date" required><input className="prv-input" type="date" min={TODAY} value={event.date} onChange={(e) => setEventField('date', e.target.value)} required /></Field>
                    <Field label="Serving Time" required><input className="prv-input" type="time" value={event.time} onChange={(e) => setEventField('time', e.target.value)} required /></Field>
                  </div>
                  <div className="prv-row prv-row--2">
                    <Field label="Estimated Guests" required><GuestStepper value={event.guests} min={SERVICE_TYPES[event.service].min} max={200} onChange={(value) => setEventField('guests', value)} /></Field>
                    <Field label="Where to Serve"><select className="prv-select" value={event.venue} onChange={(e) => setEventField('venue', e.target.value)}><option value="preva">Dine at Preva Kitchen</option><option value="delivery">Catering delivery</option><option value="pickup">Pickup from kitchen</option><option value="off-site">Off-site event service</option></select></Field>
                  </div>
                  <Field label="Menu Style" required><select className="prv-select" value={event.menu} onChange={(e) => setEventField('menu', e.target.value)} required><option value="family-style">Family-style sharing menu</option><option value="buffet">Buffet service</option><option value="boxed meals">Individual boxed meals</option><option value="party trays">Party trays</option><option value="custom">Chef-curated custom menu</option></select></Field>
                  <Field label="Event Notes"><textarea className="prv-textarea" maxLength={500} placeholder="Event type, favorite dishes, dietary needs, delivery address or budget..." value={event.notes} onChange={(e) => setEventField('notes', e.target.value)} /></Field>
                  <ContactFields data={event} onChange={setEventField} />
                  <p className="prv-form-note">No payment is taken now. We will contact you with availability and a tailored quote.</p>
                  <button className="prv-submit prv-submit--events" type="submit" disabled={eventSubmitting}>{eventSubmitting ? 'Sending Request...' : 'Plan My Event'}</button>
                </form>
              </div>
            </section>
          </div>

          <div className="prv-footer">
            <span className="prv-footer__item"><strong>Preva Kitchen</strong> Chef-driven food, made fresh</span>
            <a className="prv-footer__item" href="tel:+13132863586"><SvgIcon name="phone" size={16} /> (313) 286-3586</a>
            <span className="prv-footer__item"><SvgIcon name="location" size={16} /> 13090 Inkster Rd, Redford Township</span>
          </div>
        </div>
      </section>

    </>
  );
}

function Progress({ type, labels }) {
  return <div className={`prv-progress prv-progress--${type}`} aria-label="Request steps">{labels.map((label, index) => <span key={label} style={{ display: 'contents' }}><span className={`prv-progress__step ${index < 2 ? 'is-active' : ''}`}><span className="prv-progress__dot" /><span>{label}</span></span>{index < labels.length - 1 && <span className="prv-progress__bar" />}</span>)}</div>;
}

function Field({ label, required, children }) {
  return <div className="prv-field"><label className="prv-label">{label}{required && <span className="prv-star"> *</span>}</label>{children}</div>;
}

function GuestStepper({ value, min, max, onChange }) {
  return <div className="prv-stepper" role="group" aria-label="Number of guests"><button type="button" className="prv-stepper__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>-</button><span className="prv-stepper__val">{value}</span><button type="button" className="prv-stepper__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button></div>;
}

function ContactFields({ data, onChange }) {
  return <><div className="prv-row prv-row--2"><Field label="Full Name" required><input className="prv-input" type="text" autoComplete="name" placeholder="First & last name" value={data.name} onChange={(e) => onChange('name', e.target.value)} required /></Field><Field label="Phone" required><input className="prv-input" type="tel" autoComplete="tel" placeholder="(XXX) XXX-XXXX" value={data.phone} onChange={(e) => onChange('phone', e.target.value)} required /></Field></div><Field label="Email" required><input className="prv-input" type="email" autoComplete="email" placeholder="you@example.com" value={data.email} onChange={(e) => onChange('email', e.target.value)} required /></Field></>;
}
