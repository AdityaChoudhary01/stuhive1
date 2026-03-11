"use server";

import { getDb } from "@/lib/db";
import { 
  users, 
  notes, 
  blogs, 
  collections, 
  siteAnalytics, 
  opportunities, 
  universities, 
  reports,
  userBookmarks,
  userFollows,
  collectionNotes
} from "@/db/schema";
import { eq, desc, sql, or, gt, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { deleteFileFromR2 } from "@/lib/r2"; 
import { createNotification } from "@/actions/notification.actions";

// 🛠️ HELPER: Validate UUID
const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Helper to check admin status
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

/**
 * 🚀 FETCH MACRO DASHBOARD ANALYTICS
 */
export async function getAdminDashboardData() {
  // 🛡️ Security Check
  if (!(await isAdmin())) {
    throw new Error("Unauthorized Access");
  }

  try {
    const db = getDb();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const dateLimit = pastDate.toISOString().split('T')[0];

    // 🚀 BLAZING FAST PARALLEL SQL QUERIES
    const [
      noteStats,
      blogStats,
      topViewedNotes,
      topDownloadedNotes,
      topBlogs,
      pageViewsOverTime,
      topPages
    ] = await Promise.all([
      // 1. Global Note Stats
      db.select({ 
        totalViews: sql`sum(${notes.viewCount})`, 
        totalDownloads: sql`sum(${notes.downloadCount})` 
      }).from(notes),
      
      // 2. Global Blog Stats
      db.select({ totalViews: sql`sum(${blogs.viewCount})` }).from(blogs),

      // 3. Top Growing Notes (Views)
      db.select({ note: notes, user: users })
        .from(notes).leftJoin(users, eq(notes.userId, users.id))
        .orderBy(desc(notes.viewCount)).limit(5),

      // 4. Top Downloaded Notes
      db.select({ note: notes, user: users })
        .from(notes).leftJoin(users, eq(notes.userId, users.id))
        .orderBy(desc(notes.downloadCount)).limit(5),

      // 5. Top Growing Blogs
      db.select({ blog: blogs, author: users })
        .from(blogs).leftJoin(users, eq(blogs.authorId, users.id))
        .orderBy(desc(blogs.viewCount)).limit(5),

      // 6. Site Traffic Over Last 30 Days
      db.select({ date: siteAnalytics.date, views: sql`sum(${siteAnalytics.views})` })
        .from(siteAnalytics).where(gte(siteAnalytics.date, dateLimit))
        .groupBy(siteAnalytics.date).orderBy(siteAnalytics.date),

      // 7. Most Visited Pages
      db.select({ path: siteAnalytics.path, totalViews: sql`sum(${siteAnalytics.views})` })
        .from(siteAnalytics)
        .groupBy(siteAnalytics.path).orderBy(desc(sql`totalViews`)).limit(10)
    ]);

    return {
      totals: {
        noteViews: Number(noteStats[0]?.totalViews || 0),
        noteDownloads: Number(noteStats[0]?.totalDownloads || 0),
        blogViews: Number(blogStats[0]?.totalViews || 0),
        totalSiteVisits: pageViewsOverTime.reduce((acc, curr) => acc + Number(curr.views), 0)
      },
      topViewedNotes: topViewedNotes.map(n => ({ ...n.note, user: n.user })),
      topDownloadedNotes: topDownloadedNotes.map(n => ({ ...n.note, user: n.user })),
      topBlogs: topBlogs.map(b => ({ ...b.blog, author: b.author })),
      pageViewsOverTime: pageViewsOverTime.map(item => ({ date: item.date, views: Number(item.views) })),
      topPages: topPages.map(item => ({ path: item.path, views: Number(item.totalViews) }))
    };

  } catch (error) {
    console.error("Admin Dashboard Fetch Error:", error);
    return null;
  }
}

/**
 * FETCH SYSTEM STATS
 */
export async function getAdminStats() {
  try {
    const db = getDb();
    const [uCount, nCount, bCount] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(users),
      db.select({ count: sql`count(*)` }).from(notes),
      db.select({ count: sql`count(*)` }).from(blogs),
    ]);
    return { 
      userCount: Number(uCount[0].count), 
      noteCount: Number(nCount[0].count), 
      blogCount: Number(bCount[0].count) 
    };
  } catch (error) {
    return { userCount: 0, noteCount: 0, blogCount: 0 };
  }
}

