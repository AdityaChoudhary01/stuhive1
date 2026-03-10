"use server";

import connectDB from "@/lib/db";
import Report from "@/lib/models/Report";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitReport(data) {
  await connectDB();
  const session = await getServerSession(authOptions);
  
  if (!session) return { success: false, error: "Authentication required" };

  try {
    const newReport = await Report.create({
      reporter: session.user.id,
      targetNote: data.noteId || null,
      targetBundle: data.bundleId || null,
      reason: data.reason,
      details: data.details
    });

    revalidatePath('/admin/reports'); 
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 FETCH REPORTS FOR CURRENT USER (UPDATED FOR PAGINATION)
 */
export async function getUserReports(page = 1, limit = 120) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const skip = (page - 1) * limit;

    const reports = await Report.find({ reporter: session.user.id })
      .populate("targetNote", "title slug")
      .populate("targetBundle", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Report.countDocuments({ reporter: session.user.id });

    return { 
      success: true, 
      reports: JSON.parse(JSON.stringify(reports)),
      total,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error("Error fetching user reports:", error);
    return { success: false, error: error.message };
  }
}