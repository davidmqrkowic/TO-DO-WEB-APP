import { http } from "./http";

export async function fetchBoardMembers(boardId) {
  const { data } = await http.get(`/boards/${boardId}/members`);
  return data; // { members: [...] }
}

export async function addBoardMember(boardId, userId) {
  const { data } = await http.post(`/boards/${boardId}/members`, { userId });
  return data; // { member }
}

export async function removeBoardMember(boardId, userId) {
  const { data } = await http.delete(`/boards/${boardId}/members/${userId}`);
  return data;
}
