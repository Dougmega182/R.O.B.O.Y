import { LedgerResponse, isLedgerResponse } from "@/lib/contracts/ledger";
import isEqual from "fast-deep-equal";

type Listener = (state: LedgerResponse | null) => void;

let listeners: Listener[] = [];
let state: LedgerResponse | null = null;

export const ledgerStore = {
  get: () => state,

  set: (newState: unknown) => {
    if (newState !== null && !isLedgerResponse(newState)) {
      console.error("Invalid state rejected by ledgerStore:", newState);
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

