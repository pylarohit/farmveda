import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <div className="min-h-screen bg-slate-50 flex w-full">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Navigation Bar */}
                    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10 w-full justify-between">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" />
                            <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />
                            <span className="font-semibold text-slate-800 text-sm hidden md:block">Overview</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                U
                            </div>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 p-6 lg:p-8 w-full max-w-7xl mx-auto">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
