import {useCallback,useEffect,useState} from "react";
import {Plus,Users,BookOpen,Trash2} from "lucide-react";
import {request} from "../data/api";
type Page={id:string;title:string;body:string};
type SharedBook={id:string;title:string;owner:string;owner_name:string;members:{id:string;name:string}[];pages:Page[]};
type Friend={id:string;name:string};
export default function SharedNotebooks(){
 const [books,setBooks]=useState<SharedBook[]>([]);
 const [friends,setFriends]=useState<Friend[]>([]);
 const [selected,setSelected]=useState("");
 const [page,setPage]=useState("");
 const [title,setTitle]=useState(""),[body,setBody]=useState("");
 const [newTitle,setNewTitle]=useState("");
 const [invite,setInvite]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  try{const [items,people]=await Promise.all([
   request<SharedBook[]>("/shared-notebooks"),
   request<{friends:Friend[]}>("/friends")
  ]);setBooks(items);setFriends(people.friends)}
  catch(err){setNotice(err instanceof Error?err.message:"Unable to load shared notebooks")}
 },[]);
 useEffect(()=>{void refresh();const poll=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},10000);return()=>window.clearInterval(poll)},[refresh]);
 const book=books.find(x=>x.id===selected);
 async function createBook(){
   if(!newTitle.trim())return;setBusy(true);
   try{const result=await request<SharedBook>("/shared-notebooks",{method:"POST",body:JSON.stringify({title:newTitle.trim()})});setBooks(old=>[...old,result]);setSelected(result.id);setNewTitle("");setNotice("Shared notebook created")}
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
  try{await request(`/shared-notebooks/${book.id}/pages/${id}`,{method:"PUT",body:JSON.stringify({title:title.trim(),body})});await refresh();setPage(id);setNotice("Shared page saved")}
  catch(e){setNotice(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}
 }
 async function removeBook(){
  if(!book||!window.confirm("Delete this shared notebook for everyone?"))return;
  try{await request(`/shared-notebooks/${book.id}`,{method:"DELETE"});setSelected("");setPage("");await refresh();setNotice("Notebook removed")}
  catch(e){setNotice(e instanceof Error?e.message:"Unable to delete notebook")}
 }
 return <div className="shared-notebook-layout">
  <aside className="shared-notebook-sidebar">
   <h3><Users size={17}/> Shared notebooks</h3>
   {books.map(item=><button key={item.id} className={selected===item.id?"selected":""} onClick={()=>{setSelected(item.id);setPage("");setTitle("");setBody("")}}><BookOpen size={16}/><span>{item.title}<small>By {item.owner_name} · {item.members.length+1} members</small></span></button>)}
   <form onSubmit={e=>{e.preventDefault();void createBook()}}><input className="input" placeholder="New shared notebook" maxLength={80} value={newTitle} onChange={e=>setNewTitle(e.target.value)}/><button className="button primary" disabled={busy||!newTitle.trim()}><Plus size={16}/> Create</button></form>
  </aside>
  <div className="shared-notebook-content">
   {book?<><header><div><h2>{book.title}</h2><p className="muted">Shared by {book.owner_name}</p></div>{book.owner_name&&<button className="button" onClick={()=>void removeBook()} title="Delete notebook (owner only)"><Trash2 size={15}/></button>}</header>
    <div className="shared-notebook-invite"><select className="select" aria-label="Invite a friend" value={invite} onChange={e=>setInvite(e.target.value)}><option value="">Invite a friend</option>{friends.filter(f=>!book.members.some(m=>m.id===f.id)).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><button className="button" disabled={busy||!invite} onClick={()=>void inviteFriend()}>Invite</button></div>
    <div className="shared-notebook-pages">{book.pages.map(item=><button key={item.id} className={page===item.id?"selected":""} onClick={()=>{setPage(item.id);setTitle(item.title);setBody(item.body)}}>{item.title}</button>)}<button onClick={()=>{setPage("");setTitle("Untitled page");setBody("")}}><Plus size={15}/> New page</button></div>
    <input className="input" placeholder="Page title" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/><textarea className="textarea" rows={12} maxLength={50000} placeholder="Write together..." value={body} onChange={e=>setBody(e.target.value)}/><button className="button primary" disabled={busy||!title.trim()} onClick={()=>void savePage()}>Save shared page</button>
   </>:<div className="quiet-empty"><BookOpen size={25}/><h2>Plan together</h2><p>Create a shared notebook and invite a friend.</p></div>}
   <p className="feedback-line" role="status">{notice}</p>
  </div>
 </div>;
}
