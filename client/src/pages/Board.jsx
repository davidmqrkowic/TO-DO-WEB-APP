import React from "react";
import { useParams, Link } from "react-router-dom";

export default function Board() {
  const { boardId } = useParams();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Board</div>
            <h1 className="text-2xl font-semibold">ID: {boardId}</h1>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-gray-800 px-3 py-2 text-sm hover:bg-gray-900"
          >
            Back
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/30 p-4 text-gray-300">
          Next: fetch columns + tasks and render Kanban.
        </div>
      </div>
    </div>
  );
}
