"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { LuLayoutDashboard, LuActivity, LuMapPin, LuArrowLeft } from "react-icons/lu";
import { Highlighter } from "@/components/ui/highlighter";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function FarmSidebar({ farmId }: { farmId: string }) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-[#1E293B]">
      <SidebarHeader className="p-4 bg-[#0A0E1A]">
        <div className="flex items-center gap-2 justify-center">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white/5 flex items-center justify-center p-1">
            <Image
              src="/logo-bg.png"
              alt="logo"
              width={40}
              height={40}
              className="object-contain scale-110"
            />
          </div>
          <p className="font-raleway text-white text-xl font-bold tracking-wide">Farmveda</p>
        </div>

        <div className="flex items-center justify-center mt-2.5 text-gray-300 text-sm font-sora font-semibold select-none">
          <span>Farm&nbsp;</span>
          <Highlighter action="underline" color="#f97316" padding={2} strokeWidth={2}>
            <span className="text-gray-200">Dashboard</span>
          </Highlighter>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[#0A0E1A] overflow-y-auto scrollbar-none">
        <SidebarGroup className="pt-4 mt-0">
          <SidebarMenu className="px-2 pb-2 space-y-1">
            
            {/* Back to Main Dashboard */}
            <SidebarMenuItem className="mb-4">
              <Link href="/home" className="flex items-center gap-3 w-full p-2 text-slate-400 hover:text-white transition-colors">
                <LuArrowLeft className="text-xl" />
                <span className="font-inter font-medium text-sm">Back to Main</span>
              </Link>
            </SidebarMenuItem>

            <div className="h-[1px] bg-slate-800 mx-2 mb-4"></div>

            {/* Home */}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${pathname === `/farm/${farmId}`
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href={`/farm/${farmId}`} className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuLayoutDashboard className="text-xl" />
                  Home
                </p>
              </Link>
            </SidebarMenuItem>

            {/* Disease Detection */}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${pathname === `/farm/${farmId}/disease`
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href={`/farm/${farmId}/disease`} className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuActivity className="text-xl" />
                  Disease Detection
                </p>
              </Link>
            </SidebarMenuItem>

            {/* Road Map */}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${pathname === `/farm/${farmId}/roadmap`
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href={`/farm/${farmId}/roadmap`} className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuMapPin className="text-xl" />
                  Road Map
                </p>
              </Link>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
