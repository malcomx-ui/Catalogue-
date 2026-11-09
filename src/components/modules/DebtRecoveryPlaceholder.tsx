import React from 'react';

/**
 * Clean, blank page view for Debt Recovery module.
 * Preserves clean layout with no descriptions, sub-menus, or preview cards.
 */
export const DebtRecoveryPlaceholder: React.FC = () => {
  return (
    <div
      data-testid="debt-recovery-blank-page"
      className="w-full min-h-[70vh] bg-transparent"
      aria-label="Debt Recovery"
    />
  );
};
