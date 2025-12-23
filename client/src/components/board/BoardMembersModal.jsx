import React, { useEffect, useMemo, useState } from "react";
import { fetchBoardMembers, addBoardMember, removeBoardMember } from "../../api/boardMembers";
import { fetchFriendState, fetchAllUsers } from "../../api/friends";

export default function BoardMembersModal({ open, onClose, boardId, board, me }) {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [friendState, setFriendState] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  

const isOwner = true;

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      try {
        const [m, fs, all] = await Promise.all([
          fetchBoardMembers(boardId),
          fetchFriendState(),
          fetchAllUsers(),
        ]);

        setMembers(Array.isArray(m?.members) ? m.members : []);
        setFriendState(fs);
        setUsers(Array.isArray(all) ? all : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, boardId]);

  const memberUserIds = useMemo(
    () => new Set(members.map((m) => Number(m.userId))),
    [members]
  );

  const friendsList = useMemo(() => {
    const friendIds = new Set((friendState?.friends || []).map((x) => Number(x)));
    const list = users
      .filter((u) => friendIds.has(Number(u.userId)))
      .filter((u) => !memberUserIds.has(Number(u.userId))); // samo oni koji nisu već u boardu
    list.sort((a, b) =>
      `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(`${b.firstName || ""} ${b.lastName || ""}`)
    );
    return list;
  }, [friendState, users, memberUserIds]);

  async function onAdd() {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const uid = Number(selectedUserId);
      await addBoardMember(boardId, uid);
      const m = await fetchBoardMembers(boardId);
      setMembers(Array.isArray(m?.members) ? m.members : []);
      setSelectedUserId("");
    } finally {
      setLoading(false);
    }
  }

  async function onRemove(userId) {
    setLoading(true);
    try {
      await removeBoardMember(boardId, userId);
      const m = await fetchBoardMembers(boardId);
      setMembers(Array.isArray(m?.members) ? m.members : []);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-950 p-4 text-white"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Board members</div>
          <button className="rounded-lg border border-gray-800 px-3 py-1 text-sm hover:bg-gray-900" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {isOwner && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-3">
              <div className="text-sm text-gray-300">Add from friends</div>
              <div className="mt-2 flex gap-2">
                <select
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select friend...</option>
                  {friendsList.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {(u.firstName || "") + " " + (u.lastName || "")} ({u.email})
                    </option>
                  ))}
                </select>

                <button
                  className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  onClick={onAdd}
                  disabled={loading || !selectedUserId}
                >
                  Add
                </button>
              </div>

              {!friendsList.length && (
                <div className="mt-2 text-xs text-gray-500">
                  No available friends to add (either you have none, or they are already members).
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-900/20 p-3">
            <div className="text-sm text-gray-300">Current members</div>

            <div className="mt-2 space-y-2">
              {members.map((m) => {
                const u = m.user;
                const name = u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : `User #${m.userId}`;
                const isSelf = me && Number(m.userId) === Number(me.userId);
                const canRemove = isOwner && !isSelf && m.role !== "owner";

                return (
                  <div key={m.userId} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{name}</div>
                      <div className="truncate text-xs text-gray-500">
                        {u?.email || ""} {m.role ? `• ${m.role}` : ""}
                      </div>
                    </div>

                    {canRemove ? (
                      <button
                        className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs hover:bg-red-950/70 disabled:opacity-50"
                        disabled={loading}
                        onClick={() => onRemove(Number(m.userId))}
                      >
                        Remove
                      </button>
                    ) : (
                      <div className="text-xs text-gray-600">{isSelf ? "You" : ""}</div>
                    )}
                  </div>
                );
              })}

              {!members.length && <div className="text-xs text-gray-500">No members</div>}
            </div>
          </div>
        </div>

        {loading && <div className="mt-3 text-xs text-gray-500">Working...</div>}
      </div>
    </div>
  );
}
