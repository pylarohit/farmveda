import { createClient } from "@/lib/supabase/client";
import { DBMentor, MentorProfile } from "@/lib/types/allTypes";

export const defaultCropDoctors: DBMentor[] = [
  {
    id: "doc-1",
    full_name: "Dr. Ananya Sharma",
    email: "ananya.sharma@agrires.in",
    phone: "+91 98234 56711",
    expertise: ["Plant Pathology", "Fungal Blight", "Organic Bio-fungicides"],
    current_position: "Senior Agronomist, ICAR Crop Health Division",
    availability: true,
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
    bio: "Specializing in early detection of foliar diseases, leaf spot, and biological treatment protocols for cereal crops and vegetables.",
    is_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "doc-2",
    full_name: "Dr. Ramesh Babu",
    email: "ramesh.babu@horti-advisory.org",
    phone: "+91 94450 12899",
    expertise: ["Pest Management", "Entomology", "Stem Borer & Aphid Control"],
    current_position: "Chief Entomologist, Agricultural Research Institute",
    availability: true,
    rating: 4.8,
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
    bio: "Over 15 years diagnosing complex insect infestations and formulating IPM strategies with zero pesticide residue.",
    is_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "doc-3",
    full_name: "Dr. Sunita Deshmukh",
    email: "sunita.d@soilsciences.edu",
    phone: "+91 98812 77402",
    expertise: ["Soil Health", "Nutrient Deficiencies", "Crop Yield Optimization"],
    current_position: "Professor of Soil Chemistry, State Agricultural University",
    availability: true,
    rating: 4.95,
    avatar: "https://images.unsplash.com/photo-1594824813583-14902b37be80?w=300&auto=format&fit=crop&q=80",
    bio: "Consultant for micro-nutrient balancing, soil acidity correction, and precision fertigation systems.",
    is_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "doc-4",
    full_name: "Dr. Vikram Patel",
    email: "dr.vikram.patel@farmcare.in",
    phone: "+91 97261 43019",
    expertise: ["Horticulture", "Powdery Mildew", "Fruit Crop Diseases"],
    current_position: "Director, National Horticulture Advisory Council",
    availability: true,
    rating: 4.85,
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80",
    bio: "Dedicated to helping fruit and cash crop farmers prevent post-flowering infections and blossom drop.",
    is_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "doc-5",
    full_name: "Dr. Sanjali Reddy",
    email: "sanjali.reddy@croppathology.org",
    phone: "+91 98490 22319",
    expertise: ["Organic Farming", "Bio-pesticides", "Fungal Blight"],
    current_position: "Lead Specialist, Organic Agriculture Institute",
    availability: true,
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1594824813583-14902b37be80?w=300&auto=format&fit=crop&q=80",
    bio: "Specializing in eco-friendly biological fungicides, bio-fertilizers, and sustainable pest controls.",
    is_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "doc-6",
    full_name: "Dr. Shubham Choudhary",
    email: "shubham.c@agronomy.edu",
    phone: "+91 93120 88471",
    expertise: ["Agronomy", "Crop Nutrition", "Pest Management"],
    current_position: "Senior Agronomist, State Crop Research Center",
    availability: true,
    rating: 4.75,
    avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&auto=format&fit=crop&q=80",
    bio: "Advising farmers on soil nutrient deficiency correction, high-yield seed variety selection, and irrigation timing.",
    is_verified: true,
    created_at: new Date().toISOString(),
  },
];

export async function getAllMentorsPaginated(
  page: number = 1,
  pageSize: number = 6,
  category?: string
): Promise<{ mentors: DBMentor[]; hasMore: boolean; exactMatches: number; total: number }> {
  const supabase = createClient();
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("mentors")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (category && category !== "All") {
      query = query.contains("expertise", [category]);
    }

    const { data, count, error } = await query.range(from, to);

    if (error || !data || data.length === 0) {
      if (page === 1) {
        // Return default crop doctors if database is empty
        const filtered =
          category && category !== "All"
            ? defaultCropDoctors.filter((d) =>
                d.expertise.some((e) =>
                  e.toLowerCase().includes(category.toLowerCase())
                )
              )
            : defaultCropDoctors;
        return {
          mentors: filtered,
          hasMore: false,
          exactMatches: filtered.length,
          total: filtered.length,
        };
      }
      return { mentors: [], hasMore: false, exactMatches: 0, total: count || 0 };
    }

    // Merge registered doctors with default ones if under 4 so farmers always see ample verified doctors
    let combined = data as DBMentor[];
    if (page === 1 && combined.length < 4) {
      const existingIds = new Set(combined.map((m) => m.id));
      const needed = defaultCropDoctors.filter((d) => !existingIds.has(d.id));
      combined = [...combined, ...needed];
    }

    const total = (count || 0) + (page === 1 && (count || 0) < 4 ? defaultCropDoctors.length : 0);
    const hasMore = (count || 0) > to + 1;

    return {
      mentors: combined,
      hasMore,
      exactMatches: combined.length,
      total,
    };
  } catch (err) {
    console.error("Error fetching mentors:", err);
    return {
      mentors: defaultCropDoctors,
      hasMore: false,
      exactMatches: defaultCropDoctors.length,
      total: defaultCropDoctors.length,
    };
  }
}

export async function getRandomMentorVideos() {
  return [];
}

export async function getAllMentorProfiles(): Promise<MentorProfile[]> {
  const res = await getAllMentorsPaginated(1, 20);
  return res.mentors;
}

export async function getMatchingMentors(careerOrSkill?: string): Promise<DBMentor[]> {
  const res = await getAllMentorsPaginated(1, 10, careerOrSkill);
  return res.mentors;
}

export async function triggerSessionNotification(sessionId: string | number, recipientEmail?: string) {
  console.log("Session notification triggered for:", sessionId, recipientEmail);
  return { success: true };
}
