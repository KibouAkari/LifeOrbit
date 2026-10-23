// Browser-only demo store. Replace with authenticated server APIs before production.
import {store,uid,today} from './lib.js';
const defaults = {
  account: {name:'Alex',email:'demo@lifeorbit.local'},
  tasks: [{id:'t1',title:'Plan the week',due:today(),done:false},{id:'t2',title:'Review subscription renewals',due:today(),done:false},{id:'t3',title:'Capture a new idea',due:'',done:true}],
  notes: [{id:'n1',title:'Welcome to LifeOrbit',body:'A little space for ideas, thoughts and everything worth remembering. Click to edit this note.',updated:today()}],
  events: [{id:'e1',title:'Weekly reset',date:today(),time:'17:00'}],
  subscriptions: [{id:'s1',name:'Music plan',amount:9.90,currency:'CHF',interval:'month',renewal:today()}],
  challenges: [{id:'c1',title:'Drink a glass of water',goal:5,progress:2,unit:'glasses'},{id:'c2',title:'Take a little walk',goal:3,progress:1,unit:'walks'}]
};
export function read(key) { return store.get(key, defaults[key] ?? []); }
export function write(key, value) { store.set(key,value); window.dispatchEvent(new Event('lifeorbit:data')); }
export function insert(key,record) { write(key,[{id:uid(),...record},...read(key)]); }
export function remove(key,id) { write(key,read(key).filter(x=>x.id!==id)); }
export function update(key,id,changes) { write(key,read(key).map(x=>x.id===id?{...x,...changes}:x)); }
export function resetDemo() { Object.keys(defaults).forEach(k=>store.set(k,defaults[k])); window.dispatchEvent(new Event('lifeorbit:data')); }
