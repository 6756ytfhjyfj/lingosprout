// Deployment replaces this placeholder with SHA-256(gateway credential).
// The plaintext credential lives only in the web server's environment.
const gatewayHash='REPLACE_AT_DEPLOY_WITH_GATEWAY_SHA256';
const rpcNames=new Set(['lingosprout_read','lingosprout_cas','lingosprout_throttle','lingosprout_reserve_signup','lingosprout_release_signup','lingosprout_session','lingosprout_issue_session','lingosprout_logout','lingosprout_revoke_all','lingosprout_revoke_device','lingosprout_account_overview','lingosprout_settings','lingosprout_apply','lingosprout_admin_snapshot','lingosprout_admin_mutation','lingosprout_qr_start','lingosprout_qr_scan','lingosprout_qr_poll']);
// @ts-ignore Deno is provided by Supabase Edge, not the Next.js runtime.
Deno.serve(async(req:Request)=>{
 const deny=()=>Response.json({error:'Unauthorized'},{status:401});
 if(req.method!=='POST')return deny();
 const supplied=req.headers.get('x-lingosprout-key')??'';
 if(supplied.length<40||supplied.length>128)return deny();
 const hashed=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 let diff=hashed.length^gatewayHash.length;for(let i=0;i<hashed.length;i++)diff|=hashed.charCodeAt(i)^(gatewayHash.charCodeAt(i)||0);if(diff!==0)return deny();
 try {
  const raw=await req.text();if(raw.length>2000000)return Response.json({error:'Too large'},{status:413});
  const {resource,method,body}=JSON.parse(raw);
  const allowed=typeof resource==='string'&&((resource.startsWith('rest/v1/rpc/')&&rpcNames.has(resource.slice(12))&&method==='POST') || (/^rest\/v1\/subscriptions\?user_id=eq\.[0-9a-f-]{36}&select=status,source,expires_at$/.test(resource)&&method==='GET') || (resource==='auth/v1/admin/users'&&method==='POST') || (/^auth\/v1\/admin\/users\/[0-9a-f-]{36}$/.test(resource)&&method==='PUT'));
  if(!allowed)return Response.json({error:'Forbidden operation'},{status:403});
  // @ts-ignore Deno environment is supplied by Supabase.
  const base=Deno.env.get('SUPABASE_URL');
  // @ts-ignore New named secret keys, with legacy runtime key compatibility.
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');
  // @ts-ignore Never return runtime credentials in the response.
  const key=keys.default??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const response=await fetch(`${base}/${resource}`,{method,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  const responseBody=await response.text();
  // Do not forward tokens, cookies or server configuration from upstream headers.
  return new Response(responseBody||null,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Backend unavailable'},{status:503});}
});
