import type { Store } from "../types";
const KEY = "lifeorbit-react-demo-v1";
const LEGACY_KEY = "lifeorbit-demo-v1";
export const initialState: Store = {
  theme: "system", account: "",
  tasks: [{ id: "t1", title: "Plan the week", done: false }, { id: "t2", title: "Try the LifeOrbit demo", done: true }],
  notes: [],
  chapters: [{ id: "personal", name: "Personal" }, { id: "ideas", name: "Ideas" }],
  events: [], subscriptions: [],
  challenges: [], templates: [], leaderboard_opt_in:false,
};
export function readDemo(): Store {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return structuredClone(initialState);
    const value = JSON.parse(raw) as Partial<Store>;
    const notes = (value.notes ?? initialState.notes).map(note => ({
      ...note,
      chapter_id: note.chapter_id || localStorage.getItem(`lifeorbit-note-chapter-${note.id}`) || "personal",
    }));
    let chapters = value.chapters;
    if (!chapters) {
      try {
        chapters = JSON.parse(localStorage.getItem("lifeorbit-chapters-v1") || "null") as Store["chapters"];
      } catch { /* old or invalid chapter cache */ }
    }
    return {
      ...structuredClone(initialState),
      ...value,
      notes,
      chapters: chapters ?? structuredClone(initialState.chapters),
    };
  } catch { /* blocked storage or old data */ }
  return structuredClone(initialState);
}
export function writeDemo(data: Store) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ephemeral demo */ } }
export function newId() { return crypto.randomUUID(); }
