// Shared app shell. Do not rebuild navigation in page modules.
import { $,escapeHtml,icon,store } from './lib.js';
import {read} from './data.js';
import * as dashboard from './pages/dashboard.js';
import * as tasks from './pages/tasks.js';
import * as notes from './pages/notes.js';
import * as calendar from './pages/calendar.js';
import * as subscriptions from './pages/subscriptions.js';
import * as challenges from './pages/challenges.js';
import * as account from './pages/account.js';
import * as login from './pages/login.js';

const pages={dashboard,tasks,notes,calendar,subscriptions,challenges,account,login};
const nav=[
 ['dashboard','Overview','grid'],['notes','Notes','note'],['tasks','Planner','check'],
 ['calendar','Calendar','calendar'],['subscriptions','Subscriptions','wallet'],['challenges','Challenges','trophy']
];
let theme=store.get('theme',matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
function applyTheme(){document.documentElement.dataset.theme=theme;store.set('theme',theme);}
applyTheme();
function path(){const key=(location.hash.replace(/^#\/?/,'').split('/')[0]||'dashboard');return pages[key]?key:'dashboard';}
function shell(active){
 const a=read('account');return `<div class="layout">
 <aside class="sidebar" id="sidebar" aria-label="Main navigation">
 <a href="#/dashboard" class="brand"><img src="./assets/icon.svg" alt="" width="38" height="38"><span>life<span class="brand-accent">orbit</span><small>YOUR EVERYDAY SPACE</small></span></a>
 <div class="nav-label">WORKSPACE</div>
 <nav class="nav">${nav.map(([id,label,ico])=>`<a href="#/${id}" class="nav-link ${active===id?'active':''}" ${active===id?'aria-current="page"':''}>${icon(ico)}<span>${label}</span></a>`).join('')}</nav>
 <div class="sidebar-bottom"><div class="nav-label">PREFERENCES</div>
 <a href="#/account" class="nav-link ${active==='account'?'active':''}">${icon('settings')}<span>Settings</span></a>
 <button class="nav-link theme-switch" id="theme-toggle" type="button">${icon(theme==='dark'?'sun':'moon')}<span>${theme==='dark'?'Light mode':'Dark mode'}</span></button>
 <a href="#/account" class="profile"><div class="avatar">${escapeHtml(a.name.slice(0,1).toUpperCase())}</div><div class="profile-text"><strong>${escapeHtml(a.name)}</strong><small>Personal workspace</small></div><span class="profile-arrow">↗</span></a></div></aside>
 <div class="content"><header class="topbar"><button class="mobile-menu icon-button" id="mobile-menu" aria-label="Toggle navigation" aria-expanded="false">${icon('menu')}</button><div class="breadcrumb">Workspace <span>/</span> ${escapeHtml(nav.find(x=>x[0]===active)?.[1]||'Settings')}</div><span class="topbar-demo"><span class="demo-dot"></span> Local demo</span></header><main id="page" class="main" tabindex="-1"></main><footer class="footer">LifeOrbit <span>·</span> A little more room for life.</footer></div><div class="scrim" id="scrim"></div></div>`;
}
function render(){
 const current=path(),app=$('#app');app.innerHTML=current==='login'?login.render():shell(current);
 if(current==='login')return;
 const page=$('#page');page.innerHTML=pages[current].render();
 pages[current].mount?.(page);
 $('#theme-toggle').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';applyTheme();render();});
 const sidebar=$('#sidebar'),button=$('#mobile-menu'),scrim=$('#scrim');
 const close=()=>{sidebar.classList.remove('open');scrim.classList.remove('visible');button.setAttribute('aria-expanded','false');};
 button.addEventListener('click',()=>{const open=sidebar.classList.toggle('open');scrim.classList.toggle('visible',open);button.setAttribute('aria-expanded',String(open));});
 scrim.addEventListener('click',close);
 document.title=`LifeOrbit · ${nav.find(x=>x[0]===current)?.[1]||'Account'}`;
}
window.addEventListener('hashchange',render);
window.addEventListener('lifeorbit:data',render);
render();
