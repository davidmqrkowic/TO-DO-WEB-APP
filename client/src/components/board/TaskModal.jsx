import React, { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http"; // adjust if your path differs

export default function TaskModal({
  open,
  task,
  boardId,
  onClose,
  onSave,
  onDelete,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(""); // datetime-local
  const [saving, setSaving] = useState(false);

  // members + assignees
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState([]); // [{userId,email,firstName,lastName,avatarUrl}]
  const [assignees, setAssignees] = useState([]); // number[]
  const [assigneesSaving, setAssigneesSaving] = useState(false);

  // comments
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState([]); // [{commentId, body, createdAt, user:{...}}]
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const taskId = Number(task?.taskId);

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  function userLabel(u) {
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name ? `${name} (${u.email || ""})` : u.email || `User #${u.userId}`;
  }

  async function loadMembers() {
    if (!boardId) return;
    setMembersLoading(true);
    try {
      const { data } = await http.get(`/boards/${boardId}/members`);
      const list = Array.isArray(data?.members) ? data.members : [];
      const normalized = list.map((m) => (m.user ? m.user : m));
      setMembers(normalized);
    } catch (_) {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadAssignees() {
    if (!taskId) return;
    try {
      const { data } = await http.get(`/tasks/${taskId}/assignees`);
      const ids = Array.isArray(data?.userIds)
        ? data.userIds
        : Array.isArray(data)
        ? data
        : [];
      setAssignees(ids.map((x) => Number(x)));
    } catch (_) {
      setAssignees([]);
    }
  }

  async function saveAssignees(nextIds) {
    if (!taskId) return;
    setAssigneesSaving(true);
    try {
      await http.put(`/tasks/${taskId}/assignees`, { userIds: nextIds });
      setAssignees(nextIds);
    } finally {
      setAssigneesSaving(false);
    }
  }

  async function loadComments() {
    if (!taskId) return;
    setCommentsLoading(true);
    try {
      const { data } = await http.get(`/tasks/${taskId}/comments`);
      setComments(
        Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      );
    } catch (_) {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function addComment() {
    const body = newComment.trim();
    if (!body || !taskId) return;
    setCommentSaving(true);
    try {
      await http.post(`/tasks/${taskId}/comments`, { body });
      setNewComment("");
      await loadComments();
    } finally {
      setCommentSaving(false);
    }
  }

  async function saveTask() {
    if (!task || !canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };
      await onSave?.(task.taskId, payload);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  async function delTask() {
    if (!task) return;
    const ok = confirm("Delete this task?");
    if (!ok) return;
    setSaving(true);
    try {
      await onDelete?.(task.taskId);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  function toggleAssignee(uid) {
    const id = Number(uid);
    const next = assignees.includes(id)
      ? assignees.filter((x) => x !== id)
      : [...assignees, id];
    void saveAssignees(next);
  }

  const assigneeUsers = useMemo(() => {
    const set = new Set(assignees.map((x) => Number(x)));
    return members.filter((m) => set.has(Number(m.userId)));
  }, [assignees, members]);

  useEffect(() => {
    if (!task || !open) return;

    setTitle(task.title || "");
    setDescription(task.description || "");
    setDueDate(task.dueDate ? toLocalInput(task.dueDate) : "");

    // reset UI state
    setComments([]);
    setNewComment("");
    setAssignees([]);

    // load members + assignees + comments
    void loadMembers();
    void loadAssignees();
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.taskId, open, boardId]);

  // IMPORTANT: early return AFTER all hooks
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-950 text-white"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-900 px-5 py-4">
          <div className="font-semibold">Task</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-800 px-3 py-1.5 text-sm hover:bg-gray-900"
          >
            Close
          </button>
        </div>

<div className="px-6 py-5">
  <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
    {/* LEFT */}
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
        <div className="text-xs text-gray-400 mb-1">Title</div>
        <input
          className="w-full rounded-xl bg-gray-950 border border-gray-800 px-3 py-2.5 text-sm outline-none focus:border-gray-600"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
        <div className="text-xs text-gray-400 mb-1">Description</div>
        <textarea
          className="w-full min-h-[160px] rounded-xl bg-gray-950 border border-gray-800 px-3 py-2.5 text-sm outline-none focus:border-gray-600"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional..."
        />
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Due date</div>
          <input
            type="datetime-local"
            className="rounded-xl bg-gray-950 border border-gray-800 px-3 py-2.5 text-sm outline-none focus:border-gray-600"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="text-xs text-gray-600">
          Task ID: <span className="text-gray-400">{taskId}</span>
        </div>
      </div>

      {/* COMMENTS */}
      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Comments</div>
          <button
            type="button"
            onClick={loadComments}
            className="h-9 rounded-xl border border-gray-800 px-3 text-sm hover:bg-gray-900 disabled:opacity-60"
            disabled={commentsLoading}
          >
            {commentsLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
          {commentsLoading ? (
            <div className="text-sm text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-500">No comments yet.</div>
          ) : (
            comments.map((c) => (
              <div
                key={c.commentId || `${c.createdAt}-${c.body}`}
                className="rounded-xl border border-gray-800 bg-gray-950/60 p-3"
              >
                <div className="text-sm whitespace-pre-wrap">{c.body}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {c.user ? userLabel(c.user) : "Unknown"} •{" "}
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="h-10 flex-1 rounded-xl bg-gray-950 border border-gray-800 px-3 text-sm outline-none focus:border-gray-600"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
          />
          <button
            type="button"
            onClick={addComment}
            disabled={commentSaving || !newComment.trim()}
            className="h-10 rounded-xl bg-white text-gray-900 font-medium px-4 disabled:opacity-60"
          >
            {commentSaving ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>

    {/* RIGHT */}
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Assignees</div>
          <div className="text-xs text-gray-500">
            {assigneesSaving ? "Saving..." : " "}
          </div>
        </div>

        {/* chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {assigneeUsers.length === 0 ? (
            <div className="text-sm text-gray-500">No assignees.</div>
          ) : (
            assigneeUsers.map((u) => (
              <div
                key={u.userId}
                className="flex items-center gap-2 rounded-full border border-gray-800 bg-gray-950/70 px-3 py-1.5 text-xs"
              >
                <Avatar url={u.avatarUrl} name={userLabel(u)} />
                <div className="max-w-[180px] truncate">
                  {u.firstName || u.email || "User"}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Click to assign / unassign
        </div>

        {/* members list */}
        <div className="mt-2 space-y-2 max-h-[360px] overflow-auto pr-1">
          {membersLoading ? (
            <div className="text-sm text-gray-500">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-sm text-gray-500">No members.</div>
          ) : (
            members.map((m) => {
              const uid = Number(m.userId);
              const checked = assignees.includes(uid);

              return (
                <button
                  key={uid}
                  type="button"
                  onClick={() => toggleAssignee(uid)}
                  disabled={assigneesSaving}
                  className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left hover:bg-gray-900 disabled:opacity-60 ${
                    checked
                      ? "border-white/40 bg-white/10"
                      : "border-gray-800 bg-gray-950/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar url={m.avatarUrl} name={userLabel(m)} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {`${m.firstName || ""} ${m.lastName || ""}`.trim() ||
                          m.email ||
                          `User #${uid}`}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {m.email || ""}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] border ${
                      checked
                        ? "border-white/40 text-white"
                        : "border-gray-800 text-gray-500"
                    }`}
                  >
                    {checked ? "Assigned" : "Assign"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={delTask}
            disabled={saving}
            className="h-10 rounded-xl border border-red-800 bg-red-950/40 px-4 text-sm hover:bg-red-950/70 disabled:opacity-60"
          >
            Delete
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-gray-800 px-4 text-sm hover:bg-gray-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveTask}
              disabled={!canSave || saving}
              className="h-10 rounded-xl bg-white text-gray-900 font-medium px-4 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


              <div className="text-xs text-gray-600">Task ID: {taskId}</div>
            </div>
          </div>
  );
}

function Avatar({ url, name }) {
  const fallback = initials(name);
  if (!url) {
    return (
      <div className="h-7 w-7 shrink-0 rounded-full border border-gray-800 bg-gray-900/40 flex items-center justify-center text-[10px] text-gray-300">
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="avatar"
      className="h-7 w-7 shrink-0 rounded-full object-cover border border-gray-800"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function initials(s) {
  const str = (s || "").trim();
  if (!str) return "U";
  const parts = str.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
