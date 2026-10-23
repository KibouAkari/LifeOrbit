import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { exchangeGoogleCredential, saveSession } from "../data/api";
import { useApp } from "../context/AppContext";

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (config: { client_id: string; callback: (response: {credential: string}) => void }) => void;
      renderButton: (el: HTMLElement, options: Record<string, string>) => void;
    } } };
  }
}

export default function Login() {
  const { patch } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const button = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !button.current) return;
    let cancelled = false;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (cancelled || !window.google || !button.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setBusy(true); setError("");
          try {
            const result = await exchangeGoogleCredential(credential);
            saveSession(result.access_token);
            patch("account", result.user.name);
            sessionStorage.removeItem("lifeorbit_guest");
            window.dispatchEvent(new CustomEvent("lifeorbit:auth"));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed.");
          } finally { setBusy(false); }
        },
      });
      window.google.accounts.id.renderButton(button.current, { theme: "outline", size: "large", width: "310", text: "continue_with" });
    };
    script.onerror = () => setError("Google sign-in could not be loaded.");
    document.head.appendChild(script);
    return () => { cancelled = true; script.remove(); };
  }, [clientId, patch]);

  function guest() {
    sessionStorage.setItem("lifeorbit_guest", "true");
    patch("account", "Guest");
    window.dispatchEvent(new CustomEvent("lifeorbit:auth"));
  }

  return <main className="login-screen"><div className="login-layout">
    <section className="login-intro"><div className="brand"><img src="/assets/icon.svg" alt=""/>LifeOrbital</div><div><h1>Make room for living.</h1><p>Tasks, notes, your schedule and little wins. All in one place.</p></div><small>Designed for a clearer day.</small></section>
    <section className="login-form-side"><div className="login-panel">
      <h2>Welcome back.</h2><p>Sign in to keep your day together.</p>
      <div ref={button} aria-label="Sign in with Google" />
      {!clientId && <p className="muted tiny">Google sign-in needs its client ID configured.</p>}
      {busy && <p role="status">Signing in securely…</p>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button type="button" className="demo-link demo-button" onClick={guest}>Explore as guest <ArrowRight size={16}/></button>
      <p className="login-disclaimer">Guest changes stay in this browser. Google sign-in requires the configured Python API.</p>
    </div></section>
  </div></main>;
}
