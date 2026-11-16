export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DEFAULT_FIRM_BRANCHES = [
  { id: 'kla-hq', name: 'Kampala Central (Head Office)' },
  { id: 'ftp-reg', name: 'Fort Portal Regional Office' },
  { id: 'mbr-reg', name: 'Mbarara Regional Office' },
  { id: 'msk-reg', name: 'Masaka Regional Office' },
  { id: 'jnj-reg', name: 'Jinja Regional Office' },
  { id: 'glu-reg', name: 'Gulu Regional Office' },
  { id: 'msn-reg', name: 'Masindi Regional Office' },
];

export const isCentenaryBank = (bank?: string | null): boolean =>
  String(bank || '').trim().toLowerCase() === 'centenary bank';

export const isIMBank = (bank?: string | null): boolean => {
  const clean = String(bank || '').trim().toLowerCase();
  return clean === 'i&m bank' || clean === 'i & m bank' || clean === 'im bank';
};

export const isBarodaBank = (bank?: string | null): boolean => {
  const clean = String(bank || '').trim().toLowerCase();
  return clean === 'bank of baroda' || clean === 'baroda';
};

export const isKCBBank = (bank?: string | null): boolean => {
  const clean = String(bank || '').trim().toLowerCase();
  return clean === 'kcb' || clean === 'kcb bank' || clean === 'kcb bank uganda';
};

export const SUPERADMIN_ONLY_BANKS = ['I&M Bank', 'Bank of Baroda', 'KCB'] as const;

export const hasIndependentModule = (bank?: string | null): boolean =>
  isIMBank(bank) || isBarodaBank(bank) || isKCBBank(bank);

export const isSuperAdminOnlyBank = (bank?: string | null): boolean => {
  if (hasIndependentModule(bank)) return true;
  const clean = String(bank || '').trim().toLowerCase();
  if (!clean) return false;
  return (
    clean.includes('i&m') ||
    clean.includes('i & m') ||
    clean.includes('baroda') ||
    clean === 'kcb' ||
    clean.startsWith('kcb ')
  );
};

export const IM_SECURITY_TYPES = [
  'Registered Legal Mortgage',
  'Further Charge',
  'Corporate Debenture',
  'Chattels Mortgage',
  'Equitable Mortgage',
];

export const IM_TITLE_TYPES = ['Mailo', 'Freehold', 'Leasehold', 'Condominium'];

export const IM_STATUSES = [
  'Active / Processing',
  'Instruction Received',
  'Under Preparation',
  'Sent for Registration',
  'Registered',
  'Completed / Cleared',
  'On Hold',
  'Released / Discharged',
];

export const BARODA_SECURITY_NATURES = [
  'Registered Mortgage',
  'Equitable Mortgage',
  'Equitable-to-Legal Conversion',
  'Extension of Mortgage',
  'Hypothecation / Charge',
];

export const BARODA_CUSTODY_STATUSES = [
  'Title Received from Baroda',
  'URA Stamp Duty Assessed',
  'Lodged at MZO / Lands Registry',
  'Perfected & Returned to Baroda',
];

export const BARODA_STATUSES = [
  'Active / Processing',
  'Pending Stamp Duty Assessment',
  'Sent for Registration',
  'Registered',
  'Completed / Cleared',
  'On Hold',
  'Released / Discharged',
];

export const KCB_FACILITY_TYPES = [
  'KCB Home Loan',
  'Commercial Property Finance',
  'SME Term Loan',
  'Asset Finance / Debenture',
  'Corporate Syndicated',
];

export const KCB_PERFECTION_STAGES = [
  'Instruction Received',
  'Registry Search & Assessment',
  'Client Execution & Stamping',
  'Lodged at Lands Registry',
  'Instrument Registered & Returned',
];

export const KCB_STATUSES = [
  'Active / Processing',
  'Instruction Received',
  'Registry Search & Assessment',
  'Sent for Registration',
  'Registered',
  'Completed / Cleared',
  'On Hold',
  'Released / Discharged',
];

export interface DedicatedBankFormProps {
  initialRecord?: any;
  allowBankSelection?: boolean;
  onBankChange?: (bankName: string) => void;
  defaultMonth?: string;
  currentUser?: any;
  onClose: () => void;
  onSuccess: (
    savedRecord?: any,
    meta?: { cloudSaved?: boolean; cloudError?: string }
  ) => void;
}
