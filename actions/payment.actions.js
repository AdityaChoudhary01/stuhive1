'use server';

import { getDb } from "@/lib/db";
import { notes, collections, users, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notification.actions";

// Edge-safe crypto buffer check
async function generateSignature(body, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 🚀 SMART ORDER CREATOR (Native Fetch, Edge Safe)
 */
export async function createRazorpayOrder(itemId, itemType = "note") {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: "Unauthorized" };

    const db = getDb();
    let item, sellerId, price;

    if (itemType === "bundle") {
      const bundleRows = await db.select().from(collections).where(eq(collections.id, itemId)).limit(1);
      if (bundleRows.length === 0 || !bundleRows[0].isPremium) return { success: false, error: "Invalid premium bundle" };
      item = bundleRows[0];
      sellerId = item.userId;
      price = item.price;
    } else {
      const noteRows = await db.select().from(notes).where(eq(notes.id, itemId)).limit(1);
      if (noteRows.length === 0 || !noteRows[0].isPaid) return { success: false, error: "Invalid premium note" };
      item = noteRows[0];
      sellerId = item.userId;
      price = item.price;
    }

    // Edge-Safe Razorpay Order Creation via Fetch
    const amountInPaise = Math.round(price * 100);
    const authHeader = `Basic ${btoa(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`)}`;
    
    const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": authHeader },
        body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: { itemId: item.id, itemType, buyerId: userId }
        })
    });

    if (!response.ok) throw new Error("Failed to communicate with Razorpay");
    const order = await response.json();

    const adminFee = price * 0.20;
    const sellerEarnings = price * 0.80;

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      buyerId: userId,
      sellerId: sellerId,
      noteId: itemType === "note" ? item.id : null,
      bundleId: itemType === "bundle" ? item.id : null,
      amount: price,
      adminFee,
      sellerEarnings,
      razorpayOrderId: order.id,
      status: "pending"
    });

    return { success: true, order };
  } catch (error) {
    console.error("Order Creation Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 SMART PAYMENT VERIFIER 
 */
export async function verifyPayment(paymentData) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: "Unauthorized" };

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    const db = getDb();

    // IDEMPOTENCY
    const txRows = await db.select().from(transactions).where(eq(transactions.razorpayOrderId, razorpay_order_id)).limit(1);
    if (txRows.length > 0 && txRows[0].status === "completed") {
        return { success: true }; 
    }

    // Edge-Safe Signature Verification
    const expectedSignature = await generateSignature(`${razorpay_order_id}|${razorpay_payment_id}`, process.env.RAZORPAY_KEY_SECRET);

    if (expectedSignature !== razorpay_signature) {
      await db.update(transactions).set({ status: "failed" }).where(eq(transactions.razorpayOrderId, razorpay_order_id));
      return { success: false, error: "Invalid Signature" };
    }

    // Note: The rest of the unlock logic (updating purchases table and escrow balances) 
    // is heavily handled safely via the `api/webhooks/razorpay/route.js` webhook we configured earlier!
    // We just return success here so the frontend can redirect the user.

    return { success: true };
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return { success: false, error: error.message };
  }
}