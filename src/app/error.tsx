'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main style={{padding:48,textAlign:'center'}}><h1>花园遇到了一阵小风</h1><p>页面暂时未能打开。本机已保存的学习进度不会主动清除。</p><button onClick={reset}>重新试一次</button></main>;}
