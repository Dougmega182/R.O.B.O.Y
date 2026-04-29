import { ChoresResponse, isChoresResponse } from "@/lib/contracts/chores";
import isEqual from "fast-deep-equal";

type Listener = (state: ChoresResponse | null) => void;

let listeners: Listener[] = [];
let state: ChoresResponse | null = null;

export const choresStore = {
  get: () => state,

  set: (newState: unknown) => {
    if (newState !== null && !isChoresResponse(newState)) {
      console.error("Invalid state rejected by choresStore:", newState);
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

