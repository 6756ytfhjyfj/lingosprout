'use client';
import { useEffect,useRef,useState } from 'react';
import { X,Check,ArrowRight,Volume2,RotateCcw,Lightbulb } from 'lucide-react';
import { languages,knowledgeById,lessonById } from '@/lib/curriculum';
import { answerQuestion,isCorrect } from '@/lib/learning';
import type { PracticeSession,Question } from '@/lib/types';
import { Button,Modal,Progress } from './Primitives';
import { useSpeech } from './AudioPractice';
import { Mascot } from './Mascot';

export function Practice({initial,reading,onSave,onFinish,onExit}:{initial:PracticeSession;reading:boolean;onSave:(draft:PracticeSession)=>void;onFinish:(draft:PracticeSession)=>void;onExit:(discard:boolean)=>void}){
  const [session,setSession]=useState(initial);const [answer,setAnswer]=useState('');const [selected,setSelected]=useState<number[]>([]);
  const [matched,setMatched]=useState<Record<string,string>>({});const [matchTarget,setMatchTarget]=useState('');
  const [feedback,setFeedback]=useState<{correct:boolean;session:PracticeSession}|null>(null);const [exit,setExit]=useState(false);
  const footerRef=useRef<HTMLDivElement>(null);const [footerHeight,setFooterHeight]=useState(220);
  const speech=useSpeech(session.language);const q:Question|undefined=session.queue[session.index];const point=q?knowledgeById[q.knowledgeId]:null;
  const doneFirst=new Set(session.attempts.filter(a=>a.first).map(a=>a.questionId)).size;
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  useEffect(()=>{
    const footer=footerRef.current;if(!footer)return;
    const measure=()=>setFooterHeight(Math.ceil(footer.getBoundingClientRect().height));
    measure();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
    observer?.observe(footer);window.addEventListener('resize',measure);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};
  },[q?.id]);
  function check(){
    if(!q||feedback)return;
    let value=answer;
    if(q.type==='order')value=selected.map(i=>q.tokens![i]).join(session.language==='ja'?'':' ');
    if(q.type==='match')value=JSON.stringify(matched);
    const result=answerQuestion(session,value);setFeedback(result);onSave(result.session);
  }
  function proceed(){
    if(!feedback)return;
    if(feedback.session.index>=feedback.session.queue.length){onFinish(feedback.session);return;}
    setSession(feedback.session);setFeedback(null);setAnswer('');setSelected([]);setMatched({});setMatchTarget('');
  }
  const ready=q?.type==='match'?Object.keys(matched).length===q.pairs!.length:q?.type==='order'?selected.length===q.tokens!.length:Boolean(answer.trim());
  return <div className="practice-screen practice-refreshed" style={{paddingBottom:footerHeight+32}}>
    <header className="practice-header"><button className="icon-button" aria-label="退出本次练习" onClick={()=>setExit(true)}><X size={24}/></button><div className="practice-progress"><div><span>{session.mode==='review'?'记忆巩固':'每日小旅程'}</span><small>{languages[session.language].name} · 一步一步来</small></div><Progress value={doneFirst/session.initialCount*100} label="关卡作答进度"/></div><span className="practice-count">{Math.min(doneFirst,session.initialCount)} / {session.initialCount}</span></header>
    {!q?<div className="practice-body"><Mascot className="practice-mascot" mood="celebrate"/><h1>练习完成啦</h1><Button onClick={()=>onFinish(session)}>查看结算<ArrowRight size={18}/></Button></div>:<>
      <form className="practice-body" onSubmit={e=>{e.preventDefault();if(feedback)proceed();else if(ready)check();}}>
        <div className="practice-kicker"><span>{session.mode==='review'?'温故知新':'小步学习'}</span><span>{languages[session.language].name} · {session.attempts.some(a=>a.questionId===q.id)?'错题再见一次':'第 '+(session.index+1)+' 题'}</span></div>
        <h1>{q.prompt}</h1>
        {q.type==='choice' && !q.options.includes(q.target) || q.type==='listen'?<div className="question-prompt"><div className="mini-mascot"><Mascot/></div><div className="speech-bubble">
          {q.type==='listen'?<><button type="button" className="large-sound" aria-label="播放本题示范音" onClick={()=>speech.speak(q.target)}><Volume2 size={35}/></button><span>点击听一听</span></>:<strong lang={session.language}>{q.target}</strong>}
          {q.type!=='listen' && reading && point?.reading?<small>{point.reading}</small>:null}
        </div></div>:null}
        {q.type==='listen'&&speech.checked&&!speech.available?<div className="notice">此设备暂无{languages[session.language].name}语音。已改为读文选择，不影响通关：<strong lang={session.language}>{q.target}</strong></div>:null}
        {speech.error?<p className="notice" role="status">{speech.error}</p>:null}
        {(q.type==='choice'||q.type==='listen')?<div className="answer-options">{q.options.map((option,i)=>{const correctOption=Boolean(feedback)&&isCorrect(q,option);const incorrectSelection=Boolean(feedback)&&answer===option&&!correctOption;return <button type="button" disabled={Boolean(feedback)} key={option} className={`answer-option ${answer===option?'selected':''} ${correctOption?'answer-correct':''} ${incorrectSelection?'answer-incorrect':''}`} onClick={()=>setAnswer(option)} aria-pressed={answer===option}><span className="option-number">{i+1}</span><span className="option-label">{option}</span>{correctOption?<span className="answer-state" aria-hidden="true"><Check size={18}/><span>{answer===option?'答对了':'正确答案'}</span></span>:incorrectSelection?<span className="answer-state" aria-hidden="true"><X size={18}/><span>再试一次</span></span>:answer===option?<Check size={20}/>:null}</button>;})}</div>:null}
        {q.type==='fill'?<div className={`fill-answer ${feedback?(feedback.correct?'field-correct':'field-incorrect'):''}`}><label htmlFor="practice-answer">你的答案</label><input id="practice-answer" value={answer} autoComplete="off" autoCapitalize="off" spellCheck={false} lang={session.language} disabled={Boolean(feedback)} aria-invalid={feedback?.correct===false} aria-describedby={feedback?'practice-input-help practice-input-result':'practice-input-help'} onChange={e=>setAnswer(e.target.value)} placeholder="想一想，慢慢写…"/>{feedback?<div className="answer-inline-feedback" id="practice-input-result">{feedback.correct?<Check size={18}/>:<X size={18}/>}<span>{feedback.correct?'表达正确，记住这一句！':<>再看一眼：<strong lang={session.language}>{q.correctAnswer}</strong></>}</span></div>:null}<p id="practice-input-help">可以忽略句末常见标点{session.language==='en'?'和英语大小写':''}；请保留正确的词语与拼写。</p>{session.language!=='en'?<details className="input-assist"><summary>没有对应输入法？用词块辅助输入</summary><p>这是本课词块，按顺序填入；也可以直接输入。</p><div>{[...new Set(lessonById[session.lessonId]?.knowledge.flatMap(k=>k.tokens)??[])].reverse().map(token=><button type="button" disabled={Boolean(feedback)} key={token} onClick={()=>setAnswer(old=>old?(session.language==='ja'?old+token:old+' '+token):token)}>{token}</button>)}</div><Button variant="ghost" disabled={Boolean(feedback)} onClick={()=>setAnswer('')}>清空答案</Button></details>:null}</div>:null}
        {q.type==='order'?<div className={`word-order ${feedback?(feedback.correct?'field-correct':'field-incorrect'):''}`}><div className="word-answer" aria-label="已选择的词语">{selected.length?selected.map((i,n)=><button disabled={Boolean(feedback)} type="button" key={`${i}-${n}`} onClick={()=>setSelected(s=>s.filter((_,j)=>j!==n))}>{q.tokens![i]}</button>):<span>依次点击词块，组成一句话</span>}</div>{feedback?<div className="answer-inline-feedback">{feedback.correct?<Check size={18}/>:<X size={18}/>}<span>{feedback.correct?'句子组成正确！':<>建议顺序：<strong lang={session.language}>{q.correctAnswer}</strong></>}</span></div>:null}<div className="word-bank">{q.tokens!.map((token,i)=><button type="button" key={i} disabled={selected.includes(i)||Boolean(feedback)} onClick={()=>setSelected(s=>[...s,i])}>{token}</button>)}</div><Button variant="ghost" disabled={Boolean(feedback)} onClick={()=>setSelected([])}><RotateCcw size={15}/>重新排列</Button></div>:null}
        {q.type==='match'?<div className="matching"><p>先选左侧表达，再选右侧释义。再次选择可以修改。</p><div className="matching-columns"><div>{q.pairs!.map(pair=>{const pairCorrect=Boolean(feedback)&&matched[pair.target]===pair.meaning;const pairIncorrect=Boolean(feedback)&&!pairCorrect;return <button type="button" key={pair.target} disabled={Boolean(feedback)} className={`${matchTarget===pair.target?'selected':''} ${matched[pair.target]?'paired':''} ${pairCorrect?'answer-correct':''} ${pairIncorrect?'answer-incorrect':''}`} onClick={()=>setMatchTarget(pair.target)}>{pair.target}{matched[pair.target]?<small>→ {matched[pair.target]}</small>:null}{feedback?<span className="match-answer-state" aria-hidden="true">{pairCorrect?<><Check size={16}/>配对正确</>:<><X size={16}/>需要再记一次</>}</span>:null}{pairIncorrect?<span className="match-correction" aria-hidden="true">正确配对：{pair.meaning}</span>:null}</button>;})}</div><div>{[...q.pairs!].reverse().map(pair=><button type="button" key={pair.meaning} disabled={!matchTarget||Boolean(feedback)} onClick={()=>{setMatched(old=>{const next={...old};for(const key of Object.keys(next))if(next[key]===pair.meaning)delete next[key];next[matchTarget]=pair.meaning;return next;});setMatchTarget('');}}>{pair.meaning}</button>)}</div></div></div>:null}
        {!feedback?<div className="gentle-note"><Lightbulb size={17}/>不确定也没关系，每一次尝试都算数。</div>:null}
        <div ref={footerRef} className={`practice-footer ${feedback?(feedback.correct?'feedback-correct':'feedback-wrong'):''}`} aria-live="polite">
          {feedback?<div className="feedback-text"><div className="feedback-title">{feedback.correct?<Check/>:<RotateCcw/>}<strong>{feedback.correct?'答对啦，继续生长！':'再认识它一次，就会更熟悉'}</strong></div>
            {!feedback.correct?<p>正确答案：{q.type==='match'?q.pairs!.map(p=>`${p.target} → ${p.meaning}`).join('；'):q.correctAnswer}</p>:null}
            <p>{q.explanation}</p>{!feedback.correct?<small>这个知识点稍后会再次出现，并进入复习。</small>:null}</div>:<span className="footer-tip">慢慢来，你正在进步。</span>}
          <Button type="submit" disabled={!feedback&&!ready}>{feedback?(feedback.session.index>=feedback.session.queue.length?'查看学习收获':'继续'):'确认答案'}<ArrowRight size={18}/></Button>
        </div>
      </form>
    </>}
    {exit?<Modal title="先休息一下吗？" onClose={()=>setExit(false)}><p className="modal-description">本关还没有结算。保留后可以从已提交的下一题继续；放弃不会领取经验奖励。</p><div className="stack"><Button onClick={()=>{onSave(feedback?.session??session);onExit(false);}}>保留进度并退出</Button><Button variant="secondary" onClick={()=>onExit(true)}>放弃本次练习</Button><Button variant="ghost" onClick={()=>setExit(false)}>继续学习</Button></div></Modal>:null}
  </div>;
}
