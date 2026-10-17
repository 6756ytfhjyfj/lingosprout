import test from 'node:test';
import assert from 'node:assert/strict';
import { allLessons,curriculum,knowledgeById } from '../src/lib/curriculum';
import { addExpression,answerQuestion,canStartLesson,completeSession,dueReviews,emptyState,getStreak,localDate,normalizeAnswer,scheduleReview,startLesson,startReview,isCorrect } from '../src/lib/learning';
import type { Language,LearningState,PracticeSession } from '../src/lib/types';
function finish(session:PracticeSession,wrongFirst=false){let s=session;let safety=0;while(s.index<s.queue.length){const q=s.queue[s.index];s=answerQuestion(s,wrongFirst&&s.index===0?'故意答错':q.correctAnswer).session;if(++safety>100)throw new Error('loop');}return s;}
const now=new Date(2026,9,17,12,0);
test('three language-authored paths have four units, three lessons and six complete questions',()=>{
  assert.equal(allLessons.length,36);assert.equal(allLessons.reduce((n,l)=>n+l.questions.length,0),216);
  for(const [language,units] of Object.entries(curriculum)){assert.equal(units.length,4);for(const u of units){assert.equal(u.lessons.length,3);for(const lesson of u.lessons){assert.equal(lesson.questions.length,6);assert.ok(lesson.intro);for(const q of lesson.questions){assert.equal(q.language,language);assert.ok(q.explanation&&q.knowledgeId&&q.correctAnswer&&q.target&&q.meaning);assert.ok(q.acceptedAnswers.includes(q.correctAnswer));}}}}
  assert.match(curriculum.ja[0].lessons[0].intro,/不等于完整/);assert.match(curriculum.ko[0].lessons[2].intro,/尚未覆盖/);
});
test('a locked lesson cannot be started; completion gives 30 XP and unlocks only the next',()=>{
  const state=emptyState();assert.equal(canStartLesson(state,'en-u1-l2'),false);assert.throws(()=>startLesson(state,'en-u1-l2'));
  const {state:next,result}=completeSession(state,finish(startLesson(state,'en-u1-l1')),now);
  assert.equal(next.progress.en.xp,30);assert.equal(result.firstAccuracy,100);assert.equal(result.count,6);assert.equal(canStartLesson(next,'en-u1-l2'),true);assert.equal(canStartLesson(next,'en-u1-l3'),false);
  assert.equal(next.progress.ja.xp,0);assert.equal(next.progress.ko.xp,0);
});
test('each language can traverse all twelve lessons with independent completion',()=>{
  let state=emptyState();for(const language of ['en','ja','ko'] as Language[]){for(const lesson of curriculum[language].flatMap(u=>u.lessons))state=completeSession(state,finish(startLesson(state,lesson.id)),now).state;assert.equal(state.progress[language].xp,360);assert.equal(Object.keys(state.progress[language].completed).length,12);}
  assert.equal(state.studyDays.length,1);assert.equal(state.dailyXP[localDate(now)],1080);
});
test('wrong answers return later; accuracy excludes retries and knowledge deduplicates',()=>{
  const state=emptyState();let session=startLesson(state,'en-u1-l1');session=answerQuestion(session,'不是正确答案').session;
  assert.equal(session.queue[3].id,'en-u1-l1-q0');session=finish(session);
  const {state:next,result}=completeSession(state,session,now);
  assert.equal(result.firstAccuracy,83);assert.equal(result.count,7);assert.equal(result.retryCount,1);assert.equal(result.retryAccuracy,100);assert.equal(session.attempts.filter(a=>a.first).length,6);
  assert.equal(Object.keys(next.progress.en.reviews).length,3);assert.equal(result.weakIds.length,1);
  const review=next.progress.en.reviews[result.weakIds[0]];assert.equal(review.errors,1);assert.equal(review.mastery,'learning');assert.equal(review.nextReviewAt,new Date(now.getTime()+600000).toISOString());
});
test('retries never reclaim the first reward and repeated daily rewards cap at two',()=>{
  let state=emptyState();const rewards:number[]=[];
  for(let n=0;n<5;n++){const result=completeSession(state,finish(startLesson(state,'en-u1-l1')),now);state=result.state;rewards.push(result.result.xp);}
  assert.deepEqual(rewards,[30,2,2,0,0]);assert.equal(state.progress.en.xp,34);assert.equal(state.studyDays.length,1);
  assert.equal(state.progress.en.reviews['en-u1-l1-k0'].step,1);
});
test('same local day across languages checks in once; serialize/restore retains both languages',()=>{
  let state=emptyState();state=completeSession(state,finish(startLesson(state,'en-u1-l1')),now).state;
  state=completeSession(state,finish(startLesson(state,'ja-u1-l1')),now).state;
  const restored:LearningState=JSON.parse(JSON.stringify(state));assert.equal(restored.studyDays.length,1);assert.equal(restored.progress.en.xp,30);assert.equal(restored.progress.ja.xp,30);assert.equal(restored.progress.ko.xp,0);
});
test('answer normalization accepts case, spacing and terminal punctuation but preserves boundaries',()=>{
  assert.equal(normalizeAnswer('  GOOD   MORNING！ ','en'),'good morning');assert.equal(normalizeAnswer('I’m fine.','en'),"i'm fine");
  const q=curriculum.en[0].lessons[0].questions[4];assert.ok(isCorrect(q,' HELLO！ '));assert.ok(!isCorrect(q,'hell'));assert.ok(!isCorrect(q,'hello world'));
  assert.notEqual(normalizeAnswer('thankyou','en'),normalizeAnswer('thank you','en'));
  assert.notEqual(normalizeAnswer('아니오','ko'),normalizeAnswer('아니요','ko'));
  assert.notEqual(normalizeAnswer('か','ja'),normalizeAnswer('が','ja'));
});
test('spaced review extends 1/3/7/14 days and resets a wrong point to ten minutes',()=>{
  const k=knowledgeById['en-u1-l1-k0'];let review=scheduleReview(undefined,k,true,false,now);
  for(const days of [1,3,7,14]){assert.equal(Math.round((Date.parse(review.nextReviewAt)-now.getTime())/86400000),days);review=scheduleReview(review,k,true,true,now);}
  review=scheduleReview(review,k,false,true,now);assert.equal(review.step,0);assert.equal(review.consecutiveCorrect,0);assert.equal(review.errors,1);assert.equal(Date.parse(review.nextReviewAt)-now.getTime(),600000);assert.ok(review.lastReviewedAt);
});
test('review updates mastery and caps repeat review rewards',()=>{
  let state=completeSession(emptyState(),finish(startLesson(emptyState(),'en-u1-l1'),true),now).state;
  assert.equal(dueReviews(state,'en',new Date(now.getTime()+600001)).length,1);assert.equal(dueReviews(state,'ja',new Date(now.getTime()+600001)).length,0);
  const session=startReview(state,'en','all')!;const result=completeSession(state,finish(session),new Date(now.getTime()+86400000));state=result.state;
  assert.equal(result.result.xp,3);assert.ok(state.progress.en.reviews['en-u1-l1-k0'].lastReviewedAt);assert.equal(state.progress.en.reviews['en-u1-l1-k0'].consecutiveCorrect,1);
  const again=completeSession(state,finish(startReview(state,'en','all')!),new Date(now.getTime()+86400000));assert.equal(again.result.xp,0);
});
test('streak respects local calendar dates and yesterday until today has been studied',()=>{
  assert.equal(getStreak(['2026-10-15','2026-10-16'],now),2);assert.equal(getStreak(['2026-10-15','2026-10-16','2026-10-17'],now),3);assert.equal(getStreak(['2026-10-15'],now),0);
});
test('user expressions enter only their own language review and deduplicate',()=>{
  let state=addExpression(emptyState(),'ja','お水をください。','请给我水');state=addExpression(state,'ja','お水をください','请给我水');
  assert.equal(state.savedExpressions.length,0);assert.equal(Object.keys(state.progress.ja.reviews).length,1);assert.equal(Object.keys(state.progress.en.reviews).length,0);
  state=addExpression(state,'ko','좋은 하루 보내세요','祝您度过美好的一天');assert.equal(state.savedExpressions.length,1);assert.equal(Object.keys(state.progress.ko.reviews).length,1);
});
test('matching errors track the actual incorrect pairs instead of blaming the third point',()=>{
  let session=startLesson(emptyState(),'en-u1-l1');
  session=answerQuestion(session,session.queue[0].correctAnswer).session;session=answerQuestion(session,session.queue[1].correctAnswer).session;
  const q=session.queue[session.index];const [a,b,c]=q.pairs!;
  session=answerQuestion(session,JSON.stringify({[a.target]:b.meaning,[b.target]:a.meaning,[c.target]:c.meaning})).session;
  const result=completeSession(emptyState(),finish(session),now);
  assert.equal(result.state.progress.en.reviews[a.knowledgeId!].errors,1);assert.equal(result.state.progress.en.reviews[b.knowledgeId!].errors,1);
  assert.equal(result.state.progress.en.reviews[c.knowledgeId!].errors,0);assert.deepEqual(result.result.weakIds.sort(),[a.knowledgeId,b.knowledgeId].sort());
});
test('the same expression across lessons retains one canonical knowledge point',()=>{
  const first=curriculum.en[0].lessons[1].knowledge[1];const later=curriculum.en[3].lessons[2].knowledge[1];assert.equal(first.target,later.target);assert.equal(first.id,later.id);
});
