'use server';

import { getDb } from "@/lib/db";
import { blogs, users, blogReviews } from "@/db/schema";
import { eq, or, like, desc, asc, and, sql, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth"; // Auth.js v5
import { deleteFileFromR2 } from "@/lib/r2"; 
import { indexNewContent, removeContentFromIndex } from "@/lib/googleIndexing"; 
import { pingIndexNow } from "@/lib/indexnow"; 
import { cache } from "react"; 
import { awardHivePoints } from "@/actions/leaderboard.actions";
import { trackCreatorEvent } from "@/actions/analytics.actions";
import { createNotification } from "@/actions/notification.actions";

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

/**
 * FETCH BLOGS (Pagination, Search, Filter by Tags)
 */
export const getBlogs = cache(async ({ page = 1, limit = 9, search = "", tag = "", isFeatured }) => {
  try {
    const db = getDb();
    const skip = (page - 1) * limit;
    const conditions = [];

    if (search) {
      const s = `%${search.trim()}%`;
      conditions.push(or(
        like(blogs.title, s),
        like(blogs.summary, s),
        like(blogs.tags, s) // Since tags is JSON text, we can do a LIKE search
      ));
    }

    if (tag && tag !== 'All') {
      conditions.push(like(blogs.tags, `%${tag}%`));
    }
    
    if (isFeatured) {
      conditions.push(eq(blogs.isFeatured, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const fetchedBlogs = await db.select({
      blog: blogs,
      author: {
        id: users.id, name: users.name, avatar: users.avatar, 
        role: users.role, email: users.email, isVerifiedEducator: users.isVerifiedEducator
      }
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.authorId, users.id))
    .where(whereClause)
    .orderBy(desc(blogs.isFeatured), desc(blogs.createdAt))
    .limit(limit)
    .offset(skip);

    const countQuery = await db.select({ count: sql`count(*)` }).from(blogs).where(whereClause);
    const total = Number(countQuery[0]?.count || 0);

    const safeBlogs = fetchedBlogs.map(row => ({
      ...row.blog,
      _id: row.blog.id,
      author: row.author ? { ...row.author, _id: row.author.id } : null,
      tags: row.blog.tags ? JSON.parse(row.blog.tags) : [],
      reviews: []
    }));

    return { blogs: safeBlogs, total, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    console.error("Get Blogs Error:", error);
    return { blogs: [], total: 0, totalPages: 0 };
  }
});

/**
 * GET BLOG BY SLUG
 */
export const getBlogBySlug = cache(async (slug) => {
  try {
    const db = getDb();
    const result = await db.select({ blog: blogs, author: users })
      .from(blogs)
      .leftJoin(users, eq(blogs.authorId, users.id))
      .where(eq(blogs.slug, slug))
      .limit(1);

    if (result.length === 0) return null;
    const { blog, author } = result[0];

    const reviewRows = await db.select({ review: blogReviews, user: users })
      .from(blogReviews)
      .leftJoin(users, eq(blogReviews.userId, users.id))
      .where(eq(blogReviews.blogId, blog.id))
      .orderBy(asc(blogReviews.createdAt));

    const safeReviews = reviewRows.map(r => ({
      ...r.review,
      _id: r.review.id,
      user: r.user ? { ...r.user, _id: r.user.id } : null,
    }));

    return {
      ...blog,
      _id: blog.id,
      author: author ? { ...author, _id: author.id } : null,
      tags: blog.tags ? JSON.parse(blog.tags) : [],
      reviews: safeReviews
    };
  } catch (error) {
    console.error("Get Blog By Slug Error:", error);
    return null;
  }
});

/**
 * INCREMENT BLOG VIEWS
 */
export async function incrementBlogViews(blogId) {
  try {
    const db = getDb();
    await db.update(blogs).set({ viewCount: sql`${blogs.viewCount} + 1` }).where(eq(blogs.id, blogId));
    
    const blogRows = await db.select({ authorId: blogs.authorId }).from(blogs).where(eq(blogs.id, blogId)).limit(1);
    if (blogRows.length > 0) {
      await trackCreatorEvent(blogRows[0].authorId, 'views');
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * UPDATE BLOG
 */
export async function updateBlog(blogId, updateData, userId) {
  try {
    const db = getDb();
    const blogRows = await db.select().from(blogs).where(eq(blogs.id, blogId)).limit(1);
    if (blogRows.length === 0) return { success: false, error: "Blog not found" };
    const blog = blogRows[0];

    const session = await auth();
    const isOwner = blog.authorId === userId;
    const isAdmin = session?.user?.role === "admin";
    
    if (!isOwner && !isAdmin) return { success: false, error: "Unauthorized" };

    if (updateData.coverImageKey && updateData.coverImageKey !== blog.coverImageKey) {
        if (blog.coverImageKey) await deleteFileFromR2(blog.coverImageKey);
    }

    const oldSlug = blog.slug;
    let finalUpdateData = { ...updateData };

    if (updateData.title && updateData.title !== blog.title) {
         let newSlug = updateData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
         const existing = await db.select().from(blogs).where(eq(blogs.slug, newSlug));
         if (existing.length > 0 && existing[0].id !== blogId) {
             newSlug = `${newSlug}-${Date.now()}`;
         }
         finalUpdateData.slug = newSlug;
    }

    if (updateData.content) {
        const wordCount = updateData.content.split(/\s+/).length;
        finalUpdateData.readTime = Math.ceil(wordCount / 200) || 1;
    }

    // Stringify tags array for SQLite JSON mode
    if (updateData.tags) {
        finalUpdateData.tags = JSON.stringify(updateData.tags);
    }

    await db.update(blogs).set(finalUpdateData).where(eq(blogs.id, blogId));
    
    const urlsToPing = [`${APP_URL}/blogs/${finalUpdateData.slug || blog.slug}`];

    if (finalUpdateData.slug && finalUpdateData.slug !== oldSlug) {
        await removeContentFromIndex(oldSlug, 'blog').catch(()=>{});
        urlsToPing.push(`${APP_URL}/blogs/${oldSlug}`);
    }
    
    await indexNewContent(finalUpdateData.slug || blog.slug, 'blog').catch(()=>{});
    await pingIndexNow(urlsToPing).catch(()=>{});
    
    revalidatePath(`/blogs/${finalUpdateData.slug || blog.slug}`);
    revalidatePath('/blogs');
    
    return { success: true, slug: finalUpdateData.slug || blog.slug };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * CREATE BLOG & AWARD POINTS
 */
export async function createBlog({ title, content, summary, tags, coverImage, coverImageKey, userId }) {
  try {
    const db = getDb();
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existing = await db.select().from(blogs).where(eq(blogs.slug, slug));
    if (existing.length > 0) slug = `${slug}-${Date.now()}`;

    const wordCount = content ? content.split(/\s+/).length : 0;
    const readTime = Math.ceil(wordCount / 200) || 1;
    const newBlogId = crypto.randomUUID();

    await db.insert(blogs).values({
      id: newBlogId,
      title, content, summary, slug, coverImage, coverImageKey,
      tags: JSON.stringify(tags || []),
      authorId: userId,
      readTime
    });
    
    await db.update(users).set({ blogCount: sql`${users.blogCount} + 1` }).where(eq(users.id, userId));
    await awardHivePoints(userId, 20);

    await indexNewContent(slug, 'blog').catch(()=>{});
    await pingIndexNow([`${APP_URL}/blogs/${slug}`]).catch(()=>{});

    revalidatePath('/blogs');
    return { success: true, slug };
  } catch (error) { 
    return { success: false, error: error.message }; 
  }
}

/**
 * DELETE BLOG 
 */
export async function deleteBlog(blogId, userId) {
  try {
    const db = getDb();
    const blogRows = await db.select().from(blogs).where(eq(blogs.id, blogId)).limit(1);
    if (blogRows.length === 0) return { success: false, error: "Blog not found" };
    const blog = blogRows[0];
    
    const session = await auth();
    if (blog.authorId !== userId && session?.user?.role !== "admin") return { success: false, error: "Unauthorized" };

    if (blog.coverImageKey) await deleteFileFromR2(blog.coverImageKey);

    await removeContentFromIndex(blog.slug, 'blog').catch(()=>{});
    await pingIndexNow([`${APP_URL}/blogs/${blog.slug}`]).catch(()=>{});

    await db.delete(blogs).where(eq(blogs.id, blogId));
    await db.update(users).set({ blogCount: sql`${users.blogCount} - 1` }).where(eq(users.id, blog.authorId));
    
    revalidatePath('/blogs');
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
}

/**
 * ADD BLOG REVIEW
 */
export async function addBlogReview(blogId, userId, rating, comment, parentReviewId = null) {
  try {
    const db = getDb();
    const blogRows = await db.select().from(blogs).where(eq(blogs.id, blogId)).limit(1);
    if (blogRows.length === 0) return { success: false, error: "Blog not found" };
    const blog = blogRows[0];

    if (!parentReviewId) {
        const existingReviews = await db.select().from(blogReviews)
            .where(and(eq(blogReviews.blogId, blogId), eq(blogReviews.userId, userId), sql`parent_review_id IS NULL`));
        if (existingReviews.length > 0) return { success: false, error: "You have already reviewed this article." };
    }

    await db.insert(blogReviews).values({
      blogId, userId,
      rating: parentReviewId ? 0 : Number(rating),
      comment, parentReviewId
    });

    // Recalculate
    const allReviews = await db.select().from(blogReviews).where(eq(blogReviews.blogId, blogId));
    const mainReviews = allReviews.filter(r => !r.parentReviewId);
    let newAvgRating = 0;
    if (mainReviews.length > 0) {
        newAvgRating = mainReviews.reduce((acc, r) => r.rating + acc, 0) / mainReviews.length;
    }

    await db.update(blogs).set({ rating: newAvgRating, numReviews: mainReviews.length }).where(eq(blogs.id, blogId));

    // Notifications
    const notificationLink = `/blogs/${blog.slug}#reviews`;
    if (parentReviewId) {
      const parentRev = allReviews.find(r => r.id === parentReviewId);
      if (parentRev && parentRev.userId !== userId) {
          await createNotification({ recipientId: parentRev.userId, actorId: userId, type: 'SYSTEM', message: `Someone replied to your comment on "${blog.title}".`, link: notificationLink });
      }
    } else if (blog.authorId !== userId) {
      await createNotification({ recipientId: blog.authorId, actorId: userId, type: 'SYSTEM', message: `Someone just left a ${rating}-star review on your article "${blog.title}".`, link: notificationLink });
    }

    const fullReviews = await db.select({ review: blogReviews, user: users })
      .from(blogReviews).leftJoin(users, eq(blogReviews.userId, users.id))
      .where(eq(blogReviews.blogId, blogId)).orderBy(asc(blogReviews.createdAt));

    const safeReviews = fullReviews.map(r => ({ ...r.review, _id: r.review.id, user: r.user ? { ...r.user, _id: r.user.id } : null }));

    revalidatePath(`/blogs/${blog.slug}`);
    return { success: true, reviews: safeReviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * DELETE BLOG REVIEW
 */
export async function deleteBlogReview(blogId, reviewId) {
  try {
    const db = getDb();
    await db.delete(blogReviews).where(or(eq(blogReviews.id, reviewId), eq(blogReviews.parentReviewId, reviewId)));

    const allReviews = await db.select().from(blogReviews).where(eq(blogReviews.blogId, blogId));
    const mainReviews = allReviews.filter(r => !r.parentReviewId);
    let newAvgRating = 0;
    if (mainReviews.length > 0) {
        newAvgRating = mainReviews.reduce((acc, r) => r.rating + acc, 0) / mainReviews.length;
    }

    await db.update(blogs).set({ rating: newAvgRating, numReviews: mainReviews.length }).where(eq(blogs.id, blogId));

    const fullReviews = await db.select({ review: blogReviews, user: users })
      .from(blogReviews).leftJoin(users, eq(blogReviews.userId, users.id))
      .where(eq(blogReviews.blogId, blogId)).orderBy(asc(blogReviews.createdAt));

    const safeReviews = fullReviews.map(r => ({ ...r.review, _id: r.review.id, user: r.user ? { ...r.user, _id: r.user.id } : null }));

    return { success: true, reviews: safeReviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * GET RELATED BLOGS
 */
export const getRelatedBlogs = cache(async (blogId) => {
  try {
    const db = getDb();
    const related = await db.select({ blog: blogs, author: users })
      .from(blogs).leftJoin(users, eq(blogs.authorId, users.id))
      .where(ne(blogs.id, blogId)).orderBy(desc(blogs.createdAt)).limit(3);

    return related.map(r => ({
      ...r.blog, _id: r.blog.id,
      author: r.author ? { ...r.author, _id: r.author.id } : null,
      tags: r.blog.tags ? JSON.parse(r.blog.tags) : []
    }));
  } catch (error) { return []; }
});

/**
 * GET MY BLOGS / FOR USER
 */
export async function getBlogsForUser(userId, page = 1, limit = 120) {
  try {
    const db = getDb();
    const skip = (page - 1) * limit;
    const userBlogs = await db.select().from(blogs)
      .where(eq(blogs.authorId, userId)).orderBy(desc(blogs.createdAt))
      .limit(limit).offset(skip);

    return userNotes.map(b => ({
      ...b, _id: b.id, tags: b.tags ? JSON.parse(b.tags) : []
    }));
  } catch (error) { return []; }
}
export const getMyBlogs = getBlogsForUser;

/**
 * GET UNIQUE BLOG TAGS (CATEGORIES)
 */
export const getUniqueBlogTags = cache(async () => {
  try {
    const db = getDb();
    const allBlogs = await db.select({ tags: blogs.tags }).from(blogs);
    
    let allTags = [];
    allBlogs.forEach(b => {
        if(b.tags) {
            const parsed = JSON.parse(b.tags);
            allTags.push(...parsed);
        }
    });

    const cleanTags = allTags.filter(t => t && t.trim() !== "").map(t => t.trim().toLowerCase());
    const uniqueTags = [...new Set(cleanTags)].map(t => t.charAt(0).toUpperCase() + t.slice(1)).sort();
    return uniqueTags;
  } catch (error) {
    return [];
  }
});