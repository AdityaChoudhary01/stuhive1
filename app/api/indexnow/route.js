export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { notes, blogs, users, collections, opportunities, studyEvents, universities } from "@/db/schema";
import { eq } from "drizzle-orm";

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";
const INDEXNOW_KEY = "363d05a6f7284bcf8b9060f495d58655";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  
  if (secret !== "my-super-secret-trigger") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    let urls = [
      `${APP_URL}/`, `${APP_URL}/about`, `${APP_URL}/contact`, `${APP_URL}/blogs`,
      `${APP_URL}/global-search`, `${APP_URL}/search`, `${APP_URL}/shared-collections`,
      `${APP_URL}/requests`, `${APP_URL}/login`, `${APP_URL}/signup`, `${APP_URL}/roadmaps`,
      `${APP_URL}/updates`, `${APP_URL}/donate`, `${APP_URL}/supporters`, `${APP_URL}/terms`,
      `${APP_URL}/privacy`, `${APP_URL}/dmca`, `${APP_URL}/hive-points`, 
      `${APP_URL}/premium-purchase-policy`, `${APP_URL}/leaderboard`,
    ];

    // 🚀 Parallel Edge Data Fetching
    const [
      dbBlogs, dbNotes, dbUsers, dbCollections, dbOpportunities, dbRoadmaps, dbUnivs
    ] = await Promise.all([
      db.select({ slug: blogs.slug }).from(blogs),
      db.select({ id: notes.id, slug: notes.slug, university: notes.university }).from(notes),
      db.select({ id: users.id }).from(users),
      db.select({ slug: collections.slug }).from(collections).where(eq(collections.visibility, 'public')),
      db.select({ slug: opportunities.slug }).from(opportunities).where(eq(opportunities.isPublished, true)),
      db.select({ slug: studyEvents.slug }).from(studyEvents).where(eq(studyEvents.isPublic, true)),
      db.select({ slug: universities.slug }).from(universities),
    ]);

    dbBlogs.forEach(b => b.slug && urls.push(`${APP_URL}/blogs/${b.slug}`));
    dbNotes.forEach(n => urls.push(`${APP_URL}/notes/${n.slug || n.id}`));
    dbUsers.forEach(u => urls.push(`${APP_URL}/profile/${u.id}`));
    dbCollections.forEach(c => c.slug && urls.push(`${APP_URL}/shared-collections/${c.slug}`));
    dbOpportunities.forEach(o => o.slug && urls.push(`${APP_URL}/updates/${o.slug}`));
    dbRoadmaps.forEach(r => r.slug && urls.push(`${APP_URL}/roadmaps/${r.slug}`));

    const submittedUnivSlugs = new Set();
    
    // Professional Hubs
    dbUnivs.forEach(u => {
      if (u.slug) {
        urls.push(`${APP_URL}/univ/${u.slug}`);
        submittedUnivSlugs.add(u.slug);
      }
    });

    // Auto-generated Hubs
    dbNotes.forEach(n => {
      if (n.university) {
        const slug = n.university.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        if (!submittedUnivSlugs.has(slug)) {
          urls.push(`${APP_URL}/univ/${slug}`);
          submittedUnivSlugs.add(slug);
        }
      }
    });

    // 🚀 Submit to IndexNow API
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "www.stuhive.in",
        key: INDEXNOW_KEY,
        keyLocation: `${APP_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    if (response.ok || response.status === 202) {
      return NextResponse.json({ 
        success: true, 
        message: `Hyper-SEO Boost Active! Submitted ${urls.length} URLs to IndexNow.`,
        urlsSubmitted: urls.length
      });
    } else {
      const errorText = await response.text();
      return NextResponse.json({ success: false, error: errorText }, { status: 400 });
    }

  } catch (error) {
    console.error("IndexNow Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}