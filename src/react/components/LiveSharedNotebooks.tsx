/** Collaborative shared notebooks. Mongo holds membership/page metadata, while
 * Liveblocks persists Yjs CRDT text. Never send whole-page strings as writes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Plus, Trash2, Users, Wifi, WifiOff } from "lucide-react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import * as Y from "yjs";
import { request } from "../data/api";
import { notebookRoom, realtimeClient } from "../services/realtime";

type Page = { id: string; title: string; body: string };
type Friend = { id: string; name: string };
type SharedBook = {
  id: string; title: string; owner: string; is_owner: boolean;
  owner_name: string; members: Friend[]; pages: Page[];
};
type Paging = { items: SharedBook[]; next_offset: number | null };
type RoomStatus = "initial" | "connecting" | "connected" | "reconnecting" | "disconnected";

const titleKey = (page: string) => `page:${page}:title`;
const bodyKey = (page: string) => `page:${page}:body`;

/** Write only the changed span, not a full replace that would erase remote edits. */
export function patchYText(text: Y.Text, next: string) {
  const previous = text.toString();
  if (previous === next) return;
  let start = 0;
  while (start < previous.length && start < next.length &&
         previous[start] === next[start]) start++;
  let oldEnd = previous.length, newEnd = next.length;
  while (oldEnd > start && newEnd > start &&
         previous[oldEnd - 1] === next[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  text.doc?.transact(() => {
    if (oldEnd > start) text.delete(start, oldEnd - start);
    if (newEnd > start) text.insert(start, next.slice(start, newEnd));
  });
}

async function fetchAllBooks() {
  const books: SharedBook[] = [];
  let offset = 0;
  do {
    const result = await request<Paging>(`/shared-notebooks?offset=${offset}`);
    books.push(...result.items);
    if (result.next_offset === null) break;
    offset = result.next_offset;
  } while (books.length < 1000);
  return books;
}

async function prepareNotebook(id: string) {
  // Another request may be migrating the same legacy notebook. Never edit
  // until its migration has finished on the server.
  for (let i = 0; i < 12; i++) {
    try {
      const result = await request<{ room: string; ready: boolean }>(
        `/realtime/notebooks/${id}/prepare`, { method: "POST" });
      return result.room;
    } catch (error) {
      const isConcurrent = error instanceof Error &&
        error.message.includes("Another editor is preparing");
      if (!isConcurrent || i === 11) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 650));
    }
  }
  throw new Error("Unable to open the realtime notebook");
}

