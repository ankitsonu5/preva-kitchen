import { EventEmitter } from 'node:events';
import { col } from './db.js';

/**
 * A single in-process bus that tells every open KDS screen "something on the
 * board changed, refetch now." It carries no payload on purpose — the
 * existing polling fetch already knows how to build the correct ticket list
 * for whichever entry point asks, so this only needs to wake it up sooner.
 *
 * This does not replace polling. It rides on top of it: if no browser is
 * subscribed (SSE unsupported, blocked by a proxy, still reconnecting), the
 * existing poll timer keeps working exactly as it always has.
 */
export const kdsEvents = new EventEmitter();
kdsEvents.setMaxListeners(100); // many kitchen screens/terminals can be open at once

export function notifyKdsChange() {
  kdsEvents.emit('change');
  // Best-effort durable signal for deployments with more than one backend.
  // The local emitter remains the low-latency path; Mongo polling bridges processes.
  col('kdsEvents').then(async (events) => {
    const now = new Date();
    await events.insertOne({ type: 'change', createdAt: now });
    await events.deleteMany({ createdAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } });
  }).catch(() => {});
}

export async function latestKdsEvent(since) {
  const events = await col('kdsEvents');
  return events.findOne({ createdAt: { $gt: since } }, { sort: { createdAt: 1 } });
}
