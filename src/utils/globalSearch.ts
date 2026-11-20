import type { Branch, CaseItem } from '../types';

/**
 * Derives a clean, consistent uppercase Branch Code from a branch record
 * (e.g. 'kla-hq' -> 'KLA-HQ', 'mbr-reg' -> 'MBR-REG', 'Kampala' -> 'KLA').
 */
export function getBranchCode(
  branchId?: string | null,
  branchName?: string | null,
  city?: string | null
): string {
  const rawId = String(branchId || '').trim();
  if (rawId && rawId.toLowerCase() !== 'all') {
    return rawId.toUpperCase();
  }
  const source = String(city || branchName || '').trim();
  if (!source) return 'FIRM';
  const clean = source
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\b(branch|office|station|regional|central|headquarters|hq)\b/gi, '')
    .trim();
  const token = (clean || source).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return token.slice(0, 3) || 'FIRM';
}

export function getBranchStationKey(
  branchId?: string | null,
  branchName?: string | null,
  city?: string | null
): string {
  const rawName = String(city || branchName || '').trim().toLowerCase();
  const cleaned = rawName
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\b(branch|office|station|regional|central|headquarters|hq|main)\b/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (cleaned) return cleaned;
  return String(branchId || '').trim().toLowerCase();
}

export interface DeduplicatedBranch<T extends { id: string; name: string; city?: string; isHeadquarters?: boolean }> {
  primary: T;
  mergedIds: string[];
  mergedNames: string[];
}

export function dedupeBranches<
  T extends { id: string; name: string; city?: string; isHeadquarters?: boolean }
>(branches: T[]): Array<DeduplicatedBranch<T>> {
  const map = new Map<string, DeduplicatedBranch<T>>();

  branches.forEach((branch) => {
    if (!branch) return;
    const key = getBranchStationKey(branch.id, branch.name, branch.city) || branch.id.toLowerCase();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        primary: branch,
        mergedIds: [branch.id],
        mergedNames: [branch.name],
      });
      return;
    }

    const preferIncoming =
      (branch.id.toLowerCase() === 'kla-hq' && existing.primary.id.toLowerCase() !== 'kla-hq') ||
      (Boolean(branch.isHeadquarters) && !existing.primary.isHeadquarters);

    if (preferIncoming) {
      existing.primary = branch;
    }
    if (branch.id && !existing.mergedIds.includes(branch.id)) {
      existing.mergedIds.push(branch.id);
    }
    if (branch.name && !existing.mergedNames.includes(branch.name)) {
      existing.mergedNames.push(branch.name);
    }
  });

  return Array.from(map.values());
}

/**
 * Returns all searchable branch code & label aliases for a branch
 * (full ID code, short 3-letter prefix before '-', city 3-letter code, full name, city).
 */
export function getBranchSearchTokens(
  branchId?: string | null,
  branchName?: string | null,
  city?: string | null
): string[] {
  const tokens: string[] = [];
  const rawId = String(branchId || '').trim();
  if (rawId && rawId.toLowerCase() !== 'all') {
    tokens.push(rawId);
    const prefix = rawId.split(/[-_\s]/)[0];
    if (prefix) tokens.push(prefix);
  }
  const code = getBranchCode(branchId, branchName, city);
  if (code) {
    tokens.push(code);
    const shortCode = code.split(/[-_\s]/)[0];
    if (shortCode) tokens.push(shortCode);
  }
  if (branchName) tokens.push(branchName);
  if (city) {
    tokens.push(city);
    const cityPrefix = city.replace(/[^a-zA-Z]/g, '').slice(0, 3);
    if (cityPrefix.length >= 2) tokens.push(cityPrefix);
  }
  return tokens;
}

/**
 * Multi-token case-insensitive matcher: every whitespace-separated term in the query
 * must match at least one field in `haystacks`.
 */
export function matchesMultiTokenQuery(
  haystacks: Array<string | number | null | undefined>,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const combined = haystacks
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
    .map((v) => String(v).toLowerCase())
    .join(' | ');

  if (!combined) return false;
  return terms.every((term) => combined.includes(term));
}

