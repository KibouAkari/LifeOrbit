import { clearSession, currentUser, request, setAuthenticated, type SignedInUser } from "../data/api";
export async function restoreSession():Promise<SignedInUser|null>{
  try{const user=await currentUser();setAuthenticated(true);return user;}
  catch{clearSession();return null;}
}
export { clearSession, request };
