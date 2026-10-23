import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasSession, request } from "../data/api";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import type { Task } from "../types";

// The short completion delay makes the checkmark visible before the task moves.
function completionSound() {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audio.currentTime + 0.09);
    volume.gain.setValueAtTime(0.025, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.13);
    oscillator.connect(volume); volume.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + 0.14);
    void oscillator.onended; void audio.close().catch(() => {});
  } catch { /* Sound is optional if the browser blocks audio. */ }
}
export default function Tasks() {
  const { state, patch } = useApp();
  const [title, setTitle] = useState("");
  const [view, setView] = useState<"open" | "all" | "done">("open");
  const [finishing, setFinishing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const dragged = useRef<string | null>(null);
  const timers = useRef<number[]>([]);
  const online = hasSession();

  useEffect(() => {
    if (online) {
      request<Task[]>("/tasks").then(tasks => patch("tasks", tasks)).catch(err => setNotice(String(err)));
    }
    return () => timers.current.forEach(clearTimeout);
  }, [online, patch]);

  const open = state.tasks.filter(t => !t.done);
  const completed = state.tasks.filter(t => t.done);
  const visible = view === "done" ? completed : view === "all" ? state.tasks : open;

  async function add(e: FormEvent) {
    e.preventDefault(); if (!title.trim()) return;
    try {
      const value = title.trim();
      const item = online ? await request<Task>("/tasks", {method:"POST", body:JSON.stringify({title:value,done:false,order:state.tasks.length})}) : {id:newId(),title:value,done:false};
      patch("tasks", current => [...current, item]);
      setTitle(""); setView("open"); setNotice("Task added");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Could not add task"); }
  }
  async function toggle(item: Task) {
    if (!item.done) { setFinishing(item.id); completionSound(); }
    const delay = item.done ? 0 : 420;
    const id = window.setTimeout(async () => {
      try {
        if (online) await request(`/tasks/${item.id}`, {method:"PATCH",body:JSON.stringify({done:!item.done})});
        patch("tasks", current => current.map(t=>t.id===item.id?{...t,done:!item.done}:t));
        setNotice(item.done ? "Task reopened" : "Nicely done!");
      } catch (err) { setNotice(err instanceof Error ? err.message : "Could not update task"); }
      finally { setFinishing(null); }
    }, delay);
    timers.current.push(id);
  }
  async function remove(item: Task) {
    try {
      if (online) await request(`/tasks/${item.id}`,{method:"DELETE"});
      patch("tasks", current=>current.filter(t=>t.id!==item.id));setNotice("Task removed");
    } catch (err) {setNotice(err instanceof Error ? err.message : "Delete failed");}
  }
  async function drop(target: string) {
    const source=dragged.current;dragged.current=null;
    if (!source || source===target) return;
    const rows=[...state.tasks], from=rows.findIndex(x=>x.id===source), to=rows.findIndex(x=>x.id===target);
    if(from<0||to<0)return;
    const [moved]=rows.splice(from,1);rows.splice(to,0,moved);
    if(online) {
      try {await Promise.all(rows.map((item,i)=>request(`/tasks/${item.id}`,{method:"PATCH",body:JSON.stringify({order:i})}))); }
      catch(err){setNotice(err instanceof Error?err.message:"Could not save order");return;}
    }
    patch("tasks",rows);setNotice("Order saved");
  }
  return <div className="work-page"><Heading title="My tasks" description={`${open.length} things left to do`}/>
    <div className="task-workspace"><aside className="task-sidebar">
      <button className={view==="open"?"selected":""} onClick={()=>setView("open")}>My day <span>{open.length}</span></button>
      <button className={view==="all"?"selected":""} onClick={()=>setView("all")}>All tasks <span>{state.tasks.length}</span></button>
      <button className={view==="done"?"selected":""} onClick={()=>setView("done")}>Completed <span>{completed.length}</span></button>
    </aside><section className="task-content">
      <form className="inline-add" onSubmit={add}><Plus size={19}/><input aria-label="New task" placeholder="Add a task" value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/><button className="button primary">Add</button></form>
      <p className="feedback-line" role="status" aria-live="polite">{notice}</p>
      <div className="task-list">{visible.length?visible.map(item=><div className={`task-item ${finishing===item.id?"completing":""}`} key={item.id} draggable onDragStart={() => {dragged.current=item.id}} onDragOver={(e:DragEvent)=>e.preventDefault()} onDrop={()=>void drop(item.id)}>
        <GripVertical size={17} className="drag-handle" aria-label="Drag to reorder"/>
        <input type="checkbox" checked={item.done||finishing===item.id} aria-label={`Complete ${item.title}`} onChange={()=>void toggle(item)}/>
        <span className={item.done?"done":""}>{item.title}</span>
        <button className="icon-button remove-on-hover" aria-label="Remove task" onClick={()=>void remove(item)}><Trash2 size={16}/></button>
      </div>):<div className="quiet-empty">Everything is done. Enjoy the day.</div>}</div>
    </section></div>
  </div>;
}
