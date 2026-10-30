/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Users,
  Sparkles,
  MessageCircle,
  Plus,
  Compass,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  HelpCircle,
  FileText,
  RotateCcw,
} from "lucide-react";
import {
  CommunityService,
  CommunityPost,
  CommunityNotification,
} from "@/lib/communityService";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CategoryBar } from "@/components/community/CategoryBar";
import { FeedFilterBar } from "@/components/community/FeedFilterBar";
import { PostCard } from "@/components/community/PostCard";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { ImageLightbox } from "@/components/community/ImageLightbox";
import { ReportModal } from "@/components/community/ReportModal";
import { CommunityNotificationsModal } from "@/components/community/CommunityNotificationsModal";
import { ExpertShowcase } from "@/components/community/ExpertShowcase";
import { useUserData } from "@/context/UserDataProvider";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/button";

export default function CommunityPage() {
  const { user } = useUserData();
  const { t } = useLanguage();

  // Feed Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCrop, setSelectedCrop] = useState<string>("All Crops");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sort, setSort] = useState<"latest" | "popular" | "expert">("latest");
  const [onlyMyPosts, setOnlyMyPosts] = useState<boolean>(false);
  const [nearbyActive, setNearbyActive] = useState<boolean>(false);

  // Data States
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  // Lightbox
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({
    isOpen: false,
    images: [],
    index: 0,
  });

  // Load Posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const locationQuery = nearbyActive
        ? (user as any)?.district || (user as any)?.state || undefined
        : undefined;

      const data = await CommunityService.getPosts({
        category: selectedCategory,
        cropType: selectedCrop,
        search: searchQuery,
        sort,
        onlyUser: onlyMyPosts,
        userId: user?.id ? String(user.id) : undefined,
        locationQuery,
      });
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, selectedCrop, searchQuery, sort, onlyMyPosts, nearbyActive, user?.id]);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsub = CommunityService.subscribe(() => {
      fetchPosts();
      if (user?.id) {
        setNotifications(CommunityService.getNotifications(String(user.id)));
      }
    });
    return () => unsub();
  }, [user?.id, selectedCategory, selectedCrop, searchQuery, sort, onlyMyPosts, nearbyActive]);

  // Load Notifications
  useEffect(() => {
    if (user?.id) {
      setNotifications(CommunityService.getNotifications(String(user.id)));
    }
  }, [user?.id]);

  const unreadNotifsCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleCreatePost = async (postData: {
    title: string;
    content: string;
    category: string;
    cropType: string;
    location: string;
    images: string[];
  }) => {
    await CommunityService.createPost({
      userId: user?.id ? String(user.id) : "farmer_user",
      authorName: user?.userName || "Farmer",
      authorAvatar: user?.avatar || undefined,
      authorRole: "farmer",
      ...postData,
    });
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      await CommunityService.deletePost(postId);
      fetchPosts();
    }
  };

  const handleOpenLightbox = (images: string[], index: number) => {
    setLightbox({ isOpen: true, images, index });
  };

  const handleMarkAllRead = () => {
    if (user?.id) {
      notifications.forEach((n) =>
        CommunityService.markNotificationRead(n.id, String(user.id))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const userLocationString = [
    (user as any)?.village,
    (user as any)?.district,
    (user as any)?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-sans">
      {/* ── Community Main Header ── */}
      <CommunityHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateClick={() => setIsCreateOpen(true)}
        onNotificationsClick={() => setIsNotifsOpen(true)}
        unreadNotificationsCount={unreadNotifsCount}
      />

      {/* ── Topic Categories Scroll Bar ── */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* ── Feed Filter Toolbar ── */}
      <FeedFilterBar
        sort={sort}
        onSortChange={setSort}
        selectedCrop={selectedCrop}
        onCropChange={setSelectedCrop}
        onlyMyPosts={onlyMyPosts}
        onToggleMyPosts={setOnlyMyPosts}
        nearbyActive={nearbyActive}
        onToggleNearby={() => setNearbyActive(!nearbyActive)}
      />

      {/* ── Main 2-Column Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Feed Posts (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Quick Ask Composer Card */}
          <div
            onClick={() => setIsCreateOpen(true)}
            className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative shrink-0">
              <Image
                src={user?.avatar || "/user.png"}
                alt={user?.userName || "You"}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-500 font-medium group-hover:bg-emerald-50/40 group-hover:text-emerald-800 transition-colors">
              Have a crop problem or farming question? Ask fellow farmers & doctors...
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-bold shrink-0 hidden sm:flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post</span>
            </Button>
          </div>

          {/* Active Filter Indicators */}
          {(selectedCategory !== "all" ||
            selectedCrop !== "All Crops" ||
            searchQuery ||
            onlyMyPosts ||
            nearbyActive) && (
            <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 px-4 py-2.5 rounded-2xl text-xs text-emerald-900 font-medium">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Filtering by:</span>
                {selectedCategory !== "all" && (
                  <span className="bg-white font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                    Category: {selectedCategory}
                  </span>
                )}
                {selectedCrop !== "All Crops" && (
                  <span className="bg-white font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                    Crop: {selectedCrop}
                  </span>
                )}
                {onlyMyPosts && (
                  <span className="bg-white font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                    My Posts
                  </span>
                )}
                {nearbyActive && (
                  <span className="bg-white font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                    Nearby Districts
                  </span>
                )}
                {searchQuery && (
                  <span className="bg-white font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedCrop("All Crops");
                  setSearchQuery("");
                  setOnlyMyPosts(false);
                  setNearbyActive(false);
                }}
                className="text-xs font-bold text-emerald-800 hover:underline shrink-0 ml-2 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}

          {/* Posts Feed */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-slate-200 rounded-md w-36" />
                      <div className="h-3 bg-slate-100 rounded-md w-24" />
                    </div>
                  </div>
                  <div className="h-5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-16 bg-slate-100 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-sora">
                No Community Discussions Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No posts match your selected filter criteria. Be the first farmer to start this conversation!
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 text-xs font-bold cursor-pointer"
              >
                Create a Discussion Post
              </Button>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id ? String(user.id) : undefined}
                onOpenLightbox={handleOpenLightbox}
                onReportPost={(postId) => setReportingPostId(postId)}
                onDeletePost={handleDeletePost}
              />
            ))
          )}
        </div>

        {/* Right Column: Expert Showcase & Community Guidelines (4 Columns) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* Verified Agri Specialists Directory */}
          <ExpertShowcase />

          {/* Community Guidelines Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-amber-700" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 font-sora">
                Farmer Community Rules
              </h3>
            </div>

            <ul className="text-xs text-slate-600 space-y-2.5 font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Accurate Photos:</strong> Attach clear photos of the leaf, stem, or field for precise identification.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Verified Prescriptions:</strong> Only verified doctors provide certified chemical pesticide dosages.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Kisan Brotherhood:</strong> Be supportive of novice farmers. Share traditional & organic successes.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Modals & Overlays ── */}
      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreatePost}
        defaultLocation={userLocationString}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        initialIndex={lightbox.index}
        onClose={() => setLightbox({ isOpen: false, images: [], index: 0 })}
      />

      {/* Report Post Modal */}
      {reportingPostId && (
        <ReportModal
          isOpen={!!reportingPostId}
          onClose={() => setReportingPostId(null)}
          postId={reportingPostId}
          onSubmitReport={async (reportData) => {
            await CommunityService.reportPost({
              ...reportData,
              reporterId: user?.id ? String(user.id) : "anonymous_reporter",
            });
          }}
        />
      )}

      {/* Notifications Modal */}
      <CommunityNotificationsModal
        isOpen={isNotifsOpen}
        onClose={() => setIsNotifsOpen(false)}
        notifications={notifications}
        onNotificationClick={(notif) => {
          setIsNotifsOpen(false);
          if (user?.id) {
            CommunityService.markNotificationRead(notif.id, String(user.id));
          }
          if (notif.post_id) {
            const el = document.getElementById(notif.post_id);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }
        }}
        onMarkAllRead={handleMarkAllRead}
      />
    </div>
  );
}

