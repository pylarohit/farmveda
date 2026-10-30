/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import { useRouter } from "next/navigation";

type UserDisplay = {
  id: string;
  name: string;
  avatar: string | null;
};

const MentorMessagesList: React.FC = () => {
  const { mentor, loading: mentorLoading } = useUserData();
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!mentor?.id) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchMessageNames = async () => {
      try {
        // 1️⃣ Fetch messages involving this mentor
        const { data: messages, error } = await supabase
          .from("messages")
          .select("id, sender_id, receiver_id, content, created_at")
          .or(`sender_id.eq.${mentor.id},receiver_id.eq.${mentor.id}`);

        if (error) {
          console.warn("Supabase messages query notice:", error.message || error);
        }

        // 2️⃣ Collect peer (user) IDs from real messages
        const peerIds = new Set<string>();
        if (messages && messages.length > 0) {
          messages.forEach((msg) => {
            if (msg.sender_id && msg.sender_id !== mentor.id) {
              peerIds.add(msg.sender_id);
            }
            if (msg.receiver_id && msg.receiver_id !== mentor.id) {
              peerIds.add(msg.receiver_id);
            }
          });
        }

        // Also add farmers who have real bookings with this mentor
        try {
          const { DoctorBookingService } = await import("@/lib/doctorBooking");
          const sessions = await DoctorBookingService.getSessionsForDoctor(mentor.id);
          sessions.forEach((s) => {
            if (s.student_id && s.student_id !== mentor.id) {
              peerIds.add(s.student_id);
            }
          });
        } catch {}

        if (peerIds.size === 0) {
          // If no message threads yet, show real registered farmers from the database
          const { data: realFarmers } = await supabase
            .from("users")
            .select("id, userName, avatar")
            .limit(4);

          if (realFarmers && realFarmers.length > 0) {
            setUsers(
              realFarmers.map((f) => ({
                id: f.id,
                name: f.userName || "Registered Farmer",
                avatar: f.avatar || null,
              }))
            );
          } else {
            setUsers([]);
          }
          setLoading(false);
          return;
        }

        // 3️⃣ Fetch real peers from users table
        const { data: peers, error: peersError } = await supabase
          .from("users")
          .select("id, userName, avatar")
          .in("id", Array.from(peerIds));

        if (!peersError && peers && peers.length > 0) {
          setUsers(
            peers.map((p) => ({
              id: p.id,
              name: p.userName || "Farmer",
              avatar: p.avatar,
            }))
          );
        } else {
          setUsers([]);
        }
        setLoading(false);
      } catch (err: any) {
        console.warn("Messages load warning:", err?.message);
        setUsers([]);
        setLoading(false);
      }
    };

    fetchMessageNames();

    // 🔴 Subscribe to new inserts
    const subscription = supabase
      .channel("mentor-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          if (
            newMessage.sender_id === mentor.id ||
            newMessage.receiver_id === mentor.id
          ) {
            fetchMessageNames();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [mentor?.id]);

  if (mentorLoading || loading) return <div className="text-sm text-slate-500 py-4">Loading conversations...</div>;
  if (users.length === 0) return <div className="text-sm text-slate-500 py-4">No active farmer inquiries yet.</div>;

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-1 bg-gray-50 rounded-xl p-3 border border-slate-200/60 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all"
          >
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push(`/dashboard/messages/mentor/${u.id}`)}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-emerald-100 shrink-0">
                <Image
                  src={u.avatar || "/user.png"}
                  alt={u.name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <span className="font-semibold font-sora text-sm text-slate-900">{u.name}</span>
            </div>
            <span className="text-xs ml-13 -mt-1 text-emerald-700 font-medium cursor-pointer">
              Click to view farmer consultation
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MentorMessagesList;
