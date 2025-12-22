import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthed, isReady } = useAuth();

  if (!isReady) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
