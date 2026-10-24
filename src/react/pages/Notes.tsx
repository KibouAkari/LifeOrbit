import {useState} from "react";
import {BookOpen,Plus,Trash2,Share2} from "lucide-react";
import {useApp} from "../context/AppContext";
import {hasSession,request} from "../data/api";
import {newId} from "../data/storage";
import {Heading} from "../components/UI";
import SharedNotebooks from "../components/SharedNotebooks";

export default function Notes(){
 const {state,patch,flushWorkspace}=useApp();
 const [shared,setShared]=useState(false);
 const [chapter,setChapter]=useState("personal");
 const [selected,setSelected]=useState<string|null>(null);
 const [addingChapter,setAddingChapter]=useState(false);
 const [chapterName,setChapterName]=useState("");
 const [notice,setNotice]=useState("");
 const [moving,setMoving]=useState(false);
 const items=state.notes.filter(n=>(n.chapter_id||"personal")===chapter);
 const note=state.notes.find(n=>n.id===selected);
 function create(){
  const id=newId();patch("notes",rows=>[...rows,{id,title:"Untitled note",body:"",chapter_id:chapter}]);setSelected(id);
 }
 function change(field:"title"|"body",value:string){
  patch("notes",rows=>rows.map(n=>n.id===selected?{...n,[field]:value}:n));
 }
 async function moveToShared(){
  if(!note||moving)return;
  if(!hasSession()){setNotice("Sign in to share notebooks.");return}
  setMoving(true);
  try{
   await flushWorkspace();
   await request("/shared-notebooks/from-note",{method:"POST",body:JSON.stringify({note_id:note.id})});
   patch("notes",rows=>rows.filter(n=>n.id!==note.id));
   setSelected(null);setShared(true);setNotice("Moved to Shared notebooks. Open it there to invite friends.");
  }catch(err){setNotice(err instanceof Error?err.message:"Unable to move note");}
  finally{setMoving(false)}
 }
 function deleteChapter(id:string){
  const current=state.chapters.find(c=>c.id===id);
  if(!current||id==="personal")return;
  if(!window.confirm(`Delete "${current.name}"? Notes will move to Personal.`))return;
  patch("notes",rows=>rows.map(n=>n.chapter_id===id?{...n,chapter_id:"personal"}:n));
  patch("chapters",rows=>rows.filter(c=>c.id!==id));
  if(chapter===id)setChapter("personal");
  setSelected(null);setNotice("Chapter deleted; pages were kept.");
 }
 function addChapter(){
  const name=chapterName.trim().slice(0,80);if(!name)return;
  const id=newId();patch("chapters",rows=>[...rows,{id,name}]);setChapter(id);
  setSelected(null);setChapterName("");setAddingChapter(false);
 }
 return <div className="work-page">
  <Heading title="Notes" description="Everything worth keeping, in one place."/>
  <div className="notes-mode-tabs">
   <button className={!shared?"active":""} onClick={()=>setShared(false)}>My notes</button>
   <button className={shared?"active":""} onClick={()=>setShared(true)}>Shared notebooks</button>
  </div>
  {shared?<SharedNotebooks/>:
   <div className="notebook notes-refined">
    <aside className="notebook-chapters">
     <div className="notebook-section-heading">Chapters <button aria-label="Add chapter" onClick={()=>setAddingChapter(x=>!x)}><Plus size={16}/></button></div>
     {addingChapter&&<form className="chapter-add" onSubmit={e=>{e.preventDefault();addChapter()}}>
      <input className="input" aria-label="Chapter name" autoFocus value={chapterName} maxLength={80} placeholder="Chapter name" onChange={e=>setChapterName(e.target.value)}/>
      <button className="button primary">Add</button>
     </form>}
     {state.chapters.map(c=><div className={`chapter-row ${chapter===c.id?"chapter-active":""}`} key={c.id}>
      <button type="button" className="chapter-select" onClick={()=>{setChapter(c.id);setSelected(null)}}><BookOpen size={17}/><span>{c.name}</span></button>
      {c.id!=="personal"&&<button type="button" className="chapter-remove" aria-label={`Delete chapter ${c.name}`} title="Delete chapter" onClick={()=>deleteChapter(c.id)}><Trash2 size={15}/></button>}
     </div>)}
    </aside>
    <section className="notebook-list">
     <div className="notebook-section-heading">Pages <button aria-label="New note" onClick={create}><Plus size={17}/></button></div>
     {items.length?items.map(n=><button className={selected===n.id?"selected":""} key={n.id} onClick={()=>setSelected(n.id)}><strong>{n.title}</strong><small>{n.body.slice(0,70)||"Empty note"}</small></button>):<div className="quiet-empty">No pages yet.</div>}
    </section>
    <section className="notebook-editor">
     {note?<><div className="notebook-editor-actions">
      <span>Saved automatically</span>
      <button className="button" disabled={moving} onClick={()=>void moveToShared()}><Share2 size={16}/> {moving?"Moving…":"Move to Shared"}</button>
      <button className="icon-button" title="Delete note" aria-label="Delete note" onClick={()=>{if(!window.confirm("Delete this note?"))return;patch("notes",rows=>rows.filter(n=>n.id!==note.id));setSelected(null)}}><Trash2 size={17}/></button>
     </div><input className="notebook-title" aria-label="Note title" maxLength={120} value={note.title} onChange={e=>change("title",e.target.value)}/>
     <textarea className="notebook-body" aria-label="Note content" maxLength={50000} placeholder="Start writing…" value={note.body} onChange={e=>change("body",e.target.value)}/></>
     :<div className="notebook-empty"><BookOpen size={30}/><h2>Your next idea starts here.</h2><p>Choose a page or create a new one.</p><button className="button primary" onClick={create}><Plus size={16}/> New page</button></div>}
    </section>
   </div>}
  <p className="feedback-line" role="status">{notice}</p>
 </div>;
}
