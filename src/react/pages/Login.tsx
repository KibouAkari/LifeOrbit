import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Mail } from "lucide-react";
import { exchangeGoogleCredential, loginAccount, registerAccount, saveSession, type AuthResponse } from "../data/api";
import { useApp } from "../context/AppContext";

declare global {
 interface Window { google?:{accounts:{id:{
   initialize:(options:{client_id:string;callback:(reply:{credential:string})=>void})=>void;
   renderButton:(node:HTMLElement,options:Record<string,string>)=>void;
 }}}}
}
export default function Login(){
 const {patch}=useApp();
 const [emailVisible,setEmailVisible]=useState(false);
 const [mode,setMode]=useState<"login"|"register">("login");
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const googleButton=useRef<HTMLDivElement>(null);
 const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID as string|undefined;

 function complete(result:AuthResponse){
   saveSession("");
   sessionStorage.removeItem("lifeorbit_guest");
   patch("account",result.user.name);
   window.dispatchEvent(new Event("lifeorbit:auth"));
 }

 useEffect(()=>{
   if(!clientId||!googleButton.current)return;
   let cancelled=false;
   const script=document.createElement("script");
   script.src="https://accounts.google.com/gsi/client";
   script.async=true;
   script.onload=()=>{
     if(cancelled||!window.google||!googleButton.current)return;
     window.google.accounts.id.initialize({client_id:clientId,callback:async ({credential})=>{
       setBusy(true);setError("");
       try{complete(await exchangeGoogleCredential(credential));}
       catch(err){setError(err instanceof Error?err.message:"Google sign-in failed.");}
       finally{setBusy(false);}
     }});
     window.google.accounts.id.renderButton(googleButton.current,{theme:"outline",size:"large",width:"310",text:"continue_with",shape:"pill"});
   };
   script.onerror=()=>setError("Google sign-in could not load. Check browser privacy settings or allowed origins.");
   document.head.appendChild(script);
   return()=>{cancelled=true;script.remove();};
 },[clientId,patch,emailVisible]);

 async function submit(e:FormEvent){
   e.preventDefault();setError("");setBusy(true);
   try{
     const result=mode==="register"
       ?await registerAccount(name.trim(),email.trim(),password)
       :await loginAccount(email.trim(),password);
     complete(result);
   }catch(err){setError(err instanceof Error?err.message:"Unable to sign in.");}
   finally{setBusy(false);}
 }


 return <main className="login-screen"><div className="login-layout">
   <section className="login-intro">
     <a className="brand" href="#/login">LifeOrbital</a>
     <div><h1>A little more room<br/>for life.</h1><p>Keep the important things together, without the clutter.</p></div>
     
   </section>
   <section className="login-form-side"><div className="login-panel login-refined">
     <img className="login-mark" src="/assets/icon.svg" alt="LifeOrbital planet icon"/>
     <h2>{emailVisible?(mode==="register"?"Create your space.":"Welcome back."):"Everything in its place."}</h2>
     <p>{emailVisible?"A few details and you're in.":"Get organised, stay on track and enjoy the little wins."}</p>
     {!emailVisible?<div className="login-primary-choices">
       <div className="google-button" ref={googleButton}/>
       <button className="button login-email-choice" type="button" onClick={()=>setEmailVisible(true)}><Mail size={17}/> Continue with email <ArrowRight size={16}/></button>
     </div>:<>
       <div className="auth-switch" aria-label="Account action">
         <button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");}}>Sign in</button>
         <button type="button" className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("");}}>Create account</button>
       </div>
       <form className="form" onSubmit={submit}>
         {mode==="register"&&<label className="form-label">Name<input className="input" autoComplete="name" minLength={2} maxLength={70} required value={name} onChange={e=>setName(e.target.value)}/></label>}
         <label className="form-label">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
         <label className="form-label">Password<div className="password-field"><input className="input" type={showPassword?"text":"password"} minLength={mode==="register"?12:1} maxLength={72} autoComplete={mode==="register"?"new-password":"current-password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="register"?"At least 12 characters":""}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
         <button className="button primary login-submit" disabled={busy}>{busy?"Working…":mode==="register"?"Create account":"Sign in"}<ArrowRight size={17}/></button>
       </form>
       <button className="login-back" type="button" onClick={()=>{setEmailVisible(false);setError("");}}>Other sign-in options</button>
     </>}
     {!clientId&&!emailVisible&&<p className="auth-hint">Google login is temporarily unavailable.</p>}
     {error&&<p className="auth-error" role="alert">{error}</p>}
     <div className="auth-legal">By continuing you agree to our <a href="#/terms">Terms</a> and acknowledge our <a href="#/privacy">Privacy Policy</a>.</div>
   </div></section>
 </div></main>;
}
