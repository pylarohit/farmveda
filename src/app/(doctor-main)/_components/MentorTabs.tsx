"use client";

import * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import Image from "next/image";
import { LuEye, LuClock } from "react-icons/lu";
import { Check, X, CheckCircle2, Trash2, Leaf, ExternalLink, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmTab from "./ConfirmTab";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";

export default function MentorSessionsTabs() {
  const supabase = useMemo(() => createClient(), []);
  const { mentor } = useUserData();
  const [pendingSessions, setPendingSessions] = useState<DoctorBookingSession[]>([]);
  const [acceptedSessions, setAcceptedSessions] = useState<DoctorBookingSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<DoctorBookingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingSession, setViewingSession] = useState<DoctorBookingSession | null>(null);

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

  // DELETE SESSION
  const handleDelete = async (sessionId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this consultation record?")) {
      return;
    }
    try {
      await DoctorBookingService.deleteBooking(sessionId);
      toast.success("Consultation record deleted.");
      fetchSessions(false);
    } catch (err) {
      console.error("Error deleting session:", err);
      toast.error("Failed to delete session");
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
                  {session.crop_image_url && (
                    <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full mt-1 w-fit mx-auto">
                      🌿 Leaf Photo Attached
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingSession(session)}
                    className="font-inter tracking-tight cursor-pointer text-xs text-emerald-700 hover:text-emerald-800 hover:underline mt-1 flex items-center justify-center gap-1 mx-auto"
                  >
                    View Note & Diagnosis <LuEye className="inline w-3.5 h-3.5" />
                  </button>
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
                      View Note <LuEye className="inline w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="text-xs font-inter text-slate-700 text-center">
                  <p className="font-medium">{session.session_date || "Completed"}</p>
                  <p className="text-slate-400">{session.session_time || ""}</p>
                </div>

                <div className="flex items-center justify-end pr-2 gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-inter font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                  <button
                    onClick={() => handleDelete(session.id)}
                    title="Delete consultation record"
                    aria-label="Delete consultation record"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Consultation Details & Crop Diagnosis Dialog */}
      <Dialog open={!!viewingSession} onOpenChange={(open) => !open && setViewingSession(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold font-sora text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>Farmer Consultation Request & Diagnosis</span>
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
                      Requested: {viewingSession.requested_at ? new Date(viewingSession.requested_at).toLocaleString() : "Recently"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full">
                      {viewingSession.session_date} {viewingSession.session_time}
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
                {viewingSession.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(viewingSession.id);
                        setViewingSession(null);
                      }}
                    >
                      Decline Request
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        handleAccept(viewingSession.id);
                        setViewingSession(null);
                      }}
                    >
                      Accept Consultation
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
