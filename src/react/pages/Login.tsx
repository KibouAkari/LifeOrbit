import { useEffect,useRef,useState,type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { exchangeGoogleCredential,loginAccount,registerAccount,saveSession,type AuthResponse } from "../data/api";
import { useApp } from "../context/AppContext";
declare global {
  interface Window { google?:{accounts:{id:{
    initialize:(options:{client_id:string;callback:(reply:{credential:string})=>void})=>void;
    renderButton:(node:HTMLElement,options:Record<string,string>)=>void;
  }}} }
}
export default function Login(){
  const {patch}=useApp();
  const [mode,setMode]=useState<"login"|"register">("login");
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const googleButton=useRef<HTMLDivElement>(null);
  const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID as string|undefined;
  function complete(result:AuthResponse){
    saveSession("");sessionStorage.removeItem("lifeorbit_guest");
    patch("account",result.user.name);
    window.dispatchEvent(new Event("lifeorbit:auth"));
  }
  useEffect(()=>{
    if(!clientId||!googleButton.current)return;
    let cancelled=false;
    const script=document.createElement("script");
    script.src="https://accounts.google.com/gsi/client";script.async=true;
    script.onload=()=>{
      if(cancelled||!window.google||!googleButton.current)return;
      window.google.accounts.id.initialize({client_id:clientId,callback:async ({credential})=>{
        setBusy(true);setError("");
        try{complete(await exchangeGoogleCredential(credential));}
        catch(e){setError(e instanceof Error?e.message:"Google sign-in failed.");}
        finally{setBusy(false);}
      }});
      window.google.accounts.id.renderButton(googleButton.current,{theme:"outline",size:"large",width:"310",text:"continue_with"});
    };
    script.onerror=()=>setError("Google sign-in could not load. Check browser protection and allowed origins.");
    document.head.appendChild(script);
    return()=>{cancelled=true;script.remove();};
  },[clientId,patch]);
  async function submit(e:FormEvent){
    e.preventDefault();setError("");setBusy(true);
    try{const result=mode==="register"?await registerAccount(name.trim(),email.trim(),password):await loginAccount(email.trim(),password);complete(result);}
    catch(e){setError(e instanceof Error?e.message:"Unable to sign in.");}
    finally{setBusy(false);}
  }
  function guest(){sessionStorage.setItem("lifeorbit_guest","true");patch("account","Guest");window.dispatchEvent(new Event("lifeorbit:auth"));}
  return <main className="login-screen"><div className="login-layout">
    <section className="login-intro"><a className="brand" href="#/login"><img src="/assets/icon.svg" alt=""/>LifeOrbital</a><div><h1>Less organising.<br/>More living.</h1><p>Everything important to your day, beautifully in one place.</p></div><small>Plan a little. Live a lot.</small></section>
    <section className="login-form-side"><div className="login-panel">
      <div className="auth-switch" aria-label="Account action"><button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");}}>Sign in</button><button type="button" className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("");}}>Create account</button></div>
      <h2>{mode==="register"?"Create your account.":"Welcome back."}</h2><p>{mode==="register"?"Your space starts here.":"Good to have you here again."}</p>
      <form className="form" onSubmit={submit}>
        {mode==="register"&&<label className="form-label">Name<input className="input" required minLength={2} maxLength={70} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}
        <label className="form-label">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label className="form-label">Password<div className="password-field"><input className="input" type={showPassword?"text":"password"} required minLength={mode==="register"?12:1} maxLength={72} autoComplete={mode==="register"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="register"?"At least 12 characters":""}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
        <button className="button primary login-submit" disabled={busy}>{busy?"Working…":mode==="register"?"Create account":"Sign in"}<ArrowRight size={17}/></button>
      </form>
      <div className="auth-divider"><span>or continue with</span></div><div className="google-button" ref={googleButton}/>
      {!clientId&&<p className="auth-hint">Google sign-in is not configured for this frontend build. Set VITE_GOOGLE_CLIENT_ID in the frontend Vercel project and redeploy.</p>}
      {error&&<p className="auth-error" role="alert">{error}</p>}
      <button className="demo-link demo-button" onClick={guest}>Explore as guest <ArrowRight size={16}/></button>
      <div className="auth-legal">By creating an account, you agree to the <a href="#/terms">Terms</a> and acknowledge the <a href="#/privacy">Privacy Policy</a>.</div>
    </div></section></div></main>;
}
