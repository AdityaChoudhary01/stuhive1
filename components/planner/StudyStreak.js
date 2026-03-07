"use client";

import { Flame, Award, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StudyStreak({ userBadges = [] }) {
  const hasConsistentBadge = userBadges.includes("Consistent Learner");

  return (
    <div className="p-6 rounded-[32px] bg-gradient-to-br from-orange-500/10 via-transparent to-pink-500/10 border border-white/10 flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${hasConsistentBadge ? 'bg-orange-500 text-black' : 'bg-white/5 text-gray-500'} transition-all duration-500`}>
          <Flame size={24} className={hasConsistentBadge ? "animate-pulse" : ""} />
        </div>
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-widest">Consistency Streak</h4>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            {hasConsistentBadge ? "Consistent Learner Badge Earned" : "Study 3 days in a row to earn a badge"}
          </p>
        </div>
      </div>

      {hasConsistentBadge && (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 px-3 py-1 flex gap-1 items-center">
          <Award size={12} /> Elite
        </Badge>
      )}
    </div>
  );
}