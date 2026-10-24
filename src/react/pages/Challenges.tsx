import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trophy, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import { request, hasSession } from "../data/api";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import type { Challenge, ChallengeTemplate } from "../types";

const ideas:ChallengeTemplate[]=[
 {id:"drink-water",title:"Drink a glass of water",target:8,unit:"glasses",period:"daily"},
 {id:"read",title:"Read for a while",target:15,unit:"minutes",period:"daily"},
 {id:"get-outdoors",title:"Get outdoors",target:20,unit:"minutes",period:"daily"},
 {id:"stretch",title:"Stretch your body",target:10,unit:"minutes",period:"daily"},
 {id:"make-bed",title:"Make your bed",target:1,unit:"time",period:"daily"},
 {id:"positive-writing",title:"Write something positive",target:3,unit:"thoughts",period:"daily"},
 {id:"screen-break",title:"Take a screen break",target:25,unit:"minutes",period:"daily"},
 {id:"clean-space",title:"Clean a small space",target:10,unit:"minutes",period:"daily"},
 {id:"push-ups",title:"Do some push-ups",target:10,unit:"reps",period:"daily"},
 {id:"outside-time",title:"Spend time outside",target:30,unit:"minutes",period:"daily"},
 {id:"new-recipe",title:"Cook a new recipe",target:1,unit:"meal",period:"weekly"},
 {id:"long-walk",title:"Go for a longer walk",target:2,unit:"walks",period:"weekly"},
 {id:"call-someone",title:"Call someone you like",target:2,unit:"calls",period:"weekly"},
 {id:"personal-project",title:"Finish a personal project",target:1,unit:"milestone",period:"weekly"},
 {id:"work-out",title:"Work out",target:3,unit:"sessions",period:"weekly"},
 {id:"weekly-plan",title:"Make a weekly plan",target:1,unit:"plan",period:"weekly"},
 {id:"creative-activity",title:"Try a creative activity",target:2,unit:"sessions",period:"weekly"},
 {id:"declutter-drawer",title:"Declutter a drawer",target:1,unit:"drawer",period:"weekly"}
];
const dayKey=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const periodKey=(kind:"daily"|"weekly",now:Date)=>{
 const d=new Date(now);
 if(kind==="weekly")d.setDate(d.getDate()-(d.getDay()+6)%7);
 return dayKey(d);
};
const play=()=>{
 try{const context=new AudioContext();const tone=context.createOscillator();const gain=context.createGain();tone.frequency.setValueAtTime(720,context.currentTime);tone.frequency.linearRampToValueAtTime(1040,context.currentTime+.15);gain.gain.setValueAtTime(.03,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.2);tone.connect(gain).connect(context.destination);tone.start();tone.stop(context.currentTime+.2);tone.onended=()=>void context.close();}catch{}
};
type Ranked={id:string|null;name:string;points:number;me:boolean;rank:number|null};
export default function Challenges(){
 const {state,patch}=useApp();
 const [message,setMessage]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [name,setName]=useState(""),[target,setTarget]=useState(1),[unit,setUnit]=useState("times");
 const [period,setPeriod]=useState<"daily"|"weekly">("daily");
 const [rank,setRank]=useState<Ranked[]>([]);
 const [now]=useState(()=>new Date());
 const [friends,setFriends]=useState<{id:string;name:string}[]>([]);
 const [received,setReceived]=useState<{id:string;title:string;target:number;unit:string;period?:"daily"|"weekly";shared_by:string;share_id?:string}[]>([]);
 useEffect(()=>{if(!hasSession())return;void Promise.all([request<{friends:typeof friends}>("/friends"),request<typeof received>("/sharing/challenges")]).then(([f,c])=>{setFriends(f.friends);setReceived(c)}).catch(()=>undefined)},[]);
 async function shareChallenge(c:Challenge){if(!friends.length){setMessage("Add a friend in Settings first.");return;}const index=window.prompt("Share with: "+friends.map((p,i)=>`${i+1}. ${p.name}`).join(", ")+"\nEnter number");if(!index)return;const target=friends[Number(index)-1];if(!target){setMessage("Choose a valid friend.");return;}try{await request("/sharing/challenges",{method:"POST",body:JSON.stringify({resource_id:c.id,recipient_id:target.id})});setMessage("Challenge shared with "+target.name)}catch(e){setMessage(e instanceof Error?e.message:"Sharing failed")}}
 function acceptChallenge(c:typeof received[number]){
  const origin=c.share_id||`${c.shared_by}:${c.id}`;
  const date_key=key(c.period||"daily");
  const id=`shared-${origin}-${date_key}`;
  const sharedActive=state.challenges.filter(item=>item.value<item.target&&Boolean(item.shared_source)).length;
  if(state.challenges.some(item=>item.id===id||item.shared_source===origin||
    (!item.shared_source&&item.value<item.target&&item.title===c.title&&item.target===c.target&&item.unit===c.unit))){
    setMessage("This shared challenge is already on your list.");return;
  }
  if(sharedActive>=2){setMessage("You can have up to 2 shared challenges. Remove one first.");return;}
  patch("challenges",rows=>[...rows,{id,title:c.title,value:0,target:c.target,unit:c.unit,period:c.period||"daily",date_key,custom:false,shared_source:origin}]);
  setMessage(`Challenge from ${c.shared_by} added.`);
 }
 function removeChallenge(id:string){
  patch("challenges",rows=>rows.filter(c=>c.id!==id));
  setMessage("Challenge removed. You can add another.");
 }

 const points=state.challenges.reduce((sum,c)=>sum+Math.min(c.value,c.target)*10,0);
 const completed=state.challenges.filter(c=>c.value>=c.target);
 const active=state.challenges.filter(c=>c.value<c.target);
 const key=(kind:"daily"|"weekly")=>periodKey(kind,now);
 const suggestions=useMemo(()=>{
  const source:ChallengeTemplate[]=[...ideas,...state.templates];
  // Randomised each time; refresh never alters challenges already accepted.
  const shuffle=[...source].sort(()=>Math.random()-.5);
  return shuffle.slice(0,6);
 },[refresh,state.templates]);
 async function loadRanking(){
  if(!hasSession())return;
  try{const data=await request<{participants:Ranked[]}>("/leaderboard");setRank(data.participants);}
  catch{setMessage("Leaderboard could not be refreshed.");}
 }
 useEffect(()=>{
   const refresh=()=>void loadRanking();
   window.addEventListener("lifeorbit:workspace-saved",refresh);window.addEventListener("lifeorbit:profile-updated",refresh);
   void loadRanking();
   return()=>{window.removeEventListener("lifeorbit:workspace-saved",refresh);window.removeEventListener("lifeorbit:profile-updated",refresh)};
 },[]);
 function choose(item:ChallengeTemplate){
  const date_key=key(item.period);
  const id=`${item.id}-${item.period}-${date_key}`;
  if(state.challenges.some(c=>c.id===id)){setMessage("Already added for this period.");return;}
  if(state.challenges.filter(c=>c.value<c.target&&!c.shared_source).length>=3){setMessage("You can have up to 3 personal challenges. Remove one first.");return;}
  patch("challenges",rows=>[...rows,{id,title:item.title,value:0,target:item.target,unit:item.unit,date_key,period:item.period,custom:state.templates.some(t=>t.id===item.id)}]);
  setMessage("Challenge added.");
 }
 function makeCustom(e:FormEvent){
  e.preventDefault();if(!name.trim()||target<1)return;
  if(state.challenges.filter(c=>c.value<c.target&&!c.shared_source).length>=3){setMessage("Your 3 personal challenge slots are full.");return;}
  const template={id:newId(),title:name.trim(),target,unit:unit.trim()||"times",period};
  patch("templates",rows=>[...rows,template]);
  choose(template);setName("");setMessage("Your recurring challenge has been saved.");
 }
 function increment(item:Challenge){
  const next=Math.min(item.target,item.value+1);
  patch("challenges",rows=>rows.map(row=>row.id===item.id?{...row,value:next}:row));
  if(next===item.target){play();setMessage("Challenge completed! +"+item.target*10+" points");}
  else setMessage("Progress saved.");
 }
 function optIn(){
  patch("leaderboard_opt_in",!state.leaderboard_opt_in);
 }
 const online=hasSession();
 const displayedRank=online?rank:[{id:null,name:"You",points,me:true,rank:null}];
 return <div className="work-page"><Heading title="Challenges" description="One small win at a time."/>
  <div className="challenge-summary"><div><span>Total points</span><strong>{points}</strong><p>{completed.length} completed challenges</p></div><Trophy size={42}/></div>
  <div className="challenge-layout"><section className="challenge-collection">
   <div className="challenge-section-top"><h2>Active challenges</h2><span>{active.filter(c=>!c.shared_source).length}/3 personal · {active.filter(c=>c.shared_source).length}/2 shared</span></div>
   {active.length?active.map(c=><article className="challenge-item" key={c.id}>
    <div className="challenge-row"><div><h3>{c.title}</h3><p>{c.value} / {c.target} {c.unit}</p></div><span>{Math.round(c.value/c.target*100)}%</span></div>
    <div className="challenge-meter" role="progressbar" aria-label={c.title} aria-valuenow={c.value} aria-valuemax={c.target} aria-valuemin={0}><span style={{width:`${Math.round(c.value/c.target*100)}%`}}/></div>
    <div className="actions"><button className="button primary" onClick={()=>increment(c)}><Plus size={16}/> Add progress</button>{friends.length>0&&<button className="button" onClick={()=>void shareChallenge(c)}>Share</button>}<button className="text-button challenge-remove" onClick={()=>removeChallenge(c.id)}>Remove</button></div>
   </article>):<div className="quiet-empty"><CheckCircle2 size={20}/> All clear. Pick something new below.</div>}
   {received.length>0&&<div className="saved-challenge-templates"><h3>From friends</h3>{received.map((c,i)=><div key={c.id+i}><strong>{c.title}</strong><span>From {c.shared_by} · {c.target} {c.unit}</span><button className="button" disabled={active.filter(x=>Boolean(x.shared_source)).length>=2||state.challenges.some(x=>x.shared_source===(c.share_id||`${c.shared_by}:${c.id}`))} onClick={()=>acceptChallenge(c)}>Add</button></div>)}</div>}
   {state.templates.length>0&&<div className="saved-challenge-templates"><h3>Your recurring challenges</h3>{state.templates.map(t=><div key={t.id}><strong>{t.title}</strong><span>{t.period} · {t.target} {t.unit}</span><button className="text-button" onClick={()=>patch("templates",rows=>rows.filter(x=>x.id!==t.id))}>Remove</button></div>)}</div>}
   <div className="challenge-section-top challenge-discover-title"><h2>Something new</h2><button className="text-button" onClick={()=>setRefresh(x=>x+1)}><RefreshCw size={16}/> Surprise me</button></div>
   <div className="challenge-discover">{suggestions.map((c,i)=><button className="challenge-suggestion" key={c.title+i} disabled={active.filter(x=>!x.shared_source).length>=3} onClick={()=>choose(c)}><span><strong>{c.title}</strong><small>{c.period==="daily"?"Daily":"Weekly"} · {c.target} {c.unit}</small></span><Plus size={16}/></button>)}</div>
   <form className="challenge-custom" onSubmit={makeCustom}><h3>Create a recurring challenge</h3><input className="input" placeholder="Challenge name" aria-label="Challenge name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/><div className="challenge-custom-fields"><input className="input" aria-label="Target" type="number" min={1} max={100000} value={target} onChange={e=>setTarget(Number(e.target.value))}/><input className="input" aria-label="Unit" value={unit} maxLength={30} onChange={e=>setUnit(e.target.value)}/><select className="select" aria-label="Recurrence" value={period} onChange={e=>setPeriod(e.target.value as "daily"|"weekly")}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div><button className="button">Add challenge</button></form>
   <p role="status" aria-live="polite" className="feedback-line">{message}</p>
  </section>
  <aside className="ranking"><div className="ranking-heading"><h2>Leaderboard</h2><Sparkles size={18}/></div>
   <label className="leaderboard-optin"><input type="checkbox" checked={state.leaderboard_opt_in} onChange={optIn}/> Show me in the community ranking</label>
   {online&&rank.length>0&&<div className="leaderboard-podium">{[rank[1],rank[0],rank[2]].map((person,i)=>person?<div className={`leaderboard-place place-${person.rank}`} key={person.id||person.name+i}><div className="leaderboard-profile">{person.name[0]?.toUpperCase()}</div><strong>{person.name}</strong><small>{person.points} pts</small><div className="leaderboard-step">#{person.rank}</div></div>:<div key={i} aria-hidden="true"/>)}</div>}
   {displayedRank.length?displayedRank.map((person,i)=><div className="ranking-row" key={person.id||person.name+i}><span className="ranking-position">{person.rank??"Local"}</span><div className="leaderboard-profile">{person.name[0]?.toUpperCase()}</div><strong>{person.name}{person.me?" · You":""}</strong><span>{person.points} pts</span></div>):<div className="quiet-empty">Your ranking is being loaded.</div>}
  </aside></div>
 </div>;
}
