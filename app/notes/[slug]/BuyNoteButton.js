"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createRazorpayOrder, verifyPayment } from "@/actions/payment.actions";

export default function BuyNoteButton({ noteId, price, userEmail }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);

    try {
      // 1. Create Order on Backend
      const res = await createRazorpayOrder(noteId);
      if (!res.success) throw new Error(res.error);

      // 2. Initialize Razorpay Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: res.order.amount,
        currency: "INR",
        name: "StuHive Notes",
        description: "Premium Study Material",
        order_id: res.order.id,
        handler: async function (response) {
          // 3. Verify Payment on Backend
          const verifyRes = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (verifyRes.success) {
            toast({ title: "Purchase Successful!", description: "You can now download the full document." });
            window.location.reload(); // Refresh to unlock the page
          } else {
            toast({ title: "Verification Failed", variant: "destructive" });
          }
        },
        prefill: { email: userEmail || "" },
        theme: { color: "#06b6d4" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast({ title: "Payment Initialization Failed", description: "Please login to purchase.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={loading}
      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl px-6 h-11"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingCart className="w-5 h-5 mr-2" /> Buy for ₹{price}</>}
    </Button>
  );
}