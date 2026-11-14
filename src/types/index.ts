export type UserRole =
  | 'super_admin'
  | 'partner'
  | 'admin'
  | 'branch_admin'
  | 'team_lead'
  | 'lawyer'
  | 'office_admin'
  | 'admin_finance_assistant'
  | 'clerk'
  | string;

export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Managing Partner (Super Admin)',
  superadmin: 'Managing Partner (Super Admin)',
  system_admin: 'System Administrator',
  partner: 'Managing Partner (Super Admin)',
  managing_partner: 'Managing Partner (Super Admin)',
  admin: 'Firm Administrator',
  branch_admin: 'Branch Administrator',
  office_admin: 'Branch Administrator',
  team_lead: 'Regional Team Lead',
  lawyer: 'Litigation Advocate',
  advocate: 'Litigation Advocate',
  admin_finance_assistant: 'Admin & Finance Assistant',
  clerk: 'Court & Registry Clerk',
  'role-super-admin': 'Managing Partner (Super Admin)',
  'role-admin': 'Branch Administrator',
  'role-team-lead': 'Regional Team Lead',
  'role-advocate': 'Litigation Advocate',
  'role-admin-finance-assistant': 'Admin & Finance Assistant',
  'role-clerk': 'Court & Registry Clerk',
};

export const USER_ROLE_BADGES: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  superadmin: 'bg-purple-100 text-purple-800 border-purple-200',
  system_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  partner: 'bg-purple-100 text-purple-800 border-purple-200',
  managing_partner: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  branch_admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  office_admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  team_lead: 'bg-blue-100 text-blue-800 border-blue-200',
  lawyer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  advocate: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  admin_finance_assistant: 'bg-teal-100 text-teal-800 border-teal-200',
  clerk: 'bg-slate-100 text-slate-800 border-slate-200',
  'role-super-admin': 'bg-purple-100 text-purple-800 border-purple-200',
  'role-admin': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'role-team-lead': 'bg-blue-100 text-blue-800 border-blue-200',
  'role-advocate': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'role-admin-finance-assistant': 'bg-teal-100 text-teal-800 border-teal-200',
  'role-clerk': 'bg-slate-100 text-slate-800 border-slate-200',
};

export function getUserRoleLabel(role?: string | null): string {
  const key = String(role || '').toLowerCase().trim();
  return USER_ROLE_LABELS[key] || (role ? String(role) : 'Staff Member');
}

export function getUserRoleBadge(role?: string | null): string {
  const key = String(role || '').toLowerCase().trim();
  return USER_ROLE_BADGES[key] || 'bg-slate-100 text-slate-700 border-slate-200';
}

export interface RolePermissions {
  canViewAllBranches: boolean;
  canCreateCases: boolean;
  canEditCases: boolean;
  canDeleteCases: boolean;
  canBulkImport: boolean; // Strictly Super Admin only
  canBulkExport: boolean; // Strictly Super Admin only
  canPrintCauseList: boolean; // Strictly Branch Administrators and Super Admin
  canScheduleHearings: boolean;
  canRecordOutcomes: boolean;
  canLogFileMovement: boolean;
  canManageDocuments: boolean;
  canViewFinancials: boolean;
  canManageRoles: boolean; // Super Admin: configure custom access roles
  canManageUsers: boolean; // Super Admin: add, suspend, or delete users
  canManageBranches: boolean; // Super Admin: add, edit, or remove branches
  canManageSettings?: boolean; // Super Admin: configure dynamic system features and entry requirements
}

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  isSuperAdmin: boolean;
  isSystem: boolean;
  badgeColor: string;
  permissions: RolePermissions;
  createdAt?: string;
  createdBy?: string;
  assignedUsersCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleId?: string;
  roleTitle: string;
  branchId: string;
  branchName: string;
  avatarUrl?: string;
  advocateRollNo?: string; // e.g. ULS / Bar Council ID
  isSuperAdmin?: boolean;
  isBranchAdmin?: boolean; // Branch Administrator with printing rights
  isSuspended?: boolean;
  suspendedReason?: string;
  password?: string;
  mustChangePassword?: boolean;
  temporaryPassword?: string;
}

export interface BranchStaffMember {
  id: string;
  name: string;
  role: 'super_admin' | 'partner' | 'admin' | 'branch_admin' | 'team_lead' | 'lawyer' | 'office_admin' | 'admin_finance_assistant' | 'clerk';
  roleTitle: string;
  email: string;
  phone?: string;
  advocateRollNo?: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  isHeadquarters: boolean;
  teamLead: string; // Team Lead (or Partner at HQ)
  officeAdmin: string;
  clerk: string;
  lawyersCount: number;
  phone: string;
  caseCount: number;
  syncStatus: 'synced' | 'syncing' | 'pending';
  lastSyncTime: string;
  latencyMs: number;
  activeAdvocates?: number;
  leadAdvocate?: string; // backward compat
  staff: BranchStaffMember[];
}

