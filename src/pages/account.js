// Account: local demo profile, not an authentication solution.
import {read,write,resetDemo} from '../data.js';
import {escapeHtml,formValue,icon} from '../lib.js';
export function render(){
 const a=read('account');return `<div class="page-header"><div><div class="eyebrow">PERSONAL SPACE</div><h1>Account & settings</h1><p>Make LifeOrbit feel like yours.</p></div></div>
 <div class="split"><section class="panel"><div class="panel-head"><h2>Your profile</h2><span class="pill">Demo account</span></div><form id="account-form" class="stack-form"><label>Display name<input name="name" maxlength="60" required value="${escapeHtml(a.name)}"></label><label>Email<input name="email" type="email" required value="${escapeHtml(a.email)}"></label><button class="button primary" type="submit">Save profile</button></form><p class="helper">Saved only to this browser. This is not a real authenticated account.</p></section>
 <section class="panel"><div class="panel-head"><h2>Appearance & data</h2></div><p class="hint">Use the sun/moon switch in the sidebar to change the colour theme. Your preference is remembered locally.</p><hr class="soft"><h3>Start fresh</h3><p class="hint">Reset all demo content to its original example data.</p><button class="button secondary" id="reset-demo">Reset demo data</button></section></div>`;
}
export function mount(root){
 root.querySelector('#account-form').addEventListener('submit',e=>{e.preventDefault();const name=formValue(e.target,'name'),email=formValue(e.target,'email');if(name&&email)write('account',{name,email});});
 root.querySelector('#reset-demo').addEventListener('click',()=>{if(confirm('Reset all locally saved demo data?'))resetDemo();});
}
