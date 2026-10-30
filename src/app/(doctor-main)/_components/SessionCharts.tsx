"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useState, useEffect, useMemo } from "react";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";
import { useUserData } from "@/context/UserDataProvider";

export function MeetingsChart() {
  const { mentor } = useUserData();
  const [timeFilter, setTimeFilter] = useState<"7days" | "30days" | "1month">("7days");
  const [sessions, setSessions] = useState<DoctorBookingSession[]>([]);

  const doctorId = mentor?.id || "d718072e-4496-4227-929a-b0bffaf8d9a7";

  const loadSessions = async () => {
    try {
      const all = await DoctorBookingService.getSessionsForDoctor(doctorId);
      setSessions(all);
    } catch (e) {
      console.warn("Error loading chart sessions:", e);
    }
  };

  useEffect(() => {
    loadSessions();
    const unsub = DoctorBookingService.subscribeToUpdates(() => {
      loadSessions();
    });
    return () => unsub();
  }, [doctorId]);

  // Compute real chart analytics
  const chartData = useMemo(() => {
    // 1. 7 days: Day by day for the last 7 days
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      const dayName = days[d.getDay()];
      const dateStr = d.toISOString().split("T")[0];

      const completed = sessions.filter(
        (s) =>
          s.status === "completed" &&
          (s.session_date === dateStr || (s.requested_at && s.requested_at.startsWith(dateStr)))
      ).length;

      const rejected = sessions.filter(
        (s) =>
          s.status === "rejected" &&
          (s.session_date === dateStr || (s.requested_at && s.requested_at.startsWith(dateStr)))
      ).length;

      return {
        date: dayName,
        completed,
        rejected,
      };
    });

    // 2. 30 days: Weeks 1 - 4
    const last30DaysData = [
      { date: "Week 1", completed: 0, rejected: 0 },
      { date: "Week 2", completed: 0, rejected: 0 },
      { date: "Week 3", completed: 0, rejected: 0 },
      { date: "Week 4", completed: 0, rejected: 0 },
    ];

    sessions.forEach((s) => {
      const sDate = s.requested_at ? new Date(s.requested_at) : new Date();
      const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 28 && diffDays >= 0) {
        const weekIdx = Math.min(3, Math.floor(diffDays / 7));
        const targetWeek = 3 - weekIdx;
        if (s.status === "completed") {
          last30DaysData[targetWeek].completed += 1;
        } else if (s.status === "rejected") {
          last30DaysData[targetWeek].rejected += 1;
        }
      }
    });

    // 3. 6 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6MonthsData = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mName = monthNames[d.getMonth()];
      const mYear = d.getFullYear();
      const mMonth = d.getMonth();

      const completed = sessions.filter((s) => {
        if (s.status !== "completed") return false;
        const sd = s.requested_at ? new Date(s.requested_at) : null;
        return sd && sd.getFullYear() === mYear && sd.getMonth() === mMonth;
      }).length;

      const rejected = sessions.filter((s) => {
        if (s.status !== "rejected") return false;
        const sd = s.requested_at ? new Date(s.requested_at) : null;
        return sd && sd.getFullYear() === mYear && sd.getMonth() === mMonth;
      }).length;

      return {
        date: mName,
        completed,
        rejected,
      };
    });

    return {
      "7days": last7DaysData,
      "30days": last30DaysData,
      "1month": last6MonthsData,
    };
  }, [sessions]);

  return (
    <Card className="bg-white mt-8 border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 font-inter">
              Meeting Analytics
            </CardTitle>
            <p className="text-xs font-inter text-slate-500 mt-1">
              Real-time completed vs rejected consultation trends
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeFilter === "7days" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("7days")}
              className={`text-xs cursor-pointer ${
                timeFilter === "7days" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
            >
              7 days
            </Button>
            <Button
              variant={timeFilter === "30days" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("30days")}
              className={`text-xs cursor-pointer ${
                timeFilter === "30days" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
            >
              30 days
            </Button>
            <Button
              variant={timeFilter === "1month" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("1month")}
              className={`text-xs cursor-pointer ${
                timeFilter === "1month" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
            >
              6 months
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData[timeFilter]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#059669"
                strokeWidth={3}
                dot={{ fill: "#059669", strokeWidth: 2, r: 4 }}
                name="Completed Consultations"
              />
              <Line
                type="monotone"
                dataKey="rejected"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                name="Rejected Consultations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
