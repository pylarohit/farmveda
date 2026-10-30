"use client";

import React, { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/context/UserDataProvider";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";
import { toast } from "sonner";
import { LuCopy, LuChevronLeft } from "react-icons/lu";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface VideoRoomProps {
  params:
    | Promise<{ roomId?: string; roomid?: string }>
    | { roomId?: string; roomid?: string };
}

export default function VideoRoom({ params }: VideoRoomProps) {
  const router = useRouter();
  const { user, mentor } = useUserData();
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const isJoinedSuccessfullyRef = useRef(false);

  // Unwrap params safely for Next.js App Router (handles both Promise and plain object, and roomId or roomid)
  const unwrappedParams =
    params instanceof Promise || typeof (params as any)?.then === "function"
      ? use(params as Promise<{ roomId?: string; roomid?: string }>)
      : params;

  const rawRoomId =
    (unwrappedParams as any)?.roomId ||
    (unwrappedParams as any)?.roomid ||
    "";
  // Sanitize room ID so it only contains valid characters (alphanumeric, -, _)
  const cleanRoomId = decodeURIComponent(rawRoomId)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const [session, setSession] = useState<DoctorBookingSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Determine role and display name
  const isDoctor = Boolean(mentor?.id || (mentor?.full_name && !user?.userName));
  const userName = isDoctor
    ? mentor?.full_name?.startsWith("Dr.")
      ? mentor.full_name
      : `Dr. ${mentor?.full_name || "Crop Specialist"}`
    : user?.userName || "Farmer";

  const userId = isDoctor
    ? mentor?.id
      ? `doc_${String(mentor.id).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 12)}`
      : `doc_${Date.now().toString().slice(-6)}`
    : user?.id
    ? `farmer_${String(user.id).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 12)}`
    : `farmer_${Date.now().toString().slice(-6)}`;

  // Find corresponding session details from local / server cache
  useEffect(() => {
    if (!cleanRoomId) return;
    const all = DoctorBookingService.getLocalSessions();
    const match = all.find(
      (s: DoctorBookingSession) =>
        s.id === cleanRoomId ||
        s.call_url === cleanRoomId ||
        cleanRoomId.includes(s.id) ||
        (s.call_url && cleanRoomId.includes(s.call_url))
    );
    if (match) {
      setSession(match);
    }
  }, [cleanRoomId]);

  // Mark session as completed
  const handleMarkAsDone = async () => {
    setCompleting(true);
    try {
      await DoctorBookingService.completeSessionByRoomOrId(cleanRoomId);
      toast.success("Consultation successfully marked as completed!");

      if (zpRef.current?.destroy) {
        try {
          zpRef.current.destroy();
        } catch {}
      }

      if (isDoctor) {
        router.push("/dashboard");
      } else {
        router.push("/home/doctor-connect/bookings");
      }
    } catch (err) {
      console.error("Error marking completed:", err);
      toast.error("Failed to mark session as completed");
    } finally {
      setCompleting(false);
    }
  };

  const handleLeaveOnly = () => {
    if (zpRef.current?.destroy) {
      try {
        zpRef.current.destroy();
      } catch {}
    }
    if (isDoctor) {
      router.push("/dashboard");
    } else {
      router.push("/home/doctor-connect/bookings");
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Meeting link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Initialize ZegoUIKitPrebuilt
  useEffect(() => {
    let mounted = true;

    if (!cleanRoomId) {
      console.error("[VideoRoom] Room ID is missing");
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const initZego = async () => {
      try {
        const rawAppId = process.env.NEXT_PUBLIC_ZEGO_APP_ID || "1446298340";
        const rawSecret =
          process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET || "c0eaf4cdbf205ddce031b7897b2cc752";
        const appID = Number(String(rawAppId).trim());
        const serverSecret = String(rawSecret).trim();

        // Dynamic import so it strictly executes client-side
        const zegoModule = await import("@zegocloud/zego-uikit-prebuilt");
        const ZegoUIKitPrebuilt = zegoModule.ZegoUIKitPrebuilt;

        if (!mounted || !meetingContainerRef.current) return;

        // Clear previous children to prevent duplicate root mounting
        meetingContainerRef.current.innerHTML = "";

        const effectiveUserId =
          String(userId).replace(/[^a-zA-Z0-9_]/g, "") ||
          `user_${Math.random().toString(36).substring(2, 9)}`;
        const effectiveUserName = userName || "Participant";

        // Generate Kit Token (valid for 7200 seconds / 2 hours)
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          cleanRoomId,
          effectiveUserId,
          effectiveUserName,
          7200
        );

        if (!mounted || !meetingContainerRef.current) return;

        // Create ZegoUIKitPrebuilt instance
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        // Join room directly using VideoConference scenario (clean WebRTC, no token mismatch)
        zp.joinRoom({
          container: meetingContainerRef.current,
          sharedLinks: [
            {
              name: "Consultation Meeting Link",
              url:
                typeof window !== "undefined"
                  ? window.location.href
                  : "",
            },
          ],
          scenario: {
            mode: ZegoUIKitPrebuilt.VideoConference,
          },
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: true,
          showTextChat: true,
          showUserList: true,
          showRoomTimer: true,
          onJoinRoom: () => {
            isJoinedSuccessfullyRef.current = true;
            setConnectionError(null);
          },
          onLeaveRoom: () => {
            // Only auto-redirect if successfully joined and user leaves
            if (isJoinedSuccessfullyRef.current) {
              handleLeaveOnly();
            }
          },
        });
      } catch (err: any) {
        console.error("ZegoCloud Initialization Error:", err);
        if (mounted) {
          setConnectionError(err?.message || "AppID / ServerSecret configuration error");
          toast.error("Failed to connect video call: " + (err?.message || "Check ZEGOCLOUD AppID"));
        }
      }
    };

    initZego();

    return () => {
      mounted = false;
      if (zpRef.current?.destroy) {
        try {
          zpRef.current.destroy();
        } catch {}
      }
    };
  }, [cleanRoomId, userId, userName]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden font-inter select-none">
      {/* Top Floating Control Bar */}
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveOnly}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            <LuChevronLeft className="w-4 h-4" />
            <span>Leave</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Consultation
            </span>

            <span className="text-xs text-slate-400 hidden sm:inline">
              Room: <span className="text-slate-200 font-mono">{cleanRoomId.slice(0, 18)}</span>
            </span>

            {session?.topic && (
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded hidden md:inline">
                {session.topic}
              </span>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            title="Copy Meeting Link"
          >
            <LuCopy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Link"}</span>
          </button>

          <button
            onClick={handleMarkAsDone}
            disabled={completing}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-md transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Complete consultation and mark as done in history"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{completing ? "Completing..." : "End & Mark Done"}</span>
          </button>
        </div>
      </header>

      {/* Main Video Call Area */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
        <div
          ref={meetingContainerRef}
          className="w-full h-full"
          style={{ width: "100%", height: "calc(100vh - 56px)", minHeight: "calc(100vh - 56px)" }}
        />

        {/* Connection Error Diagnostic Overlay */}
        {connectionError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 z-40 p-4">
            <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-xl p-6 text-center shadow-2xl">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">ZEGOCLOUD Connection Error</h3>
              <p className="text-sm text-slate-300 mb-4">{connectionError}</p>

              <div className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-400 text-left mb-5 space-y-1">
                <p><span className="text-slate-500">AppID:</span> <span className="text-slate-200">{process.env.NEXT_PUBLIC_ZEGO_APP_ID || "1446298340"}</span></p>
                <p><span className="text-slate-500">Reason:</span> <span className="text-red-400">ZEGOCLOUD cloud server rejected this AppID (20012 - appid invalid)</span></p>
                <p className="text-amber-400 mt-2 font-sans font-medium text-[11px]">
                  Please verify your AppID and ServerSecret in <a href="https://console.zegocloud.com/" target="_blank" rel="noreferrer" className="underline text-emerald-400">console.zegocloud.com</a> under Project Management.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Connection</span>
                </button>
                <button
                  onClick={handleLeaveOnly}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Back to Bookings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