function CollaborativeBook({
  book, friends, reload, onDelete,
}: {
  book: SharedBook; friends: Friend[];
  reload: () => Promise<void>; onDelete: (id: string) => void;
}) {
  const [pages, setPages] = useState<Page[]>(book.pages);
  const [active, setActive] = useState<string>(book.pages[0]?.id ?? "");
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [synced, setSynced] = useState(false);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [others, setOthers] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState("");
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDoc = useRef<Y.Doc | null>(null);

  useEffect(() => {
    setPages(book.pages);
    setActive((previous) =>
      book.pages.some((page) => page.id === previous)
        ? previous : (book.pages[0]?.id ?? ""));
  }, [book.pages]);

  useEffect(() => {
    let mounted = true;
    let closeRoom: (() => void) | undefined;
    setDoc(null); setSynced(false); setStatus("connecting"); setMessage("");
    void prepareNotebook(book.id).then((roomId) => {
      if (!mounted) return;
      const client = realtimeClient();
      if (!client || roomId !== notebookRoom(book.id)) {
        throw new Error("Realtime connection is not available");
      }
      const { room, leave } = client.enterRoom(roomId, { initialPresence: {} });
      const provider = getYjsProviderForRoom(room);
      const shared = provider.getYDoc();
      latestDoc.current = shared;
      const onUpdate = () => {
        if (!mounted) return;
        setRevision((n) => n + 1);
        if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
        snapshotTimer.current = setTimeout(() => {
          void request(`/realtime/notebooks/${book.id}/snapshot`,
            { method: "POST" }).catch(() => {
            if (mounted) setMessage("Live changes are retained, but the backup preview could not be updated.");
          });
        }, 1800);
      };
      const onSync = (ready: boolean) => {
        if (mounted) {
          setSynced(ready);
          if (ready) setRevision((n) => n + 1);
        }
      };
      const offStatus = room.subscribe("status", (value) => {
        if (mounted) setStatus(value);
      });
      const offOthers = room.subscribe("others", (users) => {
        if (!mounted) return;
        const names = users.map((user) => {
          const value: unknown = user.info && "name" in user.info ? user.info.name : null;
          return typeof value === "string" ? value : "Another editor";
        });
        setOthers(names);
      });
      shared.on("update", onUpdate);
      provider.on("sync", onSync);
      setDoc(shared);
      setSynced(provider.synced);
      closeRoom = () => {
        shared.off("update", onUpdate);
        provider.off("sync", onSync);
        offStatus(); offOthers(); leave();
      };
    }).catch((error) => {
      if (mounted) setMessage(error instanceof Error ? error.message : "Could not join notebook");
    });
    const flushOnHide = () => {
      if (document.visibilityState === "hidden" && latestDoc.current) {
        void request(`/realtime/notebooks/${book.id}/snapshot`,
          { method: "POST" }).catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      mounted = false; closeRoom?.(); latestDoc.current = null;
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
      document.removeEventListener("visibilitychange", flushOnHide);
    };
  }, [book.id]);

  const selected = useMemo(() => pages.find((item) => item.id === active), [pages, active]);
  // revision forces a render on remote Yjs changes, with no full-text writes.
  void revision;
  const title = doc && selected && synced ? doc.getText(titleKey(selected.id)).toString() : "";
  const body = doc && selected && synced ? doc.getText(bodyKey(selected.id)).toString() : "";
  const isLive = Boolean(doc && synced && status === "connected");

  const handleEdit = useCallback((field: "title" | "body", value: string) => {
    if (!doc || !active || !synced || status !== "connected") return;
    const text = doc.getText(field === "title" ? titleKey(active) : bodyKey(active));
    patchYText(text, value);
  }, [doc, active, synced, status]);

  async function addPage() {
    if (!doc || !isLive) return;
    setBusy(true); setMessage("");
    try {
      const page = await request<Page>(`/shared-notebooks/${book.id}/pages`, { method: "POST" });
      setPages((prev) => [...prev, page]);
      // Only the creator initializes this previously unknown CRDT root.
      const title = doc.getText(titleKey(page.id));
      doc.getText(bodyKey(page.id));
      if (!title.length) title.insert(0, page.title);
      setActive(page.id);
      void reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create page");
    } finally { setBusy(false); }
  }

  async function inviteFriend() {
    if (!book.is_owner || !invite) return;
    setBusy(true); setMessage("");
    try {
      await request(`/shared-notebooks/${book.id}/members`, {
        method: "POST", body: JSON.stringify({ user_id: invite }) });
      setInvite(""); await reload();
      setMessage("Invitation sent");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to invite friend");
    } finally { setBusy(false); }
  }

  async function deletePage() {
    if (!selected || !window.confirm("Delete this page for everyone?")) return;
    setBusy(true); setMessage("");
    try {
      await request(`/shared-notebooks/${book.id}/pages/${encodeURIComponent(selected.id)}`,
        { method: "DELETE" });
      if (doc && isLive) {
        const yTitle = doc.getText(titleKey(selected.id));
        const yBody = doc.getText(bodyKey(selected.id));
        doc.transact(() => {
          yTitle.delete(0, yTitle.length);
          yBody.delete(0, yBody.length);
        });
      }
      setPages((prev) => prev.filter((page) => page.id !== selected.id));
      setActive("");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete page");
    } finally { setBusy(false); }
  }

  async function deleteNotebook() {
    if (!book.is_owner || !window.confirm("Delete this notebook for everyone?")) return;
    setBusy(true);
    try {
      await request(`/shared-notebooks/${book.id}`, { method: "DELETE" });
      onDelete(book.id);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete notebook");
    } finally { setBusy(false); }
  }

  const candidateFriends = friends.filter((friend) =>
    friend.id !== book.owner && !book.members.some((member) => member.id === friend.id));
  return <section className="shared-notebook-content" aria-label="Collaborative shared notebook">
    <header>
      <div>
        <h2>{book.title}</h2>
        <p className="muted">By {book.owner_name} · {book.members.length + 1} members</p>
        <div className="notebook-members">
          <strong>{others.length ? `Editing together with ${others.join(", ")}` : "No other editors online"}</strong>
        </div>
        <p className="feedback-line" role="status">
          {status === "connected" && synced
            ? <><Wifi size={14}/> Live collaboration · autosaved</>
            : <><WifiOff size={14}/> {status === "reconnecting" ? "Reconnecting, edits paused" : "Connecting to collaboration"}</>}
        </p>
      </div>
      {book.is_owner && <button className="button" disabled={busy}
          aria-label="Delete notebook" onClick={() => void deleteNotebook()}>
          <Trash2 size={15}/></button>}
    </header>
    {book.is_owner && <div className="shared-notebook-invite">
      <select className="select" aria-label="Invite a friend" value={invite}
        onChange={(event) => setInvite(event.target.value)}>
        <option value="">Invite a friend</option>
        {candidateFriends.map((person) =>
          <option value={person.id} key={person.id}>{person.name}</option>)}
      </select>
      <button className="button" disabled={!invite || busy} onClick={() => void inviteFriend()}>Invite</button>
    </div>}
    <div className="shared-notebook-pages">
      {pages.map((page) => <button key={page.id} className={page.id === active ? "selected" : ""}
        onClick={() => setActive(page.id)}>
        {doc && synced ? doc.getText(titleKey(page.id)).toString() || "Untitled page" : page.title}
      </button>)}
      <button disabled={!isLive || busy} onClick={() => void addPage()}><Plus size={15}/> New page</button>
    </div>
    {selected ? <>
      <input className="input" aria-label="Page title" placeholder="Page title"
        maxLength={120} disabled={!isLive} value={title}
        onChange={(event) => handleEdit("title", event.target.value)}/>
      <textarea className="textarea" aria-label="Shared page content"
        rows={12} maxLength={50000} disabled={!isLive}
        placeholder={isLive ? "Write together…" : "Connecting to a shared document…"}
        value={body} onChange={(event) => handleEdit("body", event.target.value)}/>
      <div className="shared-note-actions">
        <span className="muted">Changes are synchronized automatically. No save button needed.</span>
        <button className="button" disabled={!isLive || busy} onClick={() => void deletePage()}>
          <Trash2 size={15}/> Delete page
        </button>
      </div>
    </> : <div className="quiet-empty">Choose a page or create a new one.</div>}
    {message && <p className="feedback-line" role="alert">{message}</p>}
  </section>;
}

export default function LiveSharedNotebooks() {
  const [books, setBooks] = useState<SharedBook[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    try {
      const [all, people] = await Promise.all([
        fetchAllBooks(), request<{ friends: Friend[] }>("/friends")]);
      setBooks(all); setFriends(people.friends);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to refresh notebooks");
    }
  }, []);

  useEffect(() => {
    void reload();
    const refresh = () => void reload();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000); // Recovery if a broadcast is missed, not the primary update path.
    window.addEventListener("focus", refresh);
    window.addEventListener("lifeorbit:remote-updated", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("lifeorbit:remote-updated", refresh);
    };
  }, [reload]);

  async function createBook() {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const result = await request<SharedBook>("/shared-notebooks", {
        method: "POST", body: JSON.stringify({ title: newTitle.trim() }) });
      setBooks((old) => [...old, result]);
      setSelected(result.id); setNewTitle(""); setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create notebook");
    } finally { setBusy(false); }
  }

  const chosen = books.find((book) => book.id === selected);
  return <div className="shared-notebook-layout">
    <aside className="shared-notebook-sidebar">
      <h3><Users size={17}/> Shared notebooks</h3>
      {books.map((book) =>
        <button key={book.id} className={selected === book.id ? "selected" : ""}
          onClick={() => setSelected(book.id)}>
          <BookOpen size={16}/>
          <span>{book.title}<small>By {book.owner_name} · {book.members.length + 1} members</small></span>
        </button>)}
      <form onSubmit={(event) => { event.preventDefault(); void createBook(); }}>
        <input className="input" placeholder="New shared notebook" value={newTitle}
          maxLength={80} onChange={(event) => setNewTitle(event.target.value)}/>
        <button className="button primary" disabled={busy || !newTitle.trim()}>
          <Plus size={16}/> Create
        </button>
      </form>
    </aside>
    {chosen
      ? <CollaborativeBook key={chosen.id} book={chosen} friends={friends}
          reload={reload} onDelete={(id) => setSelected((value) => value === id ? "" : value)}/>
      : <div className="shared-notebook-content">
          <div className="quiet-empty"><BookOpen size={25}/>
            <h2>Plan together</h2><p>Choose a notebook or create one to collaborate in realtime.</p>
          </div>
        </div>}
    {notice && <p role="alert" className="feedback-line">{notice}</p>}
  </div>;
}
