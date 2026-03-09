"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitReport } from "@/actions/report.actions";

export default function ReportNoteModal({ noteId, bundleId, title }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const { toast } = useToast();

  const reasons = ['Empty Content', 'Incorrect Subject', 'Copyright/Plagiarism', 'Poor Quality', 'Spam'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return toast({ title: "Please select a reason" });

    setLoading(true);
    const res = await submitReport({ noteId, bundleId, reason, details });

    if (res.success) {
      toast({ title: "Report Submitted", description: "Our team will investigate this content." });
      setOpen(false);
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[10px] font-bold text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 uppercase tracking-widest mt-4">
          <AlertTriangle size={12} /> Report this content
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#0c0c10] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Report Issue
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Reason</label>
            <div className="grid grid-cols-1 gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-left px-4 py-2 rounded-xl border text-sm transition-all ${
                    reason === r 
                    ? "bg-red-500/10 border-red-500/50 text-red-400" 
                    : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Additional Details</label>
            <Textarea 
              placeholder="Provide more context..." 
              className="bg-black/40 border-white/10 focus-visible:ring-red-500"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Submit Report"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}