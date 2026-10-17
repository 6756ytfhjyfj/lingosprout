import { test,expect,chromium,type Page } from '@playwright/test';
import { curriculum,knowledgeById } from '../../src/lib/curriculum';
import type { Language,LearningState,Question } from '../../src/lib/types';
const key='lingosprout.learning.v1';
async function onboard(page:Page,language:Language='en'){
  await page.goto('/');await page.getByRole('button',{name:new RegExp(`${({en:'英语',ja:'日语',ko:'韩语'})[language]}.*入门体验`)}).click();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'继续',exact:true}).click();
  await page.getByRole('button',{name:'开始我的成长之旅'}).click();await expect(page.getByRole('heading',{name:/每天一点，世界近一点/})).toBeVisible();
}
async function stored(page:Page):Promise<LearningState>{return page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);}
async function begin(page:Page){await page.getByRole('button',{name:'开始第一关',exact:true}).click();await page.getByRole('button',{name:'准备好，开始练习'}).click();await expect(page.locator('.practice-screen')).toBeVisible();}
async function answer(page:Page,q:Question,wrong=false){
  if(q.type==='choice'||q.type==='listen')await page.locator('.answer-options').getByText(wrong?q.options.find(x=>x!==q.correctAnswer)!:q.correctAnswer,{exact:true}).click();
  else if(q.type==='fill')await page.getByLabel('你的答案').fill(wrong?'错误示例':q.correctAnswer);
  else if(q.type==='order')for(const token of knowledgeById[q.knowledgeId].tokens)await page.locator('.word-bank').getByRole('button',{name:token,exact:true}).first().click();
  else if(q.type==='match')for(const pair of q.pairs!){await page.locator('.matching-columns>div').nth(0).getByRole('button',{name:pair.target,exact:true}).click();await page.locator('.matching-columns>div').nth(1).getByRole('button',{name:pair.meaning,exact:true}).click();}
  await page.getByRole('button',{name:'确认答案'}).click();await expect(page.locator('.feedback-title')).toContainText(wrong?'再认识它一次':'答对啦');
  await page.locator('.practice-footer .button-primary').click();
}
for(const language of ['en','ja','ko'] as Language[])test(`new ${language} user completes six questions and persists progress`,async({page})=>{
  await onboard(page,language);await begin(page);const lesson=curriculum[language][0].lessons[0];for(const q of lesson.questions)await answer(page,q);
  await expect(page.getByRole('heading',{name:'第一颗小种子，种下啦！'})).toBeVisible();let state=await stored(page);expect(state.progress[language].xp).toBe(30);expect(state.studyDays).toHaveLength(1);
  await page.reload();await expect(page.getByRole('heading',{name:/每天一点，世界近一点/})).toBeVisible();state=await stored(page);expect(state.progress[language].xp).toBe(30);
  const errors=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);expect(errors).toBe(false);
});
test('wrong answer, retry accuracy, language isolation, shared check-in and review update',async({page})=>{
  await onboard(page);await begin(page);let first=true;
  for(let guard=0;guard<10;guard++){
    if(await page.locator('.result-page').count())break;
    const state=await stored(page);const q=state.draft!.queue[state.draft!.index];await answer(page,q,first);first=false;
  }
  await expect(page.locator('.result-stats')).toContainText('83%');let state=await stored(page);expect(state.progress.en.reviews['en-u1-l1-k0'].errors).toBe(1);
  await page.getByRole('button',{name:'切换或添加学习语言'}).click();await page.locator('.language-manager').getByRole('button',{name:/日语/}).click();await page.getByRole('button',{name:'继续下一小步'}).click();await begin(page);
  for(const q of curriculum.ja[0].lessons[0].questions)await answer(page,q);
  state=await stored(page);expect(state.studyDays).toHaveLength(1);expect(state.progress.en.xp).toBe(30);expect(state.progress.ja.xp).toBe(30);
  await page.getByRole('button',{name:'切换或添加学习语言'}).click();await page.locator('.language-manager').getByRole('button',{name:/英语/}).click();
  await page.getByRole('button',{name:'看看复习安排'}).click();await page.getByRole('tab',{name:'错题强化 1'}).click();await page.getByRole('button',{name:'开始错题强化'}).click();
  state=await stored(page);await answer(page,state.draft!.queue[0]);await expect(page.getByRole('heading',{name:'熟悉，又多了一点。'})).toBeVisible();state=await stored(page);expect(state.progress.en.reviews['en-u1-l1-k0'].lastReviewedAt).toBeTruthy();
});
test('exit confirmation saves submitted progress and resumes after refresh',async({page})=>{
  await onboard(page);await begin(page);await answer(page,curriculum.en[0].lessons[0].questions[0]);
  await page.getByRole('button',{name:'退出本次练习'}).click();await page.getByRole('button',{name:'保留进度并退出'}).click();await page.reload();
  await page.getByRole('button',{name:'继续上次练习',exact:true}).click();await expect(page.getByRole('heading',{name:'哪一个表示「早上好」？'})).toBeVisible();expect((await stored(page)).draft!.index).toBe(1);
});
test('no voices and microphone denial have explicit fallbacks and do not block learning',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window.speechSynthesis,'getVoices',{value:()=>[]});
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))});
  });
  await onboard(page);await page.getByRole('button',{name:/开口，就是进步/}).click();await expect(page.getByText(/此设备暂无英语语音/)).toBeVisible();
  await page.getByRole('button',{name:'开始录音',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'麦克风权限被拒绝'})).toBeVisible();
  await page.getByRole('button',{name:'学习',exact:true}).first().click();await begin(page);await expect(page.getByRole('heading',{name:'选出它的中文意思'})).toBeVisible();
});
test('mobile navigation and widths fit 390px, including coach and Premium',async({page})=>{
  await page.setViewportSize({width:390,height:844});await onboard(page);await page.screenshot({path:'screenshots/mobile-learning.png',fullPage:true});
  await expect(page.locator('.mobile-nav')).toBeVisible();
  for(const name of ['复习','陪练','我的']){await page.locator('.mobile-nav').getByRole('button',{name,exact:true}).click();await expect(page.locator('main h1').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.getByRole('button',{name:/语芽 Premium/}).click();await expect(page.getByRole('heading',{name:/让每一句/})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('demo coach uses server scenario/settings, translations, hints, expression saving and summary',async({page})=>{
  await onboard(page,'ja');await page.getByRole('button',{name:'陪练',exact:true}).first().click();await page.getByRole('button',{name:/餐厅点餐 一杯茶的对话/}).click();
  await page.getByRole('button',{name:'有点基础 · 多聊一点'}).click();
  const started=page.waitForResponse(r=>r.url().endsWith('/api/chat')&&r.request().postDataJSON()?.action==='start');await page.getByRole('button',{name:'开始这场小对话'}).click();
  const body=await (await started).json();expect(body.session.language).toBe('ja');expect(body.session.scene).toBe('restaurant');expect(body.session.difficulty).toBe('some');expect(body.session.demo).toBe(true);
  await page.getByRole('button',{name:'查看翻译'}).first().click();await expect(page.locator('.message-translation')).toContainText('欢迎光临');
  await page.getByLabel('我的陪练消息').fill('お茶をください。');await page.getByRole('button',{name:'发送消息'}).click();await expect(page.locator('.chat-message.user')).toHaveCount(1);
  await page.locator('.expression-details summary').first().click();await page.getByRole('button',{name:/将お茶をください。加入复习/}).click();expect(Object.keys((await stored(page)).progress.ja.reviews).length).toBe(1);
  await page.getByRole('button',{name:'给我一个提示'}).click();await expect(page.locator('.chat-message.assistant')).toHaveCount(3);
});
test('active recording produces a local playback URL and stops microphone tracks on exit',async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  try{
    const context=await browser.newContext({permissions:['microphone']});const page=await context.newPage();
    await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);(window as Window&{testStream?:MediaStream}).testStream=stream;return stream;};});
    await onboard(page);
    await page.getByRole('button',{name:/开口，就是进步/}).click();await page.getByRole('button',{name:'开始录音',exact:true}).click();
    await expect(page.getByText(/录音中 ·/)).toBeVisible();await page.getByRole('button',{name:'停止录音',exact:true}).first().click();
    await expect(page.locator('audio')).toBeVisible();expect(await page.locator('audio').getAttribute('src')).toMatch(/^blob:/);
    expect(await page.evaluate(()=>(window as Window&{testStream?:MediaStream}).testStream!.getTracks().every(t=>t.readyState==='ended'))).toBe(true);
    await page.getByRole('button',{name:'清除录音'}).click();await expect(page.locator('audio')).toHaveCount(0);
    await page.getByRole('button',{name:'开始录音',exact:true}).click();await expect(page.getByText(/录音中 ·/)).toBeVisible();
    await page.getByRole('button',{name:'学习',exact:true}).first().click();await expect(page.getByRole('heading',{name:/每天一点/})).toBeVisible();
    expect(await page.evaluate(()=>(window as Window&{testStream?:MediaStream}).testStream!.getTracks().every(t=>t.readyState==='ended'))).toBe(true);expect(JSON.stringify(await stored(page))).not.toContain('blob:');await context.close();
  }finally{await browser.close();}
});
test('failed chat requests keep the retry ID and charge exactly once after recovery',async({page})=>{
  await onboard(page);await page.getByRole('button',{name:'陪练',exact:true}).first().click();await page.getByRole('button',{name:'开始这场小对话'}).click();
  await expect(page.getByLabel('我的陪练消息')).toBeVisible();
  const ids:string[]=[];let fail=true;
  await page.route('**/api/chat',async route=>{const data=route.request().postDataJSON();if(data?.action==='message'){ids.push(data.requestId);if(fail){fail=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'AI 服务暂时不可用，本次未扣额度。请重试。'})});return;}}await route.continue();});
  await page.getByLabel('我的陪练消息').fill('Hello');await page.getByRole('button',{name:'发送消息'}).click();await expect(page.getByRole('button',{name:'重试上次请求'})).toBeVisible();expect((await (await page.request.get('/api/status')).json()).used).toBe(0);
  await page.getByRole('button',{name:'重试上次请求'}).click();await expect(page.locator('.chat-message.user')).toHaveCount(1);expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1]);expect((await (await page.request.get('/api/status')).json()).used).toBe(1);
});
test('visual feedback appears only after submit and reserves the measured footer height',async({page})=>{
  await page.setViewportSize({width:390,height:844});await onboard(page);await begin(page);
  await expect(page.locator('.answer-correct,.answer-incorrect')).toHaveCount(0);
  const q=curriculum.en[0].lessons[0].questions[0];await page.locator('.answer-options').getByText(q.options.find(x=>x!==q.correctAnswer)!,{exact:true}).click();
  await expect(page.locator('.answer-correct')).toHaveCount(0);await page.getByRole('button',{name:'确认答案'}).click();
  await expect(page.locator('.answer-correct')).toHaveCount(1);await expect(page.locator('.answer-incorrect')).toHaveCount(1);
  await expect.poll(()=>page.evaluate(()=>{const screen=document.querySelector('.practice-screen')!;const footer=document.querySelector('.practice-footer')!;return parseFloat(getComputedStyle(screen).paddingBottom)>=footer.getBoundingClientRect().height+31;})).toBe(true);
});
test('review category tabs support arrow keys with an associated panel',async({page})=>{
  await onboard(page);await page.getByRole('button',{name:'复习',exact:true}).first().click();const due=page.getByRole('tab',{name:'到期复习 0'});await due.focus();await page.keyboard.press('ArrowRight');
  const errors=page.getByRole('tab',{name:'错题强化 0'});await expect(errors).toBeFocused();await expect(errors).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby',await errors.getAttribute('id') as string);
  await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'全部知识点 0'})).toBeFocused();
});
