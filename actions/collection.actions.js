'use server';

import { getDb } from "@/lib/db";
import { collections, notes, users, collectionNotes, purchases } from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { awardHivePoints } from "@/actions/leaderboard.actions";
import { indexNewContent, removeContentFromIndex } from "@/lib/googleIndexing"; 
import { pingIndexNow } from "@/lib/indexnow";
import { auth } from "@/lib/auth"; // 🚀 Auth.js v5

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

/**
 * 🛠️ HELPER: Attach relational arrays (notes, purchasedBy) to Collections efficiently
 */
async function attachRelationsToCollections(db, collectionsList) {
  if (collectionsList.length === 0) return [];
  const collectionIds = collectionsList.map(c => c.id);

  // Fetch all notes for these collections
  const allNotes = await db.select({ collectionId: collectionNotes.collectionId, noteId: collectionNotes.noteId })
    .from(collectionNotes)
    .where(inArray(collectionNotes.collectionId, collectionIds));

  // Fetch all buyers for these collections
  const allBuyers = await db.select({ collectionId: purchases.itemId, userId: purchases.userId })
    .from(purchases)
    .where(and(eq(purchases.itemType, 'collection'), inArray(purchases.itemId, collectionIds)));

  return collectionsList.map(col => {
    const colNotes = allNotes.filter(n => n.collectionId === col.id).map(n => n.noteId);
    const colBuyers = allBuyers.filter(b => b.collectionId === col.id).map(b => b.userId);
    return {
      ...col,
      _id: col.id,
      notes: colNotes,
      purchasedBy: colBuyers,
      user: typeof col.userId === 'string' ? col.userId : (col.user ? { ...col.user, _id: col.user.id } : null)
    };
  });
}

/**
 * 1. FETCH ALL USER COLLECTIONS
 */
