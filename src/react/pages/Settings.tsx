import { useEffect,useState,type FormEvent } from "react";
import { LogOut,UserRound,Palette,ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { currentUser,hasSession,type SignedInUser } from "../data/api";
import { Heading } from "../components/UI";
import type { Theme } from "../types";

export default function Settings(){
 const {state,patch,reset}=useApp();
 const [user,setUser]=useState<SignedInUser|null>(null);
 const [message,setMessage]=useState("");
 const [name,setName]=useState(state.account);
 const signedIn=hasSession();
 useEffect(()=>{if(signedIn)void currentUser().then(setUser).catch(()=>setMessage("Could not load your profile."));},[signedIn]);
 function save(e:FormEvent){e.preventDefault();if(!name.trim())return;
   if(signedIn){setMessage("Profile editing is not yet supported by the server.");return;}
   patch("account",name.trim());setMessage("Name updated");
 }
 return <div className="work-page"><Heading title="Settings" description="Your account and preferences."/>
  <div className="settings-clean">
   <section className="surface-card settings-profile">
     <div className="settings-portrait">{(user?.name||state.account||"G")[0].toUpperCase()}</div>
     <div><h2>{user?.name||state.account||"Guest"}</h2><p>{user?.email||(signedIn?"Account connected":"Guest workspace")}</p></div>
     <span className="settings-status">{signedIn?"Signed in":"Guest"}</span>
   </section>
   <section className="surface-card settings-section"><h2><UserRound size={19}/> Profile</h2>
     <form onSubmit={save} className="form"><label className="form-label">Display name<input className="input" value={name} maxLength={70} onChange={e=>setName(e.target.value)} required/></label>
     <button className="button" type="submit" disabled={signedIn}>Save name</button></form>
     {signedIn&&<p className="muted tiny">Your registered profile is managed on the server. Editing will be available after the account API is implemented.</p>}
   </section>
   <section className="surface-card settings-section"><h2><Palette size={19}/> Appearance</h2>
    <label className="form-label">Theme<select className="select" value={state.theme} onChange={e=>{patch("theme",e.target.value as Theme);setMessage("Theme updated");}}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
   </section>
   <section className="surface-card settings-section settings-access"><h2><ShieldCheck size={19}/> Privacy & access</h2>
    <p className="muted">{signedIn?"Account access is protected by a short-lived HttpOnly cookie.":"Guest data stays in this browser."}</p>
    <div className="settings-links"><a href="#/privacy">Privacy policy</a><a href="#/terms">Terms of service</a></div>
    {!signedIn&&<button className="button" onClick={()=>{if(confirm("Reset your local guest workspace?")){reset();setName("");setMessage("Guest workspace reset");}}}>Reset guest data</button>}
    <button className="button" onClick={()=>window.dispatchEvent(new Event("lifeorbit:logout"))}><LogOut size={16}/> Sign out</button>
   </section>
  </div><p className="feedback-line" role="status">{message}</p>
 </div>;
}
