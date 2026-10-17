'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, ArrowRight, LoaderCircle } from 'lucide-react';
export function Button({children,onClick,variant='primary',className='',disabled=false,type='button',loading=false,ariaLabel}:{children:ReactNode;onClick?:()=>void;variant?:'primary'|'secondary'|'ghost'|'danger';className?:string;disabled?:boolean;type?:'button'|'submit';loading?:boolean;ariaLabel?:string}){
  return <button type={type} onClick={onClick} disabled={disabled||loading} aria-label={ariaLabel} className={`button button-${variant} ${className}`}>{loading?<LoaderCircle size={18} className="spin"/>:null}{children}</button>;
}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  const headingId=useId();
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} aria-labelledby={headingId} className={`modal ${wide?'modal-wide':''}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal-heading"><h2 id={headingId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={21}/></button></div>{children}
  </dialog>;
}
export function PageHeading({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:ReactNode}){
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
export function TextLink({children,onClick}:{children:ReactNode;onClick:()=>void}){return <button className="text-link" onClick={onClick}>{children}<ArrowRight size={15}/></button>;}
export function Progress({value,label}:{value:number;label:string}){return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div>;}
export function Empty({icon,title,description,children}:{icon:ReactNode;title:string;description:string;children?:ReactNode}){return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{children}</div>;}
