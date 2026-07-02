"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight, Heart, MoreHorizontal, Clock, Calendar, CheckCircle2, ShieldCheck, MapPin, Plus, Activity, TrendingUp, Flame, Loader2, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import RentHireSlider from "./_components/RentHireSlider";
import { CreateListingModal } from "./_components/CreateListingModal";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import { toast } from "react-hot-toast";

export default function RentAndHirePage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [activityTab, setActivityTab] = useState<"posts" | "connections">("posts");
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { user } = useUserData();

  const filteredListings = listings.filter(item => {
    // Hide the user's own posts from the general feed
    if (user && String(item.user_id) === String(user.id)) return false;

    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rent_listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  const fetchConnections = async () => {
    if (!user) return;
    setConnectionsLoading(true);

    const { data: messages, error } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && messages) {
      const contactIds = new Set<string>();
      messages.forEach(m => {
        if (m.sender_id !== String(user.id)) contactIds.add(m.sender_id);
        if (m.receiver_id !== String(user.id)) contactIds.add(m.receiver_id);
      });

      if (contactIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, userName, avatar')
          .in('id', Array.from(contactIds));

        if (users) {
          setConnections(users);
        }
      }
    }
    setConnectionsLoading(false);
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    const { error } = await supabase.from('rent_listings').delete().eq('id', id);
    if (!error) {
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success("Listing deleted.");
    } else {
      console.error("Delete Error:", error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (user) fetchConnections();
  }, [user]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-100px)] flex flex-col">

      <div className="flex flex-col lg:flex-row items-start justify-between gap-6 h-full pb-0">

        {/* ── LEFT COLUMN (Widgets) ── */}
        <div className="w-full lg:w-[340px] lg:flex-shrink-0 flex flex-col gap-4 h-full">

          {/* Create Post Box */}
          <div className="bg-white dark:bg-[#0A0E1A] rounded-[24px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-[#1E293B] flex flex-col items-center justify-center text-center gap-2 group">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-full text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-sora font-black text-slate-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Create a Listing</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Have equipment or skills to offer? Post them here.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-[#1E6BFF] hover:bg-[#1655D0] text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-blue-500/30 active:scale-95 overflow-hidden relative"
            >
              <span className="relative z-10">Create Post</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            </button>
          </div>

          {/* Activity Box */}
          <div className="bg-white dark:bg-[#0A0E1A] rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all border border-slate-100 dark:border-[#1E293B] flex flex-col h-[450px] group/box">
            <h3 className="font-sora font-black text-slate-900 dark:text-white text-xl flex items-center justify-between mb-4 group-hover/box:text-slate-800 dark:group-hover/box:text-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <Activity size={22} className="text-[#D3F36B] drop-shadow-sm" />
                Your Activity
              </div>
            </h3>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 dark:bg-[#1E293B] p-1 rounded-xl mb-4">
              <button
                onClick={() => setActivityTab('posts')}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${activityTab === 'posts' ? 'bg-white dark:bg-[#0A0E1A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                My Posts
              </button>
              <button
                onClick={() => setActivityTab('connections')}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${activityTab === 'connections' ? 'bg-white dark:bg-[#0A0E1A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Connections
              </button>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {activityTab === 'posts' ? (
                <>
                  {listings.filter(l => String(l.user_id) === String(user?.id)).length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-4">You haven't posted anything yet.</div>
                  ) : (
                    listings.filter(l => String(l.user_id) === String(user?.id)).map((post, idx) => (
                      <div key={idx} className="flex gap-2 p-3 -mx-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#131B2C] transition-colors group/item">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0 ring-4 ring-emerald-50 dark:ring-emerald-900/20 group-hover/item:scale-125 group-hover/item:bg-emerald-600 transition-all duration-300"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors truncate">Posted "{post.title}"</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingListing(post);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteListing(post.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {connectionsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin text-blue-500" size={20} />
                    </div>
                  ) : connections.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-4">No connections yet.</div>
                  ) : (
                    connections.map((conn, idx) => (
                      <div key={idx} className="flex gap-4 p-3 -mx-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#131B2C] transition-colors cursor-pointer group/item">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 ring-4 ring-blue-50 dark:ring-blue-900/20 group-hover/item:scale-125 group-hover/item:bg-blue-600 transition-all duration-300"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors truncate">Connected with {conn.userName || 'Farmer'}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Farmer</p>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN (Main Content) ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 w-full h-full overflow-y-auto pr-2 pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* ── Top Banner / Advertisement Section ── */}
          <RentHireSlider />

          {/* ── Listings Grid Section ── */}
          <div className="flex flex-col gap-6">

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h2 className="text-2xl font-black font-sora text-slate-900 dark:text-white flex items-center gap-3">
                {activeTab === 'all' ? 'All Listings' : activeTab === 'rent' ? 'For Rent' : 'For Hire'}
                <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-[#1E293B] text-slate-500 px-2.5 py-1 rounded-full">
                  {filteredListings.length} Available
                </Badge>
              </h2>

              <div className="bg-slate-100 dark:bg-[#1E293B] p-1 rounded-xl flex items-center gap-1 overflow-x-auto">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-white dark:bg-[#0A0E1A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>All</button>
                <button onClick={() => setActiveTab('rent')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'rent' ? 'bg-white dark:bg-[#0A0E1A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>For Rent</button>
                <button onClick={() => setActiveTab('hire')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'hire' ? 'bg-white dark:bg-[#0A0E1A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>For Hire</button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-20 flex justify-center items-center">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500 font-medium">
                  No listings found for this category.
                </div>
              ) : filteredListings.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-[#0A0E1A] rounded-[20px] p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-[#1E293B] flex flex-col group hover:-translate-y-1">

                  {/* Card Image */}
                  <div className="relative w-full h-[160px] rounded-[14px] overflow-hidden mb-3 bg-slate-100">
                    <Image src={item.image || '/rent.jpg'} alt={item.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={idx < 6} className="object-cover group-hover:scale-105 transition-transform duration-700" />

                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-900 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-white shadow-sm transition-colors">
                      <Heart size={14} className={item.liked ? "fill-red-500 text-red-500" : "text-slate-400"} />
                    </div>

                    <div className="absolute bottom-3 left-3">
                      <div className="bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wide">
                        {item.type === 'rent' ? 'Equipment' : 'Labor'}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-col flex-1 px-1">
                    {/* Location */}
                    <div className="flex items-center gap-1.5 mb-1.5 text-slate-500 dark:text-slate-400">
                      <MapPin size={12} />
                      <span className="text-[10px] font-semibold tracking-wide uppercase">{item.location}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-base text-slate-900 dark:text-white font-sora leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Price */}
                    <div className="flex items-end gap-1 mb-3 mt-auto">
                      <p className="font-black text-slate-900 dark:text-white text-xl leading-none">₹{Number(item.price).toLocaleString()}</p>
                      <span className="text-xs text-slate-500 font-medium font-inter mb-0.5">/ {item.unit}</span>
                    </div>

                    {/* Button */}
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          listingId: item.id || '',
                          title: item.title || '',
                          price: item.price || '',
                          unit: item.unit || '',
                          image: item.image || '',
                          type: item.type || '',
                          farmerId: item.user_id || 'farmer123',
                          farmerName: item.user_name || 'Local Farmer'
                        });
                        router.push(`/home/message?${params.toString()}`);
                      }}
                      className={`w-full text-white font-bold py-2.5 rounded-xl text-sm shadow-sm transition-all active:scale-95 ${item.type === 'rent'
                        ? 'bg-[#1E6BFF] hover:bg-[#1655D0] shadow-blue-500/20'
                        : 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-slate-900/20'
                        }`}
                    >
                      {item.type === 'rent' ? 'Rent Now' : 'Book Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CreateListingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingListing(null);
        }}
        editingListing={editingListing}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingListing(null);
          fetchListings();
        }}
      />
    </div>
  );
}
