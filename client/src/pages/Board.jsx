// client/src/pages/Board.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchBoardFull, renameBoard } from "../api/boards";
import { fetchBoardActivity } from "../api/activity";
import { createTask, deleteTask, moveTask, updateTask } from "../api/tasks";
import BoardHeader from "../components/board/BoardHeader";
import BoardColumns from "../components/board/BoardColumns";
import TaskModal from "../components/board/TaskModal";
import BoardMembersModal from "../components/board/BoardMembersModal";
import ActivityFeed from "../components/board/ActivityFeed";

export default function Board() {
  const { boardId } = useParams();
  const id = Number(boardId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [membersOpen, setMembersOpen] = useState(false);

  const [activityOpen, setActivityOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await fetchBoardFull(id);
      setBoard(data.board);
      setColumns(data.columns || []);
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load board");
    } finally {
      setLoading(false);
    }
  }

  async function loadActivity() {
    setActivityLoading(true);
    try {
      const data = await fetchBoardActivity(id, { limit: 80, offset: 0 });
      setActivity(data.items || []);
    } catch (err) {
      // optional UI
    } finally {
      setActivityLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    load();
  }, [id]);

  const tasksSorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.columnId !== b.columnId) return a.columnId - b.columnId;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  }, [tasks]);

  async function onRename(name) {
    await renameBoard(id, name);
    await load();
  }

  async function onCreateTask(columnId, title) {
    await createTask({ columnId, title });
    await load();
    if (activityOpen) await loadActivity();
  }

  async function onMoveTask(taskId, toColumnId, newPosition) {
    await moveTask(taskId, { toColumnId, newPosition });
    await load();
    if (activityOpen) await loadActivity();
  }

  async function onSaveTask(taskId, payload) {
    await updateTask(taskId, payload);
    await load();
    if (activityOpen) await loadActivity();
  }

  async function onDeleteTask(taskId) {
    await deleteTask(taskId);
    await load();
    if (activityOpen) await loadActivity();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mx-auto max-w-6xl">
        <BoardHeader
          board={board}
          onRename={onRename}
          onRefresh={load}
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMembersOpen(true)}
                className="rounded-lg border border-gray-800 px-3 py-2 text-sm hover:bg-gray-900"
                disabled={!board}
              >
                Members
              </button>

              <button
                type="button"
                onClick={async () => {
                  const next = !activityOpen;
                  setActivityOpen(next);
                  if (next) await loadActivity();
                }}
                className="rounded-lg border border-gray-800 px-3 py-2 text-sm hover:bg-gray-900"
              >
                {activityOpen ? "Hide activity" : "Show activity"}
              </button>
            </div>
          }
        />

        {error && (
          <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-gray-400">Loading board...</div>
        ) : (
          <>
            <BoardColumns
              boardId={id}
              columns={columns}
              tasks={tasksSorted}
              onCreateTask={onCreateTask}
              onOpenTask={(t) => setSelectedTask(t)}
              onMoveTask={onMoveTask}
            />

            {activityOpen && (
              <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Activity</div>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-800 px-3 py-1.5 text-sm hover:bg-gray-900"
                    onClick={loadActivity}
                    disabled={activityLoading}
                  >
                    {activityLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>

                <div className="mt-3 max-h-[360px] overflow-auto pr-1">
                  {activity.length === 0 ? (
                    <div className="text-sm text-gray-500">No activity yet.</div>
                  ) : (
                    <ActivityFeed items={activity} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TaskModal
        open={!!selectedTask}
        task={selectedTask}
        boardId={id}
        onClose={() => setSelectedTask(null)}
        onSave={onSaveTask}
        onDelete={onDeleteTask}
      />

      <BoardMembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        boardId={id}
        board={board}
      />
    </div>
  );
}
