"use client";

import { useState, useEffect } from "react";
import { useUserData } from "@/context/UserDataProvider";

export default function VideoPlayer() {
  const { mentor } = useUserData();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mentor?.video_url) {
      setVideoUrl(mentor.video_url);
    }
  }, [mentor]);

  if (!videoUrl) {
    return <div className="text-sm text-gray-500 font-inter">No video uploaded.</div>;
  }

  return (
    <div
      style={{
        width: "360px",
        height: "420px",
        margin: "0 auto",
        overflow: "hidden",
        borderRadius: "8px",
        position: "relative",
      }}
    >
      <video
        src={videoUrl}
        autoPlay
        controls
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
