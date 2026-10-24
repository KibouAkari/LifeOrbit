import { useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";

// Chapters and pages are stored as one workspace for authenticated accounts.
export default function Notes(){
  const {state,patch}=useApp();
  const [chapter,setChapter]=useState("personal");
  const [selected,setSelected]=useState<string|null>(null);
  const [addingChapter,setAddingChapter]=useState(false);
  const [chapterName,setChapterName]=useState("");
  const items=state.notes.filter(n=>(n.chapter_id||"personal")===chapter);
  const note=state.notes.find(n=>n.id===selected);

  function create(){
    const id=newId();
    patch("notes",current=>[...current,{id,title:"Untitled note",body:"",chapter_id:chapter}]);
    setSelected(id);
  }
  function change(field:"title"|"body",value:string){
    patch("notes",current=>current.map(n=>n.id===selected?{...n,[field]:value}:n));
  }
  function createChapter(){
    const name=chapterName.trim().slice(0,80);
    if(!name)return;
    const id=newId();
    patch("chapters",current=>[...current,{id,name}]);
    setChapter(id);
    setSelected(null);setAddingChapter(false);setChapterName("");
  }
  return <div className="work-page"><Heading title="Notes" description="A place for everything worth keeping."/>
    <div className="notebook"><aside className="notebook-chapters">
      <div className="notebook-section-heading">Chapters <button aria-label="Add chapter" onClick={()=>setAddingChapter(!addingChapter)}><Plus size={16}/></button></div>
      {addingChapter&&<form className="chapter-add" onSubmit={e=>{e.preventDefault();createChapter();}}>
        <input className="input" autoFocus aria-label="Chapter name" maxLength={80} placeholder="Chapter name" value={chapterName} onChange={e=>setChapterName(e.target.value)}/>
        <button className="button primary">Add</button>
      </form>}
      {state.chapters.map(c=><button className={chapter===c.id?"selected":""} key={c.id} onClick={()=>{setChapter(c.id);setSelected(null);}}><BookOpen size={17}/>{c.name}</button>)}
    </aside><section className="notebook-list">
      <div className="notebook-section-heading">Pages <button aria-label="New note" onClick={create}><Plus size={17}/></button></div>
      {items.length?items.map(n=><button className={selected===n.id?"selected":""} key={n.id} onClick={()=>setSelected(n.id)}><strong>{n.title}</strong><small>{n.body.slice(0,64)||"Empty note"}</small></button>):<div className="quiet-empty">No pages here yet.</div>}
    </section><section className="notebook-editor">
      {note?<><div className="notebook-editor-actions"><span>Changes save automatically</span><button className="icon-button" title="Delete note" aria-label="Delete note" onClick={()=>{patch("notes",current=>current.filter(n=>n.id!==selected));setSelected(null);}}><Trash2 size={18}/></button></div>
      <input className="notebook-title" aria-label="Note title" value={note.title} maxLength={120} onChange={e=>change("title",e.target.value)}/>
      <textarea className="notebook-body" aria-label="Note content" maxLength={50000} placeholder="Start writing..." value={note.body} onChange={e=>change("body",e.target.value)}/>
      </>:<div className="notebook-placeholder"><BookOpen size={32}/><h2>A page for every thought.</h2><p>Choose a page or create a new one.</p><button className="button primary" onClick={create}><Plus size={16}/> New page</button></div>}
    </section></div>
  </div>;
}
