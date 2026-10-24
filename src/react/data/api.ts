/** Single HTTP boundary. API base points to the Python origin, not to /api. */
const BASE=(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/,"");
const TOKEN_KEY="lifeorbit_session";
export const hasSession=()=>Boolean(sessionStorage.getItem(TOKEN_KEY));
export const clearSession=()=>sessionStorage.removeItem(TOKEN_KEY);
export const saveSession=(value:string)=>sessionStorage.setItem(TOKEN_KEY,value);
export async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  const token=sessionStorage.getItem(TOKEN_KEY);
  let response:Response;
  try{
    response=await fetch(`${BASE}/api${path}`,{
      ...init,
      headers:{...(init.body?{"Content-Type":"application/json"}:{}),
        ...(token?{Authorization:`Bearer ${token}`}:{}),...init.headers}
    });
  }catch{throw new Error("Cannot reach the LifeOrbital API. Check the backend URL and CORS configuration.");}
  if(!response.ok){
    if(response.status===401&&token)clearSession();
    const body:unknown=await response.json().catch(()=>null);
    const detail=body&&typeof body==="object"&&"detail" in body?String(body.detail):`Request failed (${response.status})`;
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}
export interface SignedInUser{id:string;name:string;email:string;picture?:string|null}
export interface AuthResponse{access_token:string;token_type:string;expires_in:number;user:SignedInUser}
export const exchangeGoogleCredential=(token:string)=>request<AuthResponse>("/auth/google",{method:"POST",body:JSON.stringify({token})});
export const registerAccount=(name:string,email:string,password:string)=>request<AuthResponse>("/auth/register",{method:"POST",body:JSON.stringify({name,email,password})});
export const loginAccount=(email:string,password:string)=>request<AuthResponse>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
export const currentUser=()=>request<SignedInUser>("/auth/me");
