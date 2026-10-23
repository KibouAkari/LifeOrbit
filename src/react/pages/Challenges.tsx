import { Crown, Plus, RotateCcw, Trophy } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Heading } from "../components/UI";

export default function Challenges() {
  const {state,patch}=useApp();
  const points=state.challenges.reduce((total,c)=>total+Math.min(c.value,c.target)*10,0);
  const scores=[{id:"alex",name:"Alex",points:180},{id:"taylor",name:"Taylor",points:140},{id:"you",name:state.account||"You",points}].sort((a,b)=>b.points-a.points);
  return <div className="work-page"><Heading title="Challenges" description="Progress feels better together."/>
    <div className="challenge-summary"><div><span>Your points</span><strong>{points}</strong><p>{state.challenges.filter(c=>c.value>=c.target).length} challenges completed</p></div><Trophy size={42}/></div>
    <div className="challenge-layout"><section className="challenge-collection"><h2>Your challenges</h2>
      {state.challenges.map(c=><article className="challenge-item" key={c.id}><div className="challenge-row"><div><h3>{c.title}</h3><p>{c.value} of {c.target} {c.unit}</p></div><span>{c.value>=c.target?"Complete":"In progress"}</span></div>
        <div className="challenge-meter"><span style={{width:`${Math.min(100,c.value/c.target*100)}%`}}/></div><div className="actions">
        <button className="button primary" disabled={c.value>=c.target} onClick={()=>patch("challenges",current=>current.map(x=>x.id===c.id?{...x,value:Math.min(x.target,x.value+1)}:x))}><Plus size={15}/> Add progress</button>
        <button className="text-button" onClick={()=>patch("challenges",current=>current.map(x=>x.id===c.id?{...x,value:0}:x))}><RotateCcw size={14}/> Reset</button>
        </div></article>)}
    </section>
    <aside className="ranking"><div className="ranking-heading"><h2>Leaderboard</h2><span className="tag">Sample</span></div><p>Preview with fictional users. Multiplayer ranking will be opt-in.</p>
      <div className="leaderboard-podium">{scores.slice(0,3).map((p,i)=><div className={`leaderboard-place place-${i+1}`} key={p.id}><div className="leaderboard-profile">{p.name.slice(0,1).toUpperCase()}</div><strong>{p.name}</strong><small>{p.points} pts</small><div className="leaderboard-step">{i===0&&<Crown size={17}/>}#{i+1}</div></div>)}</div>
      {scores.map((p,i)=><div className="ranking-row" key={p.id}><span className="ranking-position">{i+1}</span><strong>{p.name}</strong><span>{p.points} pts</span></div>)}
    </aside></div>
  </div>;
}
