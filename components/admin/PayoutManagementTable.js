"use client";

import { useState } from "react"; 
import { processPayout } from "@/actions/admin.actions"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Wallet, Landmark, IndianRupee } from "lucide-react"; 

export default function PayoutManagementTable({ initialPayouts }) {
  const [payouts, setPayouts] = useState(initialPayouts || []);
  const [loadingId, setLoadingId] = useState(null);
  const { toast } = useToast();

  const handleMarkAsPaid = async (userId, amount) => {
    if (!confirm(`Confirm you have manually transferred ₹${amount} to this user's account? This will reset their wallet balance to ₹0.`)) return;
    
    setLoadingId(userId);
    const res = await processPayout(userId);
    
    if (res.success) {
      setPayouts(payouts.filter(p => p._id !== userId)); // Remove from list
      toast({ title: "Payout Confirmed", description: "User's wallet balance has been reset to ₹0." });
    } else {
      toast({ title: "Action Failed", description: res.error, variant: "destructive" });
    }
    setLoadingId(null);
  };

  if (payouts.length === 0) {
    return (
        <div className="py-24 flex flex-col items-center justify-center text-white/20 bg-black/20 rounded-3xl border border-white/5">
            <CheckCircle2 size={48} className="mb-4 opacity-20 text-emerald-500" />
            <p className="font-bold uppercase tracking-[0.3em] text-[10px]">
              All caught up! No pending payouts.
            </p>
        </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead className="bg-white/[0.02] text-white/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
            <tr>
              <th className="px-6 py-5">Creator</th>
              <th className="px-6 py-5">Owed Amount</th>
              <th className="px-6 py-5">Payout Details</th>
              <th className="px-6 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payouts.map((user) => (
                <tr key={user._id} className="transition-all hover:bg-white/[0.02]">
                  
                  {/* 1. Profile Info */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-secondary text-emerald-400">{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{user.name}</span>
                        <span className="text-[10px] text-white/40 font-mono">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  
                  {/* 2. Amount */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 text-sm font-black flex items-center gap-1 w-fit">
                         <IndianRupee className="w-3.5 h-3.5" /> {user.walletBalance.toFixed(2)}
                      </Badge>
                      {/* 🚀 NEW: Early Payout Indicator */}
                      {user.walletBalance > 0 && user.walletBalance < 500 && (
                        <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                          Early Payout
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* 3. Account Details */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1 text-xs">
                        {user.payoutDetails?.upiId ? (
                            <span className="flex items-center gap-1.5 text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded w-fit font-mono">
                                <Wallet className="w-3.5 h-3.5" /> {user.payoutDetails.upiId}
                            </span>
                        ) : (
                            <span className="text-white/30 italic text-[10px]">No UPI Provided</span>
                        )}

                        {user.payoutDetails?.accountNumber ? (
                            <div className="mt-1 flex flex-col gap-0.5 border-l-2 border-white/10 pl-2">
                                <span className="text-white/80 font-bold flex items-center gap-1.5">
                                    <Landmark className="w-3 h-3 text-muted-foreground" /> {user.payoutDetails.bankName || "Unknown Bank"}
                                </span>
                                <span className="text-muted-foreground text-[10px] font-mono">A/C: {user.payoutDetails.accountNumber}</span>
                                <span className="text-muted-foreground text-[10px] font-mono">IFSC: {user.payoutDetails.ifscCode}</span>
                            </div>
                        ) : null}

                        {!user.payoutDetails?.upiId && !user.payoutDetails?.accountNumber && (
                            <Badge variant="outline" className="text-red-400 border-red-500/20 bg-red-500/10 text-[9px]">Awaiting User Setup</Badge>
                        )}
                    </div>
                  </td>
                  
                  {/* 4. Action Button */}
                  <td className="px-6 py-5 text-right">
                    <Button 
                      onClick={() => handleMarkAsPaid(user._id, user.walletBalance)}
                      disabled={loadingId === user._id || (!user.payoutDetails?.upiId && !user.payoutDetails?.accountNumber)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-9 text-xs"
                    >
                      {loadingId === user._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Paid</>
                      )}
                    </Button>
                  </td>

                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}