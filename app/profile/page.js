import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 
import { redirect } from "next/navigation";
import ProfileDashboard from "@/components/profile/ProfileDashboard";
import { getUserProfile, getUserNotes, getSavedNotes } from "@/actions/user.actions";
import { getBlogsForUser } from "@/actions/blog.actions";
import { getUserCollections } from "@/actions/collection.actions";
import { getUserReports } from "@/actions/report.actions"; // 🚀 Imported

// ✅ PERFORMANCE FIX: Enforces strict dynamic rendering for private routes
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | StuHive",
  description: "Manage your notes, collections, and profile.",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/profile");
  }

  // Fetch all user data in parallel for maximum speed
  const [userProfile, userNotesRes, savedNotesRes, myBlogs, userCollections, reportsRes] = await Promise.all([
    getUserProfile(session.user.id),
    getUserNotes(session.user.id),
    getSavedNotes(session.user.id), 
    getBlogsForUser(session.user.id),
    getUserCollections(session.user.id),
    getUserReports() // 🚀 Parallel fetch
  ]);

  if (!userProfile) {
    redirect("/login");
  }

  const fallbackDate = new Date().toISOString();

  // --- SERIALIZATION LAYER ---
  const serializedUser = {
    ...userProfile,
    _id: userProfile._id.toString(),
    avatarKey: userProfile.avatarKey || null, 
  };

  const serializedMyNotes = userNotesRes.notes.map(note => ({
    ...note,
    _id: note._id.toString(),
    user: note.user?._id ? { ...note.user, _id: note.user._id.toString() } : note.user?.toString(),
    fileKey: note.fileKey || null,          
    thumbnailKey: note.thumbnailKey || null, 
    uploadDate: note.uploadDate ? new Date(note.uploadDate).toISOString() : fallbackDate,
  }));

  const serializedSavedNotes = savedNotesRes.notes.map(note => ({
    ...note,
    _id: note._id.toString(),
    user: note.user?._id ? { ...note.user, _id: note.user._id.toString() } : note.user?.toString(),
    uploadDate: note.uploadDate ? new Date(note.uploadDate).toISOString() : fallbackDate,
  }));

  const serializedCollections = userCollections.map(col => ({
    ...col,
    _id: col._id.toString(),
    user: col.user?.toString(),
    notes: Array.isArray(col.notes) ? col.notes.map(n => n.toString()) : [],
    purchasedBy: Array.isArray(col.purchasedBy) ? col.purchasedBy.map(p => p.toString()) : [],
    createdAt: col.createdAt ? new Date(col.createdAt).toISOString() : fallbackDate,
  }));

  const serializedMyBlogs = myBlogs.map(blog => ({
    ...blog,
    _id: blog._id.toString(),
    author: blog.author?._id ? blog.author._id.toString() : blog.author?.toString(),
    coverImageKey: blog.coverImageKey || null, 
    createdAt: blog.createdAt ? new Date(blog.createdAt).toISOString() : fallbackDate,
  }));

  // 🚀 SERIALIZE REPORTS
  const serializedReports = (reportsRes.reports || []).map(report => ({
    ...report,
    _id: report._id.toString(),
    reporter: report.reporter?.toString(),
    targetNote: report.targetNote ? { ...report.targetNote, _id: report.targetNote._id.toString() } : null,
    targetBundle: report.targetBundle ? { ...report.targetBundle, _id: report.targetBundle._id.toString() } : null,
    createdAt: report.createdAt ? new Date(report.createdAt).toISOString() : fallbackDate,
  }));

  return (
    <main className="min-h-screen bg-background pt-20">
      <h1 className="sr-only">My Dashboard</h1>

      <ProfileDashboard 
        user={serializedUser} 
        initialMyNotes={serializedMyNotes} 
        initialSavedNotes={serializedSavedNotes} 
        initialMyBlogs={serializedMyBlogs} 
        initialCollections={serializedCollections}
        initialReports={serializedReports} // 🚀 Pass to component
      />
    </main>
  );
}