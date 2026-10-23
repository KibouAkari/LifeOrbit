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

// Routes remain small and explicit while the app has only a handful of screens.
const pages: Record<Section, ComponentType> = {
  dashboard: Dashboard, notes: Notes, tasks: Tasks, calendar: Calendar,
  subscriptions: Subscriptions, challenges: Challenges, settings: Settings, login: Login,
};
type Route = Section | "not-found";
function currentRoute(): Route {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0] || "dashboard";
  return Object.prototype.hasOwnProperty.call(pages, route) ? route as Section : "not-found";
}
export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const { state } = useApp();
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const handle = () => setSystemDark(media.matches);
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);
  const dark = state.theme === "dark" || (state.theme === "system" && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#18191c" : "#f8f8fa");
  }, [dark]);
  if (route === "not-found") return <NotFound />;
  const Page = pages[route];
  return <Layout section={route} dark={dark}><div className="page-enter" key={route}><Page /></div></Layout>;
}
