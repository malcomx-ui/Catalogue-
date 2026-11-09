import React from 'react';

/**
 * Clean, blank page view for Mortgages module.
 * Preserves clean layout with no descriptions, sub-menus, or preview cards.
 */
export const MortgagesPlaceholder: React.FC = () => {
  return (
    <div
      data-testid="mortgages-blank-page"
      className="w-full min-h-[70vh] bg-transparent"
      aria-label="Mortgages"
    />
  );
};
