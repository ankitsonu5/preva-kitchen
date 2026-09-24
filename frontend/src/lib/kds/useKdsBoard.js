'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

let audioCtx = null;
const KDS_ACTION_QUEUE_KEY = 'preva-kds-action-queue';

function readActionQueue() {
  try {
    const queue = JSON.parse(window.localStorage.getItem(KDS_ACTION_QUEUE_KEY) || '[]');
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

function writeActionQueue(queue) {
  try { window.localStorage.setItem(KDS_ACTION_QUEUE_KEY, JSON.stringify(queue)); } catch { /* storage unavailable */ }
}

function shouldQueueAction(error) {
  return typeof navigator !== 'undefined' && (!navigator.onLine || error?.name === 'TypeError');
}

export function playKitchenChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // Rich 3-Tone Culinary Alert Bell (D5 -> F#5 -> A5)
    const tones = [
      { freq: 587.33, time: now, dur: 0.22, gain: 0.3 },
      { freq: 739.99, time: now + 0.16, dur: 0.25, gain: 0.35 },
      { freq: 880.00, time: now + 0.34, dur: 0.65, gain: 0.45 }
    ];

    tones.forEach(({ freq, time, dur, gain }) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(gain, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + dur);
    });
  } catch (e) {
    console.warn('[KDS Audio] Chime error:', e);
  }
}

/** Lazily creates the shared AudioContext so its suspended/running state can be inspected before a chime is ever played. */
export function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  return audioCtx;
}

export function getAudioContextState() {
  return audioCtx?.state || null;
}

export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') return audioCtx.resume();
  return Promise.resolve();
}

