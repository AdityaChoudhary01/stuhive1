"use server";

import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";
import User from "@/lib/models/User";
import Transaction from "@/lib/models/Transaction";
import Razorpay from "razorpay";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
// 🚀 IMPORTED: Notification Action
import { createNotification } from "@/actions/notification.actions";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function createRazorpayOrder(noteId) {
  await connectDB();
  const session = await getServerSession(authOptions);
  
  // Handle NextAuth ID variations safely
  const userId = session?.user?.id || session?.user?._id;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const note = await Note.findById(noteId).populate("user");
    if (!note || !note.isPaid) return { success: false, error: "Invalid note" };

    // 🚀 WEBHOOK PREPARATION: We inject the noteId and buyerId into 'notes'. 
    // Razorpay will return this exact data to our webhook so we know who bought what.
    const options = {
      amount: Math.round(note.price * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        noteId: note._id.toString(),
        buyerId: userId.toString(),
      }
    };

    const order = await razorpay.orders.create(options);

    const adminFee = note.price * 0.20;
    const sellerEarnings = note.price * 0.80;

    await Transaction.create({
      buyer: userId,
      seller: note.user._id,
      note: note._id,
      amount: note.price,
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

export async function verifyPayment(paymentData) {
  await connectDB();
  const session = await getServerSession(authOptions);
  
  const userId = session?.user?.id || session?.user?._id;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    // 🚀 IDEMPOTENCY CHECK: Check if the Webhook already processed this payment!
    // If the internet was slow and the webhook fired first, we don't want to double-credit the seller.
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

    // 1. Payment Successful! Update DB
    const transaction = await Transaction.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: "completed", razorpayPaymentId: razorpay_payment_id },
      { new: true }
    ).populate('note', 'title slug');

    if (!transaction) return { success: false, error: "Transaction not found" };

    // 2. Give buyer access
    await User.findByIdAndUpdate(userId, {
      $addToSet: { purchasedNotes: transaction.note._id }
    });

    // 3. Add 80% funds to seller's wallet
    await User.findByIdAndUpdate(transaction.seller, {
      $inc: { walletBalance: transaction.sellerEarnings }
    });

    // ==========================================
    // 🚀 TRIGGER NOTIFICATIONS
    // ==========================================

    // A. Notify the SELLER (Earnings Alert)
    await createNotification({
      recipientId: transaction.seller,
      actorId: userId,
      type: 'SYSTEM',
      message: `Great news! Someone purchased "${transaction.note.title}". ₹${transaction.sellerEarnings.toFixed(2)} has been added to your wallet.`,
      link: `/wallet`
    });

    // B. Notify the BUYER (Receipt & Access Link)
    await createNotification({
      recipientId: userId,
      actorId: transaction.seller,
      type: 'SYSTEM',
      message: `Purchase confirmed! "${transaction.note.title}" is now available in your Library.`,
      link: `/library`
    });

    revalidatePath(`/notes/${transaction.note.slug}`);
    revalidatePath(`/wallet`);
    revalidatePath(`/library`);
    
    return { success: true };
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return { success: false, error: error.message };
  }
}