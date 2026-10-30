"use client";

import { Bell, Heart, MessageSquare, ShieldCheck, Megaphone, Check } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CommunityNotification } from "@/lib/communityService";
import { cn } from "@/lib/utils";

interface CommunityNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: CommunityNotification[];
  onNotificationClick: (notif: CommunityNotification) => void;
  onMarkAllRead: () => void;
}

export function CommunityNotificationsModal({
  isOpen,
  onClose,
  notifications,
  onNotificationClick,
  onMarkAllRead,
}: CommunityNotificationsModalProps) {
  const getIcon = (type: CommunityNotification["type"]) => {
    switch (type) {
      case "like":
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case "comment":
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case "expert_reply":
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case "announcement":
        return <Megaphone className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const formatRelative = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-slate-200 max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-1 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Bell className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 font-sora">
                Community Updates
              </DialogTitle>
            </div>
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Mark all read</span>
            </button>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Recent activity on your questions and responses from agronomists.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs font-semibold">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onNotificationClick(notif)}
                className={cn(
                  "p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3",
                  notif.is_read
                    ? "bg-white border-slate-200/70 hover:bg-slate-50"
                    : "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50 shadow-xs"
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative">
                    <Image
                      src={notif.actor_avatar || "/user.png"}
                      alt={notif.actor_name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs border border-slate-200">
                    {getIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs text-slate-800 leading-snug">
                    <strong className="font-bold text-slate-900">{notif.actor_name}</strong>{" "}
                    {notif.content}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {formatRelative(notif.created_at)}
                  </p>
                </div>

                {!notif.is_read && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

