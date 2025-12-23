import { ActivityLog } from "../models/index.js";

export async function logActivity({ req, actorUserId, boardId, entityType, entityId, action, meta = null }) {
  try {
    const actor = Number(actorUserId || req?.user?.userId);
    if (!actor) return;

    await ActivityLog.create({
      actorUserId: actor,
      boardId: boardId ?? null,
      entityType,
      entityId: Number(entityId),
      action,
      meta: meta ?? null,
      ip: req?.ip || null,
      userAgent: req?.get?.("user-agent") || null,
    });
  } catch (err) {
    // never crash request because of logging
    console.error("logActivity ERROR:", err?.message || err);
  }
}
