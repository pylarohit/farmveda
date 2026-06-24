import { ReactNode } from "react";

export default function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Simple Top Navigation */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10">
                <div className="font-raleway text-xl font-bold text-emerald-600 flex items-center gap-2">
                    <span className="text-2xl">🌾</span> Farmveda
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                        U
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
