import {useCallback,useEffect,useState} from "react";
import {UserPlus,Check,X,Users} from "lucide-react";
import {hasSession,request} from "../data/api";
type Person={id:string;name:string;request_id?:string};
type FriendsData={friends:Person[];incoming:Person[];outgoing:Person[];pending_count:number};
const empty:FriendsData={friends:[],incoming:[],outgoing:[],pending_count:0};

export function useFriends(){
 const [data,setData]=useState<FriendsData>(empty);
 const [error,setError]=useState("");
 const reload=useCallback(async()=>{
   if(!hasSession())return;
   try{setData(await request<FriendsData>("/friends"));setError("");}
   catch(e){setError(e instanceof Error?e.message:"Could not load friends");}
 },[]);
 useEffect(()=>{void reload();const handler=()=>void reload();const onFocus=()=>void reload();window.addEventListener("focus",onFocus);window.addEventListener("lifeorbit:friends-changed",handler);const poll=setInterval(handler,5000);return()=>{window.removeEventListener("lifeorbit:friends-changed",handler);clearInterval(poll);window.removeEventListener("focus",onFocus)}},[reload]);
 return {data,error,reload};
}
export function FriendsPanel(){
 const {data,error,reload}=useFriends();
 const [q,setQ]=useState(""),[results,setResults]=useState<Person[]>([]);
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [tab,setTab]=useState<"friends"|"requests"|"discover">("friends");
 useEffect(()=>{
   if(q.trim().length<2){setResults([]);return;}
   let active=true;const timeout=setTimeout(()=>{
     void request<Person[]>("/friends/search?q="+encodeURIComponent(q.trim())).then(rows=>{if(active)setResults(rows)}).catch(()=>{if(active)setResults([])});
   },350);
   return()=>{active=false;clearTimeout(timeout)};
 },[q]);
 async function action(path:string,method:"POST"|"DELETE"){
   setBusy(true);try{await request(path,{method});setMessage("Friends updated");await reload();window.dispatchEvent(new Event("lifeorbit:friends-changed"));}
   catch(e){setMessage(e instanceof Error?e.message:"Could not update friends");}
   finally{setBusy(false);}
 }
 if(!hasSession())return null;
 const related=new Set([...data.friends,...data.incoming,...data.outgoing].map(p=>p.id));
 return <section className="surface-card settings-section friends-panel">
   <h2><Users size={19}/> Friends {data.pending_count>0&&<span className="notification-count">{data.pending_count}</span>}</h2>
   <div className="friend-tabs"><button className={tab==="friends"?"active":""} onClick={()=>setTab("friends")}>Friends ({data.friends.length})</button><button className={tab==="requests"?"active":""} onClick={()=>setTab("requests")}>Requests {data.pending_count>0?`(${data.pending_count})`:""}</button><button className={tab==="discover"?"active":""} onClick={()=>setTab("discover")}>Find people</button></div>
   {tab==="discover"&&<><label className="form-label">Find people<input className="input" placeholder="Search by display name" value={q} maxLength={70} onChange={e=>setQ(e.target.value)}/></label>
   {results.filter(p=>!related.has(p.id)).map(p=><div className="friend-row" key={p.id}><span className="friend-avatar">{p.name.slice(0,1).toUpperCase()}</span><strong>{p.name}</strong><button className="button" disabled={busy} onClick={()=>{setBusy(true);void request("/friends/requests",{method:"POST",body:JSON.stringify({user_id:p.id})}).then(async()=>{setMessage("Request sent");setTab("requests");await reload()}).catch(e=>setMessage(String(e))).finally(()=>setBusy(false))}}><UserPlus size={15}/> Add</button></div>)}
   </>}
   {tab==="requests"&&data.incoming.length>0&&<><h3>Requests</h3>{data.incoming.map(p=><div className="friend-row" key={p.id}><span className="friend-avatar">{p.name[0]}</span><strong>{p.name}</strong><button className="button" disabled={busy} onClick={()=>void action("/friends/requests/"+p.request_id+"/accept","POST")}><Check size={15}/> Accept</button><button className="icon-button" disabled={busy} title="Decline" onClick={()=>void action("/friends/requests/"+p.request_id,"DELETE")}><X size={16}/></button></div>)}</>}
   {tab==="friends"&&<h3>Friends ({data.friends.length})</h3>}
   {tab==="friends"&&data.friends.map(p=><div className="friend-row" key={p.id}><span className="friend-avatar">{p.name[0]}</span><strong>{p.name}</strong><button className="icon-button" title="Remove friend" disabled={busy} onClick={()=>void action("/friends/requests/"+p.request_id,"DELETE")}><X size={16}/></button></div>)}
   {tab==="requests"&&data.outgoing.length>0&&<p className="muted">Waiting for {data.outgoing.map(x=>x.name).join(", ")} to respond.</p>}
   {tab==="friends"&&!data.friends.length&&!data.incoming.length&&<p className="muted">Find a friend to start planning together.</p>}
   <p className="feedback-line" role="status">{message||error}</p>
 </section>;
}
