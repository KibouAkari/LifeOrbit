import type { Store } from "../types";
const KEY="lifeorbit-react-demo-v1";
const LEGACY_KEY="lifeorbit-demo-v1";
export const initialState:Store={
 theme:"system",account:"",tasks:[],notes:[],
 chapters:[{id:"personal",name:"Personal"},{id:"ideas",name:"Ideas"}],
 events:[],subscriptions:[],challenges:[]
};
export function readDemo():Store {
 try{
  const raw=localStorage.getItem(KEY)??localStorage.getItem(LEGACY_KEY);
  if(!raw)return structuredClone(initialState);
  const value=JSON.parse(raw) as Partial<Store>;
  const notes=(value.notes||[]).map(n=>({
    ...n,chapter_id:n.chapter_id||
       localStorage.getItem("lifeorbit-note-chapter-"+n.id)||"personal"
  }));
  let chapters=value.chapters;
  if(!chapters)try{chapters=JSON.parse(localStorage.getItem("lifeorbit-chapters-v1")||"null") as Store["chapters"];}catch{}
  return {...structuredClone(initialState),...value,notes,chapters:chapters||initialState.chapters};
 }catch{return structuredClone(initialState);}
}
export function writeDemo(data:Store){try{localStorage.setItem(KEY,JSON.stringify(data));}catch{}}
export function newId(){return crypto.randomUUID();}
