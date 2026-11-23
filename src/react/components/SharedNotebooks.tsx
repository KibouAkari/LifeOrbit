import { REALTIME_ENABLED } from "../services/realtime";
import LiveSharedNotebooks from "./LiveSharedNotebooks";
import NativeSharedNotebooks from "./NativeSharedNotebooks";

/** Always autosave. Hosted Liveblocks WebSockets are optional; the built-in
 * Yjs backend keeps concurrent edits conflict-free when unconfigured.
 */
export default function SharedNotebooks() {
  return REALTIME_ENABLED ? <LiveSharedNotebooks/> : <NativeSharedNotebooks/>;
}
