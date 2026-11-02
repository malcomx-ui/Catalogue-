import React from 'react';

interface UgxCurrencyIconProps {
  className?: string;
  size?: number;
}

/**
 * Custom SVG icon representing the Uganda Shillings (UGX) currency emblem.
 * Perfectly sized and styled to align with Lucide icon specifications.
 */
export const UgxCurrencyIcon: React.FC<UgxCurrencyIconProps> = ({
  className = 'w-4 h-4 text-emerald-600',
  size = 16,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="UGX Currency"
    >
      {/* Outer coin border */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      {/* Inner subtle milled/accent ring */}
      <circle
        cx="12"
        cy="12"
        r="7.5"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeDasharray="1.5 1.5"
        opacity="0.45"
      />
      {/* UGX typography */}
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fill="currentColor"
        stroke="none"
        letterSpacing="-0.3px"
      >
        UGX
      </text>
    </svg>
  );
};

export default UgxCurrencyIcon;
