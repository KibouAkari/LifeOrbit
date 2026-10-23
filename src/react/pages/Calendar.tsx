import { useState, type FormEvent, type ChangeEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Upload } from "lucide-react";
import { useApp } from "../context/AppContext";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";

// Events use date-only values in the demo. Timed events are a backend migration.
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function monday(date: Date) { const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d; }
export default function Calendar() {
  const {state,patch}=useApp();
  const [offset,setOffset]=useState(0);
  const [title,setTitle]=useState("");
  const [date,setDate]=useState(iso(new Date()));
  const [creating,setCreating]=useState(false);
  const week=monday(new Date());week.setDate(week.getDate()+offset*7);
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(week);d.setDate(week.getDate()+i);return d;});
  function save(e:FormEvent){e.preventDefault();if(!title.trim()||!date)return;patch("events",[...state.events,{id:newId(),title:title.trim(),date}]);setTitle("");setCreating(false);}
  async function importIcs(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file)return;
    if(file.size>1024*1024){alert("Choose an ICS file smaller than 1 MB.");return;}
    const raw=await file.text();
    const blocks=raw.replace(/\r\n[ \t]/g,"").split("BEGIN:VEVENT").slice(1);
    const events=blocks.map(block=>{
      const summary=block.match(/^SUMMARY:(.+)$/m)?.[1]?.replace(/\\,/g,",").trim();
      const start=block.match(/^DTSTART[^:]*:(\d{8})/m)?.[1];
      return summary&&start?{id:newId(),title:summary.slice(0,120),date:`${start.slice(0,4)}-${start.slice(4,6)}-${start.slice(6,8)}`}:null;
    }).filter((x):x is {id:string;title:string;date:string}=>x!==null).slice(0,500);
    patch("events",[...state.events,...events]); e.target.value="";
    alert(`Imported ${events.length} events. This is a one-time ICS import, not live sync.`);
  }
  return <div className="work-page"><Heading title="Calendar" description="Your week, at a glance."/><div className="calendar-toolbar"><div className="actions"><button className="icon-button" aria-label="Previous week" onClick={()=>setOffset(offset-1)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="Next week" onClick={()=>setOffset(offset+1)}><ChevronRight size={18}/></button><button className="text-button" onClick={()=>setOffset(0)}>Today</button></div><strong>{dates[0].toLocaleDateString("en",{month:"long",day:"numeric"})} – {dates[6].toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}</strong><div className="actions"><label className="button" title="Import an exported iCalendar (.ics) file"><Upload size={16}/> Import .ics<input type="file" accept=".ics,text/calendar" onChange={importIcs} hidden/></label><button className="button primary" onClick={()=>setCreating(!creating)}><Plus size={17}/> Event</button></div></div>
    <div className="calendar-service-note">Google, Outlook and Apple: export an .ics file to import events here. Live account sync will require the Python backend and provider authorization.</div>
    {creating&&<form className="calendar-add" onSubmit={save}><input className="input" required maxLength={120} placeholder="Event name" value={title} onChange={e=>setTitle(e.target.value)}/><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required/><button className="button primary">Save</button></form>}
    <div className="weekly-grid">{dates.map(d=><section className={iso(d)===iso(new Date())?"week-day is-today":"week-day"} key={iso(d)}><div className="week-day-title"><span>{d.toLocaleDateString("en",{weekday:"short"})}</span><strong>{d.getDate()}</strong></div>{state.events.filter(e=>e.date===iso(d)).map(e=><div className="week-event" key={e.id}><span>{e.title}</span><button aria-label="Remove event" onClick={()=>patch("events",state.events.filter(x=>x.id!==e.id))}>×</button></div>)}<button className="week-add" aria-label={`Add event on ${iso(d)}`} onClick={()=>{setDate(iso(d));setCreating(true)}}>+</button></section>)}</div></div>;
}
