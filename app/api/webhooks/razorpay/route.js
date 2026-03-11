export const runtime = "edge";

import { getDb } from "@/lib/db";
import { users, notes, collections, transactions, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
// Note: We'll edge-ify this notification action in the next phase!
import { createNotification } from "@/actions/notification.actions";

/**
 * 🔐 Verify Razorpay Signature using Edge-compatible Web Crypto API
 */
async function verifyRazorpaySignature(bodyText, signature, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
  const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
    
  return generatedSignature === signature;
}

export async function POST(req) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) return new Response("Webhook secret not configured", { status: 500 });

    const isValid = await verifyRazorpaySignature(bodyText, signature, webhookSecret);
    if (!isValid) {
      console.error("🚨 Invalid Razorpay Webhook Signature Detected!");
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(bodyText);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const { itemId, itemType, buyerId } = payment.notes || {};

      if (!itemId || !buyerId) return new Response("OK", { status: 200 });

      const db = getDb();

      // 1. IDEMPOTENCY CHECK
      const existingTxRows = await db.select().from(transactions).where(eq(transactions.razorpayOrderId, payment.order_id));
      if (existingTxRows.length > 0 && existingTxRows[0].status === "completed") {
        return new Response("OK", { status: 200 });
      }

      const isBundle = itemType === "bundle";
      let item, sellerId, itemTitle, itemSlug;

      // 2. Fetch Item and Seller
      if (isBundle) {
        const bundleRows = await db.select().from(collections).where(eq(collections.id, itemId));
        item = bundleRows[0];
        if (item) {
          itemTitle = item.name;
          itemSlug = item.slug;
          sellerId = item.userId;
        }
      } else {
        const noteRows = await db.select().from(notes).where(eq(notes.id, itemId));
        item = noteRows[0];
        if (item) {
          itemTitle = item.title;
          itemSlug = item.slug;
          sellerId = item.userId;
        }
      }

      if (!item) return new Response("Item not found", { status: 404 });

      // Calculate payout & 7-day Escrow
      const amountInRupees = payment.amount / 100;
      const creatorEarnings = amountInRupees * 0.80;
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + 7);

      // 3. Grant Access & Record Purchase
      await db.insert(purchases).values({
        userId: buyerId,
        itemId: itemId,
        itemType: isBundle ? 'collection' : 'note',
        amount: amountInRupees,
        // Bundle snapshot logic can be expanded here based on relational collectionNotes query
      });

      if (!isBundle) {
        // Increment note sales count to lock edits
        await db.update(notes)
          .set({ salesCount: (item.salesCount || 0) + 1 })
          .where(eq(notes.id, itemId));
      }

      // 4. Update Seller Wallet (Escrow)
      const sellerRows = await db.select().from(users).where(eq(users.id, sellerId));
      const seller = sellerRows[0];
      
      const currentSchedule = seller.payoutSchedule ? JSON.parse(seller.payoutSchedule) : [];
      currentSchedule.push({ amount: creatorEarnings, availableDate: availableDate.toISOString(), status: 'pending' });

      await db.update(users)
        .set({ 
          pendingBalance: (seller.pendingBalance || 0) + creatorEarnings,
          payoutSchedule: JSON.stringify(currentSchedule)
        })
        .where(eq(users.id, sellerId));

      // 5. Update Transaction Status
      await db.update(transactions)
        .set({ status: "completed", razorpayPaymentId: payment.id })
        .where(eq(transactions.razorpayOrderId, payment.order_id));

      // 6. Notifications
      await Promise.all([
        createNotification({
          recipientId: sellerId,
          type: 'SYSTEM',
          message: `Sale Confirmed! Your ${isBundle ? 'bundle' : 'note'} "${itemTitle}" was purchased. ₹${creatorEarnings.toFixed(2)} added to pending balance (7-day hold).`,
          link: `/wallet`
        }),
        createNotification({
          recipientId: buyerId,
          type: 'SYSTEM',
          message: `Payment successful! "${itemTitle}" is now unlocked in your library forever.`,
          link: isBundle ? `/shared-collections/${itemSlug}` : `/notes/${itemSlug}`
        })
      ]);
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}