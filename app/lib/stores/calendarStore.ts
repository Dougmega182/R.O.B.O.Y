import { CalendarResponse, isCalendarResponse } from "@/lib/contracts/calendar";
import isEqual from "fast-deep-equal";

type Listener = (state: CalendarResponse | null) => void;

let listeners: Listener[] = [];
let state: CalendarResponse | null = null;

export const calendarStore = {
  get: () => state,

  set: (newState: unknown) => {
    if (newState !== null && !isCalendarResponse(newState)) {
      console.error("Invalid state rejected by calendarStore:", newState);
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

