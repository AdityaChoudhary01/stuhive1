"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, Sparkles, FileCheck2, Info, Trash2, ArrowRight, ShoppingCart } from "lucide-react";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } from "@/actions/notification.actions";
import { formatDistanceToNow } from "date-fns";

// 🚀 UPDATED: Added PURCHASE icon logic
const getIcon = (type) => {
  switch (type) {
    case 'REQUEST_FULFILLED': return <FileCheck2 className="w-4 h-4 text-emerald-400" />;
    case 'FEATURED': return <Sparkles className="w-4 h-4 text-amber-400" />;
    case 'PURCHASE': return <ShoppingCart className="w-4 h-4 text-emerald-400" />;
    default: return <Info className="w-4 h-4 text-cyan-400" />;
  }
};

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await getUserNotifications(session.user.id, 10);
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;
    const initializeNotifications = async () => { if (isMounted) await fetchNotifications(); };
    initializeNotifications();
    const intervalId = setInterval(() => { if (isMounted) fetchNotifications(); }, 60000);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.isRead) {
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await markNotificationAsRead(notif._id);
    }
    if (notif.link) router.push(notif.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsAsRead(session.user.id);
  };

  const handleClearAll = async (e) => {
    e.stopPropagation();
    setNotifications([]);
    setUnreadCount(0);
    await clearAllNotifications(session.user.id);
  };

  if (!session) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-[#0a0118] animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[340px] max-h-[500px] bg-[#0a0118]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
            <h3 className="font-black tracking-tight text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[10px] uppercase tracking-widest font-bold text-cyan-400 hover:text-cyan-300 transition-colors" title="Mark all as read">
                  <CheckCheck size={12} />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClearAll} className="text-[10px] uppercase tracking-widest font-bold text-red-400 hover:text-red-300 transition-colors" title="Clear all notifications">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-cyan-400" /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-xs font-medium">You&apos;re all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 flex gap-3 items-start ${
                    notif.isRead ? "hover:bg-white/[0.03] opacity-70" : "bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 shadow-sm"
                  }`}
                >
                  <div className={`mt-0.5 p-2 rounded-full shrink-0 ${notif.isRead ? "bg-white/5" : "bg-black/50 border border-white/5"}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={`text-sm leading-snug break-words ${notif.isRead ? "text-gray-400" : "text-white font-semibold"}`}>
                      {notif.message}
                    </p>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1.5 block">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {!notif.isRead && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-2" />}
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-white/5 bg-black/20 text-center">
            <Link 
              href="/notifications" 
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 flex items-center justify-center gap-1.5 transition-colors"
            >
              View All Activity <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}