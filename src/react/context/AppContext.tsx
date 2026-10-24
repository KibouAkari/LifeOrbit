import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, readDemo, writeDemo } from "../data/storage";
import { hasSession, request } from "../data/api";
import type { Store } from "../types";

type ContextValue = {
  state: Store;
  workspaceStatus: "guest" | "loading" | "ready" | "error";
  workspaceError: string;
  restoreWorkspace: () => void;
  patch: {
    <K extends keyof Store>(key: K, updater: (current: Store[K]) => Store[K]): void;
    <K extends keyof Store>(key: K, value: Store[K]): void;
  };
  reset: () => void;
};
type Workspace = Pick<Store, "notes" | "chapters" | "subscriptions" | "challenges">;
const Context = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Store>(readDemo);
  const [workspaceStatus, setWorkspaceStatus] = useState<ContextValue["workspaceStatus"]>("guest");
  const [workspaceError, setWorkspaceError] = useState("");
  const [sessionVersion, setSessionVersion] = useState(0);
  const workspaceQueue = useRef<Promise<void>>(Promise.resolve());
  const sessionGeneration = useRef(0);
  const workspaceWritable = useRef(true);

  const enqueue = useCallback((operation: () => Promise<void>) => {
    const run = workspaceQueue.current.catch(() => undefined).then(operation);
    workspaceQueue.current = run.catch(() => undefined);
    return run;
  }, []);

  const restoreWorkspace = useCallback(() => {
    const generation = ++sessionGeneration.current;
    setSessionVersion(generation);
    setWorkspaceError("");
    if (!hasSession()) {
      workspaceWritable.current = true;
      setWorkspaceStatus("guest");
      setState(readDemo());
      return;
    }

    workspaceWritable.current = false;
    setWorkspaceStatus("loading");
    setState(current => ({
      ...structuredClone(initialState),
      account: current.account,
      notes: [],
      chapters: [],
      subscriptions: [],
      challenges: [],
    }));

    void enqueue(async () => {
      if (generation !== sessionGeneration.current || !hasSession()) return;
      const data = await request<Workspace>("/workspace");
      if (generation !== sessionGeneration.current || !hasSession()) return;
      const chapters = data.chapters.length ? data.chapters : structuredClone(initialState.chapters);
      const chapterIds = new Set(chapters.map(chapter => chapter.id));
      const defaultChapter = chapterIds.has("personal") ? "personal" : chapters[0].id;
      setState(current => ({
        ...current,
        notes: data.notes.map(note => ({
          ...note,
          chapter_id: chapterIds.has(note.chapter_id) ? note.chapter_id : defaultChapter,
        })),
        chapters,
        subscriptions: data.subscriptions,
        challenges: data.challenges,
      }));
      workspaceWritable.current = true;
      setWorkspaceStatus("ready");
    }).catch(error => {
      if (generation !== sessionGeneration.current || !hasSession()) return;
      workspaceWritable.current = false;
      setWorkspaceError(error instanceof Error ? error.message : "Could not load your workspace.");
      setWorkspaceStatus("error");
    });
  }, [enqueue]);

  useEffect(() => {
    window.addEventListener("lifeorbit:auth", restoreWorkspace);
    window.addEventListener("lifeorbit:restore", restoreWorkspace);
    window.addEventListener("lifeorbit:logout-complete", restoreWorkspace);
    window.addEventListener("lifeorbit:auth-expired", restoreWorkspace);
    restoreWorkspace();
    return () => {
      sessionGeneration.current++;
      window.removeEventListener("lifeorbit:auth", restoreWorkspace);
      window.removeEventListener("lifeorbit:restore", restoreWorkspace);
      window.removeEventListener("lifeorbit:logout-complete", restoreWorkspace);
      window.removeEventListener("lifeorbit:auth-expired", restoreWorkspace);
    };
  }, [restoreWorkspace]);

  useEffect(() => {
    if (!hasSession()) {
      writeDemo(state);
      return;
    }
    if (workspaceStatus !== "ready" || !workspaceWritable.current) return;

    const generation = sessionGeneration.current;
    const workspace: Workspace = {
      notes: state.notes,
      chapters: state.chapters,
      subscriptions: state.subscriptions,
      challenges: state.challenges,
    };
    const handle = window.setTimeout(() => {
      void enqueue(async () => {
        if (generation !== sessionGeneration.current || !hasSession() || !workspaceWritable.current) return;
        await request<Workspace>("/workspace", {
          method: "PUT",
          body: JSON.stringify(workspace),
        });
      }).catch(error => console.error("Workspace save failed", error));
    }, 900);
    return () => clearTimeout(handle);
  }, [state.notes, state.chapters, state.subscriptions, state.challenges, workspaceStatus, enqueue]);

  useEffect(() => {
    if (workspaceStatus === "guest" && !hasSession()) writeDemo(state);
  }, [state, workspaceStatus]);

  const patch = useCallback(function patch<K extends keyof Store>(
    key: K,
    value: Store[K] | ((current: Store[K]) => Store[K]),
  ) {
    if (sessionVersion !== sessionGeneration.current || !workspaceWritable.current) return;
    setState(current => ({
      ...current,
      [key]: typeof value === "function"
        ? (value as (current: Store[K]) => Store[K])(current[key])
        : value,
    }));
  }, [sessionVersion]);
  const reset = useCallback(() => {
    if (sessionVersion === sessionGeneration.current && workspaceWritable.current) {
      setState(structuredClone(initialState));
    }
  }, [sessionVersion]);

  return <Context.Provider value={{ state, workspaceStatus, workspaceError, restoreWorkspace, patch, reset }}>{children}</Context.Provider>;
}

export function useApp(): ContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AppProvider");
  return value;
}
