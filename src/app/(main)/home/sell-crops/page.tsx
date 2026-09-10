"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Plus,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  IndianRupee,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  ExternalLink,
  Trash2,
  Eye,
  Filter,
  Search,
  Check,
  Building,
  Store,
  ArrowRight,
  Edit,
  Tag,
  ShieldCheck,
  Flame,
  ChevronRight,
  X,
  Layers,
  Award,
  BarChart3
} from "lucide-react";
import { useUserData } from "@/context/UserDataProvider";
import {
  CropListing,
  VendorOrder,
  CropMarketplaceService
} from "@/lib/cropMarketplace";
import { toast } from "react-hot-toast";

const CROP_CATEGORIES = [
  "Flour",
  "Chana Dal",
  "Chikki",
  "Cold Pressed Oils",
  "Spices & Masala",
  "Fresh Fruits",
  "Honey",
  "Dosa Mixs",
  "Chutney Powders",
  "Staples",
  "Chocolates",
  "Idli Mixes"
];

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  "Flour": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
  "Chana Dal": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  "Chikki": "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&q=80&w=600",
  "Cold Pressed Oils": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=600",
  "Spices & Masala": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
  "Fresh Fruits": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=600",
  "Honey": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600",
  "Dosa Mixs": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&q=80&w=600",
  "Chutney Powders": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
  "Staples": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  "Chocolates": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&q=80&w=600",
  "Idli Mixes": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600",
};

