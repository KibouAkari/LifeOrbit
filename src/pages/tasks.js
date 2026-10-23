// Tasks page: own task functionality only. Shared shell/theme live in main.js.
import {read,insert,remove,update} from '../data.js';
import {escapeHtml,formValue,icon} from '../lib.js';
export function render() {
 const tasks=read('tasks');const count=tasks.filter(x=>!x.done).length;
 return `<div class="page-header"><div><div class="eyebrow">STAY ON TRACK</div><h1>Tasks</h1><p>One thing at a time is enough.</p></div></div>
 <section class="panel"><form id="task-form" class="inline-form"><input aria-label="Task title" name="title" placeholder="What needs doing?" maxlength="120" required><input aria-label="Due date" name="due" type="date"><button class="button primary" type="submit">${icon('plus',17)} Add task</button></form></section>
 <section class="panel"><div class="panel-head"><h2>To do <span class="count">${count}</span></h2></div>
 ${tasks.length?tasks.map(t=>`<div class="task-row ${t.done?'completed':''}"><label class="task-check"><input type="checkbox" data-toggle="${t.id}" ${t.done?'checked':''}><span>${escapeHtml(t.title)}</span></label><div class="task-end"><small>${escapeHtml(t.due||'No due date')}</small><button class="icon-button" aria-label="Delete task" data-delete="${t.id}">×</button></div></div>`).join(''):'<p class="hint">No tasks yet. Your next step starts above.</p>'}</section>`;
}
export function mount(root) {
 root.querySelector('#task-form').addEventListener('submit',e=>{e.preventDefault();const title=formValue(e.target,'title');if(title)insert('tasks',{title,due:formValue(e.target,'due'),done:false});});
 root.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('change',()=>update('tasks',el.dataset.toggle,{done:el.checked})));
 root.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',()=>remove('tasks',el.dataset.delete)));
}
