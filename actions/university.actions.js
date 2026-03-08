"use server";

import dbConnect from "@/lib/db";
import Note from "@/lib/models/Note"; 
import Collection from "@/lib/models/Collection";
import Request from "@/lib/models/Request";
import University from "@/lib/models/University"; 

/**
 * 1. FETCH INITIAL HUB DATA
 * Standardizes regex search across university and title fields for all items.
 */
export async function getUniversityHubData(slug) {
  try {
    await dbConnect();
    
    // Create a broad, case-insensitive Regex for substring matching
    const nameStr = slug.replace(/-/g, ' ');
    const uniRegex = new RegExp(nameStr, 'i');

    const limitNum = 12;

    // Standardized Query Object used for matching items to this Hub
    const baseQuery = {
      $or: [
        { university: uniRegex },
        { title: uniRegex }
      ]
    };

    const [universityDetails, notes, collections, requests] = await Promise.all([
      // Fetch admin-curated SEO details
      University.findOne({ slug }).lean(),

      // Fetch Notes matching University OR Title
      Note.find(baseQuery)
        .sort({ viewCount: -1 })
        .limit(limitNum)
        .populate('user', 'name avatar isVerifiedEducator')
        .lean(),
      
      // Fetch Collections matching University OR Title
      Collection.find({ 
        ...baseQuery,
        visibility: 'public' 
      })
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .populate('user', 'name avatar isVerifiedEducator')
        .lean(),
      
      // Fetch Pending Requests matching University OR Title
      Request.find({ 
        ...baseQuery,
        status: 'pending' 
      })
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .populate('requester', 'name avatar isVerifiedEducator')
        .lean()
    ]);

    // Fallback to formatted slug if admin details don't exist
    const formattedName = universityDetails?.name || nameStr.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return {
      success: true,
      universityName: formattedName,
      details: universityDetails ? JSON.parse(JSON.stringify(universityDetails)) : null,
      stats: {
        noteCount: await Note.countDocuments(baseQuery),
        collectionCount: await Collection.countDocuments({ 
          ...baseQuery,
          visibility: 'public' 
        }),
        requestCount: await Request.countDocuments({ 
          ...baseQuery,
          status: 'pending' 
        })
      },
      notes: JSON.parse(JSON.stringify(notes)),
      collections: JSON.parse(JSON.stringify(collections)),
      requests: JSON.parse(JSON.stringify(requests))
    };
  } catch (error) {
    console.error("Error fetching university data:", error);
    return { success: false, universityName: slug, details: null, notes: [], collections: [], requests: [], stats: {} };
  }
}

/**
 * 2. FETCH TOP UNIVERSITIES
 */
export async function getTopUniversities() {
  try {
    await dbConnect();
    const topUnivs = await Note.aggregate([
      { $match: { university: { $ne: null, $ne: "" } } },
      { $group: { _id: "$university", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return topUnivs.map(u => ({
      name: u._id,
      slug: u._id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      count: u.count
    }));
  } catch (error) {
    console.error("Error fetching top universities:", error);
    return [];
  }
}

/**
 * 3. LOAD MORE PAGINATION
 * Applies the same multi-field logic to ensure pagination matches the initial load.
 */
export async function loadMoreUniversityData(slug, tab, page = 1, limit = 12) {
  try {
    await dbConnect();
    const nameStr = slug.replace(/-/g, ' ');
    const uniRegex = new RegExp(nameStr, 'i');
    const skip = (page - 1) * limit;
    
    const baseQuery = {
      $or: [
        { university: uniRegex },
        { title: uniRegex }
      ]
    };

    if (tab === 'notes') {
      const notes = await Note.find(baseQuery)
        .sort({ viewCount: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name avatar isVerifiedEducator')
        .lean();
      return JSON.parse(JSON.stringify(notes));
    }
    
    if (tab === 'collections') {
      const collections = await Collection.find({ ...baseQuery, visibility: 'public' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name avatar isVerifiedEducator')
        .lean();
      return JSON.parse(JSON.stringify(collections));
    }
    
    if (tab === 'requests') {
      const requests = await Request.find({ ...baseQuery, status: 'pending' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requester', 'name avatar isVerifiedEducator')
        .lean();
      return JSON.parse(JSON.stringify(requests));
    }
    
    return [];
  } catch (error) {
    console.error("Error loading more data:", error);
    return [];
  }
}