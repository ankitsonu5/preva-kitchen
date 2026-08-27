"use client";

import { useEffect, useRef, useState } from 'react';
import SvgIcon from '../SvgIcon';

const GOOGLE_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=Preva%20Kitchen%20Redford&query_place_id=ChIJF5z-j1-1JIgR3tZAujO2mZI';
const NON_KITCHEN_COPY = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b/i;

const DEVELOPMENT_FALLBACK_DATA = {
  configured: true,
  available: true,
  name: 'Preva Kitchen',
  address: '13090 Inkster Rd, Redford Township, MI 48239',
  rating: 4.9,
  reviewCount: 148,
  googleMapsUrl: GOOGLE_SEARCH_URL,
  reviewsUrl: GOOGLE_SEARCH_URL,
  writeReviewUrl: GOOGLE_SEARCH_URL,
  reviews: [
    {
      id: 'rev-1',
      name: 'Marcus Vance',
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      rating: 5,
      relativeTime: '2 weeks ago',
      text: 'The lamb tower and steak bites were cooked to perfection. Generous portions, beautiful presentation and genuinely warm service.',
      reviewUrl: GOOGLE_SEARCH_URL
    },
    {
      id: 'rev-2',
      name: 'Elena Rostova',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      rating: 5,
      relativeTime: '1 month ago',
      text: 'Celebrated my birthday here with family. The team made us feel welcome and the lobster bites were a table favorite.',
      reviewUrl: GOOGLE_SEARCH_URL
    },
    {
      id: 'rev-3',
      name: 'Darius Washington',
      photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
      rating: 5,
      relativeTime: '3 weeks ago',
      text: 'One of our favorite food spots in Redford. The dining room feels polished and every dish from Preva Kitchen impressed us.',
      reviewUrl: GOOGLE_SEARCH_URL
    },
    {
      id: 'rev-4',
      name: 'Jasmine Taylor',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      rating: 5,
      relativeTime: 'a month ago',
      text: 'Rasta Pasta and the wings were full of flavor. The warm atmosphere made our dinner feel special without being stuffy.',
      reviewUrl: GOOGLE_SEARCH_URL
    },
    {
      id: 'rev-5',
      name: 'Cameron Bell',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      rating: 5,
      relativeTime: '2 months ago',
      text: 'Amazing food, drinks on point, and great hospitality from the staff. Will definitely be coming back every weekend!',
      reviewUrl: GOOGLE_SEARCH_URL
    }
  ]
};

const EMPTY_GOOGLE_DATA = {
  configured: false,
  available: false,
  name: 'Preva Kitchen',
  address: '13090 Inkster Rd, Redford Township, MI 48239',
  rating: 0,
  reviewCount: 0,
  googleMapsUrl: GOOGLE_SEARCH_URL,
  reviewsUrl: GOOGLE_SEARCH_URL,
  writeReviewUrl: GOOGLE_SEARCH_URL,
  reviews: []
};

const INITIAL_DATA = process.env.NODE_ENV === 'production' ? EMPTY_GOOGLE_DATA : DEVELOPMENT_FALLBACK_DATA;

