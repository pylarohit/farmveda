/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  ShieldCheck,
  MapPin,
  Tag,
  Leaf,
  Sparkles,
  Languages,
  Loader2,
  Flag,
  Trash2,
  Edit3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommunityPost, CommunityComment, CommunityService } from "@/lib/communityService";
import { CommentSection } from "./CommentSection";
import { useLanguage } from "@/context/LanguageProvider";
import { toast } from "react-hot-toast";

interface PostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  onOpenLightbox: (images: string[], index: number) => void;
  onReportPost: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
}

export function PostCard({
  post,
  currentUserId,
  onOpenLightbox,
  onReportPost,
  onDeletePost,
}: PostCardProps) {
  const { lang, langMeta } = useLanguage();

  const [liked, setLiked] = useState(() =>
    currentUserId ? CommunityService.hasUserLiked(post.id, currentUserId) : false
  );
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Translation
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedText, setTranslatedText] = useState<{ title: string; content: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  // AI Discussion Summary
  const [aiSummary, setAiSummary] = useState<string | null>(post.ai_summary || null);
  const [summarizing, setSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const isAuthor = currentUserId && post.user_id === currentUserId;

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => prev + (nextLiked ? 1 : -1));

    if (currentUserId) {
      await CommunityService.toggleLike(post.id, currentUserId);
    }
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && comments.length === 0) {
      setLoadingComments(true);
      try {
        const comms = await CommunityService.getComments(post.id);
        setComments(comms);
      } catch {
        toast.error("Could not load comments");
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (content: string, parentId?: string, imageUrl?: string) => {
    const newComm = await CommunityService.addComment({
      postId: post.id,
      parentId,
      userId: currentUserId || "guest_farmer",
      authorName: currentUserId ? "You" : "Farmer",
      content,
      imageUrl,
    });
    setComments((prev) => [...prev, newComm]);
  };

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedText) {
      setIsTranslated(true);
      return;
    }

    setTranslating(true);
    try {
      const [titleRes, contentRes] = await Promise.all([
        fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: post.title, targetLang: lang || "en" }),
        }),
        fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: post.content, targetLang: lang || "en" }),
        }),
      ]);

      const titleData = await titleRes.json();
      const contentData = await contentRes.json();

      setTranslatedText({
        title: titleData.translatedText || post.title,
        content: contentData.translatedText || post.content,
      });
      setIsTranslated(true);
    } catch {
      toast.error("Translation temporarily unavailable");
    } finally {
      setTranslating(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    if (aiSummary) {
      setShowSummary(true);
      return;
    }

    setSummarizing(true);
    setShowSummary(true);
    try {
      const comms = comments.length > 0 ? comments : await CommunityService.getComments(post.id);

      const res = await fetch("/api/community/ai-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postTitle: post.title,
          postContent: post.content,
          comments: comms,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      }
    } catch {
      toast.error("Could not generate AI summary");
    } finally {
      setSummarizing(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/home/community#${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `Check out this crop problem on FarmVeda Community: ${post.title}`,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(shareUrl);
    toast.success("Post link copied to clipboard!", { icon: "🔗" });
  };

  const formatRelative = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const displayTitle = isTranslated && translatedText ? translatedText.title : post.title;
  const displayContent = isTranslated && translatedText ? translatedText.content : post.content;

  return (
    <article
      id={post.id}
      className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
    >
      {/* ── Post Header: Author, Role, Time, Badges & Menu ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 border-emerald-500/20 shadow-xs shrink-0">
            <Image
              src={post.author_avatar || "/user.png"}
              alt={post.author_name}
              fill
              unoptimized
              className="object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                {post.author_name}
              </span>
              {post.is_verified_expert ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100/90 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>Verified Specialist</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Farmer
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span>{formatRelative(post.created_at)}</span>
              {post.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <MapPin className="w-3 h-3 text-red-500/80 shrink-0" />
                    <span className="truncate max-w-[180px]">{post.location}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="More post options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl p-1 text-xs">
            {isAuthor && onDeletePost && (
              <DropdownMenuItem
                onClick={() => onDeletePost(post.id)}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                <span>Delete Post</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onReportPost(post.id)}
              className="text-slate-700 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5 mr-2" />
              <span>Report Content</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Category & Crop Tags ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
          <Tag className="w-3 h-3 text-emerald-600" />
          <span>{post.category}</span>
        </span>
        {post.crop_type && post.crop_type !== "General" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-0.5 rounded-lg">
            <Leaf className="w-3 h-3 text-amber-600" />
            <span>{post.crop_type}</span>
          </span>
        )}
      </div>

      {/* ── Title & Content ── */}
      <div className="space-y-2">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug font-sora">
          {displayTitle}
        </h2>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-inter">
          {displayContent}
        </p>

        {isTranslated && (
          <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Translated to {langMeta.name || "your preferred language"}</span>
          </p>
        )}
      </div>

      {/* ── Multi-Image Gallery ── */}
      {post.images && post.images.length > 0 && (
        <div className="pt-1">
          {post.images.length === 1 ? (
            <div
              onClick={() => onOpenLightbox(post.images, 0)}
              className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 cursor-zoom-in group shadow-xs"
            >
              <Image
                src={post.images[0]}
                alt="Post crop photo"
                fill
                unoptimized
                className="object-cover group-hover:scale-102 transition-transform duration-300"
              />
            </div>
          ) : post.images.length === 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {post.images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenLightbox(post.images, idx)}
                  className="relative h-44 sm:h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 cursor-zoom-in group shadow-xs"
                >
                  <Image
                    src={img}
                    alt={`Crop photo ${idx + 1}`}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {post.images.slice(0, 3).map((img, idx) => {
                const isThird = idx === 2;
                const remaining = post.images.length - 3;

                return (
                  <div
                    key={idx}
                    onClick={() => onOpenLightbox(post.images, idx)}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 cursor-zoom-in group shadow-xs"
                  >
                    <Image
                      src={img}
                      alt={`Crop photo ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isThird && remaining > 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-lg sm:text-xl">
                        +{remaining}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── AI Discussion Summary Card (Collapsible) ── */}
      {showSummary && (
        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>FarmVeda AI Discussion Summary</span>
            </span>
            <button
              onClick={() => setShowSummary(false)}
              className="text-xs text-indigo-500 hover:text-indigo-800 font-bold cursor-pointer"
            >
              Hide
            </button>
          </div>

          {summarizing ? (
            <div className="flex items-center gap-2 py-3 text-xs text-indigo-600 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing farmer insights and expert advice...</span>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
              {aiSummary}
            </p>
          )}
        </div>
      )}

      {/* ── Action Toolbar: Likes, Comments, AI Tools & Share ── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-slate-600">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like Button */}
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              liked
                ? "bg-rose-50 text-rose-600 border border-rose-200 scale-102"
                : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                liked ? "text-rose-500 fill-rose-500 scale-110" : "text-slate-500"
              }`}
            />
            <span>{likesCount}</span>
          </button>

          {/* Comments Toggle Button */}
          <button
            onClick={handleToggleComments}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showComments
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <span>{post.comments_count || comments.length}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
            title="Share post"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* AI Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* AI Discussion Summary Button */}
          <button
            onClick={handleGenerateSummary}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/60 transition-colors cursor-pointer"
            title="Summarize discussion with AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">AI Summary</span>
          </button>

          {/* Translation Button */}
          <button
            onClick={handleTranslate}
            disabled={translating}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              isTranslated
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
            }`}
            title={isTranslated ? "Show original" : `Translate to ${langMeta.nativeName || "your language"}`}
          >
            {translating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Languages className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isTranslated ? "Original" : langMeta.code?.toUpperCase() || "EN"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Inline Comments Section ── */}
      {showComments && (
        <CommentSection
          postId={post.id}
          comments={comments}
          onAddComment={handleAddComment}
          onReportComment={(commId) => onReportPost(`${post.id}_${commId}`)}
        />
      )}
    </article>
  );
}

