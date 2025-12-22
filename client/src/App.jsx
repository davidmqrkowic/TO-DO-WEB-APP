import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./pages/AppLayout";
import DashboardLayout from "./pages/DashboardLayout";
import ProtectedRoute from "./router/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Boards from "./pages/Boards";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/boards" replace />} />
          <Route path="boards" element={<Boards />} />
          <Route path="friends" element={<Friends />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}
