'use server';

import { getDb } from "@/lib/db";
import { 
  users, 
  notes, 
  blogs, 
  userFollows, 
  userBookmarks, 
  purchases, 
  collections 
} from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth"; // 🚀 Auth.js v5
import { deleteFileFromR2 } from "@/lib/r2";
import { createNotification } from "@/actions/notification.actions";

/**
 * GET USER PROFILE
 */
export async function getUserProfile(userId) {
  try {
    const db = getDb();
    
    // 1. Get base user
    const dbUsers = await db.select().from(users).where(eq(users.id, userId));
    const user = dbUsers[0];
    if (!user) return null;

    // 2. Remove sensitive info manually (since we don't have .select('-password'))
    const { password, ...safeUser } = user;

    // 3. Get Followers
    const followers = await db.select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      isVerifiedEducator: users.isVerifiedEducator
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followerId, users.id))
    .where(eq(userFollows.followingId, userId));

    // 4. Get Following
    const following = await db.select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      isVerifiedEducator: users.isVerifiedEducator
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followingId, users.id))
    .where(eq(userFollows.followerId, userId));

    return { ...safeUser, followers, following };
  } catch (error) {
    console.error("getUserProfile Error:", error);
    return null;
  }
}

/**
 * GET USER NOTES (For Profile Page)
 */
export async function getUserNotes(userId, page = 1, limit = 10) {
  try {
    const db = getDb();
    const skip = (page - 1) * limit;

    const userNotes = await db.select({
      note: notes,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        isVerifiedEducator: users.isVerifiedEducator
      }
    })
    .from(notes)
    .innerJoin(users, eq(notes.userId, users.id))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt))
    .limit(limit)
    .offset(skip);

    // Get total count
    const allNotes = await db.select({ id: notes.id }).from(notes).where(eq(notes.userId, userId));
    const total = allNotes.length;

    // Flatten structure to match old Mongoose return type
    const safeNotes = userNotes.map(row => ({ ...row.note, user: row.user }));

    return { notes: safeNotes, total, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    console.error("Error in getUserNotes:", error);
    return { notes: [], total: 0, totalPages: 0 };
  }
}

/**
 * UPDATE USER AVATAR ONLY (With R2 Auto-Delete)
 */
