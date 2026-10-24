import { useEffect, useRef, useState, type ComponentType } from "react";
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
  const [logoutError, setLogoutError] = useState("");
  const signingOut = useRef(false);
  const { state, patch, workspaceStatus, workspaceError, restoreWorkspace } = useApp();
  const patchRef = useRef(patch);
  patchRef.current = patch;
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    let alive = true;
    const navigate = () => setRoute(routeFromHash());
    const enter = () => { setSignedIn(hasSession()); setIntro(true); location.hash = "#/dashboard"; };
    const logout = async () => {
      if (signingOut.current) return;
      signingOut.current = true;
      setLogoutError("");
      try {
        await signOut();
        clearSession();
        sessionStorage.removeItem("lifeorbit_guest");
        setSignedIn(false); setIntro(false); patchRef.current("account", "");
        window.dispatchEvent(new Event("lifeorbit:logout-complete"));
        location.hash = "#/login"; setRoute("login");
      } catch (error) {
        setLogoutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
      } finally {
        signingOut.current = false;
      }
    };
    const authExpired = () => {
      setSignedIn(false); setIntro(false); sessionStorage.removeItem("lifeorbit_guest");
      location.hash = "#/login"; setRoute("login");
    };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("lifeorbit:auth", enter);
    window.addEventListener("lifeorbit:logout", logout);
    window.addEventListener("lifeorbit:auth-expired", authExpired);
    restoreSession().then(user => {
      if (!alive) return;
      setSignedIn(Boolean(user));
      if (user) { patchRef.current("account", user.name); window.dispatchEvent(new Event("lifeorbit:restore")); }
      setReady(true);
    });
    return () => {
      alive = false;
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("lifeorbit:auth", enter);
      window.removeEventListener("lifeorbit:logout", logout);
      window.removeEventListener("lifeorbit:auth-expired", authExpired);
    };
  }, []);

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
  if (!signedIn && !guestMode()) return <Layout section="login" dark={dark}><Login/></Layout>;
  if (route === "login") return <Layout section="login" dark={dark}><Login/></Layout>;
  if (route === "not-found") return <NotFound />;
  if (signedIn && (workspaceStatus !== "ready")) return <Layout section={route} dark={dark}>
    <section className="work-page" role={workspaceStatus === "error" ? undefined : "status"}>
      <h1>{workspaceStatus === "error" ? "Your data could not be loaded." : "Preparing your day…"}</h1>
      {(workspaceStatus === "error") && <><p className="auth-error" role="alert">{workspaceError}</p><button className="button primary" onClick={() => {restoreWorkspace();}}>Try again</button></>}
    </section>
  </Layout>;
  const Page = pages[route];
  return <Layout section={route} dark={dark}>
    {logoutError && <p className="auth-error" role="alert">Sign out failed: {logoutError} <button className="text-button" onClick={() => window.dispatchEvent(new Event("lifeorbit:logout"))}>Try again</button></p>}
    <div className="page-enter" key={route}><Page /></div>
  </Layout>;
}
