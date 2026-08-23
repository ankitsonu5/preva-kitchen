"use client";

import { useState } from 'react';
import Link from 'next/link';
import SvgIcon from '../../../components/SvgIcon';
import { showError, showSuccess, showWarning } from '../../../lib/swal';

const API = '/api';
const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', inquiry: 'general',
  eventDate: '', guests: '', message: '', consent: false
};

const contactOptions = [
  { number: '01', icon: 'calendar', title: 'Table Reservations', body: 'Planning dinner or celebrating something special? Send a request and our team will confirm availability.', href: '/#prv-reservations', cta: 'Reserve a table' },
  { number: '02', icon: 'utensils', title: 'Catering & Groups', body: 'Party trays, office lunches and family gatherings—all planned directly with the Preva Kitchen team.', href: '/#prv-reservations', cta: 'Plan a group meal' },
  { number: '03', icon: 'phone', title: 'Order Support', body: 'Need help with an active pickup or delivery order? Calling the kitchen is always the fastest option.', href: 'tel:+13132863586', cta: 'Call the kitchen' }
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
      const response = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, formSource: 'Preva Kitchen Contact Page', pageUrl: window.location.href })
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
    <main className="kcontact">
      <section className="kcontact-hero">
        <div className="kcontact-wrap kcontact-hero-grid">
          <div className="kcontact-hero-copy">
            <span className="kcontact-eyebrow"><SvgIcon name="spark" size={14} /> Preva Kitchen · Redford, Michigan</span>
            <h1>Talk to the <em>kitchen.</em></h1>
            <p>Reservations, catering, menu questions or order support—tell us what you need and the right member of our team will help.</p>
            <div className="kcontact-actions">
              <a className="kcontact-btn kcontact-btn-primary" href="tel:+13132863586"><SvgIcon name="phone" size={17} /> Call (313) 286-3586</a>
              <Link className="kcontact-btn kcontact-btn-ghost" href="/shop">Order Online <SvgIcon name="arrow-right" size={17} /></Link>
            </div>
            <div className="kcontact-hero-meta">
              <span><SvgIcon name="clock" size={16} /> Tue–Sun · 5pm–10pm</span>
              <a href="https://www.google.com/maps/search/?api=1&query=13090+Inkster+Rd+Redford+Township+MI" target="_blank" rel="noreferrer"><SvgIcon name="location" size={16} /> 13090 Inkster Rd</a>
            </div>
          </div>

          <div className="kcontact-hero-visual" role="img" aria-label="A catered spread prepared by Preva Kitchen">
            <div className="kcontact-image-badge"><SvgIcon name="utensils" size={18} /><span><small>Made for every table</small>Dine in · Pickup · Catering</span></div>
          </div>
        </div>
      </section>

      <section className="kcontact-options" aria-label="Ways to contact Preva Kitchen">
        <div className="kcontact-wrap kcontact-card-grid">
          {contactOptions.map((option) => (
            <article key={option.number}>
              <div className="kcontact-card-top"><span className="kcontact-card-icon"><SvgIcon name={option.icon} size={21} /></span><span className="kcontact-card-number">{option.number}</span></div>
              <h2>{option.title}</h2>
              <p>{option.body}</p>
              {option.href.startsWith('/') ? (
                <Link href={option.href}>{option.cta} <SvgIcon name="arrow-right" size={15} /></Link>
              ) : (
                <a href={option.href}>{option.cta} <SvgIcon name="arrow-right" size={15} /></a>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="kcontact-main" id="contact-form">
        <div className="kcontact-wrap kcontact-layout">
          <aside className="kcontact-info">
            <span className="kcontact-eyebrow"><SvgIcon name="location" size={14} /> Visit the Kitchen</span>
            <h2>Come hungry.<br /><em>Leave happy.</em></h2>

            <div className="kcontact-detail">
              <span className="kcontact-detail-icon"><SvgIcon name="location" size={19} /></span>
              <div><small>Address</small><p>13090 Inkster Rd<br />Redford Township, MI 48239</p><a href="https://www.google.com/maps/search/?api=1&query=13090+Inkster+Rd+Redford+Township+MI" target="_blank" rel="noreferrer">Get directions <SvgIcon name="arrow-right" size={14} /></a></div>
            </div>
            <div className="kcontact-detail">
              <span className="kcontact-detail-icon"><SvgIcon name="clock" size={19} /></span>
              <div><small>Kitchen Hours</small><p>Tuesday–Sunday<br />Dinner service · 5pm–10pm</p></div>
            </div>
            <div className="kcontact-detail">
              <span className="kcontact-detail-icon"><SvgIcon name="message" size={19} /></span>
              <div><small>Contact</small><p><a href="tel:+13132863586">(313) 286-3586</a><br /><a href="mailto:info@prevaclub.com">info@prevaclub.com</a></p></div>
            </div>

            <a className="kcontact-map" href="https://www.google.com/maps/search/?api=1&query=13090+Inkster+Rd+Redford+Township+MI" target="_blank" rel="noreferrer" aria-label="Open Preva Kitchen in Google Maps">
              <span><SvgIcon name="location" size={25} /></span>
              <strong>Find us in Redford</strong>
              <small>Open in Google Maps <SvgIcon name="arrow-right" size={13} /></small>
            </a>
          </aside>

          <div className="kcontact-form-card">
            <div className="kcontact-form-heading">
              <span className="kcontact-eyebrow"><SvgIcon name="mail" size={14} /> Send a Message</span>
              <h2>How can we help?</h2>
              <p>Complete the form and our kitchen team will reply as soon as possible.</p>
            </div>

            {success ? (
              <div className="kcontact-success">
                <span><SvgIcon name="check" size={29} /></span>
                <h3>Message received</h3>
                <p>Thanks for reaching out. Our kitchen team will be in touch shortly.</p>
                <button type="button" onClick={() => setSuccess(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                {error && <div className="kcontact-error" role="alert"><SvgIcon name="info" size={17} /> {error}</div>}
                <div className="kcontact-row">
                  <label>First Name <span>*</span><input name="firstName" autoComplete="given-name" value={form.firstName} onChange={update} required /></label>
                  <label>Last Name<input name="lastName" autoComplete="family-name" value={form.lastName} onChange={update} /></label>
                </div>
                <div className="kcontact-row">
                  <label>Email <span>*</span><input type="email" name="email" autoComplete="email" value={form.email} onChange={update} required /></label>
                  <label>Phone<input type="tel" name="phone" autoComplete="tel" value={form.phone} onChange={update} /></label>
                </div>
                <label>What can we help with? <span>*</span>
                  <select name="inquiry" value={form.inquiry} onChange={update} required>
                    <option value="general">General question</option>
                    <option value="reservation">Table reservation</option>
                    <option value="group-dining">Group dining</option>
                    <option value="catering">Catering or party trays</option>
                    <option value="order-support">Online order support</option>
                    <option value="menu">Menu or dietary question</option>
                    <option value="career">Careers</option>
                  </select>
                </label>
                {showEventFields && (
                  <div className="kcontact-row">
                    <label>Preferred Date<input type="date" name="eventDate" min={new Date().toISOString().split('T')[0]} value={form.eventDate} onChange={update} /></label>
                    <label>Estimated Guests<input type="number" name="guests" min="1" max="300" value={form.guests} onChange={update} /></label>
                  </div>
                )}
                <label>Your Message <span>*</span><textarea name="message" rows="5" maxLength="1200" placeholder="Share the details our kitchen team should know..." value={form.message} onChange={update} required /></label>
                <div className="kcontact-form-foot">
                  <label className="kcontact-consent"><input type="checkbox" name="consent" checked={form.consent} onChange={update} /> <span>I agree that Preva Kitchen may contact me about this request.</span></label>
                  <small>{form.message.length}/1200</small>
                </div>
                <button className="kcontact-submit" type="submit" disabled={submitting}>
                  <span>{submitting ? 'Sending...' : 'Send to the Kitchen'}</span>
                  <SvgIcon name={submitting ? 'clock' : 'arrow-right'} size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        .kcontact{--kc-gold:#d4ad4d;--kc-gold-soft:#ebce80;--kc-green:#a8b87b;--kc-ink:#080807;background:var(--kc-ink);color:#f5f1e8;min-height:100vh;overflow:hidden}.kcontact-wrap{width:min(var(--site-container-max,1240px),calc(100% - 48px));margin-inline:auto}.kcontact-eyebrow{display:flex;align-items:center;gap:9px;color:var(--kc-gold);text-transform:uppercase;letter-spacing:.2em;font-size:10px;font-weight:900}.kcontact-hero{position:relative;padding:132px 0 62px;background:radial-gradient(circle at 12% 20%,rgba(212,173,77,.08),transparent 30%),#0a0a08}.kcontact-hero::after{content:'';position:absolute;inset:auto 0 0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,173,77,.5),transparent)}.kcontact-hero-grid{display:grid;grid-template-columns:minmax(0,.88fr) minmax(430px,1.12fr);gap:66px;align-items:center}.kcontact-hero-copy{padding-block:20px}.kcontact-hero h1{max-width:660px;font:700 clamp(3.2rem,6.2vw,5.25rem)/.92 var(--font-display,Georgia);letter-spacing:-.045em;text-transform:uppercase;margin:22px 0 25px}.kcontact-hero h1 em{display:block;color:var(--kc-gold);font-weight:400}.kcontact-hero-copy>p{max-width:590px;color:#aaa79f;font-size:1.05rem;line-height:1.75;margin:0}.kcontact-actions{display:flex;gap:12px;margin-top:30px;flex-wrap:wrap}.kcontact-btn{min-height:50px;display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:999px;padding:0 23px;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:.06em;transition:transform .25s,border-color .25s,background .25s}.kcontact-btn:hover{transform:translateY(-2px)}.kcontact-btn-primary{color:#131009;background:linear-gradient(110deg,#b99136,#efd27f);box-shadow:0 12px 32px rgba(212,173,77,.17)}.kcontact-btn-ghost{color:#f4f0e7;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.025)}.kcontact-btn-ghost:hover{border-color:rgba(212,173,77,.5)}.kcontact-hero-meta{display:flex;gap:25px;align-items:center;flex-wrap:wrap;margin-top:29px;color:#8e8b84;font-size:12px}.kcontact-hero-meta span,.kcontact-hero-meta a{display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none}.kcontact-hero-meta :global(svg){color:var(--kc-green)}.kcontact-hero-visual{position:relative;min-height:490px;border-radius:28px 28px 96px 28px;background:linear-gradient(90deg,rgba(6,6,5,.08),rgba(6,6,5,.05)),url('/asset/hero/preva-feast-hero.jpg') center/cover no-repeat;border:1px solid rgba(212,173,77,.25);box-shadow:0 35px 100px rgba(0,0,0,.52);overflow:hidden}.kcontact-hero-visual::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 42%,rgba(5,5,4,.75))}.kcontact-image-badge{position:absolute;left:24px;bottom:24px;display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.14);background:rgba(8,8,7,.8);backdrop-filter:blur(12px);border-radius:15px;padding:13px 17px;color:var(--kc-gold-soft)}.kcontact-image-badge>span{display:grid;gap:3px;color:#f1ece2;font-size:12px;font-weight:800}.kcontact-image-badge small{color:#a8a49b;font-size:9px;text-transform:uppercase;letter-spacing:.15em}.kcontact-options{padding:68px 0;background:#0c0c0a}.kcontact-card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.kcontact-card-grid article{position:relative;display:flex;flex-direction:column;min-height:285px;padding:28px;border:1px solid rgba(255,255,255,.075);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));transition:transform .28s,border-color .28s,background .28s;overflow:hidden}.kcontact-card-grid article::after{content:'';position:absolute;width:140px;height:140px;border-radius:50%;right:-70px;top:-70px;background:rgba(212,173,77,.05)}.kcontact-card-grid article:hover{transform:translateY(-5px);border-color:rgba(212,173,77,.32);background:rgba(212,173,77,.035)}.kcontact-card-top{display:flex;align-items:center;justify-content:space-between}.kcontact-card-icon{width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(212,173,77,.3);border-radius:50%;color:var(--kc-gold)}.kcontact-card-number{color:rgba(212,173,77,.25);font:500 2rem var(--font-display,Georgia)}.kcontact-card-grid h2{font:700 1.25rem/1.15 var(--font-display,Georgia);letter-spacing:.02em;text-transform:uppercase;margin:24px 0 12px}.kcontact-card-grid p{color:#918e86;line-height:1.7;font-size:.92rem;margin:0 0 22px}.kcontact-card-grid a{display:inline-flex;align-items:center;gap:8px;margin-top:auto;color:var(--kc-gold-soft);text-decoration:none;font-size:12px;font-weight:900}.kcontact-main{padding:88px 0 110px;background:radial-gradient(circle at 72% 48%,rgba(212,173,77,.06),transparent 31%),linear-gradient(120deg,#090907,#0e0f0b)}.kcontact-layout{display:grid;grid-template-columns:minmax(300px,.72fr) minmax(0,1.28fr);gap:68px;align-items:start}.kcontact-info{padding-top:12px}.kcontact-info h2{font:700 clamp(2.7rem,4.4vw,4.4rem)/.95 var(--font-display,Georgia);letter-spacing:-.035em;text-transform:uppercase;margin:20px 0 36px}.kcontact-info h2 em{color:var(--kc-gold);font-weight:400}.kcontact-detail{display:grid;grid-template-columns:42px 1fr;gap:14px;padding:20px 0;border-top:1px solid rgba(255,255,255,.08)}.kcontact-detail-icon{width:37px;height:37px;display:grid;place-items:center;border-radius:10px;background:rgba(168,184,123,.08);color:var(--kc-green)}.kcontact-detail small{display:block;color:var(--kc-green);text-transform:uppercase;letter-spacing:.16em;font-size:9px;font-weight:900}.kcontact-detail p{color:#c4c1b9;line-height:1.65;margin:7px 0 0;font-size:.93rem}.kcontact-detail a{display:inline-flex;align-items:center;gap:6px;color:inherit;text-decoration:none}.kcontact-detail div>a{margin-top:10px;color:var(--kc-gold-soft);font-size:12px;font-weight:800}.kcontact-map{position:relative;display:grid;grid-template-columns:47px 1fr;column-gap:12px;margin-top:20px;padding:17px;border:1px solid rgba(212,173,77,.22);border-radius:15px;background:radial-gradient(circle at 80% 20%,rgba(212,173,77,.11),transparent 55%),#11110e;color:#f3eee4;text-decoration:none;transition:border-color .25s,transform .25s}.kcontact-map:hover{transform:translateY(-2px);border-color:rgba(212,173,77,.48)}.kcontact-map>span{grid-row:1/3;width:44px;height:44px;display:grid;place-items:center;border-radius:50%;background:var(--kc-gold);color:#100d07}.kcontact-map strong{font-size:13px}.kcontact-map small{display:flex;align-items:center;gap:5px;margin-top:4px;color:#8e8b84}.kcontact-form-card{position:relative;background:linear-gradient(145deg,#151510,#10100d);border:1px solid rgba(212,173,77,.22);border-radius:25px;padding:42px;box-shadow:0 32px 100px rgba(0,0,0,.38);overflow:hidden}.kcontact-form-card::before{content:'';position:absolute;width:240px;height:240px;right:-130px;top:-130px;border-radius:50%;background:rgba(212,173,77,.06);pointer-events:none}.kcontact-form-heading{padding-bottom:26px;margin-bottom:26px;border-bottom:1px solid rgba(255,255,255,.075)}.kcontact-form-heading h2{font:700 clamp(2.2rem,3.8vw,3.7rem)/1 var(--font-display,Georgia);letter-spacing:-.03em;text-transform:uppercase;margin:17px 0 10px}.kcontact-form-heading p{color:#8f8c84;line-height:1.6;margin:0}.kcontact-form-card form{display:grid;gap:17px}.kcontact-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.kcontact-form-card label{width:100%;display:grid;grid-template-columns:max-content 1fr;gap:7px;color:#9d998f;font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.kcontact-form-card label>span{color:var(--kc-gold)}.kcontact-form-card input,.kcontact-form-card select,.kcontact-form-card textarea{grid-column:1/-1;width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.13);background:#090907;color:#f4f0e7;border-radius:10px;padding:13px 14px;font:500 14px var(--font-body,Arial);text-transform:none;letter-spacing:0;transition:border-color .2s,box-shadow .2s,background .2s}.kcontact-form-card input:hover,.kcontact-form-card select:hover,.kcontact-form-card textarea:hover{border-color:rgba(255,255,255,.23)}.kcontact-form-card input:focus,.kcontact-form-card select:focus,.kcontact-form-card textarea:focus{outline:none;border-color:var(--kc-gold);background:#0d0d09;box-shadow:0 0 0 3px rgba(212,173,77,.1)}.kcontact-form-card textarea{resize:vertical;min-height:126px}.kcontact-form-foot{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.kcontact-form-card .kcontact-consent{display:flex;align-items:flex-start;gap:10px;text-transform:none;letter-spacing:0;font-weight:500;line-height:1.5}.kcontact-form-card .kcontact-consent input{width:17px;height:17px;flex:0 0 17px;padding:0;accent-color:var(--kc-gold)}.kcontact-form-card .kcontact-consent span{color:#9d998f}.kcontact-form-foot>small{color:#716f69;font-size:10px}.kcontact-submit,.kcontact-success button{border:0;border-radius:11px;background:linear-gradient(110deg,#b7933f,#e7ca76);color:#151109;padding:16px 20px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;cursor:pointer}.kcontact-submit{display:flex;align-items:center;justify-content:space-between;margin-top:2px;transition:filter .2s,transform .2s}.kcontact-submit:hover{filter:brightness(1.08);transform:translateY(-1px)}.kcontact-submit:disabled{opacity:.55;cursor:wait;transform:none}.kcontact-error{display:flex;align-items:center;gap:9px;padding:12px;border:1px solid rgba(230,90,90,.4);background:rgba(230,90,90,.09);color:#ffb2b2;border-radius:9px;font-size:12px}.kcontact-success{text-align:center;padding:62px 20px}.kcontact-success>span{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;margin:auto;background:rgba(168,184,123,.13);border:1px solid rgba(168,184,123,.3);color:#c2d09d}.kcontact-success h3{font:700 2rem var(--font-display,Georgia);text-transform:uppercase;margin:21px 0 8px}.kcontact-success p{color:#aaa69c;margin-bottom:25px}.kcontact-success button{min-width:220px}
        @media(max-width:980px){.kcontact-hero-grid{grid-template-columns:1fr;gap:35px}.kcontact-hero-copy{padding-top:0}.kcontact-hero-visual{min-height:410px}.kcontact-layout{grid-template-columns:.8fr 1.2fr;gap:38px}.kcontact-form-card{padding:32px}.kcontact-info h2{font-size:2.8rem}}
        @media(max-width:760px){.kcontact-wrap{width:min(100% - 30px,1240px)}.kcontact-hero{padding:112px 0 45px}.kcontact-hero h1{font-size:clamp(2.75rem,14vw,4.25rem);margin-top:18px}.kcontact-hero-copy>p{font-size:.96rem}.kcontact-actions{display:grid;grid-template-columns:1fr 1fr}.kcontact-btn{padding:0 12px;font-size:10px}.kcontact-hero-meta{gap:12px 19px}.kcontact-hero-visual{min-height:330px;border-radius:20px 20px 60px 20px;background-position:58% center}.kcontact-image-badge{left:15px;bottom:15px}.kcontact-options{padding:42px 0}.kcontact-card-grid,.kcontact-layout{grid-template-columns:1fr}.kcontact-card-grid article{min-height:0}.kcontact-main{padding:65px 0 80px}.kcontact-layout{gap:44px}.kcontact-info h2{font-size:2.8rem}.kcontact-form-card{padding:27px 20px;border-radius:19px}.kcontact-form-heading h2{font-size:2.15rem}.kcontact-row{grid-template-columns:1fr}.kcontact-form-foot{display:grid}.kcontact-submit{width:100%}}
        @media(max-width:520px){.kcontact-actions{grid-template-columns:1fr}.kcontact-hero-copy,.kcontact-info,.kcontact-form-card,.kcontact-card-grid article{min-width:0}.kcontact-hero-copy>p,.kcontact-card-grid p{overflow-wrap:anywhere}}
        @media(max-width:420px){.kcontact-image-badge{right:15px}.kcontact-hero-meta{display:grid}.kcontact-form-card{padding-inline:16px}}
      `}</style>
    </main>
  );
}
