import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/common/Avatar";

function LinkBtn({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-2 rounded-lg text-sm border transition",
          isActive ? "bg-white text-black border-white" : "border-gray-700 hover:bg-gray-800",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function Header() {
  const { isAuthed, user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b border-gray-800 bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isAuthed ? <Avatar user={user} size={36} /> : null}
          <div>
            <div className="font-semibold text-lg leading-tight">TO-DO APP</div>
            <div className="text-xs text-gray-400">
              {isAuthed && user ? user.email : "Not logged in"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!isAuthed ? (
            <>
              <LinkBtn to="/login" label="Login" />
              <LinkBtn to="/register" label="Register" />
            </>
          ) : (
            <button
              onClick={onLogout}
              className="px-3 py-2 text-sm border border-gray-700 rounded-lg hover:bg-gray-800"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {isAuthed && (
        <nav className="max-w-6xl mx-auto px-6 pb-4 flex gap-2">
          <LinkBtn to="/boards" label="Boards" />
          <LinkBtn to="/friends" label="Friends" />
          <LinkBtn to="/settings" label="Settings" />
        </nav>
      )}
    </header>
  );
}
