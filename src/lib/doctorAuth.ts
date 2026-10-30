"use client";

export interface DoctorUser {
  id: string;
  name: string;
  qualification: string;
  specialization: "plant_pathologist" | "soil_specialist" | "pest_management" | "agronomist" | "horticulturist";
  institute: string;
  registrationNo: string;
  experienceYears: number;
  email: string;
  phone: string;
  isVerified: boolean;
  casesResolved: number;
  rating: number;
  createdAt: string;
}

const DOCTOR_AUTH_KEY = "farmveda_doctor_auth_session";
const DOCTOR_REGISTRY_KEY = "farmveda_registered_doctors";

// Pre-seeded demo doctors for immediate testing
const INITIAL_DOCTORS: DoctorUser[] = [
  {
    id: "doc-001",
    name: "Dr. Ananya Sharma",
    qualification: "Ph.D. in Plant Pathology (IARI)",
    specialization: "plant_pathologist",
    institute: "Indian Council of Agricultural Research (ICAR)",
    registrationNo: "AGRI-PATH-2018-9412",
    experienceYears: 11,
    email: "ananya.sharma@farmveda.in",
    phone: "+91 98765 43210",
    isVerified: true,
    casesResolved: 428,
    rating: 4.9,
    createdAt: "2023-01-15T00:00:00.000Z",
  },
  {
    id: "doc-002",
    name: "Dr. K. Srinivas Rao",
    qualification: "M.Sc. (Agri) Entomology & Crop Protection",
    specialization: "pest_management",
    institute: "Prof. Jayashankar Telangana State Agricultural University",
    registrationNo: "PJTSAU-CP-2019-3310",
    experienceYears: 9,
    email: "srinivas.rao@farmveda.in",
    phone: "+91 91234 56789",
    isVerified: true,
    casesResolved: 312,
    rating: 4.8,
    createdAt: "2023-04-10T00:00:00.000Z",
  },
  {
    id: "doc-003",
    name: "Dr. Rajeshwar Patil",
    qualification: "Ph.D. in Agronomy & Soil Microbiology",
    specialization: "soil_specialist",
    institute: "Punjab Agricultural University (PAU)",
    registrationNo: "PAU-SOIL-2017-1092",
    experienceYears: 14,
    email: "rajeshwar.patil@farmveda.in",
    phone: "+91 99887 76655",
    isVerified: true,
    casesResolved: 560,
    rating: 5.0,
    createdAt: "2022-11-20T00:00:00.000Z",
  },
];

export const DoctorAuthService = {
  // Get active doctor session
  getDoctorSession(): DoctorUser | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(DOCTOR_AUTH_KEY);
      if (stored) {
        return JSON.parse(stored) as DoctorUser;
      }
    } catch (e) {
      console.error("Error reading doctor auth session:", e);
    }
    return null;
  },

  // Set doctor session
  setDoctorSession(doctor: DoctorUser): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DOCTOR_AUTH_KEY, JSON.stringify(doctor));
      this.notifyChange();
    } catch (e) {
      console.error("Error saving doctor auth session:", e);
    }
  },

  // Get registered doctors
  getRegisteredDoctors(): DoctorUser[] {
    if (typeof window === "undefined") return INITIAL_DOCTORS;
    try {
      const stored = localStorage.getItem(DOCTOR_REGISTRY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DoctorUser[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(DOCTOR_REGISTRY_KEY, JSON.stringify(INITIAL_DOCTORS));
      return INITIAL_DOCTORS;
    } catch (e) {
      console.error("Error reading registered doctors:", e);
      return INITIAL_DOCTORS;
    }
  },

  // Doctor Login
  async login(emailOrPhone: string): Promise<DoctorUser> {
    const trimmed = emailOrPhone.trim().toLowerCase();
    const registered = this.getRegisteredDoctors();

    const existing = registered.find(
      (d) =>
        d.email.toLowerCase() === trimmed ||
        d.phone.replace(/\s+/g, "") === trimmed.replace(/\s+/g, "") ||
        d.registrationNo.toLowerCase() === trimmed
    );

    if (existing) {
      this.setDoctorSession(existing);
      return existing;
    }

    // Auto-create verified doctor profile if not existing
    const namePart = trimmed.split("@")[0] || "Agronomist";
    const formattedName = "Dr. " + namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const newDoc: DoctorUser = {
      id: `doc-${Date.now()}`,
      name: formattedName,
      qualification: "M.Sc. Agriculture (Plant Health Specialist)",
      specialization: "plant_pathologist",
      institute: "National Agricultural Research Institute",
      registrationNo: `AGRI-DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      experienceYears: 6,
      email: trimmed.includes("@") ? trimmed : `${trimmed}@doctor.farmveda.in`,
      phone: trimmed.includes("@") ? "+91 98111 22334" : trimmed,
      isVerified: true,
      casesResolved: 84,
      rating: 4.9,
      createdAt: new Date().toISOString(),
    };

    try {
      const updated = [newDoc, ...registered];
      localStorage.setItem(DOCTOR_REGISTRY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving doctor to registry:", e);
    }

    this.setDoctorSession(newDoc);
    return newDoc;
  },

  // Doctor Registration
  async register(data: {
    name: string;
    qualification: string;
    specialization: DoctorUser["specialization"];
    institute: string;
    registrationNo?: string;
    experienceYears?: number;
    email: string;
    phone: string;
  }): Promise<DoctorUser> {
    const cleanName = data.name.trim().startsWith("Dr.") ? data.name.trim() : `Dr. ${data.name.trim()}`;
    const newDoc: DoctorUser = {
      id: `doc-${Date.now()}`,
      name: cleanName,
      qualification: data.qualification.trim() || "M.Sc. Agricultural Sciences",
      specialization: data.specialization || "plant_pathologist",
      institute: data.institute.trim() || "State Agricultural University",
      registrationNo: data.registrationNo?.trim() || `AGRI-DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      experienceYears: data.experienceYears || 5,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      isVerified: true,
      casesResolved: 0,
      rating: 5.0,
      createdAt: new Date().toISOString(),
    };

    try {
      const registered = this.getRegisteredDoctors();
      const updated = [newDoc, ...registered.filter((d) => d.email !== newDoc.email)];
      localStorage.setItem(DOCTOR_REGISTRY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving registered doctor:", e);
    }

    this.setDoctorSession(newDoc);
    return newDoc;
  },

  // Logout
  logout(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(DOCTOR_AUTH_KEY);
      this.notifyChange();
    } catch (e) {
      console.error("Error clearing doctor auth session:", e);
    }
  },

  // Notify listeners
  notifyChange(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("doctorAuthChanged"));
    window.dispatchEvent(new Event("storage"));
  },
};
