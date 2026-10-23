// Calendar: event CRUD demo; add day/week grid and timezone-aware recurrence here later.
import {read,insert,remove} from '../data.js';
import {escapeHtml,formValue,prettyDate,today,icon} from '../lib.js';
export function render(){
 const events=[...read('events')].sort((a,b)=>a.date.localeCompare(b.date));return `<div class="page-header"><div><div class="eyebrow">LOOKING AHEAD</div><h1>Calendar</h1><p>Keep track of what's coming up.</p></div></div>
 <div class="split"><section class="panel"><div class="panel-head"><h2>New event</h2></div><form class="stack-form" id="event-form"><label>Event name<input name="title" placeholder="Coffee with a friend" maxlength="100" required></label><label>Date<input name="date" type="date" value="${today()}" required></label><label>Time<input name="time" type="time"></label><button class="button primary" type="submit">${icon('plus',16)} Add event</button></form></section>
 <section class="panel"><div class="panel-head"><h2>Upcoming events</h2><span class="count">${events.length}</span></div>${events.length?events.map(e=>`<div class="feed-row"><div class="date-chip">${escapeHtml(prettyDate(e.date))}</div><div class="grow"><strong>${escapeHtml(e.title)}</strong><p>${escapeHtml(e.time||'All day')}</p></div><button class="icon-button" data-delete="${e.id}" aria-label="Delete event">×</button></div>`).join(''):'<p class="hint">Your calendar is clear.</p>'}<p class="helper">This demo starts with a simple event list. Day, week and month views are planned next.</p></section></div>`;
}
export function mount(root){
 root.querySelector('#event-form').addEventListener('submit',e=>{e.preventDefault();const title=formValue(e.target,'title'),date=formValue(e.target,'date');if(title&&date)insert('events',{title,date,time:formValue(e.target,'time')});});
 root.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',()=>remove('events',el.dataset.delete)));
}
