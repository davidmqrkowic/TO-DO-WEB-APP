import React, { useMemo, useState } from "react";

export default function BoardColumns({
  boardId,
  columns,
  tasks,
  onCreateTask,
  onOpenTask,
  onMoveTask,
}) {
  const [newTitleByCol, setNewTitleByCol] = useState({});

  const tasksByColumn = useMemo(() => {
    const map = new Map();
    for (const c of columns) map.set(c.columnId, []);
    for (const t of tasks) {
      const arr = map.get(t.columnId) || [];
      arr.push(t);
      map.set(t.columnId, arr);
    }
    // tasks already ordered by backend, but keep safe
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      map.set(k, arr);
    }
    return map;
  }, [columns, tasks]);

  async function submitCreate(e, columnId) {
    e.preventDefault();
    const title = (newTitleByCol[columnId] || "").trim();
    if (!title) return;

    await onCreateTask?.(columnId, title);
    setNewTitleByCol((s) => ({ ...s, [columnId]: "" }));
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {columns.map((col) => {
          const colTasks = tasksByColumn.get(col.columnId) || [];
          return (
            <div
              key={col.columnId}
              className="w-[320px] shrink-0 rounded-2xl border border-gray-800 bg-gray-900/30 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{col.name}</div>
                <div className="text-xs text-gray-500">{colTasks.length}</div>
              </div>

              <form
                onSubmit={(e) => submitCreate(e, col.columnId)}
                className="mt-3 flex gap-2"
              >
                <input
                  className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-600"
                  placeholder="New task..."
                  value={newTitleByCol[col.columnId] || ""}
                  onChange={(e) =>
                    setNewTitleByCol((s) => ({
                      ...s,
                      [col.columnId]: e.target.value,
                    }))
                  }
                />
                <button className="rounded-lg bg-white text-gray-900 font-medium px-3 text-sm">
                  Add
                </button>
              </form>

              <div className="mt-3 space-y-2">
                {colTasks.map((t, idx) => {
                  const canLeft = col.position > 0;
                  const canRight = col.position < columns.length - 1;

                  return (
                    <div
                      key={t.taskId}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenTask?.(t)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onOpenTask?.(t);
                      }}
                      className="cursor-pointer rounded-xl border border-gray-800 bg-gray-950/40 p-3 hover:bg-gray-950/70 transition focus:outline-none focus:ring-2 focus:ring-gray-700"
                    >
                      <div className="text-sm font-medium">{t.title}</div>

                      {t.dueDate && (
                        <div className="text-xs text-gray-400 mt-1">
                          Due: {new Date(t.dueDate).toLocaleString()}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500">pos {idx + 1}</div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!canLeft}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canLeft) return;
                              const targetCol = columns[col.position - 1];
                              onMoveTask?.(t.taskId, targetCol.columnId, 0);
                            }}
                            className="rounded-lg border border-gray-800 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-900"
                          >
                            ←
                          </button>

                          <button
                            type="button"
                            disabled={!canRight}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canRight) return;
                              const targetCol = columns[col.position + 1];
                              onMoveTask?.(t.taskId, targetCol.columnId, 0);
                            }}
                            className="rounded-lg border border-gray-800 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-900"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="text-sm text-gray-500 py-6 text-center">
                    No tasks.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