export async function updateUserAvatar(userId, avatarUrl, avatarKey) {
  try {
    const session = await auth();
    if (!session || session.user.id !== userId) return { success: false, error: "Unauthorized" };

    const db = getDb();
    const currentUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    
    // ✅ R2 CLEANUP
    if (currentUser.avatarKey && currentUser.avatarKey !== avatarKey) {
        console.log(`Deleting old avatar from R2: ${currentUser.avatarKey}`);
        await deleteFileFromR2(currentUser.avatarKey);
    }

    await db.update(users).set({ avatar: avatarUrl, avatarKey: avatarKey }).where(eq(users.id, userId));
    
    revalidatePath('/profile');
    revalidatePath(`/profile/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Update Avatar Error:", error);
    return { success: false, error: "Failed to update avatar" };
  }
}

/**
 * UPDATE USER BIO ONLY
 */
export async function updateUserBio(userId, newBio) {
  try {
    const session = await auth();
    if (!session || session.user.id !== userId) return { success: false, error: "Unauthorized" };
    
    const db = getDb();
    const sanitizedBio = newBio ? newBio.trim().substring(0, 300) : "";

    await db.update(users).set({ bio: sanitizedBio }).where(eq(users.id, userId));

    revalidatePath('/profile');
    revalidatePath(`/profile/${userId}`);
    return { success: true, bio: sanitizedBio };
  } catch (error) {
    console.error("Failed to update bio:", error);
    return { success: false, error: "Failed to update bio" };
  }
}

/**
 * GET SAVED NOTES
 */
export async function getSavedNotes(userId, page = 1, limit = 10) {
  try {
    const db = getDb();
    const skip = (page - 1) * limit;

    const saved = await db.select({
      note: notes,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
        isVerifiedEducator: users.isVerifiedEducator
      }
    })
    .from(userBookmarks)
    .innerJoin(notes, eq(userBookmarks.noteId, notes.id))
    .innerJoin(users, eq(notes.userId, users.id))
    .where(eq(userBookmarks.userId, userId))
    .orderBy(desc(userBookmarks.createdAt))
    .limit(limit)
    .offset(skip);

    const totalRows = await db.select({ id: userBookmarks.noteId }).from(userBookmarks).where(eq(userBookmarks.userId, userId));
    const total = totalRows.length;

    const safeNotes = saved.map(row => ({ ...row.note, user: row.user }));

    return { notes: safeNotes, total, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    console.error("getSavedNotes error:", error);
    return { notes: [], total: 0, totalPages: 0 };
  }
}

/**
 * UPDATE PROFILE (With Admin Protection & R2 Auto-Delete)
 */
export async function updateProfile(userId, data) {
  try {
    const db = getDb();
    const targetUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    if (!targetUser) return { success: false, error: "User not found" };

    // 🚀 ADMIN IMPERSONATION PROTECTION
    if (data.name && data.name.toLowerCase().includes('admin')) {
      if (targetUser.email !== process.env.NEXT_PUBLIC_MAIN_ADMIN_EMAIL) {
        return { success: false, error: "The term 'Admin' is reserved." };
      }
    }

    // ✅ R2 CLEANUP
    if (data.avatarKey && targetUser.avatarKey && targetUser.avatarKey !== data.avatarKey) {
        await deleteFileFromR2(targetUser.avatarKey);
    }

    await db.update(users).set(data).where(eq(users.id, userId));
    const updatedUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    delete updatedUser.password;
    
    revalidatePath('/profile');
    revalidatePath(`/profile/${userId}`);
    
    return { success: true, user: updatedUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 GET FOLLOWING USERS
 */
export async function getFollowingUsers(userId) {
  try {
    const db = getDb();
    const following = await db.select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      bio: users.bio,
      isVerifiedEducator: users.isVerifiedEducator
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followingId, users.id))
    .where(eq(userFollows.followerId, userId));

    return following;
  } catch (error) {
    console.error("Error fetching following list:", error);
    return [];
  }
}

/**
 * TOGGLE FOLLOW
 */
export async function toggleFollow(currentUserId, targetUserId) {
  try {
    if (currentUserId === targetUserId) return { success: false, error: "Cannot follow yourself" };

    const db = getDb();
    const currentUser = (await db.select().from(users).where(eq(users.id, currentUserId)))[0];
    if (!currentUser) return { success: false, error: "User not found" };

    const existingFollow = await db.select()
      .from(userFollows)
      .where(and(eq(userFollows.followerId, currentUserId), eq(userFollows.followingId, targetUserId)));

    let isFollowing = false;

    if (existingFollow.length > 0) {
      // Unfollow
      await db.delete(userFollows).where(and(eq(userFollows.followerId, currentUserId), eq(userFollows.followingId, targetUserId)));
    } else {
      // Follow
      await db.insert(userFollows).values({ followerId: currentUserId, followingId: targetUserId });
      isFollowing = true;

      // Notify
      const followerName = currentUser.name || "A student";
      await createNotification({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: 'SYSTEM',
        message: `${followerName} started following you!`,
        link: `/profile/${currentUserId}`
      });
    }

    revalidatePath(`/profile/${targetUserId}`, 'page');
    revalidatePath('/feed', 'page');
    revalidatePath('/profile', 'page'); 
    
    return { success: true, isFollowing };
  } catch (error) {
    console.error("Toggle Follow Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * GET USER FEED
 */
export async function getUserFeed(userId) {
  try {
    const db = getDb();
    
    const followingIdsResult = await db.select({ followingId: userFollows.followingId })
                                       .from(userFollows)
                                       .where(eq(userFollows.followerId, userId));
    
    const followingIds = followingIdsResult.map(f => f.followingId);
    if (!followingIds.length) return [];

    const feedNotes = await db.select({ note: notes, user: users })
      .from(notes)
      .innerJoin(users, eq(notes.userId, users.id))
      .where(inArray(notes.userId, followingIds))
      .orderBy(desc(notes.createdAt))
      .limit(20);

    const feedBlogs = await db.select({ blog: blogs, user: users })
      .from(blogs)
      .innerJoin(users, eq(blogs.authorId, users.id))
      .where(inArray(blogs.authorId, followingIds))
      .orderBy(desc(blogs.createdAt))
      .limit(10);

    const feed = [
      ...feedNotes.map(n => ({ ...n.note, user: n.user, type: 'note', date: n.note.createdAt })),
      ...feedBlogs.map(b => ({ ...b.blog, user: b.user, type: 'blog', date: b.blog.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return feed;
  } catch (error) {
    console.error("Feed Error:", error);
    return [];
  }
}

/**
 * SAVE/UNSAVE NOTE
 */
export async function toggleSaveNote(userId, noteId) {
  try {
    if (!userId || !noteId) return { success: false, error: "Missing ID." };
    const db = getDb();

    const existing = await db.select()
      .from(userBookmarks)
      .where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.noteId, noteId)));

    let isSaved = false;
    if (existing.length > 0) {
      await db.delete(userBookmarks).where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.noteId, noteId)));
    } else {
      await db.insert(userBookmarks).values({ userId, noteId });
      isSaved = true;
    }

    revalidatePath("/profile");
    revalidatePath("/feed");
    revalidatePath(`/notes/${noteId}`); 
    return { success: true, isSaved };
  } catch (error) {
    console.error("Toggle Save Note Error:", error);
    return { success: false, error: "Failed to save note." };
  }
}

/**
 * UPDATE LAST SEEN
 */
export async function updateLastSeen(userId) {
  try {
    const db = getDb();
    await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error("Failed to update last seen:", error);
    return { success: false };
  } 
}

/**
 * 🚀 FETCH USER'S PURCHASED PREMIUM NOTES
 */
export async function getPurchasedNotes() {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized", notes: [] };

    const db = getDb();
    
    const boughtNotes = await db.select({
      note: notes,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        isVerifiedEducator: users.isVerifiedEducator
      }
    })
    .from(purchases)
    .innerJoin(notes, eq(purchases.itemId, notes.id))
    .innerJoin(users, eq(notes.userId, users.id))
    .where(and(eq(purchases.userId, session.user.id), eq(purchases.itemType, 'note')));

    const safeNotes = boughtNotes.map(row => ({
      ...row.note,
      user: row.user,
      id: row.note.id, 
      isArchived: row.note.isArchived || false,
      reviews: [] 
    }));

    return { success: true, notes: safeNotes };
  } catch (error) {
    console.error("Error fetching purchased notes:", error);
    return { success: false, error: error.message, notes: [] };
  }
}

/**
 * 🚀 FETCH USER'S PURCHASED ITEMS (WITH SNAPSHOT PROTECTION)
 */
export async function getPurchasedItems() {
  try {
    const session = await auth();
    if (!session) return { success: false, notes: [], bundles: [] };

    const db = getDb();
    
    // 1. Fetch individual notes
    const { notes: purchasedNotesList } = await getPurchasedNotes();

    // 2. Fetch purchased bundles
    const boughtBundles = await db.select({
      purchase: purchases,
      bundle: collections,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        isVerifiedEducator: users.isVerifiedEducator
      }
    })
    .from(purchases)
    .innerJoin(collections, eq(purchases.itemId, collections.id))
    .innerJoin(users, eq(collections.userId, users.id))
    .where(and(eq(purchases.userId, session.user.id), eq(purchases.itemType, 'collection')));

    // 3. Reconstruct snapshot
    const safeBundles = boughtBundles.map(row => {
      const notesSnapshot = row.purchase.notesSnapshot ? JSON.parse(row.purchase.notesSnapshot) : [];
      return {
        ...row.bundle,
        id: row.bundle.id,
        user: row.user,
        notes: notesSnapshot, // Use the snapshot version frozen at purchase time
        purchasedAt: row.purchase.purchasedAt,
      };
    });

    return { 
      success: true, 
      notes: purchasedNotesList, 
      bundles: safeBundles 
    };
  } catch (error) {
    console.error("Error fetching purchased items:", error);
    return { success: false, notes: [], bundles: [] };
  }
}