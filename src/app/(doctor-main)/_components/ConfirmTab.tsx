"use client";

import { Button } from "@/components/ui/button";
import { useUserData } from "@/context/UserDataProvider";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { LuActivity, LuVideo, LuEye } from "react-icons/lu";
import { CheckCircle2, Trash2, Leaf, ExternalLink, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";
import { toast } from "sonner";

const ConfirmTab = () => {
  const supabase = useMemo(() => createClient(), []);
  const { mentor } = useUserData();
  const router = useRouter();
  const { setActiveSession } = useSessionStore();
  const [acceptedSessions, setAcceptedSessions] = useState<DoctorBookingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingSession, setViewingSession] = useState<DoctorBookingSession | null>(null);

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

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to cancel and delete this confirmed session?")) {
      return;
    }
    try {
      setAcceptedSessions((prev) => prev.filter((s) => String(s.id) !== String(sessionId)));
      await DoctorBookingService.deleteBooking(sessionId);
      toast.success("Session deleted successfully.");
    } catch (err) {
      console.error("Error deleting session:", err);
      toast.error("Failed to delete session");
      fetchAccepted(false);
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
                {session.crop_image_url && (
                  <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full mt-1 w-fit mx-auto">
                    🌿 Leaf Photo Attached
                  </span>
                )}
                {session.notes && (
                  <button
                    type="button"
                    onClick={() => setViewingSession(session)}
                    className="font-inter tracking-tight cursor-pointer text-xs text-emerald-700 hover:text-emerald-800 hover:underline mt-1 flex items-center justify-center gap-1 mx-auto"
                  >
                    View Note & Diagnosis <LuEye className="inline w-3 h-3" />
                  </button>
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

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer p-1.5"
                  onClick={() => handleDelete(session.id)}
                  title="Delete this confirmed session"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consultation Details & Crop Diagnosis Dialog */}
      <Dialog open={!!viewingSession} onOpenChange={(open) => !open && setViewingSession(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold font-sora text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>Confirmed Consultation - Problem & Diagnosis</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 my-2">
                {/* Farmer Info Header */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewingSession.studentAvatar || "/user.png"}
                    alt={viewingSession.studentName || "Farmer"}
                    className="w-12 h-12 rounded-full object-cover border border-slate-300 bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm capitalize">
                      {viewingSession.studentName || "Farmer"}
                    </p>
                    <p className="text-xs text-slate-500">{viewingSession.studentEmail || "farmer@farmveda.in"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Scheduled: {viewingSession.session_date} at {viewingSession.session_time || "10:00"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full">
                      Confirmed
                    </span>
                  </div>
                </div>

                {/* Attached Crop Leaf Photo */}
                {viewingSession.crop_image_url && (
                  <div className="bg-slate-900 rounded-2xl overflow-hidden p-3 border border-slate-800 shadow-md">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Leaf className="w-3.5 h-3.5" /> Attached Field Leaf Photo
                      </span>
                      <a
                        href={viewingSession.crop_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-300 hover:text-white underline flex items-center gap-1 font-inter"
                      >
                        Open full size <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative aspect-video max-h-72 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={viewingSession.crop_image_url}
                        alt="Diseased Leaf Scan"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Diagnostic Details & Notes */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-200/60">
                    <Leaf className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Problem Details & AI Diagnostic Advisory
                    </h4>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                    {viewingSession.notes || "No additional notes provided."}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
                <Button variant="outline" onClick={() => setViewingSession(null)}>
                  Close
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                  onClick={() => {
                    setViewingSession(null);
                    const roomTarget = viewingSession.call_url || `room-${viewingSession.id}`;
                    router.push(`/room/${roomTarget}`);
                  }}
                >
                  <LuVideo className="w-4 h-4" />
                  <span>Join Video Call</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfirmTab;
