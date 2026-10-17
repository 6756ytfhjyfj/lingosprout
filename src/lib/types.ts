export type Language = 'en' | 'ja' | 'ko';
export type Level = 'zero' | 'some';
export type Goal = 'daily' | 'travel' | 'interest';
export type DailyGoal = 20 | 40 | 60;
export type QuestionType = 'choice' | 'match' | 'order' | 'fill' | 'listen';
export interface Knowledge {
  id: string; language: Language; target: string; meaning: string; reading: string;
  hint: string; explanation: string; difficulty: 1 | 2;
  tokens: string[]; acceptedAnswers: string[];
}
export interface Question {
  id: string; language: Language; type: QuestionType; prompt: string;
  target: string; meaning: string; correctAnswer: string; acceptedAnswers: string[];
  options: string[]; explanation: string; knowledgeId: string; difficulty: 1 | 2;
  tokens?: string[]; pairs?: { target: string; meaning: string; knowledgeId?: string }[];
}
export interface Lesson { id: string; language: Language; unitId: string; title: string; goal: string; intro: string; knowledge: Knowledge[]; questions: Question[]; }
export interface Unit { id: string; language: Language; title: string; description: string; icon: string; lessons: Lesson[]; }
export interface Attempt { questionId: string; knowledgeId: string; answer: string; correct: boolean; first: boolean; at: string; knowledgeIds?:string[]; incorrectKnowledgeIds?:string[]; }
export interface ReviewState {
  knowledgeId: string; language: Language; lastLearnedAt: string; lastReviewedAt: string | null;
  nextReviewAt: string; errors: number; consecutiveCorrect: number;
  mastery: 'new' | 'learning' | 'familiar' | 'solid'; step: number;
}
export interface LessonResult { lessonId: string; firstAccuracy: number; retryCount:number; retryAccuracy:number|null; count: number; xp: number; first: boolean; weakIds: string[]; at: string; }
export interface PracticeSession {
  id: string; language: Language; mode: 'lesson' | 'review'; lessonId: string;
  queue: Question[]; index: number; attempts: Attempt[]; initialCount: number;
  retryIds: string[]; reviewIds: string[]; startedAt: string;
}
export interface LanguageProgress { xp: number; completed: Record<string, LessonResult>; reviews: Record<string, ReviewState>; }
export interface LearningState {
  version: 1; onboarded: boolean; activeLanguage: Language; languages: Language[];
  profile: { name: string; level: Level; goal: Goal; dailyGoal: DailyGoal; reading: boolean; };
  progress: Record<Language, LanguageProgress>; studyDays: string[];
  dailyXP: Record<string, number>; rewardCounts: Record<string, number>;
  attempts: Attempt[]; draft: PracticeSession | null; lastResult: LessonResult | null;
  savedExpressions: Knowledge[];
}
export interface ChatCorrection { original: string; suggestion: string; explanation: string; }
export interface AIReply { text: string; translation: string; correction: ChatCorrection | null; phrases: { target: string; meaning: string }[]; improvements: string[]; }
export interface ChatMessage extends AIReply { id: string; role: 'user' | 'assistant'; at: string; }
export type Scene = 'meet' | 'restaurant' | 'transport' | 'shopping' | 'hotel';
export interface ChatSession { id: string; language: Language; scene: Scene; difficulty: Level; messages: ChatMessage[]; demo: boolean; ended: boolean; summary?: AIReply; }
export interface Subscription { status: 'free' | 'active'; source: 'none' | 'demo' | 'payment'; expiresAt: string | null; }
export interface ServerStatus { demo: boolean; authenticated: boolean; email?: string; subscription: Subscription; used: number; limit: number; freeLimit:number; premiumLimit:number; remaining: number; resetLabel: string; canDemoSubscribe: boolean; priceLabel: string; authConfigured: boolean; }