export async function getUserCollections(userId, page = 1, limit = 120) {
  try {
    const db = getDb();
    const skip = (page - 1) * limit;

    const fetchedCollections = await db.select()
      .from(collections)
      .where(eq(collections.userId, userId))
      .orderBy(desc(collections.createdAt))
      .limit(limit)
      .offset(skip);

    return await attachRelationsToCollections(db, fetchedCollections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return [];
  }
}

/**
 * 2. FETCH SINGLE COLLECTION WITH NOTES (BY ID)
 */
export async function getCollectionById(collectionId) {
  try {
    const db = getDb();
    const colRows = await db.select({ collection: collections, user: users })
      .from(collections)
      .leftJoin(users, eq(collections.userId, users.id))
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (colRows.length === 0) return null;
    const { collection, user } = colRows[0];

    // Fetch Notes with Authors
    const noteRows = await db.select({ note: notes, author: users })
      .from(collectionNotes)
      .innerJoin(notes, eq(collectionNotes.noteId, notes.id))
      .leftJoin(users, eq(notes.userId, users.id))
      .where(eq(collectionNotes.collectionId, collectionId));

    const safeNotes = noteRows.map(r => ({
      ...r.note,
      _id: r.note.id,
      user: r.author ? { ...r.author, _id: r.author.id } : null
    }));

    return {
      ...collection,
      _id: collection.id,
      user: user ? { ...user, _id: user.id } : null,
      notes: safeNotes
    };
  } catch (error) {
    console.error("Error fetching collection details:", error);
    return null;
  }
}

/**
 * 3. FETCH SINGLE COLLECTION BY SLUG
 */
export async function getCollectionBySlug(slug) {
  try {
    const db = getDb();
    const colRows = await db.select({ collection: collections, user: users })
      .from(collections)
      .leftJoin(users, eq(collections.userId, users.id))
      .where(and(eq(collections.slug, slug), eq(collections.visibility, 'public')))
      .limit(1);

    if (colRows.length === 0) return null;
    const { collection, user } = colRows[0];

    // Fetch Notes with Authors
    const noteRows = await db.select({ note: notes, author: users })
      .from(collectionNotes)
      .innerJoin(notes, eq(collectionNotes.noteId, notes.id))
      .leftJoin(users, eq(notes.userId, users.id))
      .where(eq(collectionNotes.collectionId, collection.id));

    const safeNotes = noteRows.map(r => ({
      ...r.note,
      _id: r.note.id,
      user: r.author ? { ...r.author, _id: r.author.id } : null
    }));

    return {
      ...collection,
      _id: collection.id,
      user: user ? { ...user, _id: user.id } : null,
      notes: safeNotes
    };
  } catch (error) {
    console.error("Error fetching collection by slug:", error);
    return null;
  }
}

/**
 * 4. FETCH PUBLIC COLLECTIONS
 */
export async function getPublicCollections({ page = 1, limit = 12 } = {}) {
  try {
    const db = getDb();
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const fetchedCols = await db.select({ collection: collections, user: users })
      .from(collections)
      .leftJoin(users, eq(collections.userId, users.id))
      .where(eq(collections.visibility, 'public'))
      .orderBy(desc(collections.createdAt))
      .limit(limitNum)
      .offset(skip);

    const countQuery = await db.select({ count: sql`count(*)` }).from(collections).where(eq(collections.visibility, 'public'));
    const total = Number(countQuery[0].count);

    // Flatten to match expected structure
    const flattened = fetchedCols.map(r => ({ ...r.collection, user: r.user }));
    const serializedCollections = await attachRelationsToCollections(db, flattened);

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
 * 5. CREATE COLLECTION
 */
export async function createCollection(data, userId) {
  try {
    const db = getDb();
    
    if (data.isPremium && (!data.price || data.price <= 0)) {
        return { success: false, error: "Premium bundles must have a valid price." };
    }

    const collectionName = data.name || data;
    const baseSlug = collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newId = crypto.randomUUID();

    const newCollection = {
      id: newId,
      name: collectionName,
      userId: userId,
      slug: slug,
      visibility: data.isPremium ? 'public' : (data.visibility || 'private'), 
      description: data.description || "",
      category: data.category || "University",
      university: data.university || "",
      isPremium: data.isPremium || false,
      price: data.isPremium ? Number(data.price) : 0,
    };

    await db.insert(collections).values(newCollection);
    await awardHivePoints(userId, 15);
    
    revalidatePath('/profile');
    return { success: true, collection: { ...newCollection, _id: newId, notes: [], purchasedBy: [] } };
  } catch (error) {
    console.error("Create Collection Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 6. UPDATE COLLECTION
 */
export async function updateCollection(collectionId, data, userId) {
  try {
    const db = getDb();
    const colRows = await db.select().from(collections).where(and(eq(collections.id, collectionId), eq(collections.userId, userId))).limit(1);
    if (colRows.length === 0) return { success: false, error: "Not found or unauthorized" };
    const collection = colRows[0];

    // 🚀 FRAUD PROTECTION
    const purchasesRows = await db.select({ id: purchases.id }).from(purchases).where(and(eq(purchases.itemId, collectionId), eq(purchases.itemType, 'collection')));
    const hasBuyers = purchasesRows.length > 0;

    if (hasBuyers && data.visibility === 'private') {
      return { success: false, error: "This bundle has active buyers. You cannot make it private, but you can Archive it." };
    }

    // 🚀 STRICT PREMIUM VALIDATION FOR UPGRADES
    if (data.isPremium && !collection.isPremium) {
      const colNotes = await db.select({ noteId: collectionNotes.noteId }).from(collectionNotes).where(eq(collectionNotes.collectionId, collectionId));
      if (colNotes.length > 0) {
        const noteIds = colNotes.map(n => n.noteId);
        const existingNotes = await db.select().from(notes).where(inArray(notes.id, noteIds));
        
        for (const note of existingNotes) {
          if (note.userId !== userId) {
            return { success: false, error: "Cannot upgrade. This bundle contains notes from other users." };
          }
          if (!note.isPaid || note.price <= 0) {
            return { success: false, error: "Cannot upgrade. All notes in a Premium Bundle must be individually priced Premium notes first." };
          }
        }
      }
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.university !== undefined) updateData.university = data.university;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isPremium !== undefined) updateData.isPremium = data.isPremium;
    if (data.price !== undefined) updateData.price = data.isPremium ? Number(data.price) : 0;

    await db.update(collections).set(updateData).where(eq(collections.id, collectionId));
    
    // SEO Indexing
    if (collection.slug) {
        const url = `${APP_URL}/shared-collections/${collection.slug}`;
        const newVis = updateData.visibility || collection.visibility;
        if (newVis === 'public') {
            await indexNewContent(collection.slug, "collection").catch(()=>{});
            await pingIndexNow([url]).catch(()=>{});
        } else if (newVis === 'private') {
            await removeContentFromIndex(collection.slug, "collection").catch(()=>{});
            await pingIndexNow([url]).catch(()=>{});
        }
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections'); 
    revalidatePath(`/collections/${collectionId}`);
    if (collection.slug) revalidatePath(`/shared-collections/${collection.slug}`);
    
    return { success: true, collection: { ...collection, ...updateData, _id: collection.id } };
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
  try {
    const db = getDb();
    const colRows = await db.select().from(collections).where(and(eq(collections.id, collectionId), eq(collections.userId, userId))).limit(1);
    if (colRows.length === 0) return { success: false, error: "Not found or unauthorized" };
    const collection = colRows[0];

    const purchasesRows = await db.select({ id: purchases.id }).from(purchases).where(and(eq(purchases.itemId, collectionId), eq(purchases.itemType, 'collection')));
    const hasBuyers = purchasesRows.length > 0;

    if (hasBuyers) {
      await db.update(collections).set({ visibility: 'private', isArchived: true }).where(eq(collections.id, collectionId));

      if (collection.slug) {
        await removeContentFromIndex(collection.slug, "collection").catch(()=>{});
        await pingIndexNow([`${APP_URL}/shared-collections/${collection.slug}`]).catch(()=>{});
      }

      revalidatePath('/profile');
      revalidatePath('/shared-collections');
      return { success: true, message: "Bundle archived. Existing buyers still have access." };
    }

    // Permanent Deletion
    await db.delete(collectionNotes).where(eq(collectionNotes.collectionId, collectionId));
    await db.delete(collections).where(eq(collections.id, collectionId));

    if (collection.visibility === 'public' && collection.slug) {
        await removeContentFromIndex(collection.slug, "collection").catch(()=>{});
        await pingIndexNow([`${APP_URL}/shared-collections/${collection.slug}`]).catch(()=>{});
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 9. ADD NOTE TO COLLECTION
 */
export async function addNoteToCollection(collectionId, noteId, userId) {
  try {
    const db = getDb();
    const colRows = await db.select().from(collections).where(and(eq(collections.id, collectionId), eq(collections.userId, userId))).limit(1);
    if (colRows.length === 0) return { success: false, error: "Collection not found." };
    const collection = colRows[0];

    if (collection.isPremium) {
        const noteRows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
        if (noteRows.length === 0) return { success: false, error: "Note not found." };
        const noteToAdd = noteRows[0];
        
        if (noteToAdd.userId !== userId) {
            return { success: false, error: "Premium Bundles can only contain notes uploaded by you." };
        }
        if (!noteToAdd.isPaid || noteToAdd.price <= 0) {
            return { success: false, error: "Premium Bundles act as discounted packages. You can only add notes that are already set as Premium (Paid) individually." };
        }
    }

    // Insert ignoring duplicates
    const existing = await db.select().from(collectionNotes).where(and(eq(collectionNotes.collectionId, collectionId), eq(collectionNotes.noteId, noteId)));
    if (existing.length === 0) {
      await db.insert(collectionNotes).values({ collectionId, noteId });
    }

    if (collection.visibility === 'public' && collection.slug) {
        await indexNewContent(collection.slug, "collection").catch(()=>{});
        await pingIndexNow([`${APP_URL}/shared-collections/${collection.slug}`]).catch(()=>{});
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections'); 
    revalidatePath(`/collections/${collectionId}`); 
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 10. REMOVE NOTE FROM COLLECTION
 */
export async function removeNoteFromCollection(collectionId, noteId, userId) {
  try {
    const db = getDb();
    const colRows = await db.select().from(collections).where(and(eq(collections.id, collectionId), eq(collections.userId, userId))).limit(1);
    if (colRows.length === 0) return { success: false, error: "Not found or unauthorized" };
    const collection = colRows[0];

    await db.delete(collectionNotes).where(and(eq(collectionNotes.collectionId, collectionId), eq(collectionNotes.noteId, noteId)));

    if (collection.visibility === 'public' && collection.slug) {
        await indexNewContent(collection.slug, "collection").catch(()=>{});
        await pingIndexNow([`${APP_URL}/shared-collections/${collection.slug}`]).catch(()=>{});
    }

    revalidatePath('/profile');
    revalidatePath('/shared-collections'); 
    revalidatePath(`/collections/${collectionId}`); 
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚀 FETCH PURCHASED BUNDLE SNAPSHOT
 */
export async function getPurchasedBundleSnapshot(bundleId) {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };

    const db = getDb();
    const purchaseRows = await db.select()
      .from(purchases)
      .where(and(eq(purchases.userId, session.user.id), eq(purchases.itemType, 'collection'), eq(purchases.itemId, bundleId)))
      .limit(1);

    if (purchaseRows.length === 0) {
      return { success: false, error: "Purchase record not found" };
    }
    const purchaseRecord = purchaseRows[0];

    let bundleRows = await db.select({ collection: collections, user: users })
      .from(collections).leftJoin(users, eq(collections.userId, users.id))
      .where(eq(collections.id, bundleId))
      .limit(1);

    let bundle;
    if (bundleRows.length === 0) {
      bundle = {
        _id: bundleId,
        name: "Deleted Premium Bundle",
        description: "The author removed this collection from the store, but your purchased files are permanently protected here.",
        isArchived: true,
        user: null 
      };
    } else {
      bundle = {
        ...bundleRows[0].collection,
        _id: bundleRows[0].collection.id,
        user: bundleRows[0].user ? { ...bundleRows[0].user, _id: bundleRows[0].user.id } : null
      };
    }

    const snapshotNoteIds = purchaseRecord.notesSnapshot ? JSON.parse(purchaseRecord.notesSnapshot) : [];
    
    let snapshotNotes = [];
    if (snapshotNoteIds.length > 0) {
      const notesResult = await db.select({ note: notes, user: users })
        .from(notes).leftJoin(users, eq(notes.userId, users.id))
        .where(inArray(notes.id, snapshotNoteIds));
        
      snapshotNotes = notesResult.map(r => ({
        ...r.note,
        _id: r.note.id,
        user: r.user ? { ...r.user, _id: r.user.id } : null
      }));
    }

    return {
      success: true,
      bundle: bundle,
      notes: snapshotNotes,
      purchasedAt: purchaseRecord.purchasedAt
    };
  } catch (error) {
    console.error("Snapshot Fetch Error:", error);
    return { success: false, error: "Failed to load snapshot" };
  }
}

/**
 * 🚀 FETCH A USER'S PUBLIC COLLECTIONS ONLY
 */
export async function getPublicUserCollections(userId, limit = 12) {
  try {
    const db = getDb();
    const fetchedCollections = await db.select()
      .from(collections)
      .where(and(eq(collections.userId, userId), eq(collections.visibility, 'public')))
      .orderBy(desc(collections.createdAt))
      .limit(limit);

    return await attachRelationsToCollections(db, fetchedCollections);
  } catch (error) {
    console.error("Error fetching public user collections:", error);
    return [];
  }
}