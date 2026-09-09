"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Phone,
  ChevronRight,
  Sprout,
  Calendar,
} from "lucide-react";

interface NotificationItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  listing_details?: any;
  created_at: string;
  senderName?: string;
  senderAvatar?: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotificationMetadata(content: string) {
  const lower = content.toLowerCase();

  if (lower.includes("new loan application") || (lower.includes("applied for your") && lower.includes("loan"))) {
    return {
      label: "Loan Request",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-700",
      icon: "sprout",
      link: "/home/loans?tab=farmer&sub=received-requests",
    };
  }

  if (lower.includes("rescheduled") || lower.includes("call rescheduled")) {
    return {
      label: "Call Rescheduled",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
      icon: "calendar",
      link: "/home/loans?tab=farmer&sub=my-bookings",
    };
  }

  if (lower.includes("approved") || lower.includes("call scheduled") || lower.includes("loan application was accepted")) {
    return {
      label: "Call Scheduled",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-700",
      icon: "phone",
      link: "/home/loans?tab=farmer&sub=my-bookings",
    };
  }

  if (lower.includes("declined") || lower.includes("rejected") || lower.includes("unable to accept")) {
    return {
      label: "Declined",
      badgeClass: "bg-red-100 text-red-800 border-red-300",
      iconBg: "bg-red-100",
      iconColor: "text-red-700",
      icon: "x",
      link: "/home/loans?tab=farmer&sub=my-bookings",
    };
  }

  return {
    label: "Message",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    icon: "message",
    link: "/home/message",
  };
}

export function NotificationBell() {
  const { user, setUnreadMessages } = useUserData();
  const supabase = createClient();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  // Load read/dismissed notification IDs from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      try {
        const stored = localStorage.getItem(`read_notifications_${user.id}`);
        if (stored) {
          setReadIds(new Set(JSON.parse(stored)));
        }
      } catch (_) {}
    }
  }, [user?.id]);

  // Active notifications: only the ones that haven't been read yet (upon read, remove it)
  const activeNotifications = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id));
  }, [notifications, readIds]);

  // Dismiss / Mark as Read -> immediately removes from the bell list
  const removeNotification = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        if (typeof window !== "undefined" && user?.id) {
          try {
            localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(Array.from(next)));
          } catch (_) {}
        }
        return next;
      });
      setUnreadMessages((prev) => Math.max(0, prev - 1));
    },
    [user?.id, setUnreadMessages]
  );

  // Clear all notifications -> removes all from view
  const clearAllNotifications = useCallback(() => {
    const allIds = new Set(readIds);
    notifications.forEach((n) => allIds.add(n.id));
    setReadIds(allIds);
    if (typeof window !== "undefined" && user?.id) {
      try {
        localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(Array.from(allIds)));
      } catch (_) {}
    }
    setUnreadMessages(0);
  }, [notifications, readIds, user?.id, setUnreadMessages]);

  // Fetch recent notifications for this user
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (msgs && msgs.length > 0) {
        const senderIds = Array.from(new Set(msgs.map((m: any) => m.sender_id)));
        const { data: senders } = await supabase
          .from("users")
          .select("id, userName, avatar")
          .in("id", senderIds);

        const senderMap = new Map((senders || []).map((s: any) => [s.id, s]));

        const enriched: NotificationItem[] = msgs.map((m: any) => {
          const s = senderMap.get(m.sender_id);
          return {
            ...m,
            senderName: s?.userName || "Farmer",
            senderAvatar: s?.avatar || null,
          };
        });

        setNotifications(enriched);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.warn("Error loading notifications:", err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  // Realtime notification listeners for incoming messages & loan bookings
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`bell_notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          let senderName = "Farmer";
          let senderAvatar: string | null = null;
          try {
            const { data: senderData } = await supabase
              .from("users")
              .select("userName, avatar")
              .eq("id", newMsg.sender_id)
              .maybeSingle();
            if (senderData) {
              senderName = senderData.userName || "Farmer";
              senderAvatar = senderData.avatar || null;
            }
          } catch (_) {}

          const fullItem: NotificationItem = {
            ...newMsg,
            senderName,
            senderAvatar,
          };

          setNotifications((prev) => [fullItem, ...prev.filter((n) => n.id !== fullItem.id)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: NotificationItem) => {
    // Upon read, remove it immediately
    removeNotification(item.id);
    setIsOpen(false);
    const meta = getNotificationMetadata(item.content);
    router.push(meta.link);
  };

  const count = activeNotifications.length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className={`relative p-2.5 rounded-2xl transition-all cursor-pointer focus:outline-none ${
          isOpen
            ? "bg-slate-900 text-white shadow-[2px_2px_0px_rgba(15,23,42,1)]"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />

        {/* Dynamic Badge for active unread notifications */}
        {count > 0 && (
          <>
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-rose-300">
              {count > 9 ? "9+" : count}
            </span>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75 animate-ping" />
          </>
        )}
      </button>

      {/* Clean All-Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm font-sora">Notifications</h3>
                  {count > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Tap any notification to view and remove
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {count > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-[11px] font-extrabold text-amber-400 hover:text-amber-300 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Clear all notifications"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Clear all</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications Stream */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 overscroll-contain">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <span className="animate-spin h-6 w-6 border-2 border-slate-400 border-t-transparent rounded-full" />
                <span className="text-xs font-bold">Checking notifications…</span>
              </div>
            ) : count === 0 ? (
              <div className="py-14 px-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">No new notifications</h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  You&apos;re all caught up! New loan requests, call schedules, and alerts will appear here.
                </p>
              </div>
            ) : (
              activeNotifications.map((item) => {
                const meta = getNotificationMetadata(item.content);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 bg-white group"
                  >
                    {/* Category Icon */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm ${meta.iconBg} ${meta.iconColor} border border-slate-200`}
                      >
                        {meta.icon === "sprout" ? (
                          <Sprout className="h-4 w-4" />
                        ) : meta.icon === "phone" ? (
                          <Phone className="h-4 w-4" />
                        ) : meta.icon === "calendar" ? (
                          <Calendar className="h-4 w-4" />
                        ) : meta.icon === "x" ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-900 leading-snug break-words">
                        {item.content}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 font-semibold truncate">
                          From: <strong className="text-slate-700">{item.senderName}</strong>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(item.id);
                            }}
                            className="text-[10px] font-extrabold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                            title="Mark as read & remove"
                          >
                            <Check className="h-3 w-3" />
                            <span>Dismiss</span>
                          </button>
                          <span className="text-[10px] font-extrabold text-blue-600 group-hover:text-blue-700 flex items-center">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
