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
  LuFolder,
  LuLayers,
  LuShoppingCart,
  LuCalculator,
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
import { useState, useEffect } from "react";
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
import { Highlighter } from "@/components/ui/highlighter";

export function AppSidebar() {
  const { user, loading, unreadMessages } = useUserData();
  const supabase = createClient();
  const router = useRouter();
  const [signoutLoading, setSignoutLoading] = useState(false);
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<"my-farms" | "shared-farms">("my-farms");
  const [isFarmSpaceOpen, setIsFarmSpaceOpen] = useState(true);

  interface Farm {
    id: string;
    name?: string;
    field_name?: string;
    crop_type?: string;
    area?: string;
    location?: string;
  }
  const [farms, setFarms] = useState<Farm[]>([]);

  useEffect(() => {
    async function loadFarms() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("farms")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;
        if (data) {
          setFarms(data);
        }
      } catch (err) {
        const local = localStorage.getItem(`farms_${user.id}`);
        if (local) {
          setFarms(JSON.parse(local));
        } else {
          const defaultFarms = [
            {
              id: "1",
              name: "Paddy Field A",
              crop_type: "Rice",
              area: "2.5 Acres",
              location: "Guntur",
            }
          ];
          setFarms(defaultFarms);
          localStorage.setItem(`farms_${user.id}`, JSON.stringify(defaultFarms));
        }
      }
    }
    loadFarms();

    const handleFarmAdded = () => {
      loadFarms();
    };
    window.addEventListener('farmAdded', handleFarmAdded);

    return () => {
      window.removeEventListener('farmAdded', handleFarmAdded);
    };
  }, [user, supabase]);

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


        <div className="flex items-center justify-center mt-2.5 text-gray-300 text-sm font-sora font-semibold select-none">
          <span>From&nbsp;</span>
          <Highlighter action="underline" color="#f97316" padding={2} strokeWidth={2}>
            <span className="text-gray-200">planning</span>
          </Highlighter>
          <span>&nbsp;to&nbsp;</span>
          <Highlighter action="highlight" color="rgba(56, 189, 248, 0.35)" padding={3}>
            <span className="text-white px-0.5">harvest</span>
          </Highlighter>
        </div>

        {/* Removed Separator to fix gap */}
      </SidebarHeader>

      <SidebarContent className="bg-[#0A0E1A] overflow-y-auto scrollbar-none">
        <SidebarGroup className="pt-4 mt-0">
          <SidebarMenu className="px-2 pb-2 space-y-1">
            {/* Dashboard */}
            <SidebarMenuItem
              className={`flex cursor-pointer duration-200 ease-in-out rounded py-1 px-3
            ${pathname === "/home"
                  ? "bg-blue-600 scale-105 hover:bg-white/10"
                  : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href="/home" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuLayoutDashboard className="text-xl" />
                  Dashboard
                </p>
              </Link>
            </SidebarMenuItem>

            {/* Community */}
            <SidebarMenuItem
              className={`flex cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-3 py-1 justify-between items-center ${pathname === "/home/community"
                ? "bg-blue-600 scale-105 hover:bg-white/10"
                : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href="/home/community" className="w-full flex items-center justify-between">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuUsers className="text-xl" />
                  Community
                </p>
                <span className="text-[10px] font-bold font-inter bg-white text-slate-900 px-2 py-0.5 rounded-full shadow-sm">
                  Soon
                </span>
              </Link>
            </SidebarMenuItem>

            {/* Messages */}
            <SidebarMenuItem
              className={`flex cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-3 py-1 ${pathname === "/home/message"
                ? "bg-blue-600 scale-105 hover:bg-white/10"
                : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href="/home/message" className="w-full flex items-center justify-between">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuMessageSquare className="text-xl" />
                  Messages
                </p>
                {unreadMessages > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            </SidebarMenuItem>

            {/* ──── Farm Space Dropdown Button & List ──── */}
            <div className="pt-2 px-1">
              <div className="flex items-center justify-center gap-3 mb-4 mt-2 select-none">
                <div className="h-[1px] bg-slate-800/80 flex-1" />
                <span className="text-[12px] font-bold text-slate-400 font-inter tracking-wider">
                  My Farm Space
                </span>
                <div className="h-[1px] bg-slate-800/80 flex-1" />
              </div>

              <button
                type="button"
                onClick={() => setIsFarmSpaceOpen(!isFarmSpaceOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all cursor-pointer font-bold text-sm shadow-md font-inter"
              >
                <div className="flex items-center gap-2.5">
                  <LuLayers className="text-white text-base" />
                  <span>Farm Space</span>
                </div>
                <LuChevronDown
                  className={`text-white text-sm transition-transform duration-200 ${isFarmSpaceOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {isFarmSpaceOpen && (
                <div className="mt-2.5 ml-4 pl-3.5 border-l border-slate-800 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                  {farms.length > 0 ? (
                    farms.map((farm) => (
                      <div
                        key={farm.id}
                        className="flex items-center justify-between py-2 px-3.5 rounded-full transition-all group cursor-pointer hover:bg-white hover:text-slate-950 text-slate-300 font-inter animate-in fade-in duration-200"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <LuFolder className="text-slate-400 text-base flex-shrink-0 group-hover:text-slate-950 transition-colors" />
                          <span className="text-sm font-semibold truncate">
                            {farm.name || (farm.field_name ? (farm.field_name.includes("|||") ? farm.field_name.split("|||")[0] : farm.field_name) : "Unnamed Farm")}
                          </span>
                        </div>
                        <Image
                          src={user?.avatar || "/user.png"}
                          alt="owner"
                          width={18}
                          height={18}
                          className="rounded-full flex-shrink-0 border border-slate-850"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-1 pl-3 font-inter">No farms registered.</p>
                  )}

                  {/* Create New Option */}
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('openAddFarmWizard'))}
                    className="w-full flex items-center gap-2.5 py-2 px-3.5 rounded-full hover:bg-white hover:text-slate-950 text-slate-400 hover:font-bold transition-all cursor-pointer text-xs font-semibold font-inter text-left group"
                  >
                    <LuLayers className="text-slate-400 group-hover:text-slate-950 text-sm transition-colors" />
                    <span>Create New...</span>
                  </button>
                </div>
              )}
            </div>

            {/* ──── Services Divider ──── */}
            <div className="pt-2 px-1">
              <div className="flex items-center justify-center gap-3 mb-4 mt-2 select-none">
                <div className="h-[1px] bg-slate-800/80 flex-1" />
                <span className="text-[12px] font-bold text-slate-400 font-inter tracking-wider">
                  Services
                </span>
                <div className="h-[1px] bg-slate-800/80 flex-1" />
              </div>
            </div>


            {/* Budget Planner */}
            <SidebarMenuItem
              className={`flex cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-3 py-1  ${pathname === "/home/budget"
                ? "bg-blue-600 scale-105 hover:bg-white/10"
                : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href="/home/budget" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuCalculator className="text-xl" />
                  Budget Planner
                </p>
              </Link>
            </SidebarMenuItem>

            {/* Loans */}
            <SidebarMenuItem
              className={`flex cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-3 py-1  ${pathname === "/home/loans"
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

            {/* Rent & Hire */}
            <SidebarMenuItem
              className={`flex cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-3 py-1 ${pathname === "/home/rent-hire"
                ? "bg-blue-600 scale-105 hover:bg-white/10"
                : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href="/home/rent-hire" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuCalendar className="text-xl" />
                  Rent & Hire
                </p>
              </Link>
            </SidebarMenuItem>

            {/* Sell Crops */}
            <SidebarMenuItem
              className={`flex cursor-pointer hover:scale-105 duration-200 ease-in-out rounded px-3 py-1 ${pathname === "/home/sell-crops"
                ? "bg-blue-600 scale-105 hover:bg-white/10"
                : "hover:bg-white/10 hover:scale-105"
                }`}
            >
              <Link href="/home/sell-crops" className="w-full">
                <p className="flex items-center gap-3 font-medium font-inter text-base text-white tracking-wide">
                  <LuShoppingCart className="text-xl" />
                  Sell Crops
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
