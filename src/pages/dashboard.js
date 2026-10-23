// Dashboard: compose shared UI and data selectors; do not duplicate sidebar or theme logic.
import {read} from '../data.js';
import {panel,escapeHtml,prettyDate,icon,empty} from '../lib.js';
export function render() {
 const tasks=read('tasks'),events=read('events'),notes=read('notes'),subs=read('subscriptions'),ch=read('challenges');
 const open=tasks.filter(t=>!t.done);
 return `<div class="intro"><div><div class="eyebrow">YOUR SPACE</div><h1>Make room for what matters.</h1><p>A clear view of your day, all in one place.</p></div><a class="button primary" href="#/tasks">${icon('plus',16)} Add a task</a></div>
 <div class="metrics">
   <a href="#/tasks" class="metric"><span>Open tasks</span><strong>${open.length}</strong><small>Things on your mind</small></a>
   <a href="#/calendar" class="metric"><span>Events</span><strong>${events.length}</strong><small>On your calendar</small></a>
   <a href="#/notes" class="metric"><span>Notes</span><strong>${notes.length}</strong><small>Ideas worth keeping</small></a>
   <a href="#/challenges" class="metric"><span>Challenges</span><strong>${ch.filter(x=>x.progress>=x.goal).length}/${ch.length}</strong><small>Completed goals</small></a>
 </div>
 <div class="split">
  ${panel('Coming up',events.length?events.slice(0,4).map(e=>`<div class="feed-row"><div class="date-chip">${escapeHtml(prettyDate(e.date))}</div><div><strong>${escapeHtml(e.title)}</strong><p>${escapeHtml(e.time||'All day')}</p></div></div>`).join(''):empty('◷','Nothing scheduled','Enjoy your open space.'),'<a class="subtle-link" href="#/calendar">View calendar →</a>')}
  ${panel('To do next',open.length?open.slice(0,5).map(t=>`<div class="feed-row"><span class="ring"></span><div><strong>${escapeHtml(t.title)}</strong><p>${escapeHtml(t.due?prettyDate(t.due):'Anytime')}</p></div></div>`).join(''):empty('✓','All caught up','Your task list is clear.'),'<a class="subtle-link" href="#/tasks">All tasks →</a>')}
  ${panel('Recent notes',notes.length?notes.slice(0,3).map(n=>`<a href="#/notes" class="list-line"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.updated)}</span></a>`).join(''):empty('✎','No notes yet','Capture your first idea.'))}
  ${panel('Subscriptions',subs.length?subs.slice(0,3).map(s=>`<div class="list-line"><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.currency)} ${Number(s.amount).toFixed(2)}</span></div>`).join(''):empty('◉','Nothing tracked','Add the plans you pay for.'))}
 </div>`;
}
