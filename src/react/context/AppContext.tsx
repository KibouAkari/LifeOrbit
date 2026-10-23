import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initialState, readDemo, writeDemo } from "../data/storage";
import type { Store } from "../types";
type ContextValue = { state: Store; patch: <K extends keyof Store>(key: K, value: Store[K] | ((current: Store[K]) => Store[K])) => void; reset: () => void };
const Context = createContext<ContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Store>(readDemo);
  useEffect(() => { writeDemo(state); }, [state]);
  function patch<K extends keyof Store>(key: K, value: Store[K] | ((current: Store[K]) => Store[K])) {
    setState(s => ({ ...s, [key]: typeof value === "function" ? (value as (current: Store[K]) => Store[K])(s[key]) : value }));
  }
  return <Context.Provider value={{ state, patch, reset: () => setState(structuredClone(initialState)) }}>{children}</Context.Provider>;
}
export function useApp() { const ctx = useContext(Context); if (!ctx) throw new Error("Missing AppProvider"); return ctx; }
