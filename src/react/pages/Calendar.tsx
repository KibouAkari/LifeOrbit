import { useEffect, useMemo, useRef, useState, type FormEvent, type DragEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Upload, Clock, Eye, EyeOff } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasSession, request } from "../data/api";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import type { Event as CalendarEvent } from "../types";

const iso=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const monday=(date:Date)=>{const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d;};
const format=(time?:string|null)=>time?time.slice(0,5):"";
const advance=(time:string,minutes:number)=>{const [h,m]=time.split(":").map(Number);const n=Math.max(0,Math.min(1439,h*60+m+minutes));return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;};

export default function Calendar(){
 const {state,patch}=useApp();
 const [view,setView]=useState<"week"|"month">("week");
 const [shift,setShift]=useState(0);
  const [title,setTitle]=useState("");
 const [date,setDate]=useState(iso(new Date()));
 const [start,setStart]=useState("09:00"),[end,setEnd]=useState("10:00");
 const [editing,setEditing]=useState<string|null>(null);
 const [creating,setCreating]=useState(false);
 const [message,setMessage]=useState("");
 const [importing,setImporting]=useState(false);
 const [hidden,setHidden]=useState<string[]>([]);
 const [imports,setImports]=useState<{id:string;name:string;events:number}[]>([]);
 const input=useRef<HTMLInputElement>(null);
 const today=useMemo(()=>new Date(),[]);
 const online=hasSession();
 const base=useMemo(()=>{
   const d=new Date(today);d.setHours(12,0,0,0);
   if(view==="month"){d.setDate(1);d.setMonth(d.getMonth()+shift);return d;}
   if(shift!==0){const week=monday(today);week.setDate(week.getDate()+(shift<0?shift+1:shift)*7);return week;}
   return d;
 },[today,view,shift]);
 const days=useMemo(()=>{
   if(view==="week")return Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(d.getDate()+i);return d;});
   const first=monday(base);
   const last=new Date(base.getFullYear(),base.getMonth()+1,0,12);
   const length=Math.ceil((((last.getTime()-first.getTime())/86400000)+1)/7)*7;
   return Array.from({length},(_,i)=>{const d=new Date(first);d.setDate(d.getDate()+i);return d;});
 },[base,view]);
 const source=(event:CalendarEvent)=>event.source_id||event.source||"mongodb";
 useEffect(()=>{if(online)void request<typeof imports>("/calendar/imports").then(setImports).catch(()=>undefined);},[online]);
 const origins=[...new Set(state.events.map(source))];
 const visible=(day:Date)=>state.events.filter(e=>e.date===iso(day)&&!hidden.includes(source(e))).sort((a,b)=>(a.start_time||"").localeCompare(b.start_time||""));
 const heading=view==="month"?base.toLocaleDateString("en",{month:"long",year:"numeric"}):`${days[0].toLocaleDateString("en",{month:"short",day:"numeric"})} – ${days[6].toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}`;
 function open(day:string,item?:CalendarEvent){
   setDate(day);setEditing(item?.id||null);setTitle(item?.title||"");setStart(format(item?.start_time)||"09:00");setEnd(format(item?.end_time)||"10:00");setCreating(true);
 }
 async function save(e:FormEvent){
   e.preventDefault();if(!title.trim()||end<=start){setMessage("Choose an end time after the start time.");return;}
   const body=JSON.stringify({title:title.trim(),date,start_time:start,end_time:end});
   try{
     if(editing){
       if(online)await request(`/calendar/events/${editing}`,{method:"PUT",body});
       patch("events",old=>old.map(x=>x.id===editing?{...x,title:title.trim(),date,start_time:start,end_time:end}:x));
       setMessage("Event updated");
     }else{
       const item=online?await request<CalendarEvent>("/calendar/events",{method:"POST",body}):{id:newId(),title:title.trim(),date,start_time:start,end_time:end};
       patch("events",old=>[...old,item]);setMessage("Event created");
     }
     setCreating(false);
   }catch(error){setMessage(error instanceof Error?error.message:"Could not save event");}
 }
 async function remove(item:CalendarEvent){
   try{if(online)await request(`/calendar/events/${item.id}`,{method:"DELETE"});patch("events",rows=>rows.filter(e=>e.id!==item.id));setCreating(false);setMessage("Event removed");}
   catch(error){setMessage(error instanceof Error?error.message:"Unable to remove event");}
 }
 async function shiftEvent(item:CalendarEvent,day:string,delta=0){
   const start_time=item.start_time?advance(item.start_time,delta):null;
   const end_time=item.end_time?advance(item.end_time,delta):null;
   const updated={...item,date:day,start_time,end_time};
   try{
     if(online)await request(`/calendar/events/${item.id}`,{method:"PUT",body:JSON.stringify({title:item.title,date:day,start_time,end_time})});
     patch("events",rows=>rows.map(e=>e.id===item.id?updated:e));setMessage("Event moved");
   }catch(error){setMessage(error instanceof Error?error.message:"Move failed");}
 }
 async function resizeEvent(item:CalendarEvent,delta:number){
  if(!item.start_time||!item.end_time)return;
  const end_time=advance(item.end_time,delta);
  if(end_time<=item.start_time){setMessage("The event must have a positive duration.");return;}
  try{
   if(online)await request(`/calendar/events/${item.id}`,{method:"PUT",body:JSON.stringify({title:item.title,date:item.date,start_time:item.start_time,end_time})});
   patch("events",rows=>rows.map(e=>e.id===item.id?{...e,end_time}:e));setMessage("Event duration updated");
  }catch(error){setMessage(error instanceof Error?error.message:"Could not resize event");}
 }
 async function importIcs(file?:File){
   if(!file)return;
   if(file.size>1e6){setMessage("Choose an .ics file below 1 MB");return;}
   if(!online){setMessage("Sign in to import a calendar.");return;}
   setImporting(true);try{
    const result=await request<{imported:number;total:number}>("/calendar/ical-import",{method:"POST",body:JSON.stringify({content:await file.text(),name:file.name.replace(/\\.ics$/i,"")})});
    const [events, sources]=await Promise.all([request<CalendarEvent[]>("/calendar/events"),request<typeof imports>("/calendar/imports")]);patch("events",events);setImports(sources);setMessage(`Added ${result.imported} events. ${result.total-result.imported} already existed.`);
   }catch(error){setMessage(error instanceof Error?error.message:"Import failed");}finally{setImporting(false);}
 }
 async function removeImport(id:string){
  if(!window.confirm("Remove all events from this imported calendar?"))return;
  try{await request(`/calendar/imports/${id}`,{method:"DELETE"});const [events,sources]=await Promise.all([request<CalendarEvent[]>("/calendar/events"),request<typeof imports>("/calendar/imports")]);patch("events",events);setImports(sources);setMessage("Imported calendar removed");}
  catch(error){setMessage(error instanceof Error?error.message:"Unable to remove calendar");}
 }
 function drop(e:DragEvent<HTMLElement>,day:string){
   e.preventDefault();
   const id=e.dataTransfer.getData("text/plain");
   const item=state.events.find(x=>x.id===id);
   if(item)void shiftEvent(item,day);
 }
 const caption=(item:CalendarEvent)=>[format(item.start_time),item.title].filter(Boolean).join(" · ");
 return <div className="work-page calendar-rework">
   <Heading title="Calendar" description="Time for what matters."/>
   <div className="calendar-toolbar"><div className="actions">
    <button className="icon-button" aria-label="Previous period" onClick={()=>setShift(x=>x-1)}><ChevronLeft size={18}/></button>
    <button className="icon-button" aria-label="Next period" onClick={()=>setShift(x=>x+1)}><ChevronRight size={18}/></button>
    <button className="text-button" onClick={()=>{setShift(0)}}>Today</button>
    <div className="calendar-view-switch"><button className={view==="week"?"active":""} onClick={()=>{setView("week");setShift(0)}}>Week</button><button className={view==="month"?"active":""} onClick={()=>{setView("month");setShift(0)}}>Month</button></div>
   </div><strong className="calendar-period-label">{heading}</strong><div className="actions">
    <button className="button calendar-import" disabled={importing} onClick={()=>input.current?.click()}><Upload size={17}/>{importing?"Importing…":"Import"}</button>
    <input ref={input} hidden type="file" accept=".ics,text/calendar" onChange={e=>{void importIcs(e.target.files?.[0]);e.target.value="";}}/>
    <button className="button primary" onClick={()=>open(iso(new Date()))}><Plus size={17}/> Event</button>
   </div></div>
   <div className="calendar-sources"><strong>Calendars</strong>{origins.length?origins.map(origin=><div className="calendar-source-entry" key={origin}><button className={hidden.includes(origin)?"calendar-source muted":"calendar-source"} onClick={()=>setHidden(rows=>rows.includes(origin)?rows.filter(x=>x!==origin):[...rows,origin])}>{hidden.includes(origin)?<EyeOff size={15}/>:<Eye size={15}/>} {imports.find(s=>s.id===origin)?.name|| (origin==="ical_import"?"Imported events":"My events")}</button>{imports.some(s=>s.id===origin)&&<button className="calendar-source-remove" title="Remove imported calendar" aria-label="Remove imported calendar" onClick={()=>void removeImport(origin)}>×</button>}</div>):<span>My events</span>}</div>
   <p role="status" aria-live="polite" className="feedback-line">{message}</p>
   {creating&&<form className="calendar-add calendar-editor" onSubmit={save}>
    <input className="input" required maxLength={120} placeholder="Event name" value={title} onChange={e=>setTitle(e.target.value)}/>
    <input className="input" type="date" required value={date} onChange={e=>setDate(e.target.value)}/>
    <label><Clock size={15}/> <input className="input" type="time" required value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label>to <input className="input" type="time" required value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <button className="button primary">{editing?"Update":"Add event"}</button>
    {editing&&<button type="button" className="button" onClick={()=>{const item=state.events.find(x=>x.id===editing);if(item)void remove(item)}}>Delete</button>}
    <button type="button" className="text-button" onClick={()=>setCreating(false)}>Cancel</button>
   </form>}
   {!state.events.length&&!creating&&<div className="calendar-first-event"><CalendarDays size={28}/><h2>Add your first event</h2><p>Make space for your next plan.</p><button className="button primary" onClick={()=>open(iso(new Date()))}>Create event</button></div>}
   <div className={view==="month"?"weekly-grid calendar-month-grid":"weekly-grid calendar-week-grid"}>
    {days.map(day=><section key={iso(day)} className={`week-day ${iso(day)===iso(new Date())?"is-today":""} ${day.getMonth()!==base.getMonth()&&view==="month"?"out-of-month":""}`} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,iso(day))}>
      <button className="week-day-title" onClick={()=>open(iso(day))}><span>{day.toLocaleDateString("en",{weekday:"short"})}</span><strong>{day.getDate()}</strong></button>
      {visible(day).map(item=><div className="week-event" key={item.id} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",item.id)}>
        <button className="calendar-event-main" onClick={()=>open(item.date,item)}><span>{caption(item)}</span></button>
        <div className="calendar-event-resize">
         <button title="Move 15 minutes earlier" onClick={()=>void shiftEvent(item,item.date,-15)}>−</button>
         <button title="Move 15 minutes later" onClick={()=>void shiftEvent(item,item.date,15)}>+</button>
        </div>
        <button className="calendar-resize-grip" aria-label="Drag to change event duration" title="Drag vertically to extend or shorten" onPointerDown={e=>{e.stopPropagation();const element=e.currentTarget;element.setPointerCapture(e.pointerId);element.dataset.startY=String(e.clientY);}} onPointerUp={e=>{const initial=Number(e.currentTarget.dataset.startY||e.clientY);const steps=Math.round((e.clientY-initial)/15);if(steps!==0)void resizeEvent(item,steps*15);e.currentTarget.releasePointerCapture(e.pointerId);}}>⋮</button>
      </div>)}
      <button className="week-add" onClick={()=>open(iso(day))} aria-label={`Add event on ${iso(day)}`}>+</button>
    </section>)}
   </div>
   <p className="calendar-help">Drag an event to another day. Edit its start and end time to resize it. Importing .ics files creates a copy, not a live Google, Outlook or Apple connection.</p>
 </div>;
}
