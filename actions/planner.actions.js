"use server";

import connectDB from "@/lib/db";
import StudyEvent from "@/lib/models/StudyEvent";
import Note from "@/lib/models/Note";
import Blog from "@/lib/models/Blog";
import User from "@/lib/models/User"; 
import { revalidatePath } from "next/cache";

// 🚀 SEO IMPORTS
import { indexNewContent, removeContentFromIndex } from "@/lib/googleIndexing"; 
import { pingIndexNow } from "@/lib/indexnow";

/**
 * 🚀 INTERNAL HELPER: Check and award "Consistent Learner" badge
 * Now returns true if a badge was JUST awarded in this call.
 */
async function checkAndAwardBadges(userId) {
  const plans = await StudyEvent.find({ user: userId });
  
  // Extract all unique dates where ANY step was completed across all plans
  const completionDates = plans.flatMap(p => 
    p.resources.filter(r => r.isDone && r.completedAt)
      .map(r => r.completedAt.toISOString().split('T')[0])
  );
  
  const uniqueDates = [...new Set(completionDates)].sort();

  if (uniqueDates.length < 3) return false;

  // Check for 3 consecutive days
  let consecutiveDays = 1;
  let hasThreeDayStreak = false;

  for (let i = 1; i < uniqueDates.length; i++) {
    const current = new Date(uniqueDates[i]);
    const prev = new Date(uniqueDates[i - 1]);
    const diffTime = Math.abs(current - prev);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      consecutiveDays++;
    } else {
      consecutiveDays = 1;
    }

    if (consecutiveDays >= 3) {
      hasThreeDayStreak = true;
      break;
    }
  }

  if (hasThreeDayStreak) {
    const user = await User.findById(userId);
    // Only return true if they didn't already have the badge (first time awarding)
    if (!user.badges.includes("Consistent Learner")) {
      await User.findByIdAndUpdate(userId, { 
        $addToSet: { badges: "Consistent Learner" } 
      });
      return true; 
    }
  }
  
  return false;
}

/**
 * 1. CREATE A NEW STUDY GOAL / ROADMAP
 */
