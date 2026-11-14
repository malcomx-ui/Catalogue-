import { Branch, CaseItem, CourtHearing, User, getUserRoleLabel } from '../types';

export interface LegalTeamMember {
  key: string; // deterministic slug or user id used in /legal-team/:key
  id?: string;
  name: string;
  email?: string;
  role: string;
  roleTitle: string;
  branchId?: string;
  branchName: string;
  advocateRollNo?: string;
  isSuspended?: boolean;
  totalCasesCount: number;
  activeCasesCount: number;
  closedCasesCount: number;
  upcomingHearingsCount: number;
}

export function slugifyStaffKey(nameOrId: string): string {
  return String(nameOrId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'staff-member';
}

export function normalizePersonName(name?: string | null): string {
  return String(name || '')
    .replace(/^(counsel|advocate|adv\.?|mr\.?|mrs\.?|ms\.?|dr\.?|hon\.?)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isCaseClosedOrArchived(c: CaseItem): boolean {
  const s = (c.status || '').toLowerCase();
  return (
    s === 'closed' ||
    s === 'archived' ||
    s.includes('closed') ||
    s.includes('concluded') ||
    s.includes('disposed') ||
    s.includes('resolved') ||
    Boolean(c.year_of_closure)
  );
}

export function extractCaseCounselNames(c: CaseItem): string[] {
  const names = new Set<string>();
  const addTokens = (raw?: string | null) => {
    if (!raw) return;
    raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((n) => names.add(n));
  };

  addTokens(c.leadAdvocate);
  (c.assistingAdvocates || []).forEach((n) => {
    if (n && n.trim()) names.add(n.trim());
  });
  addTokens(c.person_in_conduct);
  (c.persons_in_conduct || []).forEach((n) => {
    if (n && n.trim()) names.add(n.trim());
  });

  return Array.from(names);
}

export function doesCaseMatchMember(c: CaseItem, member: Pick<LegalTeamMember, 'name'>): boolean {
  const targetNorm = normalizePersonName(member.name);
  if (!targetNorm) return false;

  const caseCounsel = extractCaseCounselNames(c);
  return caseCounsel.some((n) => {
    const norm = normalizePersonName(n);
    return norm === targetNorm || norm.includes(targetNorm) || targetNorm.includes(norm);
  });
}

export function buildLegalTeamDirectory(params: {
  availableUsers: User[];
  cases: CaseItem[];
  hearings: CourtHearing[];
  branches: Branch[];
  canViewAllBranches: boolean;
  userBranchId?: string;
  userBranchName?: string;
}): LegalTeamMember[] {
  const {
    availableUsers,
    cases,
    hearings,
    branches,
    canViewAllBranches,
    userBranchId,
    userBranchName,
  } = params;

  const todayStr = new Date().toISOString().split('T')[0];

  const scopedCases = canViewAllBranches
    ? cases
    : cases.filter((c) => {
        const targetBranch = branches.find((b) => b.id === userBranchId);
        const targetCity = targetBranch?.city?.toLowerCase() || '';
        const targetName = (targetBranch?.name || userBranchName || '').toLowerCase();
        const bName = (c.branch || c.branchName || '').toLowerCase();
        return (
          (userBranchId && c.branchId === userBranchId) ||
          (targetCity && bName.includes(targetCity)) ||
          (targetName && bName.includes(targetName))
        );
      });

  const byNormalizedName = new Map<string, LegalTeamMember>();

  // 1. Seed with registered firm users
  availableUsers.forEach((u) => {
    if (!u || !u.name) return;
    if (!canViewAllBranches && userBranchId && u.branchId && u.branchId !== userBranchId) {
      return;
    }
    const norm = normalizePersonName(u.name);
    if (!norm) return;

    const branchObj = branches.find((b) => b.id === u.branchId);
    const resolvedBranchName = u.branchName || branchObj?.name || 'Kampala Central (Head Office)';
    const roleLabel = u.roleTitle || getUserRoleLabel(u.roleId || u.role);

    byNormalizedName.set(norm, {
      key: slugifyStaffKey(u.name),
      id: u.id,
      name: u.name.trim(),
      email: u.email,
      role: String(u.role || 'lawyer'),
      roleTitle: roleLabel,
      branchId: u.branchId,
      branchName: resolvedBranchName,
      advocateRollNo: u.advocateRollNo,
      isSuspended: u.isSuspended,
      totalCasesCount: 0,
      activeCasesCount: 0,
      closedCasesCount: 0,
      upcomingHearingsCount: 0,
    });
  });

  // 2. Merge branch directory staff if not yet present
  branches.forEach((b) => {
    if (!canViewAllBranches && userBranchId && b.id !== userBranchId) return;
    (b.staff || []).forEach((s) => {
      const norm = normalizePersonName(s.name);
      if (!norm || byNormalizedName.has(norm)) return;
      byNormalizedName.set(norm, {
        key: slugifyStaffKey(s.name),
        id: s.id,
        name: s.name.trim(),
        email: s.email,
        role: s.role,
        roleTitle: s.roleTitle || getUserRoleLabel(s.role),
        branchId: b.id,
        branchName: b.name,
        advocateRollNo: s.advocateRollNo,
        totalCasesCount: 0,
        activeCasesCount: 0,
        closedCasesCount: 0,
        upcomingHearingsCount: 0,
      });
    });
  });

  // 3. Merge counsel names appearing on scoped cases
  scopedCases.forEach((c) => {
    const counselNames = extractCaseCounselNames(c);
    const closed = isCaseClosedOrArchived(c);
    counselNames.forEach((rawName) => {
      const norm = normalizePersonName(rawName);
      if (!norm) return;

      let existing = byNormalizedName.get(norm);
      if (!existing) {
        // Check partial match against existing members so "M. Kiiza" or full names reconcile cleanly if identical norm
        existing = {
          key: slugifyStaffKey(rawName),
          name: rawName.trim(),
          role: 'lawyer',
          roleTitle: 'Litigation Counsel',
          branchId: c.branchId,
          branchName: c.branchName || c.branch || 'Kampala Central (Head Office)',
          totalCasesCount: 0,
          activeCasesCount: 0,
          closedCasesCount: 0,
          upcomingHearingsCount: 0,
        };
        byNormalizedName.set(norm, existing);
      }

      existing.totalCasesCount += 1;
      if (closed) {
        existing.closedCasesCount += 1;
      } else {
        existing.activeCasesCount += 1;
      }
    });
  });

  // 4. Count upcoming hearings per member
  const members = Array.from(byNormalizedName.values());
  members.forEach((m) => {
    const targetNorm = normalizePersonName(m.name);
    const hearingIds = new Set<string>();
    hearings.forEach((h) => {
      if (h.hearingDate && h.hearingDate >= todayStr && h.status === 'Scheduled') {
        const leadNorm = normalizePersonName(h.leadCounsel);
        const assignedMatch = (h.assignedAdvocates || []).some((a) => {
          const an = normalizePersonName(a);
          return an === targetNorm || an.includes(targetNorm) || targetNorm.includes(an);
        });
        const matchedCase = scopedCases.find((c) => c.id === h.caseId);
        if (
          (leadNorm && (leadNorm === targetNorm || leadNorm.includes(targetNorm) || targetNorm.includes(leadNorm))) ||
          assignedMatch ||
          (matchedCase && doesCaseMatchMember(matchedCase, m))
        ) {
          hearingIds.add(h.id);
        }
      }
    });
    m.upcomingHearingsCount = hearingIds.size;
  });

  return members.sort((a, b) => {
    if (b.activeCasesCount !== a.activeCasesCount) return b.activeCasesCount - a.activeCasesCount;
    if (b.totalCasesCount !== a.totalCasesCount) return b.totalCasesCount - a.totalCasesCount;
    return a.name.localeCompare(b.name);
  });
}

export function findLegalTeamMemberByKey(
  members: LegalTeamMember[],
  key: string | null | undefined
): LegalTeamMember | null {
  if (!key) return null;
  const cleanKey = key.trim().toLowerCase();
  return (
    members.find(
      (m) =>
        m.key.toLowerCase() === cleanKey ||
        (m.id && m.id.toLowerCase() === cleanKey) ||
        normalizePersonName(m.name) === normalizePersonName(key)
    ) || null
  );
}
