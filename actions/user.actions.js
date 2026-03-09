"use server";

import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Note from "@/lib/models/Note";
import Blog from "@/lib/models/Blog";
import Collection from "@/lib/models/Collection"; // 🚀 Added to fetch bundles
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteFileFromR2 } from "@/lib/r2";
import { createNotification } from "@/actions/notification.actions";

/**
 * GET USER PROFILE
 */
export async function getUserProfile(userId) {
  await connectDB();
  try {
    const user = await User.findById(userId)
      // 🚀 THE FIX: Added isVerifiedEducator to follower/following logic
      .populate('followers', 'name avatar isVerifiedEducator')
      .populate('following', 'name avatar isVerifiedEducator')
      .select('-password')
      .lean();

    if (!user) return null;

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    return null;
  }
}

/**
 * GET USER NOTES (For Profile Page)
 */
export async function getUserNotes(userId, page = 1, limit = 10) {
  await connectDB();
  try {
    const skip = (page - 1) * limit;

    const notes = await Note.find({ user: userId }) 
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      // 🚀 THE FIX: Added isVerifiedEducator
      .populate('user', 'name avatar isVerifiedEducator') 
      .lean();

    const total = await Note.countDocuments({ user: userId });

    const safeNotes = JSON.parse(JSON.stringify(notes));

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
 * UPDATE USER AVATAR ONLY (With R2 Auto-Delete)
 */
export async function updateUserAvatar(userId, avatarUrl, avatarKey) {
  await connectDB();
  const session = await getServerSession(authOptions);

  if (!session || session.user.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const currentUser = await User.findById(userId);
    
    // ✅ R2 CLEANUP: If the user already has an avatarKey, delete the old file from R2
    if (currentUser.avatarKey && currentUser.avatarKey !== avatarKey) {
        console.log(`Deleting old avatar from R2: ${currentUser.avatarKey}`);
        await deleteFileFromR2(currentUser.avatarKey);
    }

    // Save the new public URL and the secret R2 Key to the database
    await User.findByIdAndUpdate(userId, { 
        avatar: avatarUrl,
        avatarKey: avatarKey 
    });
    
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
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.id !== userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Sanitize and limit the bio length securely on the server
    const sanitizedBio = newBio ? newBio.trim().substring(0, 300) : "";

    await User.findByIdAndUpdate(userId, { bio: sanitizedBio });

    // Instantly clear cache for SEO indexing and UI updates
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
  await connectDB();
  try {
    const user = await User.findById(userId).populate({
      path: 'savedNotes',
      options: { sort: { uploadDate: -1 }, skip: (page - 1) * limit, limit: limit },
      // 🚀 THE FIX: Added isVerifiedEducator
      populate: { path: 'user', select: 'name avatar role isVerifiedEducator' }
    }).lean();

    if (!user || !user.savedNotes) return { notes: [], total: 0 };

    const userDoc = await User.findById(userId);
    const total = userDoc.savedNotes.length;

    const safeNotes = JSON.parse(JSON.stringify(user.savedNotes));

    return {
      notes: safeNotes,
      total,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error("getSavedNotes error:", error);
    return { notes: [], total: 0 };
  }
}

/**
 * UPDATE PROFILE (With Admin Protection & R2 Auto-Delete)
 */
export async function updateProfile(userId, data) {
  await connectDB();
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) return { success: false, error: "User not found" };

    // 🚀 ADMIN IMPERSONATION PROTECTION
    if (data.name && data.name.toLowerCase().includes('admin')) {
      // Only allow if their email exactly matches the Root Admin email
      if (targetUser.email !== process.env.NEXT_PUBLIC_MAIN_ADMIN_EMAIL) {
        return { 
          success: false, 
          error: "The term 'Admin' is reserved for system administrators and cannot be used in your name." 
        };
      }
    }

    // ✅ R2 CLEANUP: If profile update includes a new avatarKey, delete the old one
    if (data.avatarKey) {
        if (targetUser.avatarKey && targetUser.avatarKey !== data.avatarKey) {
            await deleteFileFromR2(targetUser.avatarKey);
        }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, data, { new: true }).select('-password').lean();
    
    revalidatePath('/profile');
    revalidatePath(`/profile/${userId}`);
    
    return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 GET FOLLOWING USERS
 * Returns the list of users the current user is following
 */
export async function getFollowingUsers(userId) {
  await connectDB();
  try {
    const user = await User.findById(userId)
      // 🚀 THE FIX: Added isVerifiedEducator
      .populate('following', 'name avatar role bio isVerifiedEducator') // Fetch details of followed users
      .select('following')
      .lean();

    if (!user || !user.following) return [];

    return JSON.parse(JSON.stringify(user.following));
  } catch (error) {
    console.error("Error fetching following list:", error);
    return [];
  }
}

/**
 * TOGGLE FOLLOW
 */
export async function toggleFollow(currentUserId, targetUserId) {
  await connectDB();
  try {
    if (currentUserId === targetUserId) return { success: false, error: "Cannot follow yourself" };

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) return { success: false, error: "User not found" };

    // 🚀 FIX: Convert both to strings explicitly to ensure bulletproof comparison
    const currentIdStr = currentUserId.toString();
    const targetIdStr = targetUserId.toString();

    const isFollowing = currentUser.following.some(id => id.toString() === targetIdStr);

    if (isFollowing) {
      // Unfollow logic
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetIdStr);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentIdStr);
    } else {
      // Follow logic
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    // ==========================================
    // 🚀 TRIGGER NOTIFICATION (ONLY ON FOLLOW)
    // ==========================================
    if (!isFollowing) {
      // Fetching currentUser.name ensures the recipient knows exactly who it is
      const followerName = currentUser.name || "A student";
      
      await createNotification({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: 'SYSTEM',
        message: `${followerName} started following you!`,
        link: `/profile/${currentUserId}` // Clicking the notification opens the new follower's profile
      });
    }

    // 🚀 FORCE CACHE BUSTING GLOBALLY FOR THESE PAGES
    revalidatePath(`/profile/${targetUserId}`, 'page');
    revalidatePath('/feed', 'page');
    revalidatePath('/profile', 'page'); 
    
    return { success: true, isFollowing: !isFollowing };

  } catch (error) {
    console.error("Toggle Follow Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * GET USER FEED
 */
export async function getUserFeed(userId) {
  await connectDB();
  try {
    const user = await User.findById(userId);
    if (!user || !user.following.length) return [];

    const notes = await Note.find({ user: { $in: user.following } })
      .sort({ uploadDate: -1 })
      .limit(20)
      // 🚀 THE FIX: Added isVerifiedEducator
      .populate('user', 'name avatar role isVerifiedEducator')
      .lean();

    const blogs = await Blog.find({ author: { $in: user.following } })
      .sort({ createdAt: -1 })
      .limit(10)
      // 🚀 THE FIX: Added isVerifiedEducator
      .populate('author', 'name avatar role isVerifiedEducator')
      .lean();

    const feed = [
      ...notes.map(n => ({ ...n, type: 'note', date: n.uploadDate })),
      ...blogs.map(b => ({ ...b, type: 'blog', date: b.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return JSON.parse(JSON.stringify(feed));

  } catch (error) {
    console.error("Feed Error:", error);
    return [];
  }
}

/**
 * SAVE/UNSAVE NOTE
 */
export async function toggleSaveNote(userId, noteId) {
  await connectDB();
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, error: "User not found" };

    const index = user.savedNotes.indexOf(noteId);
    let isSaved = false;

    if (index === -1) {
      user.savedNotes.push(noteId);
      isSaved = true;
    } else {
      user.savedNotes.splice(index, 1);
      isSaved = false;
    }

    await user.save();
    
    revalidatePath('/profile');
    revalidatePath('/search');
    
    return { success: true, isSaved };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * UPDATE LAST SEEN
 */
export async function updateLastSeen(userId) {
  try {
    await connectDB();
    await User.findByIdAndUpdate(userId, { 
      lastSeen: new Date() 
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update last seen:", error);
    return { success: false };
  } 
}

/**
 * 🚀 FETCH USER'S PURCHASED PREMIUM NOTES
 * Includes 'isArchived' to ensure permanent access even after author deletion.
 */
export async function getPurchasedNotes() {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized", notes: [] };

  try {
    // Find the user and populate the 'purchasedNotes' array with full Note data
    const user = await User.findById(session.user.id)
      .populate({
        path: 'purchasedNotes',
        populate: { 
            path: 'user', 
            select: 'name avatar isVerifiedEducator' 
        }
      })
      .lean();

    if (!user || !user.purchasedNotes) {
        return { success: true, notes: [] };
    }

    // Serialize data and ensure 'isArchived' is passed to the UI
    const safeNotes = user.purchasedNotes.map(n => ({
      ...n,
      _id: n._id.toString(),
      user: n.user ? { ...n.user, _id: n.user._id.toString() } : null,
      isArchived: n.isArchived || false, // 🛡️ CRITICAL: Allow UI to show "Archived" badge
      uploadDate: n.uploadDate ? new Date(n.uploadDate).toISOString() : new Date().toISOString(),
      createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : new Date().toISOString(),
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
 * Reads from the immutable Bundle Snapshots so buyers never lose files.
 */
export async function getPurchasedItems() {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, notes: [], bundles: [] };

  try {
    // 1. Fetch user and populate BOTH notes and the bundle objects inside the array
    const user = await User.findById(session.user.id)
      .populate({
        path: 'purchasedNotes',
        populate: { path: 'user', select: 'name avatar isVerifiedEducator' }
      })
      .populate({
        // 🚀 CRITICAL FIX: The path must point to the 'bundle' field inside the 'purchasedBundles' array objects
        path: 'purchasedBundles.bundle',
        populate: { path: 'user', select: 'name avatar isVerifiedEducator' }
      })
      .lean();

    if (!user) return { success: false, notes: [], bundles: [] };

    // 2. Serialize purchased individual notes
    const safeNotes = JSON.parse(JSON.stringify(user.purchasedNotes || []));

    // 3. 🚀 BUNDLE SNAPSHOT RECONSTRUCTION
    // We map through purchasedBundles and manually inject the snapshot version
    const safeBundles = (user.purchasedBundles || []).map(pb => {
      // If for some reason the bundle document was deleted from DB, skip it
      if (!pb.bundle) return null;

      const bundleDoc = pb.bundle;
      
      return {
        ...bundleDoc,
        _id: bundleDoc._id.toString(),
        user: bundleDoc.user ? {
          ...bundleDoc.user,
          _id: bundleDoc.user._id.toString()
        } : null,
        
        // 🚀 THIS FIXES THE "0 BUNDLES" / "0 NOTES" ISSUE:
        // We overwrite the bundle's 'notes' array with the 'notesSnapshot' 
        // that was saved in the User document at the time of purchase.
        notes: pb.notesSnapshot && pb.notesSnapshot.length > 0 
          ? pb.notesSnapshot.map(id => id.toString()) 
          : (bundleDoc.notes ? bundleDoc.notes.map(n => n.toString()) : []),
          
        purchasedAt: pb.purchasedAt ? new Date(pb.purchasedAt).toISOString() : null,
        isArchived: bundleDoc.isArchived || false
      };
    }).filter(Boolean); // Remove nulls (deleted bundles)

    return { 
      success: true, 
      notes: safeNotes, 
      bundles: JSON.parse(JSON.stringify(safeBundles)) 
    };
  } catch (error) {
    console.error("Error fetching purchased items:", error);
    return { success: false, notes: [], bundles: [] };
  }
}