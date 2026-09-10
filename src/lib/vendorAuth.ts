"use client";

export interface VendorUser {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  gstin?: string;
  deliveryAddress: string;
  businessType: "supermarket" | "wholesaler" | "food_brand" | "exporter" | "retailer";
  isVerified: boolean;
  createdAt: string;
}

const VENDOR_AUTH_KEY = "farmveda_vendor_auth_session";
const VENDOR_REGISTRY_KEY = "farmveda_registered_vendors";

export const VendorAuthService = {
  // Get active vendor session (runs client-side)
  getVendorSession(): VendorUser | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(VENDOR_AUTH_KEY);
      if (stored) {
        return JSON.parse(stored) as VendorUser;
      }
    } catch (e) {
      console.error("Error reading vendor auth session:", e);
    }
    return null;
  },

  // Set vendor session and dispatch event
  setVendorSession(vendor: VendorUser): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(VENDOR_AUTH_KEY, JSON.stringify(vendor));
      this.notifyChange();
    } catch (e) {
      console.error("Error saving vendor auth session:", e);
    }
  },

  // Get all registered vendors from local registry
  getRegisteredVendors(): VendorUser[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(VENDOR_REGISTRY_KEY);
      if (stored) {
        return JSON.parse(stored) as VendorUser[];
      }
    } catch (e) {
      console.error("Error reading registered vendors:", e);
    }
    return [];
  },

  // Vendor Login (by email or phone)
  async login(emailOrPhone: string, companyName?: string, contactName?: string): Promise<VendorUser> {
    const trimmed = emailOrPhone.trim().toLowerCase();
    const registered = this.getRegisteredVendors();

    // Check if vendor is already in the registry
    const existing = registered.find(
      (v) => v.email.toLowerCase() === trimmed || v.phone.replace(/\s+/g, "") === trimmed.replace(/\s+/g, "")
    );

    if (existing) {
      this.setVendorSession(existing);
      return existing;
    }

    // Otherwise create or format vendor profile
    const namePart = contactName || trimmed.split("@")[0] || "Wholesale Buyer";
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const resolvedCompany = companyName?.trim() || `${formattedName} Enterprises Ltd`;

    const vendorUser: VendorUser = {
      id: `vendor-${Date.now()}`,
      name: formattedName,
      company: resolvedCompany,
      email: trimmed.includes("@") ? trimmed : `${trimmed}@buyer.farmveda.in`,
      phone: trimmed.includes("@") ? "+91 98200 55443" : trimmed,
      deliveryAddress: "APMC Logistics Central Depot, Sector 19, Vashi, Navi Mumbai, 400703",
      businessType: "wholesaler",
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    // Save to registry and set session
    try {
      const updatedRegistry = [vendorUser, ...registered.filter((r) => r.id !== vendorUser.id)];
      localStorage.setItem(VENDOR_REGISTRY_KEY, JSON.stringify(updatedRegistry));
    } catch (e) {
      console.error("Error updating vendor registry:", e);
    }

    this.setVendorSession(vendorUser);
    return vendorUser;
  },

  // Register New Wholesale Buyer
  async register(data: {
    name: string;
    company: string;
    email: string;
    phone: string;
    deliveryAddress: string;
    businessType?: VendorUser["businessType"];
    gstin?: string;
  }): Promise<VendorUser> {
    const newVendor: VendorUser = {
      id: `vendor-${Date.now()}`,
      name: data.name.trim(),
      company: data.company.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      deliveryAddress: data.deliveryAddress.trim() || "APMC Grain Yard, Vashi, Navi Mumbai",
      businessType: data.businessType || "wholesaler",
      gstin: data.gstin ? data.gstin.trim().toUpperCase() : undefined,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const registered = this.getRegisteredVendors();
      const updated = [newVendor, ...registered.filter((v) => v.email !== newVendor.email)];
      localStorage.setItem(VENDOR_REGISTRY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving registered vendor:", e);
    }

    this.setVendorSession(newVendor);
    return newVendor;
  },

  // Vendor Logout
  logout(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(VENDOR_AUTH_KEY);
      this.notifyChange();
    } catch (e) {
      console.error("Error clearing vendor auth session:", e);
    }
  },

  // Real-time synchronization event
  notifyChange(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("vendorAuthChanged"));
      window.dispatchEvent(new Event("storage"));
    }
  }
};
