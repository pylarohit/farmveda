"use client";

import { useState } from "react";
import { MentorSession } from "@/lib/types/allTypes";

// Simple state store hook for sessions
let activeSession: MentorSession | null = null;
const listeners = new Set<(s: MentorSession | null) => void>();

export const useSessionStore = () => {
  const [, setTrigger] = useState(0);

  const setActiveSession = (session: MentorSession | null) => {
    activeSession = session;
    listeners.forEach((l) => l(session));
    setTrigger((prev) => prev + 1);
  };

  return {
    activeSession,
    setActiveSession,
  };
};
