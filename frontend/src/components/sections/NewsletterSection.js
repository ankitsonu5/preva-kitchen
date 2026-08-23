"use client";
import { useState } from 'react';
import SvgIcon from '../SvgIcon';
import { showError, showSuccess, showWarning } from '../../lib/swal';

const API = '/api';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorText, setErrorText] = useState('Enter a valid email address.');
  const [isSuccess, setIsSuccess] = useState(false);

  const isValidEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (hasError && isValidEmail(val)) {
      setHasError(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!isValidEmail(trimmed)) {
      setHasError(true);
      setErrorText('Enter a valid email address.');
      showWarning('Check your email', 'Enter a valid email address to subscribe.');
      return;
    }

    setHasError(false);
    setLoading(true);

    try {
      const res = await fetch(`${API}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      });

      if (res.ok) {
        setIsSuccess(true);
        setEmail('');
        showSuccess("You're on the list", 'Thanks for subscribing to Preva Kitchen updates.');
      } else {
        setHasError(true);
        setErrorText('Subscription failed. Please try again.');
        showError('Subscription failed', 'Please try again in a moment.');
      }
    } catch (err) {
      console.error(err);
      setHasError(true);
      setErrorText('Network error. Please try again.');
      showError('Connection problem', 'We could not reach the kitchen. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="newsletter" className="newsletter-section-outer">
      <div className="container relative-z2">
        <div className="nl-card">
          <span className="nl-eyebrow">Newsletter</span>
          <h2 className="nl-title home-section-heading">Stay in the loop</h2>
          
          {!isSuccess && (
            <p className="nl-sub" id="nlSub">
              Get new menu drops, chef specials, catering ideas and kitchen updates.
            </p>
          )}

          {!isSuccess ? (
            <div className="nl-form-wrap" id="nlFormWrap">
              <form className="nl-form" id="nlForm" onSubmit={handleSubmit} noValidate>
                <div className="nl-input-wrap">
                  <input
                    type="email"
                    className={`nl-input ${hasError ? 'error' : ''}`}
                    id="nlEmail"
                    placeholder="name@company.com"
                    value={email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={`nl-btn ${loading ? 'loading' : ''}`}
                  id="nlBtn"
                  disabled={loading}
                >
                  <span className="btn-label">Subscribe</span>
                  <span className="arrow"><SvgIcon name="arrow-right" size={17} /></span>
                  <span className="nl-spinner"></span>
                </button>
              </form>
              <p className={`nl-error-msg ${hasError ? 'show' : ''}`} id="nlError">
                {errorText}
              </p>
            </div>
          ) : (
            <div className="nl-success show" id="nlSuccess">
              <div className="check">
                <SvgIcon name="check" size={22} strokeWidth={2.5} />
              </div>
              <h3>You're on the list</h3>
              <p>Check your inbox for a confirmation email.</p>
            </div>
          )}

          <div className="nl-foot">
            <span className="lock-line"><SvgIcon name="lock" size={14} /> No spam. Unsubscribe anytime.</span>
            <span>Join 2,000+ guests who get weekly updates.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
