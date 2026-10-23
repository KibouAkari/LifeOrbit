import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";

// This is a friendly demo entrance, not authentication.
export default function Login() {
  const { patch } = useApp();
  const [name, setName] = useState("");
  function enter(e?: FormEvent) {
    e?.preventDefault();
    patch("account", name.trim() || "Guest");
    window.dispatchEvent(new Event("lifeorbit:enter"));
  }
  return <main className="login-screen"><div className="login-layout"><section className="login-intro"><div className="brand"><img src="/assets/icon.svg" alt=""/>LifeOrbital</div><div><h1>Life, a little more organised.</h1><p>Your plans, notes and everyday wins in one lovely place.</p></div><small>One place. A clearer day.</small></section><section className="login-form-side"><div className="login-panel"><h2>Welcome in.</h2><p>Make yourself at home.</p><form className="form" onSubmit={enter}><label className="form-label">Your name<input className="input" value={name} maxLength={50} onChange={e=>setName(e.target.value)} placeholder="What should we call you?"/></label><button className="button primary login-submit">Enter LifeOrbit <ArrowRight size={18}/></button></form><button type="button" className="demo-link demo-button" onClick={() => enter()}>Continue as guest <ArrowRight size={16}/></button><p className="login-disclaimer">This is a local demo. Real accounts will arrive with the Python backend.</p></div></section></div></main>;
}
