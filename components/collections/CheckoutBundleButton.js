"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 🚀 IMPORTED FROM YOUR SPECIFIC ACTION FILE
import { createRazorpayOrder, verifyPayment } from "@/actions/payment.actions";

export default function CheckoutBundleButton({ bundle }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  
  // 🚀 ACCESS LOGIC: Check if user owns the bundle or has already purchased it
  const userId = session?.user?.id || session?.user?._id;
  const isOwner = bundle.user?._id === userId || bundle.user === userId;
  const hasPurchased = bundle.purchasedBy?.some(id => id.toString() === userId?.toString());

  const handleCheckout = async () => {
    if (!session) {
      toast({ title: "Login Required", description: "Please log in to purchase this bundle.", variant: "destructive" });
      router.push("/login");
      return;
    }

    setLoading(true);

    try {
      // 1. Load Razorpay Script dynamically
      const isScriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!isScriptLoaded) {
        toast({ title: "Error", description: "Razorpay SDK failed to load. Check your internet connection.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // 2. Create Razorpay Order using your Server Action
      // We pass "bundle" as the second argument to trigger the bundle logic in your action
      const orderData = await createRazorpayOrder(bundle._id, "bundle");

      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // 3. Initialize Razorpay Modal Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "StuHive Premium",
        description: `Premium Bundle: ${bundle.name}`,
        order_id: orderData.order.id,
        handler: async function (response) {
          
          // 4. Verify Payment using your Server Action
          const verifyData = await verifyPayment({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            bundleId: bundle._id, // Context for the verification logic
          });

          if (verifyData.success) {
            toast({ 
              title: "Purchase Successful!", 
              description: "The bundle and all its contents are now unlocked in your library." 
            });
            router.refresh(); // Instant UI update to show "Unlocked" state
          } else {
            toast({ 
              title: "Verification Failed", 
              description: verifyData.error || "Something went wrong.", 
              variant: "destructive" 
            });
          }
        },
        prefill: {
          name: session.user.name,
          email: session.user.email,
        },
        theme: {
          color: "#EAB308", // Golden/Amber theme to match the Premium branding
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error("Checkout Flow Error:", error);
      toast({ title: "Checkout Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Utility to load external Razorpay script
  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 🚀 UI STATE: If unlocked, show the green success badge
  if (hasPurchased || isOwner) {
    return (
      <Button 
        disabled
        className="w-full sm:w-auto h-12 px-8 rounded-full bg-green-500/20 text-green-400 font-black text-sm uppercase tracking-widest border border-green-500/30 flex items-center justify-center gap-2 cursor-default"
      >
        <CheckCircle size={16} /> Bundle Unlocked
      </Button>
    );
  }

  // 🚀 UI STATE: Default Buy Button
  return (
    <Button 
      onClick={handleCheckout}
      disabled={loading}
      className="w-full sm:w-auto h-12 px-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-600 hover:from-yellow-300 hover:to-amber-500 text-black font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border-0 disabled:opacity-70 disabled:hover:scale-100"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <ShoppingCart size={16} />
      )} 
      Get Bundle - ₹{bundle.price}
    </Button>
  );
}