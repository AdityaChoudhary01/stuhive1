"use server";

import { revalidatePath } from "next/cache";
import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";
import User from "@/lib/models/User";
import Collection from "@/lib/models/Collection";
import mongoose from "mongoose"; // 🚀 Added for ID validation
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteFileFromR2 } from "@/lib/r2"; 
import { generateReadUrl } from "@/lib/r2";
import { indexNewContent, removeContentFromIndex } from "@/lib/googleIndexing";
import { pingIndexNow } from "@/lib/indexnow"; 
import { awardHivePoints } from "@/actions/leaderboard.actions";
import { trackCreatorEvent } from "@/actions/analytics.actions";
import { createNotification } from "@/actions/notification.actions";

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in"; 

/**
 * FETCH NOTES (Pagination + Search + Filtering)
 */
export async function getNotes({ page = 1, limit = 12, search, university, course, subject, year, sort, isFeatured }) {
  await connectDB();

  try {
    const skip = (page - 1) * limit;
    let query = {};
    const conditions = [];

    // Search Logic
    if (search) {
      const s = search.trim();
      const safeSearch = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: safeSearch, $options: 'i' };
      conditions.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { university: searchRegex },
          { course: searchRegex },
          { subject: searchRegex }
        ]
      });
    }

    // Filter Logic
    if (university) conditions.push({ university: { $regex: university, $options: 'i' } });
    if (course) conditions.push({ course: { $regex: course, $options: 'i' } });
    if (subject) conditions.push({ subject: { $regex: subject, $options: 'i' } });
    if (year) conditions.push({ year: Number(year) });
    if (isFeatured) conditions.push({ isFeatured: true });

    if (conditions.length > 0) {
      query = { $and: conditions };
    }

    // Sorting
    let sortOptions = { uploadDate: -1 }; 
    if (sort === 'highestRated') sortOptions = { rating: -1 };
    if (sort === 'mostDownloaded') sortOptions = { downloadCount: -1 };
    if (sort === 'oldest') sortOptions = { uploadDate: 1 };

    // Execution
    const notes = await Note.find(query)
      .select("-reviews") 
      .populate('user', 'name avatar role email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalNotes = await Note.countDocuments(query);
    const totalPages = Math.ceil(totalNotes / limit);

    // Serialization
    const safeNotes = notes.map(note => ({
      ...note,
      _id: note._id.toString(),
      user: note.user ? {
        ...note.user,
        _id: note.user._id.toString()
      } : null,
      uploadDate: note.uploadDate ? note.uploadDate.toISOString() : new Date().toISOString(),
      createdAt: note.createdAt ? note.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: note.updatedAt ? note.updatedAt.toISOString() : new Date().toISOString(),
      reviews: [] 
    }));

    return { notes: safeNotes, totalPages, currentPage: page, totalCount: totalNotes };

  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return { notes: [], totalPages: 0, currentPage: 1, totalCount: 0 };
  }
}

/**
 * 🚀 GET SINGLE NOTE BY SLUG OR ID (Bulletproof Fallback)
 * This handles old indexed links using IDs and redirects them to slugs.
 */