export function resolveBranchForRecord(
  branchId: string | null | undefined,
  branchName: string | null | undefined,
  branches: Branch[]
): Branch | undefined {
  const idLower = String(branchId || '').trim().toLowerCase();
  const nameLower = String(branchName || '').trim().toLowerCase();
  return branches.find((b) => {
    if (idLower && b.id.toLowerCase() === idLower) return true;
    if (nameLower) {
      const bName = b.name.toLowerCase();
      const bCity = (b.city || '').toLowerCase();
      if (bName === nameLower || bName.includes(nameLower) || (bCity && nameLower.includes(bCity))) {
        return true;
      }
    }
    return false;
  });
}

export function matchesBranchGlobalSearch(
  branch: { id: string; name: string; city?: string },
  query: string
): boolean {
  const tokens = getBranchSearchTokens(branch.id, branch.name, branch.city);
  return matchesMultiTokenQuery(tokens, query);
}

export function matchesCaseGlobalSearch(
  c: CaseItem,
  query: string,
  branches: Branch[]
): boolean {
  const matchedBranch = resolveBranchForRecord(c.branchId, c.branch || c.branchName, branches);
  const partiesText = Array.isArray(c.parties)
    ? c.parties.map((p) => p?.name || '').filter(Boolean)
    : [];

  const branchTokens = getBranchSearchTokens(
    c.branchId || matchedBranch?.id,
    c.branchName || c.branch || matchedBranch?.name,
    matchedBranch?.city
  );

  return matchesMultiTokenQuery(
    [
      // Case IDs & References
      c.id,
      c.case_number,
      c.firmRefNumber,
      c.suitNumber,
      c.suit_no,
      // Client Names & Parties
      c.clientName,
      c.client,
      c.title,
      ...partiesText,
      // Branch Codes & Stations
      ...branchTokens,
      // Useful Secondary Context
      c.court,
      c.case_type,
      c.status,
    ],
    query
  );
}

export function matchesMortgageGlobalSearch(
  m: any,
  query: string,
  branches: Branch[]
): boolean {
  const branchLabel = m.firm_branch_station || m.branch_name || m.bank_branch_station;
  const matchedBranch = resolveBranchForRecord(m.branch_id, branchLabel, branches);
  const branchTokens = getBranchSearchTokens(
    m.branch_id || matchedBranch?.id,
    branchLabel || matchedBranch?.name,
    matchedBranch?.city
  );

  return matchesMultiTokenQuery(
    [
      m.id,
      m.file_ref,
      m.mortgage_ref,
      m.loan_ref,
      m.borrower_name,
      m.mortgagor_name,
      m.client_name,
      m.bank_name,
      m.client_bank_name,
      m.status,
      m.perfection_status,
      ...branchTokens,
    ],
    query
  );
}

export type GlobalSearchMatchDimension = 'Case ID' | 'Client' | 'Branch Code';

export function getCaseMatchDimensions(
  c: CaseItem,
  query: string,
  branches: Branch[]
): GlobalSearchMatchDimension[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const badges: GlobalSearchMatchDimension[] = [];

  const caseIdHaystack = [c.id, c.case_number, c.firmRefNumber, c.suitNumber, c.suit_no]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (terms.some((t) => caseIdHaystack.includes(t))) {
    badges.push('Case ID');
  }

  const partiesText = Array.isArray(c.parties)
    ? c.parties.map((p) => p?.name || '').join(' ')
    : '';
  const clientHaystack = [c.clientName, c.client, c.title, partiesText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (terms.some((t) => clientHaystack.includes(t))) {
    badges.push('Client');
  }

  const matchedBranch = resolveBranchForRecord(c.branchId, c.branch || c.branchName, branches);
  const branchHaystack = getBranchSearchTokens(
    c.branchId || matchedBranch?.id,
    c.branchName || c.branch || matchedBranch?.name,
    matchedBranch?.city
  )
    .join(' ')
    .toLowerCase();
  if (terms.some((t) => branchHaystack.includes(t))) {
    badges.push('Branch Code');
  }

  return badges;
}
