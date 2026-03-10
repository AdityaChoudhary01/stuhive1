import { notFound } from "next/navigation";
import { getUserProfile, getUserNotes } from "@/actions/user.actions";
import { getBlogsForUser } from "@/actions/blog.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PublicProfileView from "@/components/profile/PublicProfileView";

export const revalidate = 60;
export const dynamic = "force-dynamic"; 

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

export async function generateMetadata({ params }) {
  const { userId } = await params;
  const user = await getUserProfile(userId);
  
  if (!user) return { title: "User Not Found" };

  const profileTitle = `${user.name} | Portfolio & Study Materials | StuHive`;
  
  // ✅ RICH SEO: Constructs a descriptive meta tag using bio, uni, and location
  let profileDesc = `Explore academic notes and articles contributed by ${user.name} on StuHive.`;
  
  if (user.bio) {
    profileDesc = `${user.bio.substring(0, 150)}... - ${user.university ? user.university : 'StuHive Contributor'}`; 
  } else if (user.university || user.location) {
    const uniStr = user.university ? ` at ${user.university}` : "";
    const locStr = user.location ? ` in ${user.location}` : "";
    profileDesc = `${user.name} is a student${uniStr}${locStr}. Explore their academic notes and articles.`;
  }

  return {
    title: profileTitle,
    description: profileDesc,
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
  
  const [session, profile, notesData, blogs] = await Promise.all([
    getServerSession(authOptions),
    getUserProfile(userId),
    getUserNotes(userId, 1, 50),
    getBlogsForUser(userId)
  ]);

  if (!profile) return notFound();

  // PERSON & PROFILE SCHEMA (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": profile.name,
      "description": profile.bio || `Student ${profile.university ? 'at ' + profile.university : ''}`,
      "image": profile.avatar,
      "url": `${APP_URL}/profile/${userId}`,
      "knowsAbout": ["Academic Research", "Study Materials"],
      "interactionStatistic": [
        {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/FollowAction",
          "userInteractionCount": profile.followers?.length || 0
        }
      ]
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
        currentUser={session?.user} 
        isOwnProfile={isOwnProfile}
        initialIsFollowing={isFollowing}
      />
    </main>
  );
}