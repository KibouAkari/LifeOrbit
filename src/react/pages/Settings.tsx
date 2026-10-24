import { useEffect, useState, type FormEvent } from "react";
import { Download, LogOut, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { currentUser, hasSession, request, type SignedInUser } from "../data/api";
import { FriendsPanel } from "../components/FriendsPanel";
import { Heading } from "../components/UI";
import type { Theme } from "../types";

export default function Settings(){
 const {state,patch,reset}=useApp();
 const [user,setUser]=useState<SignedInUser|null>(null);
 const [name,setName]=useState(state.account);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [newEmail,setNewEmail]=useState("");
 const [currentPassword,setCurrentPassword]=useState("");
 const [passwordCurrentPassword,setPasswordCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const authenticated=hasSession();

 useEffect(()=>{
   if(authenticated)void currentUser().then(data=>{setUser(data);setName(data.name);setNewEmail(data.email)}).catch(()=>setMessage("Unable to load profile."));
 },[authenticated]);

 async function save(e:FormEvent){
   e.preventDefault();
   if(name.trim().length<2)return;
   setBusy(true);setMessage("");
   try{
     if(authenticated){
       const result=await request<SignedInUser>("/auth/me",{method:"PATCH",body:JSON.stringify({name:name.trim()})});
       setUser(result);patch("account",result.name);
     }else patch("account",name.trim());
     setMessage("Profile saved");
   }catch(err){setMessage(err instanceof Error?err.message:"Could not save profile");}
   finally{setBusy(false);}
 }

 async function exportData(){
   setBusy(true);setMessage("");
   try{
     const data=await request<unknown>("/auth/export");
     const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
     const url=URL.createObjectURL(blob);
     const link=document.createElement("a");
     link.href=url;link.download="lifeorbit-account-data.json";
     document.body.appendChild(link);link.click();link.remove();
     URL.revokeObjectURL(url);
     setMessage("Account export prepared");
   }catch(err){setMessage(err instanceof Error?err.message:"Export unavailable");}
   finally{setBusy(false);}
 }

 return <div className="work-page"><Heading title="Settings" description="Your account, your way."/>
  <div className="settings-clean">
   <section className="surface-card settings-profile">
     <div className="settings-portrait">{(user?.name||state.account||"G").slice(0,1).toUpperCase()}</div>
     <div><h2>{user?.name||state.account||"Guest"}</h2><p>{user?.email||(authenticated?"Account":"Guest workspace")}</p></div>
     <span className="settings-status">{authenticated?"Signed in":"Guest"}</span>
   </section>
   <section className="surface-card settings-section"><h2><UserRound size={19}/> Profile</h2>
     <form className="form" onSubmit={save}>
       <label className="form-label">Display name<input className="input" required minLength={2} maxLength={70} value={name} onChange={e=>setName(e.target.value)}/></label>
       <button className="button primary" disabled={busy||name.trim().length<2}>Save changes</button>
     </form>
   </section>
   {authenticated&&Boolean(user?.has_password)&&<section className="surface-card settings-section"><h2><ShieldCheck size={19}/> Login & security</h2>
      {user?.has_password&&<>
      <form className="form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");try{const updated=await request<SignedInUser>("/auth/email",{method:"PATCH",body:JSON.stringify({email:newEmail,password:currentPassword})});setUser(updated);setMessage("Email updated");setCurrentPassword("");}catch(err){setMessage(err instanceof Error?err.message:"Email change failed");}finally{setBusy(false)}}}>
        <label className="form-label">Email<input className="input" type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)}/></label>
        <label className="form-label">Current password<input className="input" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
        <button className="button" disabled={busy}>Update email</button>
      </form>
     <form className="form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");try{await request("/auth/password",{method:"PATCH",body:JSON.stringify({current_password:passwordCurrentPassword,new_password:newPassword})});setMessage("Password updated");setPasswordCurrentPassword("");setNewPassword("");}catch(err){setMessage(err instanceof Error?err.message:"Password change failed");}finally{setBusy(false)}}}>
       <label className="form-label">Current password<input className="input" type="password" autoComplete="current-password" required value={passwordCurrentPassword} onChange={e=>setPasswordCurrentPassword(e.target.value)}/></label>
       <label className="form-label">New password<input className="input" type="password" minLength={12} maxLength={72} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
       <button className="button" disabled={busy}>Change password</button>
     </form>
     </>}

   </section>}
   <section className="surface-card settings-section"><h2><Palette size={19}/> Appearance</h2>
     <label className="form-label">Theme<select className="select" value={state.theme} onChange={e=>{patch("theme",e.target.value as Theme);setMessage("Appearance updated");}}>
       <option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option>
     </select></label>
   </section>
   <FriendsPanel/>
   <section className="surface-card settings-section settings-access settings-compact">
     <h2><ShieldCheck size={19}/> Account & privacy</h2>
     <div className="settings-links"><a href="#/privacy">Privacy policy</a><a href="#/terms">Terms of service</a></div>
     <div className="actions">
       {authenticated&&<button className="button" disabled={busy} onClick={()=>void exportData()}><Download size={16}/> Export my data</button>}
       {!authenticated&&<button className="button" onClick={()=>{if(confirm("Reset all guest data on this device?")){reset();setName("");setMessage("Guest workspace reset");}}}>Reset guest data</button>}
       <button className="button" onClick={()=>window.dispatchEvent(new Event("lifeorbit:logout"))}><LogOut size={16}/> Sign out</button>
     </div>
   </section>
  </div><p className="feedback-line" role="status" aria-live="polite">{message}</p>
 </div>;
}
