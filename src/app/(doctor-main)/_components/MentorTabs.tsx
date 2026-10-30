"use client";

import * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import Image from "next/image";
import { LuEye, LuClock } from "react-icons/lu";
import { Check, X, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmTab from "./ConfirmTab";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";

export default function MentorSessionsTabs() {
  const supabase = useMemo(() => createClient(), []);
  const { mentor } = useUserData();
  const [pendingSessions, setPendingSessions] = useState<DoctorBookingSession[]>([]);
  const [acceptedSessions, setAcceptedSessions] = useState<DoctorBookingSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<DoctorBookingSession[]>([]);
  const [loading, setLoading] = useState(false);

  const doctorId = mentor?.id || "d718072e-4496-4227-929a-b0bffaf8d9a7";

  const fetchSessions = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const allSessions = await DoctorBookingService.getSessionsForDoctor(doctorId);
        setPendingSessions(allSessions.filter((s) => s.status === "pending"));
        setAcceptedSessions(allSessions.filter((s) => s.status === "accepted"));
        setCompletedSessions(allSessions.filter((s) => s.status === "completed"));
      } catch (err) {
        console.error("Error fetching doctor sessions:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [doctorId]
  );

  useEffect(() => {
    // Initial fetch
    fetchSessions(true);

    // Cross-tab and BroadcastChannel subscription
    const unsubscribe = DoctorBookingService.subscribeToUpdates(() => {
      fetchSessions(false);
    });

    // Realtime Supabase subscription
    const channel = supabase
      .channel("doctor_booking_pending_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchSessions(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mentor_sessions" },
        () => {
          fetchSessions(false);
        }
      )
      .subscribe();

    // Active short polling interval to keep requests live in real time
    const pollInterval = setInterval(() => {
      fetchSessions(false);
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  // ACCEPT SESSION
  const handleAccept = async (sessionId: string | number) => {
    try {
      await DoctorBookingService.updateStatus(sessionId, "accepted");
      toast.success("Session request accepted! Meeting link is now ready.");
      fetchSessions(false);
    } catch (err) {
      console.error("Error accepting session:", err);
      toast.error("Failed to accept session");
    }
  };

  // REJECT SESSION
  const handleReject = async (sessionId: string | number) => {
    try {
      await DoctorBookingService.updateStatus(sessionId, "rejected");
      toast.info("Session request rejected.");
      fetchSessions(false);
    } catch (err) {
      console.error("Error rejecting session:", err);
      toast.error("Failed to reject session");
    }
  };

  return (
    <Tabs
      defaultValue="pending"
      className="w-full max-w-[1080px] mx-auto mt-10 bg-gray-100 p-4 rounded-xl shadow-xs"
    >
      <TabsList className="grid w-full grid-cols-3 font-inter text-base font-semibold">
        <TabsTrigger value="pending" className="cursor-pointer">
          Pending Requests ({pendingSessions.length})
        </TabsTrigger>
        <TabsTrigger value="accepted-rejected" className="cursor-pointer">
          Confirmed Requests ({acceptedSessions.length})
        </TabsTrigger>
        <TabsTrigger value="completed" className="cursor-pointer">
          Completed Sessions ({completedSessions.length})
        </TabsTrigger>
      </TabsList>

      {/* PENDING SESSIONS */}
      <TabsContent value="pending" className="p-4 bg-white rounded-lg mt-3">
        {loading && pendingSessions.length === 0 ? (
          <p className="text-center text-gray-500 py-8 font-inter">
            Loading session requests...
          </p>
        ) : pendingSessions.length === 0 ? (
          <div className="text-center py-10 font-inter text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700 text-lg">No pending session requests</p>
            <p className="text-sm">When farmers book consultations with you, they will appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header Row */}
            <div className="grid grid-cols-5 font-inter font-semibold text-sm text-gray-800 border-b pb-2 mb-2 px-3">
              <p>Farmer Details</p>
              <p className="text-center">Requested On</p>
              <p className="text-center">Scheduled For</p>
              <p className="text-center">Consultation</p>
              <p className="text-right pr-4">Action</p>
            </div>
            {pendingSessions.map((session) => (
              <div
                key={session.id}
                className="border border-gray-200 rounded-lg flex justify-between items-center p-3 hover:border-emerald-300 transition-colors bg-white shadow-xs"
              >
                {/* Farmer Info */}
                <div className="flex gap-3 items-center min-w-[200px]">
                  <Image
                    src={session.studentAvatar || "/user.png"}
                    alt="avatar"
                    height={48}
                    width={48}
                    className="h-12 w-12 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex flex-col font-inter text-sm">
                    <p className="font-bold text-slate-900 capitalize">
                      {session.studentName || "Farmer"}
                    </p>
                    <p className="text-xs text-slate-500">{session.studentEmail || "farmer@farmveda.in"}</p>
                  </div>
                </div>

                {/* Requested On */}
                <p className="text-xs text-slate-600 font-inter text-center">
                  {session.requested_at
                    ? new Date(session.requested_at).toLocaleDateString()
                    : "Recently"}
                </p>

                {/* Scheduled For */}
                <div className="text-xs font-inter text-slate-800 text-center">
                  <p className="font-semibold">{session.session_date || "Upcoming"}</p>
                  <p className="text-slate-500">{session.session_time || ""}</p>
                </div>

                {/* Topic & Note */}
                <div className="text-center">
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                    {session.topic || "Crop Consultation"}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="font-inter tracking-tight cursor-pointer text-xs text-emerald-700 hover:text-emerald-800 mt-1 flex items-center justify-center gap-1">
                          View Note <LuEye className="inline w-3.5 h-3.5" />
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white p-2.5 rounded-lg text-xs font-inter shadow-lg">
                        <p className="font-semibold text-emerald-400 mb-1">Farmer Note:</p>
                        {session.notes || "No additional note provided."}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* ACTIONS - ACCEPT/REJECT */}
                <div className="flex gap-3 justify-end pr-2">
                  <button
                    title="Confirm & Accept Session"
                    aria-label="Confirm & Accept Session"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95"
                    onClick={() => handleAccept(session.id)}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    title="Reject Session"
                    aria-label="Reject Session"
                    className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95"
                    onClick={() => handleReject(session.id)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* CONFIRMED SESSIONS */}
      <TabsContent value="accepted-rejected" className="p-4 bg-white rounded-lg mt-3">
        <ConfirmTab />
      </TabsContent>

      {/* COMPLETED SESSIONS */}
      <TabsContent value="completed" className="p-4 bg-white rounded-lg mt-3">
        {completedSessions.length === 0 ? (
          <div className="text-center py-10 font-inter text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700 text-lg">No completed consultation sessions yet</p>
            <p className="text-sm">Sessions that you complete will appear here with history and records.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 font-inter font-semibold text-sm text-gray-800 border-b pb-2 mb-2 px-3">
              <p>Farmer Details</p>
              <p className="text-center">Consultation</p>
              <p className="text-center">Scheduled Date</p>
              <p className="text-right pr-4">Status</p>
            </div>
            {completedSessions.map((session) => (
              <div
                key={session.id}
                className="border border-slate-200 rounded-lg p-3 flex items-center justify-between bg-slate-50/50 hover:bg-white transition-colors"
              >
                <div className="flex gap-3 items-center min-w-[200px]">
                  <Image
                    src={session.studentAvatar || "/user.png"}
                    alt="avatar"
                    height={44}
                    width={44}
                    className="h-11 w-11 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex flex-col font-inter text-sm">
                    <p className="font-bold text-slate-900 capitalize">{session.studentName || "Farmer"}</p>
                    <p className="text-xs text-slate-500">{session.studentEmail || "farmer@farmveda.in"}</p>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs font-semibold text-slate-800 bg-slate-200 px-2.5 py-1 rounded-md">
                    {session.topic || "Crop Consultation"}
                  </span>
                  {session.notes && (
                    <p className="text-xs text-slate-500 truncate max-w-[180px] mx-auto mt-1" title={session.notes}>
                      {session.notes}
                    </p>
                  )}
                </div>

                <div className="text-xs font-inter text-slate-700 text-center">
                  <p className="font-medium">{session.session_date || "Completed"}</p>
                  <p className="text-slate-400">{session.session_time || ""}</p>
                </div>

                <div className="flex items-center justify-end pr-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-inter font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
