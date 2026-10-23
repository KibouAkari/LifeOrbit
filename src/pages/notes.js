// Notes page: extend here with attachments/rich text later; user input must be escaped.
import {read,insert,remove,update} from '../data.js';
import {escapeHtml,formValue,today,icon} from '../lib.js';
export function render(){
 const notes=read('notes');
 return `<div class="page-header"><div><div class="eyebrow">YOUR THOUGHTS</div><h1>Notes</h1><p>A home for the little things you don't want to forget.</p></div></div>
 <div class="split note-layout"><section class="panel"><div class="panel-head"><h2>Write something</h2></div><form id="note-form" class="stack-form"><label>Title<input name="title" placeholder="A little idea…" maxlength="100" required></label><label>Your note<textarea name="body" rows="7" placeholder="Start writing…" required></textarea></label><button class="button primary" type="submit">${icon('plus',16)} Save note</button></form></section>
 <section><div class="section-title">Your notes <span class="count">${notes.length}</span></div><div class="note-grid">${notes.length?notes.map(n=>`<article class="note-card"><small>${escapeHtml(n.updated)}</small><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.body)}</p><div class="card-actions"><button class="text-button" data-edit="${n.id}">Edit</button><button class="text-button danger" data-delete="${n.id}">Delete</button></div></article>`).join(''):'<p class="hint">Your first note will appear here.</p>'}</div></section></div>`;
}
export function mount(root){
 root.querySelector('#note-form').addEventListener('submit',e=>{e.preventDefault();const title=formValue(e.target,'title'),body=formValue(e.target,'body');if(title&&body)insert('notes',{title,body,updated:today()});});
 root.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',()=>remove('notes',el.dataset.delete)));
 root.querySelectorAll('[data-edit]').forEach(el=>el.addEventListener('click',()=>{const n=read('notes').find(n=>n.id===el.dataset.edit);if(!n)return;const title=prompt('Note title',n.title);if(title===null)return;const body=prompt('Note text',n.body);if(body===null)return; if(title.trim())update('notes',n.id,{title:title.trim(),body,updated:today()});}));
}
