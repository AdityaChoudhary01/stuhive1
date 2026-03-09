"use client";

import { useState } from "react"; 
import { processPayout, forceClearEscrow } from "@/actions/admin.actions"; // 🚀 Added forceClearEscrow
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Wallet, Landmark, IndianRupee, Clock, FastForward } from "lucide-react"; 

export default function PayoutManagementTable({ initialPayouts }) {
  const [payouts, setPayouts] = useState(initialPayouts || []);
  const [prevInitialPayouts, setPrevInitialPayouts] = useState(initialPayouts);
  const [loadingMap, setLoadingMap] = useState({});
  const { toast } = useToast();

  // 🚀 FIXED: React recommended way to sync state from props without useEffect.
  // This avoids cascading renders and the ESLint error.
  if (initialPayouts !== prevInitialPayouts) {
    setPrevInitialPayouts(initialPayouts);
    setPayouts(initialPayouts || []);
  }

  // 🚀 ACTION: FORCE CLEAR ESCROW
  const handleClearEscrow = async (userId) => {
    if (!confirm("Force clear all pending funds for this user and make them available for withdrawal immediately?")) return;

    setLoadingMap(prev => ({ ...prev, [`escrow_${userId}`]: true }));
    const res = await forceClearEscrow(userId);
    
    if (res.success) {
      // Optimistically update the UI to move funds from pending to wallet
      setPayouts(payouts.map(p => {
         if (p._id === userId) {
            return {
               ...p,
               walletBalance: p.walletBalance + p.pendingBalance,
               pendingBalance: 0
            }
         }
         return p;
      }));
      toast({ title: "Escrow Cleared", description: res.message });
    } else {
      toast({ title: "Action Failed", description: res.error, variant: "destructive" });
    }
    setLoadingMap(prev => ({ ...prev, [`escrow_${userId}`]: false }));
  };

  // 🚀 ACTION: MARK AS PAID
  const handleMarkAsPaid = async (userId, amount) => {
    if (!confirm(`Confirm you have manually transferred ₹${amount} to this user's account? This will reset their available wallet balance to ₹0.`)) return;
    
    setLoadingMap(prev => ({ ...prev, [`payout_${userId}`]: true }));
    const res = await processPayout(userId);
    
    if (res.success) {
      // Optimistically update the UI to reset available wallet balance
      setPayouts(payouts.map(p => {
         if (p._id === userId) {
            return { ...p, walletBalance: 0 }
         }
         return p;
      }).filter(p => p.walletBalance > 0 || p.pendingBalance > 0)); // Remove from list if both are 0
      
      toast({ title: "Payout Confirmed", description: "User's available wallet balance has been reset to ₹0." });
    } else {
      toast({ title: "Action Failed", description: res.error, variant: "destructive" });
    }
    setLoadingMap(prev => ({ ...prev, [`payout_${userId}`]: false }));
  };

  if (payouts.length === 0) {
    return (
        <div className="py-24 flex flex-col items-center justify-center text-white/20 bg-black/20 rounded-3xl border border-white/5">
            <CheckCircle2 size={48} className="mb-4 opacity-20 text-emerald-500" />
            <p className="font-bold uppercase tracking-[0.3em] text-[10px]">
              All caught up! No pending payouts or escrows.
            </p>
        </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[900px]">
          <thead className="bg-white/[0.02] text-white/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
            <tr>
              <th className="px-6 py-5">Creator</th>
              <th className="px-6 py-5">Escrow (Pending)</th>
              <th className="px-6 py-5">Available (Wallet)</th>
              <th className="px-6 py-5">Payout Details</th>
              <th className="px-6 py-5 text-right">Actions</th>
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
                  
                  {/* 2. Escrow (Pending) */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 text-sm font-black flex items-center gap-1 w-fit">
                         <IndianRupee className="w-3.5 h-3.5" /> {(user.pendingBalance || 0).toFixed(2)}
                      </Badge>
                      {(user.pendingBalance > 0) && (
                        <span className="text-[9px] text-amber-500/70 font-bold uppercase tracking-widest px-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Locked 7 Days
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 3. Available (Wallet) */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 text-sm font-black flex items-center gap-1 w-fit">
                         <IndianRupee className="w-3.5 h-3.5" /> {(user.walletBalance || 0).toFixed(2)}
                      </Badge>
                      {user.walletBalance > 0 && user.walletBalance < 500 && (
                        <span className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-widest px-1">
                          Early Payout
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* 4. Account Details */}
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
                            <Badge variant="outline" className="text-red-400 border-red-500/20 bg-red-500/10 text-[9px] mt-1 w-fit">Awaiting Setup</Badge>
                        )}
                    </div>
                  </td>
                  
                  {/* 5. Action Buttons */}
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col items-end gap-2">
                        
                        {/* Clear Escrow Button */}
                        {(user.pendingBalance > 0) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleClearEscrow(user._id)}
                            disabled={loadingMap[`escrow_${user._id}`]}
                            className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black border-amber-500/30 text-[10px] font-bold uppercase tracking-wider h-8"
                          >
                            {loadingMap[`escrow_${user._id}`] ? <Loader2 size={14} className="animate-spin mr-1" /> : <FastForward size={14} className="mr-1" />}
                            Clear Escrow
                          </Button>
                        )}

                        {/* Process Payout Button */}
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkAsPaid(user._id, user.walletBalance)}
                          disabled={loadingMap[`payout_${user._id}`] || user.walletBalance <= 0 || (!user.payoutDetails?.upiId && !user.payoutDetails?.accountNumber)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-8 text-[10px] uppercase tracking-wider"
                        >
                          {loadingMap[`payout_${user._id}`] ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-1" /> 
                          )}
                          Mark Paid
                        </Button>
                        
                    </div>
                  </td>

                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}