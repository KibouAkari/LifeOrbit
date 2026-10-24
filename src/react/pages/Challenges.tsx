import { useMemo, useState } from "react";
import { Crown, Plus, RotateCcw, Trophy, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Heading } from "../components/UI";
import type { Challenge } from "../types";

type Suggestion={title:string;target:number;unit:string;period:"Daily"|"Weekly"};
const daily:Suggestion[]=[
 {title:"Take a mindful walk",target:15,unit:"minutes",period:"Daily"},
 {title:"Read something new",target:10,unit:"pages",period:"Daily"},
 {title:"Drink enough water",target:7,unit:"glasses",period:"Daily"},
 {title:"Make time to stretch",target:5,unit:"minutes",period:"Daily"},
 {title:"Tidy your space",target:10,unit:"minutes",period:"Daily"},
 {title:"Take a screen break",target:15,unit:"minutes",period:"Daily"},
 {title:"Write down good moments",target:3,unit:"moments",period:"Daily"},
 {title:"Spend time outdoors",target:20,unit:"minutes",period:"Daily"}
];
const weekly:Suggestion[]=[
 {title:"Exercise this week",target:3,unit:"sessions",period:"Weekly"},
 {title:"Plan ahead",target:1,unit:"weekly plan",period:"Weekly"},
 {title:"Reach out to friends",target:2,unit:"people",period:"Weekly"},
 {title:"Try something creative",target:2,unit:"sessions",period:"Weekly"}
];
const keyFor=(date:Date)=>date.toLocaleDateString("sv-SE");
const seedFor=(date:Date)=>Math.floor(date.getTime()/86400000);
const choose=(items:Suggestion[],seed:number,count:number)=>Array.from({length:count},(_,index)=>items[(seed+index*3)%items.length]);

export default function Challenges(){
 const {state,patch}=useApp();
 const [shuffle,setShuffle]=useState(0);
 const [message,setMessage]=useState("");
 const today=useMemo(()=>new Date(),[]);
 const week=useMemo(()=>{const d=new Date(today);d.setDate(d.getDate()-(d.getDay()+6)%7);return keyFor(d)},[today]);
 const suggestions=[
   ...choose(daily,seedFor(today)+shuffle,2),
   ...choose(weekly,seedFor(today)/7|0+shuffle,1)
 ];
 const accepted=state.challenges;
 const points=accepted.reduce((total,c)=>total+Math.min(c.value,c.target)*10,0);
 const scores=[{id:"alex",name:"Alex",points:180},{id:"taylor",name:"Taylor",points:140},{id:"you",name:state.account||"You",points}].sort((a,b)=>b.points-a.points);
 const finished=accepted.filter(c=>c.value>=c.target).length;
 function add(s:Suggestion){
   const suffix=s.period==="Daily"?keyFor(today):week;
   const id=s.period.toLowerCase()+"-"+suffix+"-"+s.title.toLowerCase().replace(/\W+/g,"-");
   if(accepted.some(c=>c.id===id)){setMessage("Already in your challenges.");return;}
   patch("challenges",current=>[...current,{id,title:s.title,target:s.target,unit:s.unit,value:0}]);
   setMessage("Challenge added. You've got this!");
 }
 function progress(item:Challenge,reset=false){
   const next=reset?0:Math.min(item.target,item.value+1);
   patch("challenges",current=>current.map(c=>c.id===item.id?{...c,value:next}:c));
   setMessage(reset?"Progress reset":next===item.target?"Challenge completed! Nice work.":"Progress saved");
 }
 const available=suggestions.filter(s=>!accepted.some(c=>c.id.includes(s.title.toLowerCase().replace(/\W+/g,"-"))));
 return <div className="work-page"><Heading title="Challenges" description="Small habits. Better days."/>
   <section className="challenge-summary"><div><span>Total points</span><strong>{points}</strong><p>{finished} of {accepted.length} challenges completed</p></div><Trophy size={42}/></section>
   <div className="challenge-layout">
     <section className="challenge-collection">
       <div className="challenge-section-top"><h2>In progress</h2><span>{accepted.length} active</span></div>
       {accepted.length?accepted.map(c=><article className="challenge-item" key={c.id}>
         <div className="challenge-row"><div><h3>{c.title}</h3><p>{c.value} / {c.target} {c.unit}</p></div><span>{c.value>=c.target?<CheckCircle2 size={21}/>:Math.round(c.value/c.target*100)+"%"}</span></div>
         <div className="challenge-meter" role="progressbar" aria-label={c.title} aria-valuemin={0} aria-valuemax={c.target} aria-valuenow={c.value}><span style={{width:`${Math.min(100,100*c.value/c.target)}%`}}/></div>
         <div className="actions"><button disabled={c.value>=c.target} className="button primary" onClick={()=>progress(c)}><Plus size={15}/> Add progress</button><button className="text-button" onClick={()=>progress(c,true)}><RotateCcw size={14}/> Reset</button></div>
       </article>):<div className="quiet-empty">Choose a challenge below to begin.</div>}
       <div className="challenge-section-top challenge-discover-title"><h2>Discover challenges</h2><button className="text-button" onClick={()=>setShuffle(v=>v+1)}><RefreshCw size={15}/> Refresh</button></div>
       <div className="challenge-discover">{available.map(s=><button key={s.title} className="challenge-suggestion" onClick={()=>add(s)}><span><strong>{s.title}</strong><small>{s.period} · {s.target} {s.unit}</small></span><Plus size={18}/></button>)}</div>
       <p className="feedback-line" role="status" aria-live="polite">{message}</p>
     </section>
     <aside className="ranking"><div className="ranking-heading"><h2>Leaderboard</h2><span className="tag">Preview</span></div><p>Sample people for the design. Shared rankings will be optional.</p>
       <div className="leaderboard-podium">{[scores[1],scores[0],scores[2]].filter((p):p is typeof scores[number]=>Boolean(p)).map(p=>{const i=scores.findIndex(x=>x.id===p.id);return <div className={`leaderboard-place place-${i+1}`} key={p.id}><div className="leaderboard-profile">{p.name.slice(0,1).toUpperCase()}</div><strong>{p.name}</strong><small>{p.points} pts</small><div className="leaderboard-step">{i===0&&<Crown size={17}/>}#{i+1}</div></div>})}</div>
       {scores.map((p,i)=><div className="ranking-row" key={p.id}><span className="ranking-position">{i+1}</span><strong>{p.name}</strong><span>{p.points} pts</span></div>)}
       <p className="ranking-disclaimer"><Sparkles size={14}/> Your progress is real. The other scores are examples.</p>
     </aside>
   </div>
 </div>;
}
