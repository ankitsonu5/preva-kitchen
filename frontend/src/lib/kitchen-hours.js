import {
  PICKUP_DELIVERY_SCHEDULE,
  PICKUP_DELIVERY_TIME_ZONE
} from './pickup-delivery-hours.js';

const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function detroitNow(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PICKUP_DELIVERY_TIME_ZONE,
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
  const isAfterMidnight = minutes < PICKUP_DELIVERY_SCHEDULE[0].closeMinutes;
  const serviceDay = isAfterMidnight ? (day + 6) % 7 : day;
  const currentSchedule = PICKUP_DELIVERY_SCHEDULE.find(({ days }) => days.includes(serviceDay));
  if (currentSchedule && (isAfterMidnight || minutes >= currentSchedule.openMinutes)) {
    return { open: true, label: 'Available now for pickup & delivery' };
  }

  let daysAhead = 0;
  let nextSchedule = PICKUP_DELIVERY_SCHEDULE.find(({ days }) => days.includes(day));
  if (!nextSchedule || minutes >= nextSchedule.openMinutes) {
    daysAhead = 1;
    do {
      nextSchedule = PICKUP_DELIVERY_SCHEDULE.find(({ days }) => days.includes((day + daysAhead) % 7));
      if (!nextSchedule) daysAhead += 1;
    } while (!nextSchedule);
  }
  const nextDay = (day + daysAhead) % 7;
  const when = daysAhead === 0 ? 'today' : daysAhead === 1 ? 'tomorrow' : DAY_NAMES[nextDay];
  return { open: false, label: `Online ordering opens ${when} at ${nextSchedule.openTime}` };
}
