"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, FileCheck2, Info, CheckCheck, Trash2, BellOff, ArrowRight, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/common/Pagination";
import { markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications, deleteNotification } from "@/actions/notification.actions";
import { useToast } from "@/hooks/use-toast";

// 🚀 UPDATED: Added PURCHASE icon logic
const getIcon = (type) => {
  switch (type) {
    case 'REQUEST_FULFILLED': return <FileCheck2 className="w-5 h-5 text-emerald-400" />;
    case 'FEATURED': return <Sparkles className="w-5 h-5 text-amber-400" />;
    case 'PURCHASE': return <ShoppingCart className="w-5 h-5 text-emerald-400" />;
    default: return <Info className="w-5 h-5 text-cyan-400" />;
  }
};

export default function NotificationClientPage({ initialNotifications, totalPages, currentPage, userId }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleMarkAllRead = async () => {
    setIsProcessing(true);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead(userId);
    toast({ title: "All caught up!" });
    setIsProcessing(false);
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to permanently delete your entire notification history?")) return;
    setIsProcessing(true);
    setNotifications([]);
    await clearAllNotifications(userId);
    toast({ title: "Activity feed cleared" });
    setIsProcessing(false);
  };

  const handleDeleteSingle = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n._id !== id));
    await deleteNotification(id);
  };

  const handleRowClick = async (notif) => {
    if (!notif.isRead) {
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      await markNotificationAsRead(notif._id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="space-y-6">
      
      {notifications.length > 0 && (
        <div className="flex justify-end gap-3 animate-in fade-in duration-500">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllRead} 
            disabled={isProcessing}
            className="rounded-full text-[10px] uppercase font-bold tracking-widest text-cyan-400 border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-2" /> Mark All Read
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll} 
            disabled={isProcessing}
            className="rounded-full text-[10px] uppercase font-bold tracking-widest text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear All
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-32 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/10">
            <BellOff className="w-16 h-16 mx-auto mb-6 text-white/10" />
            <h3 className="text-xl font-bold text-white tracking-tight">No notifications to show</h3>
            <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">When interactions happen on your content or requests, they&apos;ll appear here.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id}
              onClick={() => handleRowClick(notif)}
              className={`group flex items-start sm:items-center gap-4 p-5 rounded-3xl border transition-all duration-300 cursor-pointer relative overflow-hidden
                ${notif.isRead 
                  ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" 
                  : "bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/10 hover:shadow-[0_10px_30px_-15px_rgba(34,211,238,0.2)]"
                }`}
            >
              {!notif.isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full" />}

              <div className={`p-3 rounded-2xl shrink-0 ${notif.isRead ? "bg-white/5" : "bg-[#0a0a0a] border border-white/10 shadow-lg"}`}>
                {getIcon(notif.type)}
              </div>
              
              <div className="flex-1 min-w-0 pr-10">
                <p className={`text-base leading-relaxed break-words pr-4 ${notif.isRead ? "text-gray-300" : "text-white font-semibold"}`}>
                  {notif.message}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span>{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</span>
                  {notif.isRead ? <span className="text-green-500/50 flex items-center gap-1"><CheckCheck className="w-3 h-3"/> Read</span> : <span className="text-cyan-400">New</span>}
                </div>
              </div>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {notif.link && (
                  <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
                <button 
                  onClick={(e) => handleDeleteSingle(e, notif._id)}
                  className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pt-10 flex justify-center">
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}