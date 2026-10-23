import { useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";

// This screen intentionally doesn't pretend to authenticate anyone yet.
export default function Login() {
  const { patch } = useApp();
  const [name, setName] = useState("");
  function enter(e: FormEvent) {
    e.preventDefault();
    patch("account", name.trim() || "Guest");
    location.hash = "#/dashboard";
  }
  return <main className="login-screen"><div className="login-layout"><section className="login-intro"><a className="brand" href="#/dashboard"><img src="/assets/icon.svg" alt="" />LifeOrbit</a><div><span className="login-kicker">A little more room to live.</span><h1>Everything you need.<br/>Nothing you don’t.</h1><p>Plan the day, remember the important things, and keep life moving.</p></div><small>Made for everyday life.</small></section><section className="login-form-side"><div className="login-panel"><h2>Welcome to LifeOrbit</h2><p>Start with the demo while we build secure accounts.</p><form className="form" onSubmit={enter}><label className="form-label">Your name<input className="input" value={name} maxLength={50} onChange={e=>setName(e.target.value)} placeholder="What should we call you?"/></label><button className="button primary login-submit">Continue <ArrowRight size={18}/></button></form><a className="demo-link" href="#/dashboard">Explore without signing in <ArrowRight size={15}/></a><div className="login-disclaimer"><ShieldCheck size={16}/><span>Demo only. No account is created and nothing is synced.</span></div></div></section></div></main>;
}
