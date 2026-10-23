import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { request, hasSession } from "../data/api";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import type { Event as CalendarEvent } from "../types";

const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function weekStart(date:Date){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d;}
export default function Calendar() {
  const {state,patch}=useApp();
  const [week,setWeek]=useState(0);
  const [title,setTitle]=useState("");
  const [date,setDate]=useState(iso(new Date()));
  const [creating,setCreating]=useState(false);
  const [message,setMessage]=useState("");
  const online=hasSession();
  useEffect(()=>{
    if(online)request<CalendarEvent[]>("/calendar/events").then(events=>patch("events",events)).catch(err=>setMessage(String(err)));
  },[online,patch]);
  const monday=weekStart(new Date());monday.setDate(monday.getDate()+week*7);
  const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d;});
  async function add(e:FormEvent) {
    e.preventDefault();if(!title.trim())return;
    try {
      const item=online?await request<CalendarEvent>("/calendar/events",{method:"POST",body:JSON.stringify({title:title.trim(),date})}):{id:newId(),title:title.trim(),date};
      patch("events",current=>[...current,item]);setTitle("");setCreating(false);setMessage("Event added");
    }catch(err){setMessage(err instanceof Error?err.message:"Could not add event");}
  }
  async function remove(id:string) {
    try{
      if(online)await request(`/calendar/events/${id}`,{method:"DELETE"});
      patch("events",current=>current.filter(e=>e.id!==id));setMessage("Event removed");
    }catch(err){setMessage(err instanceof Error?err.message:"Could not remove event");}
  }
  return <div className="work-page"><Heading title="Calendar" description="One week at a time."/>
    <div className="calendar-toolbar"><div className="actions"><button className="icon-button" aria-label="Previous week" onClick={()=>setWeek(week-1)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="Next week" onClick={()=>setWeek(week+1)}><ChevronRight size={18}/></button><button className="text-button" onClick={()=>setWeek(0)}>Today</button></div>
    <strong>{days[0].toLocaleDateString("en",{month:"short",day:"numeric"})} – {days[6].toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}</strong>
    <button className="button primary" onClick={()=>setCreating(!creating)}><Plus size={17}/> Event</button></div>
    {creating&&<form className="calendar-add" onSubmit={add}><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Event title" required maxLength={120}/><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required/><button className="button primary">Save</button></form>}
    <p className="feedback-line" role="status">{message}</p>
    {!state.events.length&&<div className="calendar-first-event"><CalendarIcon/><h2>Add your first event</h2><p>Give your week a little structure.</p><button className="button primary" onClick={()=>setCreating(true)}>Create event</button></div>}
    <div className="weekly-grid">{days.map(day=><section className={iso(day)===iso(new Date())?"week-day is-today":"week-day"} key={iso(day)}><div className="week-day-title"><span>{day.toLocaleDateString("en",{weekday:"short"})}</span><strong>{day.getDate()}</strong></div>{state.events.filter(e=>e.date===iso(day)).map(e=><div className="week-event" key={e.id}><span>{e.title}</span><button aria-label="Delete event" onClick={()=>void remove(e.id)}>×</button></div>)}<button className="week-add" onClick={()=>{setDate(iso(day));setCreating(true)}} aria-label={`Add event on ${iso(day)}`}>+</button></section>)}</div>
  </div>;
}
function CalendarIcon(){return <span className="calendar-empty-symbol" aria-hidden="true">◇</span>}
