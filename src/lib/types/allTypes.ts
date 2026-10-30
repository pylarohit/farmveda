export interface DBMentor {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  linkedin?: string | null;
  bio?: string | null;
  expertise: string[];
  current_position: string;
  availability: boolean;
  rating: number;
  avatar?: string | null;
  created_at?: string;
  is_verified?: boolean;
  video_url?: string | null;
}

export interface MentorProfile extends DBMentor {}

export interface MentorSession {
  id: string | number;
  mentor_id: string;
  student_id: number | string;
  topic?: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  requested_at: string;
  session_date?: string;
  session_time?: string;
  call_url?: string;
  notes?: string;
  created_at?: string;
  userName?: string;
  userEmail?: string;
  avatar?: string | null;
  session_id?: string | number;
  session_type?: string;
}

export interface UserCalendarEvent {
  id: string | number;
  user_id: string | number;
  title: string;
  start_time: string;
  end_time: string;
  notes?: string;
  created_at?: string;
}

export interface DoctorSession extends MentorSession {
  crop_name?: string;
  disease_name?: string;
  prescription?: string;
}

