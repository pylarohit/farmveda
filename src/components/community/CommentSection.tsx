/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Send,
  Heart,
  ShieldCheck,
  Languages,
  Reply,
  MoreVertical,
  Flag,
  Sparkles,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommunityComment } from "@/lib/communityService";
import { useLanguage } from "@/context/LanguageProvider";
import { toast } from "react-hot-toast";

interface CommentSectionProps {
  postId: string;
  comments: CommunityComment[];
  onAddComment: (content: string, parentId?: string, imageUrl?: string) => Promise<void>;
  onLikeComment?: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
}

export function CommentSection({
  postId,
  comments,
  onAddComment,
  onLikeComment,
  onReportComment,
}: CommentSectionProps) {
  const { lang, langMeta } = useLanguage();
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommunityComment | null>(null);
  const [commentImage, setCommentImage] = useState<string | null>(null);

  // Translation states: commentId -> translatedText
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  // Local likes tracking
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});

  const handleTranslate = async (comment: CommunityComment) => {
    if (translatedMap[comment.id]) {
      // Toggle back off
      const copy = { ...translatedMap };
      delete copy[comment.id];
      setTranslatedMap(copy);
      return;
    }

    setTranslatingId(comment.id);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: comment.content, targetLang: lang || "en" }),
      });

      if (res.ok) {
        const data = await res.json();
        setTranslatedMap((prev) => ({ ...prev, [comment.id]: data.translatedText || comment.content }));
      } else {
        toast.error("Could not translate comment");
      }
    } catch {
      toast.error("Translation service temporarily busy");
    } finally {
      setTranslatingId(null);
    }
  };

  const handleToggleLike = (commentId: string) => {
    setLikedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
    if (onLikeComment) onLikeComment(commentId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(commentText.trim(), replyingTo?.id, commentImage || undefined);
      setCommentText("");
      setCommentImage(null);
      setReplyingTo(null);
      toast.success("Comment posted!");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const formatRelative = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <div className="space-y-4 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
          <span>Community Discussion</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
            {comments.length}
          </span>
        </h3>
      </div>

      {/* Add Comment Input Card */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {replyingTo && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs text-emerald-800">
            <span className="truncate">
              Replying to <strong>{replyingTo.author_name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-3 shadow-xs">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your practical experience or ask an agronomist..."
            rows={2}
            className="w-full bg-transparent border-0 focus-visible:ring-0 p-0 text-xs sm:text-sm placeholder:text-slate-400 resize-none leading-relaxed"
          />

          {commentImage && (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 mt-2">
              <Image src={commentImage} alt="Attachment" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setCommentImage(null)}
                className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-0.5 rounded-full"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
            <label className="text-slate-400 hover:text-emerald-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold transition-colors">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attach leaf photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = () => setCommentImage(r.result as string);
                    r.readAsDataURL(f);
                  }
                }}
              />
            </label>

            <Button
              type="submit"
              disabled={submitting || !commentText.trim()}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-1.5 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 h-8"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Reply</span>
                  <Send className="w-3 h-3 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {comments.length === 0 ? (
          <div className="text-center py-6 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-medium">Be the first farmer or expert to respond!</p>
          </div>
        ) : (
          comments.map((c) => {
            const isLiked = !!likedComments[c.id];
            const likeCount = (c.likes_count || 0) + (isLiked ? 1 : 0);
            const isTranslated = !!translatedMap[c.id];
            const displayContent = isTranslated ? translatedMap[c.id] : c.content;

            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-2xl transition-all border ${
                  c.is_expert_response
                    ? "bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border-emerald-300/80 shadow-xs ring-1 ring-emerald-400/20"
                    : "bg-white border-slate-200/80 shadow-xs"
                }`}
              >
                {/* Expert Header Badge */}
                {c.is_expert_response && (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2.5 shadow-xs">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Agricultural Doctor Advisory</span>
                  </div>
                )}

                {/* Author Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative shrink-0">
                      <Image
                        src={c.author_avatar || "/user.png"}
                        alt={c.author_name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{c.author_name}</span>
                        {c.is_expert_response && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-semibold">
                            Specialist
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{formatRelative(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions (Translate & Report) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTranslate(c)}
                      disabled={translatingId === c.id}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={isTranslated ? "Show original" : `Translate to ${langMeta.nativeName || "your language"}`}
                    >
                      {translatingId === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                      ) : (
                        <Languages className={`w-3.5 h-3.5 ${isTranslated ? "text-emerald-600" : ""}`} />
                      )}
                    </button>

                    {onReportComment && (
                      <button
                        type="button"
                        onClick={() => onReportComment(c.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Report inappropriate advice"
                      >
                        <Flag className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Body */}
                <div className="mt-2 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line pl-10">
                  {displayContent}
                  {isTranslated && (
                    <span className="block text-[10px] text-emerald-600 font-bold mt-1">
                      ✦ Translated to {langMeta.name || "your language"}
                    </span>
                  )}
                </div>

                {/* Comment Image Attachment */}
                {c.image_url && (
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 mt-2 ml-10">
                    <Image src={c.image_url} alt="Attached photo" fill className="object-cover" />
                  </div>
                )}

                {/* Bottom Actions (Like & Reply) */}
                <div className="flex items-center gap-4 mt-2.5 ml-10 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(c.id)}
                    className="flex items-center gap-1 hover:text-rose-600 transition-colors cursor-pointer font-semibold text-[11px]"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isLiked ? "text-rose-500 fill-rose-500" : "text-slate-400"
                      }`}
                    />
                    <span>{likeCount > 0 ? likeCount : "Helpful"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReplyingTo(c)}
                    className="flex items-center gap-1 hover:text-emerald-700 transition-colors cursor-pointer font-semibold text-[11px]"
                  >
                    <Reply className="w-3 h-3" />
                    <span>Reply</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

