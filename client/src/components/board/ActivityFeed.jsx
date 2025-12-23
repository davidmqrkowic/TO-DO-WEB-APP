import React from "react";

export default function ActivityFeed({ items }) {
  return (
    <div className="space-y-2 text-sm">
      {items.map((a) => (
        <div
          key={a.activityId || `${a.createdAt}-${a.action}`}
          className="rounded-xl border border-gray-800 bg-gray-950/30 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {a.actor?.avatarUrl ? (
                <img
                  src={a.actor.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full border border-gray-800 object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full border border-gray-800 bg-gray-900" />
              )}

              <div className="min-w-0">
                <div className="text-gray-200 truncate">
                  <span className="font-medium">{actorLabel(a.actor)}</span>{" "}
                  <span className="text-gray-400">{renderActivityText(a)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 shrink-0">{prettyAction(a.action)}</div>
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

function prettyAction(action = "") {
  // task.created -> TASK
  const [scope] = String(action).split(".");
  return String(scope || action).toUpperCase();
}

function renderActivityText(a) {
  const m = a.meta || {};
  const title = m.title || m.taskTitle || m.taskName || "";

  switch (a.action) {
    case "task.created":
      return (
        <>
          created task <span className="font-semibold text-gray-200">“{title}”</span>
          {m.columnName ? <> in <span className="font-semibold text-gray-200">{m.columnName}</span></> : null}
        </>
      );

    case "task.updated":
      return (
        <>
          updated task <span className="font-semibold text-gray-200">“{title}”</span>
          {Array.isArray(m.fields) && m.fields.length ? (
            <> (changed: <span className="text-gray-300">{m.fields.join(", ")}</span>)</>
          ) : null}
        </>
      );

    case "task.moved":
      return (
        <>
          moved task <span className="font-semibold text-gray-200">“{title}”</span>
          {m.fromColumnName || m.toColumnName ? (
            <>
              {" "}
              from <span className="font-semibold text-gray-200">{m.fromColumnName || "?"}</span> to{" "}
              <span className="font-semibold text-gray-200">{m.toColumnName || "?"}</span>
            </>
          ) : null}
        </>
      );

    case "task.deleted":
      return (
        <>
          deleted task <span className="font-semibold text-gray-200">“{title}”</span>
        </>
      );

    case "task.assignee.added":
      return (
        <>
          assigned{" "}
          <span className="font-semibold text-gray-200">
            {m.assigneeName || m.assigneeEmail || `User #${m.assigneeUserId}`}
          </span>{" "}
          to <span className="font-semibold text-gray-200">“{title}”</span>
        </>
      );

    case "task.assignee.removed":
      return (
        <>
          unassigned{" "}
          <span className="font-semibold text-gray-200">
            {m.assigneeName || m.assigneeEmail || `User #${m.assigneeUserId}`}
          </span>{" "}
          from <span className="font-semibold text-gray-200">“{title}”</span>
        </>
      );

    case "comment.added":
      return (
        <>
          commented on <span className="font-semibold text-gray-200">“{title}”</span>
          {m.bodyPreview ? <>: <span className="text-gray-300">“{m.bodyPreview}”</span></> : null}
        </>
      );

    case "MEMBER_ADDED":
    case "board.member.added":
      return <>added a member</>;

    case "MEMBER_REMOVED":
    case "board.member.removed":
      return <>removed a member</>;

    default:
      return (
        <>
          <span className="font-semibold text-gray-200">{a.action}</span>
          {title ? <> — <span className="text-gray-300">{title}</span></> : null}
        </>
      );
  }
}
