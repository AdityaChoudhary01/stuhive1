"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2 } from "lucide-react";
import { toggleSaveOpportunity } from "@/actions/opportunity.actions";
import { useToast } from "@/hooks/use-toast";

export default function SaveOpportunityButton({ opportunityId, initiallySaved = false }) {
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (e) => {
    e.preventDefault(); // Prevents clicking the card link if the button is inside a link wrapper
    setLoading(true);
    
    const res = await toggleSaveOpportunity(opportunityId);
    
    if (res.success) {
      setIsSaved(res.isSaved);
      toast({
        title: res.isSaved ? "⭐ Added to Watchlist" : "Removed from Watchlist",
        description: res.isSaved ? "We'll keep this safe in your library." : "",
      });
    } else {
      toast({ title: "Action Failed", description: res.error, variant: "destructive" });
    }
    
    setLoading(false);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full transition-all duration-300 ${
        isSaved 
        ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-400/10' 
        : 'text-gray-400 hover:text-white hover:bg-white/10'
      }`}
      title={isSaved ? "Remove from Watchlist" : "Save to Watchlist"}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
      )}
    </Button>
  );
}