"use client";

import { DownloadCloud } from "lucide-react";

export default function PremiumPolicyClient() {
  return (
    <div className="mt-12 p-10 rounded-[40px] bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border border-white/10 text-center animate-in fade-in slide-in-from-bottom-5 duration-1000">
      <div className="inline-flex p-4 rounded-full bg-emerald-500/20 mb-4 text-emerald-400 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <DownloadCloud size={40} />
      </div>
      <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Dispute Resolution</h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm font-medium">
        Issue with a purchase or payout? Our marketplace moderators respond within 24 hours.
      </p>
      <a 
        href="mailto:support@stuhive.in" 
        className="inline-block px-10 py-4 bg-emerald-500 text-black font-black uppercase tracking-widest text-[11px] rounded-full hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
      >
        Contact Resolution Desk
      </a>
    </div>
  );
}