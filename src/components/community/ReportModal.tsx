"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  commentId?: string;
  onSubmitReport: (data: {
    postId: string;
    commentId?: string;
    reason: string;
    details?: string;
  }) => Promise<void>;
}

const REPORT_REASONS = [
  { id: "misleading_advice", label: "Misleading or Unscientific Agricultural Advice" },
  { id: "dangerous_pesticides", label: "Dangerous or Banned Pesticide / Chemical Recommendation" },
  { id: "spam_commercial", label: "Spam or Unauthorized Commercial Promotion" },
  { id: "harassment", label: "Abusive Language, Harassment, or Disrespect" },
  { id: "other", label: "Other Policy Violation" },
];

export function ReportModal({
  isOpen,
  onClose,
  postId,
  commentId,
  onSubmitReport,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0].id);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const reasonLabel =
        REPORT_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason;

      await onSubmitReport({
        postId,
        commentId,
        reason: reasonLabel,
        details: details.trim(),
      });

      toast.success(
        "Report submitted. Our agricultural moderation team will review this content within 24 hours.",
        { duration: 4000 }
      );
      setDetails("");
      onClose();
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-slate-200">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-100 text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 font-sora">
              Report Content for Review
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            FarmVeda is committed to reliable, safe farming advice. Help us keep the community trustworthy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">Reason for Report</Label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    selectedReason === reason.id
                      ? "border-red-400 bg-red-50/50 text-red-950 font-semibold"
                      : "border-slate-200/80 hover:bg-slate-50 text-slate-700 font-medium"
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-red-600 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs flex-1 cursor-pointer">
                    {reason.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-details" className="text-xs font-bold text-slate-700">
              Additional Details (Optional)
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide context on why this advice is harmful or inaccurate..."
              rows={3}
              className="rounded-xl bg-slate-50 border-slate-200 text-xs focus:bg-white resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-4 text-xs h-10 border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-5 text-xs h-10 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
