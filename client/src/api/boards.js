import { http } from "./http";

export async function fetchBoards() {
  const { data } = await http.get("/boards");
  return data;
}

export async function createBoard(name) {
  const { data } = await http.post("/boards", { name });
  return data;
}
