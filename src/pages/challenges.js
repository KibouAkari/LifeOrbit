// Challenges: local progress only. Implement authenticated scoring/opt-in leaderboards later.
import {read,update} from '../data.js';
import {escapeHtml,icon} from '../lib.js';
export function render(){
 const items=read('challenges');
 return `<div class="page-header"><div><div class="eyebrow">SMALL WINS COUNT</div><h1>Challenges</h1><p>Build good habits without the pressure.</p></div></div>
 <div class="challenge-grid">${items.map(c=>{const percent=Math.min(100,Math.round(c.progress/c.goal*100));return `<section class="panel challenge"><div class="challenge-symbol">✦</div><h2>${escapeHtml(c.title)}</h2><p>${c.progress} of ${c.goal} ${escapeHtml(c.unit)}</p><div class="progress" role="progressbar" aria-valuenow="${c.progress}" aria-valuemin="0" aria-valuemax="${c.goal}" aria-label="${escapeHtml(c.title)}"><span style="width:${percent}%"></span></div><button class="button secondary" data-plus="${c.id}" ${c.progress>=c.goal?'disabled':''}>${c.progress>=c.goal?'Completed ✓':icon('plus',16)+' Log progress'}</button></section>`}).join('')}</div><section class="panel section-after"><div class="panel-head"><h2>Leaderboard</h2><span class="pill">Coming later</span></div><p class="hint">Shared leaderboards will be opt-in. Your progress stays private in this demo.</p></section>`;
}
export function mount(root){root.querySelectorAll('[data-plus]').forEach(el=>el.addEventListener('click',()=>{const c=read('challenges').find(x=>x.id===el.dataset.plus);if(c)update('challenges',c.id,{progress:Math.min(c.goal,c.progress+1)});}));}
