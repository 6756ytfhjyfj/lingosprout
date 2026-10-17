'use client';
import { useState } from 'react';
import { ArrowRight,ArrowLeft,Check,Leaf,Compass,Sun,Sprout,BookOpen,Plane,Heart } from 'lucide-react';
import { languages } from '@/lib/curriculum';
import type { DailyGoal,Goal,Language,LearningState,Level } from '@/lib/types';
import { Button } from './Primitives';
import { GardenScene } from './Mascot';
export function Onboarding({state,onDone}:{state:LearningState;onDone:(state:LearningState)=>void}){
  const [step,setStep]=useState(0);const [language,setLanguage]=useState<Language>(state.activeLanguage);const [level,setLevel]=useState<Level>('zero');
  const [goal,setGoal]=useState<Goal>('daily');const [dailyGoal,setDailyGoal]=useState<DailyGoal>(40);
  const titles=['你想先探索哪门语言？','从哪里开始最舒服？','你想用它做些什么？','每天，留一点时间给自己'];
  const descriptions=['先选一门，之后随时添加。每门语言都有自己的成长记录。','我们从入门内容出发。有一点基础，也能轻松巩固。','带着一个小小的期待，学习会更有方向。','目标可以随时调整。坚持一点点，比一次学很多更重要。'];
  return <div className="onboarding"><div className="onboarding-brand"><div className="brand-mark"><Sprout size={26}/></div><strong>语芽<span>lingosprout</span></strong></div><div className="onboarding-layout"><div className="onboarding-story"><span className="eyebrow">A LITTLE EVERY DAY</span><h1>让世界，<br/>多一分熟悉<span>。</span></h1><p>从一句你好开始，<br/>和芽芽一起，种下每天的小进步。</p><GardenScene/><div className="story-tags"><span>每天 5–10 分钟</span><span>三门语言，一起生长</span></div></div>
    <div className="onboarding-panel"><div className="onboarding-steps">{['语言','起点','目标','节奏'].map((s,i)=><span key={s} className={i<=step?'active':''}>{i<step?<Check size={14}/>:i+1}<small>{s}</small></span>)}</div><span className="eyebrow">第 {step+1} 步 / 共 4 步</span><h2>{titles[step]}</h2><p>{descriptions[step]}</p>
      <div className="onboarding-choices">
        {step===0?(Object.keys(languages) as Language[]).map(id=><button className={`onboarding-option ${language===id?'selected':''}`} key={id} onClick={()=>setLanguage(id)} aria-pressed={language===id}><span className={`language-mark mark-${id}`}>{languages[id].mark}</span><div><strong>{languages[id].name}</strong><small>{languages[id].native} · 入门体验</small></div>{language===id?<Check size={21}/>:null}</button>):null}
        {step===1?([['zero','零基础，从第一句开始','不需要预习，芽芽陪你慢慢来',Sprout],['some','有一点基础，重新找找感觉','从入门关卡巩固，建立学习节奏',BookOpen]] as const).map(([id,title,desc,Icon])=><button key={id} className={`onboarding-option ${level===id?'selected':''}`} onClick={()=>setLevel(id)} aria-pressed={level===id}><Icon size={27}/><div><strong>{title}</strong><small>{desc}</small></div>{level===id?<Check size={21}/>:null}</button>):null}
        {step===2?([['daily','日常交流','和更多人，自然聊上几句',Compass],['travel','旅行出发','点餐、问路，走得更自在',Plane],['interest','兴趣学习','为喜欢的文化，多打开一扇窗',Heart]] as const).map(([id,title,desc,Icon])=><button key={id} className={`onboarding-option ${goal===id?'selected':''}`} onClick={()=>setGoal(id)} aria-pressed={goal===id}><Icon size={27}/><div><strong>{title}</strong><small>{desc}</small></div>{goal===id?<Check size={21}/>:null}</button>):null}
        {step===3?([[20,'轻量','约 5 分钟 · 每日 20 XP',Leaf],[40,'标准','约 8 分钟 · 每日 40 XP',Sun],[60,'进阶','约 10 分钟 · 每日 60 XP',Compass]] as const).map(([id,title,desc,Icon])=><button key={id} className={`onboarding-option ${dailyGoal===id?'selected':''}`} onClick={()=>setDailyGoal(id)} aria-pressed={dailyGoal===id}><Icon size={27}/><div><strong>{title}{id===40?<span className="tiny-tag">推荐</span>:null}</strong><small>{desc}</small></div>{dailyGoal===id?<Check size={21}/>:null}</button>):null}
      </div><div className="onboarding-actions">{step>0?<Button variant="ghost" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={17}/>上一步</Button>:<span className="muted">游客也能完整学习</span>}<Button onClick={()=>{if(step<3)setStep(s=>s+1);else onDone({...state,onboarded:true,activeLanguage:language,languages:[language],profile:{...state.profile,level,goal,dailyGoal}});}}>{step===3?'开始我的成长之旅':'继续'}<ArrowRight size={18}/></Button></div>
      <p className="onboarding-footnote">首版提供英语、日语、韩语的入门体验，未覆盖完整等级体系。</p>
    </div></div></div>;
}
