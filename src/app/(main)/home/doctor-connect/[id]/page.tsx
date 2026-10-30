"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { DBMentor, MentorProfile } from "@/lib/types/allTypes";
import {
  getAllMentorProfiles,
  getMatchingMentors,
  triggerSessionNotification,
} from "@/lib/functions/dbActions";
import { DoctorBookingService } from "@/lib/doctorBooking";
import { DynamicText } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  LuBookmark,
  LuBriefcaseBusiness,
  LuCoins,
  LuGhost,
  LuLoader,
  LuMail,
  LuMessageCircle,
  LuScreenShare,
  LuTimer,
  LuUser,
  LuUserCheck,
  LuX,
} from "react-icons/lu";
import { toast } from "sonner";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

const sessions = [
  {
    time: "10",
    label: "Rapid Q&A",
    duration: "10 Minutes",
    image: "/10.png",
    color: "from-yellow-400 to-amber-600",
    coins: 15,
  },
  {
    time: "30",
    label: "Deep Dive",
    duration: "30 Minutes",
    image: "/30.png",
    color: "from-yellow-400 to-amber-600",
    coins: 20,
  },
  {
    time: "45",
    label: "Full Coaching",
    duration: "45 Minutes",
    image: "/45.png",
    color: "from-yellow-400 to-amber-600",
    coins: 35,
  },
];

