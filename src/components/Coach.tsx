'use client';
import { useEffect,useRef,useState } from 'react';
import { Coffee,MapPin,ShoppingBag,Hotel,MessageCircle,ArrowRight,ArrowLeft,Send,Lightbulb,Languages,Plus,History,Check,Sparkles,Flag } from 'lucide-react';
import { languages } from '@/lib/curriculum';
import { api } from '@/lib/client-api';
import type { AIReply,ChatSession,Language,Level,Scene,ServerStatus } from '@/lib/types';
import { Button,Empty,Modal,PageHeading } from './Primitives';
import { Mascot } from './Mascot';

const scenarios=[
  {id:'meet',title:'你好，新朋友',subtitle:'日常认识',desc:'从第一声问候，聊到彼此的喜好。',icon:MessageCircle,color:'green',goal:'打招呼 → 介绍自己'},
  {id:'restaurant',title:'一杯茶的对话',subtitle:'餐厅点餐',desc:'坐下来，点一份喜欢的好味道。',icon:Coffee,color:'peach',goal:'看菜单 → 礼貌点餐'},
  {id:'transport',title:'下一站，去哪儿',subtitle:'问路与交通',desc:'走进一座新城市，找到你的方向。',icon:MapPin,color:'blue',goal:'问目的地 → 听懂路线'},
  {id:'shopping',title:'小店里的发现',subtitle:'购物',desc:'喜欢的东西，也可以自己开口问。',icon:ShoppingBag,color:'pink',goal:'询问价格 → 选择物品'},
  {id:'hotel',title:'旅途里的小歇',subtitle:'酒店入住',desc:'从容说出预订信息，安心住下来。',icon:Hotel,color:'purple',goal:'说明预订 → 办理入住'},
] as const;
interface ChatResponse{session:ChatSession;reply?:AIReply;usage?:{used:number;limit:number;remaining:number};}
export function Coach({language,status,onRefresh,onPremium,onSaveExpression}:{language:Language;status:ServerStatus|null;onRefresh:()=>void;onPremium:()=>void;onSaveExpression:(language:Language,target:string,meaning:string)=>void}){
  const [chosen,setChosen]=useState<Scene>('meet');const [difficulty,setDifficulty]=useState<Level>('zero');const [chat,setChat]=useState<ChatSession|null>(null);
  const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [translations,setTranslations]=useState<Record<string,boolean>>({});
  const [history,setHistory]=useState<ChatSession[]|null>(null);const [historyLoading,setHistoryLoading]=useState(false);const [saved,setSaved]=useState<string[]>([]);
  const failed=useRef<{action:'message'|'hint'|'summary';text:string;requestId:string}|null>(null);const busyRef=useRef(false);const endRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});},[chat?.messages.length,busy]);
  async function start(){
    if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
    try{const data=await api<ChatResponse>('/api/chat',{action:'start',language,scene:chosen,difficulty});setChat(data.session);setTranslations({});setSaved([]);failed.current=null;onRefresh();}
    catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}
  }
  async function send(action:'message'|'hint'|'summary',retry=false){
    if(!chat||busyRef.current)return;
    const payload=retry&&failed.current?failed.current:{action,text:action==='message'?text:'',requestId:crypto.randomUUID()};
    if(payload.action==='message'&&!payload.text.trim())return;
    busyRef.current=true;setBusy(true);setError('');failed.current=payload;
    try{const data=await api<ChatResponse>('/api/chat',{...payload,sessionId:chat.id});setChat(data.session);setText('');failed.current=null;onRefresh();}
    catch(e){setError((e as Error).message);onRefresh();}finally{busyRef.current=false;setBusy(false);}
  }
  async function end(){
    if(!chat||busyRef.current)return;
    if(status?.subscription.status==='active'){await send('summary');return;}
    busyRef.current=true;setBusy(true);setError('');try{await api('/api/chat',{action:'end',sessionId:chat.id});setChat({...chat,ended:true});}
    catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}
  }
  async function showHistory(){
    if(status?.subscription.status!=='active'){onPremium();return;}
    setHistoryLoading(true);setError('');try{const data=await api<{sessions:ChatSession[]}>('/api/chat');setHistory(data.sessions);}catch(e){setError((e as Error).message);}finally{setHistoryLoading(false);}
  }
  const scene=scenarios.find(s=>s.id===(chat?.scene??chosen))!;
  const save=(target:string,meaning:string)=>{onSaveExpression(chat?.language??language,target,meaning);setSaved(s=>[...s,target]);};
  const demo=chat?.demo??status?.demo??true;
  return <div className="coach-page">
    {!chat?<><PageHeading eyebrow="WORDS COME TO LIFE" title="把学到的，聊出来" description="没有考试，只有一场轻松的小对话。芽芽在这里，陪你开口。" action={<Button variant="secondary" loading={historyLoading} onClick={showHistory}><History size={17}/>会话历史</Button>}/>
      <div className="coach-welcome"><Mascot className="coach-mascot"/><div><span className="tag"><Sparkles size={14}/>AI 场景陪练</span><h2>今天，我们在哪里见面？</h2><p>选一个熟悉的场景，完成一个小小的交流目标。</p></div><span className="coach-language">{languages[language].mark}<small>{languages[language].name}</small></span></div>
      <div className="coach-settings"><span>这次的难度</span><div className="segmented"><button aria-pressed={difficulty==='zero'} className={difficulty==='zero'?'active':''} onClick={()=>setDifficulty('zero')}>零基础 · 一句一句来</button><button aria-pressed={difficulty==='some'} className={difficulty==='some'?'active':''} onClick={()=>setDifficulty('some')}>有点基础 · 多聊一点</button></div></div>
      <div className="scenario-grid">{scenarios.map(s=><button key={s.id} className={`scenario-card ${chosen===s.id?'chosen':''}`} onClick={()=>setChosen(s.id)} aria-pressed={chosen===s.id}><div className={`scene-icon ${s.color}`}><s.icon size={26}/></div><span className="scenario-subtitle">{s.subtitle}</span><h3>{s.title}</h3><p>{s.desc}</p><span className="scene-goal">{s.goal}</span>{chosen===s.id?<Check className="scenario-check" size={19}/>:null}</button>)}</div>
      <div className="coach-start"><div><strong>今日剩余 {status?.remaining??5} / {status?.limit??5} 条</strong><p>消息、提示与总结各占 1 条；失败不扣额度。{status?.resetLabel}</p></div><Button loading={busy} onClick={start}>开始这场小对话<ArrowRight size={18}/></Button></div>
    </>:<div className="chat-container"><div className="chat-top"><button className="icon-button" aria-label="回到场景选择" disabled={busy} onClick={()=>setChat(null)}><ArrowLeft size={21}/></button><span className={`scene-icon small ${scene.color}`}><scene.icon size={22}/></span><div><h2>{scene.title}</h2><small>{languages[chat.language].name} · {chat.difficulty==='zero'?'零基础':'初级'} · {chat.ended?'本次练习已结束':'和芽芽练习中'}</small></div><span className="chat-quota">剩余 {status?.remaining??5} 条</span></div>
      <div className={`chat-mode-banner ${demo?'demo':''}`}>{demo?'演示陪练 · 固定脚本，未调用 DeepSeek，不作真实语言理解或能力评估。':'DeepSeek AI 陪练 · 对话将发送至 DeepSeek，示范开场由课程预设。'}</div>
      <div className="chat-messages">{chat.messages.map((message,i)=><div key={message.id} className={`chat-message ${message.role}`}>
        {message.role==='assistant'?<div className="chat-avatar"><Mascot/></div>:null}<div className="message-content"><small>{message.role==='assistant'?i===0?'芽芽 · 场景开场示例':'芽芽':'我'}</small><div className="message-bubble" lang={message.role==='assistant'?chat.language:undefined}>{message.text}</div>
        {message.role==='assistant'?<><div className="message-actions"><button onClick={()=>setTranslations(old=>({...old,[message.id]:!old[message.id]}))}><Languages size={14}/>{translations[message.id]?'收起翻译':'查看翻译'}</button>{message.phrases.length?<span>有 {message.phrases.length} 个实用表达</span>:null}</div>{translations[message.id]?<p className="message-translation">{message.translation}</p>:null}
          {message.correction?<details className="correction"><summary>✧ 一个温柔的小建议</summary><p><strong>我的表达</strong>{message.correction.original}</p><p><strong>建议表达</strong>{message.correction.suggestion}</p><p>{message.correction.explanation}</p></details>:null}
          {message.phrases.length?<details className="expression-details"><summary>收藏实用表达</summary>{message.phrases.map(p=><div className="expression-row" key={p.target}><div><strong>{p.target}</strong><small>{p.meaning}</small></div><button className="icon-button" aria-label={`将${p.target}加入复习`} onClick={()=>save(p.target,p.meaning)} disabled={saved.includes(p.target)}>{saved.includes(p.target)?<Check size={17}/>:<Plus size={17}/>}</button></div>)}</details>:null}
        </>:null}</div>
      </div>)}
        {busy?<div className="chat-thinking"><span className="typing-dots">•••</span>芽芽正在想下一句…</div>:null}<div ref={endRef}/>
        {chat.ended?<section className="chat-summary"><span className="tag"><Flag size={14}/>一次小小的勇敢，完成了</span><h2>{chat.summary?'把今天的收获带走':'今天，你已经开口了。'}</h2>{chat.summary?<><p>{chat.summary.text}</p>{chat.summary.improvements.map((s,i)=><p key={i} className="summary-improvement">{i+1}. {s}</p>)}{chat.summary.phrases.map(p=><div key={p.target} className="expression-row"><div><strong>{p.target}</strong><small>{p.meaning}</small></div><Button variant="secondary" disabled={saved.includes(p.target)} onClick={()=>save(p.target,p.meaning)}>{saved.includes(p.target)?'已加入':'加入复习'}<Plus size={15}/></Button></div>)}</>:<><p>你可以在上方收藏实用表达。Premium 提供会话总结和完整历史。</p><Button variant="secondary" onClick={onPremium}>看看 Premium<Sparkles size={16}/></Button></>}<Button onClick={()=>setChat(null)}>再选一个场景<ArrowRight size={17}/></Button></section>:null}
      </div>
      {!chat.ended?<div className="chat-composer"><div className="chat-tools"><Button variant="ghost" disabled={busy} onClick={()=>send('hint')}><Lightbulb size={16}/>给我一个提示</Button><Button variant="ghost" disabled={busy} onClick={end}><Flag size={15}/>{status?.subscription.status==='active'?'结束并总结（1 条）':'结束练习'}</Button></div><form onSubmit={e=>{e.preventDefault();send('message');}}><input aria-label="我的陪练消息" maxLength={1000} disabled={busy} placeholder={`试着用${languages[chat.language].name}说一句，不怕出错…`} value={text} onChange={e=>{setText(e.target.value);failed.current=null;setError('');}}/><button className="send-button" disabled={busy||!text.trim()} aria-label="发送消息"><Send size={20}/></button></form><small>{text.length}/1000 · 纠错藏在小建议里，不打断你的表达。</small></div>:null}
    </div>}
    {error?<div className="notice error-notice" role="alert">{error}{failed.current?<Button variant="secondary" disabled={busy} onClick={()=>send(failed.current!.action,true)}>重试上次请求</Button>:null}</div>:null}
    {!chat&&demo?<div className="notice demo-explanation"><Sparkles size={17}/><div><strong>当前为演示模式</strong><p>未配置 DeepSeek API。你可以体验固定场景脚本、翻译、提示、收藏与演示总结；这些内容不是实时 AI 回复。</p></div></div>:null}
    <p className="privacy-note">课程进度保存在本机。陪练文字保存在服务端会话中；真实 AI 模式还会发往 DeepSeek。请勿发送敏感个人信息。免费保留当前会话，Premium 最多保留最近 50 次会话。</p>
    {history?<Modal title="我的会话历史" wide onClose={()=>setHistory(null)}>{history.length?<div className="history-list">{history.map(s=><button key={s.id} onClick={()=>{setChat(s);setHistory(null);}}><span className={`language-mark mark-${s.language}`}>{languages[s.language].mark}</span><div><strong>{scenarios.find(x=>x.id===s.scene)?.title}</strong><small>{languages[s.language].name} · {s.messages.length} 条消息 · {s.demo?'演示':'AI'} · {s.ended?'已结束':'进行中'}</small></div><ArrowRight size={17}/></button>)}</div>:<Empty icon={<MessageCircle/>} title="故事还没开始" description="开始一场对话，之后就能在这里再读一次。"/>}</Modal>:null}
  </div>;
}
