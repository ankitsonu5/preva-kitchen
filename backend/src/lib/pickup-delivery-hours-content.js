import { PICKUP_DELIVERY_SCHEDULE } from '../../../shared/pickup-delivery-hours.mjs';

export const LEGACY_HOURS_POST_SLUGS = Object.freeze([
  'buffalo-wings-near-redford-mi',
  'dinner-on-inkster-road-redford',
  'dining-in-at-preva-kitchen',
  'preva-kitchen-menu-under-20',
  'best-mac-and-cheese-near-redford-mi'
]);

const saturdaySchedule = PICKUP_DELIVERY_SCHEDULE.find(({ days }) => days.includes(6));

export function normalizeLegacyBlogHours(slug, body) {
  if (!LEGACY_HOURS_POST_SLUGS.includes(slug)) return body;
  return String(body || '').replace(/\b8:00 PM\b/g, saturdaySchedule.openTime);
}

export function normalizeLegacyProductFaqs(faqs) {
  if (!Array.isArray(faqs)) return faqs;
  return faqs.map((faq) => {
    const answer = typeof faq?.a === 'string' ? faq.a : '';
    if (!/Saturday.{0,160}8:00 PM/i.test(answer)) return faq;
    return {
      ...faq,
      a: answer.replace(/\b8:00 PM\b/g, saturdaySchedule.openTime)
    };
  });
}
