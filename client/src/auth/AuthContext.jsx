import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest, registerRequest, meRequest } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const token = localStorage.getItem("token");
  const isAuthed = !!token;

  useEffect(() => {
    async function boot() {
      try {
        if (!token) {
          setUser(null);
          setIsReady(true);
          return;
        }
        const me = await meRequest();
        setUser(me);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setIsReady(true);
      }
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const data = await loginRequest(email, password);
    const nextToken = data?.token;
    if (!nextToken) throw new Error("Missing token from login response.");

    localStorage.setItem("token", nextToken);
    if (data.user) setUser(data.user);
    else setUser(await meRequest());
  }

  async function register(firstName, lastName, email, password) {
    const data = await registerRequest(firstName, lastName, email, password);
    const nextToken = data?.token;
    if (!nextToken) throw new Error("Missing token from register response.");

    localStorage.setItem("token", nextToken);
    if (data.user) setUser(data.user);
    else setUser(await meRequest());
  }

  async function refreshMe() {
    if (!localStorage.getItem("token")) {
      setUser(null);
      return;
    }
    const me = await meRequest();
    setUser(me);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isAuthed, isReady, login, register, logout, refreshMe }),
    [user, isAuthed, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
