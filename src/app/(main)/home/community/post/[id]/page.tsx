/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Compass } from "lucide-react";
import { CommunityService, CommunityPost } from "@/lib/communityService";
import { PostCard } from "@/components/community/PostCard";
import { ImageLightbox } from "@/components/community/ImageLightbox";
import { ReportModal } from "@/components/community/ReportModal";
import { ExpertShowcase } from "@/components/community/ExpertShowcase";
import { useUserData } from "@/context/UserDataProvider";
import { Button } from "@/components/ui/button";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const router = useRouter();
  const { user } = useUserData();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({
    isOpen: false,
    images: [],
    index: 0,
  });

  useEffect(() => {
    async function loadPost() {
      if (!postId) return;
      setLoading(true);
      try {
        const p = await CommunityService.getPostById(postId);
        setPost(p);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [postId]);

  const handleOpenLightbox = (images: string[], index: number) => {
    setLightbox({ isOpen: true, images, index });
  };

  const handleDeletePost = async (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      await CommunityService.deletePost(id);
      router.push("/home/community");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/home/community"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Community</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Post Column */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading post & verified expert replies...</p>
            </div>
          ) : !post ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <Compass className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Discussion Not Found</h3>
              <p className="text-xs text-slate-500">This post may have been removed or archived.</p>
              <Link href="/home/community">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                  Browse Other Discussions
                </Button>
              </Link>
            </div>
          ) : (
            <PostCard
              post={post}
              currentUserId={user?.id ? String(user.id) : undefined}
              onOpenLightbox={handleOpenLightbox}
              onReportPost={(id) => setReportingPostId(id)}
              onDeletePost={handleDeletePost}
            />
          )}
        </div>

        {/* Right Column: Expert Showcase */}
        <div className="lg:col-span-4 space-y-6">
          <ExpertShowcase />
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        initialIndex={lightbox.index}
        onClose={() => setLightbox({ isOpen: false, images: [], index: 0 })}
      />

      {/* Report Modal */}
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
    </div>
  );
}

