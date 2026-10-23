export type Theme = "light" | "dark" | "system";
export type Task = { id: string; title: string; done: boolean };
export type Note = { id: string; title: string; body: string };
export type Event = { id: string; title: string; date: string };
export type Subscription = { id: string; name: string; amount: number; currency: string; renews: string };
export type Challenge = { id: string; title: string; value: number; target: number; unit: string };
export type Store = { theme: Theme; account: string; tasks: Task[]; notes: Note[]; events: Event[]; subscriptions: Subscription[]; challenges: Challenge[] };
export type Section = "dashboard" | "notes" | "tasks" | "calendar" | "subscriptions" | "challenges" | "settings" | "login";
