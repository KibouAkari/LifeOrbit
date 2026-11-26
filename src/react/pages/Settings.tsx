import { useEffect, useState, type FormEvent } from "react";
import { Download, LogOut, Mail, Palette, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { clearSession, currentUser, hasSession, request, type SignedInUser } from "../data/api";
import { FriendsPanel } from "../components/FriendsPanel";
import { Heading } from "../components/UI";
import type { Theme } from "../types";

export default function Settings(){
 const {state,patch,reset}=useApp();
 const [user,setUser]=useState<SignedInUser|null>(null);
 const [name,setName]=useState(state.account);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [passwordCurrentPassword,setPasswordCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const authenticated=hasSession();
 const [retention,setRetention]=useState<number|null>(null);
 const [privacyAvailable,setPrivacyAvailable]=useState(false);
 const [deleting,setDeleting]=useState(false);
 const [deletePassword,setDeletePassword]=useState("");
 const [deleteConfirmation,setDeleteConfirmation]=useState("");

 useEffect(()=>{
   if(authenticated)void currentUser().then(data=>{setUser(data);setName(data.name)}).catch(()=>setMessage("Unable to load profile."));
 },[authenticated]);
 useEffect(()=>{if(authenticated)void request<{days:number|null;available:boolean}>("/privacy/retention").then(data=>{setRetention(data.days);setPrivacyAvailable(data.available);}).catch(()=>setMessage("Could not load retention settings."));},[authenticated]);

 async function save(e:FormEvent){
   e.preventDefault();
   if(name.trim().length<2)return;
   setBusy(true);setMessage("");
   try{
     if(authenticated){
       const result=await request<SignedInUser>("/auth/me",{method:"PATCH",body:JSON.stringify({name:name.trim()})});
       setUser(result);patch("account",result.name);window.dispatchEvent(new Event("lifeorbit:profile-updated"));
     }else patch("account",name.trim());
     setMessage("Profile saved");
   }catch(err){setMessage(err instanceof Error?err.message:"Could not save profile");}
   finally{setBusy(false);}
 }

 async function resendWelcome(){
   if(!authenticated)return;
   setBusy(true);setMessage("");
   try{
     await request("/auth/welcome/resend",{method:"POST"});
     setMessage("Your welcome email was accepted by the mail provider. Check your inbox or spam folder. Delivery is not guaranteed.");
   }catch(err){setMessage(err instanceof Error?err.message:"Could not request a welcome email");}
   finally{setBusy(false);}
 }

 async function saveRetention(days:number|null){
   setBusy(true);setMessage("");
   try{const result=await request<{days:number|null}>("/privacy/retention",{method:"PATCH",body:JSON.stringify({days})});setRetention(result.days);setMessage("Data retention preference saved. Eligible older items will be removed during the next scheduled cleanup.");}
   catch(err){setMessage(err instanceof Error?err.message:"Could not save retention preference");}
   finally{setBusy(false);}
 }

 async function deleteAccount(){
   if(deleteConfirmation!=="DELETE")return;
   setBusy(true);setMessage("");
   try{
     await request("/privacy/account/delete",{method:"POST",body:JSON.stringify({confirmation:deleteConfirmation,current_password:user?.has_password?deletePassword:undefined})});
     setDeleting(false);setDeletePassword("");setDeleteConfirmation("");
     clearSession();
     window.dispatchEvent(new Event("lifeorbit:auth-expired"));
   }catch(err){setMessage(err instanceof Error?err.message:"Could not schedule deletion");}
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
      <p className="muted">Email changes are temporarily disabled until new email addresses can be verified.</p>
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
   {authenticated&&<section className="surface-card settings-section">
     <h2><ShieldCheck size={19}/> Data retention</h2>
     {!privacyAvailable&&<p className="muted" role="status">Automatic cleanup is not configured yet. These controls are unavailable until the privacy scheduler is enabled.</p>}
     <p className="muted">Automatically remove completed tasks and past calendar events after a chosen period. Open tasks, notes and upcoming events stay untouched. Existing accounts start with this turned off.</p>
     <label className="form-label">Delete completed tasks and past events after
       <select className="select" disabled={busy||!privacyAvailable} value={retention??"off"} onChange={e=>void saveRetention(e.target.value==="off"?null:Number(e.target.value))}>
         <option value="off">Off</option><option value="30">30 days</option><option value="15">15 days</option><option value="5">5 days</option>
       </select>
     </label>
     <p className="muted">Deleting older calendar entries also removes their invitations. Backups follow a separate retention policy.</p>
   </section>}
   {authenticated&&<section className="surface-card settings-section">
     <h2><Trash2 size={19}/> Delete account</h2>
     {!privacyAvailable&&<p className="muted" role="status">Account deletion requests are unavailable until the privacy scheduler is configured.</p>}
     <p className="muted">Your account will be disabled immediately and queued for permanent database deletion 30 days later. Export your data first. This cannot currently be cancelled in Settings.</p>
     {!deleting?<button className="button" disabled={busy||!privacyAvailable} type="button" onClick={()=>setDeleting(true)}>Request account deletion</button>:<div className="form">
       <label className="form-label">Type DELETE to confirm<input className="input" autoComplete="off" value={deleteConfirmation} onChange={e=>setDeleteConfirmation(e.target.value)}/></label>
       {user?.has_password&&<label className="form-label">Current password<input className="input" type="password" autoComplete="current-password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)}/></label>}
       <div className="actions"><button className="button" disabled={busy} onClick={()=>{setDeleting(false);setDeletePassword("");setDeleteConfirmation("");}}>Cancel</button><button className="button" disabled={busy||deleteConfirmation!=="DELETE"||(Boolean(user?.has_password)&&!deletePassword)} onClick={()=>void deleteAccount()}>Confirm account deletion</button></div>
     </div>}
   </section>}
   <FriendsPanel/>
   <section className="surface-card settings-section settings-access settings-compact">
     <h2><ShieldCheck size={19}/> Account & privacy</h2>
     <div className="settings-links"><a href="#/privacy">Privacy policy</a><a href="#/terms">Terms of service</a></div>
     <div className="actions">
       {authenticated&&<button className="button" disabled={busy} onClick={()=>void resendWelcome()}><Mail size={16}/> Resend welcome email</button>}
       {authenticated&&<button className="button" disabled={busy} onClick={()=>void exportData()}><Download size={16}/> Export my data</button>}
       {!authenticated&&<button className="button" onClick={()=>{if(confirm("Reset all guest data on this device?")){reset();setName("");setMessage("Guest workspace reset");}}}>Reset guest data</button>}
       <button className="button" onClick={()=>window.dispatchEvent(new Event("lifeorbit:logout"))}><LogOut size={16}/> Sign out</button>
     </div>
   </section>
  </div><p className="feedback-line" role="status" aria-live="polite">{message}</p>
 </div>;
}
