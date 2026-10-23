// Shared shell owner: change navigation, theme and layout here — never clone them into pages.
import {get,update,escapeHTML} from "./state.js";
import {icon} from "./icons.js";
import * as dashboard from "./pages/dashboard.js";
import * as notes from "./pages/notes.js";
import * as tasks from "./pages/tasks.js";
import * as calendar from "./pages/calendar.js";
import * as subscriptions from "./pages/subscriptions.js";
import * as challenges from "./pages/challenges.js";
import * as settings from "./pages/settings.js";
import * as login from "./pages/login.js";
const pages={dashboard,notes,tasks,calendar,subscriptions,challenges,settings,login};
const links=[["dashboard","Dashboard","dashboard"],["notes","Notes","notes"],["tasks","Planner","tasks"],["calendar","Calendar","calendar"],["subscriptions","Subscriptions","subscriptions"],["challenges","Challenges","challenges"]];
function route(){const name=location.hash.replace(/^#\/?/,"").split("/")[0]||"dashboard";return pages[name]?name:"dashboard"}
function theme(){const preference=get().theme,actual=preference==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):preference;document.documentElement.dataset.theme=actual;document.querySelector('meta[name="theme-color"]').content=actual==="dark"?"#151b19":"#f7f8f6"}
export function render(){theme();const page=route(),module=pages[page],app=document.querySelector("#app");if(page==="login"){app.innerHTML=module.render();module.mount?.(render);return}
app.innerHTML=`<div class="shell" id="shell"><aside class="sidebar" aria-label="Primary navigation"><a class="brand" href="#/dashboard"><img src="./assets/icon.svg" alt="" />LifeOrbit</a><div><div class="section-label">Workspace</div><nav class="nav" aria-label="Main menu">${links.map(([key,label,glyph])=>`<a href="#/${key}" class="nav-link" ${page===key?'aria-current="page"':""}>${icon(glyph)}${label}</a>`).join("")}</nav></div><div class="sidebar-bottom"><div class="small-note"><strong>Make room for life.</strong>One peaceful space for the little things that matter.</div><a class="nav-link" href="#/settings" ${page==="settings"?'aria-current="page"':""}>${icon("settings")}Settings</a><a class="sidebar-account" href="#/settings"><span class="avatar">${escapeHTML((get().account||"D").slice(0,1).toUpperCase())}</span><span><strong>${escapeHTML(get().account||"Demo account")}</strong><small>Local demo</small></span></a></div></aside><main class="main"><header class="topbar"><div class="actions"><button id="menu-toggle" class="icon-button mobile-menu" aria-label="Open navigation" aria-expanded="false">${icon("menu")}</button><span class="breadcrumbs">Workspace / ${escapeHTML(page.charAt(0).toUpperCase()+page.slice(1))}</span></div><div class="actions"><button id="theme-toggle" class="icon-button" aria-label="Toggle dark mode" title="Toggle theme">${icon(document.documentElement.dataset.theme==="dark"?"sun":"moon")}</button><a href="#/settings" class="icon-button" aria-label="Account settings">${icon("user")}</a></div></header><div id="page-content">${module.render()}</div><footer class="footer">LifeOrbit · Hackathon prototype · Your day, in a better orbit.</footer></main></div>`;
document.querySelector("#theme-toggle")?.addEventListener("click",()=>{update("theme",document.documentElement.dataset.theme==="dark"?"light":"dark");render()});
document.querySelector("#menu-toggle")?.addEventListener("click",()=>{const el=document.querySelector("#shell"),open=el.classList.toggle("menu-open");document.querySelector("#menu-toggle").setAttribute("aria-expanded",open)});
module.mount?.(render)}
window.addEventListener("hashchange",render);
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if(get().theme==="system")render()});
render();
