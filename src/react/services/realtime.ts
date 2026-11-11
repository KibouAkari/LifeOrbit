/** Room connections are browser-only; access is authenticated by our own API. */
import { createClient } from "@liveblocks/client";
import { request } from "../data/api";

export const REALTIME_ENABLED = import.meta.env.VITE_REALTIME_ENABLED === "true";

let instance: ReturnType<typeof createClient> | undefined;

export function realtimeClient() {
  if (!REALTIME_ENABLED) return null;
  if (!instance) {
    instance = createClient({
      preventUnsavedChanges: true,
      authEndpoint: async (room) => {
        if (!room) throw new Error("A private collaboration room is required");
        return request<{ token: string }>("/realtime/authorize", {
          method: "POST", body: JSON.stringify({ room }),
        });
      },
    });
  }
  return instance;
}

export function clearRealtimeAuth() {
  instance?.logout();
}

export const accountRoom = (userId: string) => `lo:account:${userId}`;
export const notebookRoom = (bookId: string) => `lo:notebook:${bookId}`;

export type InvalidationKind =
  | "friends" | "calendar" | "notebooks" | "notes"
  | "notifications" | "challenges";
