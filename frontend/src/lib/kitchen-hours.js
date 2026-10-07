// Online pickup & delivery hours: Monday-Friday, 11:00 AM - 3:30 PM (Detroit time).
// Matches the footer, contact page and checkout. Change them here and in those places.
const TIME_ZONE = 'America/Detroit';
const OPEN_MINUTES = 11 * 60;
const CLOSE_MINUTES = 15 * 60 + 30;
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function detroitNow(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    day: DAY_INDEX[get('weekday')],
    minutes: Number(get('hour')) * 60 + Number(get('minute'))
  };
}

/** Is online ordering open right now, and if not, when does it next open? */
export function getOrderingStatus(date = new Date()) {
  const { day, minutes } = detroitNow(date);
  const isWeekday = day >= 1 && day <= 5;
  if (isWeekday && minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES) {
    return { open: true, label: 'Available now for pickup & delivery' };
  }

  // Next opening: later today if before opening on a weekday, otherwise the next weekday.
  let daysAhead = 0;
  if (!(isWeekday && minutes < OPEN_MINUTES)) {
    daysAhead = 1;
    while (![1, 2, 3, 4, 5].includes((day + daysAhead) % 7)) daysAhead += 1;
  }
  const nextDay = (day + daysAhead) % 7;
  const when = daysAhead === 0 ? 'today' : daysAhead === 1 ? 'tomorrow' : DAY_NAMES[nextDay];
  return { open: false, label: `Online ordering opens ${when} at 11:00 AM` };
}
