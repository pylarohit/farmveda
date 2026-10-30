"use client";

import SingleCard from "@/app/(main)/_components/Mentor-card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { LuChevronLeft, LuGhost, LuVideo, LuClock, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { FilterIcon, Loader, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUserData } from "@/context/UserDataProvider";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

const Bookings = () => {
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState<DoctorBookingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const router = useRouter();
  const { user } = useUserData();

  const fetchInitial = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const data = await DoctorBookingService.getSessionsForUser(
          user?.id ? String(user.id) : undefined
        );
        setSessions(data);
      } catch (error) {
        console.error("Failed to fetch mentor sessions:", error);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [user?.id]
  );

  const handleDeleteBooking = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to cancel and delete this booking?")) {
      return;
    }
    setDeletingId(sessionId);
    try {
      // Optimistic state update
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await DoctorBookingService.deleteBooking(sessionId);
      toast.success("Booking deleted successfully.");
    } catch (err) {
      console.error("Error deleting booking:", err);
      toast.error("Failed to delete booking");
      fetchInitial(false);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchInitial(sessions.length === 0);

    // Subscribe to cross-tab & BroadcastChannel updates
    const unsubscribe = DoctorBookingService.subscribeToUpdates(() => {
      fetchInitial(false);
    });

    // Real-time Supabase subscription
    const channel = supabase
      .channel("public_doctor_bookings_user_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchInitial(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mentor_sessions" },
        () => {
          fetchInitial(false);
        }
      )
      .subscribe();

    // Active short-polling interval (every 2.5s) to guarantee instant status sync across browsers/windows
    const pollInterval = setInterval(() => {
      fetchInitial(false);
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [fetchInitial]);

  const filtered = useMemo(() => {
    if (selectedFilter === "all") return sessions;
    return sessions.filter((s) => s.status === selectedFilter);
  }, [sessions, selectedFilter]);

  function formatDate(iso?: string | null) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 px-4 sm:px-6 py-4 overflow-y-auto">
      <SingleCard />

      <div className="mt-4 flex items-center justify-between w-full max-w-[1260px] mx-auto">
        <button
          onClick={() => router.push("/home/doctor-connect")}
          className="text-sm font-inter text-slate-700 hover:text-emerald-700 cursor-pointer flex items-center font-medium transition-colors"
        >
          <LuChevronLeft className="inline mr-1 w-5 h-5" /> Back to Crop Doctors
        </button>

        <h2 className="font-inter text-2xl font-bold text-center text-slate-900">
          My Doctor Bookings
        </h2>

        <button
          onClick={() => fetchInitial()}
          title="Refresh Bookings"
          className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-full gap-6 mt-6 max-w-[1260px] mx-auto">
        {/* LEFT SIDE FILTERS */}
        <div className="w-full md:w-56 p-4 bg-white rounded-xl shadow-xs border border-slate-200/80 h-fit">
          <h3 className="text-base font-bold mb-3 font-inter text-slate-900 flex items-center justify-between">
            <span>Filter Status</span>
            <FilterIcon className="text-slate-400 w-4 h-4" />
          </h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {FILTERS.map((f) => {
              const count =
                f.key === "all"
                  ? sessions.length
                  : sessions.filter((s) => s.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setSelectedFilter(f.key)}
                  className={`text-left px-3.5 py-2 font-inter text-sm rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                    selectedFilter === f.key
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedFilter === f.key
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator orientation="vertical" className="hidden md:block" />

        {/* RIGHT SIDE CARDS */}
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold font-inter text-slate-800">
              Total Sessions ({filtered.length})
            </h2>
          </div>

          {loading && sessions.length === 0 && (
            <div className="w-full py-20 flex flex-col items-center justify-center text-slate-500">
              <Loader className="animate-spin mb-3 text-emerald-600" size={32} />
              <p className="font-inter text-base font-medium">Loading your doctor bookings...</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => {
              const docName = s.mentorName?.startsWith("Dr.") ? s.mentorName : `Dr. ${s.mentorName || "Crop Doctor"}`;
              return (
                <div
                  key={s.id}
                  className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Doctor Avatar + Name + Delete Button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Image
                          src={s.mentorAvatar || "/user.png"}
                          alt={s.mentorName || "Doctor"}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold font-inter text-slate-900 truncate" title={docName}>
                            {docName}
                          </div>
                          <div className="text-xs text-emerald-700 font-inter font-semibold truncate">
                            {s.topic || "Crop Consultation"}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteBooking(s.id)}
                        disabled={deletingId === s.id}
                        title="Delete booking"
                        aria-label="Delete booking"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <LuTrash2 className={`w-4 h-4 ${deletingId === s.id ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-inter font-semibold capitalize ${
                          s.status === "pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : s.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : s.status === "completed"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {s.status === "pending" && <LuClock className="w-3.5 h-3.5" />}
                        {s.status === "accepted" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {s.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {s.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                        {s.status === "pending"
                          ? "Pending Approval"
                          : s.status === "accepted"
                          ? "Confirmed - Ready to Join"
                          : s.status === "completed"
                          ? "Completed"
                          : "Rejected"}
                      </span>
                    </div>

                    {/* Date Details */}
                    <div className="mt-3 text-xs font-inter text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800">Scheduled:</span>{" "}
                        <span className="text-slate-900 font-medium">
                          {s.session_date ? `${s.session_date} at ${s.session_time || "10:00"}` : formatDate(s.requested_at)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Requested:</span>{" "}
                        <span>{formatDate(s.requested_at)}</span>
                      </div>
                    </div>

                    {/* Attached Crop Image & Notes */}
                    {s.crop_image_url && (
                      <div className="mt-3 p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-lg flex items-center gap-2.5">
                        <div className="relative w-12 h-12 rounded-md overflow-hidden border border-emerald-300 shrink-0 bg-white shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.crop_image_url}
                            alt="Crop Photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">
                            Field Leaf Scan Attached
                          </span>
                          <a
                            href={s.crop_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-700 hover:underline font-semibold"
                          >
                            View Attached Image ↗
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {s.notes && (
                      <div className="mt-2 text-xs font-inter text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="font-semibold text-slate-800 block mb-0.5">Your Note & AI Report:</span>
                        <p className="line-clamp-3 whitespace-pre-line">{s.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions / Call Link */}
                  {s.status === "accepted" && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => {
                          const targetRoom = s.call_url || `room-${s.id}`;
                          router.push(`/room/${targetRoom}`);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-inter text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-98"
                      >
                        <LuVideo className="w-4 h-4" />
                        Join Video Consultation
                      </button>
                    </div>
                  )}

                  {s.status === "completed" && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-inter text-slate-500">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Consultation Done
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleDeleteBooking(s.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete this record"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => router.push(`/home/doctor-connect/${s.mentor_id}`)}
                          className="text-emerald-700 hover:underline font-medium cursor-pointer"
                        >
                          Book Again
                        </button>
                      </div>
                    </div>
                  )}

                  {s.status === "pending" && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-inter text-amber-700 bg-amber-50/50 p-2 rounded">
                      <span>Waiting for doctor confirmation</span>
                      <button
                        onClick={() => handleDeleteBooking(s.id)}
                        className="text-red-600 hover:text-red-700 hover:underline font-medium cursor-pointer ml-2"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center text-slate-400 font-inter text-base flex flex-col items-center justify-center">
                <LuGhost className="w-10 h-10 mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">No sessions found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedFilter === "all"
                    ? "You haven't booked any sessions yet."
                    : `No ${selectedFilter} sessions found.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bookings;
