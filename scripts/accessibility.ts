import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright-core';
import {answerQuestion,completeSession,emptyState,startLesson} from '../src/lib/learning';
async function main(){
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();let state=emptyState();let session=startLesson(state,'en-u1-l1');
  while(session.index<session.queue.length)session=answerQuestion(session,session.queue[session.index].correctAnswer).session;
  state=completeSession(state,session).state;state.onboarded=true;
  await page.addInitScript(s=>localStorage.setItem('lingosprout.learning.v1',JSON.stringify(s)),state);
  const results=[];
  for(const view of ['learn','review','coach','profile','premium','pronunciation','result']){
    await page.goto(`http://127.0.0.1:3000/#${view}`);await page.locator(`.view-${view} h1`).first().waitFor();
    const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    results.push({view,violations:report.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,180)}))}))});
  }
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3000/#learn');await page.locator('.view-learn h1').waitFor();
  const mobile=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({view:'mobile-learn',violations:mobile.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,180)}))}))});
  await page.getByRole('button',{name:'你好，新朋友，已完成，可再次练习'}).click();await page.getByRole('button',{name:'准备好，开始练习'}).click();
  await page.locator('.answer-options').getByText('再见',{exact:true}).click();await page.getByRole('button',{name:'确认答案',exact:true}).click();await page.locator('.feedback-wrong').waitFor();
  for(const [name,width,height] of [['mobile-feedback',390,844],['desktop-feedback',1440,1000]] as const){
    await page.setViewportSize({width,height});const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({view:name,violations:report.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,180)}))}))});
  }
  console.log(JSON.stringify(results,null,2));await browser.close();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
