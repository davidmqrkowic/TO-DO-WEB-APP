import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { http } from "../api/http";

export default function Settings() {
  const { user, refreshMe } = useAuth(); // BITNO: refreshMe dodaj u AuthContext (dolje)

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    });

    setAvatarPreview(user?.avatarUrl || "");
    setAvatarFile(null);
  }, [user]);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function onPickFile(file) {
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErr("Only JPG and PNG allowed");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErr("Max file size is 50MB");
      return;
    }

    setErr("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setMsg("");

    try {
      await http.put("/users/me", {
        firstName: form.firstName,
        lastName: form.lastName,
      });

      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);

        await http.post("/users/me/avatar", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // osvježi user u headeru
      if (refreshMe) await refreshMe();

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
          <label className="block text-sm text-gray-300">Avatar (JPG/PNG, max 50MB)</label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="mt-1 block w-full text-sm text-gray-300"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
        </div>

        {avatarPreview ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-4">
            <div className="text-sm text-gray-400 mb-3">Preview</div>
            <img
              src={avatarPreview}
              alt="avatar preview"
              className="w-24 h-24 rounded-full object-cover border border-gray-800"
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
