"use client";

import { useSessionStore } from "@/lib/store/useSessionStore";
import Image from "next/image";
import React, { useState } from "react";
import VideoCard from "../../_components/Video-card";
import { LuMessageSquare, LuVideo, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";

const notes = [
  "Maintain professionalism while interacting with farmers during the consultation.",
  "Ensure your camera and microphone permissions are enabled.",
  "Choose a quiet and well-lit environment.",
  "Review the farmer's notes and topic before beginning.",
  "Use the in-call text chat to share dosage recommendations, pesticide names, or links.",
];

const VideoCallHome = () => {
  const { activeSession } = useSessionStore();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChat = () => {
    if (!activeSession) return;
    router.push(`/dashboard/messages`);
  };

  const handleStartSession = () => {
    setConfirmOpen(true);
  };

  const handleStartSession2 = async () => {
    const targetRoom =
      activeSession?.call_url ||
      (activeSession?.session_id ? `room-${activeSession.session_id}` : null) ||
      (activeSession?.id ? `room-${activeSession.id}` : null);

    if (!targetRoom) {
      toast.error("No active session found! Please select a session from Confirmed Requests.");
      return;
    }

    setLoading(true);
    toast.success("Connecting to Video Consultation Room...");
    setConfirmOpen(false);
    router.push(`/room/${targetRoom}`);
  };

  if (!activeSession) {
    return (
      <div className="p-8 text-center font-inter space-y-4">
        <p className="text-gray-600 text-lg">No active consultation session selected.</p>
        <Button
          onClick={() => router.push("/dashboard")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Back to Doctor Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <VideoCard />
      <h2 className="mt-6 font-inter text-2xl md:text-3xl text-center font-semibold tracking-wide capitalize text-slate-900">
        Start Video Consultation for{" "}
        <span className="font-sora text-emerald-600 tracking-tight">
          {activeSession.session_type || activeSession.topic || "Crop Guidance"}
        </span>{" "}
        <LuVideo className="inline ml-2 text-emerald-600" />{" "}
      </h2>

      <div className="flex items-center gap-4 mt-6 justify-center bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl w-fit mx-auto shadow-xs">
        <Image
          src={activeSession.avatar || "/user.png"}
          alt="avatar"
          height={64}
          width={64}
          className="h-16 w-16 rounded-full object-cover border border-emerald-300"
        />
        <div>
          <p className="font-bold font-inter text-lg text-slate-900">
            {activeSession.userName || "Farmer"}
          </p>
          <p className="text-slate-600 text-sm font-inter">
            {activeSession.userEmail || "farmer@farmveda.in"}
          </p>
          {activeSession.notes && (
            <p className="text-xs text-emerald-800 font-inter mt-1 max-w-md">
              <span className="font-semibold">Farmer Note:</span> {activeSession.notes}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 mt-8 justify-center">
        <Button
          className="font-inter tracking-tight text-sm cursor-pointer border-slate-300"
          variant="outline"
          onClick={handleChat}
        >
          Chat with {activeSession?.userName || "Farmer"}{" "}
          <LuMessageSquare className="ml-2" />
        </Button>
        <Button
          className="font-inter tracking-tight text-sm cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          onClick={handleStartSession}
        >
          Join Video Call
          <LuVideo className="ml-2" />
        </Button>
      </div>

      <div className="mt-8">
        <Card className="max-w-2xl mx-auto bg-amber-50/80 backdrop-blur-md border border-amber-200 shadow-sm rounded-2xl p-4">
          <CardHeader className="flex items-center space-x-2">
            <AlertCircle className="text-amber-600 w-5 h-5" />
            <CardTitle className="text-base font-semibold font-sora text-amber-900">
              Important Notes Before Starting the Session
            </CardTitle>
          </CardHeader>
          <Separator className="mb-3 -mt-2 bg-amber-200" />
          <CardContent className="-mt-3">
            <ul className="list-disc list-inside space-y-2 text-xs md:text-sm font-inter text-amber-950">
              {notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Popup */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-sora text-center tracking-tight text-lg">
              Confirm Video Call
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-700 font-inter text-center mt-3">
              Are you ready to join the video call room with{" "}
              <span className="font-semibold text-emerald-700">
                {activeSession.userName || "Farmer"}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-emerald-700">
                {activeSession.session_type || activeSession.topic}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center items-center mx-auto gap-4 mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel <LuX className="ml-1" />
            </Button>
            <Button
              onClick={handleStartSession2}
              disabled={loading}
              className="cursor-pointer font-inter text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Connecting..." : "Join Now"}{" "}
              {!loading && <LuVideo className="ml-1" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoCallHome;
