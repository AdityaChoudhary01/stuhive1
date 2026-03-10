"use server";

import connectDB from "@/lib/db";
import Collection from "@/lib/models/Collection"; 
import Note from "@/lib/models/Note"; 
import User from "@/lib/models/User"; 
import { revalidatePath } from "next/cache";
import { awardHivePoints } from "@/actions/leaderboard.actions";
import { indexNewContent, removeContentFromIndex } from "@/lib/googleIndexing"; 
import { pingIndexNow } from "@/lib/indexnow";
import { getServerSession } from "next-auth"; // 🚀 Added for security
import { authOptions } from "@/lib/auth"; // 🚀 Added for session options

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

/**
 * 1. FETCH ALL USER COLLECTIONS (🚀 UPDATED FOR CHUNKING PAGINATION)
 */
export async function getUserCollections(userId, page = 1, limit = 120) {
  await connectDB();
  try {
    const skip = (page - 1) * limit;

    const collections = await Collection.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return collections.map(col => ({
      ...col,
      _id: col._id.toString(),
      user: col.user.toString(),
      notes: col.notes ? col.notes.map(id => id.toString()) : [],
      // 🚀 FIXED: Serialize the newly added purchasedBy array
      purchasedBy: col.purchasedBy ? col.purchasedBy.map(id => id.toString()) : [],
      createdAt: col.createdAt?.toISOString(),
      updatedAt: col.updatedAt?.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching collections:", error);
    return [];
  }
}

/**
 * 2. FETCH SINGLE COLLECTION WITH NOTES (BY ID)
 */
export async function getCollectionById(collectionId) {
  await connectDB();
  try {
    const collection = await Collection.findById(collectionId)
      .populate({
        path: 'notes',
        populate: { path: 'user', select: 'name avatar isVerifiedEducator' }
      })
      .lean();

    if (!collection) return null;
    return JSON.parse(JSON.stringify(collection));
  } catch (error) {
    console.error("Error fetching collection details:", error);
    return null;
  }
}

/**
 * 3. FETCH SINGLE COLLECTION BY SLUG (Includes Description for SEO)
 */
export async function getCollectionBySlug(slug) {
  await connectDB();
  try {
    const collection = await Collection.findOne({ slug, visibility: 'public' })
      .populate('user', 'name avatar role isVerifiedEducator')
      .populate({
        path: 'notes',
        populate: { path: 'user', select: 'name avatar isVerifiedEducator' }
      })
      .lean();

    if (!collection) return null;
    return JSON.parse(JSON.stringify(collection));
  } catch (error) {
    console.error("Error fetching collection by slug:", error);
    return null;
  }
}

/**
 * 4. FETCH PUBLIC COLLECTIONS (Optimized for Load More Pagination)
 */
export async function getPublicCollections({ page = 1, limit = 12 } = {}) {
  await connectDB();
  try {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const collections = await Collection.find({ visibility: 'public' })
      .populate('user', 'name avatar isVerifiedEducator')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Collection.countDocuments({ visibility: 'public' });

    const serializedCollections = collections.map(col => ({
        ...col,
        _id: col._id.toString(),
        user: col.user ? {
            ...col.user,
            _id: col.user._id.toString()
        } : null,
        notes: col.notes ? col.notes.map(n => n.toString()) : [],
        // 🚀 FIXED: Crucial fix to prevent [{buffer: ...}] error in Client Components
        purchasedBy: col.purchasedBy ? col.purchasedBy.map(p => p.toString()) : [],
        createdAt: col.createdAt?.toISOString(),
        updatedAt: col.updatedAt?.toISOString(),
    }));

    return {
      collections: serializedCollections,
      totalPages: Math.ceil(total / limitNum),
      totalCount: total
    };
  } catch (error) {
    console.error("Error fetching public collections:", error);
    return { collections: [], totalPages: 0, totalCount: 0 };
  }
}

/**
 * 5. CREATE COLLECTION (UPDATED FOR PREMIUM BUNDLES)
 */
export async function createCollection(data, userId) {
  await connectDB();
  try {
    // 🚀 VALIDATION: If Premium, price must be > 0
    if (data.isPremium && (!data.price || data.price <= 0)) {
        return { success: false, error: "Premium bundles must have a valid price." };
    }

    const newCollection = await Collection.create({
      name: data.name || data, // Supports older string-only calls
      user: userId,
      notes: [],
      // Premium bundles are usually public by default
      visibility: data.isPremium ? 'public' : (data.visibility || 'private'), 
      description: data.description || "",
      category: data.category || "University",
      university: data.university || "",
      
      // 🚀 PREMIUM FIELDS
      isPremium: data.isPremium || false,
      price: data.isPremium ? Number(data.price) : 0,
      purchasedBy: []
    });

    // 🏆 GAMIFICATION: Reward points
    await awardHivePoints(userId, 15);
    
    revalidatePath('/profile');
    return { 
      success: true, 
      collection: JSON.parse(JSON.stringify(newCollection)) 
    };
  } catch (error) {
    console.error("Create Collection Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 6. UPDATE COLLECTION (Handles Premium Upgrades/Downgrades & Protection)
 */
export async function updateCollection(collectionId, data, userId) {
  await connectDB();
  try {
    const collection = await Collection.findOne({ _id: collectionId, user: userId });
    if (!collection) return { success: false, error: "Not found or unauthorized" };

    // 🚀 FRAUD PROTECTION: Check if bundle has buyers
    const hasBuyers = collection.purchasedBy && collection.purchasedBy.length > 0;

    // Rule: If it has sales, it CANNOT be made private (must remain available for buyers)
    if (hasBuyers && data.visibility === 'private') {
      return { 
        success: false, 
        error: "This bundle has active buyers. You cannot make it private, but you can Archive it to hide it from new users." 
      };
    }

    // 🚀 STRICT PREMIUM VALIDATION FOR UPGRADES
    if (data.isPremium && !collection.isPremium) {
      if (collection.notes.length > 0) {
        const existingNotes = await Note.find({ _id: { $in: collection.notes } });
        
        for (const note of existingNotes) {
          // Rule 1: Note must be owned by the bundle creator
          if (note.user.toString() !== userId.toString()) {
            return { 
              success: false, 
              error: "Cannot upgrade. This bundle contains notes from other users." 
            };
          }
          // 🚀 Rule 2: Note must be a Premium note individually
          if (!note.isPaid || note.price <= 0) {
            return { 
              success: false, 
              error: "Cannot upgrade. All notes in a Premium Bundle must be individually priced Premium notes first." 
            };
          }
        }
      }
    }

    if (data.name !== undefined) collection.name = data.name;
    if (data.visibility !== undefined) collection.visibility = data.visibility;
    if (data.description !== undefined) collection.description = data.description;
    if (data.university !== undefined) collection.university = data.university;
    if (data.category !== undefined) collection.category = data.category;
    
    // 🚀 UPDATE PREMIUM STATUS
    if (data.isPremium !== undefined) collection.isPremium = data.isPremium;
    if (data.price !== undefined) collection.price = data.isPremium ? Number(data.price) : 0;

    await collection.save();

    // 🚀 SEO INDEXING LOGIC (GOOGLE + INDEXNOW)
    if (collection.slug) {
        const url = `${APP_URL}/shared-collections/${collection.slug}`;
        if (collection.visibility === 'public') {
            await indexNewContent(collection.slug, "collection");
            await pingIndexNow(url);
        } else if (collection.visibility === 'private' && data.visibility === 'private') {
            await removeContentFromIndex(collection.slug, "collection");
            await pingIndexNow(url); 
        }
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections'); 
    revalidatePath(`/collections/${collectionId}`);
    if (collection.slug) revalidatePath(`/shared-collections/${collection.slug}`);
    
    if (collection.university) {
      const uniSlug = collection.university.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      revalidatePath(`/univ/${uniSlug}`);
    }
    
    return { 
      success: true, 
      collection: JSON.parse(JSON.stringify(collection.toObject())) 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 7. RENAME COLLECTION (Legacy wrapper)
 */
export async function renameCollection(collectionId, newName, userId) {
  return await updateCollection(collectionId, { name: newName }, userId);
}

/**
 * 8. DELETE COLLECTION (With Buyer Protection)
 */
export async function deleteCollection(collectionId, userId) {
  await connectDB();
  try {
    const collection = await Collection.findOne({ _id: collectionId, user: userId });
    if (!collection) return { success: false, error: "Not found or unauthorized" };

    // 🚀 FRAUD PROTECTION: If the bundle has buyers, we ARCHIVE instead of deleting
    const hasBuyers = collection.purchasedBy && collection.purchasedBy.length > 0;

    if (hasBuyers) {
      collection.visibility = 'private'; // Hide from public browse
      collection.isArchived = true;      // Mark as archived for protection
      await collection.save();

      if (collection.slug) {
        await removeContentFromIndex(collection.slug, "collection");
        await pingIndexNow(`${APP_URL}/shared-collections/${collection.slug}`);
      }

      revalidatePath('/profile');
      revalidatePath('/shared-collections');
      return { success: true, message: "Bundle archived. Existing buyers still have access." };
    }

    // If zero sales, proceed with PERMANENT deletion
    await Collection.findByIdAndDelete(collectionId);

    if (collection.visibility === 'public' && collection.slug) {
        const url = `${APP_URL}/shared-collections/${collection.slug}`;
        await removeContentFromIndex(collection.slug, "collection");
        await pingIndexNow(url);
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections');
    
    if (collection.university) {
      const uniSlug = collection.university.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      revalidatePath(`/univ/${uniSlug}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 9. ADD NOTE TO COLLECTION (With Premium Ownership Check)
 */
export async function addNoteToCollection(collectionId, noteId, userId) {
  await connectDB();
  try {
    const collection = await Collection.findOne({ _id: collectionId, user: userId });
    if (!collection) return { success: false, error: "Collection not found." };

    // 🚀 STRICT PREMIUM VALIDATION FOR ADDING NOTES
    if (collection.isPremium) {
        const noteToAdd = await Note.findById(noteId);
        if (!noteToAdd) return { success: false, error: "Note not found." };
        
        // Rule 1: Note must be owned by bundle creator
        if (noteToAdd.user.toString() !== userId.toString()) {
            return { 
                success: false, 
                error: "Premium Bundles can only contain notes uploaded by you." 
            };
        }

        // 🚀 Rule 2: Note must be premium individually
        if (!noteToAdd.isPaid || noteToAdd.price <= 0) {
            return { 
                success: false, 
                error: "Premium Bundles act as discounted packages. You can only add notes that are already set as Premium (Paid) individually." 
            };
        }
    }

    collection.notes.addToSet(noteId);
    await collection.save();

    if (collection.visibility === 'public' && collection.slug) {
        const url = `${APP_URL}/shared-collections/${collection.slug}`;
        await indexNewContent(collection.slug, "collection");
        await pingIndexNow(url);
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections'); 
    revalidatePath(`/collections/${collectionId}`); 
    if (collection.slug) revalidatePath(`/shared-collections/${collection.slug}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 10. REMOVE NOTE FROM COLLECTION
 */
export async function removeNoteFromCollection(collectionId, noteId, userId) {
  await connectDB();
  try {
    const collection = await Collection.findOneAndUpdate(
      { _id: collectionId, user: userId },
      { $pull: { notes: noteId } },
      { new: true }
    );

    if (!collection) return { success: false, error: "Not found or unauthorized" };

    if (collection.visibility === 'public' && collection.slug) {
        const url = `${APP_URL}/shared-collections/${collection.slug}`;
        await indexNewContent(collection.slug, "collection");
        await pingIndexNow(url);
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections'); 
    revalidatePath(`/collections/${collectionId}`); 
    if (collection.slug) revalidatePath(`/shared-collections/${collection.slug}`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 FETCH PURCHASED BUNDLE SNAPSHOT (RESILIENT VERSION)
 * Loads the version of the bundle the user actually paid for.
 * Works even if the author permanently deleted the collection!
 */
export async function getPurchasedBundleSnapshot(bundleId) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // 1. Find the user to get their purchase history
    const user = await User.findById(session.user.id).lean();
    
    // 2. Find the specific purchase record for this bundle
    const purchaseRecord = user?.purchasedBundles?.find(
      pb => pb.bundle?.toString() === bundleId
    );

    if (!purchaseRecord) {
      console.error(`[Snapshot] No purchase record found for bundle ID: ${bundleId}`);
      return { success: false, error: "Purchase record not found" };
    }

    // 3. Fetch the current bundle metadata (Name, Description)
    let bundle = await Collection.findById(bundleId)
      .populate('user', 'name avatar isVerifiedEducator')
      .lean();

    // 🚀 GHOST BUNDLE FIX: If the bundle was permanently deleted by the author 
    // before we implemented the Archive protection, we generate a placeholder.
    if (!bundle) {
      bundle = {
        _id: bundleId,
        name: "Deleted Premium Bundle",
        description: "The author removed this collection from the store, but your purchased files are permanently protected here.",
        isArchived: true,
        user: null // Author data might be gone
      };
    }

    // 4. Fetch ONLY the notes that were part of the bundle when purchased
    const snapshotNotes = await Note.find({
      _id: { $in: purchaseRecord.notesSnapshot || [] }
    })
    .populate('user', 'name avatar isVerifiedEducator')
    .lean();

    return {
      success: true,
      bundle: JSON.parse(JSON.stringify(bundle)),
      notes: JSON.parse(JSON.stringify(snapshotNotes)),
      purchasedAt: purchaseRecord.purchasedAt
    };
  } catch (error) {
    console.error("Snapshot Fetch Error:", error);
    return { success: false, error: "Failed to load snapshot" };
  }
}

/**
 * 🚀 FETCH A USER'S PUBLIC COLLECTIONS ONLY (For Public Profile)
 */
export async function getPublicUserCollections(userId, limit = 12) {
  await connectDB();
  try {
    const collections = await Collection.find({ user: userId, visibility: 'public' })
      .populate('user', 'name avatar isVerifiedEducator')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return collections.map(col => ({
      ...col,
      _id: col._id.toString(),
      user: col.user ? { ...col.user, _id: col.user._id.toString() } : null,
      notes: col.notes ? col.notes.map(n => n.toString()) : [],
      purchasedBy: col.purchasedBy ? col.purchasedBy.map(p => p.toString()) : [],
      createdAt: col.createdAt?.toISOString(),
      updatedAt: col.updatedAt?.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching public user collections:", error);
    return [];
  }
}