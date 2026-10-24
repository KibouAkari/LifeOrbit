import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trophy, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import { request, hasSession } from "../data/api";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import type { Challenge, ChallengeTemplate } from "../types";

const ideas:Omit<ChallengeTemplate,"id">[]=[
 {title:"Drink a glass of water",target:8,unit:"glasses",period:"daily"},
 {title:"Read for a while",target:15,unit:"minutes",period:"daily"},
 {title:"Get outdoors",target:20,unit:"minutes",period:"daily"},
 {title:"Stretch your body",target:10,unit:"minutes",period:"daily"},
 {title:"Make your bed",target:1,unit:"time",period:"daily"},
 {title:"Write something positive",target:3,unit:"thoughts",period:"daily"},
 {title:"Take a screen break",target:25,unit:"minutes",period:"daily"},
 {title:"Clean a small space",target:10,unit:"minutes",period:"daily"},
 {title:"Do some push-ups",target:10,unit:"reps",period:"daily"},
 {title:"Spend time outside",target:30,unit:"minutes",period:"daily"},
 {title:"Cook a new recipe",target:1,unit:"meal",period:"weekly"},
 {title:"Go for a longer walk",target:2,unit:"walks",period:"weekly"},
 {title:"Call someone you like",target:2,unit:"calls",period:"weekly"},
 {title:"Finish a personal project",target:1,unit:"milestone",period:"weekly"},
 {title:"Work out",target:3,unit:"sessions",period:"weekly"},
 {title:"Make a weekly plan",target:1,unit:"plan",period:"weekly"},
 {title:"Try a creative activity",target:2,unit:"sessions",period:"weekly"},
 {title:"Declutter a drawer",target:1,unit:"drawer",period:"weekly"}
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
type Ranked={id:string|null;name:string;points:number;me:boolean};
export default function Challenges(){
 const {state,patch}=useApp();
 const [message,setMessage]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [name,setName]=useState(""),[target,setTarget]=useState(1),[unit,setUnit]=useState("times");
 const [period,setPeriod]=useState<"daily"|"weekly">("daily");
 const [rank,setRank]=useState<Ranked[]>([]);
 const [saving,setSaving]=useState(false);
 const [now]=useState(()=>new Date());
 const points=state.challenges.reduce((sum,c)=>sum+Math.min(c.value,c.target)*10,0);
 const completed=state.challenges.filter(c=>c.value>=c.target);
 const active=state.challenges.filter(c=>c.value<c.target);
 const key=(kind:"daily"|"weekly")=>periodKey(kind,now);
 const suggestions=useMemo(()=>{
  const source=[...ideas,...state.templates];
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
  if(!state.templates.length)return;
  patch("challenges",rows=>{
    const missing=state.templates.filter(t=>!rows.some(c=>c.id===`${t.id}-${key(t.period)}`));
    if(!missing.length)return rows;
    return [...rows,...missing.map(t=>({id:`${t.id}-${key(t.period)}`,title:t.title,target:t.target,value:0,unit:t.unit,period:t.period,date_key:key(t.period),custom:true}))];
  });
 },[state.templates,patch]);
 useEffect(()=>{void loadRanking();},[points,state.leaderboard_opt_in]);
 function choose(item:Omit<ChallengeTemplate,"id">){
  const date_key=key(item.period);
  const id=`${item.title.toLowerCase().replace(/\W+/g,"-")}-${date_key}`;
  if(state.challenges.some(c=>c.id===id)){setMessage("Already added for this period.");return;}
  patch("challenges",rows=>[...rows,{id,title:item.title,value:0,target:item.target,unit:item.unit,date_key,period:item.period,custom:state.templates.some(t=>t.title===item.title)}]);
  setMessage("Challenge added.");
 }
 function makeCustom(e:FormEvent){
  e.preventDefault();if(!name.trim()||target<1)return;
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
 async function optIn(){
  patch("leaderboard_opt_in",!state.leaderboard_opt_in);
  setSaving(true);setTimeout(()=>{setSaving(false);void loadRanking()},1400);
 }
 return <div className="work-page"><Heading title="Challenges" description="One small win at a time."/>
  <div className="challenge-summary"><div><span>Total points</span><strong>{points}</strong><p>{completed.length} completed challenges</p></div><Trophy size={42}/></div>
  <div className="challenge-layout"><section className="challenge-collection">
   <div className="challenge-section-top"><h2>Active challenges</h2><span>{active.length}</span></div>
   {active.length?active.map(c=><article className="challenge-item" key={c.id}>
    <div className="challenge-row"><div><h3>{c.title}</h3><p>{c.value} / {c.target} {c.unit}</p></div><span>{Math.round(c.value/c.target*100)}%</span></div>
    <div className="challenge-meter" role="progressbar" aria-label={c.title} aria-valuenow={c.value} aria-valuemax={c.target} aria-valuemin={0}><span style={{width:`${Math.round(c.value/c.target*100)}%`}}/></div>
    <button className="button primary" onClick={()=>increment(c)}><Plus size={16}/> Add progress</button>
   </article>):<div className="quiet-empty"><CheckCircle2 size={20}/> All clear. Pick something new below.</div>}
   {state.templates.length>0&&<div className="saved-challenge-templates"><h3>Your recurring challenges</h3>{state.templates.map(t=><div key={t.id}><strong>{t.title}</strong><span>{t.period} · {t.target} {t.unit}</span><button className="text-button" onClick={()=>patch("templates",rows=>rows.filter(x=>x.id!==t.id))}>Remove</button></div>)}</div>}
   <div className="challenge-section-top challenge-discover-title"><h2>Something new</h2><button className="text-button" onClick={()=>setRefresh(x=>x+1)}><RefreshCw size={16}/> Surprise me</button></div>
   <div className="challenge-discover">{suggestions.map((c,i)=><button className="challenge-suggestion" key={c.title+i} onClick={()=>choose(c)}><span><strong>{c.title}</strong><small>{c.period==="daily"?"Daily":"Weekly"} · {c.target} {c.unit}</small></span><Plus size={16}/></button>)}</div>
   <form className="challenge-custom" onSubmit={makeCustom}><h3>Create a recurring challenge</h3><input className="input" placeholder="Challenge name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/><div className="challenge-custom-fields"><input className="input" type="number" min={1} max={100000} value={target} onChange={e=>setTarget(Number(e.target.value))}/><input className="input" value={unit} maxLength={30} onChange={e=>setUnit(e.target.value)}/><select className="select" value={period} onChange={e=>setPeriod(e.target.value as "daily"|"weekly")}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div><button className="button">Add challenge</button></form>
   <p role="status" aria-live="polite" className="feedback-line">{message}</p>
  </section>
  <aside className="ranking"><div className="ranking-heading"><h2>Leaderboard</h2><Sparkles size={18}/></div>
   <label className="leaderboard-optin"><input type="checkbox" checked={state.leaderboard_opt_in} onChange={()=>void optIn()} disabled={saving}/> Show me in the community ranking</label>
   {rank.length>0&&<div className="leaderboard-podium">{[rank[1],rank[0],rank[2]].map((person,i)=>person?<div className={`leaderboard-place place-${person===rank[0]?1:person===rank[1]?2:3}`} key={person.id||person.name+i}><div className="leaderboard-profile">{person.name[0]?.toUpperCase()}</div><strong>{person.name}</strong><small>{person.points} pts</small><div className="leaderboard-step">#{rank.indexOf(person)+1}</div></div>:<div key={i} aria-hidden="true"/>)}</div>}
   {rank.length?rank.map((person,i)=><div className="ranking-row" key={person.id||person.name+i}><span className="ranking-position">{i+1}</span><div className="leaderboard-profile">{person.name[0]?.toUpperCase()}</div><strong>{person.name}{person.me?" · You":""}</strong><span>{person.points} pts</span></div>):<div className="quiet-empty">Your ranking is being loaded.</div>}
  </aside></div>
 </div>;
}
