import React from 'react';

export type StatusTone = 'emerald' | 'amber' | 'rose' | 'slate';

export interface StatusBadgeProps {
  status?: string | null;
  label?: string;
  tone?: StatusTone;
  size?: 'xs' | 'sm';
  icon?: React.ReactNode;
  showDot?: boolean;
  className?: string;
  title?: string;
}

export function resolveStatusTone(rawStatus?: string | null): StatusTone {
  const s = (rawStatus || 'Active').trim().toLowerCase();

  // Red / Rose: Urgent, Hearings, Closed, Dormant, Suspended, Overdue, Execution alerts, Cancelled
  if (
    s.includes('urgent') ||
    s.includes('hearing') ||
    s.includes('today') ||
    s.includes('critical') ||
    s.includes('high') ||
    s === 'closed' ||
    s.includes('closed') ||
    s.includes('concluded') ||
    s.includes('disposed') ||
    s.includes('archived') ||
    s.includes('dormant') ||
    s.includes('inactive') ||
    s.includes('suspend') ||
    s.includes('overdue') ||
    s.includes('cancel') ||
    s.includes('default') ||
    s.includes('execution') ||
    s.includes('decree') ||
    s.includes('released') ||
    s.includes('discharged') ||
    s === 'delete' ||
    s.includes('rejected') ||
    s.includes('fail')
  ) {
    return 'rose';
  }

  // Yellow / Amber: Pending, Ruling, Mention, Adjourned, Scheduled, Under Preparation, On Hold, Instructions
  if (
    s.includes('pending') ||
    s.includes('ruling') ||
    s.includes('judgment') ||
    s.includes('mention') ||
    s.includes('adjourn') ||
    s.includes('part-heard') ||
    s.includes('part heard') ||
    s.includes('preparation') ||
    s.includes('registration') ||
    s.includes('instruction') ||
    s.includes('hold') ||
    s.includes('valuation') ||
    s.includes('scheduled') ||
    s.includes('warning') ||
    s.includes('review') ||
    s === 'update' ||
    s === 'view only'
  ) {
    return 'amber';
  }

  // Green / Emerald: Active, Disbursed, Registered, Completed, Cleared, Resolved, Paid, Live
  if (
    s.includes('active') ||
    s.includes('ongoing') ||
    s.includes('disbursed') ||
    s.includes('registered') ||
    s.includes('completed') ||
    s.includes('cleared') ||
    s.includes('resolved') ||
    s.includes('paid') ||
    s.includes('live') ||
    s.includes('success') ||
    s.includes('sync') ||
    s === 'insert' ||
    s.includes('full access')
  ) {
    return 'emerald';
  }

  return 'emerald';
}

const TONE_STYLES: Record<StatusTone, { pill: string; dot: string }> = {
  emerald: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  rose: {
    pill: 'bg-rose-50 text-rose-700 border-rose-200/90 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  slate: {
    pill: 'bg-slate-100 text-slate-700 border-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  tone,
  size = 'sm',
  icon,
  showDot = true,
  className = '',
  title,
}) => {
  const displayLabel = label ?? (status && status.trim() ? status : 'Active');
  const resolvedTone = tone ?? resolveStatusTone(status ?? displayLabel);
  const styles = TONE_STYLES[resolvedTone];

  const sizeClass =
    size === 'xs'
      ? 'px-2 py-0.5 text-[11px] font-medium gap-1'
      : 'px-2.5 py-0.5 text-xs font-medium gap-1.5';

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border whitespace-nowrap leading-tight ${sizeClass} ${styles.pill} ${className}`}
    >
      {icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : showDot ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      ) : null}
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
