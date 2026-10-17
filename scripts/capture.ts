import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {answerQuestion,completeSession,emptyState,startLesson} from '../src/lib/learning';
async function main(){
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
await mkdir('screenshots',{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const page=await context.newPage();const state=emptyState();state.onboarded=true;
await page.addInitScript(s=>{localStorage.setItem('lingosprout.learning.v1',JSON.stringify(s));},state);
const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
await page.goto('http://127.0.0.1:3000');await page.getByRole('heading',{name:/每天一点/}).waitFor();await page.screenshot({path:'screenshots/desktop-learning.png',fullPage:true});await page.screenshot({path:'screenshots/desktop-preview.png'});
await page.getByRole('button',{name:'陪练',exact:true}).first().click();await page.screenshot({path:'screenshots/desktop-coach.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.locator('.mobile-nav').getByRole('button',{name:'学习',exact:true}).click();await page.screenshot({path:'screenshots/mobile-learning.png',fullPage:true});await page.screenshot({path:'screenshots/mobile-preview.png'});
await page.locator('.mobile-nav').getByRole('button',{name:'陪练',exact:true}).click();await page.screenshot({path:'screenshots/mobile-coach.png',fullPage:true});
await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'学习',exact:true}).first().click();
await page.getByRole('button',{name:'开始第一关',exact:true}).click();await page.getByRole('button',{name:'准备好，开始练习'}).click();
await page.locator('.answer-options').getByText('再见',{exact:true}).click();await page.getByRole('button',{name:'确认答案',exact:true}).click();await page.locator('.feedback-wrong').waitFor();
await page.screenshot({path:'screenshots/desktop-feedback.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'screenshots/mobile-feedback.png',fullPage:true});
let session=startLesson(state,'en-u1-l1');while(session.index<session.queue.length)session=answerQuestion(session,session.queue[session.index].correctAnswer).session;
const completed=completeSession(state,session).state;
const resultContext=await browser.newContext({viewport:{width:1440,height:1000}});const resultPage=await resultContext.newPage();
await resultPage.addInitScript(s=>localStorage.setItem('lingosprout.learning.v1',JSON.stringify(s)),completed);await resultPage.goto('http://127.0.0.1:3000');await resultPage.locator('.view-learn').waitFor();
await resultPage.evaluate(()=>{location.hash='result';});await resultPage.locator('.view-result h1').waitFor();await resultPage.screenshot({path:'screenshots/desktop-result.png',fullPage:true});
await resultPage.setViewportSize({width:390,height:844});await resultPage.screenshot({path:'screenshots/mobile-result.png',fullPage:true});
console.log(JSON.stringify({pageErrors:errors,desktop:'screenshots/desktop-learning.png',mobile:'screenshots/mobile-learning.png'}));
await browser.close();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