export type CourtDivision = 
  | 'High Court (Commercial Division)'
  | 'High Court (Land Division)'
  | 'High Court (Civil Division)'
  | 'High Court (Execution & Bailiffs)'
  | 'High Court (Anti-Corruption)'
  | 'Court of Appeal / Constitutional Court'
  | 'Supreme Court of Uganda'
  | 'Chief Magistrate Court'
  | 'Tax Appeals Tribunal'
  | 'Industrial Court'
  | 'East African Court of Justice';

export type CaseStage =
  | 'Pleadings & Defense'
  | 'Mediation & Scheduling'
  | 'Trial (Plaintiff Stage)'
  | 'Trial (Defense Stage)'
  | 'Final Legal Submissions'
  | 'Judgment / Ruling Reserved'
  | 'Decree & Execution'
  | 'Disposed & Closed'
  | 'On Appellate Review';

export type CasePriority = 'High / Urgent' | 'Standard' | 'Expedited' | 'Injunction Pending';

export interface Party {
  name: string;
  type: 'Plaintiff / Claimant' | 'Defendant / Respondent' | 'Third Party' | 'Appellant' | 'Applicant';
  representedByFirm: boolean;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface CourtHearing {
  id: string;
  caseId: string;
  suitNumber: string;
  caseTitle: string;
  hearingDate: string; // YYYY-MM-DD
  hearingTime: string; // HH:mm
  courtName: string;
  division: CourtDivision;
  courtRoom: string;
  presidingJudge: string;
  hearingPurpose: string; // e.g. "Cross-examination of PW1", "Hearing of Interim Application"
  leadCounsel: string;
  assignedAdvocates: string[];
  status: 'Scheduled' | 'Completed' | 'Adjourned' | 'Part-Heard';
  courtNotes?: string;
  nextHearingDate?: string;
  nextDirections?: string;
  virtualCourtUrl?: string;
  branchId: string;
}

export interface PleadingDocument {
  id: string;
  caseId: string;
  suitNumber: string;
  title: string;
  documentType: 'Plaint' | 'Written Statement of Defense' | 'Affidavit' | 'Chamber Summons' | 'Notice of Motion' | 'Legal Submissions' | 'Court Order' | 'Decree' | 'Trial Bundle' | 'Exhibit' | 'Correspondence';
  fileFormat: 'pdf' | 'docx' | 'xlsx' | 'scan';
  fileSize: string;
  filingDate: string;
  filedBy: string;
  courtRegistryStamp?: boolean;
  downloadUrl?: string;
  summary?: string;
  version: number;
}

export interface CaseActivity {
  id: string;
  caseId: string;
  timestamp: string;
  author: string;
  authorRole: string;
  branchName: string;
  type: 'filing' | 'hearing_update' | 'stage_change' | 'document_uploaded' | 'note_added' | 'branch_transfer';
  description: string;
}

export interface CaseItem {
  id: string;
  suitNumber: string; // Official court identifier entered by user or imported
  suit_no?: string; // Unique identifier assigned by the court registry
  firmRefNumber: string; // Internal firm reference
  title: string;
  court: string;
  division: CourtDivision;
  presidingJudge: string;
  courtStation: string;
  stage: CaseStage;
  priority: CasePriority;
  branchId: string;
  branchName: string;
  leadAdvocate: string;
  assistingAdvocates: string[];
  parties: Party[];
  opposingFirm: string;
  opposingCounsel: string;
  claimValueUGX: number;
  claimValueUSD?: number;
  filingDate: string;
  nextHearingDate?: string;
  nextHearingPurpose?: string;
  nextHearingJudge?: string;
  syncedAcrossBranches: boolean;
  briefSummary: string;
  reliefsSought?: string[];
  documentsCount: number;
  lastUpdated: string;
  status: 'Active' | 'Dormant' | 'Archived' | 'Inactive' | 'Instructions' | 'Pending' | string;
  
  // Specific Form Fields
  case_number?: string;
  case_type?: string;
  client?: string;
  clientName?: string;
  branch?: string;
  date_of_instructions?: string;
  district?: string;
  subject_matter?: string;
  notes?: string;
  hearing_date?: string;
  target?: string;
  file_location?: string;
  year_of_closure?: number | string | null;
  billing_status?: string;
  payment_status?: string;
  verdict?: string;
  person_in_conduct?: string;
  persons_in_conduct?: string[];

  fileMovementHistory?: FileMovementRecord[];
  progressiveNotes?: ProgressiveNote[];

