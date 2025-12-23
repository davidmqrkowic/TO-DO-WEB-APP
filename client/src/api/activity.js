import { http } from "./http";

export async function fetchBoardActivity(boardId, { limit = 50, offset = 0 } = {}) {
  const { data } = await http.get(`/activity/boards/${boardId}?limit=${limit}&offset=${offset}`);
  return data;
}
