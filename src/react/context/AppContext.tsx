import { createContext,useCallback,useEffect,useRef,useState,type ReactNode } from "react";
import { initialState,readDemo,writeDemo } from "../data/storage";
import { hasSession,request } from "../data/api";
import type { Store } from "../types";

type ContextValue={
 state:Store;
 patch:<K extends keyof Store>(key:K,value:Store[K]|((current:Store[K])=>Store[K]))=>void;
 reset:()=>void;
};
type Workspace=Pick<Store,"notes"|"subscriptions"|"challenges"> & {chapters:{id:string;name:string}[]};
const Context=createContext<ContextValue|null>(null);
const chaptersKey="lifeorbit-chapters-v1";

export function AppProvider({children}:{children:ReactNode}){
  const [state,setState]=useState<Store>(readDemo);
  const [readyToSync,setReadyToSync]=useState(false);
  const hydrated=useRef(false);

  useEffect(()=>{
    let active=true;
    async function restore(){
      if(!hasSession())return;
      setReadyToSync(false);
      try{
        const data=await request<Workspace>("/workspace");
        if(!active)return;
        hydrated.current=true;
        setState(current=>({...current,notes:data.notes,subscriptions:data.subscriptions,challenges:data.challenges}));
        try{localStorage.setItem(chaptersKey,JSON.stringify(data.chapters));}catch{}
        setReadyToSync(true);
      }catch(err){console.error("Workspace load failed",err);}
    }
    const onAuth=()=>{void restore();};
    window.addEventListener("lifeorbit:auth",onAuth);
    void restore();
    return()=>{active=false;window.removeEventListener("lifeorbit:auth",onAuth)};
  },[]);

  useEffect(()=>{
    if(!hasSession()){writeDemo(state);return;}
    if(!readyToSync||!hydrated.current)return;
    // Coalesce typing into a single request rather than saving each keystroke.
    const handle=window.setTimeout(()=>{
      let chapters:{id:string;name:string}[]=[];
      try{chapters=JSON.parse(localStorage.getItem(chaptersKey)||"[]") as typeof chapters;}catch{}
      void request<Workspace>("/workspace",{method:"PUT",body:JSON.stringify({
        notes:state.notes.map(n=>({...n,chapter_id:"personal"})),
        subscriptions:state.subscriptions,challenges:state.challenges,chapters
      })}).catch(err=>console.error("Workspace save failed",err));
    },900);
    return()=>clearTimeout(handle);
  },[state.notes,state.subscriptions,state.challenges,readyToSync]);

  const patch=useCallback(function patch<K extends keyof Store>(key:K,value:Store[K]|((current:Store[K])=>Store[K])){
    setState(s=>({...s,[key]:typeof value==="function"?(value as (x:Store[K])=>Store[K])(s[key]):value}));
  },[]);
  const reset=useCallback(()=>setState(structuredClone(initialState)),[]);
  return <Context.Provider value={{state,patch,reset}}>{children}</Context.Provider>;
}
export function useApp(){const value=useContext(Context);if(!value)throw new Error("Missing AppProvider");return value;}
