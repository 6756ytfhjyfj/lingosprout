'use client';
import { useEffect,useRef,useState } from 'react';
import { Volume2, Mic, Square, RotateCcw, Turtle, Headphones } from 'lucide-react';
import { languages } from '@/lib/curriculum';
import type { Knowledge,Language } from '@/lib/types';
import { Button } from './Primitives';

export function useSpeech(language:Language){
  const [voice,setVoice]=useState<SpeechSynthesisVoice|null>(null);const [checked,setChecked]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{
    if(!('speechSynthesis' in window)){setChecked(true);return;}
    const synth=window.speechSynthesis;
    const load=()=>{const voices=synth.getVoices();setVoice(voices.find(v=>v.lang.toLowerCase()===languages[language].locale.toLowerCase())??voices.find(v=>v.lang.toLowerCase().startsWith(language))??null);setChecked(true);};
    load();synth.addEventListener('voiceschanged',load);return()=>{synth.removeEventListener('voiceschanged',load);synth.cancel();};
  },[language]);
  const speak=(text:string,slow=false)=>{
    if(!voice){setError(`当前设备未提供${languages[language].name}示范声音。你可以阅读文本并继续学习。`);return;}
    window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=languages[language].locale;utterance.rate=slow?0.65:0.9;
    utterance.onerror=()=>setError('示范音播放失败。请检查设备语音设置，其他学习内容仍可继续。');setError('');window.speechSynthesis.speak(utterance);
  };
  return {speak,available:Boolean(voice),checked,error};
}
export function SpeakButton({language,text,slow=false}:{language:Language;text:string;slow?:boolean}){
  const speech=useSpeech(language);
  return <div className="speak-inline"><button className="icon-button sound-button" aria-label={slow?'慢速播放':'播放示范音'} onClick={()=>speech.speak(text,slow)}><Volume2 size={20}/></button>{speech.error?<span role="status" className="micro-message">{speech.error}</span>:null}</div>;
}
export function Recorder({knowledge,showReading=true}:{knowledge:Knowledge;showReading?:boolean}){
  const {speak,available,checked,error}=useSpeech(knowledge.language);
  const [recording,setRecording]=useState(false);const [pending,setPending]=useState(false);const [url,setUrl]=useState('');const [notice,setNotice]=useState('');const [seconds,setSeconds]=useState(0);
  const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const chunks=useRef<Blob[]>([]);const urlRef=useRef('');const active=useRef(true);
  const cleanup=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
  useEffect(()=>{active.current=true;return()=>{active.current=false;if(recorder.current?.state==='recording')recorder.current.stop();cleanup();if(urlRef.current)URL.revokeObjectURL(urlRef.current);};},[]);
  useEffect(()=>{if(!recording)return;const timer=setInterval(()=>setSeconds(s=>s+1),1000);const timeout=setTimeout(()=>stop(),60000);return()=>{clearInterval(timer);clearTimeout(timeout);};},[recording]);
  const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();cleanup();setRecording(false);};
  async function start(){
    if(!navigator.mediaDevices?.getUserMedia||!('MediaRecorder' in window)){setNotice('当前浏览器不支持录音，或页面不是安全连接。请使用 localhost 或 HTTPS；你仍可以听音和跟读。');return;}
    setPending(true);setNotice('');
    try {
      const media=await navigator.mediaDevices.getUserMedia({audio:true});if(!active.current){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;const rec=new MediaRecorder(media);recorder.current=rec;chunks.current=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};
      rec.onstop=()=>{if(active.current){if(urlRef.current)URL.revokeObjectURL(urlRef.current);const objectUrl=URL.createObjectURL(new Blob(chunks.current,{type:rec.mimeType}));urlRef.current=objectUrl;setUrl(objectUrl);setRecording(false);}cleanup();};
      rec.onerror=()=>{setNotice('录音中断，请检查麦克风后重试。');stop();};rec.start();setSeconds(0);setRecording(true);
    }catch(e){cleanup();setNotice((e as DOMException).name==='NotAllowedError'?'麦克风权限被拒绝。请在浏览器地址栏允许麦克风后重试；你仍可听示范音并继续学习。':'未能访问麦克风，请确认设备已连接且没有被其他应用占用。');}
    finally{if(active.current)setPending(false);}
  }
  return <div className="recorder-card">
    <span className="tag"><Headphones size={14}/> 跟读练习 · 不提供发音评分</span>
    <h2 className="pronunciation-target" lang={knowledge.language}>{knowledge.target}</h2><p>{knowledge.meaning}</p>
    {showReading&&knowledge.reading?<p className="reading-hint">{knowledge.reading}</p>:null}
    <div className="audio-actions"><Button variant="secondary" onClick={()=>speak(knowledge.target)}><Volume2 size={18}/>听示范</Button><Button variant="secondary" onClick={()=>speak(knowledge.target,true)}><Turtle size={18}/>慢速播放</Button></div>
    {checked&&!available?<div className="notice">此设备暂无{languages[knowledge.language].name}语音。可在系统语音设置中安装对应声音；现在也可以看提示跟读。</div>:null}
    {error?<p role="status" className="notice">{error}</p>:null}
    <div className="pronunciation-tip"><strong>发音小提示</strong><p>{knowledge.hint}</p></div>
    <div className={`record-zone ${recording?'is-recording':''}`}>
      <button className="mic-button" disabled={pending} aria-label={recording?'停止录音':'开始录音'} onClick={recording?stop:start}>{recording?<Square size={25}/>:<Mic size={28}/>}</button>
      <strong>{pending?'正在请求麦克风权限…':recording?`录音中 · ${seconds}s`:'轮到你，轻松读一句'}</strong>
      <p>{recording?'点击停止，最长录制 60 秒':'点击麦克风开始，准备好再开口。'}</p>
      {recording?<Button variant="danger" onClick={stop}><Square size={15}/>停止录音</Button>:null}
    </div>
    {notice?<p className="notice" role="alert">{notice}</p>:null}
    {url?<div className="playback"><strong>听听自己的声音</strong><audio controls src={url} aria-label="回放我的录音"/><Button variant="ghost" onClick={()=>{URL.revokeObjectURL(urlRef.current);urlRef.current='';setUrl('');}}><RotateCcw size={15}/>清除录音</Button></div>:null}
    <p className="privacy-note">录音只在当前页面临时保留，不上传、不写入长期存储。离开页面即清除。这里是跟读练习，不做发音准确度评估。</p>
  </div>;
}
