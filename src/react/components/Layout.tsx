import { useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutGrid, NotebookPen, CheckCheck, CalendarDays, WalletCards, Target, Settings2, Sun, Moon, Menu, X, Bell } from "lucide-react";
import { hasSession,request } from "../data/api";
import { useFriends } from "./FriendsPanel";
import { useApp } from "../context/AppContext";
import type { Section } from "../types";

const navigation = [
  ["dashboard", "Dashboard", LayoutGrid],
  ["tasks", "Tasks", CheckCheck],
  ["calendar", "Calendar", CalendarDays],
  ["notes", "Notes", NotebookPen],
  ["subscriptions", "Subscriptions", WalletCards],
  ["challenges", "Challenges", Target],
] as const;

export function Layout({ section, dark, children }: { section: Section; dark: boolean; children: ReactNode }) {
  const { state, patch } = useApp();
  const [open, setOpen] = useState(false);
  const {data:friendData}=useFriends();
  const [alerts,setAlerts]=useState<{id:string;title:string;target:string}[]>([]);
  const [showAlerts,setShowAlerts]=useState(false);
  const [toast,setToast]=useState("");
  const known=useRef<Set<string>|null>(null);
  const audible=useRef(false);
  useEffect(()=>{
    const activate=()=>{audible.current=true};
    window.addEventListener("pointerdown",activate,{once:true});
    window.addEventListener("keydown",activate,{once:true});
    return()=>{window.removeEventListener("pointerdown",activate);window.removeEventListener("keydown",activate)};
  },[]);
  function notify(title:string){
    setToast(title);
    window.dispatchEvent(new Event("lifeorbit:remote-updated"));
    if(audible.current){
      try{
        const ctx=new AudioContext();
        const tone=ctx.createOscillator(),gain=ctx.createGain();
        tone.type="sine";tone.frequency.setValueAtTime(660,ctx.currentTime);
        tone.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+.13);
        gain.gain.setValueAtTime(.0001,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.025,ctx.currentTime+.02);
        gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.24);
        tone.connect(gain).connect(ctx.destination);tone.start();tone.stop(ctx.currentTime+.25);
        tone.onended=()=>void ctx.close();
      }catch{}
    }
  }
  useEffect(()=>{
    if(!hasSession())return;
    let alive=true;
    const refresh=async()=>{
      try{
        const data=await request<{items:typeof alerts}>("/notifications");
        if(!alive)return;
        const ids=new Set(data.items.map(item=>item.id));
        if(known.current){
          const added=data.items.find(item=>!known.current!.has(item.id));
          if(added)notify(added.title);
        }
        known.current=ids;
        setAlerts(data.items);
      }catch{}
    };
    void refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},4000);
    const focus=()=>void refresh();
    window.addEventListener("focus",focus);
    window.addEventListener("lifeorbit:friends-changed",focus);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener("focus",focus);window.removeEventListener("lifeorbit:friends-changed",focus)};
  },[]);
  useEffect(()=>{if(!toast)return;const handle=window.setTimeout(()=>setToast(""),5000);return()=>clearTimeout(handle)},[toast]);
  async function readAlert(id:string){try{await request("/notifications/read",{method:"POST",body:JSON.stringify({id})});setAlerts(old=>old.filter(x=>x.id!==id))}catch{}}

  if (section === "login") return <>{children}</>;
  return <div className={`shell ${open ? "menu-open" : ""}`}>
    {open && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside className="sidebar" aria-label="Main navigation">
      <a className="brand" href="#/dashboard" onClick={() => setOpen(false)}><img src="/assets/icon.svg" alt=""/>LifeOrbit</a>
      <nav className="nav nav-group" aria-label="Main menu">
        {navigation.map(([key, label, Icon]) => <a key={key} className="nav-link" href={`#/${key}`} aria-current={section === key ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={19} strokeWidth={1.8}/>{label}</a>)}
      </nav>
      <div className="sidebar-bottom"><a className="nav-link" href="#/settings" aria-current={section === "settings" ? "page" : undefined} onClick={() => setOpen(false)}><Settings2 size={19}/>Settings</a><a className="sidebar-account" href="#/settings" onClick={() => setOpen(false)}><span className="avatar">{(state.account || "G").charAt(0).toUpperCase()}</span><span><strong>{state.account || "Guest"}</strong><small>Personal space</small></span></a></div>
    </aside>
    <main className="main"><header className="topbar"><div className="actions"><button className="icon-button mobile-menu" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open?<X size={19}/>:<Menu size={19}/>}</button></div><div className="actions"><div className="orbit-alert-wrap"><button className="icon-button" aria-label="Notifications" aria-expanded={showAlerts} onClick={()=>setShowAlerts(x=>!x)}><Bell size={19}/>{alerts.length+friendData.pending_count>0&&<span className="orbit-alert-count">{alerts.length+friendData.pending_count}</span>}</button>{showAlerts&&<div className="orbit-alert-panel"><strong>Notifications</strong>{alerts.map(a=><div key={a.id}><a href={`#/${a.target}`} onClick={()=>{void readAlert(a.id);setShowAlerts(false)}}>{a.title}</a><button aria-label="Dismiss" onClick={()=>void readAlert(a.id)}>×</button></div>)}{friendData.pending_count>0&&<a href="#/settings" onClick={()=>setShowAlerts(false)}>{friendData.pending_count} friend request(s)</a>}{!alerts.length&&!friendData.pending_count&&<p>All caught up.</p>}</div>}</div><button className="icon-button" aria-label={dark?"Light mode":"Dark mode"} onClick={() => patch("theme",dark?"light":"dark")}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><a className="top-avatar" href="#/settings" aria-label="Account">{(state.account||"G").charAt(0).toUpperCase()}</a></div></header>{children}{toast&&<div className="orbit-live-toast" role="status" aria-live="polite"><Bell size={17}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast("")}>×</button></div>}</main>
  </div>;
}
