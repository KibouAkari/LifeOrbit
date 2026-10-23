// Shared prototype storage. Replace with authenticated server APIs before production.
const KEY="lifeorbit-demo-v1";
const defaults={theme:"system",account:"",tasks:[{id:"t1",title:"Plan the week",done:false},{id:"t2",title:"Try the LifeOrbit demo",done:true}],notes:[{id:"n1",title:"Welcome to LifeOrbit",body:"This is your space for ideas, thoughts and everything worth remembering."}],events:[],subscriptions:[{id:"s1",name:"Example subscription",amount:9.99,currency:"CHF",renews:""}],challenges:[{id:"c1",title:"Drink water",value:3,target:8,unit:"glasses"},{id:"c2",title:"Move a little",value:1,target:1,unit:"session"}]};
let state=load();
function load(){try{const data=JSON.parse(localStorage.getItem(KEY));return data&&typeof data==="object"?{...structuredClone(defaults),...data}:structuredClone(defaults)}catch{return structuredClone(defaults)}}
export function get(){return state}
export function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{console.warn("Local storage unavailable")}}
export function update(key,value){state[key]=value;save()}
export function uid(){return globalThis.crypto?.randomUUID?.()||Date.now()+"-"+Math.random()}
export function reset(){state=structuredClone(defaults);save()}
export function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
export function money(amount,currency="CHF"){try{return new Intl.NumberFormat("en-CH",{style:"currency",currency}).format(amount)}catch{return String(amount)+" "+currency}}
