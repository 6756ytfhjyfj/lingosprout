import { curriculum, knowledgeById, lessonById, reviewQuestion } from './curriculum';
import type { Attempt, Knowledge, Language, LearningState, LessonResult, PracticeSession, Question, ReviewState } from './types';

export const STORAGE_KEY = 'lingosprout.learning.v1';
export const intervals = [0, 1, 3, 7, 14] as const;
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function emptyState(): LearningState {
  return { version: 1, onboarded: false, activeLanguage: 'en', languages: ['en'],
    profile: { name: '小小探索家', level: 'zero', goal: 'daily', dailyGoal: 40, reading: true },
    progress: { en: { xp: 0, completed: {}, reviews: {} }, ja: { xp: 0, completed: {}, reviews: {} }, ko: { xp: 0, completed: {}, reviews: {} } },
    studyDays: [], dailyXP: {}, rewardCounts: {}, attempts: [], draft: null, lastResult: null, savedExpressions: [] };
}
export function normalizeAnswer(value: string, language: Language): string {
  let normalized = value.normalize('NFKC').trim().replace(/[‘’]/g,"'").replace(/[“”]/g, '"').replace(/\s+/g,' ');
  // Accept conventional sentence-final punctuation; retain internal punctuation,
  // apostrophes, letters and word boundaries ("thankyou" is not "thank you").
  normalized = normalized.replace(/[.!?。！？、，,]+$/u, '').trim();
  if (language === 'en') normalized = normalized.toLocaleLowerCase('en-US');
  if (language === 'ja') normalized = normalized.replace(/\s/g, '');
  return normalized;
}
export function isCorrect(question: Question, answer: string): boolean {
  if(question.type==='match' && answer!=='matched') {
    try {const pairs=JSON.parse(answer);return question.pairs!.every(p=>pairs[p.target]===p.meaning);} catch {return false;}
  }
  return question.acceptedAnswers.some(a => normalizeAnswer(a,question.language) === normalizeAnswer(answer,question.language));
}
export function getStreak(days: string[], now = new Date()): number {
  const set = new Set(days); const cursor = new Date(now);
  if (!set.has(localDate(cursor))) cursor.setDate(cursor.getDate()-1);
  let count=0;
  while (set.has(localDate(cursor))) { count++; cursor.setDate(cursor.getDate()-1); }
  return count;
}
export function dueReviews(state: LearningState, language: Language, now = new Date()): ReviewState[] {
  return Object.values(state.progress[language].reviews).filter(r => new Date(r.nextReviewAt).getTime() <= now.getTime()).sort((a,b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
}
export function lookupKnowledge(state: LearningState, id: string): Knowledge | undefined {
  return knowledgeById[id] ?? state.savedExpressions.find(k => k.id === id);
}
export function scheduleReview(previous: ReviewState | undefined, k: Knowledge, correct: boolean, isReview: boolean, now: Date): ReviewState {
  const streak = correct ? (previous?.consecutiveCorrect ?? 0) + 1 : 0;
  const step = correct ? Math.min(4,(previous?.step ?? 0)+1) : 0;
  const next = new Date(now);
  if (correct) next.setDate(next.getDate()+intervals[step]); else next.setMinutes(next.getMinutes()+10);
  return { knowledgeId: k.id, language: k.language,
    lastLearnedAt: isReview ? (previous?.lastLearnedAt ?? now.toISOString()) : now.toISOString(),
    lastReviewedAt: isReview ? now.toISOString() : (previous?.lastReviewedAt ?? null),
    nextReviewAt: next.toISOString(), errors: (previous?.errors ?? 0)+(correct ? 0 : 1), consecutiveCorrect: streak,
    mastery: !correct ? 'learning' : step >= 4 ? 'solid' : step >= 2 ? 'familiar' : 'new', step };
}
export function startLesson(state: LearningState, lessonId: string): PracticeSession {
  const lesson = lessonById[lessonId];
  if (!lesson || !canStartLesson(state,lessonId)) throw new Error('请先完成前一关。');
  return { id: crypto.randomUUID(), language: lesson.language, mode: 'lesson', lessonId, queue: structuredClone(lesson.questions), index: 0,
    attempts: [], initialCount: lesson.questions.length, retryIds: [], reviewIds: [], startedAt: new Date().toISOString() };
}
export function canStartLesson(state: LearningState, lessonId: string): boolean {
  const lesson = lessonById[lessonId]; if (!lesson) return false;
  const list = curriculum[lesson.language].flatMap(u => u.lessons); const index = list.findIndex(l => l.id === lessonId);
  return index === 0 || Boolean(state.progress[lesson.language].completed[list[index-1].id]);
}
export function nextLesson(state: LearningState, language: Language) {
  const lessons = curriculum[language].flatMap(u=>u.lessons);
  return lessons.find(l => !state.progress[language].completed[l.id]) ?? lessons[lessons.length-1];
}
export function startReview(state: LearningState, language: Language, mode: 'due' | 'errors' | 'all'): PracticeSession | null {
  const all = Object.values(state.progress[language].reviews);
  const selected = (mode === 'due' ? dueReviews(state,language) : mode === 'errors' ? all.filter(r=>r.errors>0) : all)
    .slice(0,10).map(r=>lookupKnowledge(state,r.knowledgeId)).filter((k): k is Knowledge => Boolean(k));
  if (!selected.length) return null;
  const queue = selected.map(reviewQuestion);
  return { id: crypto.randomUUID(), language, mode: 'review', lessonId: 'review', queue, index: 0, attempts: [], initialCount: queue.length,
    retryIds: [], reviewIds: selected.map(k=>k.id), startedAt: new Date().toISOString() };
}
export function answerQuestion(session: PracticeSession, answer: string, now=new Date()): { session: PracticeSession; correct: boolean; attempt: Attempt } {
  const next = structuredClone(session); const question=next.queue[next.index]; const correct=isCorrect(question,answer);
  const first = !next.attempts.some(a=>a.questionId===question.id);
  const attempt: Attempt = { questionId:question.id,knowledgeId:question.knowledgeId,answer,correct,first,at:now.toISOString() };
  if(question.type==='match') {
    let pairs:Record<string,string>={};try{pairs=JSON.parse(answer);}catch{}
    attempt.knowledgeIds=question.pairs!.map(p=>p.knowledgeId??question.knowledgeId);
    attempt.incorrectKnowledgeIds=correct?[]:question.pairs!.filter(p=>pairs[p.target]!==p.meaning).map(p=>p.knowledgeId??question.knowledgeId);
  }
  next.attempts.push(attempt);
  if (!correct) {
    // Insert after two other questions whenever possible. Unlimited retries;
    // each attempt is still recorded independently of first-attempt accuracy.
    next.queue.splice(Math.min(next.index+3,next.queue.length),0,structuredClone(question));
    for(const id of attempt.incorrectKnowledgeIds??[question.knowledgeId])if(!next.retryIds.includes(id))next.retryIds.push(id);
  }
  next.index++;
  return {session:next,correct,attempt};
}
export function completeSession(state: LearningState, session: PracticeSession, now = new Date()): {state: LearningState; result: LessonResult} {
  if (session.index < session.queue.length) throw new Error('请完成本组练习。');
  const next=structuredClone(state); const language=session.language; const progress=next.progress[language]; const date=localDate(now);
  const firstAttempts=session.attempts.filter(a=>a.first); const first=session.mode==='lesson' && !progress.completed[session.lessonId];
  let xp=0;
  if (session.mode==='lesson') {
    const key=`repeat:${date}:${session.lessonId}`;
    if (first) xp=30;
    else if ((next.rewardCounts[key]??0)<2) {xp=2;next.rewardCounts[key]=(next.rewardCounts[key]??0)+1;}
  } else {
    const unrewarded=session.reviewIds.filter(id=>!next.rewardCounts[`review:${date}:${id}`]);
    const dailyKey=`review-total:${date}`;
    xp=Math.min(unrewarded.length,Math.max(0,10-(next.rewardCounts[dailyKey]??0)));
    unrewarded.forEach(id=>next.rewardCounts[`review:${date}:${id}`]=1);
    next.rewardCounts[dailyKey]=(next.rewardCounts[dailyKey]??0)+xp;
  }
  const knowledge=session.mode==='lesson' ? lessonById[session.lessonId].knowledge : session.reviewIds.map(id=>lookupKnowledge(next,id)).filter((k): k is Knowledge=>Boolean(k));
  for (const k of knowledge) {
    const related=session.attempts.filter(a=>a.knowledgeIds?.includes(k.id)||a.knowledgeId===k.id);
    const correct=!related.some(a=>a.incorrectKnowledgeIds?a.incorrectKnowledgeIds.includes(k.id):!a.correct);
    // A repeated lesson cannot accelerate a point's interval several times/day.
    const old=progress.reviews[k.id];
    if (session.mode==='lesson' && !first && old && correct) continue;
    progress.reviews[k.id]=scheduleReview(old,k,correct,session.mode==='review',now);
    const errorCount=related.filter(a=>a.incorrectKnowledgeIds?a.incorrectKnowledgeIds.includes(k.id):!a.correct).length;
    progress.reviews[k.id].errors=(old?.errors??0)+errorCount;
  }
  const retryAttempts=session.attempts.filter(a=>!a.first);
  const result: LessonResult={lessonId:session.lessonId,firstAccuracy:Math.round(firstAttempts.filter(a=>a.correct).length/Math.max(1,session.initialCount)*100),
    retryCount:retryAttempts.length,retryAccuracy:retryAttempts.length?Math.round(retryAttempts.filter(a=>a.correct).length/retryAttempts.length*100):null,
    count:session.attempts.length,xp,first,weakIds:[...new Set(session.retryIds)],at:now.toISOString()};
  if(first) progress.completed[session.lessonId]=result;
  progress.xp+=xp;
  if(!next.studyDays.includes(date)) next.studyDays.push(date);
  next.dailyXP[date]=(next.dailyXP[date]??0)+xp;
  next.attempts=[...next.attempts,...session.attempts].slice(-3000);
  next.lastResult=result;next.draft=null;
  return {state:next,result};
}
export function addExpression(state:LearningState, language:Language,target:string,meaning:string):LearningState {
  const normalized=normalizeAnswer(target,language);
  const existing=[...Object.values(knowledgeById),...state.savedExpressions].find(k=>k.language===language && normalizeAnswer(k.target,language)===normalized);
  const next=structuredClone(state);
  const k:Knowledge=existing??{id:`expression-${crypto.randomUUID()}`,language,target,meaning,reading:'',hint:'来自陪练的自选表达；可到跟读页练习。',
    explanation:meaning,difficulty:2,tokens:[target],acceptedAnswers:[target]};
  if(!existing) next.savedExpressions.push(k);
  if(!next.progress[language].reviews[k.id]) next.progress[language].reviews[k.id]={knowledgeId:k.id,language,lastLearnedAt:new Date().toISOString(),lastReviewedAt:null,
    nextReviewAt:new Date().toISOString(),errors:0,consecutiveCorrect:0,mastery:'new',step:0};
  return next;
}
