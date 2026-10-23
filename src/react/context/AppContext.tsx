import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { initialState, readDemo, writeDemo } from "../data/storage";
import type { Store } from "../types";
import { hasSession } from "../data/api";

type ContextValue = {
  state: Store;
  patch: <K extends keyof Store>(key: K, value: Store[K] | ((current: Store[K]) => Store[K])) => void;
  reset: () => void;
};
const Context = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Store>(readDemo);

  // Signed-in account data must not be copied into the old guest workspace.
  useEffect(() => { if (!hasSession()) writeDemo(state); }, [state]);
  const patch = useCallback(function patch<K extends keyof Store>(key: K, value: Store[K] | ((current: Store[K]) => Store[K])) {
    setState(s => ({ ...s, [key]: typeof value === "function" ? (value as (current: Store[K]) => Store[K])(s[key]) : value }));
  }, []);
  const reset = useCallback(() => setState(structuredClone(initialState)), []);
  return <Context.Provider value={{ state, patch, reset }}>{children}</Context.Provider>;
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing AppProvider");
  return context;
}