export default function FarmerSellCropsPage() {
  const { user } = useUserData();
  const [activeTab, setActiveTab] = useState<"listings" | "orders" | "analytics">("listings");
  const [listings, setListings] = useState<CropListing[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "low_stock" | "sold_out">("all");

  // Create Listing Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<CropListing | null>(null);

  // Form Fields (Clean real data only)
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Flour");
  const [variety, setVariety] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"quintal" | "kg" | "ton" | "packs">("quintal");
  const [minOrderQty, setMinOrderQty] = useState("1");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [qualityGrade, setQualityGrade] = useState<CropListing["quality_grade"]>("Grade A+");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [description, setDescription] = useState("");
  const [isOrganic, setIsOrganic] = useState(false);
  const [isSale, setIsSale] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load Data
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

    // Listen to real-time events across windows & tabs
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("cropMarketplaceChanged", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("cropMarketplaceChanged", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Open Modal for Create or Edit
  const openCreateModal = (cropToEdit?: CropListing) => {
    if (cropToEdit) {
      setEditingCrop(cropToEdit);
      setTitle(cropToEdit.title);
      setCategory(cropToEdit.category);
      setVariety(cropToEdit.variety || "");
      setQuantity(String(cropToEdit.quantity_available));
      setUnit(cropToEdit.unit);
      setMinOrderQty(String(cropToEdit.min_order_qty));
      setPricePerUnit(String(cropToEdit.price_per_unit));
      setQualityGrade(cropToEdit.quality_grade);
      setHarvestDate(cropToEdit.harvest_date);
      setLocation(cropToEdit.farmer_location);
      setFarmerPhone(cropToEdit.farmer_phone || user?.userPhone || "");
      setDescription(cropToEdit.description);
      setIsOrganic(cropToEdit.is_organic);
      setIsSale(cropToEdit.is_sale || false);
      setImageUrl(cropToEdit.image_url);
    } else {
      setEditingCrop(null);
      setTitle("");
      setCategory("Staples");
      setVariety("");
      setQuantity("");
      setUnit("quintal");
      setMinOrderQty("1");
      setPricePerUnit("");
      setDescription("");
      setLocation(user?.institutionName || "");
      setFarmerPhone(user?.userPhone || "");
      setIsOrganic(false);
      setIsSale(false);
      setImageUrl("");
    }
    setIsModalOpen(true);
  };

  // Submit Listing
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !pricePerUnit || !quantity) {
      toast.error("Please enter Crop Name, Quantity, and Price.");
      return;
    }

    setSubmitting(true);
    try {
      const resolvedImg = imageUrl.trim() || DEFAULT_CATEGORY_IMAGES[category] || "/crop.png";
      const resolvedLocation = location.trim() || user?.institutionName || "Mandi Yard";
      const resolvedPhone = farmerPhone.trim() || user?.userPhone || "";
      const resolvedName = user?.userName || "Farmer";

      if (editingCrop) {
        // Update existing listing
        const qty = parseFloat(quantity);
        await CropMarketplaceService.updateListing({
          ...editingCrop,
          title: title.trim(),
          category,
          variety: variety.trim() || undefined,
          quantity_available: qty,
          unit,
          min_order_qty: parseFloat(minOrderQty) || 1,
          price_per_unit: parseFloat(pricePerUnit),
          quality_grade: qualityGrade,
          harvest_date: harvestDate,
          farmer_phone: resolvedPhone,
          farmer_location: resolvedLocation,
          description: description.trim() || `Fresh harvest of ${title}.`,
          is_organic: isOrganic,
          is_sale: isSale,
          image_url: resolvedImg,
          status: qty === 0 ? "sold_out" : qty < 10 ? "low_stock" : "available"
        });
        toast.success("Crop listing updated successfully!");
      } else {
        // Create new listing
        await CropMarketplaceService.createListing({
          farmer_id: user?.id ? String(user.id) : `farmer-${Date.now()}`,
          farmer_name: resolvedName,
          farmer_avatar: user?.avatar || "/user.png",
          farmer_phone: resolvedPhone,
          farmer_location: resolvedLocation,
          title: title.trim(),
          category,
          variety: variety.trim() || undefined,
          quantity_available: parseFloat(quantity),
          unit,
          min_order_qty: parseFloat(minOrderQty) || 1,
          price_per_unit: parseFloat(pricePerUnit),
          quality_grade: qualityGrade,
          harvest_date: harvestDate,
          image_url: resolvedImg,
          description: description.trim() || `Certified farm harvest of ${title}. High purity, direct from farm.`,
          is_organic: isOrganic,
          is_sale: isSale,
        });
        toast.success("Crop published! Verified wholesale vendors can now view and procure.");
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error saving listing. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Listing
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this crop from the marketplace?")) return;
    try {
      await CropMarketplaceService.deleteListing(id);
      toast.success("Listing removed.");
      loadData();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  // Update Order Status
  const handleOrderStatus = async (orderId: string, status: VendorOrder["status"]) => {
    try {
      await CropMarketplaceService.updateOrderStatus(orderId, status);
      toast.success(`Consignment marked as ${status.toUpperCase()}!`);
      loadData();
    } catch {
      toast.error("Could not update order status.");
    }
  };

  // Metrics calculation
  const totalStockCount = listings.reduce((sum, item) => sum + item.quantity_available, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const totalPayoutEarned = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total_amount, 0);

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (
        searchQuery &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [listings, statusFilter, searchQuery]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-6 pb-20">
      {/* ─── 1. Farmveda Professional Header Banner ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-[28px] p-6 sm:p-8 text-white shadow-xl border border-emerald-900/30 relative overflow-hidden">
        {/* Subtle decorative background ring */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-emerald-400" />
              <span>Farmveda B2B Mandi Exchange</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-sora tracking-tight">
              Farmer Crop Selling Hub
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-inter leading-relaxed">
              List your harvested crops directly at your own rates. Connect with verified supermarkets, food brands, and grain wholesalers with guaranteed escrow payment protection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => openCreateModal()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer text-sm font-sora"
            >
              <Plus size={18} className="stroke-[3]" />
              <span>+ List New Crop</span>
            </button>

            <Link
              href="/vendor"
              target="_blank"
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2 transition-all border border-white/15 text-sm backdrop-blur-sm cursor-pointer"
            >
              <Store size={18} className="text-emerald-400" />
              <span>View Vendor Portal</span>
              <ExternalLink size={14} className="opacity-70" />
            </Link>
          </div>
        </div>

        {/* ── Top Metric Cards Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
              Active Crops Listed
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-sora text-white">
                {listings.length}
              </span>
              <span className="text-xs font-bold text-emerald-400">Live</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
              Available Wholesale Stock
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-sora text-emerald-400">
                {totalStockCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">Units</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
              Pending Buyer Orders
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-sora text-amber-400">
                {pendingOrders.length}
              </span>
              <span className="text-xs text-slate-400">Inquiries</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
              Escrow Realized Volume
            </span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-sora text-white">
                ₹{totalPayoutEarned.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Interactive Tab Controls ─── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("listings")}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "listings"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Package size={16} />
            <span>My Crops for Sale ({listings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 relative ${
              activeTab === "orders"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Truck size={16} />
            <span>Incoming Vendor Orders ({orders.length})</span>
            {pendingOrders.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                {pendingOrders.length} new
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-4 py-2 rounded-xl transition-all cursor-pointer border border-emerald-200"
        >
          <Plus size={14} />
          <span>Add Crop Listing</span>
        </button>
      </div>

      {/* ─── TAB 1: My Crops for Sale Inventory ─── */}
      {activeTab === "listings" && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search your listed crops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {(["all", "available", "low_stock", "sold_out"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${
                    statusFilter === status
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500">Loading your crops...</div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sora">No crops match your search</h3>
              <p className="text-xs text-slate-500">
                List your grains, pulses, flours, or oils to connect with wholesale food buyers.
              </p>
              <button
                onClick={() => openCreateModal()}
                className="bg-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={16} /> List a Crop
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((crop) => {
                const soldQty = crop.total_quantity - crop.quantity_available;
                const progressPct = Math.min(100, Math.round((soldQty / crop.total_quantity) * 100)) || 0;

                return (
                  <div
                    key={crop.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Crop Image & Badges */}
                      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                        <Image
                          src={crop.image_url || "/crop.png"}
                          alt={crop.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Badges on image */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          {crop.is_sale && (
                            <span className="bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow-sm uppercase tracking-wide">
                              SALE DEAL
                            </span>
                          )}
                          {crop.is_organic && (
                            <span className="bg-emerald-700 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                              Organic Certified
                            </span>
                          )}
                        </div>

                        <div className="absolute top-3 right-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                              crop.status === "available"
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                : crop.status === "low_stock"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-red-100 text-red-900 border border-red-200"
                            }`}
                          >
                            {crop.status === "available" ? "Active" : crop.status === "low_stock" ? "Low Stock" : "Sold Out"}
                          </span>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200/60">
                            {crop.category}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar size={12} /> Harvest: {crop.harvest_date}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-base leading-snug font-sora line-clamp-2">
                          {crop.title}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {crop.description}
                        </p>

                        {/* Price & Quantity Grid */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Your Mandi Rate
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-extrabold text-slate-900 font-sora">
                                ₹{crop.price_per_unit.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-500">/ {crop.unit}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Available Stock
                            </span>
                            <span className="text-sm font-black text-emerald-700 font-sora">
                              {crop.quantity_available} {crop.unit}
                            </span>
                          </div>
                        </div>

                        {/* Stock progress bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                            <span>Sold: {soldQty} {crop.unit}</span>
                            <span>Total: {crop.total_quantity} {crop.unit}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{crop.farmer_location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href="/vendor"
                        target="_blank"
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <Eye size={13} />
                        <span>Vendor View</span>
                      </Link>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openCreateModal(crop)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit price & quantity"
                        >
                          <Edit size={15} />
                        </button>

                        <button
                          onClick={() => handleDelete(crop.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete listing"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Incoming Vendor Orders ─── */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-sora text-slate-900">
                Direct Purchase Orders from Wholesale Buyers
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Orders placed in the Vendor Portal appear here in real-time. Accept and dispatch to receive escrow payout.
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              Escrow Protection Active
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <Truck size={36} className="mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-800 font-sora">No vendor orders yet</h3>
              <p className="text-xs text-slate-500">
                When wholesale buyers and supermarkets procure your listed crops, purchase requests will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        {order.order_number}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          order.status === "pending"
                            ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                            : order.status === "accepted"
                            ? "bg-blue-100 text-blue-900 border border-blue-200"
                            : order.status === "dispatched"
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}
                      >
                        {order.status === "pending" ? "Action Needed: Pending Review" : order.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-lg font-sora">
                      {order.crop_title}
                    </h3>

                    {/* Buyer Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Building size={14} className="text-slate-400 shrink-0" />
                        <span><strong>Buyer:</strong> {order.vendor_company} ({order.vendor_name})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span><strong>Phone:</strong> <a href={`tel:${order.vendor_phone}`} className="text-blue-600 hover:underline">{order.vendor_phone}</a></span>
                      </div>
                      <div className="flex items-start gap-1.5 sm:col-span-2">
                        <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate"><strong>Delivery Destination:</strong> {order.delivery_address}</span>
                      </div>
                    </div>

                    {order.delivery_notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                        "Notes from Buyer: {order.delivery_notes}"
                      </p>
                    )}
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Payout Amount</span>
                      <div className="text-2xl font-black text-slate-900 font-sora">
                        ₹{order.total_amount.toLocaleString()}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {order.quantity} {order.unit} @ ₹{order.unit_price}/{order.unit}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleOrderStatus(order.id, "accepted")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <Check size={14} /> Accept Order
                          </button>
                          <button
                            onClick={() => handleOrderStatus(order.id, "cancelled")}
                            className="bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 font-semibold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {order.status === "accepted" && (
                        <button
                          onClick={() => handleOrderStatus(order.id, "dispatched")}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Truck size={14} /> Mark Consignment Dispatched
                        </button>
                      )}

                      {order.status === "dispatched" && (
                        <button
                          onClick={() => handleOrderStatus(order.id, "delivered")}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 size={14} /> Mark Delivered
                        </button>
                      )}

                      {order.status === "delivered" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Payout Escrow Released to Bank
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 3. CREATE / EDIT CROP LISTING MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            <div>
              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                Farmer Direct Listing
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 font-sora mt-1.5">
                {editingCrop ? "Edit Crop Listing" : "List Your Harvest for Sale"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your crop details. Once published, your listing appears immediately in the wholesale Vendor Marketplace.
              </p>
            </div>

            <form onSubmit={handleSaveListing} className="space-y-5">
              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Crop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Khapli Wheat Grain / Desi Chana Dal"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium cursor-pointer"
                  >
                    {CROP_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Variety & Quality Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Variety / Seed Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JG-11, Maldandi, BPT-5204"
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Quality Grade
                  </label>
                  <select
                    value={qualityGrade}
                    onChange={(e) => setQualityGrade(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium cursor-pointer"
                  >
                    <option value="Grade A+">Grade A+ (Export Quality)</option>
                    <option value="Grade A">Grade A (Commercial Grade)</option>
                    <option value="Organic Certified">Organic Certified</option>
                    <option value="Export Quality">Export Quality Tested</option>
                    <option value="Standard">Standard APMC Mandi Grade</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Total Quantity & Unit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Total Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="e.g. 50"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      className="w-24 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="quintal">Quintal</option>
                      <option value="kg">Kg</option>
                      <option value="ton">Tons</option>
                      <option value="packs">Packs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Min. Order Qty (MOQ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Price (₹ / {unit}) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="e.g. 3400"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Pickup Mandi & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Pickup Mandi / Village Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vashi APMC, Navi Mumbai"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Farmer Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={farmerPhone}
                    onChange={(e) => setFarmerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 5: Harvest Date & Image URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Harvest Date
                  </label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Custom Crop Photo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="Leave empty for category photo"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description & Moisture Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Clean threshed grain, moisture < 11%, zero stone impurities."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white font-medium"
                />
              </div>

              {/* Badges Toggles */}
              <div className="flex flex-wrap items-center gap-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isOrganic}
                    onChange={(e) => setIsOrganic(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>🌿 Organic Certified</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isSale}
                    onChange={(e) => setIsSale(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  />
                  <span>🔥 Mark as "SALE DEAL"</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? "Publishing..." : editingCrop ? "Save Changes" : "Publish to Vendor Market"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
