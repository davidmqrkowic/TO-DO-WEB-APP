import express from "express";
import { z } from "zod";
import { Op } from "sequelize";
import { requireAuth } from "../middleware/auth.js";
import { Friend, User } from "../models/index.js";
import { logActivity } from "../services/activityLog.js";

const router = express.Router();

const requestSchema = z.object({
  toUserId: z.number().int().positive(),
});

// helper: find request even if PK isn't friendshipId
async function findFriendship(friendshipId) {
  const id = Number(friendshipId);

  // try PK
  let fr = await Friend.findByPk(id);
  if (fr) return fr;

  // fallback if PK is different
  fr = await Friend.findOne({ where: { friendshipId: id } });
  return fr;
}

/* =====================
   GET /friends/state
   returns:
   { friends:[userId], incoming:[{id,fromUserId}], outgoing:[{id,toUserId}] }
===================== */
router.get("/state", requireAuth, async (req, res) => {
  try {
    const me = Number(req.user.userId);

    const accepted = await Friend.findAll({
      where: {
        status: "accepted",
        [Op.or]: [{ requesterId: me }, { addresseeId: me }],
      },
    });

    const pendingIncoming = await Friend.findAll({
      where: { addresseeId: me, status: "pending" },
      order: [["createdAt", "DESC"]],
    });

    const pendingOutgoing = await Friend.findAll({
      where: { requesterId: me, status: "pending" },
      order: [["createdAt", "DESC"]],
    });

    const friends = accepted.map((fr) => {
      const otherId = Number(fr.requesterId) === me ? fr.addresseeId : fr.requesterId;
      return Number(otherId);
    });

    const incoming = pendingIncoming.map((fr) => ({
      id: Number(fr.friendshipId),
      fromUserId: Number(fr.requesterId),
    }));

    const outgoing = pendingOutgoing.map((fr) => ({
      id: Number(fr.friendshipId),
      toUserId: Number(fr.addresseeId),
    }));

    return res.json({ friends, incoming, outgoing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   POST /friends/request
   body: { toUserId }
===================== */
router.post("/request", requireAuth, async (req, res) => {
  try {
    const me = Number(req.user.userId);
    const data = requestSchema.parse(req.body);

    const other = await User.findByPk(data.toUserId);
    if (!other) return res.status(404).json({ message: "User not found" });

    const otherId = Number(other.userId);
    if (otherId === me) return res.status(400).json({ message: "Cannot friend yourself" });

    const existing = await Friend.findOne({
      where: {
        [Op.or]: [
          { requesterId: me, addresseeId: otherId },
          { requesterId: otherId, addresseeId: me },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") return res.status(409).json({ message: "Already friends" });
      if (existing.status === "pending") return res.status(409).json({ message: "Request already pending" });
    }

    const fr = await Friend.create({
      requesterId: me,
      addresseeId: otherId,
      status: "pending",
    });

    await logActivity({
      actorUserId: me,
      boardId: null,
      entityType: "friend",
      entityId: Number(fr.friendshipId),
      action: "FRIEND_REQUEST_SENT",
      meta: { toUserId: otherId },
      req,
    });

    return res.status(201).json({
      friendRequest: {
        id: Number(fr.friendshipId),
        friendshipId: Number(fr.friendshipId),
        requesterId: Number(fr.requesterId),
        addresseeId: Number(fr.addresseeId),
        status: fr.status,
      },
    });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Validation error", issues: err.issues });
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   ACCEPT / REJECT
   supports BOTH:
   POST /friends/:friendshipId/accept
   POST /friends/requests/:friendshipId/accept
   POST /friends/:friendshipId/reject
   POST /friends/requests/:friendshipId/reject
===================== */
async function acceptRequest(req, res) {
  try {
    const me = Number(req.user.userId);
    const friendshipId = Number(req.params.friendshipId);

    const fr = await findFriendship(friendshipId);
    if (!fr) return res.status(404).json({ message: "Request not found" });

    if (Number(fr.addresseeId) !== me) return res.status(403).json({ message: "Not allowed" });
    if (fr.status !== "pending") return res.status(400).json({ message: "Request is not pending" });

    await fr.update({ status: "accepted" });

    await logActivity({
      actorUserId: me,
      boardId: null,
      entityType: "friend",
      entityId: Number(fr.friendshipId),
      action: "FRIEND_REQUEST_ACCEPTED",
      meta: { fromUserId: Number(fr.requesterId) },
      req,
    });

    return res.json({ friend: fr });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function rejectRequest(req, res) {
  try {
    const me = Number(req.user.userId);
    const friendshipId = Number(req.params.friendshipId);

    const fr = await findFriendship(friendshipId);
    if (!fr) return res.status(404).json({ message: "Request not found" });

    if (Number(fr.addresseeId) !== me) return res.status(403).json({ message: "Not allowed" });
    if (fr.status !== "pending") return res.status(400).json({ message: "Request is not pending" });

    await fr.update({ status: "rejected" });

    await logActivity({
      actorUserId: me,
      boardId: null,
      entityType: "friend",
      entityId: Number(fr.friendshipId),
      action: "FRIEND_REQUEST_REJECTED",
      meta: { fromUserId: Number(fr.requesterId) },
      req,
    });

    return res.json({ message: "Rejected", friend: fr });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

router.post("/:friendshipId/accept", requireAuth, acceptRequest);
router.post("/requests/:friendshipId/accept", requireAuth, acceptRequest);
router.post("/:friendshipId/reject", requireAuth, rejectRequest);
router.post("/requests/:friendshipId/reject", requireAuth, rejectRequest);

/* =====================
   DELETE /friends/:userId
   remove accepted friendship by other user id
===================== */
router.delete("/:userId", requireAuth, async (req, res) => {
  try {
    const me = Number(req.user.userId);
    const otherId = Number(req.params.userId);

    const fr = await Friend.findOne({
      where: {
        status: "accepted",
        [Op.or]: [
          { requesterId: me, addresseeId: otherId },
          { requesterId: otherId, addresseeId: me },
        ],
      },
    });

    if (!fr) return res.status(404).json({ message: "Friendship not found" });

    await Friend.destroy({ where: { friendshipId: fr.friendshipId } });

    await logActivity({
      actorUserId: me,
      boardId: null,
      entityType: "friend",
      entityId: Number(fr.friendshipId),
      action: "FRIEND_REMOVED",
      meta: { requesterId: Number(fr.requesterId), addresseeId: Number(fr.addresseeId) },
      req,
    });

    return res.json({ message: "Removed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
