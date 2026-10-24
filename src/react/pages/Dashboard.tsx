import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowUpRight, Plus, CalendarDays, ChevronRight, Target, NotebookPen, WalletCards } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasSession, request } from "../data/api";
import { newId } from "../data/storage";
import type { Task } from "../types";

const greeting=(hour:number)=>hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
const dateLabel=()=>new Intl.DateTimeFormat("en",{weekday:"long",month:"long",day:"numeric"}).format(new Date());
export default function Dashboard(){
  const {state,patch}=useApp();
  const [input,setInput]=useState("");
  const [message,setMessage]=useState("");
  const pending=state.tasks.filter(t=>!t.done),complete=state.tasks.filter(t=>t.done);
  const upcoming=useMemo(()=>state.events.filter(e=>e.date>=new Date().toLocaleDateString("sv-SE")).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4),[state.events]);
  const total=state.tasks.length;
  const percent=total?Math.round(complete.length/total*100):0;
  const points=state.challenges.reduce((sum,c)=>sum+Math.min(c.value,c.target)*10,0);

  const subs=state.subscriptions;
  const monthly=subs.filter(s=>s.currency==="CHF").reduce((total,s)=>total+s.amount/(s.interval==="yearly"?12:1),0);
  async function add(e:FormEvent){
    e.preventDefault();if(!input.trim())return;
    try{
      const task=hasSession()?await request<Task>("/tasks",{method:"POST",body:JSON.stringify({title:input.trim(),done:false,order:state.tasks.length})}):{id:newId(),title:input.trim(),done:false};
      patch("tasks",current=>[...current,task]);setInput("");setMessage("Added to your tasks");
    }catch(err){setMessage(err instanceof Error?err.message:"Could not save task");}
  }
  return <div className="dashboard"><header className="welcome"><div><p className="today-line">{dateLabel()}</p><h1>{greeting(new Date().getHours())}{state.account?`, ${state.account}`:""}<span className="welcome-period">.</span></h1><p>Make the most of your day.</p></div><a href="#/tasks" className="button primary"><Plus size={17}/> New task</a></header><div className="dashboard-grid">
    <section className="surface-card focus-card"><div className="surface-header"><span>Today's progress</span><a href="#/tasks" aria-label="Open tasks"><ArrowUpRight size={18}/></a></div><div className="focus-bottom"><div><div className="focus-number">{pending.length}</div><h2>{pending.length===1?"task remaining":"tasks remaining"}</h2><p>{total?`${complete.length} of ${total} completed`:"Your day is yours to plan."}</p></div>
    <div className="progress-donut" role="img" aria-label={`${percent}% of tasks completed`} style={{"--progress":`${percent}%`} as CSSProperties}><div><strong>{percent}%</strong><span>done</span></div></div></div></section>
    <section className="surface-card quick-card"><div className="surface-header"><span>Quick add</span></div><h2>What's on your mind?</h2><p>Capture it before you forget.</p><form className="quick-form" onSubmit={add}><input value={input} maxLength={120} onChange={e=>setInput(e.target.value)} aria-label="New task" placeholder="Add something to do"/><button type="submit" aria-label="Add task"><Plus size={18}/></button></form><span className="feedback-line" role="status">{message}</span></section>
    <section className="surface-card tasks-card"><div className="surface-header"><h2>Up next</h2><a href="#/tasks">Tasks <ChevronRight size={15}/></a></div><div className="dashboard-list">{pending.length?pending.slice(0,4).map(t=><a href="#/tasks" className="event-line" key={t.id}><span>{t.title}</span></a>):<div className="quiet-empty">Everything checked off.</div>}</div></section>
    <section className="surface-card schedule-card"><div className="surface-header"><h2>Coming up</h2><a href="#/calendar">Calendar <ChevronRight size={15}/></a></div><div className="dashboard-list">{upcoming.length?upcoming.map(e=><div className="event-line" key={e.id}><span className="event-date">{new Date(e.date+"T12:00:00").toLocaleDateString("en",{month:"short",day:"numeric"})}</span><span>{e.title}</span></div>):<div className="calendar-small-empty"><h3>Add your first event</h3><p>Your week starts here.</p><a href="#/calendar" className="button">Open calendar</a></div>}</div></section>
    <section className="surface-card glance-card"><div className="surface-header"><h2>Your space</h2></div><div className="glance-grid"><a href="#/notes"><NotebookPen size={20}/><strong>{state.notes.length}</strong><span>Notes</span></a><a href="#/calendar"><CalendarDays size={20}/><strong>{state.events.length}</strong><span>Events</span></a><a href="#/subscriptions"><WalletCards size={20}/><strong>{state.subscriptions.length}</strong><span>Subscriptions</span></a><a href="#/challenges"><Target size={20}/><strong>{points}</strong><span>Challenge points</span></a></div></section>
    <section className="surface-card challenge-preview"><div className="surface-header"><h2>Challenge highlights</h2><a href="#/challenges">Leaderboard <ChevronRight size={15}/></a></div><div className="challenge-hero"><div><div className="challenge-score">{points}<small> pts</small></div><p>{state.challenges.filter(c=>c.value>=c.target).length} challenges completed</p></div><div className="podium" aria-label="Your challenge progress"><div className="podium-avatar">{(state.account||"Y").slice(0,1).toUpperCase()}</div><strong>{state.account||"You"}</strong><span>Your progress</span><div className="podium-block">{points} pts</div></div></div><div className="current-challenges">{state.challenges.slice(0,3).map(c=><div key={c.id}><strong>{c.title}</strong><span>{c.value}/{c.target}</span></div>)}</div></section>
    <section className="surface-card subscription-preview"><div className="surface-header"><h2>Subscriptions</h2><a href="#/subscriptions">Manage <ChevronRight size={15}/></a></div><div className="subscription-metrics"><div><span>Active plans</span><strong>{subs.length}</strong></div><div><span>Monthly CHF equivalent</span><strong>{new Intl.NumberFormat("en-CH",{style:"currency",currency:"CHF"}).format(monthly)}</strong></div></div><div className="subscription-mini-list">{subs.slice(0,3).map(s=><div key={s.id}><span>{s.name}</span><strong>{new Intl.NumberFormat("en-CH",{style:"currency",currency:s.currency}).format(s.amount)} / {s.interval==="yearly"?"yr":"mo"}</strong></div>)}</div></section>
  </div></div>;
}
