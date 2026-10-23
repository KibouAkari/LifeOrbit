import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";

// Chapters are a local demo convention until MongoDB models are introduced.
type Chapter = { id: string; name: string };
const KEY="lifeorbit-chapters-v1";
function readChapters():Chapter[]{try{const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw) as Chapter[]}catch{}return [{id:"personal",name:"Personal"},{id:"ideas",name:"Ideas"}]}
const chapterFor=(id:string)=>{try{return localStorage.getItem("lifeorbit-note-chapter-"+id)||"personal"}catch{return "personal"}};
export default function Notes(){
  const {state,patch}=useApp();
  const [chapters,setChapters]=useState<Chapter[]>(readChapters);
  const [chapter,setChapter]=useState("personal");
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(chapters))}catch{}},[chapters]);
  const items=state.notes.filter(n=>chapterFor(n.id)===chapter);
  const note=state.notes.find(n=>n.id===selected);
  function create(){
    const id=newId();try{localStorage.setItem("lifeorbit-note-chapter-"+id,chapter)}catch{}
    patch("notes",[...state.notes,{id,title:"Untitled note",body:""}]);setSelected(id);
  }
  function change(field:"title"|"body",value:string){
    patch("notes",state.notes.map(n=>n.id===selected?{...n,[field]:value}:n));
  }
  function addChapter(){const name=prompt("Chapter name")?.trim();if(!name)return;const id=newId();setChapters([...chapters,{id,name:name.slice(0,50)}]);setChapter(id);setSelected(null);}
  return <div className="work-page"><Heading title="Notes" description="Your own little notebook."/><div className="notebook"><aside className="notebook-chapters"><div className="notebook-section-heading">Chapters <button aria-label="Add chapter" onClick={addChapter}><Plus size={16}/></button></div>{chapters.map(c=><button className={chapter===c.id?"selected":""} key={c.id} onClick={()=>{setChapter(c.id);setSelected(null)}}><BookOpen size={17}/>{c.name}</button>)}</aside><section className="notebook-list"><div className="notebook-section-heading">Pages <button aria-label="New note" onClick={create}><Plus size={17}/></button></div>{items.length?items.map(n=><button className={selected===n.id?"selected":""} key={n.id} onClick={()=>setSelected(n.id)}><strong>{n.title}</strong><small>{n.body.slice(0,64)||"Empty note"}</small></button>):<div className="quiet-empty">No pages in this chapter.</div>}</section><section className="notebook-editor">{note?<><div className="notebook-editor-actions"><span>Saved in this browser</span><button className="icon-button" title="Delete note" aria-label="Delete note" onClick={()=>{patch("notes",state.notes.filter(n=>n.id!==selected));setSelected(null)}}><Trash2 size={18}/></button></div><input className="notebook-title" aria-label="Note title" maxLength={120} value={note.title} onChange={e=>change("title",e.target.value)}/><textarea className="notebook-body" aria-label="Note content" placeholder="Start writing..." value={note.body} onChange={e=>change("body",e.target.value)}/></>:<div className="notebook-placeholder"><BookOpen size={32}/><h2>A page for every thought.</h2><p>Choose a note or create a new one.</p><button className="button primary" onClick={create}><Plus size={16}/> New note</button></div>}</section></div></div>;
}
