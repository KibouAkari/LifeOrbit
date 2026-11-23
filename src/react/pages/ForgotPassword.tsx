import { useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { request } from "../data/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setBusy(true);
    try {
      const result = await request<{message: string}>("/auth/password/forgot", {
        method: "POST", body: JSON.stringify({email}),
      });
      setNotice(result.message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to request reset");
    } finally { setBusy(false); }
  }
  return <main className="login-screen"><div className="login-form-side">
    <div className="login-panel login-refined">
      <img className="login-mark" src="/assets/icon.svg" alt="LifeOrbit"/>
      <h2>Forgot your password?</h2>
      <p>Enter your account email. If it has a password, we'll send a link that expires after 30 minutes.</p>
      {notice ? <p role="status" className="feedback-line">{notice}</p> :
      <form className="form" onSubmit={submit}>
        <label className="form-label">Email
          <input className="input" type="email" autoComplete="email" required
            value={email} onChange={event => setEmail(event.target.value)}/>
        </label>
        <button className="button primary login-submit" disabled={busy}>
          {busy ? "Sending…" : "Email me a reset link"}<Mail size={16}/>
        </button>
      </form>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <a className="login-back" href="#/login">Back to sign in <ArrowRight size={13}/></a>
    </div>
  </div></main>;
}
