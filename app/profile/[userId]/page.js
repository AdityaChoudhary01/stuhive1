import { notFound } from "next/navigation";
import { getUserProfile, getUserNotes } from "@/actions/user.actions";
import { getBlogsForUser } from "@/actions/blog.actions";
import { getPublicUserCollections } from "@/actions/collection.actions"; // 🚀 Added
import { getPublicUserRoadmaps } from "@/actions/planner.actions";       // 🚀 Added
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PublicProfileView from "@/components/profile/PublicProfileView";

export const revalidate = 60;
export const dynamic = "force-dynamic"; 

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

export async function generateMetadata({ params }) {
  const { userId } = await params;
  const user = await getUserProfile(userId);
  
  if (!user) return { title: "User Not Found | StuHive" };

  const profileTitle = `${user.name} | Portfolio, Study Bundles & Roadmaps | StuHive`;
  
  // ✅ RICH SEO: Constructs a descriptive meta tag using bio, uni, and location
  let profileDesc = `Explore academic notes, curated study bundles, roadmaps, and articles contributed by ${user.name} on StuHive.`;
  
  if (user.bio) {
    profileDesc = `${user.bio.substring(0, 120)}... Explore ${user.name}'s academic bundles and study roadmaps at ${user.university ? user.university : 'StuHive'}.`; 
  } else if (user.university || user.location) {
    const uniStr = user.university ? ` at ${user.university}` : "";
    const locStr = user.location ? ` in ${user.location}` : "";
    profileDesc = `${user.name} is a student${uniStr}${locStr}. Access their free handwritten notes, exam roadmaps, and curated study bundles.`;
  }

  return {
    title: profileTitle,
    description: profileDesc,
    keywords: [
      user.name,
      `${user.name} notes`,
      `${user.name} study bundles`,
      `${user.name} StuHive`,
      "academic portfolio",
      "exam roadmaps",
      "study materials"
    ],
    alternates: {
        canonical: `${APP_URL}/profile/${userId}`,
    },
    openGraph: {
      title: profileTitle,
      description: profileDesc,
      url: `${APP_URL}/profile/${userId}`,
      type: "profile",
      images: [user.avatar || `${APP_URL}/logo512.png`],
    },
    twitter: {
        card: "summary",
        title: profileTitle,
        description: profileDesc,
        images: [user.avatar || `${APP_URL}/logo512.png`],
    }
  };
}


export default async function PublicProfilePage({ params }) {
  const { userId } = await params;
  
  // 🚀 HIGH PERFORMANCE: Parallel execution of 5 database queries limits TTFB to the slowest single query
  const [session, profile, notesData, blogs, collections, roadmaps] = await Promise.all([
    getServerSession(authOptions),
    getUserProfile(userId),
    getUserNotes(userId, 1, 50),
    getBlogsForUser(userId),
    getPublicUserCollections(userId, 50),
    getPublicUserRoadmaps(userId, 50)
  ]);

  if (!profile) return notFound();

  // 🚀 HYPER-ADVANCED PERSON & PROFILE SCHEMA (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": profile.name,
      "description": profile.bio || `Student ${profile.university ? 'at ' + profile.university : ''}`,
      "image": profile.avatar,
      "url": `${APP_URL}/profile/${userId}`,
      "knowsAbout": ["Academic Research", "Study Materials", "Exam Preparation", "Curated Bundles"],
      "interactionStatistic": [
        {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/FollowAction",
          "userInteractionCount": profile.followers?.length || 0
        }
      ],
      "agent": {
         "@type": "ItemList",
         "name": "Public Contributions",
         "numberOfItems": (notesData?.notes?.length || 0) + (collections?.length || 0) + (roadmaps?.length || 0)
      }
    }
  };

  const isOwnProfile = session?.user?.id === profile._id.toString();
  const isFollowing = session 
    ? profile.followers.some(f => (f._id?.toString() || f.toString()) === session.user.id) 
    : false;

  const serializedProfile = {
    ...profile,
    _id: profile._id.toString(),
    // ✅ ADDED FALLBACKS: Guarantees Next.js hydration safety for Client Components
    bio: profile.bio || "",
    university: profile.university || "",
    location: profile.location || "",
    followers: (profile.followers || []).map(f => ({
        ...f,
        _id: f._id?.toString() || f.toString()
    })),
    following: (profile.following || []).map(f => ({
        ...f,
        _id: f._id?.toString() || f.toString()
    }))
  };

  const serializedNotes = (notesData?.notes || []).map(note => ({
    ...note,
    _id: note._id.toString(),
    user: note.user?._id ? { ...note.user, _id: note.user._id.toString() } : note.user?.toString(),
    uploadDate: note.uploadDate instanceof Date ? note.uploadDate.toISOString() : new Date(note.uploadDate).toISOString(),
  }));

  const serializedBlogs = (blogs || []).map(blog => ({
    ...blog,
    _id: blog._id.toString(),
    author: blog.author?._id ? blog.author._id.toString() : blog.author?.toString(),
    createdAt: blog.createdAt instanceof Date ? blog.createdAt.toISOString() : new Date(blog.createdAt).toISOString(),
  }));

  // 🚀 STRICT SERIALIZATION FOR NEW CONTENT
  const serializedCollections = (collections || []).map(col => ({
    ...col,
    _id: col._id.toString(),
    user: col.user?._id ? { ...col.user, _id: col.user._id.toString() } : col.user?.toString(),
    notes: Array.isArray(col.notes) ? col.notes.map(n => n?.toString()) : [],
    purchasedBy: Array.isArray(col.purchasedBy) ? col.purchasedBy.map(p => p?.toString()) : [],
    createdAt: col.createdAt instanceof Date ? col.createdAt.toISOString() : new Date(col.createdAt).toISOString()
  }));

  const serializedRoadmaps = (roadmaps || []).map(rm => ({
    ...rm,
    _id: rm._id.toString(),
    user: rm.user?._id ? { ...rm.user, _id: rm.user._id.toString() } : rm.user?.toString(),
    createdAt: rm.createdAt instanceof Date ? rm.createdAt.toISOString() : new Date(rm.createdAt).toISOString()
  }));

  return (
    // 🚀 CHANGED: px-3 reduced to px-2 to minimize mobile horizontal padding
    <main className="w-full max-w-6xl mx-auto px-2 sm:px-6 md:px-8 py-8 pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <h1 className="sr-only">{profile.name}&apos;s Profile</h1>

      <PublicProfileView 
        profile={serializedProfile}
        notes={serializedNotes}
        blogs={serializedBlogs}
        collections={serializedCollections}
        roadmaps={serializedRoadmaps}
        currentUser={session?.user} 
        isOwnProfile={isOwnProfile}
        initialIsFollowing={isFollowing}
      />
    </main>
  );
}