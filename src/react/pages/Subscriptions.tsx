import { useState, type FormEvent } from "react";
import { Plus, Trash2, WalletCards } from "lucide-react";
import { useApp } from "../context/AppContext";
import { newId } from "../data/storage";
import { Heading } from "../components/UI";
import type { Subscription } from "../types";

const money=(n:number,c:string)=>new Intl.NumberFormat("en-CH",{style:"currency",currency:c}).format(n);

// Advance a renewal by calendar months without changing the billing day permanently.
function nextRenewal(start:string,interval:"monthly"|"yearly"):string {
  if (!start) return "";
  const [y,m,d]=start.split("-").map(Number);
  if(!y||!m||!d)return "";
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let year=y,month=m-1,day=d;
  for(let count=0;count<240;count++) {
    const end=new Date(year,month+1,0).getDate();
    const next=new Date(year,month,Math.min(day,end));
    if(next>=today) return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
    month+=interval==="yearly"?12:1;
    year+=Math.floor(month/12);month%=12;
  }
  return start;
}
export default function Subscriptions(){
  const {state,patch}=useApp();
  const [show,setShow]=useState(false),[name,setName]=useState(""),[amount,setAmount]=useState(""),[currency,setCurrency]=useState("CHF"),[renews,setRenews]=useState(""),[interval,setInterval]=useState<"monthly"|"yearly">("monthly");
  const currencies=[...new Set(state.subscriptions.map(s=>s.currency))];
  function add(e:FormEvent){
    e.preventDefault();const value=Number(amount);
    if(!name.trim()||!Number.isFinite(value)||value<0)return;
    const item:Subscription={id:newId(),name:name.trim(),amount:value,currency,renews,interval};
    patch("subscriptions",current=>[...current,item]);
    setName("");setAmount("");setRenews("");setShow(false);
  }
  const monthlyValue=(s:Subscription)=>s.amount/(s.interval==="yearly"?12:1);
  return <div className="work-page"><Heading title="Subscriptions" description="See what's recurring, before it's due."/>
    <div className="subscription-overview">
      <div><span>Subscriptions</span><strong>{state.subscriptions.length}</strong></div>
      <div><span>Monthly equivalent by currency</span><strong className="summary-currencies">{currencies.length?currencies.map(c=>money(state.subscriptions.filter(s=>s.currency===c).reduce((sum,s)=>sum+monthlyValue(s),0),c)).join(" · "):"None"}</strong></div>
      <button className="button primary" onClick={()=>setShow(!show)}><Plus size={17}/> Add subscription</button>
    </div>
    {show&&<form className="subscription-form" onSubmit={add}>
      <label>Name<input className="input" required value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label>
      <label>Amount<input className="input" type="number" min="0" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <label>Currency<select className="select" value={currency} onChange={e=>setCurrency(e.target.value)}><option>CHF</option><option>EUR</option><option>USD</option></select></label>
      <label>Billing<select className="select" value={interval} onChange={e=>setInterval(e.target.value as "monthly"|"yearly")}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
      <label>Next renewal<input className="input" type="date" value={renews} onChange={e=>setRenews(e.target.value)}/></label>
      <button className="button primary">Save</button>
    </form>}
    <div className="subscription-list">{state.subscriptions.map(s=><div className="subscription-item" key={s.id}>
      <div className="subscription-symbol"><WalletCards size={20}/></div><div><strong>{s.name}</strong><small>{s.renews?`Next checkout ${nextRenewal(s.renews,s.interval||"monthly")}`:"Renewal date not set"} · {s.interval==="yearly"?"Yearly":"Monthly"}</small></div>
      <strong>{money(s.amount,s.currency)} <small>/ {s.interval==="yearly"?"year":"month"}</small></strong>
      <button className="icon-button remove-on-hover" aria-label={`Remove ${s.name}`} onClick={()=>patch("subscriptions",current=>current.filter(x=>x.id!==s.id))}><Trash2 size={17}/></button>
    </div>)}{!state.subscriptions.length&&<div className="quiet-empty">No subscriptions yet.</div>}</div>
    <p className="subscription-footnote">Renewal dates are projected locally; no payment is processed or monitored.</p>
  </div>;
}
