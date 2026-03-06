import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";
import Blog from "@/lib/models/Blog";
import User from "@/lib/models/User";
import Collection from "@/lib/models/Collection";
import Opportunity from "@/lib/models/Opportunity"; 
import StudyEvent from "@/lib/models/StudyEvent"; 

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";
const INDEXNOW_KEY = "363d05a6f7284bcf8b9060f495d58655";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  
  // 🛡️ Security Check
  if (secret !== "my-super-secret-trigger") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // 1. Static & Main Hub Pages
    let urls = [
      `${APP_URL}/`,
      `${APP_URL}/search`,
      `${APP_URL}/blogs`,
      `${APP_URL}/updates`, 
      `${APP_URL}/roadmaps`, 
      `${APP_URL}/shared-collections`,
      `${APP_URL}/requests`,
      `${APP_URL}/hive-points`,
      `${APP_URL}/about`,
      `${APP_URL}/contact`,
      `${APP_URL}/privacy`,
      `${APP_URL}/terms`,
      `${APP_URL}/dmca`,
    ];

    // 🚀 Parallel Data Fetching for speed
    const [blogs, notes, users, collections, opportunities, roadmaps] = await Promise.all([
      Blog.find({}).select('slug').lean(),
      Note.find({}).select('slug _id').lean(), // 🚀 FIXED: Ensure slug is selected
      User.find({}).select('_id').lean(),
      Collection.find({ visibility: 'public' }).select('slug').lean(),
      Opportunity.find({ isPublished: true }).select('slug').lean(), 
      StudyEvent.find({ isPublic: true }).select('slug').lean(), 
    ]);

    // 2. Add Dynamic Blogs
    blogs.forEach(b => b.slug && urls.push(`${APP_URL}/blogs/${b.slug}`));

    // 3. Add Dynamic Notes (🚀 FIXED to use slug fallback)
    notes.forEach(n => urls.push(`${APP_URL}/notes/${n.slug || n._id.toString()}`));

    // 4. Add Dynamic Public Profiles
    users.forEach(u => urls.push(`${APP_URL}/profile/${u._id.toString()}`));

    // 5. Add Dynamic Public Collections
    collections.forEach(c => c.slug && urls.push(`${APP_URL}/shared-collections/${c.slug}`));

    // 6. Add Dynamic Exam/Job Updates
    opportunities.forEach(o => o.slug && urls.push(`${APP_URL}/updates/${o.slug}`));

    // 7. Add Dynamic Public Roadmaps
    roadmaps.forEach(r => r.slug && urls.push(`${APP_URL}/roadmaps/${r.slug}`));

    // 🚀 Submit to IndexNow API
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
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
    console.error("IndexNow Submission Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}