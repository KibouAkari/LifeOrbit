/** One private room per signed-in user, used only for invalidation signals. */
import { useEffect } from "react";
import { currentUser, hasSession } from "../data/api";
import { REALTIME_ENABLED, accountRoom, clearRealtimeAuth, realtimeClient } from "../services/realtime";

const kinds = new Set(["friends", "calendar", "notebooks", "notes", "notifications", "challenges", "access-revoked"]);

export default function RealtimeBridge() {
  useEffect(() => {
    if (!REALTIME_ENABLED || !hasSession()) return;
    let cancelled = false;
    let release: (() => void) | undefined;
    const clearAuth = () => {
      release?.();
      release = undefined;
      clearRealtimeAuth();
    };
    window.addEventListener("lifeorbit:logout-complete", clearAuth);
    window.addEventListener("lifeorbit:auth-expired", clearAuth);
    void currentUser().then((user) => {
      if (cancelled) return;
      const client = realtimeClient();
      if (!client) return;
      const { room, leave } = client.enterRoom(accountRoom(user.id), { initialPresence: {} });
      const notify = (kind: string) => {
        if (kind === "access-revoked") {
          // Drop cached provider credentials and force every joined room to
          // reauthorize; a former friend must not remain in a live editor.
          client.logout();
        }
        window.dispatchEvent(new CustomEvent("lifeorbit:remote-updated", { detail: kind }));
        window.dispatchEvent(new Event("lifeorbit:notifications-updated"));
        if (kind === "friends") window.dispatchEvent(new Event("lifeorbit:friends-changed"));
        if (kind === "calendar") window.dispatchEvent(new Event("lifeorbit:calendar-updated"));
      };
      const offEvent = room.subscribe("event", ({ event }) => {
        if (event && typeof event === "object" && "type" in event &&
            event.type === "INVALIDATE" && "kind" in event &&
            typeof event.kind === "string" && kinds.has(event.kind)) {
          notify(event.kind);
        }
      });
      let seenConnection = false;
      const offStatus = room.subscribe("status", (status) => {
        if (status === "connected") {
          if (seenConnection) notify("notifications");
          seenConnection = true;
        }
      });
      release = () => { offEvent(); offStatus(); leave(); };
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      window.removeEventListener("lifeorbit:logout-complete", clearAuth);
      window.removeEventListener("lifeorbit:auth-expired", clearAuth);
      release?.();
      clearRealtimeAuth();
    };
  }, []);
  return null;
}
