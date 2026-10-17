import {test,expect,type APIRequestContext} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import type {AdminSnapshot,AccountOverview} from '../../src/lib/account-types';
test.skip(!process.env.TEST_ADMIN_STATE,'Provide an ignored administrator storage state, never commit credentials.');
const password=`Qa-${randomUUID()}`;
const email=()=>`ls-qa-${randomUUID()}@example.com`;
async function post(ctx:APIRequestContext,path:string,data:unknown){try{const r=await ctx.post(path,{data,maxRetries:5});return {status:r.status(),body:await r.json()};}catch{throw new Error('Transport failure for '+path);}}
async function get(ctx:APIRequestContext,path:string){try{return await ctx.get(path,{maxRetries:5});}catch{throw new Error('Transport failure for '+path);}}

test('server controls applications, titles, roles, expiry and one-use QR login',async({playwright,baseURL,browser})=>{
 const admin=await playwright.request.newContext({baseURL,storageState:process.env.TEST_ADMIN_STATE});
 const user=await playwright.request.newContext({baseURL});const desktop=await playwright.request.newContext({baseURL});const stranger=await playwright.request.newContext({baseURL});
 const identity=email();
 try {
  expect((await get(admin,'/api/admin')).status()).toBe(200);
  const registered=await post(user,'/api/auth',{action:'signup',email:identity,password,role:'owner',premium:true});expect(registered.status).toBe(200);
  const initial=await(await get(user,'/api/status')).json();expect(initial.authenticated).toBe(true);expect(initial.role).toBe('member');expect(initial.subscription.status).toBe('free');
  expect((await get(user,'/api/admin')).status()).toBe(403);expect((await get(stranger,'/api/admin')).status()).toBe(401);
  expect((await post(user,'/api/admin',{action:'grant',userId:initial.id,expiresAt:new Date(Date.now()+86400000).toISOString()})).status).toBe(403);
  expect((await post(user,'/api/subscription',{action:'activate'})).status).toBe(403);
  const concurrent=await Promise.all([post(user,'/api/premium-applications',{message:'我想用日语练习旅行交流。'}),post(user,'/api/premium-applications',{message:'我想用英语练习餐厅点餐。'})]);
  expect(concurrent.map(x=>x.status).sort()).toEqual([200,400]);
  let overview=(await(await get(user,'/api/account')).json()) as AccountOverview;expect(overview.account.application_count).toBe(1);
  const first=overview.applications[0];expect((await post(admin,'/api/admin',{action:'reject',applicationId:first.id,note:'请补充练习目标。'})).status).toBe(200);
  expect((await post(user,'/api/premium-applications',{message:'我想每天练习日语酒店入住和点餐。'})).status).toBe(200);
  overview=await(await get(user,'/api/account')).json();const second=overview.applications[0];
  expect((await post(admin,'/api/admin',{action:'approve',applicationId:second.id,expiresAt:new Date(Date.now()-1000).toISOString()})).status).toBe(400);
  expect((await post(admin,'/api/admin',{action:'approve',applicationId:second.id,expiresAt:new Date(Date.now()+86400000).toISOString(),note:'期待你的进步。'})).status).toBe(200);
  expect((await post(admin,'/api/admin',{action:'approve',applicationId:second.id,expiresAt:new Date(Date.now()+86400000).toISOString()})).status).toBe(400);
  let premium=await(await get(user,'/api/status')).json();expect(premium.subscription.source).toBe('admin');expect(premium.limit).toBe(100);
  expect((await post(user,'/api/premium-applications',{message:'有效期内不应重复申请。'})).status).toBe(400);
  const snapshotResponse=await get(admin,'/api/admin');expect(snapshotResponse.status(),await snapshotResponse.text()).toBe(200);const snapshot=await snapshotResponse.json() as AdminSnapshot;const title=snapshot.titles[0];
  expect((await post(admin,'/api/admin',{action:'assign-title',userId:overview.account.id,titleId:title.id})).status).toBe(200);
  const titled=await(await get(user,'/api/status')).json();expect(titled.titles.some((t:{id:string})=>t.id===title.id)).toBe(true);expect(titled.role).toBe('member');
  const started=await post(user,'/api/chat',{action:'start',language:'ja',scene:'hotel',difficulty:'zero'});expect(started.status).toBe(200);
  expect((await post(user,'/api/chat',{action:'summary',sessionId:started.body.session.id,requestId:randomUUID()})).status).toBe(200);expect((await get(user,'/api/chat')).status()).toBe(200);
  expect((await post(admin,'/api/admin',{action:'grant',userId:overview.account.id,expiresAt:new Date(Date.now()+15000).toISOString()})).status).toBe(200);
  await new Promise(resolve=>setTimeout(resolve,16000));premium=await(await get(user,'/api/status')).json();expect(premium.subscription.status).toBe('free');expect(premium.limit).toBe(5);
  expect((await post(user,'/api/premium-applications',{message:'第三次申请，继续巩固基础日语。'})).status).toBe(200);overview=await(await get(user,'/api/account')).json();
  expect((await post(admin,'/api/admin',{action:'reject',applicationId:overview.applications[0].id,note:'测试完成'})).status).toBe(200);
  expect((await post(user,'/api/premium-applications',{message:'第四次申请必须被服务端阻止。'})).status).toBe(400);overview=await(await get(user,'/api/account')).json();expect(overview.account.application_count).toBe(3);
  // QR requester and confirming device have independent browser cookie jars.
  const qr=await post(desktop,'/api/scan',{action:'start'});expect(qr.status).toBe(200);const params=new URLSearchParams(new URL(qr.body.url).hash.slice(1));const challenge={id:qr.body.id,token:params.get('token')};
  expect((await post(stranger,'/api/scan',{action:'inspect',...challenge})).status).toBe(401);
  expect([400,401]).toContain((await post(stranger,'/api/scan',{action:'poll',id:qr.body.id})).status);
  expect((await post(user,'/api/scan',{action:'inspect',...challenge,token:'a'.repeat(43)})).status).toBe(400);
  const inspected=await post(user,'/api/scan',{action:'inspect',...challenge});expect(inspected.status).toBe(200);expect(inspected.body.code).toBe(qr.body.code);
  expect((await post(user,'/api/scan',{action:'approve',...challenge})).status).toBe(200);
  expect((await post(user,'/api/scan',{action:'approve',...challenge})).status).toBe(400);
  const polls=await Promise.all([post(desktop,'/api/scan',{action:'poll',id:qr.body.id}),post(desktop,'/api/scan',{action:'poll',id:qr.body.id})]);expect(polls.filter(p=>p.body.status==='authenticated')).toHaveLength(1);
  const desktopStatus=await(await get(desktop,'/api/status')).json();expect(desktopStatus.email).toBe(identity);
  const stolen=await desktop.storageState();const sessionOnly=await playwright.request.newContext({baseURL,storageState:{cookies:stolen.cookies.filter(c=>c.name==='ls_session'),origins:[]}});expect((await get(sessionOnly,'/api/account')).status()).toBe(401);await sessionOnly.dispose();
  const desktopOverview=await(await get(desktop,'/api/account')).json() as AccountOverview;const current=desktopOverview.devices.find(d=>d.current)!;
  expect((await post(user,'/api/account',{action:'revoke-device',deviceId:current.id})).status).toBe(200);expect((await get(desktop,'/api/account')).status()).toBe(401);
  // Browser renders private management pages and the scanner's camera fallback.
  const adminContext=await browser.newContext({storageState:process.env.TEST_ADMIN_STATE});const page=await adminContext.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${baseURL}/admin`);await expect(page.getByRole('heading',{name:'总览',exact:true})).toBeVisible();await page.getByRole('button',{name:'API 与站点',exact:true}).click();await expect(page.getByLabel('DeepSeek API 密钥')).toHaveValue('');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await adminContext.close();
  const phoneContext=await browser.newContext({storageState:await user.storageState()});const phone=await phoneContext.newPage();await phone.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))});});
  await phone.goto(`${baseURL}/scan`);await phone.getByRole('button',{name:'打开相机扫码'}).click();await expect(phone.getByText('无法打开相机，请允许相机权限，或粘贴本站二维码链接。')).toBeVisible();await phoneContext.close();
 } finally {await Promise.all([user,desktop,stranger,admin].map(c=>c.dispose()));}
});

test('one browser can register ten accounts and the eleventh is rejected',async({playwright,baseURL})=>{
 const device=await playwright.request.newContext({baseURL});
 try{let first='';for(let i=0;i<10;i++){const e=email();if(i===0)first=e;const response=await post(device,'/api/auth',{action:'signup',email:e,password});expect(response.status,`registration ${i+1}: ${JSON.stringify(response.body)}`).toBe(200);}
 const blocked=await post(device,'/api/auth',{action:'signup',email:email(),password});expect(blocked.status).toBe(400);expect(blocked.body.error).toContain('10 个账号');
 expect((await post(device,'/api/auth',{action:'logout'})).status).toBe(200);
 expect((await post(device,'/api/auth',{action:'login',email:first,password})).status).toBe(200);
 }finally{await device.dispose();}
});

test('API configuration stays private and disabled accounts lose existing sessions',async({playwright,baseURL})=>{
 const admin=await playwright.request.newContext({baseURL,storageState:process.env.TEST_ADMIN_STATE});const user=await playwright.request.newContext({baseURL});
 const snapshot=await(await get(admin,'/api/admin')).json() as AdminSnapshot;test.skip(snapshot.settings.keyConfigured,'Do not replace an operator-configured real API key.');
 const fakeKey=`sk-qa-invalid-${randomUUID()}`;let userId='';
 try {
  const signup=await post(user,'/api/auth',{action:'signup',email:email(),password});expect(signup.status).toBe(200);const overview=await(await get(user,'/api/account')).json() as AccountOverview;userId=overview.account.id;
  const configured=await post(admin,'/api/admin',{action:'settings',...snapshot.settings,freeLimit:7,premiumLimit:121,apiKey:fakeKey});expect(configured.status).toBe(200);
  const safe=await(await get(admin,'/api/admin')).json();expect(JSON.stringify(safe)).not.toContain(fakeKey);expect(safe.settings.keyConfigured).toBe(true);expect(safe.settings.encryptedKey).toBeUndefined();
  const status=await(await get(user,'/api/status')).json();expect(status.demo).toBe(false);expect(status.limit).toBe(7);expect(JSON.stringify(status)).not.toContain(fakeKey);
  const chat=await post(user,'/api/chat',{action:'start',language:'en',scene:'meet',difficulty:'zero'});expect(chat.status).toBe(200);const before=await(await get(user,'/api/status')).json();
  const failed=await post(user,'/api/chat',{action:'message',sessionId:chat.body.session.id,requestId:randomUUID(),text:'Hello'});expect([502,504]).toContain(failed.status);const after=await(await get(user,'/api/status')).json();expect(after.used).toBe(before.used);
  expect((await post(admin,'/api/admin',{action:'role',userId,role:'admin'})).status).toBe(200);expect((await get(user,'/api/admin')).status()).toBe(200);
  expect((await post(user,'/api/admin',{action:'role',userId,role:'member'})).status).toBe(400);
  expect((await post(admin,'/api/admin',{action:'role',userId,role:'member'})).status).toBe(200);expect((await get(user,'/api/admin')).status()).toBe(403);
  expect((await post(admin,'/api/admin',{action:'disable',userId,disabled:true})).status).toBe(200);expect((await get(user,'/api/account')).status()).toBe(401);
 }finally{await post(admin,'/api/admin',{action:'settings',...snapshot.settings,clearKey:true});await Promise.all([admin.dispose(),user.dispose()]);}
});

test('SCAN browser confirmation signs in the requesting browser without copying the phone token',async({browser,baseURL})=>{
 const desktop=await browser.newContext();const phone=await browser.newContext({storageState:process.env.TEST_ADMIN_STATE});
 try {
  const computerPage=await desktop.newPage();await computerPage.goto(`${baseURL}/login`);await computerPage.getByRole('button',{name:'扫码登录',exact:true}).click();
  const created=computerPage.waitForResponse(r=>r.url().endsWith('/api/scan')&&r.request().postDataJSON()?.action==='start');
  await computerPage.getByRole('button',{name:'生成登录二维码'}).click();const challenge=await(await created).json();expect(challenge.url).toContain('/scan#');
  await expect(computerPage.getByAltText('用 LingoSproutSCAN 扫描此登录二维码')).toBeVisible();
  const phonePage=await phone.newPage();try{await phonePage.goto(challenge.url);}catch{throw new Error('The confirmation page could not be reached.');}
  await expect(phonePage.locator('.confirmation-code')).toHaveText(challenge.code,{timeout:35000});expect(new URL(phonePage.url()).hash).toBe('');
  await phonePage.getByRole('button',{name:'确认登录',exact:true}).click();await expect(phonePage.getByRole('heading',{name:'操作完成'})).toBeVisible();
  await expect.poll(async()=>(await(await get(desktop.request,'/api/status')).json()).authenticated,{timeout:20000}).toBe(true);
  const phoneToken=(await phone.cookies()).find(c=>c.name==='ls_session')?.value;const desktopToken=(await desktop.cookies()).find(c=>c.name==='ls_session')?.value;expect(desktopToken).toBeTruthy();expect(desktopToken).not.toBe(phoneToken);
 }finally{await post(desktop.request,'/api/auth',{action:'logout'}).catch(()=>{});await Promise.all([desktop.close(),phone.close()]);}
});
