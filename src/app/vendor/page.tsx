"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Star,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Gift,
  Check,
  Building,
  MapPin,
  Truck,
  IndianRupee,
  ShoppingBag,
  ShieldCheck,
  Clock,
  Sparkles,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Phone,
  ArrowLeft,
  ArrowRight,
  Lock,
  ShieldAlert,
  BadgeCheck,
  FileText
} from "lucide-react";
import {
  CropListing,
  VendorOrder,
  CropMarketplaceService
} from "@/lib/cropMarketplace";
import { VendorAuthService, VendorUser } from "@/lib/vendorAuth";
import { toast } from "react-hot-toast";

// ── Top Category Bar Items matching the reference screenshot ──
const TOP_CATEGORIES = [
  { id: "all", name: "Shop All", icon: "all" },
  { id: "Staples", name: "Staples", icon: "🌾" },
  { id: "Spices & Masala", name: "Spices & Masala", icon: "🌶️" },
  { id: "Cold Pressed Oils", name: "Cold Pressed Oils", icon: "🫒" },
  { id: "Chocolates", name: "Chocolates", icon: "🍫" },
  { id: "Fresh Fruits", name: "Fresh Fruits", icon: "🍇" },
  { id: "Flour", name: "Flour", icon: "🥣" },
];

// ── Sidebar Category Checkboxes matching the reference screenshot ──
const SIDEBAR_CATEGORIES = [
  "Chana Dal",
  "Chikki",
  "Chocolates",
  "Chutney Powders",
  "Dosa Mixs",
  "Flour",
  "Fresh Fruits",
  "Honey",
  "Idli Mixes",
  "Cold Pressed Oils",
  "Spices & Masala",
  "Staples"
];

