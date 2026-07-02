"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

interface DBUser {
  id: number;
  userName: string;
  userEmail: string;
  avatar: string;
  created_at: string;
  totalCredits: number;
  remainingCredits: number;
  invite_link: string;
  current_status: string;
  userPhone: string;
  institutionName: string;
  mainFocus: string;
  is_verified: boolean;
  isQuizDone: boolean;
  latitude: number;
  longitude: number;
  isPro: boolean;
  google_refresh_token: string;
}

interface DBMentor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  bio: string | null;
  expertise: string[];
  current_position: string;
  availability: boolean;
  rating: number;
  avatar: string | null;
  created_at: string;
  is_verified: boolean;
  video_url: string | null;
}

interface UserDataContextType {
  user: DBUser | null;
  mentor: DBMentor | null;
  setUser: React.Dispatch<React.SetStateAction<DBUser | null>>;
  setMentor: React.Dispatch<React.SetStateAction<DBMentor | null>>;
  loading: boolean;
  isNewUser: boolean;
  isNewMentor: boolean;
  ensureUserInDB: () => Promise<void>;
  unreadMessages: number;
  setUnreadMessages: React.Dispatch<React.SetStateAction<number>>;
  onlineUsers: Set<string>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined
);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<DBUser | null>(null);
  const [mentor, setMentor] = useState<DBMentor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [isNewMentor, setIsNewMentor] = useState<boolean>(false);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    ensureUserInDB();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Global message listener
    const messageChannel = supabase
      .channel('global_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          if (!window.location.pathname.includes('/home/message')) {
            setUnreadMessages(prev => prev + 1);
            toast.success('New message received!');
          }
        }
      )
      .subscribe();

    // Presence listener
    const presenceChannel = supabase.channel('global_presence', {
      config: { presence: { key: String(user.id) } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineUserIds = new Set<string>();
        Object.keys(state).forEach(key => {
          onlineUserIds.add(key);
        });
        setOnlineUsers(onlineUserIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  const ensureUserInDB = async () => {
    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        console.log("❌ Error fetching auth user:", authError.message);
        setLoading(false);
        return;
      }

      const authUser = authData?.user;
      if (!authUser) {
        console.log("⚠️ No authenticated user");
        setLoading(false);
        return;
      }

      console.log("✅ Authenticated user:", authUser.email);

      const provider = authUser.app_metadata?.provider;
      if (provider === "email") {
        localStorage.setItem("emailProvider", "true");
      } else {
        localStorage.setItem("emailProvider", "false");
      }

      const role = authUser.user_metadata?.role;
      console.log("⚠️ User role:", role);

      if (role === "mentor") {
        const { data: existingMentors, error: fetchError } = await supabase
          .from("mentors")
          .select("*")
          .eq("email", authUser.email);

        if (fetchError) throw fetchError;

        if (!existingMentors || existingMentors.length === 0) {
          const name = authUser.user_metadata?.full_name;
          const avatar =
            authUser.user_metadata?.avatar_url ||
            authUser.user_metadata?.picture;

          const { data: inserted, error: insertError } = await supabase
            .from("mentors")
            .insert([
              {
                id: authUser.id,
                full_name: name,
                email: authUser.email,
                avatar,
                expertise: [],
                current_position: "",
                availability: true,
                rating: 0,
              },
            ])
            .select()
            .single();

          if (insertError) throw insertError;

          setMentor(inserted);
          setIsNewMentor(true);
          localStorage.setItem("isOnboardingDoneMentor", "false");
          setLoading(false);
        } else {
          setMentor(existingMentors[0]);
          setIsNewMentor(false);
          setLoading(false);
        }
      } else {
        const { data: existingUsers, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("userEmail", authUser.email);

        if (fetchError) {
          console.error("❌ Error fetching user from DB:", fetchError.message);
          setLoading(false);
          return;
        }

        if (!existingUsers || existingUsers.length === 0) {
          const name =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            "clarioUser";
          const avatar =
            authUser.user_metadata?.avatar_url ||
            authUser.user_metadata?.picture;

          const { data: inserted, error: insertError } = await supabase
            .from("users")
            .insert([
              {
                id: authUser.id,
                userName: name,
                userEmail: authUser.email,
                avatar,
                invite_link: crypto.randomUUID(),
              },
            ])
            .select()
            .single();

          if (insertError) {
            console.log("❌ Error inserting user:", insertError.message);
          } else {
            localStorage.setItem("isOnboardingDone", "false");
            setUser(inserted);
            setIsNewUser(true);
          }
        } else {
          setUser(existingUsers[0]);
          setIsNewUser(false);
        }
      }
    } catch (err) {
      console.error("❌ Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserDataContext.Provider
      value={{
        user,
        setUser,
        loading,
        isNewUser,
        ensureUserInDB,
        isNewMentor,
        mentor,
        setMentor,
        unreadMessages,
        setUnreadMessages,
        onlineUsers,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}