/**
 * 🚀 GET ALL USERS WITH PAGINATION
 */
export async function getAllUsers(page = 1, limit = 20) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const skip = (page - 1) * limit;
  const db = getDb();

  // Drizzle leftJoin + count mapping to replace Mongoose Aggregation
  const usersList = await db.select({
      user: users,
      exactNoteCount: sql`count(distinct ${notes.id})`,
      exactBlogCount: sql`count(distinct ${blogs.id})`
    })
    .from(users)
    .leftJoin(notes, eq(users.id, notes.userId))
    .leftJoin(blogs, eq(users.id, blogs.authorId))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(skip);

  const uCount = await db.select({ count: sql`count(*)` }).from(users);
  const total = Number(uCount[0].count);

  const safeUsers = usersList.map(row => {
    const { password, ...safeUser } = row.user;
    return {
      ...safeUser,
      _id: safeUser.id,
      exactNoteCount: Number(row.exactNoteCount),
      exactBlogCount: Number(row.exactBlogCount)
    };
  });

  return {
    users: safeUsers,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * 🚀 TOGGLE USER ROLE
 */
export async function toggleUserRole(userId) {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  try {
    const db = getDb();
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) return { success: false, error: "User not found" };
    const targetUser = userRows[0];

    if (targetUser.email === process.env.NEXT_PUBLIC_MAIN_ADMIN_EMAIL) {
      return { success: false, error: "Action Denied: You cannot demote the Main Admin." };
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
    
    revalidatePath("/admin");
    return { success: true, newRole };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * DELETE USER (Secured + R2 Cleanup)
 */
export async function deleteUser(userId) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  
  try {
    const db = getDb();
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) return { success: false, error: "User not found" };
    const targetUser = userRows[0];

    if (targetUser.email === process.env.NEXT_PUBLIC_MAIN_ADMIN_EMAIL) {
      return { success: false, error: "Action Denied: You cannot delete the Main Admin." };
    }

    const userNotes = await db.select().from(notes).where(eq(notes.userId, userId));
    const userBlogs = await db.select().from(blogs).where(eq(blogs.authorId, userId));

    const r2DeletionPromises = [];

    if (targetUser.avatarKey) r2DeletionPromises.push(deleteFileFromR2(targetUser.avatarKey));

    userNotes.forEach(note => {
        if (note.fileKey) r2DeletionPromises.push(deleteFileFromR2(note.fileKey));
        if (note.thumbnailKey) r2DeletionPromises.push(deleteFileFromR2(note.thumbnailKey));
        if (note.previewKey) r2DeletionPromises.push(deleteFileFromR2(note.previewKey));
    });

    userBlogs.forEach(blog => {
        if (blog.coverImageKey) r2DeletionPromises.push(deleteFileFromR2(blog.coverImageKey));
    });

    await Promise.all(r2DeletionPromises);

    // SQL Deletions
    await Promise.all([
      db.delete(notes).where(eq(notes.userId, userId)),
      db.delete(blogs).where(eq(blogs.authorId, userId)),
      db.delete(collections).where(eq(collections.userId, userId)),
      db.delete(userBookmarks).where(eq(userBookmarks.userId, userId)),
      db.delete(userFollows).where(or(eq(userFollows.followerId, userId), eq(userFollows.followingId, userId))),
      db.delete(users).where(eq(users.id, userId))
    ]);
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * CONTENT MODERATION - NOTES
 */
export async function getAllNotes(page = 1, limit = 20) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const skip = (page - 1) * limit;
  const db = getDb();

  const fetchedNotes = await db.select({ note: notes, user: users })
    .from(notes).leftJoin(users, eq(notes.userId, users.id))
    .orderBy(desc(notes.createdAt)).limit(limit).offset(skip);
  
  const nCount = await db.select({ count: sql`count(*)` }).from(notes);
  const total = Number(nCount[0].count);
  
  const safeNotes = fetchedNotes.map(row => ({
    ...row.note,
    _id: row.note.id,
    user: row.user ? { ...row.user, _id: row.user.id } : null,
    reviews: [] 
  }));

  return { notes: safeNotes, total, totalPages: Math.ceil(total / limit) };
}

export async function toggleNoteFeatured(noteId, currentState) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  
  const newState = !currentState;
  await db.update(notes).set({ isFeatured: newState }).where(eq(notes.id, noteId));
  const updatedNote = (await db.select().from(notes).where(eq(notes.id, noteId)))[0];

  if (newState && updatedNote?.userId) {
    await createNotification({
      recipientId: updatedNote.userId,
      type: 'FEATURED',
      message: `Congratulations! Your note "${updatedNote.title}" was featured by an Admin.`,
      link: `/notes/${updatedNote.slug}` // Use slug for frontend links
    });
  }

  revalidatePath("/admin");
  revalidatePath("/"); 
  return { success: true };
}

export async function adminUpdateNote(noteId, updateData) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  try {
    await db.update(notes).set(updateData).where(eq(notes.id, noteId));
    const updatedNote = (await db.select().from(notes).where(eq(notes.id, noteId)))[0];
    
    revalidatePath("/admin");
    revalidatePath(`/notes/${updatedNote.slug}`);
    revalidatePath("/search");
    
    return { success: true, note: updatedNote };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function adminDeleteNote(noteId) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  
  try {
    const noteRows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (noteRows.length === 0) return { success: false, error: "Note not found" };
    const note = noteRows[0];
    
    if (note.fileKey) await deleteFileFromR2(note.fileKey);
    if (note.thumbnailKey) await deleteFileFromR2(note.thumbnailKey);
    if (note.previewKey) await deleteFileFromR2(note.previewKey);

    await Promise.all([
      db.delete(userBookmarks).where(eq(userBookmarks.noteId, noteId)),
      db.delete(collectionNotes).where(eq(collectionNotes.noteId, noteId)),
      db.update(users).set({ noteCount: sql`${users.noteCount} - 1` }).where(eq(users.id, note.userId)),
      db.delete(notes).where(eq(notes.id, noteId))
    ]);
    
    revalidatePath("/admin");
    revalidatePath("/search");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * CONTENT MODERATION - BLOGS
 */
export async function getAllBlogs(page = 1, limit = 20) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const skip = (page - 1) * limit;
  const db = getDb();

  const fetchedBlogs = await db.select({ blog: blogs, author: users })
    .from(blogs).leftJoin(users, eq(blogs.authorId, users.id))
    .orderBy(desc(blogs.createdAt)).limit(limit).offset(skip);
  
  const bCount = await db.select({ count: sql`count(*)` }).from(blogs);
  const total = Number(bCount[0].count);
  
  const safeBlogs = fetchedBlogs.map(row => ({
    ...row.blog,
    _id: row.blog.id,
    author: row.author ? { ...row.author, _id: row.author.id } : null,
    content: "", 
    reviews: []
  }));

  return { blogs: safeBlogs, total, totalPages: Math.ceil(total / limit) };
}

export async function toggleBlogFeatured(blogId, currentState) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  
  const newState = !currentState;
  await db.update(blogs).set({ isFeatured: newState }).where(eq(blogs.id, blogId));
  const updatedBlog = (await db.select().from(blogs).where(eq(blogs.id, blogId)))[0];

  if (newState && updatedBlog?.authorId) {
    await createNotification({
      recipientId: updatedBlog.authorId,
      type: 'FEATURED',
      message: `Congratulations! Your article "${updatedBlog.title}" was featured by an Admin.`,
      link: `/blogs/${updatedBlog.slug}`
    });
  }

  revalidatePath("/admin");
  revalidatePath("/blogs");
  return { success: true };
}

export async function adminUpdateBlog(blogId, updateData) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  
  try {
    await db.update(blogs).set(updateData).where(eq(blogs.id, blogId));
    const updatedBlog = (await db.select().from(blogs).where(eq(blogs.id, blogId)))[0];
    
    revalidatePath("/admin");
    revalidatePath(`/blogs/${updatedBlog.slug}`);
    revalidatePath("/blogs");
    
    return { success: true, blog: updatedBlog };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function adminDeleteBlog(blogId) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  
  try {
    const blogRows = await db.select().from(blogs).where(eq(blogs.id, blogId)).limit(1);
    if (blogRows.length === 0) return { success: false, error: "Blog not found" };
    const blog = blogRows[0];
    
    if (blog.coverImageKey) await deleteFileFromR2(blog.coverImageKey);

    await Promise.all([
      db.update(users).set({ blogCount: sql`${users.blogCount} - 1` }).where(eq(users.id, blog.authorId)),
      db.delete(blogs).where(eq(blogs.id, blogId))
    ]);
    
    revalidatePath("/admin");
    revalidatePath("/blogs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// --- OPPORTUNITY (SARKARI) MODERATION ---

export async function getAllOpportunities(page = 1, limit = 50) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  const skip = (page - 1) * limit;

  const opps = await db.select().from(opportunities).orderBy(desc(opportunities.createdAt)).limit(limit).offset(skip);
  const oCount = await db.select({ count: sql`count(*)` }).from(opportunities);
  const total = Number(oCount[0].count);

  const safeOpps = opps.map(o => ({ ...o, _id: o.id }));

  return { opportunities: safeOpps, total, totalPages: Math.ceil(total / limit) };
}

export async function createOpportunity(data) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  
  try {
    const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomString = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${randomString}`;
    const newId = crypto.randomUUID();

    // Serialize JSON fields
    const newOppData = {
        ...data,
        id: newId,
        slug,
        importantDates: JSON.stringify(data.importantDates || []),
        applicationFee: JSON.stringify(data.applicationFee || []),
        ageLimit: JSON.stringify(data.ageLimit || {}),
        vacancyDetails: JSON.stringify(data.vacancyDetails || []),
        howToApply: JSON.stringify(data.howToApply || []),
        selectionProcess: JSON.stringify(data.selectionProcess || []),
        importantLinks: JSON.stringify(data.importantLinks || []),
        faqs: JSON.stringify(data.faqs || [])
    };

    await db.insert(opportunities).values(newOppData);
    
    revalidatePath("/admin");
    revalidatePath("/updates");
    return { success: true, opportunity: { ...newOppData, _id: newId } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateOpportunity(id, data) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  
  try {
    const updatePayload = { ...data };
    // Serialize JSON fields before update
    ['importantDates', 'applicationFee', 'ageLimit', 'vacancyDetails', 'howToApply', 'selectionProcess', 'importantLinks', 'faqs'].forEach(field => {
      if (updatePayload[field] !== undefined) {
        updatePayload[field] = JSON.stringify(updatePayload[field]);
      }
    });

    await db.update(opportunities).set(updatePayload).where(eq(opportunities.id, id));
    const updated = (await db.select().from(opportunities).where(eq(opportunities.id, id)))[0];

    revalidatePath("/admin");
    revalidatePath("/updates");
    revalidatePath(`/updates/${updated.slug}`);
    return { success: true, opportunity: { ...updated, _id: updated.id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteOpportunity(id) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  try {
    await db.delete(opportunities).where(eq(opportunities.id, id));
    revalidatePath("/admin");
    revalidatePath("/updates");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function toggleOpportunityPublish(id, currentState) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  try {
    await db.update(opportunities).set({ isPublished: !currentState }).where(eq(opportunities.id, id));
    revalidatePath("/admin");
    revalidatePath("/updates");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 MARKETPLACE PAYOUTS: GET PENDING PAYOUTS
 */
export async function getPendingPayouts(page = 1, limit = 50) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const db = getDb();
  const skip = (page - 1) * limit;

  try {
    const usersList = await db.select({
        id: users.id, name: users.name, email: users.email, avatar: users.avatar,
        walletBalance: users.walletBalance, pendingBalance: users.pendingBalance, payoutDetails: users.payoutDetails
      })
      .from(users)
      .where(or(gt(users.walletBalance, 0), gt(users.pendingBalance, 0)))
      .orderBy(desc(users.walletBalance), desc(users.pendingBalance))
      .limit(limit)
      .offset(skip);
      
    return usersList.map(u => ({
        ...u, 
        _id: u.id, 
        payoutDetails: u.payoutDetails ? JSON.parse(u.payoutDetails) : null 
    }));
  } catch (error) {
    console.error("Fetch Payouts Error:", error);
    return [];
  }
}

/**
 * 🚀 ADMIN ACTION: FORCE CLEAR ESCROW (Manual Override)
 */
export async function forceClearEscrow(userId) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  const db = getDb();

  try {
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) return { success: false, error: "User not found" };
    const user = userRows[0];

    let amountToClear = 0;
    let hasChanges = false;
    let schedule = user.payoutSchedule ? JSON.parse(user.payoutSchedule) : [];

    schedule.forEach(item => {
      if (item.status === 'pending') {
        amountToClear += item.amount;
        item.status = 'cleared';
        hasChanges = true;
      }
    });

    if (hasChanges) {
      let newPending = (user.pendingBalance || 0) - amountToClear;
      if (newPending < 0) newPending = 0; // Safety net
      let newWallet = (user.walletBalance || 0) + amountToClear;

      await db.update(users).set({
        walletBalance: newWallet,
        pendingBalance: newPending,
        payoutSchedule: JSON.stringify(schedule)
      }).where(eq(users.id, userId));
      
      await createNotification({
        recipientId: userId,
        type: 'SYSTEM',
        message: `Admin has manually cleared ₹${amountToClear.toFixed(2)} from your escrow. It is now available for withdrawal.`,
        link: `/wallet`
      });

      revalidatePath("/admin");
      return { success: true, message: `Moved ₹${amountToClear.toFixed(2)} to Available Balance.` };
    } else {
      return { success: false, error: "No pending funds to clear." };
    }
  } catch (error) {
    console.error("Force Clear Escrow Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 MARKETPLACE PAYOUTS: MARK AS PAID
 */
export async function processPayout(userId) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  const db = getDb();

  if (!isValidUUID(userId)) return { success: false, error: "Invalid User ID format." };

  try {
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) return { success: false, error: "User not found" };
    const targetUser = userRows[0];

    if ((targetUser.walletBalance || 0) <= 0) {
      return { success: false, error: "No available balance to pay. Clear escrow first." };
    }

    const payoutAmount = targetUser.walletBalance.toFixed(2);

    await db.update(users).set({ walletBalance: 0 }).where(eq(users.id, userId));
    
    await createNotification({
      recipientId: userId,
      type: 'SYSTEM',
      message: `Your payout of ₹${payoutAmount} has been processed! The funds should reflect in your account shortly.`,
      link: `/profile`
    });

    revalidatePath("/admin");
    revalidatePath("/wallet");
    return { success: true };
  } catch (error) {
    console.error("Payout Processing Error:", error);
    return { success: false, error: error.message || "Internal Server Error" };
  }
}

/**
 * 🚀 TOGGLE VERIFIED EDUCATOR STATUS
 */
export async function toggleVerifiedEducator(userId) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  const db = getDb();

  try {
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) return { success: false, error: "User not found" };
    const user = userRows[0];

    const newVerificationStatus = !user.isVerifiedEducator;
    await db.update(users).set({ isVerifiedEducator: newVerificationStatus }).where(eq(users.id, userId));

    if (newVerificationStatus) {
      await createNotification({
        recipientId: userId,
        type: 'SYSTEM',
        message: `Congratulations! You have been verified as an Expert Educator. Your notes now carry a premium trust badge.`,
        link: `/profile`
      });
    }

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/search"); 
    
    return { success: true, isVerified: newVerificationStatus };
  } catch (error) {
    console.error("Verification Error:", error);
    return { success: false, error: "Database Sync Error: Please try again." };
  }
}

const getR2KeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
  } catch (e) {
    return null;
  }
};

/**
 * 🚀 FETCH ALL UNIVERSITIES WITH PAGINATION
 */
export async function getAllUniversities(page = 1, limit = 50) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const db = getDb();

  try {
    // Distinct universities from notes table
    const notesUniversitiesRaw = await db.select({ university: notes.university }).from(notes).groupBy(notes.university);
    const notesUniversities = notesUniversitiesRaw.map(r => r.university);
    
    const professionalConfigs = await db.select().from(universities);

    const combined = notesUniversities
      .filter(name => name && name.trim() !== "")
      .map(name => {
        const config = professionalConfigs.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (config) return { ...config, _id: config.id };
        return {
          name: name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          isVirtual: true,
          location: "",
          logo: "",
        };
      });

    const sorted = combined.sort((a, b) => a.name.localeCompare(b.name));
    const skip = (page - 1) * limit;
    return sorted.slice(skip, skip + limit);
  } catch (error) {
    return [];
  }
}

export async function upsertUniversity(data) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  const db = getDb();

  try {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existingUniRows = await db.select().from(universities).where(eq(universities.slug, slug)).limit(1);
    
    if (existingUniRows.length > 0) {
      const existingUni = existingUniRows[0];
      if (existingUni.logo && existingUni.logo !== data.logo) {
        const oldLogoKey = getR2KeyFromUrl(existingUni.logo);
        if (oldLogoKey) await deleteFileFromR2(oldLogoKey);
      }
      if (existingUni.coverImage && existingUni.coverImage !== data.coverImage) {
        const oldCoverKey = getR2KeyFromUrl(existingUni.coverImage);
        if (oldCoverKey) await deleteFileFromR2(oldCoverKey);
      }

      await db.update(universities).set({ ...data, slug }).where(eq(universities.slug, slug));
    } else {
      await db.insert(universities).values({ ...data, slug, id: crypto.randomUUID() });
    }

    revalidatePath(`/univ/${slug}`);
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniversityEntry(id) {
  if (!(await isAdmin())) return { success: false };
  const db = getDb();

  try {
    const univRows = await db.select().from(universities).where(eq(universities.id, id)).limit(1);
    if (univRows.length > 0) {
      const univ = univRows[0];
      const logoKey = getR2KeyFromUrl(univ.logo);
      const coverKey = getR2KeyFromUrl(univ.coverImage);
      if (logoKey) await deleteFileFromR2(logoKey);
      if (coverKey) await deleteFileFromR2(coverKey);

      await db.delete(universities).where(eq(universities.id, id));
      revalidatePath(`/univ/${univ.slug}`);
    }
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

/**
 * 🚀 FETCH ALL REPORTS WITH PAGINATION
 */
export async function getAllReports(page = 1, limit = 50) {
  if (!(await isAdmin())) throw new Error("Unauthorized Access");
  const db = getDb();
  const skip = (page - 1) * limit;

  try {
    const fetchedReports = await db.select({
        report: reports,
        reporter: { id: users.id, name: users.name, email: users.email, avatar: users.avatar },
        targetNote: { id: notes.id, title: notes.title, slug: notes.slug, salesCount: notes.salesCount },
        targetBundle: { id: collections.id, name: collections.name, slug: collections.slug }
      })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .leftJoin(notes, eq(reports.targetNoteId, notes.id))
      .leftJoin(collections, eq(reports.targetBundleId, collections.id))
      .orderBy(desc(reports.createdAt))
      .limit(limit).offset(skip);

    return fetchedReports.map(r => ({
      ...r.report,
      _id: r.report.id,
      reporter: r.reporter ? { ...r.reporter, _id: r.reporter.id } : null,
      targetNote: r.targetNote ? { ...r.targetNote, _id: r.targetNote.id } : null,
      targetBundle: r.targetBundle ? { ...r.targetBundle, _id: r.targetBundle.id } : null
    }));
  } catch (error) {
    console.error("Fetch Reports Error:", error);
    return [];
  }
}

/**
 * 🚀 UPDATE REPORT STATUS
 */
export async function updateReportStatus(reportId, status) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  const db = getDb();

  try {
    await db.update(reports).set({ status }).where(eq(reports.id, reportId));
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}