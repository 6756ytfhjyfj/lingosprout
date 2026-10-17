import assert from 'node:assert/strict';
async function main(){
  const root=process.env.PRODUCTION_TEST_URL??'http://127.0.0.1:3001';
  const page=await fetch(root);assert.equal(page.status,200);
  const status=await (await fetch(`${root}/api/status`)).json();assert.equal(status.canDemoSubscribe,false);assert.equal(status.subscription.status,'free');
  const post=(path:string,data:unknown)=>fetch(`${root}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:root,Cookie:'ls_guest=guest-11111111-1111-4111-8111-111111111111'},body:JSON.stringify(data)});
  const subscribe=await post('/api/subscription',{action:'activate',premium:true});assert.equal(subscribe.status,403);const denied=await subscribe.json();assert.match(denied.error,/管理员/);
  const chat=await post('/api/chat',{action:'start',language:'en',scene:'meet',difficulty:'zero',premium:true,subscription:{status:'active',source:'payment'},limit:100000});assert.equal(chat.status,401);
  console.log(JSON.stringify({home:page.status,canDemoSubscribe:status.canDemoSubscribe,forcedDemoActivation:subscribe.status,forgedPremiumChat:chat.status,productionGuards:'PASS'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