  transferHistory?: {
    fromBranch: string;
    toBranch: string;
    transferDate: string;
    reason: string;
    approvedBy: string;
  }[];
}

export interface LegalCase extends CaseItem {
  suit_no?: string;
}

export interface FileMovementRecord {
  id: string;
  timestamp: string;
  fromLocation: string;
  toLocation: string;
  movedBy: string;
  reason: string;
  receivedBy?: string;
  status?: 'In Transit' | 'At Registry' | 'With Advocate' | 'In Court' | 'Archived';
}

export interface ProgressiveNote {
  id: string;
  timestamp: string;
  author: string;
  authorRole?: string;
  category: 'Court Milestone' | 'Client Communication' | 'Strategy' | 'Registry & Filing' | 'Settlement / Recovery' | 'General';
  content: string;
}

export const CASE_TYPES = [
  'Civil',
  'Commercial',
  'Land',
  'Criminal',
  'Constitutional & Appellate',
  'Family & Succession',
  'Labor & Employment',
  'Tax & Revenue',
  'Arbitration & ADR',
] as const;

export const CASE_STATUSES = [
  { value: 'Active', label: 'Active' },
  { value: 'Mention', label: 'Mention' },
  { value: 'Pending Ruling / Judgment', label: 'Pending Ruling / Judgment' },
  { value: 'At Execution', label: 'At Execution' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Archived', label: 'Archived' },
  { value: 'Pending', label: 'Pending Hearing' },
  { value: 'Instructions', label: 'Instructions' },
  { value: 'Adjourned', label: 'Adjourned' },
  { value: 'Dormant', label: 'Dormant' },
] as const;

export type CaseStatus =
  | 'Active'
  | 'Mention'
  | 'Pending Ruling / Judgment'
  | 'Pending Ruling'
  | 'Closed'
  | 'At Execution'
  | 'Archived'
  | 'Pending'
  | 'Instructions'
  | 'Adjourned'
  | 'Dormant'
  | 'Inactive'
  | string;

export interface CalendarMatterEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'hearing' | 'deadline' | 'milestone';
  title: string;
  suitNumber?: string;
  suitNo?: string;
  caseId?: string;
  court?: string;
  courtRoom?: string;
  judge?: string;
  purpose: string;
  counsel?: string;
  status: string;
  branchId?: string;
  branchName?: string;
  daysRemaining?: number;
  isUrgent?: boolean;
}

export { UGANDA_DISTRICTS, type UgandaDistrict } from '../data/ugandaDistricts';

export interface SyncLog {
  id: string;
  timestamp: string;
  branchId: string;
  branchName: string;
  action: string;
  recordsSynced: number;
  status: 'SUCCESS' | 'SYNCING' | 'CONFLICT_RESOLVED';
  latencyMs: number;
  details: string;
}

export interface ConflictCheckResult {
  searchQuery: string;
  timestamp: string;
  checkedBy: string;
  hasConflict: boolean;
  matchedCases: {
    caseId: string;
    suitNumber: string;
    caseTitle: string;
    partyName: string;
    partyType: string;
    representedByFirm: boolean;
    branchName: string;
    leadAdvocate: string;
  }[];
}

// ==============================================================================
// DYNAMIC SYSTEM SETTINGS & ENTRY REQUIREMENTS (NO REBUILD REQUIRED)
// ==============================================================================

export type FieldRequirementLevel = 'mandatory' | 'optional' | 'hidden';

export interface IntakeFieldConfig {
  id: string;
  label: string;
  requirement: FieldRequirementLevel;
  helpText?: string;
  isSystem?: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[]; // for select
  requirement: FieldRequirementLevel;
  helpText?: string;
}

export interface SystemFeaturesConfig {
  enableCauseList: boolean;
  enableDocuments: boolean;
  enableConflicts: boolean;
  enableBranchSync: boolean;
  enableAnalytics: boolean;
  enableFinancials: boolean;
  enablePhysicalFileTracking: boolean;
  enableProgressiveNotes: boolean;
  requirePasswordChangeOnFirstLogin: boolean;
  allowPublicRegistration: boolean;
  enableCaseAutoNumbering: boolean;
  caseNumberPrefix: string;
}

export interface FirmBrandingConfig {
  firmName: string;
  firmTagline: string;
  officialEmail: string;
  officialPhone: string;
  headquartersAddress: string;
  currencySymbol: string;
  jurisdiction: string;
}

export interface SystemSettings {
  version: string;
  lastUpdated: string;
  updatedBy?: string;
  firm: FirmBrandingConfig;
  features: SystemFeaturesConfig;
  intakeFields: Record<string, IntakeFieldConfig>;
  customFields: CustomFieldDefinition[];
  courtList: string[];
  practiceAreas: string[];
}

export interface AuditLog {
  id: string;
  case_id?: string;
  case_number?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  performed_by?: string;
  user_email?: string;
  user_role?: string;
  branch?: string;
  changes?: Record<string, any>;
  created_at: string;
}

export interface CaseAuditLog {
  id: string;
  case_id?: string;
  case_number?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id?: string;
  user_email?: string;
  user_role?: string;
  timestamp: string;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  modified_fields?: Record<string, { old: any; new: any }> | null;
  created_at: string;
}

export { 
  type UserProfile,
  isSystemAdmin,
  isSuperAdmin, 
  isBranchAdmin, 
  isAdminFinanceAssistant,
  canViewAllBranches,
  canModifyRecordInBranch,
  canAccessGlobalSettings,
  canManageFirm 
} from '../utils/permissions';

