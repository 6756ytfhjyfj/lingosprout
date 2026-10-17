import { emptyState, STORAGE_KEY } from './learning';
import type { LearningState } from './types';

export interface LearningRepository { load(): {state:LearningState; warning?:string}; save(state:LearningState):string | null; clear():void; }
export class BrowserLearningRepository implements LearningRepository {
  load() {
    try {
      const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return {state:emptyState()};
      const data=JSON.parse(raw);
      if(data.version!==1 || !data.progress?.en || !data.progress?.ja || !data.progress?.ko || !Array.isArray(data.languages)
        || !['en','ja','ko'].includes(data.activeLanguage) || !data.profile || !data.rewardCounts || !Array.isArray(data.attempts)) throw new Error('invalid');
      return {state:data as LearningState};
    } catch { return {state:emptyState(),warning:'未能读取本地进度。你可以继续体验；请检查浏览器存储权限。'}; }
  }
  save(state:LearningState) {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return null; }
    catch { return '浏览器未能保存进度，请检查存储空间与隐私设置。'; }
  }
  clear(){localStorage.removeItem(STORAGE_KEY);}
}
