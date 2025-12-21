import { ActivityLog } from "../models/index.js";

export async function logActivity({
  actorUserId,
  boardId = null,
  entityType,
  entityId,
  action,
  meta = null,
  req = null,
}) {
  return ActivityLog.create({
    actorUserId,
    boardId,
    entityType,
    entityId,
    action,
    meta,
    ip: req?.ip || null,
    userAgent: req?.headers?.["user-agent"] || null,
  });
}
