'use client';
import {useId} from 'react';
export function Mascot({className='', mood='happy'}:{className?:string;mood?:'happy'|'celebrate'|'think'}) {
  const gradientId=`sprout-${useId().replace(/:/g,'')}`;
  return <svg viewBox="0 0 260 270" className={className} role="img" aria-label="原创吉祥物芽芽，一只长着叶子耳朵的小芽精灵">
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#c7ed9c"/><stop offset="1" stopColor="#9fd576"/></linearGradient></defs>
    <ellipse cx="130" cy="246" rx="76" ry="12" fill="#214e3712"/>
    <path d="M127 58C91 53 68 22 76 8c31-3 58 13 60 43" fill="#58a66b"/>
    <path d="M133 55c0-31 25-48 54-39 0 25-20 45-49 45" fill="#a2d77d"/>
    <path d="M131 60q-2-26 13-38" stroke="#367d54" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M67 148q-32-13-38 6t35 33" fill="#a5d981" stroke="#79b65e" strokeWidth="2"/>
    <path d={mood==='celebrate'?'M196 130q20-48 35-35t-23 64':'M194 146q36-15 39 6t-36 34'} fill="#a5d981" stroke="#79b65e" strokeWidth="2"/>
    <path d="M91 219q-9 24 9 25t24-22M144 221q5 28 24 23t3-27" fill="#5d9462"/>
    <path d="M56 163c-1-59 19-103 75-103s77 44 76 103c0 43-29 68-76 68s-75-25-75-68" fill={`url(#${gradientId})`} stroke="#78b663" strokeWidth="2"/>
    <ellipse cx="131" cy="169" rx="54" ry="46" fill="#e7f2c6"/>
    <ellipse cx="90" cy="147" rx="12" ry="7" fill="#e9ab91" opacity=".8"/><ellipse cx="171" cy="147" rx="12" ry="7" fill="#e9ab91" opacity=".8"/>
    {mood==='celebrate'?<><path d="m97 129 7-6 7 6M151 129l7-6 7 6" fill="none" stroke="#254b35" strokeWidth="5" strokeLinecap="round"/><path d="M120 144q11 17 23 0" fill="#254b35"/></>:<><ellipse cx="104" cy="129" rx="5" ry="7" fill="#254b35"/><ellipse cx="158" cy="129" rx="5" ry="7" fill="#254b35"/><circle cx="105" cy="127" r="1.5" fill="white"/><circle cx="159" cy="127" r="1.5" fill="white"/><path d="M123 145q8 8 16 0" fill="none" stroke="#254b35" strokeWidth="3.5" strokeLinecap="round"/></>}
    <path d="m116 179 14-10 14 10-14 18z" fill="#7cb867"/><path d="M130 176v14m-5-9 5 5 5-5" fill="none" stroke="#e9f2c6" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}
export function GardenScene(){return <div className="garden-scene" aria-hidden="true">
  <svg className="garden-backdrop" viewBox="0 0 480 330"><path d="M110 248V158a130 130 0 0 1 260 0v90" fill="none" stroke="#deebce" strokeWidth="29"/><path d="M148 248V160a92 92 0 0 1 184 0v88" fill="none" stroke="#edf3d9" strokeWidth="25"/>
    <path d="M27 284q54-104 116-24 61-93 138-17 99-63 176 41" fill="#c8ddb0"/><ellipse cx="249" cy="288" rx="167" ry="27" fill="#aecb95"/>
    <path d="M83 263q-11-44-33-47 1 36 33 47m1 0q-2-37 20-49 10 37-20 49M391 268q-14-40-33-40 2 34 33 40m0 0q1-35 23-43 4 33-23 43" fill="#76a77c"/>
    <path d="m381 54 4 9 9 4-9 4-4 9-4-9-9-4 9-4zM78 137l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#d5ae52"/>
    <circle cx="342" cy="114" r="4" fill="#e6ba6e"/><circle cx="123" cy="63" r="4" fill="#90b291"/>
  </svg>
  <div className="floating-note note-a">Hello! <span>✦</span></div><div className="floating-note note-b">こんにちは</div><div className="floating-note note-c">안녕!</div>
  <Mascot className="hero-mascot"/><span className="scene-flower flower-one">✿</span><span className="scene-flower flower-two">✿</span>
</div>;}
