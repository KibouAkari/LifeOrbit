/** Conflict-free autosaving notebook UI without an external realtime provider.
 * Yjs merges concurrent edits; a short HTTP poll is the recovery/delivery path.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Trash2, Users, Wifi, WifiOff } from "lucide-react";
import * as Y from "yjs";
import { request } from "../data/api";
import { patchYText } from "./LiveSharedNotebooks";

type Page = { id: string; title: string; body?: string };
type Friend = { id: string; name: string };
type Book = {
  id: string; title: string; owner: string; is_owner: boolean;
  owner_name: string; members: Friend[]; pages: Page[];
};
type BookList = { items: Book[]; next_offset: number | null };
type Sync = { version: number; update: string | null; pages: Page[] };

function decode(text: string) {
  const binary = atob(text);
  const value = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) value[index] = binary.charCodeAt(index);
  return value;
}
function encode(value: Uint8Array) {
  let binary = "";
  // Avoid a stack-size overflow on large collaborative notebook documents.
  for (let index = 0; index < value.length; index += 32768) {
    binary += String.fromCharCode(...value.subarray(index, index + 32768));
  }
  return btoa(binary);
}
const titleKey = (id: string) => `page:${id}:title`;
const bodyKey = (id: string) => `page:${id}:body`;

async function getBooks() {
  const result: Book[] = [];
  let offset = 0;
  while (result.length < 1000) {
    const page = await request<BookList>(`/shared-notebooks?offset=${offset}`);
    result.push(...page.items);
    if (page.next_offset === null) break;
    offset = page.next_offset;
  }
  return result;
}

function NativeBook({book, friends, onRefresh, onSavePendingChange}:{
  book: Book; friends: Friend[]; onRefresh: () => Promise<void>;
  onSavePendingChange: (pending:boolean) => void;
}) {
  const [pages, setPages] = useState<Page[]>(book.pages);
  const [selected, setSelected] = useState(book.pages[0]?.id ?? "");
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(-1);
  const dirtyRef = useRef(false);
  const writingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(()=>{});

  useEffect(() => {
    setPages(book.pages);
    setSelected(value => book.pages.some(page => page.id === value)
      ? value : book.pages[0]?.id ?? "");
  }, [book.pages]);

  useEffect(() => {
    let alive = true;
    const shared = new Y.Doc();
    let requestInFlight = false;
    let failures = 0;
    let retry = false;
    const merge = (data: Sync) => {
      if (!alive) return;
      if (data.update) Y.applyUpdate(shared, decode(data.update), "server");
      versionRef.current = Math.max(versionRef.current, data.version);
      setPages(data.pages);
    };
    const schedule = (afterFailure = false) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Back off during an outage rather than hammering the database every
      // 320 ms, while still keeping the editor's unsaved state visible.
      const delay = afterFailure ? Math.min(30000, 1000 * 2 ** Math.min(failures, 5)) : 320;
      timerRef.current = setTimeout(() => flushRef.current(), delay);
    };
    const onUpdate = (_bytes: Uint8Array, origin: unknown) => {
      if (!alive) return;
      setRevision(value => value + 1);
      if (origin !== "server") {
        dirtyRef.current = true;
        onSavePendingChange(true);
        setStatus("Saving…");
        schedule();
      }
    };
    shared.on("update", onUpdate);
    const pull = async () => {
      if (requestInFlight || !alive) return;
      requestInFlight = true;
      try {
        const result = await request<Sync>(
          `/shared-notebooks/${book.id}/sync?since=${versionRef.current}`);
        merge(result);
        if (alive) {
          setDoc(shared);
          if (!dirtyRef.current && !writingRef.current) setStatus("Autosaved");
          setError("");
        }
      } catch (failure) {
        if (!alive) return;
        const message = failure instanceof Error ? failure.message : "Cannot verify notebook access";
        setError(message);
        setStatus("Connection lost");
        if (/not found|denied|sign in|revoked|unauthorized/i.test(message)) {
          // Never leave a former friend's fetched private content visible or
          // continue retrying a now unauthorized write.
          dirtyRef.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          onSavePendingChange(false);
          setDoc(null); setPages([]); setSelected("");
          void onRefresh();
        }
      } finally {
        requestInFlight = false;
      }
    };
    flushRef.current = () => {
      if (!alive || !dirtyRef.current || writingRef.current || versionRef.current < 0) return;
      writingRef.current = true;
      dirtyRef.current = false;
      retry = false;
      const update = encode(Y.encodeStateAsUpdate(shared));
      void request<Sync>(`/shared-notebooks/${book.id}/sync`, {
        method: "POST", body: JSON.stringify({update}),
      }).then((result) => {
        if (!alive) return;
        merge(result);
        failures = 0;
        setStatus(dirtyRef.current ? "Saving…" : "Autosaved");
        if (!dirtyRef.current) onSavePendingChange(false);
        setError("");
      }).catch((failure) => {
        if (!alive) return;
        const message = failure instanceof Error ? failure.message : "Unable to save changes";
        if (/not found|denied|sign in|revoked|unauthorized/i.test(message)) {
          dirtyRef.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          onSavePendingChange(false);
          setDoc(null); setPages([]); setSelected("");
          void onRefresh();
        } else {
          dirtyRef.current = true;
          retry = true;
          failures += 1;
        }
        setStatus("Not saved yet");
        setError(message);
      }).finally(() => {
        writingRef.current = false;
        if (alive && dirtyRef.current) schedule(retry);
      });
    };
    const refresh = () => void pull();
    const checkBeforeLeave = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || writingRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    void pull();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void pull();
    }, 1300);
    window.addEventListener("focus", refresh);
    window.addEventListener("beforeunload", checkBeforeLeave);
    const onRemote = () => void pull();
    window.addEventListener("lifeorbit:remote-updated", onRemote);
    return () => {
      // Keep the in-flight save alive even if the editor is switched off.
      if (dirtyRef.current && !writingRef.current) flushRef.current();
      alive = false;
      onSavePendingChange(false);
      window.clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("beforeunload", checkBeforeLeave);
      window.removeEventListener("lifeorbit:remote-updated", onRemote);
      shared.off("update", onUpdate);
      shared.destroy();
    };
  }, [book.id, onRefresh, onSavePendingChange]);

  // Keep a stable Yjs document while React renders the current shared state.
  void revision;
  const page = pages.find(item => item.id === selected);
  const titleText = doc && page ? doc.getText(titleKey(page.id)) : null;
  const bodyText = doc && page ? doc.getText(bodyKey(page.id)) : null;
  const title = titleText && titleText.length ? titleText.toString() : page?.title ?? "";
  const body = bodyText ? bodyText.toString() : "";

  function update(field: "title" | "body", value: string) {
    if (!doc || !page) return;
    patchYText(doc.getText(field === "title" ? titleKey(page.id) : bodyKey(page.id)), value);
  }

  async function addPage() {
    setBusy(true); setError("");
    try {
      const created = await request<Page>(`/shared-notebooks/${book.id}/pages`,
        {method: "POST"});
      setPages(previous => [...previous, created]);
      setSelected(created.id);
      if (doc) {
        const text = doc.getText(titleKey(created.id));
        patchYText(text, created.title);
        doc.getText(bodyKey(created.id));
      }
      await onRefresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not create page");
    } finally { setBusy(false); }
  }

  async function deletePage() {
    if (!page || !window.confirm("Delete this page for everyone?")) return;
    setBusy(true);
    try {
      await request(`/shared-notebooks/${book.id}/pages/${encodeURIComponent(page.id)}`,
        {method: "DELETE"});
      setPages(previous => previous.filter(value => value.id !== page.id));
      setSelected("");
      await onRefresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not remove page");
    } finally { setBusy(false); }
  }

  async function inviteFriend() {
    if (!invite || !book.is_owner) return;
    setBusy(true);
    try {
      await request(`/shared-notebooks/${book.id}/members`, {
        method: "POST", body: JSON.stringify({user_id: invite}),
      });
      setInvite("");
      await onRefresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not invite friend");
    } finally { setBusy(false); }
  }

  async function deleteBook() {
    if (!window.confirm("Delete this shared notebook for everyone?")) return;
    try {
      await request(`/shared-notebooks/${book.id}`, {method:"DELETE"});
      await onRefresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not delete notebook");
    }
  }

  const available = friends.filter(friend =>
    friend.id !== book.owner && !book.members.some(member => member.id === friend.id));
  return <div className="shared-notebook-content">
    <header><div><h2>{book.title}</h2>
      <p className="muted">Shared by {book.owner_name} · {book.members.length+1} members</p>
      <p className="feedback-line" role="status">{status === "Autosaved"
        ? <><Wifi size={15}/> Autosaved · conflict-free sync</>
        : <><WifiOff size={15}/> {status}</>}</p></div>
      {book.is_owner && <button className="button" onClick={() => void deleteBook()}
        title="Delete notebook" aria-label="Delete notebook"><Trash2 size={15}/></button>}
    </header>
    {book.is_owner && <div className="shared-notebook-invite">
      <select className="select" value={invite} onChange={event => setInvite(event.target.value)}
        aria-label="Invite a friend"><option value="">Invite a friend</option>
        {available.map(friend => <option value={friend.id} key={friend.id}>{friend.name}</option>)}</select>
      <button className="button" onClick={() => void inviteFriend()} disabled={!invite || busy}>Invite</button>
    </div>}
    <div className="shared-notebook-pages">
      {pages.map(entry => <button key={entry.id} className={selected===entry.id?"selected":""}
        onClick={() => setSelected(entry.id)}>
        {doc ? doc.getText(titleKey(entry.id)).toString() || entry.title : entry.title}
      </button>)}
      <button disabled={!doc || busy} onClick={() => void addPage()}>
        <Plus size={15}/> New page</button>
    </div>
    {page ? <>
      <input className="input" aria-label="Page title" maxLength={120}
        disabled={!doc} value={title} onChange={event => update("title", event.target.value)}/>
      <textarea className="textarea" aria-label="Page content" rows={12}
        maxLength={50000} disabled={!doc} placeholder="Write together…"
        value={body} onChange={event => update("body", event.target.value)}/>
      <div className="shared-note-actions">
        <span className="muted">Changes save automatically. Other editors refresh in about one second.</span>
        <button className="button" onClick={() => void deletePage()} disabled={busy || !doc || status !== "Autosaved"}>
          <Trash2 size={15}/> Delete page</button>
      </div>
    </> : <div className="quiet-empty">Choose a page or create a new one.</div>}
    {error && <p className="feedback-line" role="alert">{error}</p>}
  </div>;
}

export default function NativeSharedNotebooks() {
  const [books,setBooks] = useState<Book[]>([]);
  const [friends,setFriends] = useState<Friend[]>([]);
  const [selected,setSelected] = useState("");
  const [title,setTitle] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [savePending,setSavePending] = useState(false);
  const reload = useCallback(async() => {
    try {
      const items = await getBooks();
      setBooks(items);
      setSelected(current => items.some(book => book.id === current) ? current : "");
      setError("");
      try {
        const data = await request<{friends: Friend[]}>("/friends");
        setFriends(data.friends);
      } catch { setFriends([]); }
    } catch (failure) {
      // Clear sensitive cached notebooks if current authorization cannot be verified.
      setBooks([]);setSelected("");setFriends([]);
      setError(failure instanceof Error ? failure.message : "Unable to verify notebook access");
    }
  }, []);
  useEffect(() => {
    void reload();
    const update = () => void reload();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") update();
    }, 3500);
    window.addEventListener("focus",update);
    window.addEventListener("lifeorbit:remote-updated",update);
    window.addEventListener("lifeorbit:friends-changed",update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus",update);
      window.removeEventListener("lifeorbit:remote-updated",update);
      window.removeEventListener("lifeorbit:friends-changed",update);
    };
  }, [reload]);
  async function createBook() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const created = await request<Book>("/shared-notebooks", {
        method: "POST",body:JSON.stringify({title:title.trim()}),
      });
      setBooks(old => [...old,created]);
      setSelected(created.id);setTitle("");setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to create notebook");
    } finally { setBusy(false); }
  }
  const book = books.find(item => item.id === selected);
  return <div className="shared-notebook-layout">
    <aside className="shared-notebook-sidebar">
      <h3><Users size={17}/> Shared notebooks</h3>
      {books.map(item=><button key={item.id} className={selected===item.id?"selected":""}
        disabled={savePending && selected!==item.id}
        title={savePending && selected!==item.id?"Saving changes first":""}
        onClick={()=>setSelected(item.id)}><BookOpen size={16}/>
        <span>{item.title}<small>By {item.owner_name}</small></span></button>)}
      <form onSubmit={event=>{event.preventDefault();void createBook()}}>
        <input className="input" value={title} maxLength={80}
          onChange={event=>setTitle(event.target.value)} placeholder="New shared notebook"/>
        <button className="button primary" disabled={busy||!title.trim()}><Plus size={16}/> Create</button>
      </form>
    </aside>
    {book ? <NativeBook key={book.id} book={book} friends={friends}
      onRefresh={reload} onSavePendingChange={setSavePending}/>
      : <div className="shared-notebook-content">
          <div className="quiet-empty"><BookOpen size={25}/><h2>Plan together</h2>
          <p>Create a shared notebook, invite a friend and edit together.</p></div>
          {error && <p className="feedback-line" role="alert">{error}</p>}
        </div>}
  </div>;
}
