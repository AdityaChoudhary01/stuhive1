"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { cloneStudyPlan } from "@/actions/planner.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function ClonePlanButton({ planId, userId }) {
  const [loading, setLoading] = useState(false);
  const [cloned, setCloned] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleClone = async () => {
    if (!userId) {
      return toast({ 
        title: "Login Required", 
        description: "You must be logged in to clone community roadmaps.", 
        variant: "destructive" 
      });
    }

    setLoading(true);
    const res = await cloneStudyPlan(userId, planId);
    
    if (res.success) {
      setCloned(true);
      toast({ 
        title: "Strategy Synchronized!", 
        description: "This roadmap has been added to your personal planner at 0% progress." 
      });
      
      // Give them a moment to see the success state before redirecting
      setTimeout(() => {
        router.push("/planner");
        router.refresh();
      }, 1500);
    } else {
      toast({ 
        title: "Clone Failed", 
        description: res.error, 
        variant: "destructive" 
      });
    }
    setLoading(false);
  };

  return (
    <Button 
      onClick={handleClone}
      disabled={loading || cloned}
      className={`relative h-14 px-10 rounded-2xl font-black uppercase tracking-[0.15em] text-xs transition-all duration-500 overflow-hidden group ${
        cloned 
          ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]" 
          : "bg-white text-black hover:bg-cyan-500 hover:text-white shadow-2xl active:scale-95"
      }`}
    >
      {/* 🚀 Background Animation on Hover */}
      {!cloned && !loading && (
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing Path...</span>
          </>
        ) : cloned ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Added to Planner</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Clone Strategy</span>
            <Sparkles className="w-3 h-3 ml-1 opacity-50" />
          </>
        )}
      </span>
    </Button>
  );
}