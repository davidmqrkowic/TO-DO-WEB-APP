import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-6">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-gray-400 mt-1">Sign in to access your boards.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300">Email</label>
            <input
              className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">Password</label>
            <input
              className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 outline-none focus:border-gray-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-white text-gray-900 font-medium py-2 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
