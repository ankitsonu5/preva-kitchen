import { col, asObjectId } from './db.js';

/**
 * Records who changed what.
 *
 * Failures here are swallowed on purpose: an audit write that fails should not
 * roll back the change the operator just made, and it should certainly not
 * return an error to them. The console line is enough to notice it in logs.
 */
export async function logActivity(ctx, action, entityType, entityName) {
  try {
    const logs = await col('activityLog');
    await logs.insertOne({
      userId: ctx?.user?.id ? asObjectId(ctx.user.id) : null,
      userName: ctx?.user?.email || 'Public',
      action,
      entityType,
      entityName: String(entityName || '').slice(0, 200),
      ipAddress: ctx?.ip || '',
      createdAt: new Date()
    });
  } catch (error) {
    console.error('[activity] could not write log entry', error);
  }
}
