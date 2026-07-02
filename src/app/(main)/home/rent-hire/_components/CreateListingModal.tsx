"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import { toast } from "react-hot-toast";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingListing?: any;
}

export function CreateListingModal({ isOpen, onClose, onSuccess, editingListing }: CreateListingModalProps) {
  const { user } = useUserData();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    type: "rent",
    title: "",
    price: "",
    unit: "/ hr",
    location: ""
  });

  // Re-initialize state when modal opens or editingListing changes
  useEffect(() => {
    if (isOpen) {
      if (editingListing) {
        setFormData({
          type: editingListing.type || "rent",
          title: editingListing.title || "",
          price: editingListing.price ? String(editingListing.price) : "",
          unit: editingListing.unit || "/ hr",
          location: editingListing.location || ""
        });
      } else {
        setFormData({
          type: "rent",
          title: "",
          price: "",
          unit: "/ hr",
          location: ""
        });
      }
      setImageFile(null);
    }
  }, [isOpen, editingListing]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create a listing.");
      return;
    }

    if (!formData.title || !formData.price || !formData.location) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = formData.type === "rent" ? "/rent.jpg" : "/hire.jpg";

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Failed to upload image.");
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const payload = {
        user_id: user.id,
        title: formData.title,
        type: formData.type,
        price: parseFloat(formData.price),
        unit: formData.unit,
        location: formData.location,
        image: imageUrl,
      };

      let error;
      if (editingListing) {
        // Only update image if a new one was uploaded, otherwise keep existing
        if (!imageFile) delete payload.image;
        
        const { error: updateError } = await supabase
          .from("rent_listings")
          .update(payload)
          .eq("id", editingListing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("rent_listings")
          .insert(payload);
        error = insertError;
      }

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      toast.success(editingListing ? "Listing updated successfully!" : "Listing created successfully!");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${editingListing ? 'update' : 'create'} listing. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white dark:bg-[#0A0E1A] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#1E293B] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#1E293B]">
          <h2 className="text-xl font-sora font-bold text-slate-900 dark:text-white">Create a Listing</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          
          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Listing Type</label>
            <div className="flex bg-slate-100 dark:bg-[#131B2C] p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "rent" })}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  formData.type === "rent" 
                    ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Equipment (Rent)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "hire" })}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  formData.type === "hire" 
                    ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Labor (Hire)
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
            <input
              type="text"
              placeholder={formData.type === "rent" ? "e.g. Mahindra Tractor 575 DI" : "e.g. Expert Paddy Harvesters"}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#131B2C] border border-slate-200 dark:border-[#1E293B] rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>

          {/* Price & Unit */}
          <div className="flex gap-4">
            <div className="flex-[2]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Price (₹)</label>
              <input
                type="number"
                placeholder="e.g. 800"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#131B2C] border border-slate-200 dark:border-[#1E293B] rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#131B2C] border border-slate-200 dark:border-[#1E293B] rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              >
                <option value="/ hr">/ hr</option>
                <option value="/ day">/ day</option>
                <option value="/ job">/ job</option>
                <option value="/ acre">/ acre</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
            <input
              type="text"
              placeholder="e.g. Guntur"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#131B2C] border border-slate-200 dark:border-[#1E293B] rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Listing Image (Optional)</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                id="image-upload"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
              />
              <label 
                htmlFor="image-upload"
                className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-[#1E293B] rounded-2xl px-4 py-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#131B2C] transition-colors w-full"
              >
                {imageFile ? imageFile.name : "Choose an image file from device"}
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                  title="Remove Image"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-[#1E6BFF] hover:bg-[#1655D0] text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Publishing..." : "Publish Post"}
          </button>
        </form>

      </div>
    </div>
  );
}
