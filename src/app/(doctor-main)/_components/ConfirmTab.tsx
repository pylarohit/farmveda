"use client";

import { Button } from "@/components/ui/button";
import { useUserData } from "@/context/UserDataProvider";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { LuActivity, LuVideo } from "react-icons/lu";
import { CheckCircle2 } from "lucide-react";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";
import { toast } from "sonner";

const ConfirmTab = () => {
  const supabase = useMemo(() => createClient(), []);
  const { mentor } = useUserData();
  const router = useRouter();
  const { setActiveSession } = useSessionStore();
  const [acceptedSessions, setAcceptedSessions] = useState<DoctorBookingSession[]>([]);
  const [loading, setLoading] = useState(false);

  const doctorId = mentor?.id || "d718072e-4496-4227-929a-b0bffaf8d9a7";

  const fetchAccepted = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const allSessions = await DoctorBookingService.getSessionsForDoctor(doctorId);
        const accepted = allSessions.filter((s) => s.status === "accepted");
        setAcceptedSessions(accepted);
      } catch (err) {
        console.error("Error fetching accepted doctor sessions:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [doctorId]
  );

  useEffect(() => {
    fetchAccepted(true);

    // Cross-tab and BroadcastChannel subscription
    const unsubscribe = DoctorBookingService.subscribeToUpdates(() => {
      fetchAccepted(false);
    });

    // Realtime Supabase subscription
    const channel = supabase
      .channel("doctor_booking_confirmed_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchAccepted(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mentor_sessions" },
        () => {
          fetchAccepted(false);
        }
      )
      .subscribe();

    // Active short polling interval to keep confirmed sessions live in real time
    const pollInterval = setInterval(() => {
      fetchAccepted(false);
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [fetchAccepted]);

  const handleMarkCompleted = async (sessionId: string) => {
    try {
      await DoctorBookingService.updateStatus(sessionId, "completed");
      toast.success("Consultation session marked as completed!");
      setAcceptedSessions((prev) => prev.filter((s) => String(s.id) !== String(sessionId)));
    } catch (err) {
      console.error("Error completing session:", err);
      toast.error("Failed to mark session as completed");
    }
  };

  return (
    <div className="bg-white">
      {loading && acceptedSessions.length === 0 ? (
        <p className="text-center text-gray-500 py-6 font-inter">Loading confirmed sessions...</p>
      ) : acceptedSessions.length === 0 ? (
        <div className="text-center py-10 font-inter text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 text-lg">No confirmed sessions yet</p>
          <p className="text-sm">When you accept pending session requests, they will show up here ready to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="grid grid-cols-4 font-inter font-semibold text-sm text-gray-800 border-b pb-2 px-3 mb-2">
            <p>Farmer Details</p>
            <p className="text-center">Scheduled For</p>
            <p className="text-center">Consultation</p>
            <p className="text-right pr-2">Action</p>
          </div>
          {acceptedSessions.map((session) => (
            <div
              key={session.id}
              className="border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:border-emerald-300 transition-colors bg-white shadow-xs"
            >
              <div className="flex gap-3 items-center min-w-[200px]">
                <Image
                  src={session.studentAvatar || "/user.png"}
                  alt="avatar"
                  height={48}
                  width={48}
                  className="h-12 w-12 rounded-full object-cover border border-slate-200"
                />
                <div className="flex flex-col font-inter text-sm tracking-tight">
                  <p className="font-bold text-slate-900 capitalize">{session.studentName || "Farmer"}</p>
                  <p className="text-xs text-slate-500">{session.studentEmail || "farmer@farmveda.in"}</p>
                </div>
              </div>

              <div className="text-xs font-inter text-slate-800 text-center">
                <p className="font-semibold">{session.session_date || "Confirmed"}</p>
                <p className="text-slate-500">{session.session_time || ""}</p>
              </div>

              <div className="text-center">
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                  {session.topic || "Crop Consultation"}
                </span>
                {session.notes && (
                  <p className="text-xs text-slate-500 truncate max-w-[180px] mx-auto mt-1" title={session.notes}>
                    {session.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-inter text-xs font-medium cursor-pointer flex items-center gap-1.5 shadow-xs"
                  onClick={() => {
                    const roomTarget = session.call_url || `room-${session.id}`;
                    router.push(`/room/${roomTarget}`);
                  }}
                >
                  <LuVideo className="w-3.5 h-3.5" />
                  <span>Join Call</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="font-inter text-xs font-medium cursor-pointer flex items-center gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setActiveSession({
                      id: session.id,
                      mentor_id: session.mentor_id,
                      student_id: session.student_id,
                      status: session.status,
                      requested_at: session.requested_at,
                      session_date: session.session_date,
                      session_time: session.session_time,
                      notes: session.notes,
                      call_url: session.call_url || undefined,
                      userName: session.studentName,
                      session_id: session.id,
                      userEmail: session.studentEmail,
                      avatar: session.studentAvatar,
                      session_type: session.topic,
                      topic: session.topic,
                    });
                    router.push("/dashboard/video-call-Home");
                  }}
                  title="Open Session Room Details"
                >
                  <LuActivity className="w-3.5 h-3.5" />
                  <span>Prep</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer p-1.5"
                  onClick={() => handleMarkCompleted(session.id)}
                  title="Mark Consultation as Completed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConfirmTab;
