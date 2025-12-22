import { http } from "./http";

export async function fetchAllUsers() {
  const { data } = await http.get("/users");
  return data;
}

export async function fetchFriendState() {
  const { data } = await http.get("/friends/state");
  return data;
}

export async function sendFriendRequest(toUserId) {
  const { data } = await http.post("/friends/request", { toUserId });
  return data;
}

export async function acceptFriendRequest(requestId) {
  const { data } = await http.post(`/friends/requests/${requestId}/accept`);
  return data;
}

export async function rejectFriendRequest(requestId) {
  const { data } = await http.post(`/friends/requests/${requestId}/reject`);
  return data;
}

export async function removeFriend(userId) {
  const { data } = await http.delete(`/friends/${userId}`);
  return data;
}
