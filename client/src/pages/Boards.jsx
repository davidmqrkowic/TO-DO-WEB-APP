import React, { useEffect, useState } from "react";
import { createBoard, fetchBoards } from "../api/boards";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Boards() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await fetchBoards();
      setBoards(Array.isArray(data) ? data : data.boards || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    setError("");
    try {
      await createBoard(trimmed);
      setName("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to create board");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Boards</h1>
            <p className="text-sm text-gray-400 mt-1">
              {user ? `Signed in as ${user.email || user.name || "user"}` : "Signed in"}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-gray-800 px-3 py-2 text-sm hover:bg-gray-900"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onCreate} className="mt-6 flex gap-3">
          <input
            className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
            placeholder="New board name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            disabled={creating}
            className="rounded-lg bg-white text-gray-900 font-medium px-4 py-2 disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>

        <div className="mt-6">
          {loading ? (
            <div className="text-gray-400">Loading boards...</div>
          ) : boards.length === 0 ? (
            <div className="text-gray-400">No boards yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/boards/${b.id}`)}
                  className="text-left rounded-2xl border border-gray-800 bg-gray-900/30 p-4 hover:bg-gray-900/60 transition"
                >
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-500 mt-1">id: {b.id}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
