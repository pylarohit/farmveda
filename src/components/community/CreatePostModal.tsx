/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  UploadCloud,
  X,
  Sparkles,
  MapPin,
  Leaf,
  Loader2,
  Tag,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMUNITY_CATEGORIES, POPULAR_CROPS } from "@/lib/communityService";
import { toast } from "react-hot-toast";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: {
    title: string;
    content: string;
    category: string;
    cropType: string;
    location: string;
    images: string[];
  }) => Promise<void>;
  defaultLocation?: string;
  defaultCrop?: string;
}

export function CreatePostModal({
  isOpen,
  onClose,
  onSubmit,
  defaultLocation = "",
  defaultCrop = "General",
}: CreatePostModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Crop Diseases");
  const [cropType, setCropType] = useState(defaultCrop);
  const [location, setLocation] = useState(defaultLocation);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      toast.error("You can upload up to 5 crop images per post");
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Image ${file.name} is larger than 5MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // AI Auto-suggest Category & Crop Tags
  const handleAiSuggest = async () => {
    if (!title && !content) {
      toast.error("Write your problem or question first to get AI suggestions!");
      return;
    }

    setAiSuggesting(true);
    try {
      const res = await fetch("/api/community/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.category) setCategory(data.category);
        if (data.cropType) setCropType(data.cropType);
        toast.success(
          `AI suggested Category: "${data.category}" & Crop: "${data.cropType}"`,
          { icon: "✨" }
        );
      }
    } catch (err) {
      console.warn("AI suggestion error:", err);
      toast.error("Could not generate AI suggestions");
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both a title and description for your post");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category,
        cropType,
        location: location.trim() || "India",
        images,
      });

      toast.success("Post published to FarmVeda Community!");
      // Reset form
      setTitle("");
      setContent("");
      setImages([]);
      onClose();
    } catch (err: any) {
      console.error("Error creating post:", err);
      toast.error(err.message || "Failed to publish post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto custom-scrollbar border-slate-200">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Leaf className="w-5 h-5" />
              </span>
              <DialogTitle className="text-xl font-bold text-slate-900 font-sora">
                Ask Farmers & Crop Experts
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Share crop issues, pest symptoms, or farming successes. Community experts and fellow farmers will help!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Post Title */}
          <div className="space-y-1.5">
            <Label htmlFor="post-title" className="text-xs font-bold text-slate-700">
              Post Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spindle brown spots on my rice leaves after rains"
              className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-sm font-medium focus:bg-white"
              maxLength={120}
              required
            />
          </div>

          {/* Post Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-content" className="text-xs font-bold text-slate-700">
                Detailed Description <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={aiSuggesting || (!title && !content)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiSuggesting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                )}
                <span>Auto-tag with AI</span>
              </button>
            </div>
            <Textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe what crop you are growing, visible leaf/stem symptoms, soil moisture, what fertilizers were applied, and your village/location..."
              rows={4}
              className="rounded-xl bg-slate-50/70 border-slate-200 text-sm focus:bg-white leading-relaxed resize-none"
              required
            />
          </div>

          {/* Category & Crop Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Topic Category</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm font-semibold">
                  <SelectValue placeholder="Select topic category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {COMMUNITY_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs sm:text-sm font-medium">
                      <span className="mr-2">{cat.icon}</span>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Crop Type Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>Crop Type</span>
              </Label>
              <Select value={cropType} onValueChange={setCropType}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm font-semibold">
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {POPULAR_CROPS.map((crop) => (
                    <SelectItem key={crop} value={crop} className="text-xs sm:text-sm font-medium">
                      {crop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location Input */}
          <div className="space-y-1.5">
            <Label htmlFor="post-location" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Location / District (Optional)</span>
            </Label>
            <Input
              id="post-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Srungavaram, Tuni, Visakhapatnam"
              className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm focus:bg-white"
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Upload Crop Photos (Up to 5 images)</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {images.length}/5 photos
              </span>
            </Label>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              multiple
              accept="image/*"
              className="hidden"
            />

            {/* Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pb-2">
                {images.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-xs"
                  >
                    <Image
                      src={imgSrc}
                      alt={`Upload preview ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition-colors cursor-pointer shadow-sm"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-5 h-5" />
                    <span className="text-[10px] font-bold">+ Add Photo</span>
                  </button>
                )}
              </div>
            )}

            {/* Initial Empty Upload Box */}
            {images.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5 transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 group-hover:text-emerald-800">
                  Click to upload leaf, field, or crop pictures
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Clear pictures help other farmers & doctors identify problems faster (PNG, JPG up to 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Dialog Actions */}
          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-5 h-11 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl px-6 h-11 shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish to Community"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

