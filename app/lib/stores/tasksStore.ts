import { TasksResponse, isTasksResponse } from "@/lib/contracts/tasks";
import isEqual from "fast-deep-equal";

type Listener = (state: TasksResponse | null) => void;

let listeners: Listener[] = [];
let state: TasksResponse | null = null;

export const tasksStore = {
  get: () => state,

  set: (newState: unknown) => {
    if (newState !== null && !isTasksResponse(newState)) {
      console.error("Invalid state rejected by tasksStore:", newState);
      return;
    }

    if (isEqual(state, newState)) return;

    state = newState;
    listeners.forEach((l) => l(state));
  },

  subscribe: (listener: Listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};

