import { useEffect, useState, type ComponentType } from "react";
import { Layout } from "./components/Layout";
import { useApp } from "./context/AppContext";
import { clearSession, hasSession, signOut } from "./data/api";
import { restoreSession } from "./services/session";
import type { Section } from "./types";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import Subscriptions from "./pages/Subscriptions";
import Challenges from "./pages/Challenges";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { WelcomeIntro } from "./components/WelcomeIntro";
import Legal from "./pages/Legal";

const pages: Record<Section, ComponentType> = {
  dashboard: Dashboard, notes: Notes, tasks: Tasks, calendar: Calendar,
  subscriptions: Subscriptions, challenges: Challenges, settings: Settings, login: Login,
};
type Route = Section | "not-found" | "privacy" | "terms";
const routeFromHash = (): Route => {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0] || "login";
  if (route === "privacy" || route === "terms") return route;
  return Object.prototype.hasOwnProperty.call(pages, route) ? route as Section : "not-found";
};
const guestMode = () => sessionStorage.getItem("lifeorbit_guest") === "true";

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [intro, setIntro] = useState(false);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { state, patch, workspaceReady, workspaceError } = useApp();
  const [logoutError,setLogoutError]=useState("");
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    let alive = true;
    const navigate = () => setRoute(routeFromHash());
    const enter = () => { setSignedIn(hasSession()); setIntro(true); location.hash = "#/dashboard"; };
    const leaveAccount = () => {
      clearSession(); sessionStorage.removeItem("lifeorbit_guest");
      setSignedIn(false); setIntro(false); setLogoutError(""); patch("account", "");
      window.dispatchEvent(new Event("lifeorbit:logout-complete"));
      location.hash = "#/login"; setRoute("login");
    };
    const logout = async () => {
      setLogoutError("");
      try { await signOut(); leaveAccount(); }
      catch { setLogoutError("Unable to sign out. Please try again."); }
    };
    const sessionExpired = () => leaveAccount();
    window.addEventListener("hashchange", navigate);
    window.addEventListener("lifeorbit:auth", enter);
    window.addEventListener("lifeorbit:logout", logout);
    window.addEventListener("lifeorbit:session-expired", sessionExpired);
    restoreSession().then(user => {
      if (!alive) return;
      setSignedIn(Boolean(user));
      if (user) { patch("account", user.name); window.dispatchEvent(new Event("lifeorbit:restore")); }
      setReady(true);
    });
    return () => {
      alive = false;
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("lifeorbit:auth", enter);
      window.removeEventListener("lifeorbit:logout", logout);
      window.removeEventListener("lifeorbit:session-expired", sessionExpired);
    };
  }, [patch]);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dark = state.theme === "dark" || (state.theme === "system" && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#18191c" : "#f8f8fa");
  }, [dark]);
  if (!ready) return <div className="boot-screen" role="status">Opening LifeOrbital…</div>;
  if (intro) return <WelcomeIntro onComplete={() => setIntro(false)} />;
  if (route === "privacy" || route === "terms") return <Legal kind={route}/>;
  if (signedIn && !workspaceReady) return <div className="boot-screen" role="status">
    {workspaceError ? <><p>{workspaceError}</p><button className="button" onClick={() => window.dispatchEvent(new Event("lifeorbit:restore"))}>Retry loading workspace</button></> : "Loading your workspace…"}
  </div>;
  if (!signedIn && !guestMode()) return <Layout section="login" dark={dark}><Login/></Layout>;
  if (route === "login") return <Layout section="login" dark={dark}><Login/></Layout>;
  if (route === "not-found") return <NotFound />;
  const Page = pages[route];
  return <>
    <Layout section={route} dark={dark}><div className="page-enter" key={route}><Page /></div></Layout>
    {logoutError&&<div className="auth-error" role="alert">{logoutError} <button className="text-button" onClick={() => window.dispatchEvent(new Event("lifeorbit:logout"))}>Try again</button></div>}
  </>;
}