export default function VendorDashboardPage() {
  const [vendor, setVendor] = useState<VendorUser | null>(null);
  const router = useRouter();
  const [listings, setListings] = useState<CropListing[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedTopCategory, setSelectedTopCategory] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high" | "rating">("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(true);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);

  // Active View Tab: "marketplace" or "orders"
  const [activeView, setActiveView] = useState<"marketplace" | "orders">("marketplace");

  // Authentication Required Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<CropListing | null>(null);
  const [quickEmail, setQuickEmail] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickCompany, setQuickCompany] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Procurement Modal State (Real Buyer Data)
  const [selectedCrop, setSelectedCrop] = useState<CropListing | null>(null);
  const [orderQty, setOrderQty] = useState<number>(1);
  const [vendorCompany, setVendorCompany] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  const loadData = async () => {
    try {
      const [fetchedListings, fetchedOrders] = await Promise.all([
        CropMarketplaceService.getListings(),
        CropMarketplaceService.getOrders()
      ]);
      setListings(fetchedListings);
      setOrders(fetchedOrders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Initial vendor sync
    const currentVendor = VendorAuthService.getVendorSession();
    setVendor(currentVendor);
    if (currentVendor) {
      setVendorName(currentVendor.name || "");
      setVendorCompany(currentVendor.company || "");
      setVendorPhone(currentVendor.phone || "");
      setDeliveryAddress(currentVendor.deliveryAddress || "");
    }

    // Listen to real-time sync events from farmer activities
    const handleMarketplaceUpdate = () => {
      loadData();
    };

    // Listen to vendor auth changes
    const handleVendorAuthUpdate = () => {
      const updatedVendor = VendorAuthService.getVendorSession();
      setVendor(updatedVendor);
      if (updatedVendor) {
        setVendorName(updatedVendor.name || "");
        setVendorCompany(updatedVendor.company || "");
        setVendorPhone(updatedVendor.phone || "");
        setDeliveryAddress(updatedVendor.deliveryAddress || "");
      }
    };

    window.addEventListener("cropMarketplaceChanged", handleMarketplaceUpdate);
    window.addEventListener("vendorAuthChanged", handleVendorAuthUpdate);
    window.addEventListener("storage", handleMarketplaceUpdate);
    window.addEventListener("storage", handleVendorAuthUpdate);

    return () => {
      window.removeEventListener("cropMarketplaceChanged", handleMarketplaceUpdate);
      window.removeEventListener("vendorAuthChanged", handleVendorAuthUpdate);
      window.removeEventListener("storage", handleMarketplaceUpdate);
      window.removeEventListener("storage", handleVendorAuthUpdate);
    };
  }, []);

  // Calculate real loyalty points from non-cancelled orders
  const earnedRewardPoints = useMemo(() => {
    return orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Math.floor(o.total_amount / 100), 0);
  }, [orders]);

  // Open Procurement Modal (Login Guard: Only vendors who log in can buy products)
  const handleOpenProcureModal = (crop: CropListing) => {
    if (!vendor) {
      setPendingCrop(crop);
      setShowAuthModal(true);
      return;
    }
    setSelectedCrop(crop);
    setOrderQty(crop.min_order_qty || 1);
    if (vendor.name) setVendorName(vendor.name);
    if (vendor.company) setVendorCompany(vendor.company);
    if (vendor.phone) setVendorPhone(vendor.phone);
    if (vendor.deliveryAddress) setDeliveryAddress(vendor.deliveryAddress);
  };

  // Quick Vendor Instant Sign-in from Modal
  const handleQuickVendorAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEmail.trim()) {
      toast.error("Please enter a valid business email or phone number.");
      return;
    }

    setIsAuthenticating(true);
    try {
      const authedVendor = await VendorAuthService.login(
        quickEmail.trim(),
        quickCompany.trim() || undefined,
        quickName.trim() || undefined
      );
      setVendor(authedVendor);
      toast.success(`Welcome, ${authedVendor.name} (${authedVendor.company})!`);
      setShowAuthModal(false);

      if (pendingCrop) {
        setSelectedCrop(pendingCrop);
        setOrderQty(pendingCrop.min_order_qty || 1);
        setVendorCompany(authedVendor.company);
        setVendorName(authedVendor.name);
        setVendorPhone(authedVendor.phone);
        setDeliveryAddress(authedVendor.deliveryAddress);
        setPendingCrop(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Sign-in failed. Opening Wholesale Login.");
      router.push("/vendor/login");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Submit Purchase Order
  const handleConfirmOrder = async () => {
    if (!selectedCrop) return;

    if (!vendorCompany.trim()) {
      toast.error("Please enter your Company / Wholesale Enterprise name.");
      return;
    }

    if (!vendorName.trim()) {
      toast.error("Please enter Contact Person Name.");
      return;
    }

    if (!vendorPhone.trim()) {
      toast.error("Please enter Contact Phone Number.");
      return;
    }

    if (!deliveryAddress.trim()) {
      toast.error("Please enter Destination Warehouse / Delivery Address.");
      return;
    }

    if (orderQty < selectedCrop.min_order_qty) {
      toast.error(`Minimum order quantity is ${selectedCrop.min_order_qty} ${selectedCrop.unit}`);
      return;
    }

    if (orderQty > selectedCrop.quantity_available) {
      toast.error(`Only ${selectedCrop.quantity_available} ${selectedCrop.unit} currently available in stock`);
      return;
    }

    setOrdering(true);
    try {
      const totalAmount = orderQty * selectedCrop.price_per_unit;
      const order = await CropMarketplaceService.placeOrder({
        crop_id: selectedCrop.id,
        crop_title: selectedCrop.title,
        farmer_id: selectedCrop.farmer_id,
        farmer_name: selectedCrop.farmer_name,
        farmer_phone: selectedCrop.farmer_phone,
        farmer_location: selectedCrop.farmer_location,
        vendor_id: vendor?.id || `vendor-${Date.now()}`,
        vendor_name: vendorName.trim(),
        vendor_company: vendorCompany.trim(),
        vendor_phone: vendorPhone.trim(),
        vendor_email: vendor?.email || "procurement@vendor.in",
        delivery_address: deliveryAddress.trim(),
        quantity: orderQty,
        unit: selectedCrop.unit,
        unit_price: selectedCrop.price_per_unit,
        total_amount: totalAmount,
        delivery_notes: deliveryNotes.trim(),
      });

      toast.success(
        `Purchase Order #${order.order_number} confirmed! Farmer received procurement dispatch request.`,
        { duration: 5000 }
      );
      setSelectedCrop(null);
      setDeliveryNotes("");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to place purchase order.");
    } finally {
      setOrdering(false);
    }
  };

  // Toggle category checkbox
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Filtered and Sorted Listings
  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        // Top category filter
        if (selectedTopCategory !== "all" && item.category !== selectedTopCategory) {
          return false;
        }

        // Sidebar category checklist filter
        if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
          return false;
        }

        // Organic filter
        if (organicOnly && !item.is_organic) {
          return false;
        }

        // Sale filter
        if (saleOnly && !item.is_sale) {
          return false;
        }

        // Search query
        if (
          searchQuery &&
          !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.category.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.farmer_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.farmer_location.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price_per_unit - b.price_per_unit;
        if (sortBy === "price-high") return b.price_per_unit - a.price_per_unit;
        if (sortBy === "rating") return b.rating - a.rating;
        return 0; // featured/default
      });
  }, [listings, selectedTopCategory, selectedCategories, organicOnly, saleOnly, searchQuery, sortBy]);

  return (
    <div className="space-y-8 relative">
      {/* ─── Top Switcher Strip ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("marketplace")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeView === "marketplace"
                ? "bg-[#0A482A] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag size={16} />
            <span>Marketplace Catalog</span>
          </button>

          <button
            onClick={() => setActiveView("orders")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeView === "orders"
                ? "bg-[#0A482A] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Truck size={16} />
            <span>My Procurements & Orders ({orders.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/home/sell-crops"
            className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
          >
            <span>👨‍🌾 Farmer Sell Portal</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {activeView === "marketplace" ? (
        <>
          {/* ─── B2B Enterprise Value Strip ─── */}
          <section className="bg-gradient-to-r from-[#0A482A] via-[#0E5834] to-[#0A482A] text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-800/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                <ShieldCheck size={24} className="text-emerald-300" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold font-sora text-white">
                  Farmveda Wholesale Mandi Direct
                </h2>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Direct farm-gate sourcing &bull; 0% Intermediary markups &bull; Escrow Payment Settlement
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold text-emerald-100/90">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                <BadgeCheck size={14} className="text-emerald-300" />
                <span>Moisture Lab Certified</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                <Truck size={14} className="text-emerald-300" />
                <span>Mandi Freight Fleet</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                <ShieldCheck size={14} className="text-emerald-300" />
                <span>100% Escrow Protection</span>
              </div>
            </div>
          </section>

          {/* Guest Procurement Notice */}
          {!vendor && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Lock size={18} className="text-amber-800" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-sora">
                    Guest Mode Active: Sign-in required for wholesale procurement
                  </h4>
                  <p className="text-[11px] text-amber-800/90">
                    You are previewing verified farm harvests and mandi rates. To place wholesale orders and issue legal escrow contracts, please sign in.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex-1 sm:flex-initial bg-[#0A482A] hover:bg-[#083820] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Lock size={13} className="text-emerald-300" />
                  <span>Sign In as Vendor</span>
                </button>
                <Link
                  href="/vendor/login"
                  className="flex-1 sm:flex-initial bg-white hover:bg-slate-50 text-slate-800 border border-amber-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 shrink-0"
                >
                  <span>Register</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* ─── 1. TOP CIRCULAR CATEGORIES SELECTOR (Matching User's Reference Image) ─── */}
          <section className="pt-2 pb-6">
            <div className="flex items-center justify-center gap-6 sm:gap-10 overflow-x-auto pb-4 custom-scrollbar select-none">
              {TOP_CATEGORIES.map((cat) => {
                const isActive = selectedTopCategory === cat.id;

                if (cat.id === "all") {
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedTopCategory("all");
                        setSelectedCategories([]);
                      }}
                      className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none shrink-0"
                    >
                      <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300 shadow-sm ${
                          isActive
                            ? "bg-[#96C03D] text-[#0A482A] ring-4 ring-[#96C03D]/30 scale-105"
                            : "bg-[#B5D86D]/80 text-[#0A482A] hover:bg-[#96C03D] hover:scale-105"
                        }`}
                      >
                        <span className="text-center font-bold text-sm sm:text-base leading-tight font-sora">
                          Shop<br />All
                        </span>
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-semibold tracking-wide transition-colors ${
                          isActive
                            ? "text-[#0A482A] font-extrabold border-b-2 border-[#0A482A] pb-0.5"
                            : "text-slate-600 group-hover:text-slate-900"
                        }`}
                      >
                        All Products
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedTopCategory(cat.id);
                      setSelectedCategories([]);
                    }}
                    className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none shrink-0"
                  >
                    <div
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-50 border-2 flex items-center justify-center text-3xl transition-all duration-300 shadow-xs group-hover:scale-105 ${
                        isActive
                          ? "border-[#0A482A] bg-emerald-50/70 ring-4 ring-emerald-600/20"
                          : "border-slate-200 group-hover:border-emerald-500"
                      }`}
                    >
                      <span>{cat.icon}</span>
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-semibold transition-colors ${
                        isActive
                          ? "text-[#0A482A] font-extrabold border-b-2 border-[#0A482A] pb-0.5"
                          : "text-slate-600 group-hover:text-slate-900"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ─── 2. MAIN CATALOG WITH FILTERS & CARDS ─── */}
          <div>
            {/* Header Title Row matching reference image */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-extrabold font-sora text-[#005A36] tracking-tight">
                {selectedTopCategory === "all" ? "All Products" : selectedTopCategory}
              </h1>

              {/* Right controls: items count, sort, view mode */}
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs font-semibold text-slate-500 font-inter">
                  {filteredListings.length} items
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-bold text-slate-700 cursor-pointer focus:outline-none pr-2"
                  >
                    <option value="featured">Featured v</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded cursor-pointer ${
                      viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded cursor-pointer ${
                      viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400"
                    }`}
                    title="List View"
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid: Left Filters Sidebar + Right Products */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              {/* Left Filters Sidebar matching screenshot */}
              <aside className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-bold text-slate-900 font-sora">Filters</h2>
                  {(selectedCategories.length > 0 || organicOnly || saleOnly || searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedCategories([]);
                        setOrganicOnly(false);
                        setSaleOnly(false);
                        setSearchQuery("");
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Category Collapsible Section matching screenshot */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                    className="flex items-center justify-between w-full text-left font-bold text-sm text-slate-800 cursor-pointer"
                  >
                    <span>Category</span>
                    {isCategoryFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isCategoryFilterOpen && (
                    <div className="space-y-2.5 pt-1">
                      {SIDEBAR_CATEGORIES.map((cat) => {
                        const isChecked = selectedCategories.includes(cat);
                        const count = listings.filter((l) => l.category === cat).length;
                        return (
                          <label
                            key={cat}
                            className="flex items-center justify-between text-xs sm:text-sm text-slate-600 hover:text-slate-900 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCategory(cat)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                              />
                              <span className={`truncate ${isChecked ? "font-bold text-emerald-900" : ""}`}>
                                {cat}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({count})
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* Badges Filter */}
                <div className="space-y-2.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Product Badges
                  </span>
                  <label className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saleOnly}
                      onChange={(e) => setSaleOnly(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                    />
                    <span>🔥 On Sale Deals</span>
                  </label>
                  <label className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={organicOnly}
                      onChange={(e) => setOrganicOnly(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>🌿 Organic Certified</span>
                  </label>
                </div>

                <hr className="border-slate-100" />

                {/* Guarantee Box */}
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 text-xs text-emerald-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <ShieldCheck size={16} className="text-emerald-700" />
                    <span>Farmveda Buyer Guarantee</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    Direct farm sourcing with moisture & purity testing. Payment held safely in escrow until you inspect delivery at your warehouse.
                  </p>
                </div>
              </aside>

              {/* Product Grid matching screenshot */}
              <div className="lg:col-span-3">
                {loading ? (
                  <div className="py-20 text-center text-slate-500">Loading verified products...</div>
                ) : listings.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-700">
                      <ShoppingBag size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-sora">
                      No Crops Listed for Sale Yet
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                      Farmers publish harvested grains, pulses, flours, and oils directly from the Farmer Sell Portal. When a crop is listed, it will appear here immediately for bulk procurement.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/home/sell-crops"
                        className="inline-flex items-center gap-2 bg-[#0A482A] hover:bg-[#083820] text-white text-xs font-extrabold px-5 py-3 rounded-xl transition-all shadow-sm"
                      >
                        <span>Open Farmer Sell Portal</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
                    <ShoppingBag size={36} className="mx-auto text-slate-400" />
                    <h3 className="text-base font-bold text-slate-800 font-sora">No products match this filter</h3>
                    <p className="text-xs text-slate-500">
                      Try unchecking some filters or selecting "Shop All" to see the full catalogue of crops listed by farmers.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedTopCategory("all");
                        setSelectedCategories([]);
                        setOrganicOnly(false);
                        setSaleOnly(false);
                      }}
                      className="bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                        : "space-y-4"
                    }
                  >
                    {filteredListings.map((product) => (
                      <div
                        key={product.id}
                        className={`rounded-2xl border-[1.5px] border-emerald-700/25 hover:border-emerald-600 bg-white overflow-hidden transition-all duration-300 flex flex-col justify-between group shadow-xs hover:shadow-xl ${
                          viewMode === "list" ? "sm:flex-row items-center p-4 gap-6" : ""
                        }`}
                      >
                        {/* Card Image Area */}
                        <div
                          className={`relative overflow-hidden bg-slate-50 flex items-center justify-center ${
                            viewMode === "list" ? "w-48 h-48 rounded-xl shrink-0" : "h-56 w-full"
                          }`}
                        >
                          <Image
                            src={product.image_url || "/crop.png"}
                            alt={product.title}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* "SALE" Red Badge matching screenshot */}
                          {product.is_sale && (
                            <div className="absolute top-3 left-3 bg-[#FF4646] text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-sm shadow-sm tracking-wider">
                              SALE
                            </div>
                          )}

                          {product.is_organic && (
                            <div className="absolute top-3 right-3 bg-emerald-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm backdrop-blur-xs">
                              Organic
                            </div>
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            {/* Star Rating Line */}
                            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                              {product.reviews_count > 0 ? (
                                <>
                                  <span className="text-emerald-700 font-extrabold flex items-center gap-0.5">
                                    ★ {product.rating.toFixed(1)}
                                  </span>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-slate-500 font-normal">
                                    {product.reviews_count} {product.reviews_count === 1 ? "review" : "reviews"}
                                  </span>
                                </>
                              ) : (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <Sparkles size={12} className="text-emerald-600" />
                                  <span>Direct Farm Harvest</span>
                                </span>
                              )}
                            </div>

                            {/* Product Title */}
                            <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                              {product.title}
                            </h3>

                            {/* Farmer Origin */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">
                                <strong>{product.farmer_name}</strong> &bull; {product.farmer_location}
                              </span>
                            </div>

                            {/* Quality Grade & MOQ */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                {product.quality_grade}
                              </span>
                              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                MOQ: {product.min_order_qty} {product.unit}
                              </span>
                            </div>
                          </div>

                          {/* Pricing & Procure Action */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-extrabold text-slate-900 font-sora">
                                  ₹{product.price_per_unit.toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  / {product.unit}
                                </span>
                              </div>
                              {product.original_price && (
                                <span className="text-xs text-slate-400 line-through">
                                  ₹{product.original_price.toLocaleString()}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleOpenProcureModal(product)}
                              className="bg-[#0A482A] hover:bg-[#083820] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              {vendor ? (
                                <>
                                  <ShoppingBag size={14} />
                                  <span>Procure</span>
                                </>
                              ) : (
                                <>
                                  <Lock size={13} className="text-emerald-300" />
                                  <span>Sign In to Buy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ─── 3. VENDOR PROCUREMENTS TRACKING TAB ─── */
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold font-sora text-[#005A36]">
                My Wholesale Procurements & Orders
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Track your active purchase orders, delivery dispatches, and escrow settlement status.
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-full border border-emerald-200">
              Escrow Protection Active
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <Truck size={36} className="mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-800">No procurement orders yet</h3>
              <p className="text-xs text-slate-500">
                Explore the catalog, select farmer harvests, and place your first wholesale order.
              </p>
              <button
                onClick={() => setActiveView("marketplace")}
                className="bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs font-extrabold text-[#0A482A] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        {order.order_number}
                      </span>
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          order.status === "pending"
                            ? "bg-amber-100 text-amber-900"
                            : order.status === "accepted"
                            ? "bg-blue-100 text-blue-900"
                            : order.status === "dispatched"
                            ? "bg-purple-100 text-purple-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Placed on {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-lg font-sora">
                      {order.crop_title}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <strong>Farmer:</strong> {order.farmer_name} &bull; {order.farmer_location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <strong>Farmer Contact:</strong>
                        {order.farmer_phone ? (
                          <a
                            href={`tel:${order.farmer_phone}`}
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                          >
                            <Phone size={12} />
                            <span>{order.farmer_phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">Available on dispatch</span>
                        )}
                      </div>
                      <div className="sm:col-span-2 truncate">
                        <strong>Destination Warehouse:</strong> {order.delivery_address}
                      </div>
                    </div>

                    {/* 4-Step Consignment Stepper */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5">
                      <div
                        className={`text-center p-2 rounded-xl text-[10px] font-bold transition-colors ${
                          order.status === "pending"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        1. Order Placed
                      </div>
                      <div
                        className={`text-center p-2 rounded-xl text-[10px] font-bold transition-colors ${
                          order.status === "accepted"
                            ? "bg-blue-100 text-blue-900 border border-blue-300"
                            : order.status === "dispatched" || order.status === "delivered"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-50 text-slate-400 border border-slate-200"
                        }`}
                      >
                        2. Farmer Confirmed
                      </div>
                      <div
                        className={`text-center p-2 rounded-xl text-[10px] font-bold transition-colors ${
                          order.status === "dispatched"
                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                            : order.status === "delivered"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-50 text-slate-400 border border-slate-200"
                        }`}
                      >
                        3. Freight Dispatched
                      </div>
                      <div
                        className={`text-center p-2 rounded-xl text-[10px] font-bold transition-colors ${
                          order.status === "delivered"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold"
                            : "bg-slate-50 text-slate-400 border border-slate-200"
                        }`}
                      >
                        4. Delivered & Settled
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Invoice</span>
                      <div className="text-2xl font-black text-slate-900 font-sora">
                        ₹{order.total_amount.toLocaleString()}
                      </div>
                      <span className="text-xs text-slate-500">
                        {order.quantity} {order.unit} @ ₹{order.unit_price}/{order.unit}
                      </span>
                    </div>

                    <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-700" />
                      <span>Payment Escrow: Secured</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── 4. PROCUREMENT ORDER MODAL ─── */}
      {selectedCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCrop(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            <div>
              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md">
                Direct Farmer Procurement
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 font-sora mt-2 leading-tight">
                {selectedCrop.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Grown by <strong>{selectedCrop.farmer_name}</strong> &bull; {selectedCrop.farmer_location}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Procurement Quantity ({selectedCrop.unit})</span>
                <span className="text-slate-500 font-normal">
                  Available: {selectedCrop.quantity_available} {selectedCrop.unit}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOrderQty((q) => Math.max(selectedCrop.min_order_qty, q - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Minus size={16} />
                </button>

                <input
                  type="number"
                  min={selectedCrop.min_order_qty}
                  max={selectedCrop.quantity_available}
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center font-black text-xl bg-white border border-slate-300 rounded-xl h-10 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />

                <button
                  type="button"
                  onClick={() => setOrderQty((q) => Math.min(selectedCrop.quantity_available, q + 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-medium text-center">
                Minimum order: {selectedCrop.min_order_qty} {selectedCrop.unit}
              </p>
            </div>

            {/* Buyer Details */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Buyer Procurement Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Company / Enterprise Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FreshMart Organics / Aarav Retail"
                    value={vendorCompany}
                    onChange={(e) => setVendorCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Contact Person Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Contact Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98200 12345"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Delivery Destination Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Destination Warehouse / Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Enter complete delivery warehouse or shop address with pincode"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-700"
              />
            </div>

            {/* Delivery Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Special Delivery Notes / Quality Requirements
              </label>
              <input
                type="text"
                placeholder="e.g. Moisture certificate required at delivery gate"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
              />
            </div>

            {/* Order Price Breakdown */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Unit Rate:</span>
                <span className="font-semibold">₹{selectedCrop.price_per_unit.toLocaleString()} / {selectedCrop.unit}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Quantity:</span>
                <span className="font-semibold">{orderQty} {selectedCrop.unit}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Wholesale Direct Savings:</span>
                <span>- ₹{Math.round(orderQty * selectedCrop.price_per_unit * 0.08).toLocaleString()} (8%)</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 font-sora pt-2 border-t border-slate-200">
                <span>Total Procurement Value:</span>
                <span className="text-[#0A482A]">₹{(orderQty * selectedCrop.price_per_unit).toLocaleString()}</span>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCrop(null)}
                className="flex-1 py-3 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={ordering}
                onClick={handleConfirmOrder}
                className="flex-1 py-3 bg-[#0A482A] hover:bg-[#083820] text-white text-xs font-black rounded-xl shadow-md transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {ordering ? "Confirming Order..." : "Confirm Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. FLOATING REWARDS PILL BUTTON (Matching Screenshot) ─── */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setShowRewardsModal(true)}
          className="bg-[#1B4323] hover:bg-[#13331a] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 font-bold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-600/30"
        >
          <Gift size={18} className="text-emerald-300" />
          <span>Rewards</span>
        </button>
      </div>

      {/* Rewards Modal */}
      {showRewardsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowRewardsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                🎁
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 font-sora">
                Vendor Loyalty Rewards
              </h3>
              <p className="text-xs text-slate-500">
                Earn 1 Green Point for every ₹100 spent on farm-direct procurements.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Your Reward Balance</span>
              <div className="text-3xl font-black text-[#0A482A] font-sora">
                {earnedRewardPoints.toLocaleString()} Pts
              </div>
              {earnedRewardPoints > 0 ? (
                <span className="text-[11px] text-emerald-700 font-bold block">
                  Worth ₹{earnedRewardPoints.toLocaleString()} on next bulk order
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium block">
                  Complete wholesale procurements to accumulate green reward credits.
                </span>
              )}
            </div>

            <button
              onClick={() => setShowRewardsModal(false)}
              className="w-full bg-[#0A482A] text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer hover:bg-[#083820]"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* ─── 6. VENDOR AUTHENTICATION REQUIRED MODAL ─── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowAuthModal(false);
                setPendingCrop(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-50 text-[#0A482A] border border-emerald-200/80 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Lock size={26} className="stroke-[2.5]" />
              </div>
              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                Wholesale Buyer Verification
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 font-sora tracking-tight">
                Sign In as a Vendor
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Only authenticated wholesale buyers can procure crops, lock farm-gate rates, and issue legally binding escrow contracts.
              </p>
            </div>

            {/* Selected Crop Preview if user clicked "Procure" on a card */}
            {pendingCrop && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                  <Image
                    src={pendingCrop.image_url || "/crop.png"}
                    alt={pendingCrop.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.2 rounded">
                    {pendingCrop.category}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs truncate mt-0.5">
                    {pendingCrop.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mt-0.5">
                    <span>₹{pendingCrop.price_per_unit.toLocaleString()} / {pendingCrop.unit}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-slate-500 font-normal">MOQ: {pendingCrop.min_order_qty} {pendingCrop.unit}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Trust guarantees */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
                <span className="font-medium">Escrow Protected</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                <span className="font-medium">Direct Mandi Rates</span>
              </div>
            </div>

            {/* Primary Action: Go to Dedicated Vendor Portal */}
            <div className="space-y-3 pt-1">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  router.push(pendingCrop ? `/vendor/login?cropId=${pendingCrop.id}` : "/vendor/login");
                }}
                className="w-full py-3.5 bg-[#0A482A] hover:bg-[#083820] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all hover:scale-101 active:scale-99 cursor-pointer flex items-center justify-center gap-2 font-sora"
              >
                <Lock size={15} />
                <span>Go to Wholesale Login & Register</span>
                <ArrowRight size={15} />
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] text-slate-400 font-semibold uppercase">
                  or Instant Buyer Access
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Quick Email Form right in modal */}
              <form onSubmit={handleQuickVendorAuth} className="space-y-2.5">
                <input
                  type="text"
                  required
                  placeholder="Business Email or Phone (e.g. buyer@enterprise.com)"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Officer Name"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Company / Supermarket"
                    value={quickCompany}
                    onChange={(e) => setQuickCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isAuthenticating ? "Authenticating..." : "Instant Vendor Access"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
