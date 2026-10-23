import { useMemo, useState, type FormEvent } from "react";
import { ArrowUpRight, Plus, CalendarDays, ChevronRight, Target, NotebookPen, WalletCards, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import { newId } from "../data/storage";

function greeting(hour: number) { return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; }
function formattedDay() { return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()); }
export default function Dashboard() {
  const { state, patch } = useApp();
  const [task, setTask] = useState("");
  const pending = state.tasks.filter(t => !t.done);
  const completed = state.tasks.filter(t => t.done);
  const today = new Date().toLocaleDateString("sv-SE");
  const events = useMemo(() => [...state.events].sort((a,b) => a.date.localeCompare(b.date)).filter(e=>e.date >= today).slice(0,4), [state.events, today]);
  const progress = state.tasks.length ? Math.round(100*completed.length/state.tasks.length) : 0;
  function addTask(e: FormEvent) { e.preventDefault(); if (!task.trim()) return; patch("tasks", [...state.tasks, { id: newId(), title: task.trim(), done: false }]); setTask(""); }
  return <div className="dashboard">
    <header className="welcome"><div><p className="today-line">{formattedDay()}</p><h1>{greeting(new Date().getHours())}{state.account ? `, ${state.account}` : ""}<span className="welcome-period">.</span></h1><p>Here’s what your day looks like.</p></div><a className="button primary new-task-link" href="#/tasks"><Plus size={17}/> New task</a></header>
    <div className="dashboard-grid">
      <section className="surface-card focus-card"><div className="surface-header"><span>Today’s focus</span><a href="#/tasks" aria-label="View tasks"><ArrowUpRight size={19}/></a></div><div className="focus-bottom"><div><div className="focus-number">{pending.length}</div><h2>{pending.length === 1 ? "task on your list" : "tasks on your list"}</h2><p>{pending.length ? "One thing at a time. You’ve got this." : "Your list is clear. Enjoy your time."}</p></div><div className="progress-ring" style={{"--progress": `${progress}%`} as React.CSSProperties}><div>{progress}<small>%</small></div></div></div></section>
      <section className="surface-card quick-card"><div className="surface-header"><span>Quick add</span><Check size={17}/></div><h2>Capture it now.</h2><p>Get it out of your head and into your day.</p><form className="quick-form" onSubmit={addTask}><input aria-label="New task" placeholder="Something to get done…" maxLength={120} value={task} onChange={e=>setTask(e.target.value)}/><button aria-label="Add task" type="submit"><Plus size={19}/></button></form></section>
      <section className="surface-card tasks-card"><div className="surface-header"><h2>Up next</h2><a href="#/tasks">All tasks <ChevronRight size={15}/></a></div><div className="dashboard-list">{pending.length ? pending.slice(0,5).map(t=><label className="dashboard-task" key={t.id}><input type="checkbox" checked={false} onChange={()=>patch("tasks",state.tasks.map(x=>x.id===t.id?{...x,done:true}:x))}/><span>{t.title}</span></label>) : <div className="quiet-empty">Nothing pending. You're all caught up.</div>}</div></section>
      <section className="surface-card schedule-card"><div className="surface-header"><h2>Coming up</h2><a href="#/calendar">Calendar <ChevronRight size={15}/></a></div><div className="dashboard-list">{events.length ? events.map(e=><div className="event-line" key={e.id}><div className="event-date">{new Date(e.date+"T12:00:00").toLocaleDateString("en",{month:"short",day:"numeric"})}</div><span>{e.title}</span></div>) : <div className="quiet-empty">Your calendar has breathing room. <a href="#/calendar">Add an event</a></div>}</div></section>
      <section className="surface-card glance-card"><div className="surface-header"><h2>At a glance</h2><span className="muted tiny">Your space</span></div><div className="glance-grid"><a href="#/notes"><NotebookPen size={20}/><strong>{state.notes.length}</strong><span>Notes</span></a><a href="#/calendar"><CalendarDays size={20}/><strong>{state.events.length}</strong><span>Events</span></a><a href="#/subscriptions"><WalletCards size={20}/><strong>{state.subscriptions.length}</strong><span>Subscriptions</span></a><a href="#/challenges"><Target size={20}/><strong>{state.challenges.filter(c=>c.value>=c.target).length}</strong><span>Goals met</span></a></div></section>
      <section className="surface-card glance-card"><div className="surface-header"><h2>Challenge highlights</h2><a href="#/challenges">Leaderboard <ChevronRight size={15}/></a></div><div className="glance-grid"><div><strong>{state.challenges.reduce((total, c) => total + Math.min(c.value, c.target) * 10, 0)}</strong><span>Points earned</span></div><div><strong>{state.challenges.filter(c => c.value >= c.target).length}</strong><span>Goals completed</span></div><div><strong>1</strong><span>Your demo rank</span></div><a href="#/challenges"><Target size={20}/><strong>Explore</strong><span>View challenges</span></a></div><p className="muted tiny">Rankings are sample UI until shared accounts are available.</p></section>
    </div>
  </div>;
}
