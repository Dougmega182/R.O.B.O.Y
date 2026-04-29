import { useEffect, useState, useCallback, useRef } from "react";

export interface Store<T> {
  get: () => T | null;
  set: (data: unknown) => void;
  subscribe: (cb: (state: T | null) => void) => () => void;
}

export function useWidgetData<T extends object>(
  endpoint: string,
  validator: (data: any) => data is T,
  store?: Store<T>,
  pollIntervalMs: number = 0
) {
  const [state, setState] = useState({
    data: store?.get() || (null as T | null),
    loading: !store?.get(),
    error: null as string | null,
  });

  const lastVersionRef = useRef<number | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setState((s) => ({ ...s, loading: true, error: null }));
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      // 1. Header Hint for Early Exit (Optimistic skip)
      const versionHeader = res.headers.get("x-version");
      if (versionHeader) {
        const parsedVersion = Number(versionHeader);
        if (!Number.isNaN(parsedVersion)) {
          if (lastVersionRef.current === parsedVersion) {
            if (!isSilent) setState((s) => ({ ...s, loading: false }));
            return; 
          }
        }
      }
      
      // 2. Parse Payload
      const json = await res.json();

      // 3. Validate FIRST
      if (!validator(json)) {
        throw new Error("Invalid API response shape");
      }

      // 4. Update Version Tracking (Strictly from authoritative body)
      if ('version' in json && typeof (json as { version: number }).version === 'number') {
        lastVersionRef.current = (json as { version: number }).version;
      }

      // 5. Commit to Store / State
      if (store) {
        store.set(json); 
      } else {
        setState({ data: json, loading: false, error: null });
      }
    } catch (err: any) {
      if (!isSilent) setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [endpoint, validator, store]);

  useEffect(() => {
    if (!store) return;
    const unsubscribe = store.subscribe((newData) => {
      setState({ data: newData, loading: false, error: null });
    });
    return unsubscribe;
  }, [store]);

  useEffect(() => {
    if (!store?.get()) {
      fetchData();
    }

    if (pollIntervalMs > 0) {
      const intervalId = setInterval(() => fetchData(true), pollIntervalMs);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, store, pollIntervalMs]);

  return { ...state, refresh: () => fetchData(false) };
}

