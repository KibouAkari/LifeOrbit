import type { Store } from "../types";
const KEY = "lifeorbit-react-demo-v1";
const LEGACY_KEY = "lifeorbit-demo-v1";
export const initialState: Store = {
  theme: "system", account: "",
  tasks: [{ id: "t1", title: "Plan the week", done: false }, { id: "t2", title: "Try the LifeOrbit demo", done: true }],
  notes: [{ id: "n1", title: "Welcome to LifeOrbit", body: "Your space for ideas, thoughts and everything worth remembering." }],
  events: [], subscriptions: [{ id: "s1", name: "Example subscription", amount: 9.99, currency: "CHF", renews: "" }],
  challenges: [{ id: "c1", title: "Drink water", value: 3, target: 8, unit: "glasses" }, { id: "c2", title: "Move a little", value: 1, target: 1, unit: "session" }],
};
export function readDemo(): Store { try { const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY); if (raw) { const value = JSON.parse(raw) as Partial<Store>; return { ...structuredClone(initialState), ...value }; } } catch { /* blocked storage or old data */ } return structuredClone(initialState); }
export function writeDemo(data: Store) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ephemeral demo */ } }
export function newId() { return crypto.randomUUID(); }
