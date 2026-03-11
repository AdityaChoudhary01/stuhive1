'use server';

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { notes, users, noteReviews, userBookmarks, collectionNotes, purchases } from "@/db/schema";
import { eq, and, or, like, desc, asc, sql, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { deleteFileFromR2, generateReadUrl } from "@/lib/r2";
import { indexNewContent, removeContentFromIndex } from "@/lib/googleIndexing";
import { pingIndexNow } from "@/lib/indexnow"; 
import { awardHivePoints } from "@/actions/leaderboard.actions";
import { trackCreatorEvent } from "@/actions/analytics.actions";
import { createNotification } from "@/actions/notification.actions";

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in"; 

/**
 * 🛠️ HELPER: Validate UUID (Replaces mongoose.Types.ObjectId.isValid)
 */
const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * FETCH NOTES (Pagination + Search + Filtering)
 */
export async function getNotes({ page = 1, limit = 12, search, university, course, subject, year, sort, isFeatured }) {
  try {
    const db = getDb();
    const skip = (page - 1) * limit;
    const conditions = [];

    // Search Logic (Case-insensitive LIKE in SQLite)
    if (search) {
      const s = `%${search.trim()}%`;
      conditions.push(or(
        like(notes.title, s),
        like(notes.description, s),
        like(notes.university, s),
        like(notes.course, s),
        like(notes.subject, s)
      ));
    }

    // Filter Logic
    if (university) conditions.push(like(notes.university, `%${university}%`));
    if (course) conditions.push(like(notes.course, `%${course}%`));
    if (subject) conditions.push(like(notes.subject, `%${subject}%`));
    if (year) conditions.push(eq(notes.year, String(year)));
    if (isFeatured) conditions.push(eq(notes.isFeatured, true));
    
    // Default: exclude archived notes from public search
    conditions.push(eq(notes.isArchived, false));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    let orderByClause = desc(notes.createdAt);
    if (sort === 'highestRated') orderByClause = desc(notes.rating);
    if (sort === 'mostDownloaded') orderByClause = desc(notes.downloadCount);
    if (sort === 'oldest') orderByClause = asc(notes.createdAt);

    // Execution
    const fetchedNotes = await db.select({
      note: notes,
      user: {
        id: users.id, name: users.name, avatar: users.avatar, 
        role: users.role, email: users.email, isVerifiedEducator: users.isVerifiedEducator
      }
    })
    .from(notes)
    .leftJoin(users, eq(notes.userId, users.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(skip);

    // Total Count
    const totalCountQuery = await db.select({ count: sql`count(*)` }).from(notes).where(whereClause);
    const totalNotes = Number(totalCountQuery[0]?.count || 0);
    const totalPages = Math.ceil(totalNotes / limit);

    // Serialization
    const safeNotes = fetchedNotes.map(row => ({
      ...row.note,
      _id: row.note.id, // Legacy support for frontend components
      user: row.user ? { ...row.user, _id: row.user.id } : null,
      reviews: [] 
    }));

    return { notes: safeNotes, totalPages, currentPage: page, totalCount: totalNotes };

  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return { notes: [], totalPages: 0, currentPage: 1, totalCount: 0 };
  }
}

/**
 * 🚀 GET SINGLE NOTE BY SLUG OR ID 
 */
export async function getNoteBySlug(identifier) {
  try {
    const db = getDb();
    const isId = isValidUUID(identifier);
    
    const condition = isId 
      ? or(eq(notes.slug, identifier), eq(notes.id, identifier))
      : eq(notes.slug, identifier);

    const result = await db.select({ note: notes, user: users })
      .from(notes)
      .leftJoin(users, eq(notes.userId, users.id))
      .where(condition)
      .limit(1);

    if (result.length === 0) return null;
    const { note, user: author } = result[0];

    // Fetch Reviews
    const reviewRows = await db.select({ review: noteReviews, user: users })
      .from(noteReviews)
      .leftJoin(users, eq(noteReviews.userId, users.id))
      .where(eq(noteReviews.noteId, note.id))
      .orderBy(asc(noteReviews.createdAt));

    const reviews = reviewRows.map(r => ({
      ...r.review,
      _id: r.review.id,
      user: r.user ? { ...r.user, _id: r.user.id } : null,
    }));

    return {
      ...note,
      _id: note.id,
      user: author ? { ...author, _id: author.id } : null,
      reviews
    };
  } catch (error) {
    console.error(`Error fetching note by slug/id ${identifier}:`, error);
    return null;
  }
}

/**
 * GET SINGLE NOTE BY ID 
 */
export async function getNoteById(id) {
  return await getNoteBySlug(id); // Re-use the robust slug function
}

/**
 * GET RELATED NOTES (Smart Match)
 */
export async function getRelatedNotes(noteId) {
  try {
    const db = getDb();
    const currentNoteRows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (currentNoteRows.length === 0) return [];
    const currentNote = currentNoteRows[0];

    const titleWords = currentNote.title
      ? currentNote.title.split(/\s+/).filter(word => word.length > 3)
      : [];

    const orConditions = [
      eq(notes.userId, currentNote.userId),      
      eq(notes.subject, currentNote.subject), 
      eq(notes.course, currentNote.course)    
    ];

    titleWords.forEach(word => {
      orConditions.push(like(notes.title, `%${word}%`));
    });

    const relatedRows = await db.select({ note: notes, user: users })
      .from(notes)
      .leftJoin(users, eq(notes.userId, users.id))
      .where(and(
        ne(notes.id, noteId),
        eq(notes.isArchived, false),
        or(...orConditions)
      ))
      .limit(4)
      .orderBy(desc(notes.rating), desc(notes.downloadCount));

    return relatedRows.map(n => ({
      ...n.note,
      _id: n.note.id,
      user: n.user ? { ...n.user, _id: n.user.id } : null,
    }));
  } catch (error) {
    console.error('Error fetching related notes:', error);
    return [];
  }
}

/**
 * 🚀 CREATE NOTE & AWARD POINTS
 */
export async function createNote({ title, description, category, university, course, subject, year, isPaid, price, previewPages, fileData, userId }) {
  try {
    const finalIsPaid = Boolean(isPaid);
    const finalPrice = finalIsPaid ? Number(price) : 0;
    const finalPreviewPages = finalIsPaid ? Number(previewPages) : 0;

    if (finalIsPaid && (finalPrice < 10 || finalPrice > 1000)) {
      return { success: false, error: "Price must be between ₹10 and ₹1000" };
    }

    const db = getDb();
    const newNoteId = crypto.randomUUID();
    const baseSlug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'resource';
    const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.insert(notes).values({
      id: newNoteId,
      title,
      slug,
      description,
      category: category || 'University', 
      university,
      course,
      subject,
      year: String(year),
      isPaid: finalIsPaid,
      price: finalPrice,
      previewPages: finalPreviewPages,
      fileName: fileData.fileName,
      fileKey: fileData.fileKey,          
      thumbnailKey: fileData.thumbnailKey, 
      previewKey: fileData.previewKey || null, 
      fileType: fileData.fileType,
      fileSize: fileData.fileSize,
      userId: userId,
    });
    
    // Update user stats (Raw SQL increment)
    await db.update(users).set({ noteCount: sql`${users.noteCount} + 1` }).where(eq(users.id, userId));
    await awardHivePoints(userId, 10);

    await indexNewContent(slug, 'note').catch(() => {});
    await pingIndexNow([`${APP_URL}/notes/${slug}`]).catch(() => {});
    
    revalidatePath('/'); 
    revalidatePath('/search');
    
    return { success: true, noteSlug: slug, noteId: newNoteId };
  } catch (error) {
    console.error("Create Note Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 UPDATE NOTE (WITH FRAUD PROTECTION)
 */
export async function updateNote(noteId, data, userId) {
  try {
    const db = getDb();
    const noteRows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (noteRows.length === 0) return { success: false, error: "Note not found" };
    const note = noteRows[0];
    
    const session = await auth();
    const isAdmin = session?.user?.role === "admin";
    
    if (note.userId !== userId && !isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const hasSales = note.salesCount > 0;
    if (hasSales && data.fileData && !isAdmin) {
      return { success: false, error: "This note has active buyers. You cannot change the file." };
    }

    const updateData = {
      title: data.title || note.title,
      description: data.description || note.description,
      category: data.category || note.category, 
      university: data.university || note.university,
      course: data.course || note.course,
      subject: data.subject || note.subject,
      year: data.year || note.year,
    };

    if (data.hasOwnProperty('isPaid')) {
      updateData.isPaid = Boolean(data.isPaid);
      updateData.price = updateData.isPaid ? Number(data.price) : 0;
      updateData.previewPages = updateData.isPaid ? Number(data.previewPages) : 0;
    }

    if (data.fileData) {
      if (note.fileKey) await deleteFileFromR2(note.fileKey);
      if (note.thumbnailKey) await deleteFileFromR2(note.thumbnailKey);
      if (note.previewKey) await deleteFileFromR2(note.previewKey); 

      updateData.fileName = data.fileData.fileName;
      updateData.fileKey = data.fileData.fileKey;
      updateData.thumbnailKey = data.fileData.thumbnailKey;
      updateData.previewKey = data.fileData.previewKey || null;
      updateData.fileType = data.fileData.fileType;
      updateData.fileSize = data.fileData.fileSize;
    }

    await db.update(notes).set(updateData).where(eq(notes.id, noteId));

    await indexNewContent(note.slug, 'note').catch(() => {});
    await pingIndexNow([`${APP_URL}/notes/${note.slug}`]).catch(() => {});

    revalidatePath(`/notes/${note.slug}`);
    revalidatePath('/profile');
    revalidatePath('/search');
    
    return { success: true, noteSlug: note.slug };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🛡️ DELETE / ARCHIVE NOTE
 */
export async function deleteNote(noteId, userId) {
  try {
    const db = getDb();
    const noteRows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (noteRows.length === 0) return { success: false, error: "Note not found" };
    const note = noteRows[0];

    const session = await auth();
    const isAdmin = session?.user?.role === "admin";

    if (note.userId !== userId && !isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const hasSales = note.salesCount > 0;

    // 🚀 ARCHIVE LOGIC
    if (hasSales && !isAdmin) {
      await db.update(notes).set({ isArchived: true }).where(eq(notes.id, noteId));
      await removeContentFromIndex(note.slug, 'note').catch(() => {});
      
      revalidatePath('/search');
      revalidatePath('/profile');
      return { success: true, message: "Note archived. Active buyers still have access." };
    }

    // 🚀 PERMANENT DELETION
    if (note.fileKey) await deleteFileFromR2(note.fileKey);
    if (note.thumbnailKey) await deleteFileFromR2(note.thumbnailKey);
    if (note.previewKey) await deleteFileFromR2(note.previewKey);

    await db.delete(notes).where(eq(notes.id, noteId));
    await db.update(users).set({ noteCount: sql`${users.noteCount} - 1` }).where(eq(users.id, note.userId));
    
    // Clean up junction tables
    await db.delete(userBookmarks).where(eq(userBookmarks.noteId, noteId));
    await db.delete(collectionNotes).where(eq(collectionNotes.noteId, noteId));
    // Note: We don't delete `purchases` so buyers keep their transaction receipts

    await removeContentFromIndex(note.slug, 'note').catch(() => {});

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
 * INCREMENT DOWNLOAD COUNT
 */
export async function incrementDownloadCount(noteId) {
  try {
    const db = getDb();
    await db.update(notes).set({ downloadCount: sql`${notes.downloadCount} + 1` }).where(eq(notes.id, noteId));
    const noteRows = await db.select({ userId: notes.userId }).from(notes).where(eq(notes.id, noteId)).limit(1);
    
    if (noteRows.length > 0) {
      await awardHivePoints(noteRows[0].userId, 2);
      await trackCreatorEvent(noteRows[0].userId, 'downloads');
    }
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

/**
 * INCREMENT VIEW COUNT
 */
export async function incrementViewCount(noteId) {
  try {
    const db = getDb();
    await db.update(notes).set({ viewCount: sql`${notes.viewCount} + 1` }).where(eq(notes.id, noteId));
    const noteRows = await db.select({ userId: notes.userId }).from(notes).where(eq(notes.id, noteId)).limit(1);
    
    if (noteRows.length > 0) {
      await trackCreatorEvent(noteRows[0].userId, 'views');
    }
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

/**
 * ADD REVIEW
 */
export async function addReview(noteId, userId, rating, comment, parentReviewId = null) {
  try {
    const db = getDb();
    const noteRows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (noteRows.length === 0) return { success: false, error: "Note not found" };
    const note = noteRows[0];

    // Check if already reviewed
    if (!parentReviewId) {
      const existingReviews = await db.select().from(noteReviews)
        .where(and(eq(noteReviews.noteId, noteId), eq(noteReviews.userId, userId), sql`parent_review_id IS NULL`));
      
      if (existingReviews.length > 0) {
        return { success: false, error: "You have already reviewed this note." };
      }
    }

    // Insert Review
    await db.insert(noteReviews).values({
      noteId,
      userId,
      rating: parentReviewId ? 0 : Number(rating),
      comment,
      parentReviewId
    });

    // Recalculate Rating
    const allReviews = await db.select().from(noteReviews).where(eq(noteReviews.noteId, noteId));
    const ratedReviews = allReviews.filter(r => r.rating > 0);
    
    let newAvgRating = 0;
    if (ratedReviews.length > 0) {
      newAvgRating = ratedReviews.reduce((acc, r) => r.rating + acc, 0) / ratedReviews.length;
    }
    const totalPrimaryReviews = allReviews.filter(r => !r.parentReviewId).length;

    await db.update(notes).set({ rating: newAvgRating, numReviews: totalPrimaryReviews }).where(eq(notes.id, noteId));

    // Notifications logic (simplified for brevity, matching existing flow)
    const notificationLink = `/notes/${note.slug}#reviews`; 
    if (parentReviewId) {
       const parentRev = allReviews.find(r => r.id === parentReviewId);
       if (parentRev && parentRev.userId !== userId) {
         await createNotification({
            recipientId: parentRev.userId, actorId: userId, type: 'SYSTEM',
            message: `Someone replied to your comment on "${note.title}".`, link: notificationLink
         });
       }
    } else if (note.userId !== userId) {
      await createNotification({
        recipientId: note.userId, actorId: userId, type: 'SYSTEM',
        message: `Someone just left a ${rating}-star review on your note "${note.title}".`, link: notificationLink
      });
    }

    revalidatePath(`/notes/${note.slug}`);
    
    // Return updated reviews
    const fullReviews = await db.select({ review: noteReviews, user: users })
      .from(noteReviews).leftJoin(users, eq(noteReviews.userId, users.id))
      .where(eq(noteReviews.noteId, noteId)).orderBy(asc(noteReviews.createdAt));

    const safeReviews = fullReviews.map(r => ({
      ...r.review,
      _id: r.review.id,
      user: r.user ? { ...r.user, _id: r.user.id } : null,
    }));

    return { success: true, reviews: safeReviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * GET USER NOTES (Simple)
 */
export async function getUserNotes(userId, page = 1, limit = 10) {
  try {
    const db = getDb();
    const skip = (page - 1) * limit;
    
    const userNotes = await db.select().from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt))
      .limit(limit).offset(skip);

    const countQuery = await db.select({ count: sql`count(*)` }).from(notes).where(eq(notes.userId, userId));
    const total = Number(countQuery[0].count);

    return { notes: userNotes, total, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    return { notes: [], total: 0 };
  }
}

/**
 * DELETE REVIEW
 */
export async function deleteReview(noteId, reviewId) {
  try {
    const db = getDb();
    // Delete review and any replies
    await db.delete(noteReviews).where(or(eq(noteReviews.id, reviewId), eq(noteReviews.parentReviewId, reviewId)));

    // Recalculate
    const allReviews = await db.select().from(noteReviews).where(eq(noteReviews.noteId, noteId));
    const ratedReviews = allReviews.filter(r => r.rating > 0);
    
    let newAvgRating = 0;
    if (ratedReviews.length > 0) {
      newAvgRating = ratedReviews.reduce((acc, r) => r.rating + acc, 0) / ratedReviews.length;
    }
    const totalPrimaryReviews = allReviews.filter(r => !r.parentReviewId).length;

    await db.update(notes).set({ rating: newAvgRating, numReviews: totalPrimaryReviews }).where(eq(notes.id, noteId));
    
    const fullReviews = await db.select({ review: noteReviews, user: users })
      .from(noteReviews).leftJoin(users, eq(noteReviews.userId, users.id))
      .where(eq(noteReviews.noteId, noteId)).orderBy(asc(noteReviews.createdAt));

    const safeReviews = fullReviews.map(r => ({
      ...r.review,
      _id: r.review.id,
      user: r.user ? { ...r.user, _id: r.user.id } : null,
    }));

    return { success: true, reviews: safeReviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 SECURED GET NOTE DOWNLOAD URL
 */
export async function getNoteDownloadUrl(noteId) {
  try {
    const db = getDb();
    const session = await auth();

    const noteRows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (noteRows.length === 0) throw new Error("Note not found");
    const note = noteRows[0];

    let hasAccess = false;
    
    if (!note.isPaid || note.price === 0) {
        hasAccess = true;
    } else if (session?.user) {
        const userId = session.user.id;
        
        if (note.userId === userId) {
          hasAccess = true; // Creator
        } else if (session.user.role === 'admin') {
          hasAccess = true; // Admin
        } else {
          // Check if purchased
          const purchased = await db.select().from(purchases).where(and(eq(purchases.userId, userId), eq(purchases.itemId, noteId)));
          if (purchased.length > 0) hasAccess = true;
        }
    }

    if (!hasAccess) {
        throw new Error("Premium Note: Please purchase to unlock the download link.");
    }

    const url = await generateReadUrl(note.fileKey, note.fileName);
    return url;
  } catch (error) {
    console.error("Failed to generate R2 link:", error);
    throw new Error(error.message || "Could not get download link");
  }
}