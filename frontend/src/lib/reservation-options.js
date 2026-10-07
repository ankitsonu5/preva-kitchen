// Shared by the home-page booking card and the /reservations form so both
// accept the same party sizes and submit to the same /api/reservations endpoint.
// (The API itself accepts up to 30; larger groups are routed to catering.)
export const RESERVATION_MIN_GUESTS = 1;
export const RESERVATION_MAX_GUESTS = 20;

export const RESERVATION_GUEST_OPTIONS = Array.from(
  { length: RESERVATION_MAX_GUESTS - RESERVATION_MIN_GUESTS + 1 },
  (_, i) => i + RESERVATION_MIN_GUESTS
);
