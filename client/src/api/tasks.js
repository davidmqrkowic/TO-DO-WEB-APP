import { http } from "./http";

export async function createTask({ columnId, title, description = null, dueDate = null }) {
  const { data } = await http.post("/tasks", {
    columnId: Number(columnId),
    title,
    description,
    dueDate,
  });
  return data;
}

export async function updateTask(taskId, payload) {
  const { data } = await http.patch(`/tasks/${taskId}`, payload);
  return data;
}

export async function moveTask(taskId, { toColumnId, newPosition }) {
  const { data } = await http.patch(`/tasks/${taskId}/move`, { toColumnId, newPosition });
  return data;
}

export async function deleteTask(taskId) {
  const { data } = await http.delete(`/tasks/${taskId}`);
  return data;
}
