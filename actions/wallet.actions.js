"use server";

import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Transaction from "@/lib/models/Transaction";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * FETCH USER WALLET & TRANSACTIONS
 */
export async function getWalletData() {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // Get user's current balance and saved payout details
    const user = await User.findById(session.user.id)
      .select("walletBalance payoutDetails role")
      .lean();

    // Get all completed sales where this user is the seller
    const sales = await Transaction.find({ 
        seller: session.user.id, 
        status: "completed" 
      })
      .populate("note", "title price slug thumbnailKey isPaid")
      .populate("buyer", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    // 🚀 NEW: Aggregate sales data by Note for detailed analytics
    const performanceMap = sales.reduce((acc, sale) => {
      if (!sale.note) return acc; // Skip if note was deleted
      
      const noteId = sale.note._id.toString();
      
      if (!acc[noteId]) {
          acc[noteId] = {
              noteId: noteId,
              title: sale.note.title,
              slug: sale.note.slug,
              price: sale.amount,
              totalCopiesSold: 0,
              totalEarnings: 0,
              buyers: []
          };
      }
      
      acc[noteId].totalCopiesSold += 1;
      acc[noteId].totalEarnings += sale.sellerEarnings;
      
      // Add buyer details to this specific note's list
      acc[noteId].buyers.push({
          _id: sale._id.toString(),
          buyerName: sale.buyer?.name || "Unknown User",
          buyerEmail: sale.buyer?.email || "Hidden",
          buyerAvatar: sale.buyer?.avatar || null,
          purchasedAt: sale.createdAt,
          earnings: sale.sellerEarnings
      });
      
      return acc;
    }, {});

    // Convert map to array and sort by most profitable note first
    const performanceByNote = Object.values(performanceMap).sort((a, b) => b.totalEarnings - a.totalEarnings);

    return { 
      success: true, 
      walletBalance: user.walletBalance || 0, 
      payoutDetails: user.payoutDetails || {},
      sales: JSON.parse(JSON.stringify(sales)),
      performanceByNote: JSON.parse(JSON.stringify(performanceByNote)), // 🚀 Passed to UI
      isAdmin: user.role === 'admin'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * UPDATE PAYOUT DETAILS (Bank / UPI)
 */
export async function updatePayoutDetails(data) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await User.findByIdAndUpdate(
      session.user.id,
      { 
        $set: { 
          "payoutDetails.upiId": data.upiId,
          "payoutDetails.bankName": data.bankName,
          "payoutDetails.accountNumber": data.accountNumber,
          "payoutDetails.ifscCode": data.ifscCode
        } 
      },
      { new: true }
    );

    revalidatePath("/wallet");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}