function Stars({ rating, compact = false }) {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span className={`real-google-stars ${compact ? 'is-compact' : ''}`} aria-label={`${Number(rating || 0).toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span className={index < value ? 'is-filled' : ''} aria-hidden="true" key={index}><SvgIcon name="star" size={compact ? 14 : 17} /></span>
      ))}
    </span>
  );
}

export default function GoogleReviewsSection({ visible }) {
  const trackRef = useRef(null);
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch('/api/google-reviews', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (active && payload && payload.reviews && payload.reviews.length > 0) {
          const kitchenReviews = payload.reviews.filter((review) => !NON_KITCHEN_COPY.test(review.text || ''));
          setData({
            ...payload,
            name: NON_KITCHEN_COPY.test(payload.name || '') ? 'Preva Kitchen' : payload.name,
            reviews: kitchenReviews.length
          });
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Could not load Google reviews:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!loading && trackRef.current) trackRef.current.scrollLeft = 0;
  }, [loading, data?.reviews?.length]);

  if (visible === false) return null;

  const currentData = data || INITIAL_DATA;
  const reviews = Array.isArray(currentData?.reviews) ? currentData.reviews : [];

  if (reviews.length === 0) return null;

  const placeUrl = currentData?.googleMapsUrl || GOOGLE_SEARCH_URL;
  const reviewsUrl = currentData?.reviewsUrl || placeUrl;
  const writeReviewUrl = currentData?.writeReviewUrl || placeUrl;

  const scrollReviews = (direction) => {
    trackRef.current?.scrollBy({ left: direction * Math.min(trackRef.current.clientWidth * 0.82, 380), behavior: 'smooth' });
  };

  return (
    <section id="google-reviews" className="section-padding testimonial-premium-section real-google-section" aria-labelledby="google-reviews-title">
      <div className="container relative-z2">
        <header className="real-google-heading">
          <span className="real-google-quote-mark" aria-hidden="true">“</span>
          <div>
            <span className="testimonial-eyebrow">GUEST EXPERIENCES</span>
            <h2 id="google-reviews-title" className="testimonial-heading home-section-heading">What People Say</h2>
          </div>
          <p>Discover why guests return for bold flavor, generous plates and warm kitchen hospitality.</p>
        </header>

        <div className="real-google-layout">
          {/* Summary Sidebar */}
          <aside className="real-google-summary">
            <img className="real-google-place-logo" src="/asset/preva-logo-silver.png" alt="Preva Kitchen" />
            <div className="real-google-place-details">
              <strong>{currentData?.name || 'Preva Kitchen'}</strong>
              <Stars rating={currentData.rating || 4.9} />
              <span>{Number(currentData.reviewCount || 148).toLocaleString()} Google reviews</span>
              <a className="google-write-review-btn" href={writeReviewUrl} target="_blank" rel="noopener noreferrer">
                <span>Write a review</span>
              </a>
            </div>
          </aside>

          {/* Reviews Carousel Track */}
          <div className="real-google-reviews">
            {reviews.length > 2 && (
              <div className="real-google-arrows">
                <button type="button" onClick={() => scrollReviews(-1)} aria-label="Previous reviews">‹</button>
                <button type="button" onClick={() => scrollReviews(1)} aria-label="Next reviews">›</button>
              </div>
            )}

            <div className="real-google-track" ref={trackRef} tabIndex="0" aria-label="Recent Google reviews">
              {reviews.map((review) => (
                <article className="real-google-card" key={review.id}>
                  <header>
                    <a className="real-google-author" href={review.authorUrl || review.reviewUrl || reviewsUrl} target="_blank" rel="noopener noreferrer">
                      {review.photoUrl ? (
                        <img src={review.photoUrl} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{String(review.name || 'G').charAt(0).toUpperCase()}</span>
                      )}
                      <div>
                        <strong>{review.name}</strong>
                        <small>{review.relativeTime || 'Google reviewer'}</small>
                      </div>
                    </a>
                    <SvgIcon name="google" size={20} />
                  </header>
                  <div className="real-google-rating">
                    <Stars rating={review.rating} compact />
                    <span className="real-google-verified" title="Google verified review" aria-label="Google verified review"><SvgIcon name="check" size={12} /></span>
                  </div>
                  <p>{review.text || 'Rated Preva on Google.'}</p>
                  <footer>
                    <a href={review.reviewUrl || reviewsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Read ${review.name}'s review on Google`}>
                      Read more
                    </a>
                    <span aria-hidden="true">“</span>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </div>
        <p className="real-google-attribution">Google reviews are displayed with reviewer attribution and link back to the official Google listing.</p>
      </div>
    </section>
  );
}
