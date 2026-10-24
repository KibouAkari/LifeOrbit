import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type FormEvent, type DragEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Upload, Clock, Eye, EyeOff, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasSession, request } from "../data/api";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import type { Event as CalendarEvent } from "../types";

const iso=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const monday=(date:Date)=>{const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d;};
const format=(time?:string|null)=>time?time.slice(0,5):"";
const advance=(time:string,minutes:number)=>{const [h,m]=time.split(":").map(Number);const n=h*60+m+minutes;if(n<0||n>=1440)return null;return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;};
const timeMinutes=(time?:string|null,fallback="09:00")=>{const [h,m]=(time||fallback).split(":").map(Number);return h*60+m;};
function layoutEvents(events:CalendarEvent[]){
  const sorted=events.map(event=>({event,start:timeMinutes(event.start_time),end:Math.max(timeMinutes(event.end_time,"10:00"),timeMinutes(event.start_time)+15),lane:0}));
  sorted.sort((a,b)=>a.start-b.start);
  const positions=new Map<string,{lane:number;lanes:number}>();
  let group:typeof sorted=[];
  let groupEnd=-1;
  const placeGroup=()=>{
    const laneEnds:number[]=[];
    for(const item of group){
      let lane=laneEnds.findIndex(end=>end<=item.start);
      if(lane<0){lane=laneEnds.length;laneEnds.push(item.end);}
      else laneEnds[lane]=item.end;
      item.lane=lane;
    }
    for(const item of group)positions.set(item.event.id,{lane:item.lane,lanes:laneEnds.length});
  };
  for(const item of sorted){
    if(group.length&&item.start>=groupEnd){placeGroup();group=[];groupEnd=-1;}
    group.push(item);groupEnd=Math.max(groupEnd,item.end);
  }
  if(group.length)placeGroup();
  return positions;
}

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
 const [friends,setFriends]=useState<{id:string;name:string}[]>([]);
 const [invited,setInvited]=useState<CalendarEvent[]>([]);
 const [messageInvite,setMessageInvite]=useState("");
 const [selectedInvite,setSelectedInvite]=useState<CalendarEvent|null>(null);
 const [participants,setParticipants]=useState<{id:string;name:string;status:string}[]>([]);
 const [menu,setMenu]=useState<{item:CalendarEvent;x:number;y:number}|null>(null);
 const [shareFor,setShareFor]=useState<string|null>(null);
 const [feedForm,setFeedForm]=useState(false),[feedUrl,setFeedUrl]=useState(""),[feedName,setFeedName]=useState("");
 const [feeds,setFeeds]=useState<{id:string;name:string;last_synced:string|null;count:number}[]>([]);
 const input=useRef<HTMLInputElement>(null);
 const calendarColors=useRef(new Map<string,string>());
 const gesture=useRef<{id:string;mode:"move"|"resize";startX:number;startY:number;pointerId:number;original:CalendarEvent;captureTarget:HTMLElement;target:HTMLElement;dragging:boolean}|null>(null);
 const [dragging,setDragging]=useState(false);
 function beginGesture(e:React.PointerEvent<HTMLElement>,event:CalendarEvent,mode:"move"|"resize"){
  if(gesture.current||e.button!==0||event.source==="invited")return;
  e.preventDefault();e.stopPropagation();
  const target=e.currentTarget.closest<HTMLElement>(".orbit-timed-event")||e.currentTarget;
  const g={id:event.id,mode,startX:e.clientX,startY:e.clientY,pointerId:e.pointerId,original:event,captureTarget:e.currentTarget,target,dragging:false};
  gesture.current=g;
  // Window listeners keep the gesture alive even when Firefox changes pointer capture.
  // A pointer up anywhere always clears temporary movement styles.
  const move=(p:PointerEvent)=>{
   if(p.pointerId!==g.pointerId||gesture.current!==g)return;
   const dx=p.clientX-g.startX,dy=p.clientY-g.startY;
   if(!g.dragging&&Math.hypot(dx,dy)<5)return;
   g.dragging=true;setDragging(true);
   const steps=Math.round(dy/16);
   if(mode==="resize"){
    const originalHeight=Math.max(35,(timeMinutes(event.end_time,"10:00")-timeMinutes(event.start_time))*64/60);
    target.style.height=`${Math.max(35,originalHeight+steps*16)}px`;
   }else target.style.transform=`translate(${dx}px,${steps*16}px)`;
   target.style.zIndex="10";
  };
  const finish=(p:PointerEvent)=>{
   if(p.pointerId!==g.pointerId||gesture.current!==g)return;
   window.removeEventListener("pointermove",move);
   window.removeEventListener("pointerup",finish);
   window.removeEventListener("pointercancel",finish);
   gesture.current=null;setDragging(false);
   target.style.height="";target.style.transform="";target.style.zIndex="";
   if(p.type==="pointercancel"||!g.dragging)return;
   const delta=Math.round((p.clientY-g.startY)/16)*15;
   if(mode==="resize"){if(delta)void resizeEvent(event,delta);return;}
   const columns=Array.from(document.querySelectorAll<HTMLElement>(".orbit-day-column[data-day]"));
   const col=columns.find(el=>{const rect=el.getBoundingClientRect();return p.clientX>=rect.left&&p.clientX<rect.right});
   if(!col){setMessage("Drop inside a calendar day.");return;}
   const destination=col.dataset.day||event.date;
   const start=timeMinutes(event.start_time);
   const duration=timeMinutes(event.end_time,"10:00")-start;
   if(start+delta<0||start+delta+duration>=1440){setMessage("Events must stay within a day.");return;}
   if(destination!==event.date||delta)void shiftEvent(event,destination,delta);
  };
  window.addEventListener("pointermove",move);
  window.addEventListener("pointerup",finish);
  window.addEventListener("pointercancel",finish);
 }
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
 async function refreshCalendarData(){const [events,feedList]=await Promise.all([request<CalendarEvent[]>("/calendar/events"),request<typeof feeds>("/calendar/feeds")]);patch("events",events);setFeeds(feedList);}
 async function subscribeFeed(e:FormEvent){e.preventDefault();setImporting(true);try{await request("/calendar/feeds",{method:"POST",body:JSON.stringify({name:feedName,url:feedUrl})});await refreshCalendarData();setFeedName("");setFeedUrl("");setFeedForm(false);setMessage("Calendar link connected. Use Refresh to check for changes.")}catch(error){setMessage(error instanceof Error?error.message:"Could not connect feed")}finally{setImporting(false)}}
 async function refreshFeed(id:string){setImporting(true);try{await request(`/calendar/feeds/${id}/refresh`,{method:"POST"});await refreshCalendarData();setMessage("Calendar refreshed")}catch(error){setMessage(error instanceof Error?error.message:"Refresh failed")}finally{setImporting(false)}}
 async function removeFeed(id:string){if(!window.confirm("Remove this calendar link and imported events?"))return;try{await request(`/calendar/feeds/${id}`,{method:"DELETE"});await refreshCalendarData();setMessage("Calendar link removed")}catch(error){setMessage(error instanceof Error?error.message:"Could not remove calendar")}}

 useEffect(()=>{if(!online)return;void Promise.all([request<typeof imports>("/calendar/imports"),request<{friends:typeof friends}>("/friends"),request<CalendarEvent[]>("/sharing/events"),request<typeof feeds>("/calendar/feeds")]).then(([sources,data,events,subscriptions])=>{setImports(sources);setFriends(data.friends);setInvited(events);setFeeds(subscriptions)}).catch(()=>undefined);},[online]);
 useEffect(()=>{
  if(!online)return;
  let alive=true;
  const refresh=()=>{void Promise.all([request<CalendarEvent[]>("/sharing/events"),request<{friends:typeof friends}>("/friends")])
   .then(([items,people])=>{if(alive){setInvited(items);setFriends(people.friends)}}).catch(()=>undefined)};
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")refresh()},5000);
  window.addEventListener("lifeorbit:remote-updated",refresh);
  window.addEventListener("focus",refresh);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener("lifeorbit:remote-updated",refresh);window.removeEventListener("focus",refresh)};
 },[online]);
 function showMenu(e:React.MouseEvent<HTMLElement>,item:CalendarEvent){
  e.preventDefault();e.stopPropagation();
  // A right-click uses the pointer location; the touch/keyboard action button
  // anchors beneath itself. Render the menu in document.body to avoid
  // transformed calendar panes becoming the containing block for fixed CSS.
  const rect=e.currentTarget.getBoundingClientRect();
  const pointer=e.type==="contextmenu"&&e.clientX>0&&e.clientY>0;
  const rawX=pointer?e.clientX:rect.left;
  const rawY=pointer?e.clientY:rect.bottom+6;
  setMenu({item,x:Math.max(8,Math.min(rawX,window.innerWidth-204)),
    y:Math.max(8,Math.min(rawY,window.innerHeight-170))});
 }
 function chooseAction(action:"edit"|"share"|"delete"){
  const item=menu?.item;if(!item)return;
  setMenu(null);
  if(action==="edit")open(item.date,item);
  if(action==="share"){setShareFor(item.id);setMessageInvite("");void request<typeof participants>(`/sharing/events/${item.id}/participants`).then(setParticipants).catch(()=>setParticipants([]));}
  if(action==="delete"&&window.confirm("Delete this event?"))void remove(item);
 }
 async function respond(item:CalendarEvent,status:"accepted"|"declined"){
  if(!item.invitation_id)return;
  try{await request(`/sharing/events/${item.invitation_id}/response`,{method:"PATCH",body:JSON.stringify({status})});
   setInvited(rows=>rows.map(x=>x.invitation_id===item.invitation_id?{...x,rsvp_status:status}:x));
   setSelectedInvite(current=>current&&current.invitation_id===item.invitation_id?{...current,rsvp_status:status}:current);
   setMessage(status==="accepted"?"Invitation accepted":"Invitation declined");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not respond")}
 }
 async function dismissInvite(item:CalendarEvent){
  if(!item.invitation_id)return;
  try{await request(`/sharing/events/${item.invitation_id}`,{method:"DELETE"});
   setInvited(rows=>rows.filter(x=>x.invitation_id!==item.invitation_id));
   setSelectedInvite(null);setMessage("Invitation removed");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not remove invitation")}
 }
 async function openInvite(item:CalendarEvent){
  setSelectedInvite(item);
  try{setParticipants(await request<typeof participants>(`/sharing/events/${item.id}/participants`))}catch{setParticipants([])}
 }
 const origins=[...new Set([...state.events,...invited].map(source))];
 const palette=["#b7a7fb","#7dcac6","#f0b77b","#83b4ee","#e79fbf","#9bce86","#d2ac80","#97c5dc"];
 const calendarColor=(id:string)=>{
   const assigned=calendarColors.current.get(id);
   if(assigned)return assigned;
   const index=calendarColors.current.size;
   const color=index<palette.length?palette[index]:`hsl(${((index-palette.length)*137.508)%360} 58% 68%)`;
   calendarColors.current.set(id,color);
   return color;
 };
 const visible=(day:Date)=>[...state.events,...invited].filter(e=>e.rsvp_status!=="declined"&&e.date===iso(day)&&!hidden.includes(source(e))).sort((a,b)=>(a.start_time||"").localeCompare(b.start_time||""));
 const heading=view==="month"?base.toLocaleDateString("en",{month:"long",year:"numeric"}):`${days[0].toLocaleDateString("en",{month:"short",day:"numeric"})} – ${days[6].toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}`;
 async function invite(id:string,friendId:string){try{await request("/sharing/events",{method:"POST",body:JSON.stringify({resource_id:id,recipient_id:friendId})});setMessageInvite("Invitation sent")}catch(e){setMessageInvite(e instanceof Error?e.message:"Invitation failed")}}
 function open(day:string,item?:CalendarEvent){
   setMenu(null);setDate(day);setEditing(item?.id||null);setTitle(item?.title||"");setStart(format(item?.start_time)||"09:00");setEnd(format(item?.end_time)||"10:00");setCreating(true);
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
   if((item.start_time&&!start_time)||(item.end_time&&!end_time)){setMessage("Events must stay within the same day.");return;}
   const updated={...item,date:day,start_time,end_time};
   try{
     if(online)await request(`/calendar/events/${item.id}`,{method:"PUT",body:JSON.stringify({title:item.title,date:day,start_time,end_time})});
     patch("events",rows=>rows.map(e=>e.id===item.id?updated:e));setMessage("Event moved");
   }catch(error){setMessage(error instanceof Error?error.message:"Move failed");}
 }
 async function resizeEvent(item:CalendarEvent,delta:number){
  if(!item.start_time||!item.end_time)return;
  const end_time=advance(item.end_time,delta);
  if(!end_time){setMessage("The event must stay within the same day.");return;}
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
    const result=await request<{imported:number;total:number}>("/calendar/ical-import",{method:"POST",body:JSON.stringify({content:await file.text(),name:file.name.replace(/\\.ics$/i,""),time_zone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"})});
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
   if(!item)return;
   const column=e.currentTarget.querySelector(".orbit-time-slots");
   if(column && item.start_time){
     const bounds=column.getBoundingClientRect();
     const minutes=Math.max(0,Math.min(23*60+45,Math.round((e.clientY-bounds.top)/16)*15));
     const [hour,minute]=item.start_time.split(":").map(Number);
     const delta=minutes-(hour*60+minute);
     void shiftEvent(item,day,delta);
   }else void shiftEvent(item,day);
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
    <button className="button calendar-import" disabled={importing} onClick={()=>input.current?.click()}><Upload size={17}/>{importing?"Importing…":"Import .ics"}</button><button className="button" onClick={()=>setFeedForm(v=>!v)}>Add calendar link</button>
    <input ref={input} hidden type="file" accept=".ics,text/calendar" onChange={e=>{void importIcs(e.target.files?.[0]);e.target.value="";}}/>
    <button className="button primary" onClick={()=>open(iso(new Date()))}><Plus size={17}/> Event</button>
   </div></div>
   {feedForm&&<form className="calendar-feed-form" onSubmit={e=>void subscribeFeed(e)}><strong>Subscribe to a calendar link</strong><input className="input" aria-label="Calendar name" placeholder="Calendar name" required value={feedName} maxLength={80} onChange={e=>setFeedName(e.target.value)}/><input className="input" aria-label="Private iCal HTTPS address" placeholder="https://calendar.google.com/calendar/ical/..." type="url" required value={feedUrl} onChange={e=>setFeedUrl(e.target.value)}/><button className="button primary" disabled={importing}>Connect</button><p className="muted">Public HTTPS and webcal links are supported. Private network addresses are blocked. Links are stored encrypted.</p></form>}
   {feeds.length>0&&<div className="calendar-feed-list">{feeds.map(f=><div key={f.id}><strong>{f.name}</strong><span>{f.count} events · {f.last_synced?"Updated "+new Date(f.last_synced).toLocaleString():"Not updated"}</span><button className="text-button" onClick={()=>void refreshFeed(f.id)} disabled={importing}>Refresh</button><button className="text-button" onClick={()=>void removeFeed(f.id)}>Remove</button></div>)}</div>}
   <div className="calendar-sources"><strong>Calendars</strong>{origins.length?origins.map(origin=><div className="calendar-source-entry" key={origin}><button className={hidden.includes(origin)?"calendar-source muted":"calendar-source"} style={{borderLeft:`4px solid ${calendarColor(origin)}`}} onClick={()=>setHidden(rows=>rows.includes(origin)?rows.filter(x=>x!==origin):[...rows,origin])}>{hidden.includes(origin)?<EyeOff size={15}/>:<Eye size={15}/>} {imports.find(s=>s.id===origin)?.name||feeds.find(s=>s.id===origin)?.name|| (origin==="ical_import"?"Imported events":origin==="invited"?"Invitations":"My events")}</button>{imports.some(s=>s.id===origin)&&<button className="calendar-source-remove" title="Remove imported calendar" aria-label="Remove imported calendar" onClick={()=>void removeImport(origin)}>×</button>}</div>):<span>My events</span>}</div>
   {invited.length>0&&<div className="calendar-invitations"><strong>Invitations</strong>{invited.map(item=><div key={item.invitation_id||item.id} className="calendar-invitation-row"><span>{item.title}<small>{item.owner_name} · {item.date} · {item.rsvp_status||"pending"}</small></span>{item.rsvp_status!=="accepted"&&<button className="button" onClick={()=>void respond(item,"accepted")}>Accept</button>}{item.rsvp_status!=="declined"&&<button className="button" onClick={()=>void respond(item,"declined")}>Decline</button>}<button className="text-button" onClick={()=>void dismissInvite(item)}>Remove</button></div>)}</div>}
   <p role="status" aria-live="polite" className="feedback-line">{message}</p>
   {creating&&<div className="orbit-event-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCreating(false)}}><form className="calendar-add calendar-editor orbit-event-dialog" role="dialog" aria-modal="true" aria-label={editing?"Edit event":"New event"} onSubmit={save}><h2>{editing?"Edit event":"New event"}</h2>
    <input className="input" required maxLength={120} placeholder="Event name" value={title} onChange={e=>setTitle(e.target.value)}/>
    <input className="input" type="date" required value={date} onChange={e=>setDate(e.target.value)}/>
    <label><Clock size={15}/> <input className="input" type="time" required aria-label="Start time" value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label>to <input className="input" type="time" required aria-label="End time" value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <button className="button primary">{editing?"Update":"Add event"}</button>
    {editing&&<button type="button" className="button" onClick={()=>{const item=state.events.find(x=>x.id===editing);if(item)void remove(item)}}>Delete</button>}
    <button type="button" className="text-button" onClick={()=>setCreating(false)}>Cancel</button>
    {editing&&friends.length>0&&<label>Invite a friend <select className="select" defaultValue="" onChange={e=>{if(e.target.value)void invite(editing,e.target.value);e.target.value=""}}><option value="">Choose a friend</option>{friends.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>}
    <span role="status">{messageInvite}</span>
   </form></div>}
   {!state.events.length&&!creating&&<div className="calendar-first-event"><CalendarDays size={28}/><h2>Add your first event</h2><p>Make space for your next plan.</p><button className="button primary" onClick={()=>open(iso(new Date()))}>Create event</button></div>}
   {view==="week"?<div className="orbit-timeline-shell"><div className="orbit-timeline">
    <div className="orbit-times"><div className="orbit-time-heading">GMT</div>{Array.from({length:24},(_,i)=><div className="orbit-time-label" key={i}>{String(i).padStart(2,"0")}:00</div>)}</div>
    {days.map(day=>{const events=visible(day);const positions=layoutEvents(events);return <div key={iso(day)} data-day={iso(day)} className={`orbit-day-column ${iso(day)===iso(new Date())?"is-today":""}`} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,iso(day))}>
      <button className="orbit-day-heading" onClick={()=>open(iso(day))}>{day.toLocaleDateString("en",{weekday:"short"})}<strong>{day.getDate()}</strong></button>
      <div className="orbit-time-slots" onClick={e=>{const bounds=e.currentTarget.getBoundingClientRect();const minutes=Math.max(0,Math.min(23*60+45,Math.round((e.clientY-bounds.top)/16)*15));const h=Math.floor(minutes/60);const m=minutes%60;const endMinutes=Math.min(23*60+59,minutes+60);open(iso(day));setStart(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);setEnd(`${String(Math.floor(endMinutes/60)).padStart(2,"0")}:${String(endMinutes%60).padStart(2,"0")}`)}}>
        {events.map(item=>{const [sh,sm]=(item.start_time||"09:00").split(":").map(Number);const [eh,em]=(item.end_time||"10:00").split(":").map(Number);const top=(sh*60+sm)*64/60;const height=Math.max(35,((eh-sh)*60+em-sm)*64/60);const {lane,lanes}=positions.get(item.id)||{lane:0,lanes:1};return <div onContextMenuCapture={e=>item.source!=="invited"&&showMenu(e,item)} className={`orbit-timed-event ${item.source==="invited"?"invited-event":""} ${dragging?"calendar-gesture-active":""}`} key={item.id} draggable={false} onPointerDown={e=>{if((e.target as HTMLElement).closest("button"))return;beginGesture(e,item,"move")}} onClick={e=>e.stopPropagation()} style={{borderLeftColor:calendarColor(source(item)),backgroundColor:`color-mix(in srgb, ${calendarColor(source(item))} 22%, var(--surface))`,top:`${top}px`,height:`${height}px`,left:`calc(${lane*100/lanes}% + 5px)`,right:`calc(${(lanes-lane-1)*100/lanes}% + 5px)`}}>
          {item.source!=="invited"&&<button type="button" className="orbit-event-move-handle" aria-label={`Move ${item.title}`} title="Drag to move" onPointerDown={e=>{e.stopPropagation();beginGesture(e,item,"move")}} onClick={e=>e.stopPropagation()}>⋮⋮</button>}
          {item.source!=="invited"&&<button type="button" className="orbit-event-more" title="Event actions" aria-label={`Actions for ${item.title}`} onClick={e=>{e.stopPropagation();showMenu(e,item)}}><MoreHorizontal size={15}/></button>}
          <button className="orbit-event-label" onClick={e=>{e.stopPropagation();item.source==="invited"?void openInvite(item):open(item.date,item)}}><strong>{item.title}</strong><small>{format(item.start_time)} – {format(item.end_time)}{item.source==="invited"?" · Invitation":""}</small></button>
          {item.source!=="invited"&&<button className="orbit-event-grip" aria-label="Resize event" title="Drag to change duration" onPointerDown={e=>{e.stopPropagation();beginGesture(e,item,"resize")}}/>}
        </div>})}
      </div>
    </div>})}
   </div></div>:<div className="weekly-grid calendar-month-grid">{days.map(day=><section key={iso(day)} className={`week-day ${iso(day)===iso(new Date())?"is-today":""} ${day.getMonth()!==base.getMonth()?"out-of-month":""}`} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,iso(day))}>
     <button className="week-day-title" onClick={()=>open(iso(day))}><span>{day.toLocaleDateString("en",{weekday:"short"})}</span><strong>{day.getDate()}</strong></button>{visible(day).map(item=><div key={item.id} className="orbit-month-event" onContextMenuCapture={e=>item.source!=="invited"&&showMenu(e,item)}><button className={`week-event ${item.source==="invited"?"invited-event":""}`} style={{borderLeftColor:calendarColor(source(item)),backgroundColor:`color-mix(in srgb, ${calendarColor(source(item))} 22%, var(--surface))`}} draggable={item.source!=="invited"} onDragStart={e=>e.dataTransfer.setData("text/plain",item.id)} onClick={()=>item.source==="invited"?void openInvite(item):open(item.date,item)}>{caption(item)}</button>{item.source!=="invited"&&<button className="orbit-month-more" aria-label={`Actions for ${item.title}`} onClick={e=>showMenu(e,item)}><MoreHorizontal size={15}/></button>}</div>)}
     <button className="week-add" onClick={()=>open(iso(day))}>+</button>
   </section>)}</div>}
   {menu&&createPortal(<><button className="orbit-menu-dismiss" aria-label="Close event actions" onClick={()=>setMenu(null)}/><div className="orbit-event-menu" role="menu" style={{left:menu.x,top:Math.max(12,menu.y)}}>
      <button role="menuitem" onClick={()=>chooseAction("edit")}><Pencil size={16}/> Edit</button>
      <button role="menuitem" onClick={()=>chooseAction("share")}><Share2 size={16}/> Share</button>
      <button role="menuitem" className="danger" onClick={()=>chooseAction("delete")}><Trash2 size={16}/> Delete</button>
    </div></>,document.body)}
   {selectedInvite&&<div className="orbit-event-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedInvite(null)}}>
    <section className="orbit-event-dialog" role="dialog" aria-modal="true" aria-label="Event invitation">
     <h2>{selectedInvite.title}</h2>
     <p>{selectedInvite.date} · {format(selectedInvite.start_time)}–{format(selectedInvite.end_time)}</p>
     <p>Invitation from {selectedInvite.owner_name||"a friend"}</p>
     <div className="event-participants"><strong>Participants</strong>{participants.map(p=><div key={p.id}><span>{p.name}</span><small>{p.status}</small></div>)}</div>
     {selectedInvite.rsvp_status!=="accepted"&&<button className="button primary" onClick={()=>void respond(selectedInvite,"accepted")}>Accept</button>}
     {selectedInvite.rsvp_status!=="declined"&&<button className="button" onClick={()=>void respond(selectedInvite,"declined")}>Decline</button>}
     <button className="button" onClick={()=>void dismissInvite(selectedInvite)}>Remove invitation</button>
     <button className="text-button" onClick={()=>setSelectedInvite(null)}>Close</button>
    </section></div>}
   {shareFor&&<div className="orbit-event-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShareFor(null)}}><section className="orbit-event-dialog" role="dialog" aria-modal="true" aria-label="Share event"><h2>Invite to event</h2><p>Choose a friend to invite.</p><select className="select" aria-label="Invite friend" defaultValue="" onChange={e=>{if(e.target.value)void invite(shareFor,e.target.value);e.target.value=""}}><option value="">Select a friend</option>{friends.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><p role="status">{messageInvite}</p><div className="event-participants"><strong>Participants</strong>{participants.map(p=><div key={p.id}><span>{p.name}</span><small>{p.status}</small></div>)}</div><button className="button" onClick={()=>setShareFor(null)}>Done</button></section></div>}
   <p className="calendar-help">Drag an event to another day. Edit its start and end time to resize it. Importing .ics files creates a copy, not a live Google, Outlook or Apple connection.</p>
 </div>;
}
