"use client";

import { ReactNode, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  ArrowLeft,
  ShoppingBag,
  Bell,
  Search,
  CheckCircle2,
  FileText,
  User,
  ShieldCheck,
  Building,
  HelpCircle,
  Lock,
  LogOut,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { CropMarketplaceService, VendorOrder } from "@/lib/cropMarketplace";
import { VendorAuthService, VendorUser } from "@/lib/vendorAuth";
import { toast } from "react-hot-toast";

export default function VendorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorUser | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);

  useEffect(() => {
    // Initial sync of vendor session and orders
    setVendor(VendorAuthService.getVendorSession());

    async function fetchOrders() {
      const ords = await CropMarketplaceService.getOrders();
      setOrders(ords);
    }
    fetchOrders();

    // Real-time listener for marketplace updates
    const handleMarketplaceUpdate = () => {
      fetchOrders();
    };

    // Real-time listener for vendor authentication state updates
    const handleVendorAuthUpdate = () => {
      setVendor(VendorAuthService.getVendorSession());
    };

    window.addEventListener("cropMarketplaceChanged", handleMarketplaceUpdate);
    window.addEventListener("vendorAuthChanged", handleVendorAuthUpdate);
    window.addEventListener("storage", handleVendorAuthUpdate);

    return () => {
      window.removeEventListener("cropMarketplaceChanged", handleMarketplaceUpdate);
      window.removeEventListener("vendorAuthChanged", handleVendorAuthUpdate);
      window.removeEventListener("storage", handleVendorAuthUpdate);
    };
  }, []);

  const handleSignOut = () => {
    try {
      VendorAuthService.logout();
      setVendor(null);
      toast.success("Vendor signed out successfully");
      router.refresh();
    } catch {
      toast.error("Error signing out");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFDFB] flex flex-col font-inter text-slate-800 antialiased">
      {/* ─── Top Vendor Navigation Bar ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs">
        {/* Top Micro-Bar */}
        <div className="bg-[#0A482A] text-white text-[11px] font-semibold py-1.5 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase">
              B2B Wholesale Portal
            </span>
            <span>Direct Farm Sourcing for Supermarkets, Wholesalers & Exporters</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="text-emerald-200 hover:text-white flex items-center gap-1 transition-colors text-xs font-bold"
            >
              <ArrowLeft size={13} />
              <span>Go to Farmer Portal</span>
            </Link>
          </div>
        </div>

        {/* Guest Warning Banner if not logged in as vendor */}
        {!vendor && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-b border-amber-500/25 px-4 sm:px-8 py-2 text-xs text-amber-950 font-medium">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-700 shrink-0" />
                <span>
                  <strong>Wholesale Guest Mode:</strong> Sign in with your business credentials to lock farm-gate rates and procure crops.
                </span>
              </div>
              <Link
                href="/vendor/login"
                className="font-bold text-emerald-900 hover:text-emerald-950 bg-white border border-amber-300 px-3 py-1 rounded-lg text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1"
              >
                <span>Wholesale Sign In / Register</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Link href="/vendor" className="flex items-center gap-2.5">
              <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-emerald-700 flex items-center justify-center shadow-sm">
                <Image
                  src="/logo-bg.png"
                  alt="Farmveda"
                  width={38}
                  height={38}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-2xl font-raleway text-[#0A482A] tracking-tight leading-none">
                  Farmveda
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mt-0.5">
                  Wholesale Buyer Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search grains, pulses, flours, cold-pressed oils, spices..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all font-medium"
            />
          </div>

          {/* Right Action Icons & Badges */}
          <div className="flex items-center gap-3">
            <Link
              href="/vendor#procurements"
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100/80 text-[#0A482A] border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <ShoppingBag size={16} className="text-emerald-700" />
              <span className="hidden sm:inline">My Orders</span>
              {orders.length > 0 && (
                <span className="bg-[#0A482A] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {orders.length}
                </span>
              )}
            </Link>

            <Link
              href="/home/sell-crops"
              className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl transition-all"
            >
              <span>Farmer Sell Hub</span>
            </Link>

            {/* Vendor Profile Badge / Sign In CTA */}
            {vendor ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="h-9 w-9 rounded-full bg-[#0A482A] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {vendor.name?.[0]?.toUpperCase() || vendor.company?.[0]?.toUpperCase() || "B"}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 leading-tight max-w-[140px] truncate">
                    {vendor.company || vendor.name}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-600 inline" /> Verified Buyer
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out of Buyer Portal"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  href="/vendor/login"
                  className="bg-[#0A482A] hover:bg-[#083820] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all hover:scale-102 cursor-pointer flex items-center gap-1.5"
                >
                  <Lock size={13} className="text-emerald-300" />
                  <span>Buyer Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-center text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-700">
          Farmveda B2B Wholesale Commerce &bull; Dedicated Buyer Sourcing Platform
        </p>
        <p>
          Enabling wholesale buyers, supermarkets, and food processors to source directly from verified Indian farmers with escrow security.
        </p>
      </footer>
    </div>
  );
}
