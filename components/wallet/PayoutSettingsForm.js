"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Landmark, Wallet, CheckCircle2 } from "lucide-react";
import { updatePayoutDetails } from "@/actions/wallet.actions";

export default function PayoutSettingsForm({ initialDetails }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    upiId: initialDetails?.upiId || "",
    bankName: initialDetails?.bankName || "",
    accountNumber: initialDetails?.accountNumber || "",
    ifscCode: initialDetails?.ifscCode || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await updatePayoutDetails(formData);
      if (res.success) {
        toast({ 
            title: "Saved Successfully", 
            description: "Your payout details have been securely updated." 
        });
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-100/80 leading-relaxed">
          Add your UPI ID for faster payouts. If you prefer a direct bank transfer, fill in your bank details below. Payouts are processed when your wallet balance reaches ₹500.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-muted-foreground"><Wallet className="w-4 h-4" /> UPI ID (Recommended)</Label>
          <Input 
            placeholder="e.g. yourname@oksbi" 
            value={formData.upiId}
            onChange={e => setFormData({...formData, upiId: e.target.value})}
            className="bg-black/40 border-white/10 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs font-bold uppercase tracking-widest">OR BANK TRANSFER</span>
            <div className="flex-grow border-t border-white/10"></div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-muted-foreground"><Landmark className="w-4 h-4" /> Bank Name</Label>
            <Input 
              placeholder="e.g. State Bank of India" 
              value={formData.bankName}
              onChange={e => setFormData({...formData, bankName: e.target.value})}
              className="bg-black/40 border-white/10 focus-visible:ring-emerald-500"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Account Number</Label>
              <Input 
                type="password"
                placeholder="Enter Account Number" 
                value={formData.accountNumber}
                onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                className="bg-black/40 border-white/10 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">IFSC Code</Label>
              <Input 
                placeholder="e.g. SBIN0001234" 
                value={formData.ifscCode}
                onChange={e => setFormData({...formData, ifscCode: e.target.value})}
                className="bg-black/40 border-white/10 focus-visible:ring-emerald-500 uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={loading} 
        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Payout Details"}
      </Button>
    </form>
  );
}