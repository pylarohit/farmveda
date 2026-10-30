/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createClient } from "@/lib/supabase/client";

export interface DoctorBookingSession {
  id: string;
  mentor_id: string;
  mentorName: string;
  mentorAvatar: string | null;
  student_id: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string | null;
  topic: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  requested_at: string;
  session_date: string;
  session_time: string;
  notes: string;
  call_url: string | null;
}

const STORAGE_KEY = "farmveda_active_doctor_sessions";
const BOOKING_MESSAGE_TYPE = "doctor_session_booking";
const BROADCAST_CHANNEL_NAME = "farmveda_doctor_sessions_bc";

// Helper to resolve most updated status without allowing downgrade to "pending"
function resolveStatus(
  localStatus?: string | null,
  serverStatus?: string | null
): "pending" | "accepted" | "rejected" | "completed" {
  const rank: Record<string, number> = {
    completed: 4,
    accepted: 3,
    rejected: 3,
    pending: 1,
  };
  const rL = rank[localStatus || ""] || 0;
  const rS = rank[serverStatus || ""] || 0;

  // Server always wins if it has accepted, rejected, or completed
  if (rS >= 3) return (serverStatus as any);
  if (rS > rL) return (serverStatus as any);
  if (rL > 0) return (localStatus as any);
  return (serverStatus as any) || "pending";
}

