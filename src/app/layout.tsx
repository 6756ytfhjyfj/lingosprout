import type { Metadata,Viewport } from 'next';
import './globals.css';
import './visual-refresh.css';
import '../components/practice-refresh.css';
import './accounts.css';
export const metadata:Metadata={title:'语芽 LingoSprout · 每天一点，世界近一点',description:'原创游戏化多语言学习产品。英语、日语、韩语入门课程，智能复习与跟读练习，和芽芽一起把好奇种进日常。',applicationName:'语芽 LingoSprout',icons:{icon:'/icon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#f8f9f5'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
