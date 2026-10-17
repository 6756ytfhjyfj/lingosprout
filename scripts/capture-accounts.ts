import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function main(){
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),...(process.env.TEST_BROWSER_ARGS?{args:JSON.parse(process.env.TEST_BROWSER_ARGS)}:{})});
 const base=process.env.TEST_BASE_URL??'http://127.0.0.1:3000';const reports=[];
 try {
  const visitor=await browser.newContext({viewport:{width:390,height:844}});const login=await visitor.newPage();await login.goto(`${base}/login`);await login.getByRole('button',{name:'注册账户',exact:true}).click();await login.getByRole('button',{name:'邮箱登录',exact:true}).click();
  if(process.env.VERIFY_LOCAL_STYLES==='true')await login.addStyleTag({path:'src/app/accounts.css'});
  await login.screenshot({path:'screenshots/login-mobile.png',fullPage:true});
  const report=await new AxeBuilder({page:login}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();reports.push({view:'login-mobile',violations:report.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});await visitor.close();
  if(process.env.TEST_ADMIN_STATE){
   const context=await browser.newContext({viewport:{width:1440,height:1000},storageState:process.env.TEST_ADMIN_STATE});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${base}/admin`);await page.locator('.admin-stat-grid').waitFor();
   if(process.env.VERIFY_LOCAL_STYLES==='true')await page.addStyleTag({path:'src/app/accounts.css'});
   for(const [name,width,height] of [['admin-desktop',1440,1000],['admin-mobile',390,844]] as const){await page.setViewportSize({width,height});await page.screenshot({path:`screenshots/${name}.png`,fullPage:true,mask:[page.locator('.admin-identity strong')],maskColor:'#e4ebdf'});const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();reports.push({view:name,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),violations:a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});}
   await page.getByRole('button',{name:'API 与站点',exact:true}).click();const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();reports.push({view:'admin-settings',violations:a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});
   await page.goto(`${base}/scan`);await page.getByRole('button',{name:'打开相机扫码'}).waitFor();if(process.env.VERIFY_LOCAL_STYLES==='true')await page.addStyleTag({path:'src/app/accounts.css'});await page.screenshot({path:'screenshots/scan-mobile.png',fullPage:true});const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();reports.push({view:'scan-mobile',violations:scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),errors});await context.close();
  }
  console.log(JSON.stringify(reports,null,2));if(reports.some(r=>r.violations.length))process.exitCode=1;
 }finally{await browser.close();}
}
main().catch(()=>{console.error('Account page capture failed; check the test session and service connection.');process.exitCode=1;});
