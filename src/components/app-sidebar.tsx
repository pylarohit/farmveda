"use client";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useUserData } from "@/context/UserDataProvider";
import Image from "next/image";
import {
  LuArrowUpRight,
  LuBrain,
  LuCalendar,
  LuChevronDown,
  LuChevronsDownUp,
  LuCreditCard,
  LuHistory,
  LuLayoutDashboard,
  LuLoader,
  LuLogOut,
  LuMessageCircle,
  LuMessageSquare,
  LuSettings,
  LuShapes,
  LuSun,
  LuTelescope,
  LuUsers,
  LuWallet,
} from "react-icons/lu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Sparkle, Stars } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import Link from "next/link";
import { LuChartNoAxesColumn } from "react-icons/lu";

export function AppSidebar() {
  const { user, loading } = useUserData();
  const supabase = createClient();
  const router = useRouter();
  const [signoutLoading, setSignoutLoading] = useState(false);
  const pathname = usePathname();

  async function signOut() {
    setSignoutLoading(true);
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setSignoutLoading(false);
    }
  }







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
        <div className="flex items-center text-gray-300 text-sm font-sora gap-3 justify-center mt-2">
          <span>Learn</span>.<span>Grow</span>.<span>Earn</span>
        </div>

        <Separator className="mt-3 mb-1 bg-slate-800" />
      </SidebarHeader>
      





      <SidebarContent className="bg-[#0A0E1A]">
        <SidebarGroup>
          <SidebarMenu className="p-2 space-y-2.5">
            {/* HOME */}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${
              pathname === "/home"
                ? "bg-blue-600 scale-105 hover:bg-white/10"
                : "hover:bg-white/10 hover:scale-105"
            }`}
            >
              <Link href="/home" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuLayoutDashboard className="text-xl" />
                  Home
                </p>
              </Link>
            </SidebarMenuItem>


        
            {/* Mentor Connect */}
            <SidebarMenuItem
              className={`flex cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-2 py-1  ${
                pathname === "/home/mentor-connect"
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
              }`}
            >
              <Link href="/home/loans" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuCreditCard className="text-xl" />
                  Loans
                </p>
              </Link>
            </SidebarMenuItem>




            {/* Career board */}
            <SidebarMenuItem
              className={`flex hover:bg-white/10 cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-2 py-1  ${
                pathname === "/home/market-place"
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
              }`}
            >
              <Link href="/home/market-place" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuChartNoAxesColumn className="text-xl" />
                  Market Place
                </p>
              </Link>
            </SidebarMenuItem>



            {/* MY TRACKS */}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${
              pathname.startsWith("/home/farmer-connect")
                ? "bg-blue-600 scale-105 hover:bg-white/10"
                : "hover:bg-white/10 hover:scale-105"
            }`}
            >
              <Link href="/home/farmer-connect" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuTelescope className="text-xl" />
                  Farmer Connect
                </p>
              </Link>
            </SidebarMenuItem>



           
            {/* MESSAGES */}
            <SidebarMenuItem
              className={`flex hover:bg-white/10 cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-2 py-1  ${
                pathname === "/home/messages"
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
              }`}
            >
              <Link href="/home/messages" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuMessageSquare className="text-xl" />
                  Messages
                </p>
              </Link>
            </SidebarMenuItem>
            
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-1 overflow-hidden bg-[#0A0E1A]">
        <div className="mb-4 mt-1 bg-gradient-to-br from-white via-[#DCE7FF] to-[#C1D9FF] w-[96%] mx-auto h-[120px] rounded-lg px-3 py-3 text-slate-900 shadow-md">
          <div className="flex items-center gap-3">
            <LuWallet className="text-2xl text-blue-600" />
            <h2 className="font-raleway font-semibold text-base">Credits</h2>
          </div>
          <div className="flex justify-between">
            <div className="flex flex-col items-center justify-start mt-2">
              <p className="text-center font-sora font-bold text-2xl tracking-tight">
                {user?.remainingCredits ?? 100}
              </p>
              <button className="text-xs tracking-tight font-inter cursor-pointer text-blue-600 bg-white/60 hover:bg-white/80 px-2 py-1 rounded-sm flex items-center gap-2 mt-3">
                Top Up <Sparkle size={14} />
              </button>
            </div>
            <Image
              src="/card2.png"
              alt="logo"
              width={90}
              height={90}
              className="object-contain -mt-4 -rotate-12"
            />
          </div>
        </div>
        {loading ? (
          <div></div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <div className="bg-gray-50 py-2 px-2 flex items-center justify-between w-full rounded-md overflow-hidden cursor-pointer text-slate-900">
                <Image
                  src={user?.avatar || "/user.png"}
                  alt="logo"
                  width={46}
                  height={46}
                  className="rounded-full"
                />
                <div className="flex flex-col">
                  <p className="text-base font-inter tracking-tight text-black font-semibold">
                    {user?.userName || "Rohit Pyla"}
                  </p>
                  <p className="text-gray-800 max-w-[130px] truncate text-sm font-inter">
                    {user?.userEmail || "pylarohit123@gmail.com"}
                  </p>
                </div>
                <LuChevronsDownUp className="text-2xl cursor-pointer text-black" />
              </div>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-0 rounded-xl shadow-lg mb-2 absolute left-[122px] bottom-8 overflow-hidden z-50">
              <div className="flex items-center gap-4 bg-blue-100/90 p-3 font-inter overflow-hidden text-slate-900">
                <Image
                  src={user?.avatar || "/user.png"}
                  alt="User Avatar"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">{user?.userName || "Rohit Pyla"}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {user?.userEmail || "pylarohit123@gmail.com"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-0 text-slate-900 bg-white">
                <Button
                  variant="ghost"
                  className="justify-start gap-2 w-full font-roboto hover:bg-gray-50 rounded-none cursor-pointer text-slate-700"
                >
                  <LuArrowUpRight className="text-[18px]" />
                  Upgrade to Pro
                </Button>

                <Separator />

                <Button
                  variant="ghost"
                  onClick={() => router.push("/home/profile")}
                  className="justify-between w-full font-roboto hover:bg-gray-50 rounded-none cursor-pointer text-slate-700"
                >
                  <div className="flex gap-2 items-center">
                    <LuSettings className="text-[18px]" />
                    Profile
                  </div>
                  <kbd className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                    Ctrl+Alt+P
                  </kbd>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => router.push("/home/settings/billing")}
                  className="justify-start gap-2 w-full font-roboto hover:bg-gray-50 rounded-none cursor-pointer text-slate-700"
                >
                  <LuCreditCard className="text-[18px]" />
                  Billing
                </Button>

                <Button
                  variant="ghost"
                  className="justify-between w-full font-roboto hover:bg-gray-50 rounded-none cursor-pointer text-slate-700"
                >
                  <div className="flex gap-2 items-center">
                    <Stars className="text-[18px]" />
                    Ai Assistant
                  </div>
                  <kbd className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                    Ctrl+Alt+D
                  </kbd>
                </Button>

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="justify-between text-red-600 hover:text-red-700 w-full font-roboto hover:bg-gray-50 rounded-none cursor-pointer"
                    >
                      <div className="flex gap-2 items-center font-inter">
                        <LuLogOut className="text-[18px]" />
                        Logout
                      </div>
                      <kbd className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                        Ctrl+Alt+L
                      </kbd>
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent className="bg-white text-slate-900">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-semibold font-inter text-xl">
                        Are you sure you want to logout?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="font-inter text-muted-foreground tracking-tight text-base">
                        This will end your session and you&apos;ll need to sign
                        in again. Despite you can simply close the tab.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-inter cursor-pointer border border-slate-200">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-blue-500 text-white hover:bg-blue-700 font-inter cursor-pointer"
                        onClick={signOut}
                      >
                        {signoutLoading ? (
                          <>
                            <LuLoader className="animate-spin mr-2 inline" />
                            <span>Signing Out..</span>
                          </>
                        ) : (
                          <>
                            <LuLogOut className="mr-2 inline" />
                            <span>Logout</span>
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
