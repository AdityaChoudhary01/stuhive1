import crypto from "crypto";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Note from "@/lib/models/Note";
import Collection from "@/lib/models/Collection"; 
import Transaction from "@/lib/models/Transaction"; 
import { createNotification } from "@/actions/notification.actions";

export async function POST(req) {
  try {
    // 1. Get the raw body as text for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Webhook secret is missing in env variables.");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // 2. Verify the cryptographic signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("🚨 Invalid Razorpay Webhook Signature Detected!");
      return new Response("Invalid signature", { status: 400 });
    }

    // 3. Parse secure body
    const event = JSON.parse(bodyText);

    // 4. Process payment.captured event
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      
      // We extract the unified metadata fields we defined in payment.actions.js
      const { itemId, itemType, buyerId } = payment.notes || {};

      if (!itemId || !buyerId) {
        console.error("Missing metadata in Razorpay payment payload");
        return new Response("OK", { status: 200 }); 
      }

      await connectDB();

      // 5. IDEMPOTENCY CHECK: Check Transaction status instead of just user array
      // This is safer if the Server Action already finished processing.
      const existingTx = await Transaction.findOne({ razorpayOrderId: payment.order_id });
      if (existingTx && existingTx.status === "completed") {
        console.log("Payment already processed by Server Action. Ignoring Webhook duplicate.");
        return new Response("OK", { status: 200 });
      }

      const isBundle = itemType === "bundle";
      let item, sellerId, itemTitle, itemSlug;

      // 6. Fetch Item and Seller Details
      if (isBundle) {
        item = await Collection.findById(itemId).populate("user");
        itemTitle = item?.name;
        itemSlug = item?.slug;
      } else {
        item = await Note.findById(itemId).populate("user");
        itemTitle = item?.title;
        itemSlug = item?.slug;
      }

      if (!item) return new Response("Item not found", { status: 404 });
      sellerId = item.user._id;

      // 7. Calculate payout & Escrow hold date
      const amountInRupees = payment.amount / 100;
      const creatorEarnings = amountInRupees * 0.80;
      
      // 🚀 FRAUD PROTECTION: Set funds to clear in 7 days
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + 7);

      // 8. GRANT ACCESS BASED ON TYPE
      if (isBundle) {
        // A. Mark bundle as purchased
        await Collection.findByIdAndUpdate(itemId, { $addToSet: { purchasedBy: buyerId } });
        // B. Unlock all notes inside the bundle for the user AND create snapshot
        if (item.notes && item.notes.length > 0) {
          await User.findByIdAndUpdate(buyerId, { 
            $addToSet: { purchasedNotes: { $each: item.notes } },
            // 🚀 BUNDLE SNAPSHOT: Save the exact array of notes at this moment
            $push: { purchasedBundles: { bundle: itemId, notesSnapshot: item.notes } }
          });
        }
      } else {
        // Unlock single note and increment sales counter to lock the file for edits
        await Note.findByIdAndUpdate(itemId, { $inc: { salesCount: 1 } });
        await User.findByIdAndUpdate(buyerId, { $addToSet: { purchasedNotes: itemId } });
      }

      // 9. Update Seller Wallet (Escrow) and Transaction Status
      await Promise.all([
        User.findByIdAndUpdate(sellerId, { 
          $inc: { pendingBalance: creatorEarnings }, // 🚀 Route to pending, NOT walletBalance
          $push: { payoutSchedule: { amount: creatorEarnings, availableDate, status: 'pending' } }
        }),
        Transaction.findOneAndUpdate(
          { razorpayOrderId: payment.order_id },
          { status: "completed", razorpayPaymentId: payment.id }
        )
      ]);

      // 10. Notifications
      await Promise.all([
        // Notify Seller
        createNotification({
          recipientId: sellerId,
          type: 'SYSTEM',
          message: `Sale Confirmed! Your ${isBundle ? 'bundle' : 'note'} "${itemTitle}" was purchased. ₹${creatorEarnings.toFixed(2)} added to pending balance (7-day hold).`,
          link: `/wallet`
        }),
        // Notify Buyer
        createNotification({
          recipientId: buyerId,
          type: 'SYSTEM',
          message: `Payment successful! "${itemTitle}" is now unlocked in your library forever.`,
          link: isBundle ? `/shared-collections/${itemSlug}` : `/notes/${itemSlug}`
        })
      ]);

      console.log(`✅ Webhook processed: ${itemType} purchase by ${buyerId}`);
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}