export async function createStudyEvent(userId, data) {
  await connectDB();
  try {
    const newEvent = await StudyEvent.create({
      user: userId,
      title: data.title,
      examDate: new Date(data.examDate),
      category: data.category || "University", 
    });
    revalidatePath("/planner");
    revalidatePath("/profile");
    return { success: true, event: JSON.parse(JSON.stringify(newEvent)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 2. TOGGLE STEP COMPLETION
 * Updated to return badgeAwarded flag for Confetti trigger
 */
export async function toggleStepCompletion(userId, planId, resourceId) {
  await connectDB();
  try {
    const plan = await StudyEvent.findOne({ _id: planId, user: userId });
    if (!plan) return { success: false, error: "Plan not found" };

    const resource = plan.resources.find(
      (r) => r.resourceId.toString() === resourceId.toString()
    );

    let badgeAwarded = false;

    if (resource) {
      resource.isDone = !resource.isDone;
      resource.completedAt = resource.isDone ? new Date() : null;
      await plan.save();

      if (resource.isDone) {
        // 🚀 NEW: Check if this completion triggered the 3-day badge
        badgeAwarded = await checkAndAwardBadges(userId);
      }
    }

    revalidatePath("/planner");
    return { success: true, badgeAwarded }; // 🚀 Return the trigger for the UI
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 HELPER: Hydrate resources
 */
async function hydratePlanResources(plan) {
  if (!plan.resources || plan.resources.length === 0) return plan;

  const enrichedResources = await Promise.all(
    plan.resources.map(async (res) => {
      let slug = null;
      let title = "Unknown Resource";
      try {
        if (res.resourceType === "Note") {
          const note = await Note.findById(res.resourceId).select("slug title").lean();
          if (note) {
            slug = note.slug;
            title = note.title;
          }
        } else if (res.resourceType === "Blog") {
          const blog = await Blog.findById(res.resourceId).select("slug title").lean();
          if (blog) {
            slug = blog.slug;
            title = blog.title;
          }
        }
      } catch (e) {
        console.error(`Failed to hydrate resource ${res.resourceId}`);
      }

      return {
        ...res,
        resourceSlug: slug || res.resourceId.toString(),
        resourceTitle: title,
        isDone: res.isDone || false,
        completedAt: res.completedAt || null, 
        estimatedTime: res.estimatedTime || 60, 
      };
    })
  );

  return { ...plan, resources: enrichedResources };
}

/**
 * 3. GET USER'S ACTIVE PLANS
 */
export async function getUserStudyPlans(userId) {
  await connectDB();
  try {
    const plans = await StudyEvent.find({ user: userId, isCompleted: false })
      .sort({ examDate: 1 })
      .lean();

    const hydratedPlans = await Promise.all(plans.map((p) => hydratePlanResources(p)));

    return { success: true, plans: JSON.parse(JSON.stringify(hydratedPlans)) };
  } catch (error) {
    return { success: false, plans: [] };
  }
}

/**
 * 4. GET SINGLE PLAN BY SLUG
 */
export async function getStudyPlanBySlug(slug) {
  await connectDB();
  try {
    const plan = await StudyEvent.findOne({ slug, isPublic: true })
      // 🚀 THE FIX: Added isVerifiedEducator
      .populate("user", "name avatar isVerifiedEducator")
      .lean();

    if (!plan) return { success: false, plan: null };

    const hydratedPlan = await hydratePlanResources(plan);

    return { success: true, plan: JSON.parse(JSON.stringify(hydratedPlan)) };
  } catch (error) {
    return { success: false, plan: null };
  }
}

/**
 * 5. CLONE A COMMUNITY ROADMAP
 */
export async function cloneStudyPlan(userId, originalPlanId) {
  await connectDB();
  try {
    const original = await StudyEvent.findById(originalPlanId);
    if (!original) return { success: false, error: "Original plan not found" };

    const clonedResources = original.resources.map(res => ({
      resourceId: res.resourceId,
      resourceType: res.resourceType,
      estimatedTime: res.estimatedTime || 60, 
      isDone: false,
      completedAt: null 
    }));

    const clonedPlan = await StudyEvent.create({
      user: userId,
      title: `Clone: ${original.title}`,
      examDate: original.examDate,
      category: original.category,
      resources: clonedResources,
      isPublic: false,
    });

    original.clones = (original.clones || 0) + 1;
    await original.save();

    revalidatePath("/planner");
    return { success: true, newId: clonedPlan._id.toString() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 6. TOGGLE VISIBILITY (Publishing Logic with 🚀 SEO INDEXING)
 */
export async function togglePlanVisibility(userId, planId, makePublic) {
  await connectDB();
  try {
    const plan = await StudyEvent.findOne({ _id: planId, user: userId });
    if (!plan) return { success: false, error: "Plan not found" };

    plan.isPublic = makePublic;

    if (makePublic && !plan.slug) {
      const baseSlug = plan.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const randomString = Math.random().toString(36).substring(2, 7);
      plan.slug = `${baseSlug}-${randomString}`;
    }

    await plan.save();

    const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";
    const roadmapUrl = `${APP_URL}/roadmaps/${plan.slug}`;

    if (makePublic) {
      await indexNewContent(plan.slug, "roadmap").catch(err => console.error("Google Indexing Error:", err));
      await pingIndexNow(roadmapUrl);
    } else {
      await removeContentFromIndex(plan.slug, "roadmap").catch(err => console.error("Google Removal Error:", err));
    }

    revalidatePath("/planner");
    revalidatePath("/roadmaps");
    return { success: true, slug: plan.slug, isPublic: plan.isPublic };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 7. GET ALL PUBLIC ROADMAPS
 */
export async function getPublicStudyPlans(searchQuery = "") {
  await connectDB();
  try {
    let query = { isPublic: true };
    if (searchQuery) {
      query.title = { $regex: searchQuery, $options: "i" };
    }

    const plans = await StudyEvent.find(query)
      // 🚀 THE FIX: Added isVerifiedEducator
      .populate("user", "name avatar isVerifiedEducator")
      .sort({ clones: -1, createdAt: -1 })
      .lean();

    const hydratedPlans = await Promise.all(plans.map((p) => hydratePlanResources(p)));

    return { success: true, plans: JSON.parse(JSON.stringify(hydratedPlans)) };
  } catch (error) {
    return { success: false, plans: [] };
  }
}

/**
 * 8. ADD RESOURCE TO PLAN
 */
export async function addResourceToPlan(userId, eventId, resourceData) {
  await connectDB();
  try {
    const event = await StudyEvent.findOne({ _id: eventId, user: userId });
    if (!event) return { success: false, error: "Plan not found" };

    const exists = event.resources.some(
      (r) => r.resourceId.toString() === resourceData.id
    );
    if (exists) return { success: false, error: "Already in your study plan!" };

    event.resources.push({
      resourceId: resourceData.id,
      resourceType: resourceData.type,
      isDone: false,
      estimatedTime: resourceData.estimatedTime || 60 
    });

    await event.save();
    revalidatePath("/planner");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 9. DELETE A PLAN
 */
export async function deleteStudyPlan(userId, planId) {
  await connectDB();
  try {
    const deleted = await StudyEvent.findOneAndDelete({ _id: planId, user: userId });
    if (!deleted) return { success: false, error: "Unauthorized" };

    revalidatePath("/planner");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 10. REMOVE A RESOURCE FROM PLAN
 */
export async function removeResourceFromPlan(userId, planId, resourceId) {
  await connectDB();
  try {
    const plan = await StudyEvent.findOne({ _id: planId, user: userId });
    if (!plan) return { success: false, error: "Plan not found" };

    plan.resources = plan.resources.filter(
      (r) => r.resourceId.toString() !== resourceId.toString()
    );
    await plan.save();

    revalidatePath("/planner");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}