export async function getNoteBySlug(identifier) {
  await connectDB();
  try {
    let query = { slug: identifier };

    // 🚀 FALLBACK: If the identifier is a valid MongoDB ID, allow searching by _id too
    // This prevents 404s for pages already indexed by Google using the old ID format.
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      query = { $or: [{ slug: identifier }, { _id: identifier }] };
    }

    const note = await Note.findOne(query)
      .populate('user', 'name avatar role email')
      .populate({
        path: 'reviews.user',
        select: 'name avatar role email'
      })
      .lean(); 

    if (!note) return null;

    return {
      ...note,
      _id: note._id.toString(),
      user: note.user ? { ...note.user, _id: note.user._id.toString() } : null,
      reviews: note.reviews ? note.reviews.map(r => ({
        ...r,
        _id: r._id.toString(),
        user: r.user ? { ...r.user, _id: r.user._id.toString() } : null,
        parentReviewId: r.parentReviewId ? r.parentReviewId.toString() : null,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
      })) : [],
      uploadDate: note.uploadDate ? note.uploadDate.toISOString() : new Date().toISOString(),
      createdAt: note.createdAt ? note.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: note.updatedAt ? note.updatedAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching note by slug/id ${identifier}:`, error);
    return null;
  }
}

/**
 * GET SINGLE NOTE BY ID (Internal Fallback)
 */
export async function getNoteById(id) {
  await connectDB();
  try {
    const note = await Note.findById(id)
      .populate('user', 'name avatar role email')
      .populate({
        path: 'reviews.user',
        select: 'name avatar role email'
      })
      .lean(); 

    if (!note) return null;

    return {
      ...note,
      _id: note._id.toString(),
      user: note.user ? { ...note.user, _id: note.user._id.toString() } : null,
      reviews: note.reviews ? note.reviews.map(r => ({
        ...r,
        _id: r._id.toString(),
        user: r.user ? { ...r.user, _id: r.user._id.toString() } : null,
        parentReviewId: r.parentReviewId ? r.parentReviewId.toString() : null,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
      })) : [],
      uploadDate: note.uploadDate ? note.uploadDate.toISOString() : new Date().toISOString(),
      createdAt: note.createdAt ? note.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: note.updatedAt ? note.updatedAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching note ${id}:`, error);
    return null;
  }
}

/**
 * GET RELATED NOTES (Smart Match)
 */
