"use server";

import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";
import Collection from "@/lib/models/Collection"; 
import User from "@/lib/models/User";
import Transaction from "@/lib/models/Transaction";
import Razorpay from "razorpay";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notification.actions";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * 🚀 SMART ORDER CREATOR (Handles both Notes and Bundles)
 */
export async function createRazorpayOrder(itemId, itemType = "note") {
  await connectDB();
  const session = await getServerSession(authOptions);
  
  const userId = session?.user?.id || session?.user?._id;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    let item, sellerId, price;

    // 1. Fetch appropriate item based on type
    if (itemType === "bundle") {
      item = await Collection.findById(itemId).populate("user");
      if (!item || !item.isPremium) return { success: false, error: "Invalid premium bundle" };
      sellerId = item.user._id;
      price = item.price;
    } else {
      item = await Note.findById(itemId).populate("user");
      if (!item || !item.isPaid) return { success: false, error: "Invalid premium note" };
      sellerId = item.user._id;
      price = item.price;
    }

    // 2. Create Razorpay Order
    const options = {
      amount: Math.round(price * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        itemId: item._id.toString(),
        itemType: itemType, 
        buyerId: userId.toString(),
      }
    };

    const order = await razorpay.orders.create(options);

    // 3. Calculate platform economics
    const adminFee = price * 0.20;
    const sellerEarnings = price * 0.80;

    // 4. Record Pending Transaction
    await Transaction.create({
      buyer: userId,
      seller: sellerId,
      note: itemType === "note" ? item._id : undefined,
      bundle: itemType === "bundle" ? item._id : undefined, 
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
 * 🚀 SMART PAYMENT VERIFIER (Unlocks Notes or Full Bundles + Escrow)
 */
export async function verifyPayment(paymentData) {
  await connectDB();
  const session = await getServerSession(authOptions);
  
  const userId = session?.user?.id || session?.user?._id;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    // 🚀 IDEMPOTENCY CHECK
    const existingTransaction = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
    if (existingTransaction && existingTransaction.status === "completed") {
        console.log("Payment already verified by webhook. Skipping duplicate processing.");
        return { success: true }; 
    }

    // Standard Signature Verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Transaction.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: "failed" });
      return { success: false, error: "Invalid Signature" };
    }

    // 1. Payment Successful! Update DB and populate
    const transaction = await Transaction.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: "completed", razorpayPaymentId: razorpay_payment_id },
      { new: true }
    ).populate('note', 'title slug')
     .populate('bundle', 'name slug notes'); 

    if (!transaction) return { success: false, error: "Transaction not found" };

    const isBundle = !!transaction.bundle;
    const itemTitle = isBundle ? transaction.bundle.name : transaction.note.title;
    const itemSlug = isBundle ? transaction.bundle.slug : transaction.note.slug;
    const targetPath = isBundle ? `/shared-collections/${itemSlug}` : `/notes/${itemSlug}`;

    // 🚀 FRAUD PROTECTION: Escrow Calculation
    const availableDate = new Date();
    availableDate.setDate(availableDate.getDate() + 7);

    // 2. GRANT ACCESS BASED ON TYPE (WITH SNAPSHOTS)
    if (isBundle) {
      await Collection.findByIdAndUpdate(transaction.bundle._id, {
        $addToSet: { purchasedBy: userId }
      });
      if (transaction.bundle.notes && transaction.bundle.notes.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { purchasedNotes: { $each: transaction.bundle.notes } },
          // 🚀 SNAPSHOT: Lock the bundle state for this buyer forever
          $push: { purchasedBundles: { bundle: transaction.bundle._id, notesSnapshot: transaction.bundle.notes } }
        });
      }
    } else {
      // Grant single note access & increment sales to lock the file
      await Note.findByIdAndUpdate(transaction.note._id, { $inc: { salesCount: 1 } });
      await User.findByIdAndUpdate(userId, {
        $addToSet: { purchasedNotes: transaction.note._id }
      });
    }

    // 3. Add funds to Seller's PENDING Balance (Escrow)
    await User.findByIdAndUpdate(transaction.seller, {
      $inc: { pendingBalance: transaction.sellerEarnings }, // Send to escrow
      $push: { payoutSchedule: { amount: transaction.sellerEarnings, availableDate, status: 'pending' } }
    });

    // 4. TRIGGER NOTIFICATIONS
    await createNotification({
      recipientId: transaction.seller,
      actorId: userId,
      type: 'SYSTEM',
      message: `Great news! Someone purchased your ${isBundle ? 'bundle' : 'note'} "${itemTitle}". ₹${transaction.sellerEarnings.toFixed(2)} added to pending balance (7-day hold).`,
      link: `/wallet`
    });

    await createNotification({
      recipientId: userId,
      actorId: transaction.seller,
      type: 'SYSTEM',
      message: `Purchase confirmed! "${itemTitle}" is now available in your library.`,
      link: isBundle ? targetPath : `/library`
    });

    revalidatePath(targetPath);
    revalidatePath(`/wallet`);
    revalidatePath(`/library`);
    
    return { success: true };
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return { success: false, error: error.message };
  }
}