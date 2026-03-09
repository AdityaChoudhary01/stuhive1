"use client";

import { Trophy, Star, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default function Leaderboard({ title = "Top Contributors", users = [] }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
      {/* Background Glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[80px] pointer-events-none" />

      <header className="flex items-center gap-3 mb-8 relative z-10">
        <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/20 text-black">
          <Trophy size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
          <p className="text-sm text-gray-400 font-medium">Ranked by Hive Points</p>
        </div>
      </header>

      <div className="space-y-3 relative z-10">
        {users.map((user, index) => {
          // Dynamic styles for Top 3
          const isTop3 = index < 3;
          let rankStyle = "bg-white/5 text-gray-400 border-white/10";
          if (index === 0) rankStyle = "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
          if (index === 1) rankStyle = "bg-gray-300/20 text-gray-300 border-gray-300/40";
          if (index === 2) rankStyle = "bg-amber-700/20 text-amber-600 border-amber-700/40";

          return (
            <Link key={user._id} href={`/profile/${user._id}`}>
              <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04] ${isTop3 ? 'bg-white/[0.03] border-white/10' : 'bg-transparent border-transparent hover:border-white/10'}`}>
                
                <div className="flex items-center gap-4 min-w-0 pr-2">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black border ${rankStyle}`}>
                    {index + 1}
                  </div>

                  <Avatar className="h-10 w-10 border border-white/20 shrink-0">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-gray-800 text-gray-300 font-bold">{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col min-w-0">
                    {/* 🚀 Perfected Alignment for Name and Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {user.name}
                      </span>
                      {/* Show Badge if they have one */}
                      {(user.badges && user.badges.length > 0 || user.isVerifiedEducator) && (
                         <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" aria-label="Verified Contributor" />
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-0.5 truncate">
                      {user.noteCount || 0} Uploads
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                  <Star size={14} className="fill-amber-400" />
                  <span className="text-xs font-black">{user.hivePoints}</span>
                </div>

              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}