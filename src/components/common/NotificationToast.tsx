import React, { useState, useEffect } from 'react';
import { subscribeToNotifications, AppNotification } from '../../utils/notification';

export const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((newNotif) => {
      setNotifications((prev) => [...prev, newNotif]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
      }, 5000);
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none p-2">
      {notifications.map((n) => {
        let bgStyle = 'bg-slate-900 text-white border-slate-700';
        let badgeStyle = 'bg-slate-800 text-slate-300';
        let icon = 'ℹ️';

        if (n.type === 'error') {
          bgStyle = 'bg-rose-900 text-rose-50 border-rose-700 shadow-rose-950/40';
          badgeStyle = 'bg-rose-950 text-rose-300';
          icon = '⛔';
        } else if (n.type === 'success') {
          bgStyle = 'bg-emerald-900 text-emerald-50 border-emerald-700 shadow-emerald-950/40';
          badgeStyle = 'bg-emerald-950 text-emerald-300';
          icon = '✅';
        } else if (n.type === 'warning') {
          bgStyle = 'bg-amber-900 text-amber-50 border-amber-700 shadow-amber-950/40';
          badgeStyle = 'bg-amber-950 text-amber-300';
          icon = '⚠️';
        }

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg text-xs transition-all animate-in slide-in-from-top-2 duration-200 ${bgStyle}`}
          >
            <span className="text-sm shrink-0">{icon}</span>
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold block">{n.message}</span>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(n.id)}
              className="text-xs opacity-70 hover:opacity-100 transition shrink-0 ml-1"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToast;
