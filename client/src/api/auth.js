import { http } from "./http";

export async function loginRequest(email, password) {
  const { data } = await http.post("/auth/login", { email, password });
  return data; // { token, user }
}

export async function registerRequest(firstName, lastName, email, password) {
  const { data } = await http.post("/auth/register", {
    firstName,
    lastName,
    email,
    password,
  });
  return data; // { token, user }
}

export async function meRequest() {
  const { data } = await http.get("/auth/me");
  return data.user ?? data;
}