import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(firstName, lastName, email, password);
      navigate("/boards", { replace: true });
    } catch (err) {
    const data = err?.response?.data;

    if (data?.issues && Array.isArray(data.issues)) {
        // join all validation messages
         const messages = data.issues.map((i) => {
            if (i.path?.[0] === "password") return "Password must be at least 8 characters";
            if (i.path?.[0] === "email") return "Invalid email address";
            return i.message;
            }).join(", ");
        setError(messages);
    } else {
        setError(data?.message || err.message || "Register failed");
    }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-semibold mb-6">Register</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          className="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700"
          required
        />

        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700"
          required
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700"
          required
        />

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <button
          disabled={loading}
          className="w-full py-2 rounded bg-white text-black font-medium hover:bg-gray-200 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
