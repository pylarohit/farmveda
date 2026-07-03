"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { LuLayoutDashboard, LuActivity, LuMapPin, LuArrowLeft, LuBot, LuChevronsDownUp, LuArrowUpRight, LuSettings, LuLogOut, LuLoader, LuCreditCard, LuCloudSunRain, LuCalendar, LuTrash2 } from "react-icons/lu";
import { Highlighter } from "@/components/ui/highlighter";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserData } from "@/context/UserDataProvider";
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
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import { Stars } from "lucide-react";

export function FarmSidebar({ farmId }: { farmId: string }) {
  const pathname = usePathname();
  const { user, loading } = useUserData();
  const supabase = createClient();
  const router = useRouter();
  const [signoutLoading, setSignoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [navigatingMain, setNavigatingMain] = useState(false);

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

  async function deleteFarm() {
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from("farms")
        .delete()
        .eq("id", farmId);

      if (error) throw error;
      
      toast.success("Farm deleted successfully");
      router.push("/home");
      window.dispatchEvent(new Event('farmAdded'));
    } catch (error: any) {
      console.error("Error deleting farm:", error);
      toast.error(error.message || "Failed to delete farm");
    } finally {
      setDeleteLoading(false);
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
              <div 
                onClick={() => {
                  setNavigatingMain(true);
                  setTimeout(() => router.push("/home"), 600);
                }}
                className={`flex items-center gap-3 w-full p-2 rounded-md cursor-pointer transition-all duration-300 relative overflow-hidden ${
                  navigatingMain 
                    ? "bg-blue-600/20 text-blue-400" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {navigatingMain && (
                  <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                )}
                {navigatingMain ? (
                  <LuLoader className="text-xl animate-spin relative z-10" />
                ) : (
                  <LuArrowLeft className="text-xl relative z-10" />
                )}
                <span className="font-inter font-medium text-sm relative z-10">
                  {navigatingMain ? "Returning..." : "Back to Main"}
                </span>
              </div>
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
                  Dashboard
                </p>
              </Link>
            </SidebarMenuItem>

            {/*Calender*/}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${pathname === `/farm/${farmId}/calender`
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href={`/farm/${farmId}/calender`} className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuCalendar className="text-xl" />
                  Calender
                </p>
              </Link>
            </SidebarMenuItem>

            {/* ──── AI Tools Divider ──── */}
            <div className="pt-2 px-1">
              <div className="flex items-center justify-center gap-3 mb-4 mt-2 select-none">
                <div className="h-[1px] bg-slate-800/80 flex-1" />
                <span className="text-[12px] font-bold text-slate-400 font-inter tracking-wider">
                  AI Tools
                </span>
                <div className="h-[1px] bg-slate-800/80 flex-1" />
              </div>
            </div>

            {/* Ai Assistant */}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${pathname === `/farm/${farmId}/ai-assistant`
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href={`/farm/${farmId}/ai-assistant`} className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuBot className="text-xl" />
                  Ai Assistant
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

            {/*Disease Detection*/}
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

            {/*Weather*/}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${pathname === `/farm/${farmId}/weather`
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href={`/farm/${farmId}/weather`} className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuCloudSunRain className="text-xl" />
                  Weather
                </p>
              </Link>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-1 overflow-hidden bg-[#0A0E1A]">
        {loading ? (
          <div></div>
        ) : (
          <div className="flex flex-col gap-2 mb-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-between bg-red-500/5 hover:bg-red-500/15 text-red-500 hover:text-red-600 border border-red-500/20 hover:border-red-500/30 rounded-lg transition-all duration-300 font-inter font-medium py-5 px-4 group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-red-500/10 rounded-md group-hover:bg-red-500/20 transition-colors">
                      <LuTrash2 className="h-4 w-4" />
                    </div>
                    <span>Delete Farm</span>
                  </div>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white text-slate-900">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-semibold font-inter text-xl">
                    Delete Farm
                  </AlertDialogTitle>
                  <AlertDialogDescription className="font-inter text-muted-foreground tracking-tight text-base">
                    Are you sure you want to delete this farm? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-inter cursor-pointer border border-slate-200">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 text-white hover:bg-red-700 font-inter cursor-pointer"
                    onClick={deleteFarm}
                  >
                    {deleteLoading ? (
                      <>
                        <LuLoader className="animate-spin mr-2 inline" />
                        <span>Deleting..</span>
                      </>
                    ) : (
                      <>
                        <LuTrash2 className="mr-2 inline" />
                        <span>Delete</span>
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