export function formatElapsed(createdAt) {
  if (!createdAt) return '00:00';
  const elapsedMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getUrgency(createdAt, isScheduled, scheduledAt) {
  if (isScheduled && scheduledAt) {
    const timeUntil = new Date(scheduledAt).getTime() - Date.now();
    if (timeUntil < 0) return 'urgent';
    if (timeUntil < 20 * 60 * 1000) return 'warning';
    return 'scheduled';
  }
  const minutes = (Date.now() - new Date(createdAt).getTime()) / (60 * 1000);
  if (minutes >= 25) return 'urgent';
  if (minutes >= 14) return 'warning';
  return 'normal';
}

/**
 * A scheduled order does not need kitchen attention the moment it is paid —
 * only once it's close enough to fire. Holding it out of the active queue
 * until this window keeps the board focused on what needs cooking now.
 */
export const SCHEDULED_FIRE_WINDOW_MS = 45 * 60 * 1000;

export function msUntilFire(order) {
  if (!order?.isScheduled || !order?.scheduledAt) return null;
  return new Date(order.scheduledAt).getTime() - SCHEDULED_FIRE_WINDOW_MS - Date.now();
}

export function isHeldForLater(order) {
  if (order?.kdsFiredAt) return false;
  const remaining = msUntilFire(order);
  return remaining !== null && remaining > 0;
}

export function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Per-stage service-level thresholds (minutes) used to flag a ticket that
 * has been sitting in its current stage longer than a kitchen would expect.
 * These are heuristics, not contractual SLAs — tuned for a fast-casual pace.
 */
export const STAGE_SLA_MINUTES = {
  RECEIVED: { warning: 5, breach: 10 },
  PAID: { warning: 5, breach: 10 },
  PREPARING: { warning: 12, breach: 18 },
  READY: { warning: 8, breach: 15 },
  ON_THE_WAY: { warning: 25, breach: 40 }
};

const STAGE_LABELS = {
  RECEIVED: 'Waiting',
  PAID: 'Waiting',
  PREPARING: 'Cooking',
  READY: 'Ready',
  ON_THE_WAY: 'On the way'
};

/** How long an order has sat in its *current* stage, with an SLA verdict. */
export function getStageInfo(order, now = Date.now()) {
  const since = new Date(order?.statusChangedAt || order?.createdAt || now).getTime();
  const elapsedMs = Math.max(0, now - since);
  const minutes = elapsedMs / 60000;
  const thresholds = STAGE_SLA_MINUTES[order?.status] || null;
  let level = 'ok';
  if (thresholds) {
    if (minutes >= thresholds.breach) level = 'breach';
    else if (minutes >= thresholds.warning) level = 'warning';
  }
  return {
    label: STAGE_LABELS[order?.status] || order?.status || '',
    elapsedMs,
    level
  };
}

function checkedItemMap(orders) {
  const map = {};
  for (const order of orders || []) {
    for (const state of order.kdsItemStates || []) {
      if (state?.checked) map[`${order.id}-${state.lineIndex}`] = true;
    }
  }
  return map;
}

/**
 * Shared polling/state engine for the admin KDS and the standalone kitchen
 * terminal. Each page supplies a `client` that knows how to talk to its own
 * auth surface (admin session vs kitchen terminal token); everything else —
 * filters, counts, the chime, checklist sync, error handling — lives here so
 * the two entry points cannot drift again.
 */
export function useKdsBoard({ client, soundStorageKey, pollMs = 3500, onNewOrder, active = true, sseUrl = null }) {
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterFulfilment, setFilterFulfilment] = useState('ALL');
  const [filterStation, setFilterStation] = useState('ALL');
  const [showPrepSummary, setShowPrepSummary] = useState(false);
  const [showRecallDrawer, setShowRecallDrawer] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [errorNotice, setErrorNotice] = useState('');
  const [printingOrder, setPrintingOrder] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [firedIds, setFiredIds] = useState(() => new Set());
  const [pendingActionCount, setPendingActionCount] = useState(0);

  const previousOrderIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);
  const consecutiveFailuresRef = useRef(0);

  const enqueueAction = useCallback((type, args) => {
    const queue = [...readActionQueue(), { id: `${Date.now()}-${Math.random()}`, type, args }];
    writeActionQueue(queue);
    setPendingActionCount(queue.length);
    setConnectionStatus('offline');
  }, []);

  useEffect(() => {
    if (!printingOrder) return;
    const timer = setTimeout(() => window.print(), 180);
    return () => clearTimeout(timer);
  }, [printingOrder]);

  useEffect(() => {
    if (!soundStorageKey) return;
    try {
      const saved = localStorage.getItem(soundStorageKey);
      if (saved !== null) setSoundEnabled(saved === 'true');
    } catch {
      // Ignore storage access failures (private browsing, etc).
    }
  }, [soundStorageKey]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        if (soundStorageKey) localStorage.setItem(soundStorageKey, String(next));
      } catch {
        // Ignore storage access failures.
      }
      if (next) playKitchenChime();
      return next;
    });
  }, [soundStorageKey]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!active) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const activeRows = await client.fetchActive();

      const currentIds = new Set(activeRows.map((o) => o.id));
      if (!isInitialLoadRef.current) {
        let incomingTicket = null;
        for (const ticket of activeRows) {
          if (!previousOrderIdsRef.current.has(ticket.id)) {
            incomingTicket = ticket;
            break;
          }
        }
        if (incomingTicket) {
          if (soundEnabled) playKitchenChime();
          onNewOrder?.(incomingTicket);
        }
      }

      previousOrderIdsRef.current = currentIds;
      isInitialLoadRef.current = false;
      setOrders(activeRows);
      setCheckedItems(checkedItemMap(activeRows));
      setErrorNotice('');
      consecutiveFailuresRef.current = 0;
      setConnectionStatus('connected');
    } catch (err) {
      if (!err?.unauthorized) {
        console.warn('[KDS] fetch error:', err.message);
        consecutiveFailuresRef.current += 1;
        setConnectionStatus(consecutiveFailuresRef.current >= 3 ? 'offline' : 'reconnecting');
        setErrorNotice('Connection problem. Reconnecting...');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [active, client, soundEnabled, onNewOrder]);

  const flushActionQueue = useCallback(async () => {
    const queue = readActionQueue();
    if (!queue.length || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const remaining = [];
    for (const action of queue) {
      try {
        if (action.type === 'status') await client.updateStatus(...action.args);
        if (action.type === 'item') await client.toggleItem(...action.args);
      } catch (error) {
        remaining.push(action);
        if (error?.unauthorized || !shouldQueueAction(error)) break;
      }
    }
    writeActionQueue(remaining);
    setPendingActionCount(remaining.length);
    if (!remaining.length) fetchOrders({ silent: true });
  }, [client, fetchOrders]);

  useEffect(() => {
    if (!active) return undefined;
    const flush = () => flushActionQueue();
    window.addEventListener('online', flush);
    const interval = setInterval(flush, 2000);
    return () => {
      window.removeEventListener('online', flush);
      clearInterval(interval);
    };
  }, [active, flushActionQueue]);

  const fetchRecalls = useCallback(async () => {
    if (!active) return;
    try {
      const rows = await client.fetchRecalls();
      setCompletedOrders(Array.isArray(rows) ? rows : []);
    } catch (err) {
      if (!err?.unauthorized) console.warn('[KDS] recalls error:', err.message);
    }
  }, [active, client]);

  useEffect(() => {
    if (!active) return;
    fetchOrders();
    const interval = setInterval(() => fetchOrders({ silent: true }), pollMs);
    return () => clearInterval(interval);
  }, [active, pollMs, fetchOrders]);

  // A push accelerant on top of the poll above, not a replacement for it —
  // if this never connects (proxy strips SSE, browser quirk, network drop),
  // the poll interval above keeps the board working exactly as it always
  // has. EventSource retries the connection natively, so no reconnect logic
  // is needed here.
  useEffect(() => {
    if (!active || !sseUrl || typeof window === 'undefined' || typeof window.EventSource === 'undefined') return;
    const source = new window.EventSource(sseUrl);
    source.addEventListener('change', () => fetchOrders({ silent: true }));
    return () => source.close();
  }, [active, sseUrl, fetchOrders]);

  const updateStatus = useCallback(async (order, targetStatus, details = {}) => {
    setProcessingId(order.id);
    setErrorNotice('');
    try {
      await client.updateStatus(order.id, targetStatus, details);

      if (['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(targetStatus)) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: targetStatus } : o)));
      }
      fetchOrders({ silent: true });
    } catch (err) {
      if (shouldQueueAction(err)) {
        enqueueAction('status', [order.id, targetStatus, details]);
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: targetStatus } : o)));
        return;
      }
      if (!err?.unauthorized) setErrorNotice(err.message || 'Could not update status.');
    } finally {
      setProcessingId(null);
    }
  }, [client, fetchOrders]);

  const restoreOrder = useCallback(async (order) => {
    const target = order.status === 'DELIVERED' || (order.status === 'COMPLETED' && order.fulfilment === 'DELIVERY')
      ? 'ON_THE_WAY'
      : 'READY';
    await updateStatus(order, target);
    setCompletedOrders((prev) => prev.filter((o) => o.id !== order.id));
  }, [updateStatus]);

  const toggleItemCheck = useCallback(async (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    const checked = !Boolean(checkedItems[key]);
    setCheckedItems((prev) => ({ ...prev, [key]: checked }));
    try {
      await client.toggleItem(orderId, idx, checked);
    } catch (err) {
      if (shouldQueueAction(err)) {
        enqueueAction('item', [orderId, idx, checked]);
        return;
      }
      setCheckedItems((prev) => ({ ...prev, [key]: !checked }));
      if (!err?.unauthorized) setErrorNotice(err.message || 'Could not update kitchen item.');
    }
  }, [client, checkedItems, enqueueAction]);

  const assignTicket = useCallback(async (order, station, assignee) => {
    if (!station?.trim()) return;
    try {
      const assignment = await client.assign(order.id, station.trim(), (assignee || '').trim());
      setOrders((current) => current.map((one) => (one.id === order.id ? { ...one, kdsAssignment: assignment } : one)));
    } catch (err) {
      if (!err?.unauthorized) setErrorNotice(err.message || 'Could not assign ticket.');
    }
  }, [client]);

  const assignDriver = useCallback(async (order) => {
    const name = window.prompt('Driver name:', order.kdsDriver?.name || '');
    if (!name?.trim()) return;
    const phone = window.prompt('Driver phone (optional):', order.kdsDriver?.phone || '');
    if (phone === null) return;
    try {
      const driver = await client.assignDriver(order.id, name.trim(), phone.trim());
      setOrders((current) => current.map((one) => (one.id === order.id ? { ...one, kdsDriver: driver } : one)));
    } catch (err) {
      if (!err?.unauthorized) setErrorNotice(err.message || 'Could not assign driver.');
    }
  }, [client]);

  const fireOrderNow = useCallback(async (orderId) => {
    try {
      const result = await client.fire(orderId);
      setFiredIds((prev) => new Set(prev).add(orderId));
      setOrders((current) => current.map((order) => (
        order.id === orderId
          ? { ...order, kdsFiredAt: result.firedAt, kdsFiredBy: result.firedBy }
          : order
      )));
    } catch (err) {
      if (!err?.unauthorized) setErrorNotice(err.message || 'Could not fire scheduled order.');
    }
  }, [client]);

  const markDineInPaid = useCallback(async (order, method, details = {}) => {
    setProcessingId(order.id);
    setErrorNotice('');
    try {
      const result = await client.markPaid(order.id, method, details);
      setOrders((current) => current.map((one) => (one.id === order.id ? { ...one, paymentStatus: result.status, paymentPaidCents: result.paidCents, paymentRemainingCents: result.remainingCents } : one)));
    } catch (err) {
      if (!err?.unauthorized) setErrorNotice(err.message || 'Could not mark this order paid.');
    } finally {
      setProcessingId(null);
    }
  }, [client]);

  // Scheduled orders don't need kitchen attention the second they're paid —
  // only once they're inside the firing window (or a cook pulls them early).
  // Re-derived every tick (via currentTime) so a held ticket promotes itself
  // automatically as its fire time approaches.
  const { activeQueueOrders, scheduledHoldOrders } = useMemo(() => {
    const held = [];
    const active = [];
    for (const order of orders) {
      if (!firedIds.has(order.id) && isHeldForLater(order)) held.push(order);
      else active.push(order);
    }
    held.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return { activeQueueOrders: active, scheduledHoldOrders: held };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, firedIds, currentTime]);

  const filteredOrders = useMemo(() => {
    return activeQueueOrders.filter((order) => {
      if (filterStage === 'RECEIVED' && !['RECEIVED', 'PAID'].includes(order.status)) return false;
      if (filterStage === 'PREPARING' && order.status !== 'PREPARING') return false;
      if (filterStage === 'READY' && order.status !== 'READY') return false;
      if (filterStage === 'ON_THE_WAY' && order.status !== 'ON_THE_WAY') return false;
      if (filterFulfilment !== 'ALL' && order.fulfilment !== filterFulfilment) return false;
      if (filterStation !== 'ALL' && !(order.lines || []).some((line) => (line.station || 'Expo') === filterStation)) return false;
      return true;
    });
  }, [activeQueueOrders, filterStage, filterFulfilment, filterStation]);

  const activeStations = useMemo(() => Array.from(new Set(
    activeQueueOrders.flatMap((order) => (order.lines || []).map((line) => line.station || 'Expo'))
  )).sort(), [activeQueueOrders]);

  const counts = useMemo(() => {
    const waiting = activeQueueOrders.filter((o) => ['RECEIVED', 'PAID'].includes(o.status)).length;
    const cooking = activeQueueOrders.filter((o) => o.status === 'PREPARING').length;
    const ready = activeQueueOrders.filter((o) => o.status === 'READY').length;
    const onTheWay = activeQueueOrders.filter((o) => o.status === 'ON_THE_WAY').length;
    return { waiting, cooking, ready, onTheWay, total: activeQueueOrders.length, held: scheduledHoldOrders.length };
  }, [activeQueueOrders, scheduledHoldOrders]);

  const allDayPrepSummary = useMemo(() => {
    const map = new Map();
    for (const order of activeQueueOrders) {
      if (order.status === 'READY' || order.status === 'ON_THE_WAY') continue;
      for (const line of order.lines || []) {
        const key = line.name;
        const current = map.get(key) || { name: key, qty: 0, options: [] };
        current.qty += Number(line.qty) || 1;
        if (line.options && !current.options.includes(line.options)) current.options.push(line.options);
        map.set(key, current);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [activeQueueOrders]);

  return {
    orders,
    filteredOrders,
    completedOrders,
    loading,
    refreshing,
    currentTime,
    soundEnabled,
    toggleSound,
    filterStage,
    setFilterStage,
    filterFulfilment,
    setFilterFulfilment,
    filterStation,
    setFilterStation,
    activeStations,
    showPrepSummary,
    setShowPrepSummary,
    showRecallDrawer,
    setShowRecallDrawer,
    checkedItems,
    processingId,
    errorNotice,
    setErrorNotice,
    printingOrder,
    setPrintingOrder,
    connectionStatus,
    pendingActionCount,
    scheduledHoldOrders,
    fireOrderNow,
    counts,
    allDayPrepSummary,
    fetchOrders,
    fetchRecalls,
    updateStatus,
    restoreOrder,
    toggleItemCheck,
    assignTicket,
    assignDriver,
    markDineInPaid
  };
}
