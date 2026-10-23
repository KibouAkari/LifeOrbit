import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, NotebookPen, ListTodo, CalendarDays, CreditCard, Trophy, Settings, Sun, Moon, Menu, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { Section } from "../types";
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard], ["notes", "Notes", NotebookPen], ["tasks", "Planner", ListTodo],
  ["calendar", "Calendar", CalendarDays], ["subscriptions", "Subscriptions", CreditCard], ["challenges", "Challenges", Trophy],
] as const;
export function Layout({ section, children }: { section: Section; children: ReactNode }) {
  const { state, patch } = useApp(); const [open, setOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { const media = matchMedia("(prefers-color-scheme: dark)"); const change = () => setSystemDark(media.matches); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  const dark = state.theme === "dark" || (state.theme === "system" && systemDark);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#151b19" : "#f7f8f6"); }, [dark]);
  if (section === "login") return <>{children}</>;
  return <div className={`shell ${open ? "menu-open" : ""}`}>
    <aside className="sidebar" aria-label="Primary navigation">
      <a className="brand" href="#/dashboard" onClick={() => setOpen(false)}><img src="/assets/icon.svg" alt="" />LifeOrbit</a>
      <div><div className="section-label">Workspace</div><nav className="nav" aria-label="Main menu">
        {nav.map(([key, label, Icon]) => <a key={key} href={`#/${key}`} onClick={() => setOpen(false)} className="nav-link" aria-current={section === key ? "page" : undefined}><Icon size={18}/>{label}</a>)}
      </nav></div>
      <div className="sidebar-bottom"><div className="small-note"><strong>Make room for life.</strong>One peaceful space for the little things that matter.</div>
        <a className="nav-link" href="#/settings" aria-current={section === "settings" ? "page" : undefined} onClick={() => setOpen(false)}><Settings size={18}/>Settings</a>
        <a className="sidebar-account" href="#/settings"><span className="avatar">{(state.account || "D").charAt(0).toUpperCase()}</span><span><strong>{state.account || "Demo account"}</strong><small>Local demo</small></span></a>
      </div>
    </aside>
    <main className="main"><header className="topbar"><div className="actions"><button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Menu size={18}/></button><span className="breadcrumbs">Workspace / {section.charAt(0).toUpperCase() + section.slice(1)}</span></div>
      <div className="actions"><button className="icon-button" title="Toggle theme" aria-label="Toggle dark mode" onClick={() => patch("theme", dark ? "light" : "dark")}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><a href="#/settings" className="icon-button" aria-label="Account settings"><UserRound size={18}/></a></div></header>
      {children}<footer className="footer">LifeOrbit · Hackathon prototype · Your day, in a better orbit.</footer></main>
  </div>;
}