export async function getRelatedNotes(noteId) {
  await connectDB();
  try {
    const currentNote = await Note.findById(noteId).select('subject course user title').lean();
    if (!currentNote) return [];

    const titleWords = currentNote.title
      ? currentNote.title
          .split(/\s+/)
          .filter(word => word.length > 3) 
          .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) 
      : [];

    const titleRegexCondition = titleWords.length > 0 
      ? { title: { $regex: new RegExp(titleWords.join('|'), 'i') } } 
      : null;

    const orConditions = [
      { user: currentNote.user },       
      { subject: currentNote.subject }, 
      { course: currentNote.course }    
    ];

    if (titleRegexCondition) {
      orConditions.push(titleRegexCondition); 
    }

    const relatedNotes = await Note.find({
      _id: { $ne: noteId }, 
      $or: orConditions
    })
    .select('title slug university course subject year rating numReviews downloadCount uploadDate fileType fileName isFeatured fileKey thumbnailKey') 
    .populate('user', 'name avatar role')
    .limit(4)
    .sort({ rating: -1, downloadCount: -1 })
    .lean();

    return relatedNotes.map(n => ({
      ...n,
      _id: n._id.toString(),
      user: n.user ? { ...n.user, _id: n.user._id.toString() } : null,
      uploadDate: n.uploadDate?.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching related notes:', error);
    return [];
  }
}

/**
 * 🚀 CREATE NOTE & AWARD POINTS (UPDATED WITH CATEGORY)
 */
export async function createNote({ title, description, category, university, course, subject, year, fileData, userId }) {
  await connectDB();
  try {
    const newNote = new Note({
      title,
      description,
      category: category || 'University', // 🚀 Handle category dynamic selection
      university,
      course,
      subject,
      year: String(year), // 🚀 Ensure year is string to handle "Class 12th" or "2025"
      fileName: fileData.fileName,
      fileKey: fileData.fileKey,          
      thumbnailKey: fileData.thumbnailKey, 
      fileType: fileData.fileType,
      fileSize: fileData.fileSize,
      user: userId,
    });

    await newNote.save();
    
    await User.findByIdAndUpdate(userId, { $inc: { noteCount: 1 } });
    await awardHivePoints(userId, 10);

    const seoStatus = await indexNewContent(newNote.slug, 'note');
    
    // 🚀 IndexNow Ping
    const urlToPing = `${APP_URL}/notes/${newNote.slug}`;
    await pingIndexNow([urlToPing]);
    
    revalidatePath('/'); 
    revalidatePath('/search');
    
    return { success: true, noteSlug: newNote.slug, noteId: newNote._id.toString() };
  } catch (error) {
    console.error("Create Note Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 UPDATE NOTE (UPDATED WITH CATEGORY)
 */
export async function updateNote(noteId, data, userId) {
  await connectDB();
  try {
    const note = await Note.findById(noteId);
    if (!note) return { success: false, error: "Note not found" };
    
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";
    
    if (note.user.toString() !== userId && !isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    note.title = data.title || note.title;
    note.description = data.description || note.description;
    note.category = data.category || note.category; // 🚀 Handle category dynamic selection
    note.university = data.university || note.university;
    note.course = data.course || note.course;
    note.subject = data.subject || note.subject;
    note.year = data.year || note.year;

    // Optional file data update
    if (data.fileData) {
      // Delete old files from R2 first
      if (note.fileKey) await deleteFileFromR2(note.fileKey);
      if (note.thumbnailKey) await deleteFileFromR2(note.thumbnailKey);

      note.fileName = data.fileData.fileName;
      note.fileKey = data.fileData.fileKey;
      note.thumbnailKey = data.fileData.thumbnailKey;
      note.fileType = data.fileData.fileType;
      note.fileSize = data.fileData.fileSize;
    }

    await note.save();

    const urlToPing = `${APP_URL}/notes/${note.slug}`;
    await indexNewContent(note.slug, 'note');
    await pingIndexNow([urlToPing]);

    revalidatePath(`/notes/${note.slug}`);
    revalidatePath('/profile');
    revalidatePath('/search');
    
    return { success: true, noteSlug: note.slug };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * DELETE NOTE
 */
export async function deleteNote(noteId, userId) {
  await connectDB();
  
  try {
    const note = await Note.findById(noteId);
    if (!note) return { success: false, error: "Note not found" };

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";

    if (note.user.toString() !== userId && !isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    if (note.fileKey) await deleteFileFromR2(note.fileKey);
    if (note.thumbnailKey) await deleteFileFromR2(note.thumbnailKey);

    await Promise.all([
      Note.findByIdAndDelete(noteId),
      User.findByIdAndUpdate(note.user, { $inc: { noteCount: -1 } }),
      User.updateMany({ savedNotes: noteId }, { $pull: { savedNotes: noteId } }),
      Collection.updateMany({ notes: noteId }, { $pull: { notes: noteId } })
    ]);

    await removeContentFromIndex(note.slug, 'note');

    revalidatePath('/');
    revalidatePath('/search');
    revalidatePath('/profile');

    return { success: true };
  } catch (error) {
    console.error("Delete Note Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * INCREMENT DOWNLOAD COUNT, AWARD POINTS & TRACK ANALYTICS
 */
export async function incrementDownloadCount(noteId) {
  await connectDB();
  try {
    const note = await Note.findByIdAndUpdate(
      noteId, 
      { $inc: { downloadCount: 1 } },
      { new: true } 
    );

    if (note && note.user) {
      await awardHivePoints(note.user, 2);
      await trackCreatorEvent(note.user, 'downloads');
    }

    return { success: true };
  } catch (error) {
    console.error("Error incrementing download count:", error);
    return { success: false };
  }
}

/**
 * INCREMENT VIEW COUNT & TRACK ANALYTICS
 */
export async function incrementViewCount(noteId) {
  await connectDB();
  try {
    const note = await Note.findByIdAndUpdate(
      noteId, 
      { $inc: { viewCount: 1 } },
      { new: true } 
    );

    if (note && note.user) {
      await trackCreatorEvent(note.user, 'views');
    }

    return { success: true };
  } catch (error) {
    console.error("Error incrementing view count:", error);
    return { success: false };
  }
}

/**
 * ADD REVIEW
 */
export async function addReview(noteId, userId, rating, comment, parentReviewId = null) {
  await connectDB();
  try {
    const note = await Note.findById(noteId);
    if (!note) return { success: false, error: "Note not found" };

    if (!parentReviewId) {
        const alreadyReviewed = note.reviews.find(
          (r) => r.user.toString() === userId.toString() && !r.parentReviewId
        );

        if (alreadyReviewed) {
          return { success: false, error: "You have already reviewed this note." };
        }
    }

    const review = {
      user: userId,
      rating: parentReviewId ? 0 : Number(rating),
      comment,
      parentReviewId, 
    };

    note.reviews.push(review);
    
    const ratedReviews = note.reviews.filter(r => r.rating > 0);
    if (ratedReviews.length > 0) {
      note.rating = ratedReviews.reduce((acc, item) => item.rating + acc, 0) / ratedReviews.length;
    } else {
      note.rating = 0;
    }
    note.numReviews = note.reviews.filter(r => !r.parentReviewId).length;
    
    await note.save();

    const noteOwnerId = note.user.toString();
    const actionUserId = userId.toString();
    const notificationLink = `/notes/${note.slug}#reviews`; 

    if (parentReviewId) {
      const parentReview = note.reviews.find(r => r._id.toString() === parentReviewId.toString());
      if (parentReview) {
        const parentCommenterId = parentReview.user.toString();
        if (parentCommenterId !== actionUserId) {
          await createNotification({
            recipientId: parentCommenterId,
            actorId: userId,
            type: 'SYSTEM',
            message: `Someone replied to your comment on "${note.title}".`,
            link: notificationLink
          });
        }
        if (noteOwnerId !== actionUserId && noteOwnerId !== parentCommenterId) {
          await createNotification({
            recipientId: noteOwnerId,
            actorId: userId,
            type: 'SYSTEM',
            message: `New discussion on your note "${note.title}".`,
            link: notificationLink
          });
        }
      }
    } else {
      if (noteOwnerId !== actionUserId) {
        await createNotification({
          recipientId: noteOwnerId,
          actorId: userId,
          type: 'SYSTEM',
          message: `Someone just left a ${rating}-star review on your note "${note.title}".`,
          link: notificationLink
        });
      }
    }

    revalidatePath(`/notes/${note.slug}`);

    const updatedNote = await Note.findById(noteId).populate("reviews.user", "name avatar").lean();
    const safeReviews = updatedNote.reviews.map(r => ({
       ...r,
       _id: r._id.toString(),
       parentReviewId: r.parentReviewId ? r.parentReviewId.toString() : null,
       user: r.user ? { ...r.user, _id: r.user._id.toString() } : null,
       createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
    }));

    return { success: true, reviews: safeReviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * GET USER NOTES
 */
export async function getUserNotes(userId, page = 1, limit = 10) {
  await connectDB();
  try {
    const skip = (page - 1) * limit;
    const notes = await Note.find({ user: userId })
      .select("-reviews") 
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Note.countDocuments({ user: userId });

    const safeNotes = notes.map(n => ({
      ...n, 
      _id: n._id.toString(), 
      user: n.user.toString(),
      uploadDate: n.uploadDate ? n.uploadDate.toISOString() : new Date().toISOString(),
      createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: n.updatedAt ? n.updatedAt.toISOString() : new Date().toISOString(),
      reviews: [] 
    }));

    return {
      notes: safeNotes,
      total,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error("Error in getUserNotes:", error);
    return { notes: [], total: 0 };
  }
}

/**
 * DELETE REVIEW
 */
export async function deleteReview(noteId, reviewId) {
  await connectDB();
  try {
    const note = await Note.findById(noteId);
    if (!note) return { success: false, error: "Note not found" };

    note.reviews = note.reviews.filter(
      (r) => r._id.toString() !== reviewId && r.parentReviewId?.toString() !== reviewId
    );

    const ratedReviews = note.reviews.filter((r) => r.rating > 0);
    note.numReviews = note.reviews.filter(r => !r.parentReviewId).length;
    note.rating = ratedReviews.length > 0 
      ? ratedReviews.reduce((acc, item) => item.rating + acc, 0) / ratedReviews.length 
      : 0;

    await note.save();

    const updatedNote = await Note.findById(noteId)
      .populate("reviews.user", "name avatar")
      .lean();

    const safeReviews = updatedNote.reviews.map(r => ({
      ...r,
      _id: r._id.toString(),
      parentReviewId: r.parentReviewId ? r.parentReviewId.toString() : null,
      user: r.user ? { ...r.user, _id: r.user._id.toString() } : null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
    }));

    return { success: true, reviews: safeReviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * GET NOTE DOWNLOAD URL
 */
export async function getNoteDownloadUrl(fileKey, fileName) {
  try {
    const url = await generateReadUrl(fileKey, fileName);
    return url;
  } catch (error) {
    console.error("Failed to generate R2 link:", error);
    throw new Error("Could not get download link");
  }
}