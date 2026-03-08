"use server";

import connectDB from "@/lib/db";
import Request from "@/lib/models/Request";
import Note from "@/lib/models/Note";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notification.actions";
import mongoose from "mongoose";

/**
 * 1. CREATE A REQUEST
 */
export async function createRequest(data, userId) {
  await connectDB();
  try {
    const newRequest = await Request.create({
      ...data,
      requester: userId,
    });
    
    revalidatePath("/requests");
    // Also revalidate university hub if university is provided
    if (data.university) {
        const uniSlug = data.university.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        revalidatePath(`/univ/${uniSlug}`);
    }

    return { success: true, request: JSON.parse(JSON.stringify(newRequest)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 2. GET ALL REQUESTS (With Pagination & Filters)
 */
export async function getRequests({ page = 1, limit = 12, filter = "all", universityRegex = null } = {}) {
  await connectDB();
  try {
    const skip = (page - 1) * limit;
    const query = {};

    if (filter === "pending") query.status = "pending";
    if (filter === "fulfilled") query.status = "fulfilled";

    // 🚀 Support for University Hub filtering
    if (universityRegex) {
        query.$or = [
            { university: universityRegex },
            { title: universityRegex }
        ];
    }

    const requests = await Request.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate("requester", "name avatar isVerifiedEducator") // 🚀 Added isVerifiedEducator
      .populate({
        path: "fulfillmentNote",
        select: "title slug",
        populate: { path: "user", select: "name isVerifiedEducator" } // 🚀 Populated nested user for blue tick check
      })
      .lean();

    const total = await Request.countDocuments(query);

    return {
      requests: JSON.parse(JSON.stringify(requests)),
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    };
  } catch (error) {
    console.error("Error fetching requests:", error);
    return { requests: [], totalCount: 0, totalPages: 0 };
  }
}

/**
 * 3. FULFILL A REQUEST
 */
export async function fulfillRequest(requestId, noteUrlOrId, userId) {
  await connectDB();
  try {
    // 🚀 Extract identifier from URL
    let identifier = noteUrlOrId.trim();
    if (noteUrlOrId.includes("/notes/")) {
        const parts = noteUrlOrId.split("/notes/");
        identifier = parts[1].split("?")[0].replace(/\/$/, ""); 
    }

    // 🚀 Smart Search
    let query = { slug: identifier };
    if (mongoose.Types.ObjectId.isValid(identifier)) {
        query = { $or: [{ _id: identifier }, { slug: identifier }] };
    }

    // 1. Verify Note Exists
    const note = await Note.findOne(query);
    if (!note) return { success: false, error: "Note not found. Check the link and try again." };

    // 2. Update Request
    const request = await Request.findByIdAndUpdate(
      requestId,
      {
        status: "fulfilled",
        fulfilledBy: userId,
        fulfillmentNote: note._id,
      },
      { new: true }
    );

    // 3. 🚀 TRIGGER NOTIFICATION
    if (request && request.requester.toString() !== userId.toString()) {
      await createNotification({
        recipientId: request.requester,
        actorId: userId,
        type: 'REQUEST_FULFILLED',
        message: `Good news! Your community request "${request.title}" has been fulfilled!`,
        link: `/notes/${note.slug || note._id}`
      });
    }

    revalidatePath("/requests");
    
    // Revalidate university hub cache if applicable
    if (request.university) {
        const uniSlug = request.university.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        revalidatePath(`/univ/${uniSlug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Fulfill Request Error:", error);
    return { success: false, error: "An error occurred while linking the note." };
  }
}

/**
 * 4. DELETE A REQUEST
 * Only the requester or an admin can delete.
 */
export async function deleteRequest(requestId, userId) {
  await connectDB();
  try {
    const request = await Request.findById(requestId);
    if (!request) return { success: false, error: "Request not found" };

    // Authorization check: User must be owner (Admin role check can be added if needed)
    if (request.requester.toString() !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await Request.findByIdAndDelete(requestId);

    revalidatePath("/requests");
    if (request.university) {
      const uniSlug = request.university.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      revalidatePath(`/univ/${uniSlug}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}