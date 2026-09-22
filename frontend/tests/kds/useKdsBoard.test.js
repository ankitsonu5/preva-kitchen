import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  formatElapsed,
  getStageInfo,
  getUrgency,
  isHeldForLater,
  msUntilFire,
  SCHEDULED_FIRE_WINDOW_MS
} from '@/lib/kds/useKdsBoard';

describe('formatElapsed', () => {
  it('renders mm:ss for a recent timestamp', () => {
    const createdAt = new Date(Date.now() - 90 * 1000).toISOString();
    expect(formatElapsed(createdAt)).toBe('01:30');
  });

  it('falls back to 00:00 when there is no timestamp', () => {
    expect(formatElapsed(null)).toBe('00:00');
  });
});

describe('getUrgency', () => {
  it('is normal for a brand new order', () => {
    expect(getUrgency(new Date().toISOString(), false, null)).toBe('normal');
  });

  it('escalates to warning then urgent as an order ages', () => {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(getUrgency(fifteenMinAgo, false, null)).toBe('warning');
    expect(getUrgency(thirtyMinAgo, false, null)).toBe('urgent');
  });

  it('treats a scheduled order as merely "scheduled" while far out', () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(getUrgency(new Date().toISOString(), true, scheduledAt)).toBe('scheduled');
  });

  it('treats an overdue scheduled order as urgent', () => {
    const scheduledAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(getUrgency(new Date().toISOString(), true, scheduledAt)).toBe('urgent');
  });
});

describe('scheduled order hold/fire window', () => {
  it('is not held when the order is not scheduled', () => {
    expect(isHeldForLater({ isScheduled: false })).toBe(false);
    expect(msUntilFire({ isScheduled: false })).toBeNull();
  });

  it('holds an order scheduled well beyond the firing window', () => {
    const scheduledAt = new Date(Date.now() + SCHEDULED_FIRE_WINDOW_MS + 30 * 60 * 1000).toISOString();
    const order = { isScheduled: true, scheduledAt };
    expect(isHeldForLater(order)).toBe(true);
    expect(msUntilFire(order)).toBeGreaterThan(0);
  });

  it('releases an order once it enters the firing window', () => {
    const scheduledAt = new Date(Date.now() + SCHEDULED_FIRE_WINDOW_MS - 5 * 60 * 1000).toISOString();
    const order = { isScheduled: true, scheduledAt };
    expect(isHeldForLater(order)).toBe(false);
    expect(msUntilFire(order)).toBeLessThan(0);
  });
});

describe('formatCountdown', () => {
  it('renders minutes only under an hour', () => {
    expect(formatCountdown(35 * 60 * 1000)).toBe('35m');
  });

  it('renders hours and minutes over an hour', () => {
    expect(formatCountdown(95 * 60 * 1000)).toBe('1h 35m');
  });

  it('never goes negative', () => {
    expect(formatCountdown(-10 * 60 * 1000)).toBe('0m');
  });
});

describe('getStageInfo', () => {
  it('is ok immediately after a status change', () => {
    const info = getStageInfo({ status: 'PREPARING', statusChangedAt: new Date().toISOString() });
    expect(info.level).toBe('ok');
    expect(info.label).toBe('Cooking');
  });

  it('warns once a stage runs long, and breaches past the harder threshold', () => {
    const warningStart = new Date(Date.now() - 13 * 60 * 1000).toISOString();
    const breachStart = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    expect(getStageInfo({ status: 'PREPARING', statusChangedAt: warningStart }).level).toBe('warning');
    expect(getStageInfo({ status: 'PREPARING', statusChangedAt: breachStart }).level).toBe('breach');
  });

  it('falls back to createdAt when statusChangedAt is missing', () => {
    const createdAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const info = getStageInfo({ status: 'READY', createdAt });
    expect(info.level).toBe('breach');
  });

  it('has no SLA opinion about a status it does not track', () => {
    const info = getStageInfo({ status: 'COMPLETED', statusChangedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() });
    expect(info.level).toBe('ok');
  });
});
