// Python backend boundary: configure VITE_API_BASE_URL when the FastAPI service exists.
// Never access fetch or authentication endpoints directly from page components.
const API = import.meta.env.VITE_API_BASE_URL || "/api";
export type ApiError = { detail?: string };
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(API + path, {
    ...init, credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}
// Planned routes: GET /health, /me, /tasks, /notes, /events, /subscriptions, /challenges.
// Mutations will use POST/PATCH/DELETE once the server schema is agreed upon.
// This file is a ready integration point, not a working server connection.
