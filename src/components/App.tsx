'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { BookOpen,RotateCcw,MessageCircle,UserRound,Sprout,ChevronDown,Flame,Star,Sparkles,Plus,Check,ArrowRight,Volume2,Headphones,Leaf,X } from 'lucide-react';
import { curriculum,languages } from '@/lib/curriculum';
import { completeSession,getStreak,startLesson,startReview } from '@/lib/learning';
import { addExpression } from '@/lib/learning';
import { BrowserLearningRepository } from '@/lib/repository';
import { api } from '@/lib/client-api';
import type { Language,LearningState,Lesson,PracticeSession,ServerStatus } from '@/lib/types';
import { Dashboard } from './Dashboard';
import { Onboarding } from './Onboarding';
import { Practice } from './Practice';
import { Coach } from './Coach';
import { PremiumPage,ProfilePage,PronunciationPage,ResultPage,ReviewPage } from './LearningPages';
import { Button,Modal } from './Primitives';
import { Mascot } from './Mascot';
import { SpeakButton } from './AudioPractice';

type View='learn'|'review'|'coach'|'profile'|'pronunciation'|'premium'|'result';
const nav=[{id:'learn',label:'学习',icon:BookOpen},{id:'review',label:'复习',icon:RotateCcw},{id:'coach',label:'陪练',icon:MessageCircle},{id:'profile',label:'我的',icon:UserRound}] as const;
const repository=new BrowserLearningRepository();
export default function App(){
  const [state,setState]=useState<LearningState|null>(null);const [view,setView]=useState<View>('learn');const [practicing,setPracticing]=useState(false);
  const [manage,setManage]=useState(false);const [intro,setIntro]=useState<Lesson|null>(null);const [replacement,setReplacement]=useState<PracticeSession|null>(null);
  const [status,setStatus]=useState<ServerStatus|null>(null);const [toast,setToast]=useState('');const [introReading,setIntroReading]=useState(true);
  const mainRef=useRef<HTMLElement>(null);
  const notify=useCallback((message:string)=>setToast(message),[]);
  const refreshStatus=useCallback(()=>{api<ServerStatus>('/api/status').then(setStatus).catch(e=>notify((e as Error).message));},[notify]);
  useEffect(()=>{const loaded=repository.load();setState(loaded.state);if(loaded.warning)setToast(loaded.warning);refreshStatus();
    const hash=location.hash.slice(1);if(['learn','review','coach','profile','pronunciation','premium'].includes(hash))setView(hash as View);
    const syncHash=()=>{const next=location.hash.slice(1);if(['learn','review','coach','profile','pronunciation','premium','result'].includes(next))setView(next as View);};
    window.addEventListener('hashchange',syncHash);return()=>window.removeEventListener('hashchange',syncHash);
  },[refreshStatus]);
  useEffect(()=>{if(!state)return;const warning=repository.save(state);if(warning)setToast(warning);},[state]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),6500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{if(state?.onboarded&&!practicing){window.scrollTo({top:0,behavior:'instant'});}},[view,practicing,state?.onboarded]);
  const navigate=(next:View)=>{setView(next);window.history.replaceState(null,'',`#${next}`);};
  if(!state)return <div className="loading-screen"><Mascot/><strong>语芽</strong><span>你的语言花园，正在苏醒…</span></div>;
  const language=state.activeLanguage;
  function begin(session:PracticeSession){
    if(state!.draft&&state!.draft.id!==session.id){setReplacement(session);return;}
    setState(s=>s?{...s,draft:session,activeLanguage:session.language}:s);setPracticing(true);setIntro(null);
  }
  function resume(){if(state!.draft){setState(s=>s?{...s,activeLanguage:s.draft!.language}:s);setPracticing(true);setIntro(null);}}
  function runReview(mode:'due'|'errors'|'all'){
    const session=startReview(state!,state!.activeLanguage,mode);if(!session){notify(mode==='due'?'目前没有到期知识点，可以自主巩固或继续学习。':'目前没有可练习的知识点，先学一关或收藏一句表达吧。');return;}begin(session);
  }
  function finish(session:PracticeSession){const result=completeSession(state!,session);setState({...result.state,activeLanguage:session.language});setPracticing(false);navigate('result');}
  if(!state.onboarded)return <><Onboarding state={state} onDone={setState}/>{toast?<div className="toast" role="status">{toast}</div>:null}</>;
  if(practicing&&state.draft)return <><Practice key={state.draft.id} initial={state.draft} reading={state.profile.reading} onSave={draft=>setState(s=>s?{...s,draft}:s)} onFinish={finish} onExit={discard=>{if(discard)setState(s=>s?{...s,draft:null}:s);setPracticing(false);navigate(state.draft?.mode==='review'?'review':'learn');}}/>{toast?<div className="toast" role="status">{toast}</div>:null}</>;
  const openIntro=(lesson:Lesson)=>{setIntro(lesson);setIntroReading(state.profile.reading);};
  return <div className="app-shell"><a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className="sidebar"><button className="brand" onClick={()=>navigate('learn')} aria-label="语芽，返回学习首页"><span className="brand-mark"><Sprout size={27}/></span><strong>语芽<span>lingosprout</span></strong></button><span className="sidebar-caption">你的语言，慢慢生长</span><nav aria-label="主要导航">{nav.map(item=><button key={item.id} aria-label={item.label} className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><item.icon size={21}/><span>{item.label}</span>{item.id==='coach'?<span className="nav-ai">AI</span>:null}</button>)}</nav>
      <div className="sidebar-divider"/><button className={`sidebar-extra ${view==='pronunciation'?'active':''}`} onClick={()=>navigate('pronunciation')}><Headphones size={20}/>跟读练习<span className="free-label">免费</span></button><button className={`sidebar-extra ${view==='premium'?'active':''}`} onClick={()=>navigate('premium')}><Sparkles size={20}/>Premium<span className="premium-dot"/></button>
      <div className="sidebar-bottom"><div className="sidebar-quote"><Mascot/><p>不用一口气长大。<br/>今天，长一点就好。</p><small>— 你的学习搭子，芽芽</small></div><div className="sidebar-profile"><span><UserRound size={19}/></span><div><strong>{state.profile.name}</strong><small>{status?.authenticated?'已登录账户':'游客探索中'}</small></div><button className="icon-button" aria-label="打开我的资料" onClick={()=>navigate('profile')}><ChevronDown size={16}/></button></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="mobile-brand"><Sprout size={23}/><strong>语芽</strong></div><button className="language-switcher" aria-label="切换或添加学习语言" onClick={()=>setManage(true)}><span className={`language-mark mark-${language}`}>{languages[language].mark}</span><strong>{languages[language].name}</strong><span className="language-switch-native">{languages[language].native}</span><ChevronDown size={16}/></button><div className="topbar-stats"><span className="topbar-streak" title="跨语言共用的连续打卡天数"><Flame size={20}/><strong>{getStreak(state.studyDays)}</strong><small>天</small></span><span className="topbar-xp" title="当前语言的累计经验"><Star size={19}/><strong>{state.progress[language].xp}</strong><small>XP</small></span><button className="topbar-premium" onClick={()=>navigate('premium')}><Sparkles size={16}/>{status?.subscription.status==='active'?'Premium 已开通':'探索 Premium'}</button><button className="topbar-avatar" aria-label="我的资料" onClick={()=>navigate('profile')}><UserRound size={20}/></button></div></header>
      <main id="main-content" className={`main-content view-${view}`} ref={mainRef}>
        {view==='learn'?<Dashboard state={state} onLesson={openIntro} onResume={resume} onReview={()=>navigate('review')} onPronunciation={()=>navigate('pronunciation')} onPremium={()=>navigate('premium')}/>:null}
        {view==='review'?<ReviewPage key={language} state={state} onStart={runReview} onLearn={()=>navigate('learn')}/>:null}
        {view==='pronunciation'?<PronunciationPage key={language} state={state}/>:null}
        {view==='coach'?<Coach language={language} status={status} onRefresh={refreshStatus} onPremium={()=>navigate('premium')} onSaveExpression={(lang,target,meaning)=>{setState(s=>s?addExpression(s,lang,target,meaning):s);notify('表达已加入对应语言的复习。');}}/>:null}
        {view==='profile'?<ProfilePage state={state} status={status} onUpdate={setState} onRefresh={refreshStatus} onManageLanguages={()=>setManage(true)} onPremium={()=>navigate('premium')} notify={notify}/>:null}
        {view==='premium'?<PremiumPage status={status} onRefresh={refreshStatus}/>:null}
        {view==='result'?<ResultPage state={state} onContinue={()=>navigate('learn')} onReview={()=>navigate('review')} onPronunciation={()=>navigate('pronunciation')}/>:null}
        <footer className="site-footer"><span><Sprout size={14}/>语芽 · 把好奇种进日常</span><span>原创入门体验 · MVP</span></footer>
      </main>
    </div><nav className="mobile-nav" aria-label="移动端主要导航">{nav.map(item=><button className={view===item.id?'active':''} key={item.id} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><item.icon size={21}/><span>{item.label}</span></button>)}</nav>
    {manage?<Modal title="你的语言花园" onClose={()=>setManage(false)}><p className="modal-description">每门语言都保留独立课程、经验和复习记录。打卡天数一起累计。</p><div className="language-manager">{(Object.keys(languages) as Language[]).map(id=><button key={id} className={language===id?'selected':''} onClick={()=>{setState(s=>s?{...s,activeLanguage:id,languages:s.languages.includes(id)?s.languages:[...s.languages,id]}:s);setManage(false);notify(`已切换到${languages[id].name}，其他语言进度已保留。`);}}><span className={`language-mark mark-${id}`}>{languages[id].mark}</span><div><strong>{languages[id].name}<small>{languages[id].native}</small></strong><span>{state.languages.includes(id)?`${state.progress[id].xp} XP · ${Object.keys(state.progress[id].completed).length} / 12 关`:'添加一门新语言 · 从入门开始'}</span></div>{language===id?<Check size={21}/>:state.languages.includes(id)?<ArrowRight size={18}/>:<Plus size={20}/>}</button>)}</div><p className="privacy-note">不使用国旗区分语言。当前内容均为入门体验。</p></Modal>:null}
    {intro?<Modal title={intro.title} wide onClose={()=>setIntro(null)}><div className="lesson-intro"><span className="tag"><BookOpen size={14}/>{languages[intro.language].name} · 6 道练习 · 约 5–8 分钟</span><h3>这次，我们学会</h3><p className="lesson-goal">{intro.goal}</p><div className="knowledge-intro"><span><Leaf size={17}/>先认识一点新知识</span><p>{intro.intro}</p></div><div className="intro-vocabulary-heading"><h3>今天的 3 个新朋友</h3>{intro.language!=='en'?<label className="check-label"><input type="checkbox" checked={introReading} onChange={e=>{setIntroReading(e.target.checked);setState(s=>s?{...s,profile:{...s.profile,reading:e.target.checked}}:s);}}/>读音辅助</label>:null}</div><div className="intro-vocabulary">{intro.knowledge.map(k=><div key={k.id}><div><strong lang={intro.language}>{k.target}</strong><span>{k.meaning}</span>{introReading&&k.reading?<small>{k.reading}</small>:null}</div><SpeakButton language={intro.language} text={k.target}/></div>)}</div><p className="privacy-note">先理解，再练习。答题前不会显示正确答案；错误会收到简短解释。</p><Button className="full-width" onClick={()=>{if(state.draft?.lessonId===intro.id)resume();else begin(startLesson(state,intro.id));}}>准备好，开始练习<ArrowRight size={18}/></Button></div></Modal>:null}
    {replacement?<Modal title="还有一段旅程等你完成" onClose={()=>setReplacement(null)}><p className="modal-description">你保存过另一组未完成练习。每次可以保留一组进度，要先完成它，还是重新出发？</p><div className="stack"><Button onClick={()=>{setReplacement(null);resume();}}>继续原来的练习</Button><Button variant="secondary" onClick={()=>{setState(s=>s?{...s,draft:replacement,activeLanguage:replacement.language}:s);setReplacement(null);setIntro(null);setPracticing(true);}}>放弃原进度，开始新练习</Button><Button variant="ghost" onClick={()=>setReplacement(null)}>稍后再说</Button></div></Modal>:null}
    {toast?<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="关闭提示" onClick={()=>setToast('')}><X size={16}/></button></div>:null}
  </div>;
}
