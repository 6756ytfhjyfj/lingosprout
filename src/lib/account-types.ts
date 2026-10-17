export type AccountRole='owner'|'admin'|'member';
export interface AccountTitle {id:string;name:string;color:string}
export interface Account {id:string;email:string;role:AccountRole;disabled:boolean;created_at:string;application_count:number;email_verified:boolean;titles:AccountTitle[]}
export interface PremiumApplication {id:string;user_id:string;email?:string;ordinal:number;message:string;status:'pending'|'approved'|'rejected';created_at:string;reviewed_at:string|null;review_note:string;expires_at:string|null}
export interface DeviceInfo {id:string;label:string;registered_here:boolean;created_at:string;current:boolean;revoked_at:string|null}
export interface AccountOverview {account:Account;applications:PremiumApplication[];devices:DeviceInfo[]}
export interface AdminSettings {model:string;freeLimit:number;premiumLimit:number;siteTitle:string;applicationsOpen:boolean;keyConfigured:boolean}
export interface AdminSnapshot {accounts:(Account & {premium_expires_at:string|null;premium_active:boolean})[];applications:PremiumApplication[];titles:AccountTitle[];settings:AdminSettings;audit:{id:number;action:string;actor_email:string;target:string;created_at:string}[];counts:{accounts:number;pending:number;premium:number;devices:number}}
