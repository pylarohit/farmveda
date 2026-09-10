"use client";

import { createClient } from "@/lib/supabase/client";

export interface CropListing {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_avatar?: string;
  farmer_phone?: string;
  farmer_location: string;
  title: string;
  category: string;
  variety?: string;
  quantity_available: number;
  total_quantity: number;
  unit: "kg" | "quintal" | "ton" | "packs";
  min_order_qty: number;
  price_per_unit: number;
  original_price?: number;
  quality_grade: "Grade A+" | "Grade A" | "Organic Certified" | "Export Quality" | "Standard";
  harvest_date: string;
  image_url: string;
  description: string;
  is_organic: boolean;
  is_sale?: boolean;
  rating: number;
  reviews_count: number;
  status: "available" | "low_stock" | "sold_out";
  created_at: string;
}

export interface VendorOrder {
  id: string;
  order_number: string;
  crop_id: string;
  crop_title: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone?: string;
  farmer_location?: string;
  vendor_id: string;
  vendor_name: string;
  vendor_company: string;
  vendor_phone: string;
  vendor_email: string;
  delivery_address: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  status: "pending" | "accepted" | "dispatched" | "delivered" | "cancelled";
  payment_status: "unpaid" | "paid" | "escrow";
  delivery_notes?: string;
  created_at: string;
}

const LOCAL_STORAGE_LISTINGS_KEY = "farmveda_live_crop_listings";
const LOCAL_STORAGE_ORDERS_KEY = "farmveda_live_vendor_orders";

export const CropMarketplaceService = {
  // Purge any legacy fake data
  purgeLegacyMockData() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("farmveda_crop_listings_v1");
      localStorage.removeItem("farmveda_crop_listings_v2");
      localStorage.removeItem("farmveda_vendor_orders_v1");
      localStorage.removeItem("farmveda_vendor_orders_v2");
    } catch {}
  },

  // Event dispatcher for real-time reactive sync across components and tabs
  notifyChange() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cropMarketplaceChanged"));
    }
  },

  // ─── Fetch Listings (Real Data Only) ───────────────────────────────
  async getListings(): Promise<CropListing[]> {
    this.purgeLegacyMockData();
    if (typeof window === "undefined") return [];

    // Try fetching from Supabase table
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("crop_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as CropListing[];
      }
    } catch {
      // Supabase table not created yet, fallback to local storage
    }

    // Local storage fallback for user-created real crops
    const saved = localStorage.getItem(LOCAL_STORAGE_LISTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return [];
  },

  // ─── Save / Create Real Crop Listing (Farmer) ─────────────────────
  async createListing(listing: Omit<CropListing, "id" | "created_at" | "rating" | "reviews_count" | "status" | "total_quantity">): Promise<CropListing> {
    const newListing: CropListing = {
      ...listing,
      id: `crop-${Date.now()}`,
      total_quantity: listing.quantity_available,
      rating: 5.0,
      reviews_count: 0,
      status: "available",
      created_at: new Date().toISOString(),
    };

    // Try Supabase first
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("crop_listings")
        .insert(newListing)
        .select()
        .single();

      if (!error && data) {
        const current = await this.getListings();
        localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify([data, ...current]));
        this.notifyChange();
        return data as CropListing;
      }
    } catch {}

    // Local storage persistence
    const current = await this.getListings();
    const updated = [newListing, ...current];
    localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify(updated));
    this.notifyChange();
    return newListing;
  },

  // ─── Update Crop Listing ──────────────────────────────────────────
  async updateListing(updatedListing: CropListing): Promise<boolean> {
    try {
      const supabase = createClient();
      await supabase.from("crop_listings").update(updatedListing).eq("id", updatedListing.id);
    } catch {}

    const current = await this.getListings();
    const updated = current.map(l => l.id === updatedListing.id ? updatedListing : l);
    localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify(updated));
    this.notifyChange();
    return true;
  },

  // ─── Delete Crop Listing ──────────────────────────────────────────
  async deleteListing(id: string): Promise<boolean> {
    try {
      const supabase = createClient();
      await supabase.from("crop_listings").delete().eq("id", id);
    } catch {}

    const current = await this.getListings();
    const filtered = current.filter(l => l.id !== id);
    localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify(filtered));
    this.notifyChange();
    return true;
  },

  // ─── Get Orders (Real Orders Only) ────────────────────────────────
  async getOrders(): Promise<VendorOrder[]> {
    this.purgeLegacyMockData();
    if (typeof window === "undefined") return [];

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vendor_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as VendorOrder[];
      }
    } catch {}

    const saved = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return [];
  },

  // ─── Place Real Order (Vendor) ────────────────────────────────────
  async placeOrder(orderData: Omit<VendorOrder, "id" | "order_number" | "status" | "payment_status" | "created_at">): Promise<VendorOrder> {
    const orderNumber = `FV-ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: VendorOrder = {
      ...orderData,
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      status: "pending",
      payment_status: "escrow",
      created_at: new Date().toISOString(),
    };

    // Try Supabase
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vendor_orders")
        .insert(newOrder)
        .select()
        .single();
      if (!error && data) {
        const current = await this.getOrders();
        localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify([data, ...current]));
      }
    } catch {}

    // Local storage persistence
    const currentOrders = await this.getOrders();
    const updatedOrders = [newOrder, ...currentOrders];
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updatedOrders));

    // Deduct quantity from the real crop listing
    const listings = await this.getListings();
    const updatedListings = listings.map(l => {
      if (l.id === orderData.crop_id) {
        const remaining = Math.max(0, l.quantity_available - orderData.quantity);
        return {
          ...l,
          quantity_available: remaining,
          status: remaining === 0 ? "sold_out" : remaining < 10 ? "low_stock" : "available"
        } as CropListing;
      }
      return l;
    });
    localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify(updatedListings));

    this.notifyChange();
    return newOrder;
  },

  // ─── Update Real Order Status ─────────────────────────────────────
  async updateOrderStatus(orderId: string, status: VendorOrder["status"]): Promise<boolean> {
    try {
      const supabase = createClient();
      await supabase.from("vendor_orders").update({ status }).eq("id", orderId);
    } catch {}

    const current = await this.getOrders();
    const updated = current.map(o => o.id === orderId ? { ...o, status } : o);
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updated));
    this.notifyChange();
    return true;
  }
};