export default function MentorConnectPage() {
  const params = useParams();
  const mentorId = params?.id as string;

  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [recomentors, recoSetMentors] = useState<DBMentor[]>([]);
  const [mentorLoading, setMentorLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarOpen]);

  // booking dialog state
  const [sessionType, setSessionType] = useState<"30" | "45" | "10" | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("10:00");
  const [open, setOpen] = useState(false);

  const supabase = createClient();
  const { user } = useUserData();
  const router = useRouter();

  // fetching real mentor details from Supabase mentors table
  useEffect(() => {
    async function fetchMentor() {
      setLoading(true);
      try {
        const { data: dbMentor, error } = await supabase
          .from("mentors")
          .select("*")
          .eq("id", mentorId)
          .maybeSingle();

        if (dbMentor) {
          setMentor(dbMentor as MentorProfile);
        } else {
          setMentor(null);
        }
      } catch (err) {
        console.error("Error fetching mentor:", err);
        setMentor(null);
      } finally {
        setLoading(false);
      }
    }
    if (mentorId) fetchMentor();
  }, [mentorId]);

  // ---------------------------------------------
  // SHOWING OTHER REAL CROP DOCTORS
  useEffect(() => {
    async function fetchOtherDoctors() {
      setMentorLoading(true);
      try {
        const { data, error } = await supabase
          .from("mentors")
          .select("*")
          .neq("id", mentorId)
          .limit(6);

        if (data && data.length > 0) {
          recoSetMentors(data as DBMentor[]);
        } else {
          recoSetMentors([]);
        }
      } catch (err) {
        console.error("Error loading other crop doctors:", err);
        recoSetMentors([]);
      } finally {
        setMentorLoading(false);
      }
    }

    if (mentorId) {
      fetchOtherDoctors();
    }
  }, [mentorId]);

  //   SUBMIT FUNCTION TO UPDATE CREDITS FOR USER AND SAVE SESSION IN TABLE.
  async function handleSubmit() {
    if (!sessionType || !date) {
      toast.error("Please select a session type and date.");
      return;
    }

    if (!notes || notes.trim().length === 0) {
      toast.error("Please add a note before booking.");
      return;
    }

    const cost = sessionType === "10" ? 10 : sessionType === "30" ? 20 : 35;

    // check credits if user exists
    if (user && typeof user.remainingCredits === "number" && user.remainingCredits < cost) {
      toast.info("Not enough credits to book this session.");
      return;
    }

    try {
      const createdSession = await DoctorBookingService.createBooking({
        mentorId: mentorId,
        mentorName: mentor?.full_name || "Crop Doctor",
        mentorAvatar: mentor?.avatar || null,
        userId: user?.id ? String(user.id) : "farmer-" + Date.now(),
        userName: user?.userName || "Farmer",
        userEmail: user?.userEmail || "farmer@farmveda.in",
        userAvatar: user?.avatar || "/user.png",
        sessionType: sessionType,
        date: (() => {
          const finalDate = selectedDate ? new Date(selectedDate) : new Date();
          const [h, m] = (selectedTime || "10:00").split(":");
          finalDate.setHours(parseInt(h, 10) || 10, parseInt(m, 10) || 0, 0, 0);
          return finalDate;
        })(),
        notes: notes.trim(),
      });

      // Deduct credits if applicable
      if (user && typeof user.remainingCredits === "number" && user.remainingCredits >= cost) {
        const newCredits = user.remainingCredits - cost;
        await supabase
          .from("users")
          .update({ remainingCredits: newCredits })
          .eq("id", user.id);
      }

      // FIRING NOTIFICATION----------------
      triggerSessionNotification(createdSession.id, mentor?.email || undefined);

      setOpen(false);
      setSessionType(null);
      setNotes("");
      setDate(new Date());
      toast.success(`Session request sent to ${mentor?.full_name || "Doctor"}! Check your bookings.`);
      router.push("/home/doctor-connect/bookings");
    } catch (err: any) {
      console.warn("Booking error:", err?.message);
      toast.error("Failed to complete booking. Please try again.");
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50">
        <p className="font-inter text-xl font-medium">
          <LuLoader className="inline mr-4 animate-spin" />
          Loading Mentor...
        </p>
      </div>
    );
  if (!mentor) return <p className="p-4">⚠️ Mentor not found.</p>;

  return (
    <div className="-mx-6 -mt-2 lg:-mx-8 lg:-mt-4 pb-12">
      {/* ──── FULL EDGE-TO-EDGE BIGGER BANNER (No Gap, Bigger Height) ──── */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 h-60 sm:h-72 w-full relative shadow-sm">
        {/* Decorative design2 wavy lines on left */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image
            src="/design2.png"
            alt="design decoration"
            width={440}
            height={440}
            className="absolute -top-12 -left-8 opacity-85 object-contain"
            priority
          />
        </div>

        {/* Doctor Info and Avatar overlapping bottom */}
        <div className="absolute -bottom-14 sm:-bottom-16 left-6 sm:left-12 lg:left-16 flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8 z-30">
          {/* Main Avatar */}
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mentor?.avatar || "/user.png"}
              alt={mentor?.full_name || "Doctor"}
              className="rounded-full border-4 border-white w-[150px] h-[150px] sm:w-[190px] sm:h-[190px] object-cover shadow-xl bg-white"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/user.png";
              }}
            />
          </div>

          <div className="mb-2">
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-extrabold font-sora capitalize tracking-tight flex items-center gap-2">
              <LuUser className="w-6 h-6 text-slate-800" />
              <span>{mentor?.full_name?.startsWith("Dr.") ? mentor.full_name : `Dr. ${mentor?.full_name}`}</span>
            </h1>
            <p className="text-slate-800 text-sm sm:text-base font-inter font-medium mt-1 flex items-center gap-2">
              <LuMail className="w-4 h-4 text-slate-700" />
              <span>{mentor?.email}</span>
            </p>

            <div className="mt-2 flex items-center gap-2">
              {mentor?.availability !== false ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold font-inter">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Available Today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold font-inter">
                  Currently Unavailable
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Right Actions: Bookmark & Chat */}
        <div className="absolute bottom-5 right-6 sm:right-12 lg:right-16 flex items-center gap-3 z-30">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 hover:bg-white text-slate-800 font-inter text-sm font-semibold rounded-xl shadow-xs border-white/60 px-4 py-2 h-10 flex items-center gap-2 cursor-pointer"
          >
            <span>Bookmark</span>
            <LuBookmark className="w-4 h-4 text-amber-500" />
          </Button>
          <button
            onClick={() => router.push(`/home/message?chatWith=${mentor?.id}&name=${encodeURIComponent(mentor?.full_name || "Doctor")}`)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-inter text-sm font-bold py-2 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer h-10"
          >
            <span>Chat</span>
            <LuMessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ──── CONTENT BELOW BANNER ──── */}
      <div className="mt-20 sm:mt-24 px-6 sm:px-12 flex flex-col lg:flex-row h-full gap-8">
        {/* LEFT SIDE */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-6 mb-8 mt-4">
            <div>
              <h2 className="font-inter underline whitespace-nowrap underline-offset-4 text-base sm:text-lg font-semibold text-slate-900">
                Current Position
              </h2>
              <p className="text-slate-700 text-base font-inter font-medium capitalize mt-1.5">
                {mentor?.current_position || "Crop Specialist & Agronomist"}
              </p>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-10 bg-gray-300" />
            <div>
              <h2 className="font-inter underline underline-offset-4 text-base sm:text-lg font-semibold text-slate-900">
                Specialization & Expertise
              </h2>
              <p className="mt-3 text-base tracking-tight font-medium font-inter capitalize">
                {" "}
                {mentor?.expertise?.join(", ") || "No expertise added"}
              </p>
            </div>
          </div>

          <h2 className="font-inter underline underline-offset-4 text-lg font-semibold">
            About Me
          </h2>
          <p className="mt-3 text-base font-inter tracking-wide">
            {mentor?.bio}
          </p>

          {/* SESSION BOOKING */}
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-400 h-48 rounded-lg p-4 mt-14 relative overflow-hidden">
            <Image
              src="/element3.png"
              alt="element"
              width={400}
              height={400}
              className="absolute -top-1/2 -left-10"
            />
            <div className="w-[380px] ml-auto h-full bg-white/20 rounded-lg p-1 flex flex-col">
              <h2 className="text-center mt-2 mb-2 text-xl font-semibold font-sora">
                Book Session
              </h2>
              <p className="font-inter text-sm text-center leading-relaxed tracking-tight text-slate-900">
                Book a 1:1 consultation with {mentor?.full_name} for direct crop disease diagnosis and treatment advisory.
              </p>

              <div className="flex gap-6 mt-auto justify-center">
                <Button
                  // onClick={() => {
                  //   setSessionType("10");
                  //   setOpen(true);
                  // }}
                  className="cursor-pointer text-sm font-inter tracking-tight"
                  size="sm"
                  variant="outline"
                >
                  <LuTimer className="mr-2" /> Book Now
                </Button>
              </div>
            </div>
          </div>

          {/* SESSIONS 10,30,45 */}
          <div className="my-10 border border-dashed border-gray-300 p-3 relative rounded-md bg-gray-50">
            <h1 className="font-inter text-xl font-semibold tracking-tight text-center">
              Sessions Available
            </h1>
            <div className="flex justify-evenly w-full flex-wrap gap-6 py-6">
              {sessions.map((session) => (
                <div key={session.time} className="relative">
                  {/* Coin badge */}
                  <div className="absolute -top-3 -right-3 z-20 bg-amber-100 border border-amber-300 rounded-md py-1 px-3 text-xs font-inter tracking-tight flex items-center gap-1 shadow-sm">
                    <LuCoins className="text-amber-500" />
                    {session.coins} coins
                  </div>

                  {/* Card */}
                  <div
                    onClick={() => {
                      setSessionType(session.time as "10" | "30" | "45");
                      setOpen(true);
                    }}
                    className={`
              relative flex flex-col items-center justify-center 
              w-[180px] h-[180px] rounded-2xl cursor-pointer 
              border border-gray-200 shadow-sm 
              bg-white backdrop-blur-md transition-all duration-300
              hover:shadow-lg hover:scale-105 hover:border-transparent
            `}
                  >
                    {/* Gradient hover overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${session.color} opacity-20 transition-opacity duration-300 rounded-2xl`}
                    ></div>

                    <p className="font-inter text-lg tracking-tight text-center mb-2 z-10">
                      {session.label}
                    </p>

                    <Image
                      src={session.image}
                      alt={session.label}
                      width={55}
                      height={55}
                      className="object-cover opacity-40 z-10 mb-2"
                    />

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-sm font-inter tracking-tight z-10 mt-2 transition-all hover:bg-gray-100"
                    >
                      <LuTimer className="mr-2" /> {session.duration}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REVIEWS SECTION */}
          <div className="my-10 bg-gray-50 w-full border border-gray-200 rounded h-[300px] p-2 flex flex-col">
            <h2 className="text-xl font-inter text-center">Reviews</h2>
            <p className="text-center text-muted-foreground font-inter text-sm">
              Check what others have said about mentor {mentor?.full_name}
            </p>

            <div className="h-full flex flex-col items-center justify-center">
              <LuGhost className="text-4xl text-gray-600" />
              <p className="text-center font-inter text-sm">No reviews Found</p>
            </div>
          </div>
        </div>
        <Separator orientation="vertical" className="" />
        {/* RIGHT SIDE */}
        <div className="w-[30%] h-full mt-5 ">
          <div className="flex flex-col  bg-yellow-50 p-3 rounded-md shadow justify-center mx-auto w-[200px]">
            <h2 className="font-inter text-xl font-semibold">Rating</h2>
            <div className="flex items-center gap-4">
              <Star className="text-amber-500" />
              <h2 className="text-2xl font-sora">{mentor?.rating}</h2>
            </div>
          </div>
          <h2 className="text-xl font-bold text-center my-8 font-sora text-slate-900 tracking-tight">
            <DynamicText text="Check Other Crop Doctors" />
          </h2>
          <div className="flex justify-center mt-2">
            <div className="flex flex-col gap-4 w-full max-w-[340px] px-2 mb-20">
              {mentorLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <LuLoader className="animate-spin text-2xl text-emerald-600" />
                  <span className="text-xs font-inter">Loading doctors...</span>
                </div>
              ) : recomentors.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-inter text-sm">
                  <DynamicText text="No other crop doctors available" />
                </div>
              ) : (
                recomentors.slice(0, 4).map((otherDoc) => (
                  <div
                    key={otherDoc.id}
                    className="flex flex-col gap-3 p-3.5 rounded-xl border border-gray-200 shadow-sm bg-white hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3.5 relative">
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={otherDoc.avatar || "/user.png"}
                          alt={otherDoc.full_name}
                          className="w-13 h-13 rounded-full object-cover border-2 border-slate-100 bg-white"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/user.png";
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white border border-amber-400 rounded-full py-0.5 px-1.5 text-[10px] font-bold text-amber-600 shadow-xs flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>{otherDoc.rating ? Number(otherDoc.rating).toFixed(1) : "4.9"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="font-bold font-inter text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                          {otherDoc.full_name?.startsWith("Dr.")
                            ? otherDoc.full_name
                            : `Dr. ${otherDoc.full_name}`}
                        </h3>
                        <p className="text-xs text-slate-500 font-inter truncate mt-0.5">
                          {otherDoc.current_position || "Crop Specialist"}
                        </p>
                        {otherDoc.expertise && otherDoc.expertise.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {otherDoc.expertise.slice(0, 2).map((exp, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded font-inter"
                              >
                                {exp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="font-inter text-xs font-semibold mt-1 w-full border-slate-200 hover:bg-slate-50 hover:text-emerald-800 cursor-pointer flex items-center justify-center gap-1.5 h-8"
                      onClick={() => router.push(`/home/doctor-connect/${otherDoc.id}`)}
                    >
                      <span>Connect</span>
                      <LuScreenShare className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg overflow-visible" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-sora tracking-tight">
              Book Mentor Session{" "}
              <LuScreenShare className="inline-block ml-2" />
            </DialogTitle>
          </DialogHeader>

          <div className="">
            <p className="text-muted-foreground -mt-2 tracking-tight text-center font-inter text-sm mb-3">
              You selected:{" "}
              <span className="font-semibold">
                {sessionType === "10"
                  ? "Rapid Q&A"
                  : sessionType === "30"
                  ? "Deep Dive"
                  : "Full Coaching"}
              </span>{" "}
              session with your mentor. Fill the below form to book this
              session.
            </p>

            {/* Notes */}
            <label className="px-1 text-sm font-medium font-inter">Notes</label>
            <Textarea
              placeholder="Why do you want this session?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />

            {/* Date (Today only) + Time Picker */}
            <div className="flex gap-4 mt-3 w-full">
              {/* Date */}
              <div className="flex flex-col gap-3 flex-1 relative" ref={calendarRef}>
                <label className="px-1 text-sm font-medium font-inter">
                  Date
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal cursor-pointer bg-white"
                  onClick={() => setCalendarOpen((prev) => !prev)}
                >
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-GB")
                    : "Select a date"}
                  <ChevronDownIcon className="w-4 h-4 opacity-60" />
                </Button>

                {calendarOpen && (
                  <div
                    className="absolute top-[calc(100%+4px)] left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 animate-in fade-in-0 zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setSelectedDate(newDate);
                          const updated = date ? new Date(date) : new Date();
                          updated.setFullYear(newDate.getFullYear());
                          updated.setMonth(newDate.getMonth());
                          updated.setDate(newDate.getDate());
                          setDate(updated);
                          setCalendarOpen(false);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="flex flex-col gap-2 flex-1">
                <label
                  htmlFor="time-picker"
                  className="px-1 text-sm font-medium font-inter flex items-center justify-between"
                >
                  <span>Time</span>
                  <span className="text-[11px] text-slate-400 font-normal">Pick or click slot</span>
                </label>
                <Input
                  type="time"
                  id="time-picker"
                  value={selectedTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTime(val);
                    if (val) {
                      const [hours, minutes] = val.split(":");
                      const updated = selectedDate ? new Date(selectedDate) : new Date();
                      updated.setHours(parseInt(hours, 10) || 10, parseInt(minutes, 10) || 0, 0, 0);
                      setDate(updated);
                    }
                  }}
                  className="w-full h-9 bg-white cursor-pointer text-sm"
                />

                {/* Quick time slot presets */}
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {[
                    { label: "10:00 AM", value: "10:00" },
                    { label: "11:30 AM", value: "11:30" },
                    { label: "02:00 PM", value: "14:00" },
                    { label: "04:30 PM", value: "16:30" },
                  ].map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => {
                        setSelectedTime(slot.value);
                        const [hours, minutes] = slot.value.split(":");
                        const updated = selectedDate ? new Date(selectedDate) : new Date();
                        updated.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                        setDate(updated);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer font-inter ${
                        selectedTime === slot.value
                          ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-24 cursor-pointer"
              >
                Cancel <LuX className="ml-2" />
              </Button>
              <Button onClick={handleSubmit} className="w-36 cursor-pointer">
                Book Session <LuScreenShare className="ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
