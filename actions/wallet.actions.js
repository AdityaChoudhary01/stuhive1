"use server";

import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Transaction from "@/lib/models/Transaction";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * FETCH USER WALLET & TRANSACTIONS (Updated with Auto-Escrow Sync)
 */
export async function getWalletData() {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // Get user's current balances, schedule, and details
    const user = await User.findById(session.user.id)
      .select("walletBalance pendingBalance payoutSchedule payoutDetails role")
      .exec();

    if (!user) throw new Error("User not found");

    // 🚀 ESCROW SYNC LOGIC (Just-In-Time Evaluation)
    let amountToClear = 0;
    let hasChanges = false;
    const now = new Date();

    if (user.payoutSchedule && user.payoutSchedule.length > 0) {
      user.payoutSchedule.forEach(item => {
        if (item.status === 'pending' && new Date(item.availableDate) <= now) {
          amountToClear += item.amount;
          item.status = 'cleared';
          hasChanges = true;
        }
      });
    }

    // Move matured funds from Pending to Wallet Balance
    if (hasChanges) {
      user.walletBalance += amountToClear;
      user.pendingBalance -= amountToClear;
      if (user.pendingBalance < 0) user.pendingBalance = 0; 
      await user.save();
    }

    // Get all completed sales
    const sales = await Transaction.find({ 
        seller: session.user.id, 
        status: "completed" 
      })
      .populate("note", "title price slug thumbnailKey isPaid")
      .populate("bundle", "name price slug isPremium") 
      .populate("buyer", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate sales data by Item
    const performanceMap = sales.reduce((acc, sale) => {
      const isBundle = !!sale.bundle;
      const item = isBundle ? sale.bundle : sale.note;
      
      if (!item) return acc; 
      
      const itemId = item._id.toString();
      
      if (!acc[itemId]) {
          acc[itemId] = {
              itemId: itemId,
              type: isBundle ? "Bundle" : "Note",
              title: isBundle ? item.name : item.title,
              slug: item.slug,
              price: sale.amount,
              totalCopiesSold: 0,
              totalEarnings: 0,
              buyers: []
          };
      }
      
      acc[itemId].totalCopiesSold += 1;
      acc[itemId].totalEarnings += sale.sellerEarnings;
      
      acc[itemId].buyers.push({
          _id: sale._id.toString(),
          buyerName: sale.buyer?.name || "Unknown User",
          buyerEmail: sale.buyer?.email || "Hidden",
          buyerAvatar: sale.buyer?.avatar || null,
          purchasedAt: sale.createdAt,
          earnings: sale.sellerEarnings
      });
      
      return acc;
    }, {});

    const performanceByItem = Object.values(performanceMap).sort((a, b) => b.totalEarnings - a.totalEarnings);

    return { 
      success: true, 
      walletBalance: user.walletBalance || 0, 
      pendingBalance: user.pendingBalance || 0, // 🚀 Added Pending Balance
      payoutDetails: user.payoutDetails || {},
      sales: JSON.parse(JSON.stringify(sales)),
      performanceByItem: JSON.parse(JSON.stringify(performanceByItem)), 
      isAdmin: user.role === 'admin'
    };
  } catch (error) {
    console.error("Wallet Data Fetch Error:", error);
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
    console.error("Update Payout Error:", error);
    return { success: false, error: error.message };
  }
}