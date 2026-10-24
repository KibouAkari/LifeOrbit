import { useState, type ReactNode } from "react";
import { LayoutGrid, NotebookPen, CheckCheck, CalendarDays, WalletCards, Target, Settings2, Sun, Moon, Menu, X } from "lucide-react";
import { useFriends } from "./FriendsPanel";
import { useApp } from "../context/AppContext";
import type { Section } from "../types";

const navigation = [
  ["dashboard", "Dashboard", LayoutGrid],
  ["tasks", "Tasks", CheckCheck],
  ["calendar", "Calendar", CalendarDays],
  ["notes", "Notes", NotebookPen],
  ["subscriptions", "Subscriptions", WalletCards],
  ["challenges", "Challenges", Target],
] as const;

export function Layout({ section, dark, children }: { section: Section; dark: boolean; children: ReactNode }) {
  const { state, patch } = useApp();
  const [open, setOpen] = useState(false);
  const {data:friendData}=useFriends();
  if (section === "login") return <>{children}</>;
  return <div className={`shell ${open ? "menu-open" : ""}`}>
    {open && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside className="sidebar" aria-label="Main navigation">
      <a className="brand" href="#/dashboard" onClick={() => setOpen(false)}><img src="/assets/icon.svg" alt=""/>LifeOrbital</a>
      <nav className="nav nav-group" aria-label="Main menu">
        {navigation.map(([key, label, Icon]) => <a key={key} className="nav-link" href={`#/${key}`} aria-current={section === key ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={19} strokeWidth={1.8}/>{label}</a>)}
      </nav>
      <div className="sidebar-bottom"><a className="nav-link" href="#/settings" aria-current={section === "settings" ? "page" : undefined} onClick={() => setOpen(false)}><Settings2 size={19}/>Settings{friendData.pending_count>0&&<span className="notification-dot" aria-label={`${friendData.pending_count} friend requests`}>{friendData.pending_count}</span>}</a><a className="sidebar-account" href="#/settings" onClick={() => setOpen(false)}><span className="avatar">{(state.account || "G").charAt(0).toUpperCase()}</span><span><strong>{state.account || "Guest"}</strong><small>Personal space</small></span></a></div>
    </aside>
    <main className="main"><header className="topbar"><div className="actions"><button className="icon-button mobile-menu" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open?<X size={19}/>:<Menu size={19}/>}</button></div><div className="actions"><button className="icon-button" aria-label={dark?"Light mode":"Dark mode"} onClick={() => patch("theme",dark?"light":"dark")}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><a className="top-avatar" href="#/settings" aria-label="Account">{(state.account||"G").charAt(0).toUpperCase()}</a></div></header>{children}</main>
  </div>;
}
