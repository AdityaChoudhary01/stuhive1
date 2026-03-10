"use server";

import connectDB from "@/lib/db";
import Opportunity from "@/lib/models/Opportunity";
// 🚀 ADDED MISSING IMPORTS FOR WATCHLIST
import User from "@/lib/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Inside actions/opportunity.actions.js
export async function getCategorizedOpportunities() {
  await connectDB();
  try {
    const opportunities = await Opportunity.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .select('title slug category updatedAt')
      .lean();

    // Group them into all 6 buckets
    const results = opportunities.filter(o => o.category === 'Result');
    const admitCards = opportunities.filter(o => o.category === 'Admit Card');
    const latestJobs = opportunities.filter(o => o.category === 'Latest Jobs');
    const admissions = opportunities.filter(o => o.category === 'Admission');
    const syllabuses = opportunities.filter(o => o.category === 'Syllabus');
    const answerKeys = opportunities.filter(o => o.category === 'Answer Key');

    return { 
      success: true, 
      data: {
        results: JSON.parse(JSON.stringify(results)),
        admitCards: JSON.parse(JSON.stringify(admitCards)),
        latestJobs: JSON.parse(JSON.stringify(latestJobs)),
        admissions: JSON.parse(JSON.stringify(admissions)),
        syllabuses: JSON.parse(JSON.stringify(syllabuses)),
        answerKeys: JSON.parse(JSON.stringify(answerKeys))
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Fetch a single opportunity by its slug for the details page
export async function getOpportunityBySlug(slug) {
  await connectDB();
  try {
    const opportunity = await Opportunity.findOne({ slug, isPublished: true }).lean();
    return { success: true, opportunity: JSON.parse(JSON.stringify(opportunity)) };
  } catch (error) {
    return { success: false, opportunity: null };
  }
}

/**
 * 🚀 TOGGLE SAVE OPPORTUNITY
 */
export async function toggleSaveOpportunity(opportunityId) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Please log in to save updates." };

  try {
    const user = await User.findById(session.user.id);
    if (!user) return { success: false, error: "User not found" };

    const isSaved = user.savedOpportunities?.includes(opportunityId);
    
    if (isSaved) {
      await User.findByIdAndUpdate(session.user.id, {
        $pull: { savedOpportunities: opportunityId }
      });
    } else {
      await User.findByIdAndUpdate(session.user.id, {
        $addToSet: { savedOpportunities: opportunityId }
      });
    }

    // Revalidate paths where this button might appear
    revalidatePath("/updates");
    revalidatePath(`/updates/${opportunityId}`);
    revalidatePath("/profile"); 

    return { success: true, isSaved: !isSaved };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 FETCH USER'S WATCHLIST (WITH PAGINATION)
 */
export async function getMyWatchlist(page = 1, limit = 120) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const skip = (page - 1) * limit;

  try {
    const user = await User.findById(session.user.id).populate({
      path: 'savedOpportunities',
      select: 'title slug category organization importantDates isPublished createdAt',
      match: { isPublished: true }, // Only fetch if it hasn't been deleted/unpublished
      // 🚀 PERFORMANCE FIX: Added sorting, limit, and skip to populate options!
      options: { sort: { createdAt: -1 }, skip: skip, limit: limit } 
    }).lean();

    if (!user) return { success: false, error: "User not found" };

    return { 
      success: true, 
      opportunities: JSON.parse(JSON.stringify(user.savedOpportunities || [])) 
    };
  } catch(error) {
    return { success: false, error: error.message };
  }
}