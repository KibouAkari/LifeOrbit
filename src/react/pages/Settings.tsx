import { useState, type FormEvent } from "react";
import { LogOut, RotateCcw, Shield, Volume2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasSession } from "../data/api";
import { Heading, Card } from "../components/UI";
import type { Theme } from "../types";

export default function Settings(){
  const {state,patch,reset}=useApp();
  const [name,setName]=useState(state.account);
  const [message,setMessage]=useState("");
  const authenticated=hasSession();
  function save(e:FormEvent){e.preventDefault();if(!name.trim())return;patch("account",name.trim());setMessage("Saved on this device");}
  return <div className="work-page"><Heading title="Account & settings" description="Make LifeOrbital yours."/><div className="grid">
    <Card title="Profile" span={6}><form className="form" onSubmit={save}><label className="form-label">Display name<input className="input" required value={name} maxLength={50} onChange={e=>setName(e.target.value)}/></label><button className="button primary">Save display name</button></form><p className="muted tiny">Display name here changes your current device only.</p></Card>
    <Card title="Appearance" span={6}><label className="form-label">Theme<select className="select" value={state.theme} onChange={e=>{patch("theme",e.target.value as Theme);setMessage("Appearance updated");}}><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select></label></Card>
    <Card title="Preferences" span={6}><div className="settings-feature"><Volume2 size={18}/><div><strong>Task completion sounds</strong><p>Gentle audio feedback when completing a task.</p></div><span>Enabled</span></div><div className="settings-feature"><RotateCcw size={18}/><div><strong>Data synchronisation</strong><p>{authenticated?"Calendar and tasks use the Python API.":"Sign in with Google to sync calendar and tasks."}</p></div></div></Card>
    <Card title="Privacy & access" span={6}><div className="settings-feature"><Shield size={18}/><div><strong>{authenticated?"Google connected":"Guest workspace"}</strong><p>{authenticated?"This session expires and may require another sign-in.":"Data remains on this browser until cleared."}</p></div></div><button className="button" onClick={()=>window.dispatchEvent(new Event("lifeorbit:logout"))}><LogOut size={16}/> Sign out</button></Card>
    {!authenticated&&<Card title="Local data" span={12}><p className="muted">Clear the browser-only workspace if you want a fresh start.</p><button className="button danger" onClick={()=>{if(confirm("Clear local workspace?")){reset();setName("");setMessage("Workspace reset");}}}>Reset workspace</button></Card>}
  </div><p role="status" className="feedback-line">{message}</p></div>;
}
