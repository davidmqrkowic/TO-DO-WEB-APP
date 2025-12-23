import React from "react";

export default function ActivityFeed({ items }) {
  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div
          key={a.activityId || `${a.createdAt}-${a.action}`}
          className="flex gap-3 rounded-xl border border-gray-800 bg-gray-950/30 p-3"
        >
          <Avatar url={a.actor?.avatarUrl} name={actorLabel(a.actor)} />

          <div className="min-w-0 flex-1">
            <div className="text-sm text-gray-200 leading-5">
              <span className="font-medium">{actorLabel(a.actor)}</span>{" "}
              {renderActivityText(a)}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function actorLabel(actor) {
  if (!actor) return "Someone";
  const name = `${actor.firstName || ""} ${actor.lastName || ""}`.trim();
  return name || actor.email || "Someone";
}

function renderActivityText(a) {
  const m = a.meta || {};
  const title = m.title || m.taskTitle || "";

  switch (a.action) {
    case "task.created":
      return (
        <>
          created task <strong className="text-white">“{title}”</strong>{" "}
          {m.columnName ? (
            <>
              in <strong className="text-white">{m.columnName}</strong>
            </>
          ) : null}
        </>
      );

    case "task.updated":
      return (
        <>
          updated task <strong className="text-white">“{title}”</strong>
          {Array.isArray(m.fields) && m.fields.length ? (
            <>
              {" "}
              <span className="text-gray-400">
                (changed: {m.fields.join(", ")})
              </span>
            </>
          ) : null}
        </>
      );

    case "task.moved":
      return (
        <>
          moved task <strong className="text-white">“{title}”</strong>{" "}
          {m.fromColumnName && m.toColumnName ? (
            <>
              from <strong className="text-white">{m.fromColumnName}</strong> to{" "}
              <strong className="text-white">{m.toColumnName}</strong>
            </>
          ) : null}
        </>
      );

    case "task.deleted":
      return (
        <>
          deleted task <strong className="text-white">“{title}”</strong>
        </>
      );

    case "task.assignee.added":
      return (
        <>
          assigned{" "}
          <strong className="text-white">
            {m.assigneeName || m.assigneeEmail || `User #${m.assigneeUserId}`}
          </strong>{" "}
          to <strong className="text-white">“{title}”</strong>
        </>
      );

    case "task.assignee.removed":
      return (
        <>
          unassigned{" "}
          <strong className="text-white">
            {m.assigneeName || m.assigneeEmail || `User #${m.assigneeUserId}`}
          </strong>{" "}
          from <strong className="text-white">“{title}”</strong>
        </>
      );

    case "comment.added":
      return (
        <>
          commented on <strong className="text-white">“{title}”</strong>
          {m.bodyPreview ? (
            <>
              {" "}
              <span className="text-gray-400">“{m.bodyPreview}”</span>
            </>
          ) : null}
        </>
      );

    // keep your existing member actions too if you standardize them later
    case "MEMBER_ADDED":
    case "board.member.added":
      return <>added a board member</>;

    case "MEMBER_REMOVED":
    case "board.member.removed":
      return <>removed a board member</>;

    default:
      return (
        <>
          <strong className="text-white">{a.action}</strong>
          {title ? <span className="text-gray-400"> — {title}</span> : null}
        </>
      );
  }
}

function Avatar({ url, name }) {
  const fallback = initials(name);
  if (!url) {
    return (
      <div className="h-9 w-9 shrink-0 rounded-full border border-gray-800 bg-gray-900/40 flex items-center justify-center text-[11px] text-gray-300">
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="avatar"
      className="h-9 w-9 shrink-0 rounded-full object-cover border border-gray-800"
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
