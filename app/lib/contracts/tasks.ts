export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export type TasksResponse = {
  version: number; // 🚀 The new version stamp
  tasks: Task[];
};

export function isTasksResponse(data: any): data is TasksResponse {
  return typeof data?.version === 'number' && Array.isArray(data?.tasks);
}

