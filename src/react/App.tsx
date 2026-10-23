import { useEffect, useState, type ComponentType } from "react";
import { Layout } from "./components/Layout";
import { useApp } from "./context/AppContext";
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

const pages: Record<Section, ComponentType> = {
  dashboard: Dashboard, notes: Notes, tasks: Tasks, calendar: Calendar,
  subscriptions: Subscriptions, challenges: Challenges, settings: Settings, login: Login,
};
type Route = Section | "not-found";
function routeFromHash(): Route {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0] || "login";
  return Object.prototype.hasOwnProperty.call(pages, route) ? route as Section : "not-found";
}
export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [intro, setIntro] = useState(false);
  const { state } = useApp();
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const navigate = () => {
      const next = routeFromHash();
      // A dashboard link is not a login. Only the login action starts the intro.
      setRoute(next);
    };
    const onEnter = () => {
      setIntro(true);
      location.hash = "#/dashboard";
    };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("lifeorbit:enter", onEnter);
    return () => {
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("lifeorbit:enter", onEnter);
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
  if (intro) return <WelcomeIntro onComplete={() => setIntro(false)} />;
  if (route === "not-found") return <NotFound />;
  const Page = pages[route];
  return <Layout section={route} dark={dark}><div className="page-enter" key={route}><Page /></div></Layout>;
}
