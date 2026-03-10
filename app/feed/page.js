import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserFeed, getFollowingUsers } from "@/actions/user.actions"; 
import FeedView from "@/components/feed/FeedView"; 

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "My Feed | StuHive",
};

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const [feedContent, followingList] = await Promise.all([
    getUserFeed(session.user.id),
    getFollowingUsers(session.user.id)
  ]);

  return (
    <div className="container px-2 sm:px-4 py-8 md:py-16 max-w-6xl min-h-screen">
      <div className="mb-8 md:mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
         <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tight">
            Your Daily Stream
         </h1>
         <p className="text-gray-400 text-base md:text-lg">Fresh updates from authors you follow.</p>
      </div>
      
      <FeedView 
        initialContent={feedContent} 
        initialFollowing={followingList} 
        currentUserId={session.user.id} 
      />
    </div>
  );
}