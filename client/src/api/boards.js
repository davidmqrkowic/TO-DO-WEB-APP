import { http } from "./http";

export async function fetchBoards() {
  const { data } = await http.get("/boards");
  return Array.isArray(data?.boards) ? data.boards : [];
}

export async function createBoard(name) {
  const { data } = await http.post("/boards", { name });
  return data;
}

export async function fetchBoardFull(boardId) {
  const { data } = await http.get(`/boards/${boardId}/full`);
  return data;
}

export async function renameBoard(boardId, name) {
  const { data } = await http.patch(`/boards/${boardId}`, { name });
  return data;
}

export async function deleteBoard(boardId) {
  const { data } = await http.delete(`/boards/${boardId}`);
  return data;
}
