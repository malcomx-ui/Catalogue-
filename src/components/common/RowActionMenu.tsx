import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Lock } from 'lucide-react';

export interface RowActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  danger?: boolean;
  dividerBefore?: boolean;
}

export interface RowActionMenuProps {
  items: RowActionItem[];
  ariaLabel?: string;
  buttonClassName?: string;
}

export const RowActionMenu: React.FC<RowActionMenuProps> = ({
  items,
  ariaLabel = 'Row actions',
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = items.filter(Boolean);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 200;
    const estimatedHeight = visibleItems.length * 36 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight + 12;

    const left = Math.max(
      12,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)
    );
    const top = openUp ? rect.top - 6 : rect.bottom + 6;

    setCoords({ top, left, openUp });
  }, [visibleItems.length]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  if (visibleItems.length === 0) return null;

  return (
    <div
      className="relative inline-flex items-center justify-end print:hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen((prev) => !prev);
        }}
        className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer ${
          isOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700' : ''
        } ${buttonClassName}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: coords.openUp ? 'translateY(-100%)' : 'none',
              width: 204,
            }}
            onClick={(e) => e.stopPropagation()}
            className="z-[90] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg py-1.5 text-left animate-in fade-in duration-100"
          >
            {visibleItems.map((item) => (
              <React.Fragment key={item.id}>
                {item.dividerBefore && <div className="my-1 border-t border-slate-100 dark:border-slate-800" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.disabled && item.disabledReason ? item.disabledReason : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`w-full px-3 py-2 text-xs font-medium flex items-center justify-between gap-2 text-left transition-colors ${
                    item.disabled
                      ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
                      : item.danger
                      ? 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    {item.icon && (
                      <span
                        className={`shrink-0 flex items-center ${
                          item.disabled
                            ? 'text-slate-300'
                            : item.danger
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.disabled && <Lock className="w-3 h-3 text-slate-300 shrink-0" />}
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default RowActionMenu;
