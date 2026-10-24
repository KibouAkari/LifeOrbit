import {useCallback,useEffect,useRef,useState} from "react";
import {Plus,Users,BookOpen,Trash2} from "lucide-react";
import {request} from "../data/api";
type Page={id:string;title:string;body:string};
type SharedBook={id:string;title:string;owner:string;is_owner:boolean;owner_name:string;members:{id:string;name:string}[];pages:Page[]};
type Friend={id:string;name:string};
export default function SharedNotebooks(){
 const [books,setBooks]=useState<SharedBook[]>([]);
 const [friends,setFriends]=useState<Friend[]>([]);
 const [selected,setSelected]=useState("");
 const [page,setPage]=useState("");
 const [title,setTitle]=useState(""),[body,setBody]=useState("");
 const [dirty,setDirty]=useState(false);
 const editVersion=useRef(0);
 const [newTitle,setNewTitle]=useState("");
 const [invite,setInvite]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  try{
   const peopleRequest=request<{friends:Friend[]}>("/friends");
   const items:SharedBook[]=[];
   let offset=0;
   while(true){
    const page=await request<{items:SharedBook[];next_offset:number|null}>(`/shared-notebooks?offset=${offset}`);
    items.push(...page.items);
    if(page.next_offset===null)break;
    offset=page.next_offset;
   }
   const people=await peopleRequest;
   setBooks(items);setFriends(people.friends)
  }
  catch(err){setNotice(err instanceof Error?err.message:"Unable to load shared notebooks")}
 },[]);
 useEffect(()=>{void refresh();const poll=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},10000);return()=>window.clearInterval(poll)},[refresh]);
 const book=books.find(x=>x.id===selected);
 useEffect(()=>{
  if(!page||dirty)return;
  const current=books.find(item=>item.id===selected)?.pages.find(item=>item.id===page);
  if(current){setTitle(current.title);setBody(current.body)}
 },[books,dirty,page,selected]);
 async function createBook(){
   if(!newTitle.trim())return;setBusy(true);
   try{const result=await request<SharedBook>("/shared-notebooks",{method:"POST",body:JSON.stringify({title:newTitle.trim()})});setBooks(old=>[...old,result]);setSelected(result.id);setPage("");setTitle("");setBody("");setDirty(false);editVersion.current+=1;setNewTitle("");setNotice("Shared notebook created")}
   catch(e){setNotice(e instanceof Error?e.message:"Creation failed")}finally{setBusy(false)}
 }
 async function inviteFriend(){
  if(!book||!invite)return;setBusy(true);
  try{await request(`/shared-notebooks/${book.id}/members`,{method:"POST",body:JSON.stringify({user_id:invite})});await refresh();setInvite("");setNotice("Friend invited")}
  catch(e){setNotice(e instanceof Error?e.message:"Invite failed")}finally{setBusy(false)}
 }
 async function savePage(){
  if(!book||!title.trim())return;setBusy(true);
  const id=page||crypto.randomUUID();
  const version=editVersion.current;
  setPage(id);
  try{await request(`/shared-notebooks/${book.id}/pages/${id}`,{method:"PUT",body:JSON.stringify({title:title.trim(),body})});if(editVersion.current===version)setDirty(false);await refresh();setNotice("Shared page saved")}
  catch(e){setNotice(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}
 }
 async function removePage(){
  if(!book||!page||!window.confirm("Delete this page?"))return;
  setBusy(true);
  try{await request(`/shared-notebooks/${book.id}/pages/${page}`,{method:"DELETE"});setPage("");setTitle("");setBody("");setDirty(false);await refresh();setNotice("Page deleted")}
  catch(e){setNotice(e instanceof Error?e.message:"Unable to delete page")}
  finally{setBusy(false)}
 }
 async function removeBook(){
  if(!book||!window.confirm("Delete this shared notebook for everyone?"))return;
  try{await request(`/shared-notebooks/${book.id}`,{method:"DELETE"});setSelected("");setPage("");await refresh();setNotice("Notebook removed")}
  catch(e){setNotice(e instanceof Error?e.message:"Unable to delete notebook")}
 }
 return <div className="shared-notebook-layout">
  <aside className="shared-notebook-sidebar">
   <h3><Users size={17}/> Shared notebooks</h3>
   {books.map(item=><button key={item.id} className={selected===item.id?"selected":""} onClick={()=>{setSelected(item.id);setPage("");setTitle("");setBody("");setDirty(false);editVersion.current+=1}}><BookOpen size={16}/><span>{item.title}<small>By {item.owner_name} · {item.members.length+1} members</small></span></button>)}
   <form onSubmit={e=>{e.preventDefault();void createBook()}}><input className="input" placeholder="New shared notebook" maxLength={80} value={newTitle} onChange={e=>setNewTitle(e.target.value)}/><button className="button primary" disabled={busy||!newTitle.trim()}><Plus size={16}/> Create</button></form>
  </aside>
  <div className="shared-notebook-content">
   {book?<><header><div><h2>{book.title}</h2><p className="muted">Shared by {book.owner_name}</p></div>{book.is_owner&&<button className="button" onClick={()=>void removeBook()} title="Delete entire notebook (owner only)" aria-label="Delete entire notebook"><Trash2 size={15}/></button>}</header>
    <div className="shared-notebook-invite"><select className="select" aria-label="Invite a friend" value={invite} onChange={e=>setInvite(e.target.value)}><option value="">Invite a friend</option>{friends.filter(f=>!book.members.some(m=>m.id===f.id)).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><button className="button" disabled={busy||!invite} onClick={()=>void inviteFriend()}>Invite</button></div>
    <div className="shared-notebook-pages">{book.pages.map(item=><button key={item.id} className={page===item.id?"selected":""} onClick={()=>{setPage(item.id);setTitle(item.title);setBody(item.body);setDirty(false);editVersion.current+=1}}>{item.title}</button>)}<button onClick={()=>{setPage("");setTitle("Untitled page");setBody("");setDirty(false);editVersion.current+=1}}><Plus size={15}/> New page</button></div>
    <input className="input" placeholder="Page title" maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);setDirty(true);editVersion.current+=1}}/><textarea className="textarea" rows={12} maxLength={50000} placeholder="Write together..." value={body} onChange={e=>{setBody(e.target.value);setDirty(true);editVersion.current+=1}}/><div className="shared-note-actions"><button className="button primary" disabled={busy||!title.trim()} onClick={()=>void savePage()}>Save page</button>{page&&<button className="button" disabled={busy} onClick={()=>void removePage()}><Trash2 size={15}/> Delete page</button>}</div>
   </>:<div className="quiet-empty"><BookOpen size={25}/><h2>Plan together</h2><p>Create a shared notebook and invite a friend.</p></div>}
   <p className="feedback-line" role="status">{notice}</p>
  </div>
 </div>;
}
