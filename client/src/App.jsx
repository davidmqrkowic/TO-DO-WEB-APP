import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./pages/AppLayout";
import DashboardLayout from "./pages/DashboardLayout";
import ProtectedRoute from "./router/ProtectedRoute";

import Boards from "./pages/Boards";
import Board from "./pages/Board";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Boards />} />
          <Route path="boards" element={<Boards />} />
          <Route path="boards/:boardId" element={<Board />} />

          {/* add these */}
          <Route path="friends" element={<Friends />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
