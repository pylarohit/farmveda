"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FarmSidebar } from "@/components/farm-sidebar";
import { useUserData } from "@/context/UserDataProvider";
import Image from "next/image";
import { Bell } from "lucide-react";
import { useParams } from "next/navigation";

export default function FarmLayout({ children }: { children: ReactNode }) {
    const { user } = useUserData();
    const params = useParams();
    const farmId = params.farmId as string;

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-slate-50 flex w-full">
                <FarmSidebar farmId={farmId} />
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Navigation Bar */}
                    <header className="h-20 min-h-[65px] bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10 w-full justify-between" style={{ height: "80px" }}>
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" />
                            <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />
                            <span className="font-semibold text-slate-800 text-sm hidden md:block">Farm Dashboard</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Notification Button */}
                            <button className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none">
                                <Bell className="h-5 w-5" />
                            </button>

                            {user?.avatar ? (
                                <Image
                                    src={user.avatar}
                                    alt="Profile"
                                    width={38}
                                    height={38}
                                    className="rounded-full border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shadow-sm cursor-pointer">
                                    {user?.userName?.[0]?.toUpperCase() || "U"}
                                </div>
                            )}
                        </div>
                    </header>

                    <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
