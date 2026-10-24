import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Share2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasSession,request } from "../data/api";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import SharedNotebooks from "../components/SharedNotebooks";

// Chapters and pages are stored as one workspace for authenticated accounts.
export default function Notes(){
  const {state,patch,flushWorkspace}=useApp();
  const [chapter,setChapter]=useState("personal");
  const [sharedMode,setSharedMode]=useState(false);
  const [shared,setShared]=useState<{id:string;title:string;body:string;shared_by:string}[]>([]);
  const [friends,setFriends]=useState<{id:string;name:string}[]>([]);
  const [notice,setNotice]=useState("");
  const [shareId,setShareId]=useState<string|null>(null);
  const [shareTo,setShareTo]=useState("");
  useEffect(()=>{if(!hasSession())return;let live=true;async function refresh(){try{const [notes,data]=await Promise.all([request<typeof shared>("/sharing/notes"),request<{friends:typeof friends}>("/friends")]);if(live){setShared(notes);setFriends(data.friends)}}catch{}}void refresh();const timer=setInterval(()=>{if(sharedMode)void refresh()},15000);return()=>{live=false;clearInterval(timer)}},[sharedMode]);
  async function shareNote(id:string,recipientId:string){
    if(!recipientId){setNotice("Select a friend to share with.");return;}
    try{
      await flushWorkspace();
      await request("/sharing/notes",{method:"POST",body:JSON.stringify({resource_id:id,recipient_id:recipientId})});
      setNotice("Note shared successfully");setShareId(null);setShareTo("");
    }catch(error){setNotice(error instanceof Error?error.message:"Sharing failed")}
  }
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
  function deleteChapter(id:string){
    const chapter=state.chapters.find(c=>c.id===id);
    if(!chapter)return;
    if(!window.confirm(`Delete "${chapter.name}"? Its notes will be moved to Personal.`))return;
    patch("notes",current=>current.map(n=>n.chapter_id===id?{...n,chapter_id:"personal"}:n));
    patch("chapters",current=>current.filter(c=>c.id!==id));
    if(chapter.id===chapter)setChapter("personal");
    setSelected(null);setNotice("Chapter removed. Its notes were kept.");
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
    <div className="notes-mode-tabs"><button className={!sharedMode?"active":""} onClick={()=>setSharedMode(false)}>My notes</button><button className={sharedMode?"active":""} onClick={()=>setSharedMode(true)}>Shared notebooks</button></div>
    {sharedMode&&<SharedNotebooks/>}
    <div className="notebook" style={{display:sharedMode?"none":undefined}}><aside className="notebook-chapters"><div className="notebook-section-heading"><button className={!sharedMode?"selected":""} onClick={()=>{setSharedMode(false);setSelected(null)}}>My notes</button><button className={sharedMode?"selected":""} onClick={()=>{setSharedMode(true);setSelected(null)}}>Shared {shared.length>0&&`(${shared.length})`}</button></div>
      {!sharedMode&&<div className="notebook-section-heading">Chapters <button aria-label="Add chapter" onClick={()=>setAddingChapter(!addingChapter)}><Plus size={16}/></button></div>}
      {!sharedMode&&addingChapter&&<form className="chapter-add" onSubmit={e=>{e.preventDefault();createChapter();}}>
        <input className="input" autoFocus aria-label="Chapter name" maxLength={80} placeholder="Chapter name" value={chapterName} onChange={e=>setChapterName(e.target.value)}/>
        <button className="button primary">Add</button>
      </form>}
      {!sharedMode&&state.chapters.map(c=><div className="chapter-row" key={c.id}><button className={chapter===c.id?"selected":""} onClick={()=>{setChapter(c.id);setSelected(null);}}><BookOpen size={17}/>{c.name}</button>{c.id!=="personal"&&<button className="chapter-remove" title={`Delete ${c.name}`} aria-label={`Delete chapter ${c.name}`} onClick={()=>deleteChapter(c.id)}><Trash2 size={15}/></button>}</div>)}
    </aside><section className="notebook-list">
      <div className="notebook-section-heading">Pages {!sharedMode&&<button aria-label="New note" onClick={create}><Plus size={17}/></button>}</div>
      {sharedMode?shared.map(n=><button key={n.id} className={selected===n.id?"selected":""} onClick={()=>setSelected(n.id)}><strong>{n.title}</strong><small>From {n.shared_by}</small></button>):items.length?items.map(n=><button className={selected===n.id?"selected":""} key={n.id} onClick={()=>setSelected(n.id)}><strong>{n.title}</strong><small>{n.body.slice(0,64)||"Empty note"}</small></button>):<div className="quiet-empty">No pages here yet.</div>}
    </section><section className="notebook-editor">
      {sharedMode?<div className="notebook-shared">{shared.filter(n=>n.id===selected).map(n=><article key={n.id}><small>Shared by {n.shared_by} · Read only · Refreshes every 15 seconds</small><h2>{n.title}</h2><p style={{whiteSpace:"pre-wrap"}}>{n.body}</p></article>)}</div>:note?<><div className="notebook-editor-actions"><span>Changes save automatically</span><button className="icon-button" aria-label="Share note" title="Share with a friend" onClick={()=>{setShareId(shareId===note.id?null:note.id);setShareTo("");}}><Share2 size={17}/></button><button className="icon-button" title="Delete note" aria-label="Delete note" onClick={()=>{patch("notes",current=>current.filter(n=>n.id!==selected));setSelected(null);}}><Trash2 size={18}/></button></div>
      {shareId===note.id&&<div className="note-share-toolbar"><strong>Share this note</strong>{friends.length?<><select className="select" aria-label="Friend to share note with" value={shareTo} onChange={e=>setShareTo(e.target.value)}><option value="">Choose a friend</option>{friends.map(friend=><option key={friend.id} value={friend.id}>{friend.name}</option>)}</select><button className="button primary" disabled={!shareTo} onClick={()=>void shareNote(note.id,shareTo)}>Share</button></>:<p>Add a friend in Settings to share notes.</p>}</div>}
      <input className="notebook-title" aria-label="Note title" value={note.title} maxLength={120} onChange={e=>change("title",e.target.value)}/>
      <textarea className="notebook-body" aria-label="Note content" maxLength={50000} placeholder="Start writing..." value={note.body} onChange={e=>change("body",e.target.value)}/>
      </>:<div className="notebook-placeholder"><BookOpen size={32}/><h2>A page for every thought.</h2><p>Choose a page or create a new one.</p><button className="button primary" onClick={create}><Plus size={16}/> New page</button></div>}
    </section></div>
  <p className="feedback-line" role="status">{notice}</p></div>;
}
