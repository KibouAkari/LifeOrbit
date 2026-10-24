/** API requests use same-origin HttpOnly authentication cookies, never browser tokens. */
const BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/$/,"");
let authenticated=false;
export const hasSession=()=>authenticated;
export const clearSession=()=>{authenticated=false;};
export const saveSession=(_value:string)=>{authenticated=true;};
export const setAuthenticated=(value:boolean)=>{authenticated=value;};
export async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  let response:Response;
  try{
    response=await fetch(`${BASE}/api${path}`,{
      ...init,credentials:"same-origin",headers:{
        ...(init.body?{"Content-Type":"application/json"}:{}),...init.headers
      }
    });
  }catch{throw new Error("Cannot reach LifeOrbital. Please check your connection.");}
  if(!response.ok){
    if(response.status===401)authenticated=false;
    const body:unknown=await response.json().catch(()=>null);
    const detail=body&&typeof body==="object"&&"detail" in body?String(body.detail):`Request failed (${response.status})`;
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}
export interface SignedInUser{id:string;name:string;email:string;picture?:string|null}
export interface AuthResponse{user:SignedInUser;expires_in:number}
export const exchangeGoogleCredential=(token:string)=>request<AuthResponse>("/auth/google",{method:"POST",body:JSON.stringify({token})});
export const registerAccount=(name:string,email:string,password:string)=>request<AuthResponse>("/auth/register",{method:"POST",body:JSON.stringify({name,email,password})});
export const loginAccount=(email:string,password:string)=>request<AuthResponse>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
export const currentUser=()=>request<SignedInUser>("/auth/me");
export const signOut=()=>request<{signed_out:boolean}>("/auth/logout",{method:"POST"});
