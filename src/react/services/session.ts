import { clearSession, currentUser, hasSession, request, saveSession, type SignedInUser } from "../data/api";

// User state is separate from the local design prototype.
export async function restoreSession(): Promise<SignedInUser | null> {
  if (!hasSession()) return null;
  try { return await currentUser(); } catch { clearSession(); return null; }
}
export { clearSession, saveSession, request };
