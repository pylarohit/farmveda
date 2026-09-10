"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  FileText,
  Truck,
  Layers,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { VendorAuthService, VendorUser } from "@/lib/vendorAuth";
import { toast } from "react-hot-toast";

function VendorLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectCropId = searchParams.get("cropId");
  const returnTo = searchParams.get("returnTo") || "/vendor";

  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [loading, setLoading] = useState(false);

  // Sign In State
  const [signinIdentifier, setSigninIdentifier] = useState("");

  // Register State
  const [regCompany, setRegCompany] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBusinessType, setRegBusinessType] = useState<VendorUser["businessType"]>("wholesaler");
  const [regAddress, setRegAddress] = useState("");
  const [regGstin, setRegGstin] = useState("");

  // Check if already logged in as vendor
  useEffect(() => {
    const activeVendor = VendorAuthService.getVendorSession();
    if (activeVendor) {
      toast.success(`Welcome back, ${activeVendor.company || activeVendor.name}!`);
      router.replace(returnTo);
    }
  }, [router, returnTo]);

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signinIdentifier.trim()) {
      toast.error("Please enter your registered business email or phone number.");
      return;
    }

    setLoading(true);
    try {
      const vendor = await VendorAuthService.login(signinIdentifier.trim());
      toast.success(`Welcome back, ${vendor.name} (${vendor.company})!`);
      if (redirectCropId) {
        router.push(`/vendor?cropId=${redirectCropId}`);
      } else {
        router.push(returnTo);
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to sign in. Please check your credentials or register.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regCompany.trim()) {
      toast.error("Please provide your Enterprise / Company name.");
      return;
    }
    if (!regName.trim()) {
      toast.error("Please enter the Authorized Procurement Officer name.");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      toast.error("Please provide a valid corporate/business email.");
      return;
    }
    if (!regPhone.trim()) {
      toast.error("Please enter an active contact phone number.");
      return;
    }
    if (!regAddress.trim()) {
      toast.error("Please enter your receiving warehouse or depot address.");
      return;
    }

    setLoading(true);
    try {
      const newVendor = await VendorAuthService.register({
        company: regCompany.trim(),
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        businessType: regBusinessType,
        deliveryAddress: regAddress.trim(),
        gstin: regGstin.trim() || undefined,
      });

      toast.success(`Vendor Enterprise Account verified for ${newVendor.company}!`);
      if (redirectCropId) {
        router.push(`/vendor?cropId=${redirectCropId}`);
      } else {
        router.push(returnTo);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create vendor account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A482A]/5 via-white to-emerald-50/20 py-8 px-4 sm:px-6 lg:px-8 font-inter">
      {/* Top Header Bar */}
      <div className="max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-emerald-900/10 mb-8">
        <Link href="/vendor" className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0A482A] transition-colors">
          <ArrowLeft size={16} />
          <span>Back to Wholesale Marketplace</span>
        </Link>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Not a wholesale buyer?</span>
          <Link
            href="/home/sell-crops"
            className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline"
          >
            Farmer Sell Hub &rarr;
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: B2B Procurement Trust Value Proposition */}
        <div className="lg:col-span-5 space-y-6 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="relative h-12 w-12 rounded-2xl bg-[#0A482A] flex items-center justify-center shadow-md">
              <Image
                src="/logo-bg.png"
                alt="Farmveda"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black font-raleway text-[#0A482A] leading-tight tracking-tight">
                Farmveda B2B
              </h1>
              <p className="text-[11px] font-bold tracking-wider uppercase text-emerald-700">
                Direct Farm Sourcing Portal
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sora leading-snug">
              Procure wholesale harvests directly from verified Indian farmers.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Designed exclusively for supermarkets, retail chains, food manufacturers, and bulk traders. Transparent mandi pricing, escrow payment protection, and verified farm quality.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-emerald-900/10 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-sora">Bank-Grade Escrow Guarantee</h4>
                <p className="text-[11px] text-slate-500">Funds are held safely in escrow and released to the farmer only upon digital weighbridge & quality verification.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-emerald-900/10 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <Truck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-sora">Farm-Gate Direct Logistics</h4>
                <p className="text-[11px] text-slate-500">Consignment tracking from the farm field to your central processing warehouse or APMC yard.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-emerald-900/10 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-sora">GST & E-Way Compliant</h4>
                <p className="text-[11px] text-slate-500">Automated commercial invoices and APMC mandi tax documentation generated on every procurement.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In / Register Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-xl relative">
          {/* Card Header & Tabs */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Buyer Authentication
              </span>
              <h3 className="text-xl font-black text-slate-900 font-sora mt-2">
                {activeTab === "signin" ? "Sign In to Sourcing Portal" : "Register Wholesale Buyer Account"}
              </h3>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mt-5 select-none">
            <button
              type="button"
              onClick={() => setActiveTab("signin")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "signin"
                  ? "bg-white text-slate-900 shadow-xs font-sora"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Registered Buyer Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-white text-slate-900 shadow-xs font-sora"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              New Enterprise Registration
            </button>
          </div>

          {/* TAB 1: SIGN IN FORM */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Mail size={13} className="text-emerald-700" />
                  <span>Business Email or Registered Mobile</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. procurement@bigbasket.com or +91 98200 12345"
                    value={signinIdentifier}
                    onChange={(e) => setSigninIdentifier(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs font-medium text-slate-900 transition-all outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter the email or phone number associated with your procurement enterprise.
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-[11px] text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1 text-emerald-900">
                  <CheckCircle2 size={13} className="text-emerald-700" />
                  <span>Instant Verification Active</span>
                </p>
                <p className="text-emerald-900/80">
                  Wholesale buyer profiles are authenticated instantly without requiring farmer credentials or farmer onboarding.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#0A482A] hover:bg-[#083820] active:scale-[0.99] disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 font-sora"
              >
                <Lock size={15} className="text-emerald-300" />
                <span>{loading ? "Authenticating..." : "Sign In & Access Wholesale Portal"}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Building size={13} className="text-emerald-700" />
                  <span>Company / Enterprise Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Agri Supermarkets Ltd"
                  value={regCompany}
                  onChange={(e) => setRegCompany(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Procurement Officer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Business Type *
                  </label>
                  <select
                    value={regBusinessType}
                    onChange={(e) => setRegBusinessType(e.target.value as VendorUser["businessType"])}
                    className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="wholesaler">Wholesaler / Bulk Trader</option>
                    <option value="supermarket">Supermarket / Retail Chain</option>
                    <option value="food_brand">Food Processor / FMCG Brand</option>
                    <option value="exporter">Agro Exporter</option>
                    <option value="retailer">Independent Agro Retailer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail size={12} className="text-emerald-700" />
                    <span>Business Email *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="procurement@enterprise.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone size={12} className="text-emerald-700" />
                    <span>Contact Phone *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-700" />
                  <span>Central Receiving Warehouse / APMC Delivery Address *</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Plot 44, APMC Commercial Logistics Yard, Sector 19, Vashi, Navi Mumbai 400703"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs font-medium text-slate-900 outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  GSTIN / Tax Identification (Optional)
                </label>
                <input
                  type="text"
                  placeholder="27AAACH7409R1ZZ"
                  value={regGstin}
                  onChange={(e) => setRegGstin(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl text-xs font-medium text-slate-900 outline-none uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#0A482A] hover:bg-[#083820] active:scale-[0.99] disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 font-sora mt-2"
              >
                <ShieldCheck size={16} className="text-emerald-300" />
                <span>{loading ? "Registering Enterprise..." : "Register Wholesale Buyer Account"}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Bottom Switch Tab info */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            {activeTab === "signin" ? (
              <p className="text-xs text-slate-500">
                New buyer on Farmveda?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="font-bold text-[#0A482A] hover:underline cursor-pointer"
                >
                  Register Wholesale Account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signin")}
                  className="font-bold text-[#0A482A] hover:underline cursor-pointer"
                >
                  Sign in with Email or Phone
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FBFDFB]">
        <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VendorLoginContent />
    </Suspense>
  );
}
