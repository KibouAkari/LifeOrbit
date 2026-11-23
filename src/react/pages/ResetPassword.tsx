import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { request } from "../data/api";

export default function ResetPassword() {
  const [token] = useState(() => {
    const query = location.hash.split("?")[1] || "";
    return new URLSearchParams(query).get("token") || "";
  });
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [show,setShow] = useState(false);
  const [busy,setBusy] = useState(false);
  const [complete,setComplete] = useState(false);
  const [error,setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match."); return;
    }
    setBusy(true);
    try {
      await request<{updated: boolean}>("/auth/password/reset", {
        method: "POST", body: JSON.stringify({token,new_password:password}),
      });
      setPassword("");setConfirm("");setComplete(true);
      // Remove the single-use secret from browser history after consumption.
      history.replaceState(null, "", location.pathname + location.search + "#/reset-password");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to reset password");
    } finally { setBusy(false); }
  }
  return <main className="login-screen"><div className="login-form-side">
    <div className="login-panel login-refined">
      <img className="login-mark" src="/assets/icon.svg" alt="LifeOrbit"/>
      <h2>Choose a new password</h2>
      {complete ? <>
        <p role="status">Your password was updated. Sessions on other devices have been signed out.</p>
        <a href="#/login" className="button primary login-submit">Sign in <ArrowRight size={16}/></a>
      </> : !token ? <>
        <p className="auth-error" role="alert">Reset link is missing or invalid.</p>
        <a className="login-back" href="#/forgot-password">Request a new link</a>
      </> : <>
        <p>Use at least 12 characters. The link works only once.</p>
        <form className="form" onSubmit={submit}>
          <label className="form-label">New password
            <div className="password-field">
              <input className="input" type={show?"text":"password"}
                autoComplete="new-password" minLength={12} maxLength={72}
                required value={password}
                onChange={event=>setPassword(event.target.value)}/>
              <button type="button" aria-label={show?"Hide password":"Show password"}
                onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </label>
          <label className="form-label">Confirm password
            <input className="input" type={show?"text":"password"}
              autoComplete="new-password" minLength={12} maxLength={72}
              required value={confirm} onChange={event=>setConfirm(event.target.value)}/>
          </label>
          <button className="button primary login-submit" disabled={busy}>
            {busy?"Updating…":"Reset password"}<ArrowRight size={16}/>
          </button>
        </form>
        {error&&<p className="auth-error" role="alert">{error}</p>}
      </>}
      <a className="login-back" href="#/login">Back to sign in</a>
    </div>
  </div></main>;
}