export const DoctorBookingService = {
  // Get all locally cached sessions
  getLocalSessions(): DoctorBookingSession[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as DoctorBookingSession[];
      }
    } catch (e) {
      console.warn("Error reading local doctor sessions:", e);
    }
    return [];
  },

  // Save session list to localStorage and broadcast change events
  saveLocalSessions(sessions: DoctorBookingSession[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      window.dispatchEvent(new CustomEvent("doctor_session_changed"));
      window.dispatchEvent(new Event("storage"));

      // Broadcast across tabs
      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
          bc.postMessage({ type: "SYNC", timestamp: Date.now() });
          bc.close();
        }
      } catch {}
    } catch (e) {
      console.warn("Error saving local doctor sessions:", e);
    }
  },

  // Subscribe to real-time session changes across tabs and local events
  subscribeToUpdates(callback: () => void) {
    if (typeof window === "undefined") return () => {};

    const onEvent = () => callback();
    window.addEventListener("doctor_session_changed", onEvent);
    window.addEventListener("storage", onEvent);

    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = () => callback();
      }
    } catch {}

    return () => {
      window.removeEventListener("doctor_session_changed", onEvent);
      window.removeEventListener("storage", onEvent);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  },

  // Create a new booking session
  async createBooking(params: {
    mentorId: string;
    mentorName: string;
    mentorAvatar: string | null;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string | null;
    sessionType: string;
    date: Date;
    notes: string;
  }): Promise<DoctorBookingSession> {
    const supabase = createClient();
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const dateStr = params.date.toISOString().split("T")[0];
    const timeStr = params.date.toTimeString().slice(0, 5);

    const topicLabel =
      params.sessionType === "10"
        ? "10 min Rapid Q&A"
        : params.sessionType === "30"
        ? "30 min Deep Dive"
        : "45 min Full Consultation";

    const sessionObj: DoctorBookingSession = {
      id: sessionId,
      mentor_id: params.mentorId,
      mentorName: params.mentorName,
      mentorAvatar: params.mentorAvatar,
      student_id: params.userId,
      studentName: params.userName,
      studentEmail: params.userEmail,
      studentAvatar: params.userAvatar,
      topic: topicLabel,
      status: "pending",
      requested_at: new Date().toISOString(),
      session_date: dateStr,
      session_time: timeStr,
      notes: params.notes,
      call_url: `room-${sessionId}`,
    };

    // 1. Save locally for instant reactivity
    const existing = this.getLocalSessions();
    this.saveLocalSessions([sessionObj, ...existing.filter((s) => s.id !== sessionId)]);

    // 2. Persist in Supabase `messages` table
    try {
      const msgPayload = {
        sender_id: params.userId || "anonymous-farmer",
        receiver_id: params.mentorId,
        content: `DOCTOR_BOOKING:${sessionId}:status=pending`,
        type: BOOKING_MESSAGE_TYPE,
        listing_details: {
          sessionId,
          mentorId: params.mentorId,
          mentorName: params.mentorName,
          mentorAvatar: params.mentorAvatar,
          studentId: params.userId,
          studentName: params.userName,
          studentEmail: params.userEmail,
          studentAvatar: params.userAvatar,
          topic: topicLabel,
          status: "pending",
          requested_at: sessionObj.requested_at,
          session_date: dateStr,
          session_time: timeStr,
          notes: params.notes,
          call_url: sessionObj.call_url,
        },
      };

      const { data: insertedMsg, error: msgError } = await supabase
        .from("messages")
        .insert([msgPayload])
        .select()
        .maybeSingle();

      if (msgError) {
        console.warn("Notice saving booking to Supabase messages:", msgError.message);
      } else if (insertedMsg) {
        console.log("Successfully persisted booking to Supabase:", insertedMsg.id);
      }
    } catch (e: any) {
      console.warn("Supabase booking message error:", e?.message);
    }

    // 3. Fallback attempt for mentor_sessions table
    try {
      const cleanHex = params.userId.replace(/[^0-9a-fA-F]/g, "").slice(0, 14);
      const studentBigInt = cleanHex
        ? Number(BigInt("0x" + cleanHex) % BigInt("900000000000000"))
        : Math.floor(Math.random() * 1000000);

      await supabase.from("mentor_sessions").insert([
        {
          mentor_id: params.mentorId,
          student_id: studentBigInt,
          topic: topicLabel,
          status: "pending",
          requested_at: sessionObj.requested_at,
          session_date: dateStr,
          session_time: timeStr,
          notes: params.notes,
          call_url: sessionObj.call_url,
        },
      ]);
    } catch {
      // Ignored if RLS prevents anon insert
    }

    return sessionObj;
  },

  // Update session status (accepted / rejected / completed)
  async updateStatus(
    sessionId: string | number,
    newStatus: "accepted" | "rejected" | "completed"
  ) {
    const supabase = createClient();
    const strId = String(sessionId).trim();

    // 1. Update locally
    const current = this.getLocalSessions();
    const updated = current.map((s) => {
      const match =
        String(s.id) === strId ||
        String(s.call_url) === strId ||
        strId.includes(String(s.id)) ||
        (s.call_url && strId.includes(String(s.call_url))) ||
        (s.id && String(s.id).includes(strId));
      return match ? { ...s, status: newStatus } : s;
    });
    this.saveLocalSessions(updated);

    // 2. Update in Supabase messages table
    try {
      const { data: msgs, error: fetchErr } = await supabase
        .from("messages")
        .select("*")
        .eq("type", BOOKING_MESSAGE_TYPE);

      if (!fetchErr && msgs && msgs.length > 0) {
        for (const m of msgs) {
          const det = (m.listing_details as any) || {};
          const isMatch =
            String(det.sessionId) === strId ||
            String(m.id) === strId ||
            String(det.call_url) === strId ||
            strId.includes(String(det.sessionId || "")) ||
            (det.sessionId && strId.includes(String(det.sessionId))) ||
            (det.call_url && strId.includes(String(det.call_url)));

          if (isMatch) {
            await supabase
              .from("messages")
              .update({
                content: `DOCTOR_BOOKING:${det.sessionId || strId}:status=${newStatus}`,
                listing_details: {
                  ...det,
                  status: newStatus,
                },
              })
              .eq("id", m.id);
          }
        }
      }
    } catch (e: any) {
      console.warn("Error updating booking status in Supabase:", e?.message);
    }

    // 3. Try mentor_sessions update if applicable
    try {
      if (/^\d+$/.test(strId)) {
        await supabase
          .from("mentor_sessions")
          .update({ status: newStatus })
          .eq("id", Number(strId));
      } else {
        await supabase
          .from("mentor_sessions")
          .update({ status: newStatus })
          .eq("call_url", strId);
      }
    } catch {
      // Fallback
    }

    // Dispatch global events for instant multi-tab sync
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("doctor_session_changed"));
      window.dispatchEvent(new Event("storage"));
    }
  },

  // Complete session by room ID or session ID
  async completeSessionByRoomOrId(roomIdOrId: string) {
    const sessions = this.getLocalSessions();
    const strTarget = String(roomIdOrId);
    const target = sessions.find(
      (s) =>
        String(s.id) === strTarget ||
        String(s.call_url) === strTarget ||
        strTarget.includes(String(s.id)) ||
        (s.call_url && strTarget.includes(String(s.call_url)))
    );

    const sessionId = target ? target.id : strTarget;
    await this.updateStatus(sessionId, "completed");
  },

  // Get sessions for a doctor
  async getSessionsForDoctor(mentorId?: string): Promise<DoctorBookingSession[]> {
    const supabase = createClient();
    const allLocal = this.getLocalSessions();

    const resultList: DoctorBookingSession[] = [];
    const seenIds = new Set<string>();

    // 1. First add all local sessions so local state is instantly responsive
    for (const loc of allLocal) {
      if (!seenIds.has(loc.id)) {
        seenIds.add(loc.id);
        resultList.push(loc);
      }
    }

    // 2. Query all doctor bookings from Supabase messages table
    try {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .eq("type", BOOKING_MESSAGE_TYPE)
        .order("created_at", { ascending: false });

      if (!error && msgs) {
        for (const m of msgs) {
          const det = (m.listing_details as any) || {};
          const sid = String(det.sessionId || m.id);

          const serverStatus: "pending" | "accepted" | "rejected" | "completed" =
            det.status ||
            (m.content?.includes("status=accepted")
              ? "accepted"
              : m.content?.includes("status=rejected")
              ? "rejected"
              : m.content?.includes("status=completed")
              ? "completed"
              : "pending");

          const sessionObj: DoctorBookingSession = {
            id: sid,
            mentor_id: m.receiver_id || det.mentorId || mentorId || "",
            mentorName: det.mentorName || "Crop Doctor",
            mentorAvatar: det.mentorAvatar || null,
            student_id: m.sender_id || det.studentId || "farmer",
            studentName: det.studentName || "Farmer",
            studentEmail: det.studentEmail || "farmer@farmveda.in",
            studentAvatar: det.studentAvatar || "/user.png",
            topic: det.topic || "Crop Consultation",
            status: serverStatus,
            requested_at: det.requested_at || m.created_at,
            session_date: det.session_date || m.created_at?.split("T")[0] || "",
            session_time: det.session_time || "10:00",
            notes: det.notes || "",
            call_url: det.call_url || `room-${sid}`,
          };

          const existingIdx = resultList.findIndex(
            (s) =>
              s.id === sid ||
              s.id === String(m.id) ||
              (det.sessionId && s.id === String(det.sessionId)) ||
              (det.call_url && s.call_url === String(det.call_url))
          );

          if (existingIdx >= 0) {
            const resolved = resolveStatus(resultList[existingIdx].status, serverStatus);
            resultList[existingIdx] = {
              ...resultList[existingIdx],
              ...sessionObj,
              status: resolved,
            };
          } else {
            seenIds.add(sid);
            resultList.push(sessionObj);
          }
        }
      }
    } catch (e) {
      console.warn("Error querying doctor bookings from Supabase:", e);
    }

    // 3. Query from mentor_sessions if available
    try {
      const { data: dbSessions } = await supabase.from("mentor_sessions").select("*");
      if (dbSessions) {
        for (const s of dbSessions) {
          const sid = String(s.id);
          if (!seenIds.has(sid)) {
            seenIds.add(sid);
            resultList.push({
              id: sid,
              mentor_id: s.mentor_id,
              mentorName: "Crop Doctor",
              mentorAvatar: null,
              student_id: String(s.student_id),
              studentName: "Farmer",
              studentEmail: "farmer@farmveda.in",
              studentAvatar: "/user.png",
              topic: s.topic || "Crop Consultation",
              status: (s.status as any) || "pending",
              requested_at: s.requested_at,
              session_date: s.session_date || "",
              session_time: s.session_time || "",
              notes: s.notes || "",
              call_url: s.call_url || `room-${sid}`,
            });
          }
        }
      }
    } catch {
      // Ignored
    }

    // Filter to doctor if specific doctor and has sessions, or return all
    let filtered = resultList;
    if (mentorId && mentorId !== "all" && mentorId !== "d718072e-4496-4227-929a-b0bffaf8d9a7") {
      const match = resultList.filter((s) => s.mentor_id === mentorId);
      if (match.length > 0) {
        filtered = match;
      }
    }

    // Persist merged sessions back to local storage
    if (typeof window !== "undefined" && filtered.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }

    return filtered;
  },

  // Get sessions for a user/farmer
  async getSessionsForUser(userId?: string): Promise<DoctorBookingSession[]> {
    const supabase = createClient();
    const allLocal = this.getLocalSessions();
    const resultList: DoctorBookingSession[] = [];
    const seenIds = new Set<string>();

    // 1. Load local sessions first
    for (const loc of allLocal) {
      if (!seenIds.has(loc.id)) {
        seenIds.add(loc.id);
        resultList.push(loc);
      }
    }

    // 2. Query Supabase
    try {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .eq("type", BOOKING_MESSAGE_TYPE)
        .order("created_at", { ascending: false });

      if (!error && msgs) {
        for (const m of msgs) {
          const det = (m.listing_details as any) || {};
          const sid = String(det.sessionId || m.id);

          // Check if this booking belongs to the current user or this browser session
          const isUserMatch =
            !userId ||
            m.sender_id === userId ||
            det.studentId === userId ||
            m.sender_id === "anonymous-farmer" ||
            String(m.sender_id || "").startsWith("farmer-") ||
            seenIds.has(sid) ||
            seenIds.has(String(m.id)) ||
            allLocal.some(
              (loc) =>
                loc.id === sid ||
                loc.id === String(m.id) ||
                (det.call_url && loc.call_url === det.call_url)
            );

          if (!isUserMatch) continue;

          const serverStatus: "pending" | "accepted" | "rejected" | "completed" =
            det.status ||
            (m.content?.includes("status=accepted")
              ? "accepted"
              : m.content?.includes("status=rejected")
              ? "rejected"
              : m.content?.includes("status=completed")
              ? "completed"
              : "pending");

          const sessionObj: DoctorBookingSession = {
            id: sid,
            mentor_id: m.receiver_id || det.mentorId || "",
            mentorName: det.mentorName || "Crop Doctor",
            mentorAvatar: det.mentorAvatar || null,
            student_id: m.sender_id || det.studentId || userId || "",
            studentName: det.studentName || "Farmer",
            studentEmail: det.studentEmail || "",
            studentAvatar: det.studentAvatar || "/user.png",
            topic: det.topic || "Crop Consultation",
            status: serverStatus,
            requested_at: det.requested_at || m.created_at,
            session_date: det.session_date || m.created_at?.split("T")[0] || "",
            session_time: det.session_time || "10:00",
            notes: det.notes || "",
            call_url: det.call_url || `room-${sid}`,
          };

          const existingIdx = resultList.findIndex(
            (s) =>
              s.id === sid ||
              s.id === String(m.id) ||
              (det.sessionId && s.id === String(det.sessionId)) ||
              (det.call_url && s.call_url === String(det.call_url))
          );

          if (existingIdx >= 0) {
            // Resolve status: server accepted / rejected / completed takes precedence over local pending
            const resolved = resolveStatus(resultList[existingIdx].status, serverStatus);
            resultList[existingIdx] = {
              ...resultList[existingIdx],
              ...sessionObj,
              status: resolved,
            };
          } else {
            seenIds.add(sid);
            resultList.push(sessionObj);
          }
        }
      }
    } catch (e) {
      console.warn("Error querying user bookings from Supabase:", e);
    }

    // Save back to local storage so farmer's local state is in sync with server status
    if (typeof window !== "undefined" && resultList.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resultList));
      } catch {}
    }

    return resultList;
  },
};
