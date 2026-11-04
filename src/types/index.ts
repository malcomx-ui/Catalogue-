export type UserRole = 'partner' | 'team_lead' | 'lawyer' | 'office_admin' | 'clerk' | string;

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
  role: 'partner' | 'team_lead' | 'lawyer' | 'office_admin' | 'clerk';
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
  { value: 'active', label: 'Active (Ongoing)' },
  { value: 'instructions', label: 'Instructions' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'dormant', label: 'Dormant' },
  { value: 'closed', label: 'Closed / Concluded' },
] as const;

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
