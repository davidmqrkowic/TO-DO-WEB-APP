import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function BoardHeader({
  board,
  onRename,
  onRefresh,
  rightSlot,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board?.name || "");

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  function startEdit() {
    setName(board?.name || "");
    setEditing(true);
  }

  async function save() {
    if (!canSave) return;
    await onRename?.(name.trim());
    setEditing(false);
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs text-gray-400">Board</div>

        {!editing ? (
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold truncate">
              {board?.name || "Untitled"}
            </h1>

            <button
              onClick={startEdit}
              className="rounded-lg border border-gray-800 px-3 py-1.5 text-sm hover:bg-gray-900"
              type="button"
            >
              Rename
            </button>

            <button
              onClick={onRefresh}
              className="rounded-lg border border-gray-800 px-3 py-1.5 text-sm hover:bg-gray-900"
              type="button"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="w-80 max-w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name..."
            />
            <button
              disabled={!canSave}
              onClick={save}
              className="rounded-lg bg-white text-gray-900 font-medium px-4 py-2 disabled:opacity-60"
              type="button"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-800 px-3 py-2 text-sm hover:bg-gray-900"
              type="button"
            >
              Cancel
            </button>
          </div>
        )}

        {board?.boardId != null && (
          <div className="text-xs text-gray-500 mt-1">id: {board.boardId}</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        <Link
          to="/boards"
          className="rounded-lg border border-gray-800 px-3 py-2 text-sm hover:bg-gray-900"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
