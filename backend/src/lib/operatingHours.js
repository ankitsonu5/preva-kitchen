/**
 * Preva Kitchen Operating Hours Validation
 * 
 * Operating Schedule (per restaurant footer & policy):
 * - Monday through Friday: 11:00 AM - 3:30 PM
 * - Saturday & Sunday: Closed
 * - Timezone: America/Detroit (US Eastern Time)
 */

export const KITCHEN_TIMEZONE = 'America/Detroit';
export const KITCHEN_OPEN_MINUTES = 11 * 60;        // 11:00 AM = 660 mins
export const KITCHEN_CLOSE_MINUTES = 15 * 60 + 30;   // 03:30 PM = 930 mins
export const KITCHEN_OPEN_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/**
 * Evaluates whether a given Date is within the kitchen's operating window.
 * @param {Date} date - The date to check
 * @param {string} timezone - Defaults to America/Detroit
 * @returns {{
 *   isOpen: boolean,
 *   weekday: string,
 *   hour: number,
 *   minute: number,
 *   isDayOpen: boolean,
 *   isTimeOpen: boolean,
 *   reason: string
 * }}
 */
export function getKitchenOperatingStatus(date = new Date(), timezone = KITCHEN_TIMEZONE) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    const isDayOpen = KITCHEN_OPEN_DAYS.includes(weekday);
    const currentMinutes = hour * 60 + minute;
    const isTimeOpen = currentMinutes >= KITCHEN_OPEN_MINUTES && currentMinutes <= KITCHEN_CLOSE_MINUTES;

    const isOpen = isDayOpen && isTimeOpen;

    let reason = '';
    if (!isDayOpen) {
      reason = 'Preva Kitchen is closed on weekends. We accept orders Monday through Friday from 11:00 AM to 3:30 PM.';
    } else if (!isTimeOpen) {
      if (currentMinutes < KITCHEN_OPEN_MINUTES) {
        reason = 'Preva Kitchen has not opened yet today. Orders are accepted starting at 11:00 AM.';
      } else {
        reason = 'Preva Kitchen is now closed for today. Kitchen hours are 11:00 AM to 3:30 PM.';
      }
    }

    return {
      isOpen,
      weekday,
      hour,
      minute,
      currentMinutes,
      isDayOpen,
      isTimeOpen,
      reason,
      hoursDisplay: 'Monday–Friday: 11:00 AM – 3:30 PM'
    };
  } catch (err) {
    console.error('[operatingHours] Error checking status:', err);
    // Fallback safely to true if timezone formatting fails
    return {
      isOpen: true,
      weekday: 'Mon',
      hour: 12,
      minute: 0,
      isDayOpen: true,
      isTimeOpen: true,
      reason: '',
      hoursDisplay: 'Monday–Friday: 11:00 AM – 3:30 PM'
    };
  }
}
