import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, NotebookPen, CheckCheck, CalendarDays, WalletCards, Target, Settings2, Sun, Moon, Menu, CircleUserRound, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { Section } from "../types";

const navigation = [
  ["dashboard", "Overview", LayoutGrid],
  ["tasks", "Tasks", CheckCheck],
  ["calendar", "Calendar", CalendarDays],
  ["notes", "Notes", NotebookPen],
  ["subscriptions", "Subscriptions", WalletCards],
  ["challenges", "Challenges", Target],
] as const;

export function Layout({ section, children }: { section: Section; children: ReactNode }) {
  const { state, patch } = useApp();
  const [open, setOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
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

  if (section === "login") return <>{children}</>;

  return <div className={`shell ${open ? "menu-open" : ""}`}>
    {open && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside className="sidebar" aria-label="Main navigation">
      <a className="brand" href="#/dashboard" onClick={() => setOpen(false)}><img src="/assets/icon.svg" alt=""/>LifeOrbit</a>
      <div className="nav-group"><p className="section-label">Your space</p><nav className="nav" aria-label="Main menu">
        {navigation.map(([key, label, Icon]) => <a key={key} className="nav-link" href={`#/${key}`} aria-current={section === key ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={19} strokeWidth={1.8}/>{label}</a>)}
      </nav></div>
      <div className="sidebar-bottom">
        <a className="nav-link" href="#/settings" aria-current={section === "settings" ? "page" : undefined} onClick={() => setOpen(false)}><Settings2 size={19} strokeWidth={1.8}/>Settings</a>
        <a className="sidebar-account" href="#/settings" onClick={() => setOpen(false)}><span className="avatar">{(state.account || "G").charAt(0).toUpperCase()}</span><span><strong>{state.account || "Guest"}</strong><small>Demo workspace</small></span><CircleUserRound size={17}/></a>
      </div>
    </aside>
    <main className="main"><header className="topbar"><div className="actions"><button className="icon-button mobile-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button><span className="breadcrumbs">LifeOrbit <span className="breadcrumb-sep">/</span> {section === "dashboard" ? "Overview" : section[0].toUpperCase()+section.slice(1)}</span></div><div className="actions"><button className="icon-button" onClick={() => patch("theme", dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title="Change appearance">{dark ? <Sun size={19}/> : <Moon size={19}/>}</button><a href="#/settings" className="top-avatar" aria-label="Account settings">{(state.account || "G").charAt(0).toUpperCase()}</a></div></header>
      {children}<footer className="footer">LifeOrbit · A quieter way to stay on top of life.</footer></main>
  </div>;
}
