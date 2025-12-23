import React, { useEffect, useMemo, useState } from "react";
import Avatar from "../components/common/Avatar";
import {
  fetchAllUsers,
  fetchFriendState,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../api/friends";
import { useAuth } from "../auth/AuthContext";

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-3">
      <div className="text-xl font-semibold">{title}</div>
      {subtitle ? <div className="text-sm text-gray-400 mt-1">{subtitle}</div> : null}
    </div>
  );
}

export default function Friends() {
  const { user } = useAuth();

  const [allUsers, setAllUsers] = useState([]);
  const [state, setState] = useState({ friends: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("all"); // all | friends | requests
  const [search, setSearch] = useState("");

  const meId = useMemo(() => {
    const raw = user?.id ?? user?.userId ?? null;
    return raw === null || raw === undefined ? null : Number(raw);
  }, [user]);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const [usersData, stateData] = await Promise.all([fetchAllUsers(), fetchFriendState()]);
      const users = Array.isArray(usersData) ? usersData : usersData.users || [];

      setAllUsers(users);

      setState({
        friends: (stateData?.friends || []).map((x) => Number(x)),
        incoming: (stateData?.incoming || []).map((r) => ({
          id: Number(r.id),
          fromUserId: Number(r.fromUserId),
        })),
        outgoing: (stateData?.outgoing || []).map((r) => ({
          id: Number(r.id),
          toUserId: Number(r.toUserId),
        })),
      });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const friendSet = useMemo(() => new Set(state.friends), [state.friends]);
  const outgoingSet = useMemo(() => new Set(state.outgoing.map((r) => r.toUserId)), [state.outgoing]);
  const incomingByFrom = useMemo(() => {
    const m = new Map();
    for (const r of state.incoming) m.set(r.fromUserId, r);
    return m;
  }, [state.incoming]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const base = allUsers
      .map((u) => ({ ...u, __uid: Number(u.id ?? u.userId) }))
      .filter((u) => Number.isFinite(u.__uid))
      .filter((u) => (meId !== null ? u.__uid !== meId : true)) // NEVER show self
      .filter((u) => {
        if (!term) return true;
        const name = `${u.firstName || ""} ${u.lastName || ""}`.trim().toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(term) || email.includes(term);
      });

    if (query === "friends") {
      return base.filter((u) => friendSet.has(u.__uid));
    }
    if (query === "requests") {
      return base.filter((u) => outgoingSet.has(u.__uid) || incomingByFrom.has(u.__uid));
    }
    return base;
  }, [allUsers, friendSet, incomingByFrom, outgoingSet, query, search, meId]);

  function statusFor(uid) {
    if (friendSet.has(uid)) return "FRIEND";
    if (incomingByFrom.has(uid)) return "INCOMING";
    if (outgoingSet.has(uid)) return "OUTGOING";
    return "NONE";
  }

  async function onAdd(uid) {
    setBusyId(uid);
    setError("");
    try {
      await sendFriendRequest(uid);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to send request");
    } finally {
      setBusyId(null);
    }
  }

  async function onAccept(requestId) {
    setBusyId(requestId);
    setError("");
    try {
      await acceptFriendRequest(requestId);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to accept request");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(requestId) {
    setBusyId(requestId);
    setError("");
    try {
      await rejectFriendRequest(requestId);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to reject request");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(uid) {
    setBusyId(uid);
    setError("");
    try {
      await removeFriend(uid);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to remove friend");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionTitle title="Friends" subtitle="Manage friends, pending requests, and discover users." />

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setQuery("all")}
            className={`px-3 py-2 rounded-lg text-sm border ${
              query === "all" ? "bg-white text-gray-900 border-white" : "border-gray-800 hover:bg-gray-900"
            }`}
          >
            All users
          </button>
          <button
            onClick={() => setQuery("friends")}
            className={`px-3 py-2 rounded-lg text-sm border ${
              query === "friends" ? "bg-white text-gray-900 border-white" : "border-gray-800 hover:bg-gray-900"
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setQuery("requests")}
            className={`px-3 py-2 rounded-lg text-sm border ${
              query === "requests" ? "bg-white text-gray-900 border-white" : "border-gray-800 hover:bg-gray-900"
            }`}
          >
            Requests
          </button>
        </div>

        <input
          className="w-full sm:w-80 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/30 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-gray-400 border-b border-gray-800">
          <div className="col-span-5">User</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-3 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-4 text-gray-400">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-gray-400">No users found.</div>
        ) : (
          filteredUsers.map((u) => {
            const uid = u.__uid;
            const st = statusFor(uid);

            const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.name || "Unnamed user";
            const incomingReq = incomingByFrom.get(uid);

            return (
              <div key={uid} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 items-center">
                <div className="col-span-5 flex items-center gap-3">
                  <Avatar user={u} size={36} />
                  <div>
                    <div className="font-medium">{fullName}</div>
                    <div className="text-xs text-gray-500">ID: {uid}</div>
                  </div>
                </div>
                <div className="col-span-4 text-sm text-gray-300">{u.email || "-"}</div>
                <div className="col-span-3 flex justify-end gap-2">
                  {st === "FRIEND" && (
                    <button
                      disabled={busyId === uid}
                      onClick={() => onRemove(uid)}
                      className="px-3 py-2 rounded-lg text-sm border border-gray-800 hover:bg-gray-900 disabled:opacity-60"
                    >
                      {busyId === uid ? "..." : "Remove"}
                    </button>
                  )}

                  {st === "OUTGOING" && (
                    <div className="px-3 py-2 rounded-lg text-sm border border-gray-800 text-gray-300">
                      Requested
                    </div>
                  )}

                  {st === "INCOMING" && incomingReq && (
                    <>
                      <button
                        disabled={busyId === incomingReq.id}
                        onClick={() => onAccept(incomingReq.id)}
                        className="px-3 py-2 rounded-lg text-sm bg-white text-gray-900 disabled:opacity-60"
                      >
                        {busyId === incomingReq.id ? "..." : "Accept"}
                      </button>
                      <button
                        disabled={busyId === incomingReq.id}
                        onClick={() => onReject(incomingReq.id)}
                        className="px-3 py-2 rounded-lg text-sm border border-gray-800 hover:bg-gray-900 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {st === "NONE" && (
                    <button
                      disabled={busyId === uid}
                      onClick={() => onAdd(uid)}
                      className="px-3 py-2 rounded-lg text-sm bg-white text-gray-900 disabled:opacity-60"
                    >
                      {busyId === uid ? "..." : "Add"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
