import React, { useState, useEffect } from 'react';
import { Cake, CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { subscribeToNotifications, AppNotification } from '../../utils/notification';

export const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((newNotif) => {
      setNotifications((prev) => [...prev, newNotif]);

      // Auto-dismiss after configured duration (default 5 seconds)
      const duration = newNotif.durationMs ?? 5000;
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
      }, duration);
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
        let iconEl: React.ReactNode = <Info className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />;

        if (n.type === 'error') {
          bgStyle = 'bg-rose-900 text-rose-50 border-rose-700 shadow-rose-950/40';
          iconEl = <XCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />;
        } else if (n.type === 'success') {
          bgStyle = 'bg-emerald-900 text-emerald-50 border-emerald-700 shadow-emerald-950/40';
          iconEl = <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />;
        } else if (n.type === 'warning') {
          bgStyle = 'bg-amber-900 text-amber-50 border-amber-700 shadow-amber-950/40';
          iconEl = <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />;
        } else if (n.type === 'birthday') {
          bgStyle =
            'bg-gradient-to-r from-[#000065] to-[#121285] text-white border-[#E8C06B]/60 shadow-[0_14px_32px_-8px_rgba(0,0,101,0.45)]';
          iconEl = <Cake className="w-4 h-4 text-[#E8C06B] shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={n.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg text-xs transition-all animate-in slide-in-from-top-2 duration-200 ${bgStyle}`}
          >
            {iconEl}
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold block">{n.message}</span>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(n.id)}
              aria-label="Dismiss notification"
              className="text-xs opacity-70 hover:opacity-100 transition shrink-0 ml-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToast;
