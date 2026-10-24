import { createContext,useContext,useCallback,useEffect,useRef,useState,type ReactNode } from "react";
import { initialState,readDemo,writeDemo } from "../data/storage";
import { hasSession,request } from "../data/api";
import type { Store } from "../types";

type ContextValue={
 state:Store;
 patch:{
  <K extends keyof Store>(key:K,updater:(current:Store[K])=>Store[K]):void;
  <K extends keyof Store>(key:K,value:Store[K]):void;
 };
 reset:()=>void;
};
type Workspace=Pick<Store,"notes"|"subscriptions"|"challenges"|"chapters">;
const Context=createContext<ContextValue|null>(null);


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
        setState(current=>({...current,notes:data.notes,chapters:data.chapters.length?data.chapters:structuredClone(initialState.chapters),subscriptions:data.subscriptions,challenges:data.challenges}));

        setReadyToSync(true);
      }catch(err){console.error("Workspace load failed",err);}
    }
    const onAuth=()=>{void restore();};
    const onLogout=()=>{
      hydrated.current=false;
      setReadyToSync(false);
      // Clear cloud records from React memory before guest persistence can run.
      setState(readDemo());
    };
    window.addEventListener("lifeorbit:logout",onLogout);
    window.addEventListener("lifeorbit:auth",onAuth);
    window.addEventListener("lifeorbit:restore",onAuth);
    void restore();
    return()=>{active=false;window.removeEventListener("lifeorbit:logout",onLogout);window.removeEventListener("lifeorbit:auth",onAuth);window.removeEventListener("lifeorbit:restore",onAuth)};
  },[]);

  useEffect(()=>{
    if(!hasSession()){writeDemo(state);return;}
    if(!readyToSync||!hydrated.current)return;
    // Coalesce typing into a single request rather than saving each keystroke.
    const handle=window.setTimeout(()=>{
      void request<Workspace>("/workspace",{method:"PUT",body:JSON.stringify({
        notes:state.notes,
        subscriptions:state.subscriptions,challenges:state.challenges,chapters:state.chapters
      })}).catch(err=>console.error("Workspace save failed",err));
    },900);
    return()=>clearTimeout(handle);
  },[state.notes,state.subscriptions,state.challenges,state.chapters,readyToSync]);

  const patch=useCallback(function patch<K extends keyof Store>(key:K,value:Store[K]|((current:Store[K])=>Store[K])){
    setState(s=>({...s,[key]:typeof value==="function"?(value as (x:Store[K])=>Store[K])(s[key]):value}));
  },[]);
  const reset=useCallback(()=>setState(structuredClone(initialState)),[]);
  return <Context.Provider value={{state,patch,reset}}>{children}</Context.Provider>;
}
export function useApp():ContextValue{const value=useContext(Context);if(!value)throw new Error("Missing AppProvider");return value;}
