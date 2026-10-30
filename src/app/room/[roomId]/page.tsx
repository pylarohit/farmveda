"use client";

import dynamic from "next/dynamic";
import React from "react";

const VideoRoom = dynamic(() => import("./VideoRoom"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white font-inter">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-base font-semibold text-slate-100">Connecting to Video Consultation...</p>
          <p className="text-xs text-slate-400 mt-1">Initializing camera, microphone, and secure room</p>
        </div>
      </div>
    </div>
  ),
});

export default function RoomPage({
  params,
}: {
  params:
    | Promise<{ roomId?: string; roomid?: string }>
    | { roomId?: string; roomid?: string };
}) {
  return <VideoRoom params={params} />;
}
