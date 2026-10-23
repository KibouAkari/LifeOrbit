import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";

export default function Tasks() {
  const { state, patch } = useApp();
  const [title, setTitle] = useState("");
  const [view, setView] = useState<"open" | "all" | "done">("open");
  const [showDone, setShowDone] = useState(false);
  const open = state.tasks.filter(t => !t.done);
  const completed = state.tasks.filter(t => t.done);
  const visible = view === "done" ? completed : view === "all" ? state.tasks : open;
  function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    patch("tasks", [...state.tasks, { id: newId(), title: title.trim(), done: false }]);
    setTitle("");
    setView("open");
  }
  return <div className="work-page"><Heading title="My tasks" description={`${open.length} things left to do`}/>
    <div className="task-workspace"><div className="task-sidebar"><button className={view==="open"?"selected":""} onClick={()=>setView("open")}>My day <span>{open.length}</span></button><button className={view==="all"?"selected":""} onClick={()=>setView("all")}>All tasks <span>{state.tasks.length}</span></button><button className={view==="done"?"selected":""} onClick={()=>setView("done")}>Completed <span>{completed.length}</span></button></div>
    <section className="task-content"><form className="inline-add" onSubmit={add}><Plus size={19}/><input aria-label="New task" placeholder="Add a task" value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/><button className="button primary" type="submit">Add</button></form>
    <div className="task-list">{visible.length ? visible.map(t=><div className="task-item" key={t.id}><input type="checkbox" aria-label={`Mark ${t.title} complete`} checked={t.done} onChange={e=>patch("tasks",state.tasks.map(x=>x.id===t.id?{...x,done:e.target.checked}:x))}/><span className={t.done?"done":""}>{t.title}</span><button className="icon-button remove-on-hover" aria-label={`Delete ${t.title}`} onClick={()=>patch("tasks",state.tasks.filter(x=>x.id!==t.id))}><Trash2 size={16}/></button></div>):<div className="quiet-empty">You’re all caught up.</div>}</div>
    {view==="open"&&completed.length>0&&<div className="completed-area"><button onClick={()=>setShowDone(!showDone)}>{showDone?"Hide":"Show"} completed ({completed.length})</button>{showDone&&completed.map(t=><div className="task-item" key={t.id}><input type="checkbox" checked onChange={()=>patch("tasks",state.tasks.map(x=>x.id===t.id?{...x,done:false}:x))}/><span className="done">{t.title}</span></div>)}</div>}</section></div></div>;
}
