"use server";

import connectDB from "@/lib/db";
import Analytics from "@/lib/models/Analytics";
import Note from "@/lib/models/Note";
import SiteAnalytics from "@/lib/models/SiteAnalytics";
import Transaction from "@/lib/models/Transaction"; // 🚀 Added for Financials
import { getServerSession } from "next-auth"; // 🚀 Added for Security
import { authOptions } from "@/lib/auth"; 
import mongoose from "mongoose";

/**
 * 1. LOG AN EVENT (Call this silently when someone views/downloads)
 */
export async function trackCreatorEvent(creatorId, type) { // type: 'views' | 'downloads'
  if (!creatorId) return;
  try {
    await connectDB();
    const dateStr = new Date().toISOString().split('T')[0]; // Gets today's date "YYYY-MM-DD"

    await Analytics.findOneAndUpdate(
      { user: creatorId, date: dateStr },
      { $inc: { [type]: 1 } },
      { upsert: true, new: true } // Upsert: Creates a new document if today doesn't exist yet!
    );
  } catch (error) {
    console.error(`Failed to track ${type} event:`, error);
  }
}

/**
 * 2. FETCH DASHBOARD DATA (Last 30 Days)
 */
export async function getCreatorAnalytics(userId) {
  try {
    await connectDB();
    
    // Get date from 30 days ago
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const dateLimit = pastDate.toISOString().split('T')[0];

    const stats = await Analytics.find({
      user: userId,
      date: { $gte: dateLimit }
    }).sort({ date: 1 }).lean();

    return JSON.parse(JSON.stringify(stats));
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return [];
  }
}

/**
 * 3. LOG A PAGE VIEW (Global Site Analytics)
 */
export async function logPageView(path) {
  try {
    // Ignore static files and API routes
    if (path.startsWith('/_next') || path.startsWith('/api') || path.includes('.')) return;

    await connectDB();
    const dateStr = new Date().toISOString().split('T')[0];

    // Silently upsert the page view count for today
    await SiteAnalytics.findOneAndUpdate(
      { path, date: dateStr },
      { $inc: { views: 1 } },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Fail silently so it never breaks the user experience
    console.error("Failed to log page view:", error.message);
  }
}

/**
 * 4. 🚀 ADMIN: FETCH GLOBAL FINANCIAL DATA (20% / 80% Splits)
 */
export async function getGlobalFinancialData() {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return { success: false, error: "Unauthorized" };

  try {
    // Aggregate Total Finances for Completed Transactions
    const stats = await Transaction.aggregate([
      { $match: { status: "completed" } },
      { 
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },          // 100% Platform Revenue
          totalAdminFee: { $sum: "$adminFee" },       // 20% Admin Cut
          totalCreatorEarnings: { $sum: "$sellerEarnings" } // 80% User Cut
        }
      }
    ]);

    // Fetch all completed transactions with deep populated data
    const transactions = await Transaction.find({ status: "completed" })
      .populate('buyer', 'name email avatar')
      .populate('seller', 'name email avatar')
      .populate('note', 'title slug')
      .populate('bundle', 'name slug')
      .sort({ createdAt: -1 })
      .limit(50) // 🚀 FIXED: Added initial limit to match the Load More logic perfectly
      .lean();

    return {
      success: true,
      stats: stats[0] || { totalRevenue: 0, totalAdminFee: 0, totalCreatorEarnings: 0 },
      transactions: JSON.parse(JSON.stringify(transactions))
    };
  } catch (error) {
    console.error("Admin Financial Analytics Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. 🚀 USER: FETCH PERSONAL DASHBOARD ANALYTICS
 */
export async function getUserDashboardAnalytics() {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // 1. Fetch User Content Stats (Views & Downloads from Notes)
    const contentStats = await Note.aggregate([
      { $match: { user: userIdObj } },
      { 
        $group: {
          _id: null,
          totalViews: { $sum: "$viewCount" },
          totalDownloads: { $sum: "$downloadCount" },
          totalNotes: { $sum: 1 }
        }
      }
    ]);

    // 2. Fetch User Financial Stats (Sales)
    const financialStats = await Transaction.aggregate([
      { $match: { seller: userIdObj, status: "completed" } },
      { 
        $group: {
          _id: null,
          totalEarnings: { $sum: "$sellerEarnings" }, // Their 80% cut
          totalSales: { $sum: 1 }
        }
      }
    ]);

    // 3. Fetch Personal Transaction History
    const transactions = await Transaction.find({ seller: userId, status: "completed" })
      .populate('buyer', 'name email avatar')
      .populate('note', 'title slug')
      .populate('bundle', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      contentStats: contentStats[0] || { totalViews: 0, totalDownloads: 0, totalNotes: 0 },
      financialStats: financialStats[0] || { totalEarnings: 0, totalSales: 0 },
      transactions: JSON.parse(JSON.stringify(transactions))
    };
  } catch (error) {
    console.error("User Analytics Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 6. 🚀 ADMIN: FETCH MORE TRANSACTIONS (PAGINATION)
 */
export async function getMoreTransactions(page = 1, limit = 50) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return [];

  const skip = (page - 1) * limit;
  
  try {
      const transactions = await Transaction.find({ status: "completed" })
         .populate('buyer', 'name email avatar')
         .populate('seller', 'name email avatar')
         .populate('note', 'title slug')
         .populate('bundle', 'name slug')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean();

      return JSON.parse(JSON.stringify(transactions));
  } catch (error) {
      console.error("Error fetching paginated transactions:", error);
      return [];
  }
}