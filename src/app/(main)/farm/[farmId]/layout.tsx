"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FarmSidebar } from "@/components/farm-sidebar";
import { useUserData } from "@/context/UserDataProvider";
import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage, useDynamicText } from "@/context/LanguageProvider";
import { useParams } from "next/navigation";

export default function FarmLayout({ children }: { children: ReactNode }) {
    const { user } = useUserData();
    const { t } = useLanguage();
    const headerTitle = useDynamicText("Farm Dashboard");
    const params = useParams();
    const farmId = params.farmId as string;

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-slate-50 flex w-full">
                <FarmSidebar farmId={farmId} />
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Navigation Bar */}
                    <header className="h-20 min-h-[65px] bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-20 w-full justify-between" style={{ height: "80px" }}>
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" />
                            <span className="font-semibold text-slate-800 text-sm hidden md:block">
                                {headerTitle}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Language Switcher in Header */}
                            <LanguageSwitcher variant="inline" />

                            {/* Notification Bell with Dropdown */}
                            <NotificationBell />

                            <Link href="/home/profile" title={t("user", "profile")}>
                                {user?.avatar ? (
                                    <Image
                                        src={user.avatar}
                                        alt="Profile"
                                        width={38}
                                        height={38}
                                        className="rounded-full border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-emerald-400 transition-all"
                                    />
                                ) : (
                                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shadow-sm cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all">
                                        {user?.userName?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}
                            </Link>
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
