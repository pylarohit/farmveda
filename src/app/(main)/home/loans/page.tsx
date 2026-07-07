"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, 
  Bookmark, 
  Sprout, 
  ExternalLink, 
  Calendar, 
  Award, 
  CheckCircle2, 
  FileText, 
  Clock,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Scheme {
  id: string;
  title: string;
  provider: string;
  type: "Loan" | "Subsidy" | "Govt Scheme";
  publishDate: string;
  eligibility: string[];
  crops: string[];
  interestRate?: string;
  subsidyRate?: string;
  benefitAmount?: string;
  description: string;
  details: string;
  documents: string[];
  applyLink: string;
  color: string; // Tailwind background color code
}



export default function SchemesPage() {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "benefit"
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Selected scheme for Detail Modal Drawer
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  // API Data Fetching States
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9); // Show 9 initially (multiple of 3)

  // Reset visible count when filters or search change
  useEffect(() => {
    setVisibleCount(9);
  }, [search, selectedTypes, selectedCrops, selectedProviders, showBookmarksOnly, sortBy]);

  // Fetch live schemes and sync with Supabase cache
  useEffect(() => {
    async function loadData() {
      // 1. First, load existing cached schemes from Supabase immediately if any exist
      try {
        const { data, error } = await supabase
          .from("cached_schemes")
          .select("*")
          .order("updated_at", { ascending: false });
        
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            provider: d.provider,
            type: d.type,
            publishDate: d.publish_date,
            eligibility: Array.isArray(d.eligibility) ? d.eligibility : [],
            crops: Array.isArray(d.crops) ? d.crops : [],
            interestRate: d.interest_rate,
            subsidyRate: d.subsidy_rate,
            benefitAmount: d.benefit_amount,
            description: d.description,
            details: d.details,
            documents: Array.isArray(d.documents) ? d.documents : [],
            applyLink: d.apply_link,
            color: d.color
          }));
          setSchemes(mapped);
          setApiLoading(false); // Stop loading animation immediately as we have cached data
        }
      } catch (dbErr) {
        console.warn("Could not load from Supabase cache (table might not exist yet):", dbErr);
      }

      // 2. Fetch fresh new search data in the background
      try {
        const res = await fetch("/api/schemes");
        if (!res.ok) {
          throw new Error(`Server returned code ${res.status}`);
        }
        const freshData = await res.json();
        if (freshData && Array.isArray(freshData) && freshData.length > 0) {
          setSchemes(freshData);
          setApiError(null);
          setIsUsingFallback(false);

          // 3. Write/sync new data to Supabase cached_schemes table
          try {
            // Delete old cached records
            await supabase.from("cached_schemes").delete().neq("id", "dummy");
            
            // Map camelCase to snake_case for DB columns
            const rowsToInsert = freshData.map((s: any) => ({
              id: s.id,
              title: s.title,
              provider: s.provider,
              type: s.type,
              publish_date: s.publishDate,
              eligibility: s.eligibility,
              crops: s.crops,
              interest_rate: s.interestRate || null,
              subsidy_rate: s.subsidyRate || null,
              benefit_amount: s.benefitAmount || null,
              description: s.description,
              details: s.details,
              documents: s.documents,
              apply_link: s.applyLink,
              color: s.color,
              updated_at: new Date().toISOString()
            }));

            const { error: insertErr } = await supabase.from("cached_schemes").insert(rowsToInsert);
            if (insertErr) {
              console.warn("Failed to write to Supabase cache:", insertErr);
            }
          } catch (cacheErr) {
            console.warn("Failed to update cache in Supabase:", cacheErr);
          }
        } else if (freshData && freshData.error) {
          throw new Error(freshData.error);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
        console.error("Failed to load fresh schemes:", err);
        setApiError(err.message || "Failed to fetch live search data");
        toast.error("Failed to fetch fresh live search data.");
      } finally {
        setApiLoading(false);
      }
    }

    loadData();
  }, []);

  // Load bookmarks on mount
  useEffect(() => {
    const saved = localStorage.getItem("bookmarked_schemes");
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading bookmarks", e);
      }
    }
  }, []);

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (bookmarks.includes(id)) {
      updated = bookmarks.filter(b => b !== id);
      toast.success("Removed from saved list");
    } else {
      updated = [...bookmarks, id];
      toast.success("Saved to bookmarks!");
    }
    setBookmarks(updated);
    localStorage.setItem("bookmarked_schemes", JSON.stringify(updated));
  };

  const handleToggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleToggleCrop = (crop: string) => {
    setSelectedCrops(prev => 
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  };

  const handleToggleProvider = (providerKeyword: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerKeyword) ? prev.filter(p => p !== providerKeyword) : [...prev, providerKeyword]
    );
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedTypes([]);
    setSelectedCrops([]);
    setSelectedProviders([]);
    setShowBookmarksOnly(false);
    toast.success("Filters cleared");
  };

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      // 1. Search Query Match
      const matchesSearch = 
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.provider.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.details.toLowerCase().includes(search.toLowerCase());

      // 2. Type Filter Match
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(s.type);

      // 3. Crop Filter Match
      const matchesCrop = selectedCrops.length === 0 || s.crops.some(c => selectedCrops.includes(c));

      // 4. Provider Filter Match
      const matchesProvider = selectedProviders.length === 0 || selectedProviders.some(p => {
        if (p === "Central") return s.provider.toLowerCase().includes("central") || s.provider.toLowerCase().includes("custom") || s.provider.toLowerCase().includes("ministry");
        if (p === "State") return s.provider.toLowerCase().includes("state") || s.provider.toLowerCase().includes("department");
        if (p === "Bank") return s.provider.toLowerCase().includes("bank") || s.provider.toLowerCase().includes("nabard") || s.provider.toLowerCase().includes("credit");
        return false;
      });

      // 5. Bookmarks Only Match
      const matchesBookmarks = !showBookmarksOnly || bookmarks.includes(s.id);

      return matchesSearch && matchesType && matchesCrop && matchesProvider && matchesBookmarks;
    }).sort((a, b) => {
      if (sortBy === "benefit") {
        // Simple heuristic: Subsidy/Coverage items at top
        const score = (x: Scheme) => {
          if (x.type === "Subsidy") return 3;
          if (x.type === "Govt Scheme") return 2;
          return 1;
        };
        return score(b) - score(a);
      }
      return schemes.indexOf(a) - schemes.indexOf(b);
    });
  }, [schemes, search, selectedTypes, selectedCrops, selectedProviders, showBookmarksOnly, bookmarks, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-inter">
      
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sora">
          Loans, Schemes & Subsidies
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Explore financial aid, low-interest crop credit, solar pump subsidies, and income support schemes available to you.
        </p>
      </div>

      {/* DASHBOARD COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: ASSISTANCE AD & FILTERS */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-[96px] lg:self-start">
          
          {/* Neon-Brutalist Assistance Ad Card */}
          <div className="bg-[#0A0E1A] text-white rounded-3xl p-6 border-2 border-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-[260px] relative overflow-hidden">
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xl font-black font-sora leading-tight tracking-wide">
                  Get the Best Schemes with Farmveda
                </h2>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-semibold">
                  Unsure which subsidy applies to your crop? Talk to our local agriculture consultant.
                </p>
              </div>
              <button 
                onClick={() => toast.success("Our advisor will reach out to you within 24 hours!")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md w-fit border border-blue-500"
              >
                Request Support
              </button>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <Sprout className="h-44 w-44 text-emerald-400 rotate-12" />
            </div>
          </div>

          {/* Neo-Brutalist Filter Block */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl shadow-[3px_3px_0px_rgba(15,23,42,1)] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base font-sora">Filters</h3>
              <button 
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Clear All
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search schemes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            {/* Bookmarks Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox"
                id="bookmarksOnly"
                checked={showBookmarksOnly}
                onChange={(e) => setShowBookmarksOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-350 text-blue-650 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="bookmarksOnly" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                Saved Schemes Only
              </label>
            </div>

            {/* Scheme Type */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Scheme Type</span>
              <div className="space-y-1.5">
                {["Loan", "Subsidy", "Govt Scheme"].map((type) => (
                  <label key={type} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => handleToggleType(type)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {type === "Govt Scheme" ? "Govt Schemes" : type === "Subsidy" ? "Subsidies" : "Loans"}
                  </label>
                ))}
              </div>
            </div>

            {/* Crop Eligibility */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Crop Eligibility</span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {["Paddy", "Cotton", "Wheat", "Sugarcane", "Horticulture", "General"].map((crop) => (
                  <label key={crop} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedCrops.includes(crop)}
                      onChange={() => handleToggleCrop(crop)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {crop === "General" ? "Any Crop (General)" : crop}
                  </label>
                ))}
              </div>
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Provider Agency</span>
              <div className="space-y-1.5">
                {[
                  { key: "Central", label: "Central Government" },
                  { key: "State", label: "State Government" },
                  { key: "Bank", label: "NABARD / Banks" }
                ].map((p) => (
                  <label key={p.key} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedProviders.includes(p.key)}
                      onChange={() => handleToggleProvider(p.key)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: MAIN CONTENT & LIST */}
        <div className="lg:col-span-3 space-y-4">

          {/* Subheader info & Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] rounded-2xl">
            <div className="flex items-center gap-3 font-bold text-slate-800 text-sm flex-wrap">
              <span>Recommended Schemes</span>
              <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-black">
                {filteredSchemes.length}
              </span>
              {!apiLoading && (
                isUsingFallback ? (
                  <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                    ⚠️ Offline Data
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-emerald-600 animate-pulse" />
                    Live Google Search Data
                  </span>
                )
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-650 ml-auto sm:ml-0">
              <span className="text-slate-400 uppercase text-[10px]">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="benefit">High Benefit Subsidies</option>
              </select>
            </div>
          </div>

          {/* Grid list of schemes */}
          {apiLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-slate-100/80 rounded-3xl p-5 border-2 border-slate-200 h-[250px] animate-pulse flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-slate-200 h-4.5 w-20 rounded-full" />
                    <div className="bg-slate-200 h-7 w-7 rounded-full" />
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="bg-slate-200 h-3 w-16 rounded" />
                    <div className="bg-slate-200 h-5 w-full rounded" />
                    <div className="bg-slate-200 h-3.5 w-4/5 rounded" />
                  </div>
                  <div className="space-y-2 pt-4">
                    <div className="flex gap-1">
                      <div className="bg-slate-200 h-4.5 w-12 rounded" />
                      <div className="bg-slate-200 h-4.5 w-16 rounded" />
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between items-center">
                      <div className="bg-slate-200 h-4.5 w-24 rounded" />
                      <div className="bg-slate-200 h-7 w-16 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSchemes.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSchemes.slice(0, visibleCount).map((scheme) => {
                const isBookmarked = bookmarks.includes(scheme.id);

                return (
                  <div 
                    key={scheme.id}
                    onClick={() => setSelectedScheme(scheme)}
                    className={`${scheme.color} rounded-3xl p-5 border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] flex flex-col justify-between hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer min-h-[250px] relative`}
                  >
                    
                    {/* Header Row: Date & Save Icon */}
                    <div className="flex justify-between items-start">
                      <div className="bg-slate-900 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {scheme.publishDate}
                      </div>
                      
                      <button 
                        onClick={(e) => handleToggleBookmark(scheme.id, e)}
                        className="p-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-900 shadow-[1px_1px_0px_rgba(15,23,42,1)] text-slate-900 cursor-pointer transition-colors"
                      >
                        <Bookmark className={`h-4.5 w-4.5 ${isBookmarked ? "fill-slate-900 text-slate-900" : "text-slate-550"}`} />
                      </button>
                    </div>

                    {/* Middle: Title & Provider */}
                    <div className="my-4 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        {scheme.provider}
                      </span>
                      <h3 className="font-extrabold text-slate-900 font-sora text-xl leading-tight">
                        {scheme.title}
                      </h3>
                      <p className="text-xs text-slate-655 line-clamp-2 leading-relaxed font-semibold">
                        {scheme.description}
                      </p>
                    </div>

                    {/* Bottom: Type/Crop Badges & Info */}
                    <div className="space-y-3">
                      
                      {/* Pill Badges */}
                      <div className="flex flex-wrap gap-1">
                        <span className="bg-white border border-slate-300 text-slate-650 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                          {scheme.type}
                        </span>
                        {scheme.crops.slice(0, 2).map(crop => (
                          <span key={crop} className="bg-slate-900/5 text-slate-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                            {crop === "General" ? "All Crops" : crop}
                          </span>
                        ))}
                      </div>

                      <hr className="border-slate-300/40" />

                      {/* Footer: Financial Rate & Details Button */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-slate-900">
                          <TrendingUp className="h-4 w-4 text-emerald-700" />
                          <span className="text-xs font-black tracking-wider font-sora uppercase">
                            {scheme.interestRate || scheme.subsidyRate || scheme.benefitAmount}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedScheme(scheme)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black px-4 py-1.5 rounded-lg border border-slate-900 transition-colors shadow-[1px_1px_0px_rgba(15,23,42,1)] cursor-pointer"
                        >
                          Details
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
              </div>

              {visibleCount < filteredSchemes.length && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 9)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm py-3 px-8 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-12 text-center rounded-3xl">
              <Award className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-base font-extrabold text-slate-800">No Matching Schemes Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No financial aids or subsidies match your active filter selections. Clear filters to explore all entries.
              </p>
              <button 
                onClick={handleResetFilters}
                className="mt-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}

        </div>

      </div>

      {/* --- SCHEME DETAILS POPUP MODAL DRAWER --- */}
      {selectedScheme && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 flex items-center justify-between text-white border-b-2 border-slate-900 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">
                  {selectedScheme.provider}
                </span>
                <h3 className="text-base font-extrabold font-sora truncate max-w-[320px]">
                  {selectedScheme.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedScheme(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700 font-semibold leading-relaxed flex-1">
              
              {/* Type, crop, and financial header block */}
              <div className={`p-4 rounded-xl border-2 border-slate-900 ${selectedScheme.color} flex justify-between items-center`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Interest Rate / Aid Amount:</span>
                  <span className="text-lg font-black text-slate-900 font-sora">
                    {selectedScheme.interestRate || selectedScheme.subsidyRate || selectedScheme.benefitAmount}
                  </span>
                </div>
                <div className="bg-slate-900 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg border border-slate-900 shadow-[1.5px_1.5px_0px_rgba(15,23,42,1)]">
                  {selectedScheme.type}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">About the Scheme</h4>
                <p className="text-slate-650 leading-relaxed">
                  {selectedScheme.details}
                </p>
              </div>

              {/* Eligibility */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Who can apply?</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedScheme.eligibility.map(item => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                  {selectedScheme.crops.map(item => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <Sprout className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="truncate">{item === "General" ? "Any Crop Eligible" : `${item} Cultivation`}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Required */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Documents Needed</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 pl-1">
                  {selectedScheme.documents.map(doc => (
                    <li key={doc} className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex gap-3 shrink-0">
              <button 
                onClick={(e) => {
                  handleToggleBookmark(selectedScheme.id, e);
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-extrabold text-sm text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Bookmark className={`h-4.5 w-4.5 ${bookmarks.includes(selectedScheme.id) ? "fill-slate-900 text-slate-900" : "text-slate-400"}`} />
                <span>{bookmarks.includes(selectedScheme.id) ? "Saved" : "Save Scheme"}</span>
              </button>

              <a 
                href={selectedScheme.applyLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 border border-blue-600"
              >
                <span>Apply Online</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
