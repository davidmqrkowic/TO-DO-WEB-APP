import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { http } from "../api/http";

export default function Settings() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    avatarUrl: "",
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      avatarUrl: user?.avatarUrl || "",
    });
  }, [user]);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setMsg("");

    try {
      // default endpoint; change if needed
      await http.put("/users/me", form);
      setMsg("Saved.");
    } catch (error) {
      setErr(error?.response?.data?.message || error.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-gray-400 mt-1">Update your profile details.</p>

      {err && (
        <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm">
          {err}
        </div>
      )}
      {msg && (
        <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={onSave} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-300">First name</label>
          <input
            className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Last name</label>
          <input
            className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Avatar URL</label>
          <input
            className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
            value={form.avatarUrl}
            onChange={(e) => setField("avatarUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>

        {form.avatarUrl ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-4">
            <div className="text-sm text-gray-400 mb-3">Preview</div>
            <img
              src={form.avatarUrl}
              alt="avatar preview"
              className="w-20 h-20 rounded-full object-cover border border-gray-800"
            />
          </div>
        ) : null}

        <button
          disabled={saving}
          className="rounded-lg bg-white text-gray-900 font-medium px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
