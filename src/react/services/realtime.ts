/** Room connections are browser-only; access is authenticated by our own API. */
import { createClient } from "@liveblocks/client";

export const REALTIME_ENABLED = import.meta.env.VITE_REALTIME_ENABLED === "true";

let instance: ReturnType<typeof createClient> | undefined;

export function realtimeClient() {
  if (!REALTIME_ENABLED) return null;
  if (!instance) {
    instance = createClient({
      preventUnsavedChanges: true,
      authEndpoint: async (room) => {
        if (!room) throw new Error("A private collaboration room is required");
        const response = await fetch("/api/realtime/authorize", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room }),
        });
        if (!response.ok) throw new Error("Unable to authorize this collaboration room");
        return response.json() as Promise<{ token: string }>;
      },
    });
  }
  return instance;
}

export const accountRoom = (userId: string) => `lo:account:${userId}`;
export const notebookRoom = (bookId: string) => `lo:notebook:${bookId}`;

export type InvalidationKind =
  | "friends" | "calendar" | "notebooks" | "notes"
  | "notifications" | "challenges";
